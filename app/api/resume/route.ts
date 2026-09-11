import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdf } from '@/lib/pdf';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: resumes, error } = await supabase
      .from('resumes')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ resumes: resumes || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch resumes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF document' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract text from PDF
    const { extractedText } = await extractTextFromPdf(buffer);

    const supabase = createAdminClient();

    // 2. Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `resumes/${fileName}`;

    const { error: storageError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (storageError) {
      console.error('Supabase storage upload error:', storageError);
      // Fallback: continue even if storage bucket isn't initialized yet
    }

    // 3. Mark existing active resumes as false
    await supabase.from('resumes').update({ is_active: false }).eq('is_active', true);

    // 4. Insert new resume record
    const { data: newResume, error: dbError } = await supabase
      .from('resumes')
      .insert({
        file_name: file.name,
        storage_path: storagePath,
        extracted_text: extractedText,
        is_active: true,
      })
      .select('*')
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resume: newResume,
    });
  } catch (error: any) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during resume upload' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { resumeId } = body;

    if (!resumeId) {
      return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Set all inactive
    await supabase.from('resumes').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

    // Set target active
    const { data, error } = await supabase
      .from('resumes')
      .update({ is_active: true })
      .eq('id', resumeId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activeResume: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update active resume' }, { status: 500 });
  }
}
