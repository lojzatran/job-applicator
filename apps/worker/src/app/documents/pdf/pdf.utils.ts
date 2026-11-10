import { PdfTextContent, PdfTextItem, PositionedTextItem } from './pdf.types';

const isTextItem = (
  item: PdfTextItem | { type: string },
): item is PdfTextItem => 'str' in item;

const toPositionedItem = (item: PdfTextItem): PositionedTextItem => ({
  ...item,
  x: item.transform[4] ?? 0,
  y: item.transform[5] ?? 0,
  lineHeight: Math.max(
    Math.abs(item.height),
    Math.abs(item.transform[3] ?? 0),
    1,
  ),
});

const shouldInsertSpace = (
  previousItem: PositionedTextItem,
  currentItem: PositionedTextItem,
): boolean => {
  const previousEndX = previousItem.x + previousItem.width;
  const gap = currentItem.x - previousEndX;
  const minGapForSpace =
    Math.max(previousItem.lineHeight, currentItem.lineHeight) * 0.15;
  return gap > minGapForSpace;
};

const appendLineBreak = (parts: string[], asParagraphBreak: boolean) => {
  const breakToken = asParagraphBreak ? '\n\n' : '\n';
  const lastPart = parts.at(-1);

  if (!lastPart) {
    return;
  }

  if (lastPart.endsWith('\n\n')) {
    return;
  }

  if (asParagraphBreak && lastPart.endsWith('\n')) {
    parts[parts.length - 1] = `${lastPart}\n`;
    return;
  }

  if (!lastPart.endsWith('\n')) {
    parts.push(breakToken);
  }
};

export const pageTextFromContent = (textContent: PdfTextContent): string => {
  const textItems = textContent.items
    .filter(isTextItem)
    .map(toPositionedItem)
    .filter((item) => item.str.trim().length > 0);

  if (textItems.length === 0) {
    return '';
  }

  const parts: string[] = [];
  let previousItem: PositionedTextItem | null = null;

  for (const item of textItems) {
    if (!previousItem) {
      parts.push(item.str);
      previousItem = item;
      continue;
    }

    const verticalGap = Math.abs(item.y - previousItem.y);
    const lineBreakThreshold =
      Math.max(previousItem.lineHeight, item.lineHeight) * 0.45;
    const paragraphBreakThreshold =
      Math.max(previousItem.lineHeight, item.lineHeight) * 1.2;
    const startsNewLine =
      previousItem.hasEOL || verticalGap > lineBreakThreshold;

    if (startsNewLine) {
      appendLineBreak(parts, verticalGap > paragraphBreakThreshold);
    } else if (shouldInsertSpace(previousItem, item)) {
      parts.push(' ');
    }

    parts.push(item.str);
    previousItem = item;
  }

  return parts
    .join('')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
};
