# Video Publisher Frontend

A modern React-based frontend application for managing video publishing workflows across multiple social media platforms. Built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **Dashboard**: Real-time overview of publishing jobs, analytics, and system status
- **Job Management**: Create, monitor, and manage video publishing jobs with batch processing
- **Video Library**: Upload, organize, and manage video content with metadata
- **Social Account Integration**: Connect and manage multiple social media accounts
- **Settings Management**: Comprehensive user preferences, security, and notification settings
- **Real-time Updates**: Live job status updates and progress tracking

### Advanced Features
- **Batch Job Creation**: Multi-step wizard for creating complex publishing workflows
- **Scheduling System**: Advanced scheduling with timezone support and recurring options
- **Analytics Dashboard**: Detailed performance metrics and engagement tracking
- **Testing Interface**: Built-in testing and debugging tools for development
- **Responsive Design**: Mobile-first design with modern UI components

## 🛠 Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS for utility-first styling
- **Icons**: Lucide React for consistent iconography
- **State Management**: React hooks and context for local state
- **Routing**: React Router DOM for client-side navigation
- **Development**: ESLint for code quality and TypeScript for type safety

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, Sidebar, etc.)
│   └── common/         # Common components
├── pages/              # Page components
│   ├── dashboard/      # Dashboard and analytics
│   ├── jobs/          # Job management
│   ├── library/       # Video library
│   ├── accounts/      # Social account management
│   ├── settings/      # User settings
│   └── testing/       # Testing and debugging
├── hooks/             # Custom React hooks
├── services/          # API services and utilities
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd video-publisher-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENVIRONMENT=development
```

### API Integration
The frontend is designed to work with the Video Publisher backend API. Update the base URL in `src/services/api.ts` to match your backend deployment.

## 📱 Features Overview

### Dashboard
- Real-time job statistics and system metrics
- Recent activity feed with job status updates
- Quick actions for common tasks
- Performance analytics and trending content

### Job Management
- **Create Jobs**: 4-step wizard for setting up publishing workflows
  1. Video Selection: Choose from library or upload new content
  2. Account Selection: Select target social media platforms
  3. Configuration: Set scheduling, captions, and platform-specific settings
  4. Review: Confirm job details before submission
- **Monitor Progress**: Real-time status updates with detailed progress tracking
- **Batch Operations**: Handle multiple videos and accounts simultaneously
- **Advanced Scheduling**: Support for immediate, scheduled, and recurring posts

### Video Library
- Upload and organize video content
- Metadata management (titles, descriptions, tags)
- Preview and thumbnail generation
- Search and filtering capabilities
- Bulk operations for multiple videos

### Social Account Management
- Connect multiple platforms (Twitter, LinkedIn, Instagram, etc.)
- Account health monitoring and authentication status
- Platform-specific settings and configurations
- Bulk account operations

### Settings
- **Profile**: Personal information and account details
- **Security**: Password management and two-factor authentication
- **Notifications**: Email and in-app notification preferences
- **Preferences**: UI themes, timezone, and application behavior

### Testing Interface
- Interactive feature testing and validation
- API endpoint testing with real-time results
- Development tools and debugging utilities
- Technical stack overview and system information

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface with consistent styling
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode**: Theme switching support (configurable)
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Performance**: Optimized loading with lazy loading and code splitting
- **Real-time Updates**: Live status indicators and progress bars

## 🔄 Real-time Features

- **Job Status Updates**: Live progress tracking for publishing jobs
- **System Notifications**: Real-time alerts for important events
- **Auto-refresh**: Configurable auto-refresh intervals for job lists
- **WebSocket Support**: Ready for real-time communication with backend

## 🧪 Development & Testing

### Development Mode
The application includes a comprehensive testing page (`/testing`) for:
- Feature validation and debugging
- API endpoint testing
- Performance monitoring
- Development tools and utilities

### Code Quality
- **TypeScript**: Full type safety throughout the application
- **ESLint**: Consistent code style and error prevention
- **Component Architecture**: Modular, reusable component design
- **Custom Hooks**: Encapsulated logic for state management and API calls

## 🚀 Deployment

### Production Build
```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment to any static hosting service.

### Deployment Options
- **Vercel**: Zero-config deployment with automatic builds
- **Netlify**: Static site hosting with continuous deployment
- **AWS S3**: Static website hosting with CloudFront CDN
- **Docker**: Containerized deployment with included Dockerfile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `/docs` directory
- Review the testing page for troubleshooting guides
  },
})
```
