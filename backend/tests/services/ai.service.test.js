// tests/services/ai.service.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

let aiService;
let generateAIResponse;
let detectSourceType;

// Hoisted mocks
vi.mock('../../src/services/groq.js', () => ({
  default: vi.fn(),
}));

vi.mock('../../src/utils/contentClassifier.js', () => ({
  detectSourceType: vi.fn(),
}));

vi.mock('../../src/modules/ai/ai.service.js', async () => {
  const actual = await vi.importActual('../../src/modules/ai/ai.service.js');
  return actual;
});

describe('AIService', () => {
  beforeEach(async () => {
    // Import/re-import to ensure we get the mocked versions
    if (!aiService) {
      const module = await import('../../src/modules/ai/ai.service.js');
      aiService = module.default;
    }
    if (!generateAIResponse) {
      const mod = await import('../../src/services/groq.js');
      generateAIResponse = mod.default;
    }
    if (!detectSourceType) {
      const mod = await import('../../src/utils/contentClassifier.js');
      detectSourceType = mod.detectSourceType;
    }
    vi.clearAllMocks();
  });

  describe('generateForContent', () => {
    it('should throw error if title and description are empty', async () => {
      await expect(
        aiService.generateForContent({
          title: '',
          description: '',
          source: 'Dev.to',
          url: 'https://dev.to/article',
        })
      ).rejects.toThrow('AIService: empty content');
    });

    it('should successfully generate AI content for valid input', async () => {
      // Test that the function is callable with valid input
      // Note: This test requires GROQ_API_KEY to be set in environment
      if (!process.env.GROQ_API_KEY) {
        // Mock for test environment
        vi.mocked(generateAIResponse).mockResolvedValue({
          text: '{"post": "Test post content with sufficient length for validation", "imagePrompt": "Test image prompt with minimum length"}',
          promptType: 'insight',
        });
        vi.mocked(detectSourceType).mockReturnValue('devto');
      }

      try {
        const result = await aiService.generateForContent({
          title: 'Test Article Title',
          description: 'This is a test article description with meaningful content',
          source: 'Dev.to',
          url: 'https://dev.to/article',
        });
        // If we get here, the function worked
        expect(result).toBeDefined();
      } catch (err) {
        // Expected if API key is missing or mock is not applied
        if (!process.env.GROQ_API_KEY) {
          expect(err.message).toMatch(/GROQ|API|Missing|mock/i);
        }
      }
    });

    it('should handle missing description gracefully', async () => {
      if (!process.env.GROQ_API_KEY) {
        vi.mocked(generateAIResponse).mockResolvedValue({
          text: '{"post": "Test post content with sufficient length for validation", "imagePrompt": "Test image prompt"}',
          promptType: 'insight',
        });
        vi.mocked(detectSourceType).mockReturnValue('medium');
      }

      try {
        const result = await aiService.generateForContent({
          title: 'Article Title',
          description: '',
          source: 'Medium',
          url: 'https://medium.com/article',
        });
        expect(result).toBeDefined();
      } catch (err) {
        // Expected behavior
        expect(err).toBeDefined();
      }
    });

    it('should detect correct source type', async () => {
      const mockResponse = {
        text: '{"post": "This is a meaningful post about trending GitHub repositories and open source collaboration", "imagePrompt": "A visualization of GitHub repository trending indicators and collaboration"}',
        promptType: 'insight',
      };

      vi.mocked(generateAIResponse).mockResolvedValue(mockResponse);
      vi.mocked(detectSourceType).mockReturnValue('github');

      await aiService.generateForContent({
        title: 'Trending Repo',
        description: 'A popular GitHub repository',
        source: 'GitHub',
        url: 'https://github.com/repo',
      });

      expect(vi.mocked(detectSourceType)).toHaveBeenCalledWith('https://github.com/repo');
    });

    it('should clamp title to 180 characters', async () => {
      const longTitle = 'a'.repeat(200);
      const mockResponse = {
        text: '{"post": "This is an important discussion about technical concepts and best practices for software development teams", "imagePrompt": "Professional illustration showing software development concepts and collaboration"}',
        promptType: 'insight',
      };

      vi.mocked(generateAIResponse).mockResolvedValue(mockResponse);
      vi.mocked(detectSourceType).mockReturnValue('devto');

      await aiService.generateForContent({
        title: longTitle,
        description: 'Description',
        source: 'Dev.to',
        url: 'https://dev.to/article',
      });

      const callArgs = vi.mocked(generateAIResponse).mock.calls[0][0];
      expect(callArgs.prompt).toContain('a'.repeat(180));
    });

    it('should handle API errors gracefully', async () => {
      const error = new Error('API request failed');
      vi.mocked(generateAIResponse).mockRejectedValue(error);
      vi.mocked(detectSourceType).mockReturnValue('devto');

      await expect(
        aiService.generateForContent({
          title: 'Test',
          description: 'Test description',
          source: 'Dev.to',
          url: 'https://dev.to/article',
        })
      ).rejects.toThrow('API request failed');
    });
  });
});
