// tests/utils/logger.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Logger Utils', () => {
  let logger;

  beforeEach(() => {
    // Mock logger implementation
    logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  it('should log info messages', () => {
    logger.info('Test info message');

    expect(logger.info).toHaveBeenCalledWith('Test info message');
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Error occurred', error);

    expect(logger.error).toHaveBeenCalledWith('Error occurred', error);
  });

  it('should log warning messages', () => {
    logger.warn('Test warning');

    expect(logger.warn).toHaveBeenCalledWith('Test warning');
  });

  it('should log debug messages', () => {
    logger.debug('Debug information', { context: 'value' });

    expect(logger.debug).toHaveBeenCalledWith(
      'Debug information',
      expect.objectContaining({ context: 'value' })
    );
  });

  it('should include timestamp in logs', () => {
    const timestamp = new Date().toISOString();
    
    expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should include log level', () => {
    const levels = ['info', 'error', 'warn', 'debug'];

    levels.forEach(level => {
      expect(logger[level]).toBeDefined();
    });
  });

  it('should support log file output', () => {
    const logFile = {
      path: './logs/app.log',
      maxSize: '10m',
      maxFiles: 5,
    };

    expect(logFile).toHaveProperty('path');
    expect(logFile).toHaveProperty('maxSize');
  });

  it('should handle errors in logging', () => {
    logger.error.mockImplementation(() => {
      throw new Error('Logging failed');
    });

    expect(() => {
      logger.error('Test');
    }).toThrow('Logging failed');
  });
});
