// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export interface ResumeParseResult {
  extractedText: string;
  pageCount: number;
}

export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<ResumeParseResult> {
  try {
    const data = await pdfParse(pdfBuffer);
    return {
      extractedText: data.text ? data.text.trim() : '',
      pageCount: data.numpages || 1,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to extract text from resume PDF file.');
  }
}
