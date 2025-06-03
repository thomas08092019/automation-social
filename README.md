# Automation Social - Video Publisher System

A comprehensive enterprise-grade video publishing platform with advanced automation features for social media management.

## 🏗️ Project Structure

```
automation-social/
├── video-publisher-backend/     # NestJS Backend API
│   ├── src/
│   │   ├── auth/               # Authentication module
│   │   ├── users/              # User management
│   │   ├── videos/             # Video processing
│   │   ├── accounts/           # Social media accounts
│   │   ├── publishing/         # Publication services
│   │   ├── jobs/               # Job scheduling
│   │   └── analytics/          # Analytics & reporting
│   ├── prisma/                 # Database schema & migrations
│   └── README.md
│
└── video-publisher-frontend/   # React Frontend Application
    ├── src/
    │   ├── components/         # Reusable UI components
    │   ├── pages/              # Application pages
    │   ├── hooks/              # Custom React hooks
    │   ├── services/           # API services
    │   └── utils/              # Utility functions
    └── README.md
```

## 🚀 Features

### Backend Features
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Video Processing**: Advanced video upload, processing, and optimization
- **Social Media Integration**: Multi-platform publishing (YouTube, TikTok, Instagram, etc.)
- **Job Scheduling**: Cron-based job scheduling with RabbitMQ
- **Real-time Updates**: WebSocket connections for live status updates
- **Analytics & Reporting**: Comprehensive performance metrics
- **Database Management**: PostgreSQL with Prisma ORM

### Frontend Features
- **Modern UI/UX**: Beautiful React interface with Tailwind CSS
- **Video Management**: Upload, preview, and organize video content
- **Job Creation Wizard**: 4-step guided job creation process
- **Real-time Dashboard**: Live job status updates and analytics
- **Account Management**: Manage multiple social media accounts
- **Settings & Preferences**: Comprehensive user configuration
- **Testing Interface**: Built-in testing and validation tools

## 🛠️ Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT, Passport.js
- **File Processing**: Multer, Sharp
- **Message Queue**: RabbitMQ
- **Real-time**: Socket.IO
- **Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **State Management**: React Context + Hooks
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Build Tool**: Vite

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- RabbitMQ
- Git

### Backend Setup
```bash
cd video-publisher-backend
npm install
cp .env.example .env
# Configure database and other environment variables
npx prisma migrate dev
npm run start:dev
```

### Frontend Setup
```bash
cd video-publisher-frontend
npm install
cp .env.example .env.local
# Configure API endpoint
npm run dev
```

## 📖 Documentation

- [Backend README](./video-publisher-backend/README.md) - Detailed backend documentation
- [Frontend README](./video-publisher-frontend/README.md) - Frontend setup and features
- [API Documentation](http://localhost:3000/api/docs) - Swagger API docs (when backend is running)

## 🔧 Development

### Running Both Services
```bash
# Terminal 1 - Backend
cd video-publisher-backend
npm run start:dev

# Terminal 2 - Frontend
cd video-publisher-frontend
npm run dev
```

### Environment Configuration
Both projects require environment variables:
- Backend: `.env` file in `video-publisher-backend/`
- Frontend: `.env.local` file in `video-publisher-frontend/`

## 🚀 Deployment

### Backend Deployment
- Configure production database
- Set up RabbitMQ instance
- Deploy to cloud platform (AWS, GCP, Azure)
- Configure environment variables

### Frontend Deployment
- Build production bundle: `npm run build`
- Deploy to static hosting (Vercel, Netlify, S3)
- Configure API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Repository**: [github.com/thomas08092019/automation-social](https://github.com/thomas08092019/automation-social)
- **Issues**: [GitHub Issues](https://github.com/thomas08092019/automation-social/issues)
- **Documentation**: [Project Wiki](https://github.com/thomas08092019/automation-social/wiki)

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the README files in each project folder

---

**Built with ❤️ for efficient social media automation**
