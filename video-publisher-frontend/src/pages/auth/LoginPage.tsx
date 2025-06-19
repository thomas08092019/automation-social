import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { LoginRequest } from '../../types';
import { apiService } from '../../services/api';
import '../../styles/base.css';
import '../../styles/auth.css';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, firebaseLogin, setAuthenticatedUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Check for reset success message
  useEffect(() => {
    if (searchParams.get('resetSuccess') === 'true') {
      setSuccessMessage('Password reset successful! You can now log in with your new password.');
    }
  }, [searchParams]);

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

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
  };  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try {
      setSocialLoading(provider);
      setError(null);
      
      // Use Firebase authentication
      await firebaseLogin(provider);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`${provider} login failed: ${err.message}`);
    } finally {
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
      <div className="auth-container">
        <div className="login-container gradient-primary">
          <div className="login-form">
            <ForgotPasswordForm 
              onSubmit={handleForgotPassword} 
              onBack={() => setShowForgotPassword(false)} 
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="auth-container">
      {/* Left Side - Brand Section */}
      <div className="brand-section">
        <div className="brand-text">
          <h1 className="gradient-text-primary">Automation</h1>
          <h2 className="gradient-text-secondary">Social</h2>
        </div>
      </div>      {/* Right Side - Login Form */}
      <div className="login-container gradient-primary">
        <div className="login-form">
          {/* Header */}
          <div className="login-header">
            <h1>Login</h1>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div className={`form-group ${errors.email ? 'error' : ''}`}>
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                </svg>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="Type your email"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <div className="error-message">{errors.email.message}</div>
              )}
            </div>

            {/* Password Field */}
            <div className={`form-group ${errors.password ? 'error' : ''}`}>
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Type your password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="toggle-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd"></path>
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"></path>
                    </svg>
                  ) : (
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path>
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="error-message">{errors.password.message}</div>
              )}
            </div>

            {/* Forgot Password */}
            <div className="forgot-password">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </button>
            </div>            {/* Success Message */}
            {successMessage && (
              <div className="success-message" style={{display: 'block', marginBottom: '20px', color: '#27ae60', fontSize: '14px', textAlign: 'center'}}>
                {successMessage}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{display: 'block', marginBottom: '20px'}}>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary login-btn"
            >
              {isLoading ? 'Logging in...' : 'LOGIN'}
            </button>
          </form>

          {/* Divider */}
          <div className="divider">Or Sign Up Using</div>

          {/* Social Login */}
          <div className="social-login">
            <button
              type="button"
              className="social-btn facebook-btn"
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading === 'facebook'}
            >
              {socialLoading === 'facebook' ? (
                <div className="spinner"></div>
              ) : (
                <svg className="icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
            </button>
            <button
              type="button"
              className="social-btn google-btn"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading === 'google'}
            >
              {socialLoading === 'google' ? (
                <div className="spinner"></div>
              ) : (
                <svg className="icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
            </button>
          </div>

          {/* Signup Link */}
          <div className="signup-link">
            Have not account yet?<br />
            <Link to="/signup">SIGN UP</Link>
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
    try {
      await onSubmit(email);
    } catch (error) {
      console.error('Failed to send reset email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="login-header">
        <h1>Forgot Password?</h1>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="reset-email">Email Address</label>
          <div className="input-wrapper">
            <svg className="input-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
            </svg>
            <input
              id="reset-email"
              type="email"
              className="form-input"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="btn-primary login-btn"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="btn-primary login-btn"
          style={{ background: 'rgba(255, 255, 255, 0.2)', marginTop: '10px' }}
        >
          ← Back to Sign In
        </button>
      </form>
    </>
  );
}
