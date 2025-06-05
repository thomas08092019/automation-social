import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { LoginRequest } from '../../types';
import { apiService } from '../../services/api';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loginData: LoginRequest = {
        email: data.email,
        password: data.password,
      };

      await login(loginData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };  const handleSocialLogin = async (provider: string) => {
    try {
      setSocialLoading(provider);
      setError(null);
      
      // Create a simple OAuth flow using popup windows
      const authUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/auth/oauth/${provider}`;
      
      const popup = window.open(
        authUrl,
        `${provider}-login`,
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      
      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')) {
          return;
        }
        
        if (event.data.type === 'OAUTH_SUCCESS') {
          const { user, accessToken } = event.data;
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('user', JSON.stringify(user));
          popup.close();
          window.removeEventListener('message', handleMessage);
          navigate('/dashboard');
        } else if (event.data.type === 'OAUTH_ERROR') {
          setError(`${provider} login failed: ${event.data.error}`);
          popup.close();
          window.removeEventListener('message', handleMessage);
          setSocialLoading(null);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setSocialLoading(null);
          
          // Show helpful message about OAuth setup
          if (provider === 'Google') {
            setError('Google OAuth requires configuration. Please set up Google OAuth credentials in the backend.');
          } else if (provider === 'Facebook') {
            setError('Facebook OAuth requires configuration. Please set up Facebook OAuth credentials in the backend.');
          }
        }
      }, 1000);
      
    } catch (err: any) {
      setError(`${provider} login failed: ${err.message}`);
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await apiService.forgotPassword(email);
      alert('If an account with that email exists, a password reset link has been sent.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError('Failed to send password reset email. Please try again.');
    }
  };return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Beautiful Purple Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-2000"></div>
      </div>

      {/* Main Login Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-fadeInUp">
          {/* Logo Area - Customizable */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-purple-100 text-lg">
            Sign in to your account
          </p>
        </div>

        {/* Glassmorphism Login Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeInUp delay-200">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl animate-fadeInUp">
              <p className="text-red-100 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          {!showForgotPassword ? (
            <>
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocialLogin('Google')}
                  disabled={socialLoading === 'Google'}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === 'Google' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleSocialLogin('Facebook')}
                  disabled={socialLoading === 'Facebook'}
                  className="w-full flex items-center justify-center px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === 'Facebook' ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Continue with Facebook
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/30"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-purple-100">Or continue with email</span>
                </div>
              </div>

              {/* Email & Password Form */}
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-300">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                    {...register('password')}
                  />
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
                  )}
                </div>

                {/* Forgot Password Link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-purple-200 hover:text-white transition-colors duration-200"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Forgot Password Form */
            <ForgotPasswordForm 
              onSubmit={handleForgotPassword}
              onBack={() => setShowForgotPassword(false)}
            />
          )}

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-purple-100">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-white font-semibold hover:underline transition-all duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Forgot Password Component
function ForgotPasswordForm({ onSubmit, onBack }: { onSubmit: (email: string) => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    await onSubmit(email);
    setIsLoading(false);
  };

  return (
    <div className="animate-fadeInUp">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
        <p className="text-purple-100 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Sending...
            </div>
          ) : (
            'Send Reset Link'
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 text-purple-200 hover:text-white transition-colors duration-200"
        >
          ← Back to Sign In
        </button>
      </form>
    </div>
  );
}
