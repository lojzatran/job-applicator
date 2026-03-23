import { Injectable } from '@nestjs/common';
import { pageTextFromContent } from './pdf.utils';
import { PdfTextContent } from './pdf.types';

@Injectable()
export class PdfService {
  async extractTextContent(filePath: string): Promise<string> {
    const pdfjsLib = await import(
      /* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs'
    );
    const pdf = await pdfjsLib.getDocument(filePath).promise;

    const totalPageCount = pdf.numPages;
    const countPromises: Promise<string>[] = [];

    for (let currentPage = 1; currentPage <= totalPageCount; currentPage++) {
      countPromises.push(
        pdf.getPage(currentPage).then(async (page) => {
          const textContent = (await page.getTextContent()) as PdfTextContent;
          return pageTextFromContent(textContent);
        }),
      );
    }

    const texts = await Promise.all(countPromises);
    return texts.filter((text) => text.length > 0).join('\n\n');
  }
}
