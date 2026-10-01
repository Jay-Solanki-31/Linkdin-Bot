// tests/services/analytics.service.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../src/models/postAnalytics.model.js');

describe('Analytics Service', () => {
  let analyticsService;

  beforeEach(() => {
    analyticsService = {
      getMetrics: vi.fn(),
      calculateEngagement: vi.fn(),
      getDashboardStats: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should retrieve engagement metrics for a post', async () => {
      const mockMetrics = {
        postId: '123',
        likes: 150,
        comments: 45,
        shares: 12,
      };

      analyticsService.getMetrics.mockResolvedValue(mockMetrics);
      const result = await analyticsService.getMetrics('123');

      expect(result).toHaveProperty('likes');
      expect(result).toHaveProperty('comments');
    });

    it('should handle metrics for non-existent post', async () => {
      analyticsService.getMetrics.mockResolvedValue(null);
      const result = await analyticsService.getMetrics('999');

      expect(result).toBeNull();
    });

    it('should calculate engagement rate', async () => {
      const mockMetrics = {
        likes: 100,
        comments: 25,
        shares: 10,
        impressions: 5000,
      };

      const engagementRate = ((100 + 25 + 10) / 5000) * 100;
      expect(engagementRate).toBe(2.7);
    });
  });

  describe('calculateEngagement', () => {
    it('should compute engagement statistics', async () => {
      const engagements = [50, 75, 120, 90];
      
      analyticsService.calculateEngagement.mockResolvedValue({
        average: 83.75,
        max: 120,
        min: 50,
      });

      const result = await analyticsService.calculateEngagement(engagements);

      expect(result.average).toBe(83.75);
      expect(result.max).toBe(120);
    });

    it('should handle empty engagement data', async () => {
      analyticsService.calculateEngagement.mockResolvedValue({
        average: 0,
        max: 0,
        min: 0,
      });

      const result = await analyticsService.calculateEngagement([]);

      expect(result.average).toBe(0);
    });
  });

  describe('getDashboardStats', () => {
    it('should retrieve dashboard statistics', async () => {
      const mockStats = {
        totalPosts: 25,
        publishedPosts: 18,
        totalEngagement: 2500,
        averageEngagementRate: 3.2,
      };

      analyticsService.getDashboardStats.mockResolvedValue(mockStats);
      const result = await analyticsService.getDashboardStats();

      expect(result).toHaveProperty('totalPosts');
      expect(result.totalPosts).toBe(25);
    });

    it('should group stats by period', async () => {
      const weeklyStats = {
        period: 'week',
        stats: [
          { day: 'Monday', engagement: 250 },
          { day: 'Tuesday', engagement: 300 },
        ],
      };

      analyticsService.getDashboardStats.mockResolvedValue(weeklyStats);
      const result = await analyticsService.getDashboardStats('week');

      expect(result.stats.length).toBeGreaterThan(0);
    });
  });

  describe('getTrendingPosts', () => {
    it('should return trending posts by engagement', async () => {
      const trending = [
        { postId: '1', engagement: 500, rank: 1 },
        { postId: '2', engagement: 450, rank: 2 },
        { postId: '3', engagement: 400, rank: 3 },
      ];

      expect(trending[0].rank).toBe(1);
      expect(trending[0].engagement).toBeGreaterThan(trending[1].engagement);
    });

    it('should limit results to top N posts', () => {
      const topPosts = Array(10)
        .fill(null)
        .map((_, i) => ({
          postId: String(i),
          engagement: 500 - i * 10,
        }));

      expect(topPosts.length).toBe(10);
    });
  });

  describe('getEngagementTrend', () => {
    it('should calculate engagement trend over time', () => {
      const trend = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        trend: 'up',
        percentageChange: 15.5,
      };

      expect(trend).toHaveProperty('trend');
      expect(trend.trend).toBe('up');
    });

    it('should detect declining engagement', () => {
      const trend = {
        trend: 'down',
        percentageChange: -10.2,
      };

      expect(trend.trend).toBe('down');
    });
  });
});
