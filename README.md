# LinkedIn Bot

AI-powered LinkedIn content automation platform built with Node.js, BullMQ, Redis, MongoDB, React, and Google Gemini.

This project automates the complete workflow of discovering developer-focused content, generating AI-written LinkedIn posts, assigning publishing slots, and publishing content directly to LinkedIn using a scalable queue-based architecture.

---

# Overview

LinkedIn Bot is designed for developers, creators, technical writers, engineering teams, and SaaS founders who want to automate technical content distribution on LinkedIn.

The platform continuously fetches trending content from multiple developer ecosystems, stores and normalizes the data, generates professional LinkedIn-ready posts using Gemini AI, and publishes them through LinkedIn APIs.

The system uses BullMQ workers and Redis-backed queues to ensure reliability, scalability, retry handling, and fault isolation.

---

# Core Features

## Multi-Source Content Aggregation

The system fetches content from multiple technical platforms:

- Dev.to
- Medium
- GitHub Trending
- NPM
- Hashnode
- Reddit
- Hacker News
- Node Weekly

### Fetching Capabilities

- RSS feed parsing
- HTML scraping with Cheerio
- Content normalization
- Duplicate prevention
- Automatic scheduled fetching
- Manual fetch triggers from dashboard
- MongoDB persistence layer

---

## AI-Powered LinkedIn Post Generation

Google Gemini is used to transform articles into optimized LinkedIn posts.

### AI Features

- Human-like professional writing style
- LinkedIn-focused formatting
- Call-to-action generation
- Source attribution
- Queue-driven AI processing
- Draft generation workflow
- Retry-safe workers
- Publish-ready post preparation

---

## Automated LinkedIn Publishing

Integrated LinkedIn OAuth and publishing pipeline.

### Publishing Features

- LinkedIn OAuth authentication
- Automated publishing pipeline
- Scheduled publishing support
- Publishing status tracking
- Retry handling
- Error logging
- Queue-based publishing workers

---

## Slot Allocation System

The platform includes a slot allocation scheduler that automatically assigns publishing slots for generated posts.

### Benefits

- Prevents content flooding
- Maintains consistent posting schedule
- Supports automated publishing cadence
- Organizes queued content efficiently

---

## Queue-Based Processing Architecture

The system uses BullMQ workers for asynchronous and scalable background processing.

| Queue | Responsibility | Worker |
|---|---|---|
| Fetch Queue | Fetch external content | `fetcher.worker.js` |
| AI Queue | Generate LinkedIn posts | `ai.worker.js` |
| Slot Queue | Assign publishing slots | `slotAllocator.worker.js` |
| LinkedIn Queue | Publish posts to LinkedIn | `linkedin.worker.js` |

### Architecture Benefits

- Non-blocking job processing
- Distributed worker support
- Retry and failure handling
- Persistent Redis-backed queues
- Improved scalability
- Fault isolation between services

---

# System Architecture

```text
┌────────────────────────────────────────────────────────────┐
│                    CONTENT SOURCES                        │
│ Dev.to • Medium • GitHub • Reddit • NPM • Hashnode       │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │ Fetch Scheduler (Cron)   │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ Fetch Queue (BullMQ)     │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ MongoDB - FetchedContent │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ Slot Allocation Scheduler│
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ AI Queue (Gemini AI)     │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ MongoDB - GeneratedPosts │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ LinkedIn Scheduler       │
              └────────────┬─────────────┘
                           ▼
              ┌──────────────────────────┐
              │ LinkedIn Publish Queue   │
              └──────────────────────────┘
```

---

# Tech Stack

## Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- Redis
- BullMQ
- Google Gemini API
- Cheerio
- RSS Parser
- Winston Logger
- node-cron
- Swagger API Docs
- LinkedIn REST API

---

## Frontend

- React 19
- React Router
- Vite
- Tailwind CSS
- shadcn/ui
- Axios
- Sonner
- Lucide React
- next-themes

---

## Infrastructure & Monitoring

- BullBoard Queue Dashboard
- Redis Queue Monitoring
- Structured Logging
- Scheduler-based Automation
- Session Authentication

---

# Project Structure

```bash
Linkedin-Bot/
│
├── backend/
│   ├── logs/
│   ├── src/
│   │   ├── config/
│   │   ├── controller/
│   │   ├── dashboard/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── modules/
│   │   │   ├── ai/
│   │   │   ├── fetchers/
│   │   │   ├── publisher/
│   │   │   └── scheduler/
│   │   ├── queue/
│   │   │   ├── workers/
│   │   │   └── *.queue.js
│   │   ├── routes/
│   │   ├── services/
│   │   ├── swagger/
│   │   ├── utils/
│   │   └── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── Architecture.md
└── README.md
```

---

