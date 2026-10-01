// tests/services/groq.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import generateAIResponse from '../../src/services/groq.js';

vi.mock('axios');

describe('generateAIResponse (Groq Service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-key-123';
  });

  it('should throw error when GROQ_API_KEY is missing', async () => {
    delete process.env.GROQ_API_KEY;

    await expect(
      generateAIResponse({
        prompt: 'Test prompt',
        systemPrompt: 'Test system prompt',
        promptType: 'insight',
      })
    ).rejects.toThrow('Missing GROQ_API_KEY');
  });

  it('should successfully call Groq API with correct parameters', async () => {
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: '{"post": "Generated post", "imagePrompt": "Image"}',
            },
          },
        ],
      },
    };

    axios.post.mockResolvedValue(mockResponse);

    const result = await generateAIResponse({
      prompt: 'Write a LinkedIn post',
      systemPrompt: 'You are a LinkedIn expert',
      promptType: 'insight',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        model: 'openai/gpt-oss-120b',
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 700,
      }),
      expect.objectContaining({
        timeout: 20000,
        headers: {
          Authorization: 'Bearer test-key-123',
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('should handle API error responses', async () => {
    const error = new Error('API Error');
    axios.post.mockRejectedValue(error);

    await expect(
      generateAIResponse({
        prompt: 'Test',
        systemPrompt: 'Test',
        promptType: 'insight',
      })
    ).rejects.toThrow('API Error');
  });

  it('should return empty string when content is null', async () => {
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      },
    };

    axios.post.mockResolvedValue(mockResponse);

    await expect(
      generateAIResponse({
        prompt: 'Test',
        systemPrompt: 'Test',
        promptType: 'insight',
      })
    ).rejects.toThrow('Groq request failed');
  });

  it('should extract content from nested response structure', async () => {
    const mockResponse = {
      data: {
        choices: [
          {
            message: {
              content: '{"post": "Test post"}',
            },
          },
        ],
      },
    };

    axios.post.mockResolvedValue(mockResponse);

    const result = await generateAIResponse({
      prompt: 'Test',
      systemPrompt: 'Test',
      promptType: 'insight',
    });

    expect(result.text).toBe('{"post": "Test post"}');
    expect(result.promptType).toBe('insight');
  });

  it('should handle timeout errors', async () => {
    axios.post.mockRejectedValue(new Error('Request timeout'));

    await expect(
      generateAIResponse({
        prompt: 'Test',
        systemPrompt: 'Test',
        promptType: 'insight',
      })
    ).rejects.toThrow('Request timeout');
  });
});
