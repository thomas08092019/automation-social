import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { LoginRequest, SocialPlatform } from '../../types';
import { apiService } from '../../services/api';
import { Mail, Lock, Eye, EyeOff, Play, Users, TrendingUp, ArrowRight, Shield, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, socialLogin, setAuthenticatedUser } = useAuth();
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
  };
  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      setError(null);
      
      // Map provider to platform enum
      const platformMap: Record<string, SocialPlatform> = {
        'google': SocialPlatform.YOUTUBE,
        'facebook': SocialPlatform.FACEBOOK,
      };      const platform = platformMap[provider];      // Get OAuth authorization URL from backend
      try {
        const authData = await apiService.getAuthorizationUrl(platform);
        
        // Open OAuth popup
        const popup = window.open(
          authData.authorizationUrl, 
          `${provider}-oauth`, 
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );
          if (!popup) {
          throw new Error('Popup blocked! Please allow popups for this site and try again.');
        }

        // Initialize cleanup variables
        let checkClosed: NodeJS.Timeout;
        let authCheckInterval: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;        // Listen for OAuth completion message from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'oauth-success') {
            cleanup();
            setSocialLoading(null);
            
            const { token, user } = event.data.data;
            
            try {
              // Update the auth context and wait for it to complete
              await setAuthenticatedUser(user, token);
              
              navigate('/dashboard');
            } catch (error) {
              console.error('Failed to set authenticated user:', error);
              setError('Failed to complete authentication');
            }
          } else if (event.data.type === 'oauth-error') {
            cleanup();
            setSocialLoading(null);
            setError(`OAuth failed: ${event.data.error}`);
          }
        };// Cleanup function to handle all cleanup operations
        const cleanup = () => {
          // Don't try to close popup due to COOP policy - let it close naturally
          // The popup will redirect to dashboard or close itself
          
          if (checkClosed) {
            clearInterval(checkClosed);
          }
          if (authCheckInterval) {
            clearInterval(authCheckInterval);
          }
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          window.removeEventListener('message', messageHandler);
        };

        window.addEventListener('message', messageHandler);        // Monitor popup - avoid popup.closed due to COOP policy
        // We'll rely primarily on localStorage monitoring and message passing
        let popupCheckCount = 0;
        checkClosed = setInterval(() => {
          popupCheckCount++;
          // After 30 seconds, if no success, the user might have closed the popup
          // This is a fallback - the main success detection is via localStorage and messages
          if (popupCheckCount > 30) {          // Don't call cleanup here as it might interfere with ongoing auth
            // Just continue monitoring
          }
          // After 2 minutes, assume something went wrong
          if (popupCheckCount > 120) {
            cleanup();
            setSocialLoading(null);
            setError('OAuth process seems to have stalled. Please try again.');
          }
        }, 1000);        // Alternative method: Check localStorage for auth token periodically
        // This handles cases where COOP prevents message passing
        authCheckInterval = setInterval(() => {
          const token = localStorage.getItem('access_token');
          const user = localStorage.getItem('user');
          
          if (token && user) {
            cleanup();
            setSocialLoading(null);
            navigate('/dashboard');
          }
        }, 1000);// Timeout after 5 minutes
        timeoutId = setTimeout(() => {
          cleanup();
          setSocialLoading(null);
          setError('OAuth login timeout. Please try again.');
        }, 300000);
        
      } catch (apiError: any) {
        // Handle specific API errors
        if (apiError.response?.status === 404 || apiError.message?.includes('No app configuration')) {
          setError(`${provider} login not available. OAuth app configuration is required. Please contact your administrator.`);
        } else {
          throw apiError;
        }
      }
    } catch (err: any) {
      setError(`${provider} login failed: ${err.message}`);
      setSocialLoading(null);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await apiService.forgotPassword({ email });
      alert('If an account with that email exists, a password reset link has been sent.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError('Failed to send password reset email. Please try again.');
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4">
        <div className="max-w-md w-full">
          <ForgotPasswordForm 
            onSubmit={handleForgotPassword} 
            onBack={() => setShowForgotPassword(false)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Section */}
      <div className="lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-60 right-16 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute bottom-40 left-40 w-16 h-16 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-32 w-20 h-20 bg-white rounded-full"></div>
        </div>
        
        <div className="relative z-10 text-center text-white max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-lg rounded-2xl mb-6">
              <Play className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                Video Publisher
              </span>
            </h1>
            <p className="text-purple-100 text-lg mb-8">
              Automate your social media presence across multiple platforms with ease
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <span className="text-purple-100">Multi-platform publishing</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-purple-100">Advanced analytics</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-purple-100">Secure & reliable</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-center mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <p className="text-purple-100 text-sm italic">
              "This platform saved me hours every week. The automation features are incredible!"
            </p>
            <p className="text-purple-200 text-xs mt-2">- Sarah K., Content Creator</p>
          </div>
        </div>
      </div>      {/* Right Side - Login Form */}
      <div className="lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10 h-12 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500 transition-colors"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-12 h-12 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-purple-500 transition-colors"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading === 'google'}
                className="h-12 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
              >
                {socialLoading === 'google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('facebook')}
                disabled={socialLoading === 'facebook'}
                className="h-12 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
              >
                {socialLoading === 'facebook' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </>
                )}
              </Button>
            </div>

            {/* Footer Links */}
            <div className="text-center space-y-4 pt-4">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors duration-200"
              >
                Forgot your password?
              </button>
              
              <div className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200"
                >
                  Sign up for free
                </Link>
              </div>
            </div>
          </form>
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
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
        <p className="text-purple-100">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="reset-email" className="text-white">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 h-5 w-5" />
            <Input
              id="reset-email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-white/20 border-white/30 text-white placeholder-purple-200 focus:border-white/50 focus:ring-white/50"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !email}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
              Sending...
            </div>
          ) : (
            'Send Reset Link'
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300"
        >
          ← Back to Sign In
        </Button>
      </form>
    </div>
  );
}