# Dashboard Features

The frontend dashboard provides operational visibility into the entire automation workflow.

## Dashboard Pages

### Analytics Dashboard

Displays:

- Total fetched articles
- AI-generated posts
- Published posts
- Failed jobs
- Queue statistics
- Publishing metrics

---

### Fetcher Management

Manual controls for triggering fetch operations from supported platforms.

Features:

- Single-click fetch triggers
- Real-time fetch status
- Toast notifications
- Source-based filtering

---

### Generated Posts

Manage AI-generated LinkedIn drafts.

Features include:

- Post previews
- Status tracking
- Retry publishing
- Delete drafts
- Manual publishing

---

### Queue Monitoring

Integrated BullBoard dashboard for:

- Active jobs
- Failed jobs
- Retry handling
- Queue inspection
- Worker monitoring
- Delayed jobs

---

# API Overview

## Content Fetching APIs

| Method | Endpoint |
|---|---|
| POST | `/api/devto` |
| POST | `/api/medium` |
| POST | `/api/github` |
| POST | `/api/npm` |
| POST | `/api/hashnode` |
| POST | `/api/reddit` |
| POST | `/api/nodeweekly` |
| GET | `/api/fetch` |

---

## AI APIs

| Method | Endpoint |
|---|---|
| POST | `/api/ai/generate` |
| GET | `/api/ai-posts` |
| GET | `/api/ai-posts/:id` |
| PUT | `/api/ai-posts/:id` |
| DELETE | `/api/ai-posts/:id` |

---

## LinkedIn APIs

| Method | Endpoint |
|---|---|
| GET | `/api/auth/linkedin/authorize` |
| GET | `/api/auth/linkedin/callback` |
| POST | `/api/auth/linkedin/disconnect` |
| GET | `/api/auth/linkedin/status` |
| POST | `/api/publisher/publish` |

---

## Monitoring APIs

| Method | Endpoint |
|---|---|
| GET | `/api/dashboard` |
| GET | `/admin/queues` |

---

# Local Development Setup

## Prerequisites

Required services:

- Node.js 18+
- MongoDB
- Redis
- Google Gemini API Key
- LinkedIn Developer App

---

# Installation

## Clone Repository

```bash
git clone <repository-url>
cd Linkedin-Bot
```

---

## Install Backend Dependencies

```bash
cd backend
npm install
```

---

## Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

# Environment Variables

## Backend `.env`

```env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Gemini API
GOOGLE_API_KEY=

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=http://localhost:5000/api/auth/linkedin/callback

# Session
SESSION_SECRET=

# BullBoard
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin

# Logging
LOG_LEVEL=info
```

---

# Running the Application

## Start Redis

```bash
redis-server
```

---

## Start Backend

```bash
cd backend
npm run dev
```

---

## Start Frontend

```bash
cd frontend
npm run dev
```

---

# Application URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:5000` |
| BullBoard Dashboard | `http://localhost:5000/admin/queues` |
| Swagger Docs | `http://localhost:5000/api-docs` |

---

# Queue Monitoring

BullBoard provides real-time visibility into all background jobs.

## Features

- Queue statistics
- Failed job inspection
- Retry management
- Delayed jobs
- Payload inspection
- Active worker monitoring

---

# Logging

Application logs are stored in:

```bash
backend/logs/
```

## Log Files

| File | Description |
|---|---|
| `combined.log` | All application logs |
| `error.log` | Error-only logs |

---

# Security Notes

## Recommended Production Practices

- Never commit `.env` files
- Use secure session secrets
- Protect BullBoard routes
- Enable API rate limiting
- Restrict CORS origins
- Secure LinkedIn OAuth credentials
- Validate and sanitize request payloads

---

# Troubleshooting

## MongoDB Connection Issues

```bash
mongosh
```

Verify:

- MongoDB service is running
- Atlas IP whitelist is configured
- `MONGODB_URI` is valid

---

## Redis Issues

```bash
redis-cli ping
```

Expected response:

```bash
PONG
```

---

## Gemini API Errors

Check:

- API quota limits
- API key validity
- Gemini API enablement

---

## BullMQ Jobs Not Processing

Verify:

- Redis is running
- Worker files are loaded
- Queue connections are healthy
- Backend workers started correctly

---

# Future Improvements

- Multi-account LinkedIn support
- AI prompt customization
- Engagement analytics dashboard
- YouTube/Substack integrations
- Team workspaces
- Docker deployment
- Kubernetes worker scaling
- Scheduled publishing UI
- Webhook integrations

---

# License

ISC

---

# Contributing

Contributions and improvements are welcome.

Please follow the existing folder structure and code conventions when submitting pull requests.

---

# Author

Built for automated developer content distribution and AI-assisted LinkedIn publishing workflows.

