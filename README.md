# LinkedIn Bot - Automated Content Curation & AI-Powered Post Generation

A full-stack automation platform that fetches content from multiple sources, generates AI-powered LinkedIn posts, and publishes them automatically. Built with Node.js, React, BullMQ for job queuing, and Google Generative AI (Gemini).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Workflows](#core-workflows)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Dashboard & Monitoring](#dashboard--monitoring)
- [Database Models](#database-models)

---

## 🎯 Overview

LinkedIn Bot is an intelligent content automation system designed to:

1. **Fetch** trending articles from 8+ content sources automatically
2. **Normalize** and store fetched content in a MongoDB database
3. **Generate** unique LinkedIn posts using Google Generative AI (Gemini)
4. **Publish** posts directly to LinkedIn via the LinkedIn REST API
5. **Monitor** all operations through a real-time web dashboard

The system operates on a scheduler-driven architecture with Redis-backed job queuing (BullMQ) to ensure scalable, reliable job processing.

---

## ✨ Core Features

### Content Fetching
- **8 Content Sources**: Dev.to, Medium, GitHub, NPM, Hashnode, Node Weekly, Reddit, Daily Dev
- **RSS & Web Scraping**: Fetches articles using RSS parsers and web scraping (Cheerio)
- **Smart Scheduling**: Automatically runs every 2 days at 11 AM (configurable)
- **Duplicate Prevention**: Unique URL constraint prevents duplicate articles
- **Source Normalization**: Standardizes content structure across all sources

### AI-Powered Post Generation
- **Google Gemini Integration**: Uses state-of-the-art AI for intelligent post creation
- **Professional Tone**: Generates LinkedIn-appropriate posts with natural conversational style
- **Smart Formatting**: 3-5 sentences, exactly 1 emoji, source attribution, and CTAs
- **Batch Processing**: Queues AI generation for multiple articles with worker-based processing
- **Error Handling**: Graceful fallback with error logging

### LinkedIn Publishing
- **Direct Integration**: Posts directly to LinkedIn via REST API
- **OAuth Authentication**: Secure LinkedIn member authentication & token management
- **Status Tracking**: Tracks post lifecycle (draft → queued → posted → success/failed)
- **Error Logging**: Detailed error tracking for failed publishes

### Real-Time Monitoring
- **BullMQ Dashboard**: Built-in admin UI to monitor job queues
- **React Dashboard**: Analytics showing fetched articles, AI posts, publishing stats
- **Live Updates**: Auto-refreshing statistics (10-second intervals)
- **Job Status Tracking**: View queued, processing, completed, and failed jobs

---

## 🏗️ Architecture

### System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT SOURCES                             │
│  (Dev.to, Medium, GitHub, NPM, Hashnode, Reddit, Node Weekly)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │    Fetch Scheduler (Cron Job)      │
        │  (Every 2 days at 11 AM)           │
        └──────────┬─────────────────────────┘
                   │
                   ▼
        ┌────────────────────────────────┐
        │   Fetcher Queue (BullMQ)       │
        │  - Normalizes content          │
        │  - Stores in MongoDB           │
        └──────────┬──────────────────────┘
                   │
                   ▼
    ┌──────────────────────────────────────────┐
    │   MongoDB: FetchedContent Collection     │
    │  (Stores articles with metadata)         │
    └──────────┬─────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │    AI Scheduler (Cron Job)               │
    │   (Monitors & triggers AI generation)    │
    └──────────┬─────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │   AI Queue (BullMQ)                      │
    │  - Uses Google Gemini API                │
    │  - Generates LinkedIn posts              │
    └──────────┬─────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │ MongoDB: GeneratedPost Collection        │
    │ (Stores AI-generated posts)              │
    └──────────┬─────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │  LinkedIn Scheduler (Cron Job)           │
    │ (Monitors & publishes posts)             │
    └──────────┬─────────────────────────────────┘
               │
               ▼
    ┌──────────────────────────────────────────┐
    │  LinkedIn Publish Queue (BullMQ)         │
    │  - Posts to LinkedIn API                 │
    │  - Updates status                        │
    └──────────────────────────────────────────┘
```

### Queue-Based Job Processing

The system uses **BullMQ** (Redis-backed job queue) for reliable, scalable job processing:

| Queue | Job Type | Trigger | Worker |
|-------|----------|---------|--------|
| **Fetcher Queue** | `FETCH_CONTENT` | Fetch Scheduler (every 2 days) or manual trigger | `fetcher.worker.js` |
| **AI Queue** | `GENERATE_POST` | AI Scheduler (checks FetchedContent) | `ai.worker.js` |
| **LinkedIn Queue** | `POST_TO_LINKEDIN` | LinkedIn Scheduler (checks GeneratedPosts) | `linkedin.worker.js` |

---

## 💻 Technology Stack

### Backend
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express.js (REST API)
- **Database**: MongoDB + Mongoose (data persistence)
- **Cache & Queuing**: Redis + BullMQ (job management)
- **AI Integration**: Google Generative AI (Gemini API)
- **Web Scraping**: Cheerio (HTML parsing), RSS Parser
- **Task Scheduling**: node-cron (scheduled jobs)
- **Authentication**: express-session (LinkedIn OAuth)
- **Logging**: Winston (structured logging)

### Frontend
- **Framework**: React 19 with React Router
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **HTTP Client**: Axios
- **Notifications**: Sonner (toast notifications)
- **Icons**: Lucide React, React Icons
- **Theme**: next-themes (dark mode support)

### Infrastructure
- **Monitoring Dashboard**: BullBoard (job queue UI)
- **Session Management**: express-session
- **CORS**: Enabled for frontend-backend communication

---

## 📁 Project Structure

### Backend Structure
```
backend/
├── src/
│   ├── server.js                          # Main Express app entry point
│   ├── config/
│   │   └── db.js                         # MongoDB connection
│   ├── controller/
│   │   ├── fetcher.controller.js         # Fetch job initiation logic
│   │   ├── ai.controller.js              # AI generation endpoints
│   │   └── publisher.controller.js       # LinkedIn publishing endpoints
│   ├── models/
│   │   ├── fetchedContent.model.js       # Schema: Fetched articles
│   │   ├── generatedPost.model.js        # Schema: AI-generated posts
│   │   └── linkedinToken.model.js        # Schema: LinkedIn OAuth tokens
│   ├── modules/
│   │   ├── ai/
│   │   │   └── ai.service.js            # AI post generation logic
│   │   ├── fetchers/
│   │   │   ├── index.js                 # Fetcher router
│   │   │   ├── fetcher.service.js       # Core fetch & normalize logic
│   │   │   ├── normalizer.js            # Content standardization
│   │   │   └── sources/                 # Source-specific scrapers
│   │   │       ├── devto.js, medium.js, github.js, npm.js, etc.
│   │   ├── publisher/
│   │   │   └── linkedin.publisher.js    # LinkedIn API integration
│   │   └── scheduler/
│   │       ├── fetchScheduler.js        # Cron: trigger fetching
│   │       ├── aiScheduler.js           # Cron: trigger AI generation
│   │       ├── linkedinScheduler.js     # Cron: trigger publishing
│   │       └── slotAllocator.scheduler.js # Cron: allocate weekly publishing slots
│   │   ├── slotAllocator/               # Slot allocation for scheduled publishing
│   │   │   └── slotAllocator.service.js # Weekly slot allocation logic
│   ├── queue/
│   │   ├── connection.js                # Redis connection setup
│   │   ├── fetcher.queue.js             # BullMQ: Fetcher queue
│   │   ├── ai.queue.js                  # BullMQ: AI generation queue
│   │   ├── linkedin.queue.js            # BullMQ: LinkedIn publish queue
│   │   ├── jobTypes.js                  # Job type constants
│   │   └── workers/
│   │       ├── fetcher.worker.js        # Worker: Processes fetch jobs
│   │       ├── ai.worker.js             # Worker: Processes AI jobs
│   │       └── linkedin.worker.js       # Worker: Publishes to LinkedIn
│   ├── routes/
│   │   ├── fetcher.route.js             # POST /api/:source, GET /api/fetch
│   │   ├── ai.routes.js                 # AI generation endpoints
│   │   ├── aiPosts.routes.js            # AI posts CRUD
│   │   ├── linkedinAuth.routes.js       # LinkedIn OAuth routes
│   │   ├── publisher.routes.js          # LinkedIn publish triggers
│   │   ├── dashboard.routes.js          # Dashboard stats
│   │   └── test.routes.js               # Testing endpoints
│   ├── services/
│   │   ├── gemini.js                    # Google Gemini API wrapper
│   │   ├── generatePostservice.js       # Post generation service
│   │   └── linkedinToken.service.js     # Token management
│   ├── dashboard/
│   │   └── bullboard.js                 # BullBoard configuration
│   ├── middleware/
│   │   └── bullmq.middleware.js         # Auth middleware for dashboard
│   ├── utils/
│   │   └── logger.js                    # Winston logger configuration
│   └── logs/                             # Application logs
└── package.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── App.jsx                          # Main app & routing
│   ├── main.jsx                         # React entry point
│   ├── App.css, index.css               # Global styles
│   ├── api/
│   │   ├── linkedin.js                  # LinkedIn API calls
│   │   ├── aiPosts.api.js              # AI posts API calls
│   │   └── publisher.api.js            # Publishing API calls
│   ├── components/
│   │   ├── ThemeToggle.jsx             # Dark/Light mode toggle
│   │   ├── LinkedInStatus.jsx          # LinkedIn connection status
│   │   ├── layout/
│   │   │   ├── Header.jsx              # Top navigation
│   │   │   ├── Sidebar.jsx             # Side navigation
│   │   │   └── Layout.jsx              # Main layout wrapper
│   │   └── ui/                         # shadcn UI components
│   │       ├── button.jsx, card.jsx, input.jsx
│   │       ├── badge.jsx, table.jsx, skeleton.jsx
│   │       └── PostSkeleton.jsx        # Loading skeletons
│   ├── pages/
│   │   ├── Dashboard.jsx               # Overview statistics
│   │   ├── Fetcher.jsx                 # Manual fetch interface
│   │   ├── FetcherList.jsx             # View fetched articles
│   │   ├── AiGeratepost.jsx           # View AI-generated posts
│   │   └── QueueMonitor.jsx            # Job queue monitoring
│   ├── lib/
│   │   └── utils.js                    # Utility functions
│   └── assets/                          # Static assets
├── tailwind.config.js                  # Tailwind configuration
├── vite.config.js                      # Vite configuration
├── jsconfig.json                       # JavaScript config
├── eslint.config.js                    # ESLint rules
└── package.json
```

---

## 🔄 Core Workflows

### 1. Content Fetching Workflow

**Trigger**: Cron scheduler (every 2 days at 11 AM) or manual trigger

**Process**:
1. `fetchScheduler.js` triggers → Adds jobs to `fetcherQueue`
2. For each source (devto, medium, github, npm, hashnode, nodeweekly, reddit):
   - `fetcher.worker.js` processes the job
   - Source-specific scraper fetches articles (RSS or web scraping)
   - `normalizer.js` standardizes content structure
   - Data saved to MongoDB `FetchedContent` collection
3. Logs success/failures via Winston logger

**Data Stored**:
```javascript
{
  title: String,
  url: String (unique),
  description: String,
  source: String,
  language: String,
  aiGenerated: Boolean (default: false),
  isQueued: Boolean,
  processing: Boolean,
  timestamp: Date
}
```

---

### 2. AI Post Generation Workflow

**Trigger**: AI Scheduler (runs periodically) or manual trigger

**Process**:
1. `aiScheduler.js` queries `FetchedContent` for non-AI-generated articles
2. Adds jobs to `aiQueue` for each article
3. `ai.worker.js` processes each job:
   - `ai.service.js` calls Google Gemini API with structured prompt
   - Prompt includes: title, description, source, URL
   - Gemini generates professional LinkedIn post (3-5 sentences + 1 emoji)
   - Post saved to `GeneratedPost` collection with status "draft"
4. Error handling: Stores error message if Gemini API fails

**Gemini Prompt Strategy**:
- Instructions: Write like a real person, one key insight, conversational tone
- Format: 3-5 sentences, 1 emoji mid-sentence, source attribution
- Tone: Professional but approachable, no buzzwords, invites conversation
- CTA: Gentle invitation to engagement (not pushy)

**Data Stored**:
```javascript
{
  articleId: ObjectId (ref to FetchedContent),
  title: String,
  text: String (AI-generated post),
  url: String,
  source: String,
  status: "draft" | "queued" | "posted" | "failed",
  linkedinPostUrn: String,
  postedAt: Date,
  error: String
}
```

---

### 3. LinkedIn Publishing Workflow

**Trigger**: LinkedIn Scheduler or manual trigger

**Process**:
1. `linkedinScheduler.js` queries `GeneratedPost` collection for "draft" posts
2. Adds jobs to `linkedinQueue` for each draft
3. `linkedin.worker.js` processes each job:
   - Retrieves LinkedIn OAuth token from `linkedinToken` model
   - Validates member URN and access token
   - Calls LinkedIn REST API (`/rest/posts`) with post content
   - Updates post status: "draft" → "queued" → "posted"
   - Stores LinkedIn post URN for tracking
4. Error handling: Updates status to "failed" with error message

**LinkedIn API Payload**:
```javascript
{
  author: memberUrn,
  commentary: postText,
  visibility: "PUBLIC",
  distribution: {
    feedDistribution: "MAIN_FEED"
  },
  lifecycleState: "PUBLISHED"
}
```

---

### 3.5 Slot-Based Scheduling & Publishing

**Purpose**: Ensure consistent, conflict-free publishing by allocating a fixed set of weekly "slots" to promising articles, driving a predictable AI-generation → publish pipeline.

Flow:
- `slotAllocator.scheduler.js` runs every Monday at 10:00 (server timezone) and calls `allocateWeeklySlots()`.
- `allocateWeeklySlots()` builds a `weekKey` (e.g. `2026-W06`) and composes slot IDs like `2026-W06-TUE-1`, `2026-W06-TUE-2`, etc.
- It finds `FetchedContent` items with `status: "fetched"` and `slot: null`, and assigns available slots in FIFO order, setting `status: "selected"` and `slot: <weekKey>-<slot>` on the record.
- A manual trigger is available: `POST /api/slot-allocator/run` (calls the controller `runSlotAllocator`).

How it integrates with the pipeline:
- The **AI Scheduler** only queues content where `status: "selected"` and `slot` is set — ensuring AI generation targets pre-selected slot assignments.
- Generated posts (`GeneratedPost`) inherit the `slot` value so the **LinkedIn Scheduler** can match posts to time slots.
- The **LinkedIn Scheduler** maps slot suffixes to publish times (TUE/WED/THU → 10:00 & 17:00) and enqueues `GeneratedPost` records whose `slot` matches the current weekday/slot number.

Slot definitions (backend):
- Weekly slot set: `TUE-1`, `TUE-2`, `WED-1`, `WED-2`, `THU-1`, `THU-2`.
- Example slot key: `2026-W06-TUE-1`.

Notes:
- This design prevents over-posting and allows predictable weekly cadence.
- `FetchedContent.status` includes `fetched | selected | generated | posted | expired` and the `slot` field is indexed for efficient lookups.

---

### 4. LinkedIn OAuth Flow

**Endpoints**:
- `POST /api/auth/linkedin/authorize` - Initiate OAuth flow
- `GET /api/auth/linkedin/callback` - Handle OAuth callback
- `POST /api/auth/linkedin/disconnect` - Revoke access

**Flow**:
1. User clicks "Connect LinkedIn" on frontend
2. Backend redirects to LinkedIn OAuth endpoint
3. User grants permissions
4. LinkedIn redirects to callback with authorization code
5. Backend exchanges code for access token
6. Token + memberUrn stored in `linkedinToken` model
7. Frontend displays "Connected" status

---

### 5. Real-Time Dashboard

**Frontend Pages**:
- **Dashboard**: Shows statistics (total fetched, AI posts, published count)
- **Fetcher**: Manual trigger buttons for each source
- **Records**: List of all fetched articles with details
- **Posts**: List of AI-generated posts with status
- **Queue Monitor**: BullBoard (job queue UI)

**Data Flow**:
1. Frontend calls `GET /api/dashboard`
2. Backend queries MongoDB collections for stats
3. Returns: `{ stats: { totalFetched, aiGeneratedCount, publishedCount, failedCount } }`
4. Frontend auto-refreshes every 10 seconds

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** 16+ and npm/yarn
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud instance)
- **Google Generative AI API Key** (Gemini)
- **LinkedIn Developer Account** (for OAuth credentials)

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd Linkdin-Bot
```

### Step 2: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 4: Environment Configuration
See [Environment Configuration](#environment-configuration) section below.

### Step 5: Start MongoDB & Redis
```bash
# MongoDB (if local)
mongod

# Redis (if local)
redis-server
```

### Step 6: Start Backend
```bash
cd backend
npm run dev  # Development with nodemon
# or
npm start    # Production
```

### Step 7: Start Frontend
```bash
cd frontend
npm run dev
```

### Step 8: Access Application
- **Frontend**: http://localhost:5173 (Vite default)
- **Backend**: http://localhost:5000
- **BullBoard Dashboard**: http://localhost:5000/admin/queues

---

## ⚙️ Environment Configuration

### Backend `.env` file

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Google Generative AI (Gemini)
GOOGLE_API_KEY=your_gemini_api_key_here

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:5000/api/auth/linkedin/callback

# Session Secret
SESSION_SECRET=your_session_secret_key

# BullBoard Dashboard Auth (optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure_password

# Logging
LOG_LEVEL=info
```

### Frontend Configuration

Vite automatically loads from `backend/.env` via proxy:
- Configure `vite.config.js` proxy to forward API calls to `http://localhost:5000`

---

## ▶️ Running the Application

### Development Mode

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

**Terminal 3 - Redis (if using local)**:
```bash
redis-server
```

### Production Mode

**Backend**:
```bash
cd backend
npm start
```

**Frontend**:
```bash
cd frontend
npm run build
npm run preview
```

---

## 📡 API Endpoints

### Content Fetching

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/devto` | Fetch articles from Dev.to |
| `POST` | `/api/medium` | Fetch articles from Medium |
| `POST` | `/api/github` | Fetch trending repos from GitHub |
| `POST` | `/api/npm` | Fetch trending packages from NPM |
| `POST` | `/api/hashnode` | Fetch articles from Hashnode |
| `POST` | `/api/nodeweekly` | Fetch Node.js weekly newsletter |
| `POST` | `/api/reddit` | Fetch posts from Reddit |
| `GET` | `/api/fetch` | Get all fetched articles |

### AI Post Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/generate` | Manually trigger AI generation |
| `GET` | `/api/ai-posts` | Get all AI-generated posts |
| `GET` | `/api/ai-posts/:id` | Get specific AI post |
| `PUT` | `/api/ai-posts/:id` | Update post status |
| `DELETE` | `/api/ai-posts/:id` | Delete AI post |

### LinkedIn Publishing

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/linkedin/authorize` | Start LinkedIn OAuth |
| `GET` | `/api/auth/linkedin/callback` | OAuth callback handler |
| `POST` | `/api/auth/linkedin/disconnect` | Disconnect LinkedIn |
| `GET` | `/api/auth/linkedin/status` | Check connection status |
| `POST` | `/api/publisher/publish` | Manually publish post |
| `GET` | `/api/publisher/status/:postId` | Get post status |

### Dashboard & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard` | Get dashboard statistics |
| `GET` | `/admin/queues` | BullBoard queue monitoring UI |

---

## 📊 Dashboard & Monitoring

### BullBoard Job Queue Dashboard

Access at: `http://localhost:5000/admin/queues`

**Features**:
- View all queues: Fetcher, AI, LinkedIn
- Monitor job status: Waiting, Active, Completed, Failed
- Inspect job details and logs
- Manually retry failed jobs
- Clear queue (with caution)

**Queue Information**:
| Queue | Purpose | Trigger |
|-------|---------|---------|
| **fetcherQueue** | Content fetching | Scheduler (every 2 days) or manual |
| **aiQueue** | AI post generation | Scheduler (periodic) or manual |
| **linkedinQueue** | LinkedIn publishing | Scheduler (periodic) or manual |

### React Dashboard

Access at: `http://localhost:5173/`

**Pages**:
1. **Dashboard**: Overview statistics
   - Total fetched articles
   - AI-generated posts count
   - Published posts count
   - Failed posts count

2. **Fetcher**: Manual content fetching
   - 8 source buttons (Dev.to, Medium, GitHub, NPM, Hashnode, Node Weekly, Reddit, Daily Dev)
   - Shows loading state during fetch
   - Toast notifications for success/error

3. **Records**: View all fetched articles
   - Searchable table of articles
   - Source, title, date filters
   - Direct link to original article

4. **Posts**: View AI-generated posts
   - Status indicators (draft, queued, posted, failed)
   - AI post preview
   - Manual publish/delete options

5. **Queue Monitor**: BullBoard dashboard embed
   - Real-time job tracking
   - Queue statistics

---

## 🗄️ Database Models

### FetchedContent
Stores articles fetched from content sources.

```javascript
{
  _id: ObjectId,
  title: String (required),
  url: String (unique, required),
  description: String,
  source: String,
  language: String,
  aiGenerated: Boolean (default: false),
  isQueued: Boolean (default: false),
  processing: Boolean (default: false),
  processingAt: Date,
  aiError: String,
  timestamp: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

### GeneratedPost
Stores AI-generated LinkedIn posts.

```javascript
{
  _id: ObjectId,
  articleId: ObjectId (ref: FetchedContent, required),
  title: String,
  text: String (required),
  url: String,
  source: String,
  status: "draft" | "queued" | "posted" | "failed" (default: "draft"),
  linkedinPostUrn: String,
  postedAt: Date,
  error: String,
  createdAt: Date,
  updatedAt: Date
}
```

### LinkedInToken
Stores LinkedIn OAuth tokens and user information.

```javascript
{
  _id: "linkedin_app_token",
  accessToken: String (required),
  refreshToken: String,
  expiresAt: Date,
  memberUrn: String (required),
  memberName: String,
  memberEmail: String,
  scope: String,
  tokenType: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🛠️ Troubleshooting

### MongoDB Connection Issues
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` in `.env`
- Ensure IP whitelist in MongoDB Atlas

### Redis Connection Issues
- Verify Redis is running: `redis-cli ping` (should return "PONG")
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`
- Ensure no port conflicts

### Gemini API Issues
- Verify `GOOGLE_API_KEY` in `.env`
- Check API quota in Google Cloud Console
- Ensure Generative AI API is enabled

### LinkedIn OAuth Issues
- Verify `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
- Check redirect URI matches LinkedIn app settings
- Ensure LinkedIn app is in approved status

### Jobs Not Processing
- Check BullBoard dashboard for stuck jobs
- Verify worker files are loaded in `server.js`
- Check logs: `backend/logs/`
- Restart workers: Stop and restart backend

---

## 📝 Logging

Application logs are stored in `backend/logs/` using Winston:

- **Log Levels**: error, warn, info, verbose, debug, silly
- **Log Format**: JSON with timestamp, level, message
- **Files**: 
  - `combined.log` - All logs
  - `error.log` - Error logs only

---

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env` to version control
2. **Session Secret**: Use strong, random `SESSION_SECRET`
3. **LinkedIn Tokens**: Store securely in database, never expose in frontend
4. **CORS**: Configure for production domain
5. **BullBoard Auth**: Protect `/admin/queues` with username/password
6. **Validate Input**: Sanitize all user inputs
7. **Rate Limiting**: Implement rate limiting on API endpoints for production

---

## 📄 License

ISC

---

## 👥 Contributing

Contributions welcome! Please follow existing code style and add tests for new features.

---

## 📞 Support

For issues, questions, or suggestions, please open an issue in the repository.

---

## 🗺️ Roadmap

- [ ] Add more content sources (YouTube, Substack, Dev Community)
- [ ] Implement user authentication for frontend
- [ ] Add post scheduling (publish at specific times)
- [ ] Support multiple LinkedIn accounts
- [ ] Analytics dashboard (engagement metrics)
- [ ] Mobile app support
- [ ] Post performance tracking
- [ ] Custom AI prompts per user
- [ ] Webhook integrations

---

**Last Updated**: January 2026
