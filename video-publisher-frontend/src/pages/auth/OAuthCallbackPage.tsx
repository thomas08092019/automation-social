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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        {status === 'processing' && (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing OAuth...</h2>
            <p className="text-gray-600">Please wait while we complete your authentication.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Successful!</h2>
            <p className="text-gray-600">You will be redirected shortly.</p>
          </div>
        )}
        
        {status === 'error' && (
          <div>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
