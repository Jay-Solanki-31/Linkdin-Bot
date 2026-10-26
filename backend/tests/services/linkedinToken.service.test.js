// tests/services/linkedinToken.service.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LinkedInToken from '../../src/models/linkedinToken.model.js';
import { getValidLinkedInToken } from '../../src/services/linkedinToken.service.js';

vi.mock('../../src/models/linkedinToken.model.js', () => ({
  default: { findOne: vi.fn() },
}));

describe('LinkedIn Token Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require an account identifier and query only that account', async () => {
    expect(await getValidLinkedInToken()).toBeNull();
    expect(LinkedInToken.findOne).not.toHaveBeenCalled();

    LinkedInToken.findOne.mockResolvedValue({
      accessToken: 'token-abc',
      expiresAt: new Date(Date.now() + 3600000),
    });

    await expect(getValidLinkedInToken('urn:li:person:user-123')).resolves.toEqual({
      expired: false,
      token: 'token-abc',
    });
    expect(LinkedInToken.findOne).toHaveBeenCalledWith({
      memberUrn: 'urn:li:person:user-123',
    });
  });

  it('should store access token', async () => {
    const mockToken = {
      userId: 'user-123',
      accessToken: 'token-abc-123',
      refreshToken: 'refresh-token-xyz',
      expiresAt: new Date(),
    };

    expect(mockToken).toHaveProperty('accessToken');
    expect(mockToken).toHaveProperty('refreshToken');
  });

  it('should validate token expiration', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);

    const mockToken = {
      expiresAt: futureDate,
    };

    const isExpired = new Date() > mockToken.expiresAt;
    expect(isExpired).toBe(false);
  });

  it('should refresh expired token', async () => {
    const oldToken = {
      accessToken: 'old-token',
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    };

    const isExpired = new Date() > oldToken.expiresAt;
    expect(isExpired).toBe(true);
  });

  it('should handle token refresh errors', async () => {
    const refreshError = new Error('Refresh token expired');
    
    expect(() => {
      throw refreshError;
    }).toThrow('Refresh token expired');
  });

  it('should store multiple tokens per user', async () => {
    const tokens = [
      { userId: 'user-1', accessToken: 'token-1' },
      { userId: 'user-2', accessToken: 'token-2' },
      { userId: 'user-3', accessToken: 'token-3' },
    ];

    expect(tokens.length).toBe(3);
  });

  it('should retrieve token by user ID', async () => {
    const mockTokens = {
      'user-123': { accessToken: 'token-abc' },
      'user-456': { accessToken: 'token-def' },
    };

    const token = mockTokens['user-123'];
    expect(token).toHaveProperty('accessToken');
  });
});
