import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PopupProvider } from './contexts/PopupContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { SocialAccountsPage } from './pages/social/SocialAccountsPage';
import { PublishingPage } from './pages/publishing/PublishingPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { Loading } from './components/ui/Loading';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="loading-page">
        <Loading size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-page">
        <Loading size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />      <Route 
        path="/signup" 
        element={
          <PublicRoute>
            <SignUpPage />
          </PublicRoute>
        } 
      />      <Route 
        path="/reset-password" 
        element={<ResetPasswordPage />} 
      />
      <Route 
        path="/auth/callback" 
        element={<OAuthCallbackPage />} 
      />{/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />      <Route 
        path="/social-accounts" 
        element={
          <ProtectedRoute>
            <SocialAccountsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/publishing" 
        element={
          <ProtectedRoute>
            <PublishingPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />

      {/* Legacy routes - redirect to main features */}
      <Route path="/videos" element={<Navigate to="/publishing" replace />} />
      <Route path="/upload" element={<Navigate to="/publishing" replace />} />
      <Route path="/jobs" element={<Navigate to="/publishing" replace />} />
      <Route path="/prompts" element={<Navigate to="/publishing" replace />} />
      <Route path="/trends" element={<Navigate to="/dashboard" replace />} />
      <Route path="/tts" element={<Navigate to="/publishing" replace />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <AppRoutes />
      </PopupProvider>
    </AuthProvider>
  );
}

export default App;
