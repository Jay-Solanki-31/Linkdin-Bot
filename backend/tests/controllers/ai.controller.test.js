// tests/controllers/ai.controller.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateAIManually } from '../../src/controller/ai.controller.js';
import GeneratedPost from '../../src/models/generatedPost.model.js';
import * as aiQueue from '../../src/queue/ai.queue.js';

vi.mock('../../src/models/generatedPost.model.js');
vi.mock('../../src/queue/ai.queue.js');

describe('AI Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { postId: '123' },
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  describe('generateAIManually', () => {
    it('should return 400 if postId is missing', async () => {
      req.params.postId = null;

      await generateAIManually(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'postId is required',
      });
    });

    it('should return 404 if post not found', async () => {
      GeneratedPost.findById.mockResolvedValue(null);

      await generateAIManually(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Post not found',
      });
    });

    it('should queue AI job for valid post', async () => {
      const mockPost = { _id: '123', title: 'Test Post' };
      const mockJob = { id: 'job-456' };

      GeneratedPost.findById.mockResolvedValue(mockPost);
      aiQueue.addAIJob.mockResolvedValue(mockJob);

      await generateAIManually(req, res);

      expect(aiQueue.addAIJob).toHaveBeenCalledWith('123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'AI generation job queued',
        jobId: 'job-456',
        postId: '123',
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      GeneratedPost.findById.mockRejectedValue(error);

      await expect(generateAIManually(req, res)).rejects.toThrow('Database error');
    });

    it('should handle queue errors', async () => {
      const mockPost = { _id: '123' };
      GeneratedPost.findById.mockResolvedValue(mockPost);
      aiQueue.addAIJob.mockRejectedValue(new Error('Queue error'));

      await expect(generateAIManually(req, res)).rejects.toThrow('Queue error');
    });
  });
});
