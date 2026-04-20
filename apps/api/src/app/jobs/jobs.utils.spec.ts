import { cleanHtml } from './jobs.utils';

describe('cleanHtml', () => {
  describe('edge cases', () => {
    it('should return an empty string for an empty string input', () => {
      expect(cleanHtml('')).toBe('');
    });

    it('should return an empty string for a null-ish value', () => {
      expect(cleanHtml(null as unknown as string)).toBe('');
      expect(cleanHtml(undefined as unknown as string)).toBe('');
    });
  });

  describe('attribute stripping', () => {
    it('should remove all attributes from a single tag', () => {
      const input = '<p class="foo" id="bar">Hello</p>';
      expect(cleanHtml(input)).toBe('<p>Hello</p>');
    });

    it('should remove attributes from nested tags', () => {
      const input = '<div style="color:red"><span class="bold">Text</span></div>';
      expect(cleanHtml(input)).toBe('<div><span>Text</span></div>');
    });

    it('should remove multiple attributes on the same element', () => {
      const input = '<a href="https://example.com" target="_blank" rel="noopener">Link</a>';
      expect(cleanHtml(input)).toBe('<a>Link</a>');
    });
  });

  describe('comment removal', () => {
    it('should remove inline HTML comments', () => {
      const input = '<p>Hello<!-- this is a comment --> World</p>';
      expect(cleanHtml(input)).toBe('<p>Hello World</p>');
    });

    it('should remove multi-line HTML comments', () => {
      const input = '<p>Before<!--\n  multi\n  line\n  comment\n-->After</p>';
      expect(cleanHtml(input)).toBe('<p>BeforeAfter</p>');
    });
  });

  describe('whitespace normalisation', () => {
    it('should collapse multiple spaces into one', () => {
      const input = '<p>Too   many   spaces</p>';
      expect(cleanHtml(input)).toBe('<p>Too many spaces</p>');
    });

    it('should remove whitespace between tags', () => {
      const input = '<ul> <li>One</li> <li>Two</li> </ul>';
      expect(cleanHtml(input)).toBe('<ul><li>One</li><li>Two</li></ul>');
    });

    it('should trim leading and trailing whitespace from the result', () => {
      const input = '  <p>Padded</p>  ';
      expect(cleanHtml(input)).toBe('<p>Padded</p>');
    });
  });

  describe('plain text input', () => {
    it('should return plain text unchanged (no tags to strip)', () => {
      expect(cleanHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('combined scenarios', () => {
    it('should strip attributes, remove comments, and normalise whitespace together', () => {
      const input = `
        <div class="wrapper">
          <!-- section header -->
          <h1 id="title">  Job Title  </h1>
          <p style="margin:0">Description   text</p>
        </div>
      `;
      const result = cleanHtml(input);
      expect(result).toBe('<div><h1> Job Title </h1><p>Description text</p></div>');
    });
  });
});
