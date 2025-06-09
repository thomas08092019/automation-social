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
        const isSocialConnection = searchParams.get('social_connection');
        
        if (isSocialConnection) {
          // 🎉 Handle social account connection result (success/error)
          const connectionStatus = isSocialConnection; // 'success' or 'error'
          const platform = searchParams.get('platform') || 'Unknown';
          const accountName = searchParams.get('account_name') || 'Connected Account';
          const errorMessage = searchParams.get('message');
          
          console.log('🔗 Social connection result:', { connectionStatus, platform, accountName, errorMessage });
          
          if (connectionStatus === 'success') {
            setStatus('success');
            
            if (window.opener) {
              // ✅ Notify parent window of successful connection and close popup
              console.log('🎉 Notifying parent of successful social account connection');
              window.opener.postMessage({
                type: 'oauth-success',
                data: {
                  platform,
                  accountName: decodeURIComponent(accountName),
                  connectionType: 'social_account'
                }
              }, '*');
              
              // Close popup after short delay to show success message
              setTimeout(() => {
                window.close();
              }, 2000);
            } else {
              // Direct navigation - redirect to manage social accounts page
              setTimeout(() => {
                navigate('/manage-social-accounts');
              }, 2000);
            }
          } else {
            // ❌ Connection failed
            const error = errorMessage ? decodeURIComponent(errorMessage) : 'Failed to connect social account';
            setError(error);
            setStatus('error');
            
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth-error',
                error: error,
                platform: platform
              }, '*');
              
              // Close popup after delay to show error message
              setTimeout(() => {
                window.close();
              }, 3000);
            }
          }
          
          return; // Exit early for social connection flow
        }
        
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
          }        } else {
          // Handle initial OAuth callback with code - determine flow type and route accordingly
          const code = searchParams.get('code');
          const state = searchParams.get('state');

          if (!code || !state) {
            throw new Error('Missing authorization code or state parameter');
          }

          // ⚡ SMART FLOW ROUTING ⚡
          // Detect flow type based on state parameter format and route to appropriate controller
          console.log('🚀 Smart flow routing based on state parameter');
          console.log('State:', state);
          console.log('Code age: <1 second for maximum speed');
          
          // Flow detection logic (matching backend logic):
          // - Login flow format: "login-provider-timestamp"
          // - Social account flow format: "userId:platform:timestamp"
          const isLoginFlow = state.startsWith('login-');
          const isSocialAccountFlow = state.includes(':') && !state.startsWith('login-');
          
          console.log('Flow detection:', { isLoginFlow, isSocialAccountFlow });
          
          if (isSocialAccountFlow) {
            // Route social account connections to social-account controller for proper metadata handling
            console.log('🔗 Routing to social-account controller for social account connection');
            window.location.href = `http://localhost:3001/auth/oauth/callback?code=${code}&state=${state}`;
          } else if (isLoginFlow) {
            // Route login flows to auth controller 
            console.log('🔐 Routing to auth controller for user login');
            window.location.href = `http://localhost:3001/auth/oauth/callback?code=${code}&state=${state}`;
          } else {
            // Default to auth controller for unknown flows
            console.log('❓ Unknown flow type, defaulting to auth controller');
            window.location.href = `http://localhost:3001/auth/oauth/callback?code=${code}&state=${state}`;
          }
          
          return;
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
