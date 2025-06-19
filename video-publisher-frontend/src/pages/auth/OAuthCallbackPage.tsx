import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/ui/Loading';

export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for OAuth error
        const oauthError = searchParams.get('error');
        if (oauthError) {
          const platform = searchParams.get('platform');
          console.error('OAuth error:', oauthError, 'Platform:', platform);
          
          // Handle specific error cases
          if (oauthError.includes('not configured')) {
            throw new Error(`${platform} OAuth is not configured. Please contact the administrator to set up ${platform} integration.`);
          }
          
          throw new Error(decodeURIComponent(oauthError));
        }

        // Check if this is a social account connection
        const isSocialConnection = searchParams.get('social_connection');
        
        if (isSocialConnection) {
          // Handle social account connection result (success/error)
          const connectionStatus = isSocialConnection; // 'success' or 'error'
          const platform = searchParams.get('platform') || 'Unknown';
          const accountName = searchParams.get('account_name') || 'Connected Account';
          const errorMessage = searchParams.get('message');
          
          console.log('🔗 Social connection result:', { connectionStatus, platform, accountName, errorMessage });
          
          if (connectionStatus === 'success') {
            setStatus('success');
            
            if (window.opener) {
              // Notify parent window of successful connection and close popup
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
              // Direct navigation - redirect to social accounts page
              setTimeout(() => {
                navigate('/social');
              }, 2000);
            }
          } else {
            // Connection failed
            const errorMsg = errorMessage ? decodeURIComponent(errorMessage) : 'Failed to connect social account';
            setError(errorMsg);
            setStatus('error');
            
            if (window.opener) {
              window.opener.postMessage({
                type: 'oauth-error',
                error: errorMsg,
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
        
        // Handle initial OAuth callback with code for social account connection
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        console.log('🚀 Processing OAuth callback for social account connection');
        console.log('State:', state);
        
        // Route to backend OAuth callback for social account connection
        console.log('� Routing to backend for social account connection processing');
        window.location.href = `http://localhost:3001/auth/oauth/callback?code=${code}&state=${state}`;
        
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message);
        setStatus('error');
        
        if (window.opener) {
          window.opener.postMessage({ type: 'oauth-error', error: err.message }, '*');
          setTimeout(() => window.close(), 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">
            {status === 'processing' && 'Processing Connection...'}
            {status === 'success' && 'Connection Successful!'}
            {status === 'error' && 'Connection Failed'}
          </h1>
        </div>
          
        {status === 'processing' && (
          <div className="oauth-status">
            <Loading type="spinner" text="Connecting your social account..." subtitle="Please wait while we process your connection..." />
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
            <p className="status-message">Successfully connected your social account!</p>
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
                ? 'Connection was cancelled. You can try again.'
                : `Connection failed: ${error}`
              }
            </p>
            <div className="oauth-actions">
              <button onClick={() => navigate('/social')} className="btn btn-primary">
                Back to Social Accounts
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
