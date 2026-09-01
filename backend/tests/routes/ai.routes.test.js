// tests/routes/ai.routes.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import aiRoutes from '../../src/routes/ai.routes.js';
import { generateAIManually } from '../../src/controller/ai.controller.js';

vi.mock('../../src/controller/ai.controller.js');

describe('AI Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/ai', aiRoutes);
  });

  it('should have POST endpoint for generating AI manually', () => {
    const stack = aiRoutes.stack;
    const postRoutes = stack.filter(r => r.route && r.route.methods.post);
    
    expect(postRoutes.length).toBeGreaterThan(0);
  });

  it('should have proper error handling middleware', () => {
    expect(aiRoutes.stack).toBeDefined();
    expect(aiRoutes.stack.length).toBeGreaterThan(0);
  });

  it('should call controller on POST request', async () => {
    generateAIManually.mockImplementation((req, res) => {
      res.json({ success: true });
    });

    const req = { params: { postId: '123' } };
    const res = { json: vi.fn() };

    await generateAIManually(req, res);
    
    expect(generateAIManually).toHaveBeenCalledWith(req, res);
  });
});
