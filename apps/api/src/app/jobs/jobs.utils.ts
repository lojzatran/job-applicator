import * as cheerio from 'cheerio';

/**
 * Strips all attributes from HTML tags and removes comments and excessive whitespace.
 * @param html The HTML string to clean.
 * @returns Cleaned HTML string.
 */
export const cleanHtml = (html: string): string => {
  if (!html) return '';
  const $ = cheerio.load(html);

  // Remove attributes from all tags
  $('*').each((_, el) => {
    if ('attribs' in el) {
      el.attribs = {};
    }
  });

  // Return the content of body (which contains the fragment) with regex cleanup
  return (
    $('body')
      .html()
      ?.replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/>\s+</g, '><')          // Remove space between tags
      .trim() || ''
  );
};
