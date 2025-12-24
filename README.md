# LinkedIn Bot

A comprehensive automation tool for content fetching, AI-powered post generation, and LinkedIn publishing. This project consists of a Node.js backend for processing and a React frontend for monitoring and management.

## 🚀 Features

- **Content Fetching**: Automatically fetch latest content from multiple sources including Dev.to, GitHub, HackerNews, Medium, and NPM
- **AI Post Generation**: Leverage Google Gemini AI to generate engaging LinkedIn posts from fetched content
- **Queue Management**: Robust job queuing system using BullMQ with Redis for reliable processing
- **Dashboard Monitoring**: Real-time monitoring of queues and jobs via Bull Board dashboard
- **Scheduled Tasks**: Automated schedulers for content fetching and post generation
- **Modern UI**: Clean React dashboard with Tailwind CSS for easy management
- **RESTful API**: Well-structured API endpoints for all operations

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with ES modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Queue**: BullMQ with Redis
- **AI**: Google Generative AI (Gemini)
- **Authentication**: LinkedIn OAuth
- **Logging**: Winston
- **Scheduling**: Node-cron
- **Web Scraping**: Cheerio, RSS Parser

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Routing**: React Router DOM
- **Icons**: Lucide React
- **Theme**: Next Themes (Dark/Light mode)

## 📁 Project Structure

```
node-linkedin-bot/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                    # Database connection
│   │   ├── controller/
│   │   │   ├── ai.controller.js         # AI post generation endpoints
│   │   │   └── fetcher.controller.js    # Content fetching endpoints
│   │   ├── dashboard/
│   │   │   └── bullboard.js             # Bull Board dashboard setup
│   │   ├── models/
│   │   │   ├── fetchedContent.model.js  # Fetched content schema
│   │   │   └── generatedPost.model.js   # Generated post schema
│   │   ├── modules/
│   │   │   ├── ai/
│   │   │   │   └── ai.service.js        # AI service for post generation
│   │   │   ├── fetchers/
│   │   │   │   ├── fetcher.service.js   # Main fetcher service
│   │   │   │   ├── index.js             # Fetcher module exports
│   │   │   │   ├── normalizer.js        # Content normalization
│   │   │   │   └── sources/             # Individual source fetchers
│   │   │   │       ├── devto.js
│   │   │   │       ├── github.js
│   │   │   │       ├── hackernews.js
│   │   │   │       ├── medium.js
│   │   │   │       └── npm.js
│   │   │   ├── publisher/               # LinkedIn publishing module
│   │   │   └── scheduler/
│   │   │       ├── aiScheduler.js       # AI generation scheduler
│   │   │       └── fetchScheduler.js    # Content fetching scheduler
│   │   ├── queue/
│   │   │   ├── ai.queue.js              # AI processing queue
│   │   │   ├── connection.js            # Redis connection
│   │   │   ├── fetcher.queue.js         # Content fetching queue
│   │   │   ├── jobTypes.js              # Job type definitions
│   │   │   └── workers/
│   │   │       ├── ai.worker.js         # AI processing worker
│   │   │       └── fetcher.worker.js    # Content fetching worker
│   │   ├── routes/
│   │   │   ├── ai.routes.js             # AI-related routes
│   │   │   ├── aiPosts.routes.js        # Generated posts routes
│   │   │   ├── dashboard.routes.js      # Dashboard routes
│   │   │   ├── fetcher.route.js         # Fetcher routes
│   │   │   └── test.routes.js           # Test routes
│   │   ├── services/
│   │   │   ├── gemini.js                # Gemini AI integration
│   │   │   └── generatePostservice.js   # Post generation service
│   │   ├── utils/
│   │   │   └── logger.js                # Logging utility
│   │   └── server.js                    # Main server file
│   ├── middleware/
│   │   └── bullmq.middleware.js         # BullMQ authentication middleware
│   ├── logs/                            # Application logs
│   ├── package.json
│   ├── envdemo                          # Environment variables template
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ThemeToggle.jsx          # Dark/Light theme toggle
│   │   │   ├── layout/
│   │   │   │   ├── Header.jsx           # App header
│   │   │   │   ├── Layout.jsx           # Main layout wrapper
│   │   │   │   └── Sidebar.jsx          # Navigation sidebar
│   │   │   └── ui/                      # Reusable UI components
│   │   │       ├── badge.jsx
│   │   │       ├── button.jsx
│   │   │       ├── card.jsx
│   │   │       ├── input.jsx
│   │   │       ├── PostSkeleton.jsx
│   │   │       ├── skeleton.jsx
│   │   │       └── table.jsx
│   │   ├── lib/
│   │   │   └── utils.js                 # Utility functions
│   │   ├── pages/
│   │   │   ├── AiGeratepost.jsx         # AI post generation page
│   │   │   ├── Dashboard.jsx            # Main dashboard
│   │   │   ├── Fetcher.jsx              # Content fetcher page
│   │   │   ├── FetcherList.jsx          # Fetched content list
│   │   │   └── QueueMonitor.jsx         # Queue monitoring page
│   │   ├── App.jsx                      # Main app component
│   │   ├── main.jsx                     # App entry point
│   │   ├── index.css                    # Global styles
│   │   └── App.css                      # App-specific styles
│   ├── public/                          # Static assets
│   ├── package.json
│   ├── vite.config.js                   # Vite configuration
│   ├── tailwind.config.js               # Tailwind CSS config
│   ├── postcss.config.js                # PostCSS config
│   ├── eslint.config.js                 # ESLint configuration
│   ├── jsconfig.json                    # JavaScript config
│   ├── components.json                  # Component config
│   └── .gitignore
└── README.md
```

## 🛠 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- Redis
- Google Gemini API key
- LinkedIn App credentials

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp envdemo .env
   ```

4. Configure your `.env` file with required variables:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/linkedin-bot
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   GEMINI_API_KEY=your_gemini_api_key
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:5000/auth/linkedin/callback
   ```

5. Start the backend server:
   ```bash
   npm run dev  # For development
   npm start    # For production
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## 🚀 Usage

### API Endpoints

#### Content Fetching
- `GET /api/fetch/:source` - Start fetching content from a specific source
- `GET /api/fetched-data` - Get all fetched content

#### AI Post Generation
- `POST /ai/generate` - Generate posts using AI
- `GET /api/ai-posts` - Get generated posts

#### Dashboard
- `GET /admin/queues` - Access Bull Board dashboard (requires authentication)

### Frontend Pages
- **Dashboard** (`/`): Overview and statistics
- **Fetcher** (`/fetcher`): Manual content fetching controls
- **Records** (`/records`): View fetched content
- **Queue Monitor** (`/queue`): Monitor job queues
- **AI Posts** (`/posts`): View generated posts

## 🔧 Development

### Available Scripts

#### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Modular architecture with clear separation of concerns

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

**Note**: This project is for educational and automation purposes. Ensure compliance with LinkedIn's terms of service and API usage policies.