import { NextRequest, NextResponse } from 'next/server';
import { previewExcelFile, processExcelFileWithMapping, ColumnMapping } from '@/lib/excel';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const action = (formData.get('action') as string) || 'import';

    if (!file) {
      return NextResponse.json({ error: 'No Excel file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Preview Mode: Return extracted column headers, sample rows, and auto-mapping
    if (action === 'preview') {
      const previewResult = previewExcelFile(buffer, file.name);
      return NextResponse.json({
        success: true,
        preview: previewResult,
      });
    }

    // 2. Import Mode: Process file using user-defined column mapping
    const mappingJson = formData.get('mapping') as string | null;
    let mapping: ColumnMapping = {};
    if (mappingJson) {
      try {
        mapping = JSON.parse(mappingJson);
      } catch (e) {
        console.warn('Failed to parse mapping JSON:', e);
      }
    }

    const parseResult = processExcelFileWithMapping(buffer, file.name, mapping);

    if (parseResult.leads.length === 0) {
      return NextResponse.json({
        message: 'No leads extracted from file',
        summary: parseResult,
      });
    }

    const supabase = createAdminClient();

    // Deduplicate against existing database records by (company, email)
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('company, email')
      .not('email', 'is', null);

    const existingSet = new Set(
      (existingLeads || []).map(l => `${(l.company || '').trim().toLowerCase()}::${(l.email || '').trim().toLowerCase()}`)
    );

    const toInsert = [];
    let deduplicatedSkipped = 0;

    for (const lead of parseResult.leads) {
      if (lead.email) {
        const key = `${lead.company.trim().toLowerCase()}::${lead.email.trim().toLowerCase()}`;
        if (existingSet.has(key)) {
          deduplicatedSkipped++;
          continue;
        }
        existingSet.add(key);
      }
      toInsert.push(lead);
    }

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const { data: inserted, error } = await supabase.from('leads').insert(toInsert).select('id');
      if (error) {
        console.error('Database insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      insertedCount = inserted?.length || 0;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRowsProcessed: parseResult.totalRowsProcessed,
        insertedCount,
        deduplicatedSkipped,
        validEmailCount: parseResult.validEmailCount,
        urlOnlyCount: parseResult.urlOnlyCount,
      },
    });
  } catch (error: any) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during Excel import' }, { status: 500 });
  }
}
