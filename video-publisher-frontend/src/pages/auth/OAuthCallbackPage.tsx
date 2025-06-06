import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { socialLogin, setAuthenticatedUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error
        const oauthError = searchParams.get('error');
        if (oauthError) {
          throw new Error(`OAuth error: ${oauthError}`);
        }        // Check if this is the final login callback with token and user data
        const isLoginFlow = searchParams.get('login') === 'true';
        
        if (isLoginFlow) {
          // Handle final login callback - backend redirects with token and user data
          const token = searchParams.get('token');
          const userJson = searchParams.get('user');
          const error = searchParams.get('error');

          if (error) {
            throw new Error(decodeURIComponent(error));
          }

          if (!token || !userJson) {
            throw new Error('Missing authentication data from OAuth callback');
          }          // Parse user data
          const user = JSON.parse(decodeURIComponent(userJson));

          // Update auth context with OAuth user data
          setAuthenticatedUser(user, token);

          setStatus('success');
          
          if (window.opener) {
            // Notify parent window and close popup
            window.opener.postMessage({ 
              type: 'oauth-success', 
              data: { token, user } 
            }, '*');
            window.close();
          } else {
            // Direct navigation - reload to initialize auth state and redirect to dashboard
            window.location.href = '/dashboard';
          }
        } else {
          // Handle initial OAuth callback with code - redirect to backend for processing
          const code = searchParams.get('code');
          const state = searchParams.get('state');

          if (!code || !state) {
            throw new Error('Missing authorization code or state parameter');
          }

          // Check if this is a login flow based on state
          if (state.startsWith('login-')) {
            // Redirect to backend OAuth callback endpoint for token exchange
            window.location.href = `http://localhost:3001/auth/oauth/callback?code=${code}&state=${state}`;
            return;
          }

          // Handle social account connection flow (for non-login OAuth)
          setStatus('success');
          
          if (window.opener) {
            // Notify parent window for social account connection
            window.opener.postMessage({ 
              type: 'oauth-success', 
              data: { code, state } 
            }, '*');
            window.close();
          } else {
            // Direct navigation to social accounts page
            navigate('/social-accounts');
          }
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        setStatus('error');
        
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-error', error: err.message }, '*');
          setTimeout(() => window.close(), 3000);
        }
      }
    };    handleCallback();
  }, [searchParams, navigate]);
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {status === 'processing' && 'Processing Login...'}
            {status === 'success' && 'Login Successful!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>
        </div>
        
        {status === 'processing' && (
          <div className="oauth-status">
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            <p className="status-message">Completing your login...</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="oauth-status">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#10b981"/>
                <path d="m9 12 2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="status-message">Successfully logged in! Redirecting you to the dashboard...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="oauth-status">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="12" fill="#ef4444"/>
                <path d="m15 9-6 6m0-6 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="status-message">
              {error === 'OAuth error: access_denied' 
                ? 'Login was cancelled. You can try again or use a different method.'
                : `Authentication failed: ${error}`
              }
            </p>
            <div className="oauth-actions">
              <button onClick={() => navigate('/login')} className="btn btn-primary">
                Return to Login
              </button>
              <button onClick={() => navigate('/signup')} className="btn btn-secondary">
                Create Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
