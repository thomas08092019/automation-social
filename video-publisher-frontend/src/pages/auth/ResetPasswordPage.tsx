import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import '../../styles/base.css';
import '../../styles/auth.css';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const watchPassword = watch("password");

  // Check if token is provided
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  // Password strength checker
  const checkPasswordStrength = (password: string) => {
    if (!password) return null;
    
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch (strength) {
      case 0:
      case 1:
      case 2:
        feedback = 'Weak password';
        return { strength: 'weak', feedback };
      case 3:
      case 4:
        feedback = 'Medium password';
        return { strength: 'medium', feedback };
      case 5:
        feedback = 'Strong password';
        return { strength: 'strong', feedback };
      default:
        return null;
    }
  };

  const [passwordStrength, setPasswordStrength] = useState<{strength: string, feedback: string} | null>(null);

  React.useEffect(() => {
    if (watchPassword) {
      const result = checkPasswordStrength(watchPassword);
      setPasswordStrength(result);
    } else {
      setPasswordStrength(null);
    }
  }, [watchPassword]);
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);      // Reset the password and get the auth response for auto-login
      const authResponse = await apiService.resetPassword({
        token: token,
        newPassword: data.password,
      });

      // Auto-login the user with the returned auth data
      if (authResponse.accessToken && authResponse.user) {
        // Store the access token
        localStorage.setItem('access_token', authResponse.accessToken);
          // Set the authenticated user in context
        await setAuthenticatedUser(authResponse.user, authResponse.accessToken);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        // Fallback: redirect to login with success message
        navigate('/login?resetSuccess=true');
      }

    } catch (err: any) {
      console.error('Password reset failed:', err);
      if (err.response?.status === 400) {
        setError('Invalid or expired reset token. Please request a new password reset.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If token is invalid, show error state
  if (tokenValid === false) {
    return (
      <div className="auth-container">
        <div className="login-container gradient-primary">
          <div className="login-form">
            <div className="login-header">
              <h1>Invalid Reset Link</h1>
              <p>This password reset link is invalid or has expired.</p>
            </div>
            <div className="error-message" style={{display: 'block', marginBottom: '20px'}}>
              {error}
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="btn-primary login-btn"
            >
              Back to Login
            </button>
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
      </div>

      {/* Right Side - Reset Password Form */}
      <div className="login-container gradient-primary">
        <div className="login-form">
          {/* Header */}
          <div className="login-header">
            <h1>Reset Your Password</h1>
            <p>Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Password Field */}
            <div className={`form-group ${errors.password ? 'error' : ''}`}>
              <label htmlFor="password">New Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Create a new password"
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
              {passwordStrength && (
                <div className={`password-strength strength-${passwordStrength.strength}`}>
                  {passwordStrength.feedback}
                </div>
              )}
              {errors.password && (
                <div className="error-message">{errors.password.message}</div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className={`form-group ${errors.confirmPassword ? 'error' : ''}`}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"></path>
                </svg>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  placeholder="Confirm your new password"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="toggle-icon"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
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
              {errors.confirmPassword && (
                <div className="error-message">{errors.confirmPassword.message}</div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{display: 'block', marginBottom: '20px'}}>
                {error}
              </div>
            )}

            {/* Reset Password Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary login-btn"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="signup-link">
            Remember your password?<br />
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: '#667eea', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
