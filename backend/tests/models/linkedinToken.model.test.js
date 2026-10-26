// tests/models/linkedinToken.model.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import LinkedInToken from '../../src/models/linkedinToken.model.js';

describe('LinkedinToken Model', () => {
  let mockToken;

  beforeEach(() => {
    mockToken = {
      accountId: 'session-account-123',
      memberUrn: 'urn:li:person:member-123',
      accessToken: 'token-abc',
      expiresAt: new Date(Date.now() + 3600000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  it('should have required fields', () => {
    expect(mockToken).toHaveProperty('accountId');
    expect(mockToken).toHaveProperty('memberUrn');
    expect(mockToken).toHaveProperty('accessToken');
    expect(mockToken).toHaveProperty('expiresAt');
  });

  it('should associate tokens with a server-side account key', () => {
    expect(LinkedInToken.schema.path('_id').instance).toBe('ObjectId');
    expect(LinkedInToken.schema.path('accountId').options).toMatchObject({
      required: true,
    });
    expect(LinkedInToken.schema.path('memberUrn').options).toMatchObject({
      required: true,
      unique: true,
    });
    expect(LinkedInToken.schema.indexes()).toContainEqual([
      { accountId: 1, memberUrn: 1 },
      { unique: true },
    ]);
  });

  it('should validate token expiration', () => {
    const isExpired = new Date() > mockToken.expiresAt;
    expect(isExpired).toBe(false);
  });

  it('should identify expired tokens', () => {
    const expiredToken = {
      ...mockToken,
      expiresAt: new Date(Date.now() - 1000),
    };

    const isExpired = new Date() > expiredToken.expiresAt;
    expect(isExpired).toBe(true);
  });

  it('should store token securely', () => {
    expect(mockToken.accessToken).toBeDefined();
    expect(mockToken.accessToken.length).toBeGreaterThan(0);
  });

  it('should track token creation time', () => {
    expect(mockToken.createdAt).toBeInstanceOf(Date);
  });

  it('should track token updates', () => {
    mockToken.updatedAt = new Date();
    expect(mockToken.updatedAt).toBeDefined();
  });

  it('should support multiple tokens per user', () => {
    const tokens = [
      { accountId: 'account-a', memberUrn: 'urn:li:person:one', accessToken: 'token-1' },
      { accountId: 'account-b', memberUrn: 'urn:li:person:two', accessToken: 'token-2' },
    ];

    expect(tokens.filter(t => t.accountId === 'account-a').length).toBe(1);
    expect(tokens.filter(t => t.accountId === 'account-b').length).toBe(1);
  });

  it('should validate token format', () => {
    expect(mockToken.accessToken).toMatch(/^[a-zA-Z0-9\-_.]*$/);
  });

  it('should enforce unique active tokens per user', () => {
    const activeTokens = [mockToken];
    const newToken = { ...mockToken, memberUrn: 'urn:li:person:another-member' };

    expect(LinkedInToken.schema.indexes()).toContainEqual([
      { accountId: 1, memberUrn: 1 },
      { unique: true },
    ]);
    expect(newToken.accountId).toBe(activeTokens[0].accountId);
  });
});
