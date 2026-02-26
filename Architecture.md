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
    │   Slot Scheduler ( Corn Job)     │
    │  (Assign Week Sloat For Post )         │
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
│   │   └── slotAllocator.controller.js   # Sloat allocator endpoints
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
│   │   │   └── sources/                 # Source-specific scrapers
│   │   │       ├── devto.js, medium.js, github.js, npm.js, etc.
│   │   ├── publisher/
│   │   │   └── linkedin.publisher.js    # LinkedIn API integration
│   │   └── scheduler/
│   │       ├── fetchScheduler.js        # Cron: trigger fetching
│   │       └── slotAllocator.scheduler.js # Cron: allocate weekly publishing slots
│   ├── queue/
│   │   ├── connection.js                # Redis connection setup
│   │   ├── fetcher.queue.js             # BullMQ: Fetcher queue
│   │   ├── ai.queue.js                  # BullMQ: AI generation queue
│   │   ├── linkedin.queue.js            # BullMQ: LinkedIn publish queue
│   │   ├── jobTypes.js                  # Job type constants
│   │   ├── slotAllocator.queue.js       # BullMQ: slot generation queue
│   │   └── workers/
│   │       ├── fetcher.worker.js        # Worker: Processes fetch jobs
│   │       ├── ai.worker.js             # Worker: Processes AI jobs
│   │       └── linkedin.worker.js       # Worker: Publishes to LinkedIn
│   │       └── slotAllocator.worker.js  # Worker: Publishes to LinkedIn
│   ├── routes/
│   │   ├── fetcher.route.js             # POST /api/:source, GET /api/fetch
│   │   ├── ai.routes.js                 # AI generation endpoints
│   │   ├── aiPosts.routes.js            # AI posts CRUD
│   │   ├── linkedinAuth.routes.js       # LinkedIn OAuth routes
│   │   ├── publisher.routes.js          # LinkedIn publish triggers
│   │   ├── dashboard.routes.js          # Dashboard stats
│   │   ├── slotAllocator.routes.js      # slotAllocator stats
│   │   └── test.routes.js               # Testing endpoints
│   ├── services/
│   │   ├── gemini.js                    # Google Gemini API wrapper
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
│   │   ├── linkedin.js                 # LinkedIn API calls
│   │   ├── aiPosts.api.js              # AI posts API calls
│   │   └── dashboard.api.js            # dashboard API calls
│   │   └── fetcher.api.js              # fetcher  API calls
│   │   └── index.js                    # setup backend url 
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
│   │   ├── Aiposts.jsx                 # View AI-generated posts
│   ├── lib/
│   │   └── utils.js                    # Utility functions
│   └── assets/                          # Static assets
├── tailwind.config.js                  # Tailwind configuration
├── vite.config.js                      # Vite configuration
├── jsconfig.json                       # JavaScript config
├── eslint.config.js                    # ESLint rules
└── package.json
```
