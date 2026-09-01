// tests/utils/contentClassifier.test.js
import { describe, it, expect, vi } from 'vitest';
import { detectSourceType } from '../../src/utils/contentClassifier.js';
import { cleanContent } from '../../src/utils/cleanContent.js';

describe('Content Classifier Utils', () => {
  describe('detectSourceType', () => {
    it('should detect Dev.to URLs', () => {
      const result = detectSourceType('https://dev.to/author/article-title');
      expect(result).toBe('devto');
    });

    it('should detect Medium URLs', () => {
      const result = detectSourceType('https://medium.com/@author/article');
      expect(result).toBe('medium');
    });

    it('should detect GitHub URLs', () => {
      const result = detectSourceType('https://github.com/trending');
      expect(result).toBe('github');
    });

    it('should detect Hashnode URLs', () => {
      const result = detectSourceType('https://hashnode.com/post/article');
      expect(result).toBe('hashnode');
    });

    it('should detect NPM URLs', () => {
      const result = detectSourceType('https://npmjs.com/package/react');
      expect(result).toBe('npm');
    });

    it('should detect Reddit URLs', () => {
      const result = detectSourceType('https://reddit.com/r/programming');
      expect(result).toBe('reddit');
    });

    it('should detect Hacker News URLs', () => {
      const result = detectSourceType('https://news.ycombinator.com/item?id=123');
      expect(result).toBe('hackernews');
    });

    it('should return general for unknown URLs', () => {
      const result = detectSourceType('https://unknown-website.com/article');
      expect(result).toBe('general');
    });

    it('should handle empty URL gracefully', () => {
      const result = detectSourceType('');
      expect(result).toBe('general');
    });

    it('should handle undefined URL gracefully', () => {
      const result = detectSourceType(undefined);
      expect(result).toBe('general');
    });
  });

  describe('cleanContent', () => {
    it('should remove HTML tags', () => {
      const html = '<p>Hello <b>world</b></p>';
      const result = cleanContent(html);
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should trim extra whitespace', () => {
      const text = '  Multiple   spaces   here  ';
      const result = cleanContent(text);
      expect(result).toBe('Multiple spaces here');
    });

    it('should handle special characters', () => {
      const text = 'Special &amp; characters &lt;tag&gt;';
      const result = cleanContent(text);
      expect(typeof result).toBe('string');
    });

    it('should remove script tags', () => {
      const html = '<script>alert("XSS")</script><p>Content</p>';
      const result = cleanContent(html);
      expect(result).not.toContain('script');
    });

    it('should handle empty input', () => {
      const result = cleanContent('');
      expect(result).toBe('');
    });

    it('should preserve content structure', () => {
      const html = '<h1>Title</h1><p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = cleanContent(html);
      expect(result).toContain('Title');
      expect(result).toContain('Paragraph 1');
      expect(result).toContain('Paragraph 2');
    });
  });
});
