import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { generateEmailDraft } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadIds, provider = 'groq', groqModel = 'llama-3.3-70b-versatile', userId } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required and cannot be empty' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Get active resume
    let resumeQuery = supabase.from('resumes').select('*').eq('is_active', true);
    if (userId) {
      resumeQuery = resumeQuery.eq('user_id', userId);
    }

    const { data: activeResume, error: resumeError } = await resumeQuery.single();

    if (resumeError || !activeResume) {
      return NextResponse.json(
        { error: 'No active resume found. Please upload a PDF resume in the Resume section first.' },
        { status: 400 }
      );
    }

    // 2. Get target leads
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);

    if (leadsError || !leads || leads.length === 0) {
      return NextResponse.json({ error: 'Selected leads not found' }, { status: 404 });
    }

    // 3. SENT EMAIL PROTECTION: Check which leads or emails have ALREADY been sent or replied
    let sentDraftsQuery = supabase
      .from('email_drafts')
      .select('lead_id, leads(email)')
      .in('status', ['sent', 'replied']);

    if (userId) {
      sentDraftsQuery = sentDraftsQuery.eq('user_id', userId);
    }

    const { data: sentDrafts } = await sentDraftsQuery;
    const sentLeadIdSet = new Set<string>();
    const sentEmailSet = new Set<string>();

    (sentDrafts || []).forEach((sd: any) => {
      if (sd.lead_id) sentLeadIdSet.add(sd.lead_id);
      const email = sd.leads?.email;
      if (email) sentEmailSet.add(email.trim().toLowerCase());
    });

    let generatedCount = 0;
    let skippedSentCount = 0;
    const skippedSentLeads: string[] = [];
    const processedResults: Array<{
      leadId: string;
      company: string;
      email: string | null;
      status: 'generated' | 'skipped_sent' | 'error';
      message?: string;
    }> = [];
    const errors: string[] = [];

    const providersToRun: Array<'gemini' | 'claude' | 'groq'> =
      provider === 'both' ? ['groq', 'claude'] : [provider];

    // Sequential Queue execution with sent-protection and progress tracking
    for (const lead of leads) {
      if (!lead.email) {
        processedResults.push({
          leadId: lead.id,
          company: lead.company,
          email: null,
          status: 'error',
          message: 'No email address available',
        });
        continue;
      }

      const emailNormalized = lead.email.trim().toLowerCase();

      // SENT EMAIL PROTECTION: If already sent, skip creating duplicate draft!
      if (sentLeadIdSet.has(lead.id) || sentEmailSet.has(emailNormalized)) {
        skippedSentCount++;
        skippedSentLeads.push(lead.company);
        processedResults.push({
          leadId: lead.id,
          company: lead.company,
          email: lead.email,
          status: 'skipped_sent',
          message: 'Email already sent previously. Protected from duplicate outreach.',
        });
        continue;
      }

      for (const p of providersToRun) {
        try {
          const draftOutput = await generateEmailDraft(
            {
              id: lead.id,
              company: lead.company,
              location: lead.location,
              salary: lead.salary,
              experience: lead.experience,
              key_skills: lead.key_skills,
              raw_data: lead.raw_data,
            },
            activeResume.extracted_text || '',
            p,
            userId,
            groqModel
          );

          // Delete prior un-sent draft for this lead & provider (NEVER delete sent records)
          await supabase
            .from('email_drafts')
            .delete()
            .eq('lead_id', lead.id)
            .eq('ai_provider', p)
            .neq('status', 'sent')
            .neq('status', 'replied');

          // Save new draft
          await supabase.from('email_drafts').insert({
            user_id: userId || null,
            lead_id: lead.id,
            resume_id: activeResume.id,
            ai_provider: p,
            subject: draftOutput.subject,
            body: draftOutput.body,
            status: 'drafted',
            edited_by_user: false,
          });

          generatedCount++;
          processedResults.push({
            leadId: lead.id,
            company: lead.company,
            email: lead.email,
            status: 'generated',
            message: `Draft generated via ${p.toUpperCase()}`,
          });

          // Short delay (150ms) between sequential calls
          await new Promise((resolve) => setTimeout(resolve, 150));
        } catch (err: any) {
          console.error(`AI draft generation error for lead ${lead.id} (${p}):`, err);
          errors.push(`Lead ${lead.company}: ${err?.message || 'AI Generation error'}`);
          processedResults.push({
            leadId: lead.id,
            company: lead.company,
            email: lead.email,
            status: 'error',
            message: err?.message || 'AI Generation failed',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount,
      skippedSentCount,
      skippedSentLeads,
      processedResults,
      errors,
    });
  } catch (error: any) {
    console.error('Draft generation endpoint error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during draft generation' }, { status: 500 });
  }
}
