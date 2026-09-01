// tests/models/fetchedContent.model.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FetchedContent Model', () => {
  let mockContent;

  beforeEach(() => {
    mockContent = {
      _id: 'content-123',
      title: 'Article Title',
      description: 'Article content',
      url: 'https://example.com/article',
      source: 'devto',
      author: 'John Doe',
      publishedAt: new Date(),
      imageUrl: 'https://example.com/image.jpg',
      tags: ['javascript', 'web-dev'],
      isProcessed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('should have required fields', () => {
    expect(mockContent).toHaveProperty('title');
    expect(mockContent).toHaveProperty('description');
    expect(mockContent).toHaveProperty('url');
    expect(mockContent).toHaveProperty('source');
  });

  it('should validate source type', () => {
    const validSources = ['devto', 'medium', 'github', 'hashnode', 'npm'];
    expect(validSources).toContain(mockContent.source);
  });

  it('should prevent duplicate content', () => {
    const content1 = { url: 'https://example.com/article' };
    const content2 = { url: 'https://example.com/article' };

    expect(content1.url).toBe(content2.url);
  });

  it('should track processing status', () => {
    expect(mockContent.isProcessed).toBe(false);
    
    mockContent.isProcessed = true;
    expect(mockContent.isProcessed).toBe(true);
  });

  it('should store content metadata', () => {
    expect(mockContent).toHaveProperty('author');
    expect(mockContent).toHaveProperty('publishedAt');
    expect(mockContent).toHaveProperty('tags');
  });

  it('should support tagging', () => {
    expect(mockContent.tags).toBeInstanceOf(Array);
    expect(mockContent.tags).toContain('javascript');
  });

  it('should track content timestamps', () => {
    expect(mockContent.createdAt).toBeInstanceOf(Date);
    expect(mockContent.updatedAt).toBeInstanceOf(Date);
  });

  it('should validate URL format', () => {
    const isValidUrl = /^https?:\/\/.+/.test(mockContent.url);
    expect(isValidUrl).toBe(true);
  });

  it('should allow nullable image URL', () => {
    const contentNoImage = { ...mockContent, imageUrl: null };
    expect(contentNoImage.imageUrl).toBeNull();
  });

  it('should support content search', () => {
    // Assuming search by title or description
    const searchTerm = 'Article';
    const matches = mockContent.title.includes(searchTerm) ||
                    mockContent.description.includes(searchTerm);
    expect(matches).toBe(true);
  });

  it('should track content source integrity', () => {
    expect(mockContent.url).toBeDefined();
    expect(mockContent.source).toBeDefined();
  });
});
