export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL?: boolean;
};

export type PdfTextContent = {
  items: Array<PdfTextItem | { type: string }>;
};

export type PositionedTextItem = PdfTextItem & {
  x: number;
  y: number;
  lineHeight: number;
};
