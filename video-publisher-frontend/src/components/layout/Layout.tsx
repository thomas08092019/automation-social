import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Video, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  TestTube
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Videos', href: '/videos', icon: Video },
  { name: 'Social Accounts', href: '/social-accounts', icon: Users },
  { name: 'Jobs', href: '/jobs', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Testing', href: '/testing', icon: TestTube },
];

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex-1 flex flex-col max-w-xs w-full glass-effect border-r border-white/20">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <SidebarContent />
        </div>
        <div className="flex-shrink-0 w-14" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <SidebarContent />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">        {/* Top bar */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-soft">
          <button
            className="px-4 border-r border-gray-200/50 text-gray-500 hover:text-gray-700 hover:bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 md:hidden transition-all duration-200"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent self-center">
                Video Publisher
              </h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-700 bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-1 rounded-full border border-gray-200/50">
                  Welcome, <span className="font-semibold">{user?.username || user?.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-pink-500 transition-all duration-300 rounded-lg px-3 py-2"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gradient-to-r from-purple-600 to-blue-600 shadow-medium">
          <h1 className="text-xl font-bold text-white">Video Publisher</h1>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-3 py-4 bg-gradient-to-b from-gray-900 to-gray-800 space-y-2">
            {navigation.map((item, index) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-medium'
                      : 'text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-600 hover:text-white'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <item.icon
                    className={`mr-3 h-5 w-5 transition-all duration-200 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }
}
