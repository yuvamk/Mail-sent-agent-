import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendOutreachEmail } from '@/lib/smtp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    const supabase = createAdminClient();

    let query = supabase
      .from('email_drafts')
      .select('*, leads(*), resumes(*)')
      .in('status', ['drafted', 'reviewed', 'approved']);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: drafts, error } = await query;

    if (error || !drafts || drafts.length === 0) {
      return NextResponse.json({ message: 'No drafts ready in queue to send', sentCount: 0 });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const draft of drafts) {
      const lead = draft.leads;
      if (!lead || !lead.email) continue;

      // Attachment buffer
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
          console.warn('Could not download resume PDF attachment:', e);
        }
      }

      const sendResult = await sendOutreachEmail({
        toEmail: lead.email,
        subject: draft.subject,
        bodyText: draft.body,
        attachmentFileName,
        attachmentBuffer,
        userId: userId || draft.user_id,
      });

      if (sendResult.success) {
        await supabase
          .from('email_drafts')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', draft.id);

        sentCount++;
      } else {
        await supabase
          .from('email_drafts')
          .update({
            status: 'failed',
            error_message: sendResult.errorMessage,
          })
          .eq('id', draft.id);

        failedCount++;
        errors.push(`${lead.company} (${lead.email}): ${sendResult.errorMessage}`);
      }

      // Short delay (300ms) between SMTP sends
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      errors,
    });
  } catch (error: any) {
    console.error('Send All Batch error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during batch send' }, { status: 500 });
  }
}
