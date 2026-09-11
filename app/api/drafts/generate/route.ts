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

    let generatedCount = 0;
    const errors: string[] = [];

    const providersToRun: Array<'gemini' | 'claude' | 'groq'> =
      provider === 'both' ? ['groq', 'claude'] : [provider];

    // Sequential Queue execution with short delay between requests to avoid API rate limits (429)
    for (const lead of leads) {
      if (!lead.email) continue;

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

          // Delete previous draft for this lead & provider if exists
          await supabase.from('email_drafts').delete().eq('lead_id', lead.id).eq('ai_provider', p);

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

          // Short delay (200ms) between sequential calls
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (err: any) {
          console.error(`AI draft generation error for lead ${lead.id} (${p}):`, err);
          errors.push(`Lead ${lead.company}: ${err?.message || 'AI Generation error'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      generatedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Draft generation endpoint error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during draft generation' }, { status: 500 });
  }
}
