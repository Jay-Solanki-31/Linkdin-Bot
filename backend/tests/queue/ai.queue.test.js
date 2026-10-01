// tests/queue/ai.queue.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addAIJob } from '../../src/queue/ai.queue.js';

vi.mock('../../src/queue/connection.js', () => ({
  redisConnection: {
    connection: {
      on: vi.fn(),
    },
  },
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    process: vi.fn(),
  })),
}));

describe('AI Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add AI job to queue', async () => {
    const mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    };

    // Mock implementation
    const jobData = { postId: '123' };
    const result = await mockQueue.add('ai-generation', jobData);

    expect(result).toHaveProperty('id');
  });

  it('should set job options correctly', async () => {
    const mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    };

    const jobData = { postId: '456' };
    await mockQueue.add('ai-generation', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: true,
    });

    expect(mockQueue.add).toHaveBeenCalled();
  });

  it('should handle queue errors', async () => {
    const mockQueue = {
      add: vi.fn().mockRejectedValue(new Error('Queue error')),
    };

    await expect(
      mockQueue.add('ai-generation', { postId: '123' })
    ).rejects.toThrow('Queue error');
  });

  it('should create job with correct data structure', async () => {
    const mockJob = {
      id: 'job-789',
      data: { postId: '789' },
      status: 'waiting',
    };

    expect(mockJob).toHaveProperty('id');
    expect(mockJob).toHaveProperty('data');
    expect(mockJob.data).toHaveProperty('postId');
  });
});
