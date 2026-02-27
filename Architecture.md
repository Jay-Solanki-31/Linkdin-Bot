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
        │  (Every sunday at 11 AM)           │
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
```d:\Linkdin-Bot
├── backend
│   ├── logs
│   │   └── app.log
│   ├── src
│   │   ├── config
│   │   │   ├── db.js
│   │   │   └── swagger.js
│   │   ├── controller
│   │   │   ├── ai.controller.js
│   │   │   ├── fetcher.controller.js
│   │   │   ├── publisher.controller.js
│   │   │   └── slotAllocator.controller.js
│   │   ├── dashboard
│   │   │   └── bullboard.js
│   │   ├── middleware
│   │   │   └── bullmq.middleware.js
│   │   ├── models
│   │   │   ├── fetchedContent.model.js
│   │   │   ├── generatedPost.model.js
│   │   │   └── linkedinToken.model.js
│   │   ├── modules
│   │   │   ├── ai
│   │   │   │   └── ai.service.js
│   │   │   ├── fetchers
│   │   │   │   ├── sources
│   │   │   │   │   ├── devto.js
│   │   │   │   │   ├── github.js
│   │   │   │   │   ├── hackernews.js
│   │   │   │   │   ├── hashnode.js
│   │   │   │   │   ├── medium.js
│   │   │   │   │   ├── nodeweekly.js
│   │   │   │   │   ├── npm.js
│   │   │   │   │   └── reddit.js
│   │   │   │   ├── fetcher.service.js
│   │   │   │   └── index.js
│   │   │   ├── publisher
│   │   │   │   └── linkedin.publisher.js
│   │   │   └── scheduler
│   │   │       ├── fetchScheduler.js
│   │   │       └── slotAllocator.scheduler.js
│   │   ├── queue
│   │   │   ├── workers
│   │   │   │   ├── ai.worker.js
│   │   │   │   ├── fetcher.worker.js
│   │   │   │   ├── linkedin.worker.js
│   │   │   │   └── slotAllocator.worker.js
│   │   │   ├── ai.queue.js
│   │   │   ├── connection.js
│   │   │   ├── fetcher.queue.js
│   │   │   ├── jobTypes.js
│   │   │   ├── linkedin.queue.js
│   │   │   └── slotAllocator.queue.js
│   │   ├── routes
│   │   │   ├── ai.routes.js
│   │   │   ├── aiPosts.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── fetcher.route.js
│   │   │   ├── linkedinAuth.routes.js
│   │   │   ├── publisher.routes.js
│   │   │   ├── slotAllocator.routes.js
│   │   │   └── test.routes.js
│   │   ├── services
│   │   │   ├── gemini.js
│   │   │   └── linkedinToken.service.js
│   │   ├── swagger
│   │   │   └── definitions
│   │   │       ├── ai.swagger.js
│   │   │       ├── aiPosts.swagger.js
│   │   │       ├── dashboard.swagger.js
│   │   │       ├── fetcher.swagger.js
│   │   │       ├── linkedinAuth.swagger.js
│   │   │       ├── publisher.swagger.js
│   │   │       └── slotAllocator.swagger.js
│   │   ├── utils
│   │   │   └── logger.js
│   │   └── server.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── package-lock.json
|
└── frontend
    ├── public
    │   └── vite.svg
    ├── src
    │   ├── api
    │   │   ├── aiPosts.api.js
    │   │   ├── dashboard.api.js
    │   │   ├── fetcher.api.js
    │   │   ├── index.js
    │   │   └── linkedin.js
    │   ├── components
    │   │   ├── layout
    │   │   │   ├── Header.jsx
    │   │   │   ├── Layout.jsx
    │   │   │   └── Sidebar.jsx
    │   │   ├── ui
    │   │   │   ├── badge.jsx
    │   │   │   ├── button.jsx
    │   │   │   ├── card.jsx
    │   │   │   ├── input.jsx
    │   │   │   ├── PostSkeleton.jsx
    │   │   │   ├── skeleton.jsx
    │   │   │   └── table.jsx
    │   │   ├── LinkedInStatus.jsx
    │   │   ├── PostCard.jsx
    │   │   └── ThemeToggle.jsx
    │   ├── lib
    │   │   └── utils.js
    │   ├── pages
    │   │   ├── AIPosts.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Fetcher.jsx
    │   │   └── FetcherList.jsx
    │   ├── App.css
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .gitignore
    ├── components.json
    ├── eslint.config.js
    ├── index.html
    ├── jsconfig.json
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js
    ├── README.md
    ├── tailwind.config.js
    └── vite.config.js
`````````````````````