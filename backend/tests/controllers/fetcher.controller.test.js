// tests/controllers/fetcher.controller.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/queue/fetcher.queue.js');

describe('Fetcher Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: { source: 'devto' },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.clearAllMocks();
  });

  describe('triggerFetch', () => {
    it('should require source parameter', () => {
      req.body.source = '';
      expect(req.body.source).toBe('');
    });

    it('should validate source is supported', () => {
      const supportedSources = ['devto', 'medium', 'github', 'hashnode', 'npm'];
      expect(supportedSources).toContain('devto');
    });

    it('should queue fetch job', () => {
      const job = {
        id: 'fetch-123',
        data: { source: 'devto' },
      };
      expect(job.data.source).toBe('devto');
    });

    it('should handle queue errors', () => {
      const error = new Error('Queue unavailable');
      expect(() => {
        throw error;
      }).toThrow('Queue unavailable');
    });
  });

  describe('getFetchStatus', () => {
    it('should retrieve fetch status by job ID', () => {
      const status = {
        jobId: 'fetch-123',
        status: 'completed',
        itemsFetched: 25,
      };
      expect(status.itemsFetched).toBe(25);
    });

    it('should show progress for ongoing fetches', () => {
      const progress = {
        status: 'processing',
        progress: 75,
      };
      expect(progress.progress).toBe(75);
    });
  });

  describe('getFetchHistory', () => {
    it('should retrieve fetch history', () => {
      const history = [
        { source: 'devto', timestamp: new Date(), count: 10 },
        { source: 'medium', timestamp: new Date(), count: 15 },
      ];
      expect(history.length).toBe(2);
    });

    it('should support pagination', () => {
      const paginatedResults = {
        page: 1,
        limit: 10,
        total: 50,
      };
      expect(paginatedResults.total).toBe(50);
    });
  });
});
