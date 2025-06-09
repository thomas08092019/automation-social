import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loading } from '../../components/ui/Loading';

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
          }          // Handle social account connection flow (for non-login OAuth)
          setStatus('processing');
          
          if (window.opener) {
            // For popup flow - handle OAuth callback and send tokens to backend
            try {
              // Parse state to extract platform info
              const [userId, platform, timestamp] = state.split(':');
              
              // Call backend OAuth callback endpoint to exchange code for tokens
              const response = await fetch('http://localhost:3001/social-accounts/oauth/callback', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}` // Add auth token
                },
                body: JSON.stringify({
                  code,
                  state,
                  platform: platform
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                setStatus('success');
                // Notify parent window of successful connection
                window.opener.postMessage({ 
                  type: 'oauth-success', 
                  data: result.data 
                }, '*');
                setTimeout(() => window.close(), 2000);
              } else {
                throw new Error(result.message || 'OAuth callback failed');
              }
            } catch (callbackError) {
              console.error('OAuth callback processing error:', callbackError);
              setError(callbackError.message);
              setStatus('error');
              window.opener.postMessage({ 
                type: 'oauth-error', 
                error: callbackError.message 
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          } else {
            // Direct navigation - redirect to social accounts page
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
            <Loading type="spinner" text="Completing your login..." subtitle="Please wait while we process your authentication..." />
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
