import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendOutreachEmail } from '@/lib/smtp';
import { assertActiveSubscription } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, subject: customSubject, body: customBody } = body;

    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Fetch draft record with lead and resume info
    const { data: draft, error: draftError } = await supabase
      .from('email_drafts')
      .select('*, leads(*), resumes(*)')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft record not found' }, { status: 404 });
    }

    if (draft.user_id) {
      const subCheck = await assertActiveSubscription(draft.user_id);
      if (!subCheck.allowed) {
        return NextResponse.json(
          { error: subCheck.error, code: 'SUBSCRIPTION_EXPIRED' },
          { status: 402 }
        );
      }
    }

    const lead = draft.leads;
    if (!lead || !lead.email) {
      return NextResponse.json({ error: 'Target lead does not have a valid email address' }, { status: 400 });
    }

    const sendSubject = customSubject || draft.subject;
    const sendBody = customBody || draft.body;

    // 2. Fetch active resume PDF attachment buffer if available
    let attachmentBuffer: Buffer | undefined = undefined;
    let attachmentFileName: string | undefined = undefined;

    const resume = draft.resumes;
    if (resume && resume.storage_path) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('resumes')
          .download(resume.storage_path);

        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          attachmentBuffer = Buffer.from(arrayBuffer);
          attachmentFileName = resume.file_name || 'Resume.pdf';
        }
      } catch (e) {
        console.warn('Could not download resume PDF attachment from storage:', e);
      }
    }

    // 3. Dispatch email strictly via Nodemailer SMTP
    const sendResult = await sendOutreachEmail({
      toEmail: lead.email,
      subject: sendSubject,
      bodyText: sendBody,
      attachmentFileName,
      attachmentBuffer,
    });

    if (sendResult.success) {
      // 4. Update status to 'sent'
      const { data: updatedDraft } = await supabase
        .from('email_drafts')
        .update({
          subject: sendSubject,
          body: sendBody,
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', draftId)
        .select('*')
        .single();

      return NextResponse.json({
        success: true,
        message: `Email successfully sent to ${lead.email}`,
        draft: updatedDraft,
      });
    } else {
      // Record failure
      const { data: failedDraft } = await supabase
        .from('email_drafts')
        .update({
          subject: sendSubject,
          body: sendBody,
          status: 'failed',
          error_message: sendResult.errorMessage,
        })
        .eq('id', draftId)
        .select('*')
        .single();

      return NextResponse.json(
        {
          success: false,
          error: sendResult.errorMessage,
          draft: failedDraft,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Approve & Send error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during email sending' }, { status: 500 });
  }
}
