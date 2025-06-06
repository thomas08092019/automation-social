import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  dataPage: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    dataPage: 'dashboard',
    icon: 'M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z'
  },
  {
    name: 'My Profile',
    href: '/profile',
    dataPage: 'profile',
    icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
  },  {
    name: 'Manage Social',
    href: '/social-accounts',
    dataPage: 'social',
    icon: 'M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84'
  },
  {
    name: 'Manage Video',
    href: '/videos',
    dataPage: 'videos',
    icon: 'M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4z'
  },
  {
    name: 'Upload',
    href: '/jobs',
    dataPage: 'upload',
    icon: 'M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z'
  },
  {
    name: 'Manage Prompt',
    href: '/prompts',
    dataPage: 'prompts',
    icon: 'M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
  },
  {
    name: 'Google Trends',
    href: '/trends',
    dataPage: 'trends',
    icon: 'M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z'
  },
  {
    name: 'Text to Speech',
    href: '/tts',
    dataPage: 'tts',
    icon: 'M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.824L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.797-3.824a1 1 0 011.617.824zM14 5a1 1 0 011 1v8a1 1 0 11-2 0V6a1 1 0 011-1z'
  },
  {
    name: 'Settings',
    href: '/settings',
    dataPage: 'settings',
    icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
  }
];

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.body.classList.add('dark');
    }
    
    // Load saved colors and apply theme
    const savedStartColor = localStorage.getItem('customStartColor');
    const savedEndColor = localStorage.getItem('customEndColor');
    
    if (savedStartColor && savedEndColor) {
      // Apply saved color theme
      const gradient = `linear-gradient(135deg, ${savedStartColor} 0%, ${savedEndColor} 100%)`;
      
      document.documentElement.style.setProperty('--primary-start', savedStartColor);
      document.documentElement.style.setProperty('--primary-end', savedEndColor);
      document.documentElement.style.setProperty('--primary-gradient', gradient);
      
      // Apply dynamic styles
      let dynamicStyle = document.getElementById('dynamic-theme-style');
      if (!dynamicStyle) {
        dynamicStyle = document.createElement('style');
        dynamicStyle.id = 'dynamic-theme-style';
        document.head.appendChild(dynamicStyle);
      }
        const css = `
        .nav-link.active,
        .toggle-btn,
        .user-avatar,
        .preview-button,
        .btn-apply {
          background: ${gradient} !important;
        }
        
        .content-header {
          background: ${gradient} !important;
        }
        
        .content-header .page-title {
          color: white !important;
        }
        
        .content-header .theme-toggle {
          background: rgba(255, 255, 255, 0.2) !important;
          color: white !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }
        
        body.dark .content-header .theme-toggle {
          background: rgba(255, 255, 255, 0.15) !important;
          color: white !important;
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
        
        .preview-text,
        .logo {
          background: ${gradient} !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
        }
        
        .btn-apply:hover {
          box-shadow: 0 6px 16px ${savedStartColor}40 !important;
        }
        
        .toggle-btn:hover {
          box-shadow: 0 4px 12px ${savedStartColor}50 !important;
        }
        
        .coming-soon-icon {
          background: ${gradient} !important;
          box-shadow: 0 8px 32px ${savedStartColor}50 !important;
        }
        
        .copyright {
          background: ${gradient} !important;
          -webkit-background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-clip: text !important;
          font-weight: 600 !important;
        }
      `;
      
      dynamicStyle.textContent = css;
    }
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle sidebar
  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Navigate to page (SPA navigation)
  const navigateToPage = (href: string) => {
    navigate(href);
    // Close mobile menu after navigation
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(false);
    }
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const currentPath = location.pathname;
    const currentItem = navigationItems.find(item => item.href === currentPath);
    return currentItem?.name || 'Dashboard';
  };

  // Handle logout
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  // Get user avatar initial
  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };  return (
    <>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-overlay active" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'open' : ''}`} id="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button 
            className="toggle-btn" 
            onClick={toggleSidebar}
            id="sidebarToggle"
          >
            <span id="toggleIcon">{sidebarCollapsed ? '☰' : '✕'}</span>
          </button>          <div className="logo">
            Automation Social
          </div>
        </div>        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" id="userAvatar">
            {getUserInitial()}
          </div>
          <div className="user-info">
            <div className="user-greeting">Good day!</div>
            <div 
              className="user-email" 
              id="userEmail"
              title={user?.email || 'user@example.com'}
            >
              {user?.email || 'user@example.com'}
            </div>
          </div>
        </div>{/* Navigation */}
        <nav className="nav-menu">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <div key={item.name} className="nav-item">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateToPage(item.href);
                  }}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                  data-page={item.dataPage}
                >
                  <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
                  </svg>
                  <span className="nav-text">{item.name}</span>
                </a>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="copyright">© 2025 - ducktoan2001</div>
          <button className="logout-btn" onClick={handleLogout} id="logoutBtn">
            <svg className="logout-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
            </svg>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Content Header */}
        <div className="content-header">
          <h1 className="page-title" id="pageTitle">{getPageTitle()}</h1>
          <button className="theme-toggle" onClick={toggleTheme} id="themeToggle">
            <span id="themeIcon">{darkMode ? '☀️' : '🌙'}</span>
            <span id="themeText">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="content-body">
          {children}
        </div>
      </div>
    </>
  );
}
