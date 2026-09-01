// tests/setup.js - Jest setup file for backend
import { config } from 'dotenv';

config();

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/linkedin-bot-test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.JWT_SECRET = 'test-secret-key';
process.env.GROQ_API_KEY = 'test-groq-key';

// Mock timers globally if needed
// jest.useFakeTimers();
