import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LinkedIn Bot API',
      version: '1.0.0',
      description: 'API for LinkedIn Bot automation system with AI-powered content generation and publishing',
      contact: {
        name: 'LinkedIn Bot',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Development server',
      },
      {
        url: process.env.SERVER_URL,
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        GeneratedPost: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            text: { type: 'string' },
            url: { type: 'string' },
            source: { type: 'string' },
            status: { 
              type: 'string',
              enum: ['draft', 'queued', 'posted', 'failed']
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalFetched: { type: 'number' },
            todayFetched: { type: 'number' },
            aiGeneratedCount: { type: 'number' },
          },
        },
        QueueStatus: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            pending: { type: 'number' },
            active: { type: 'number' },
            completed: { type: 'number' },
            failed: { type: 'number' },
            status: { 
              type: 'string',
              enum: ['running', 'idle']
            },
          },
        },
      },
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session based authentication',
        },
      },
    },
    tags: [
      {
        name: 'AI',
        description: 'AI content generation endpoints',
      },
      {
        name: 'AI Posts',
        description: 'Generated posts management',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard statistics and monitoring',
      },
      {
        name: 'Fetcher',
        description: 'Content fetching from various sources',
      },
      {
        name: 'LinkedIn Auth',
        description: 'LinkedIn OAuth authentication',
      },
      {
        name: 'Publisher',
        description: 'Content publishing to LinkedIn',
      },
      {
        name: 'Slot Allocator',
        description: 'Post scheduling and slot allocation',
      },
      {
        name: 'Testing',
        description: 'Testing endpoints',
      },
    ],
  },
  apis: ['./src/swagger/definitions/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
