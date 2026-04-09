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
- [ ] Support multiple LinkedIn accounts
- [ ] Analytics dashboard (engagement metrics)
- [ ] Mobile app support
- [ ] Post performance tracking
- [ ] Custom AI prompts per user
- [ ] Webhook integrations

---

**Last Updated**: March 2026
