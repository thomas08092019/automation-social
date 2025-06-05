import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiService } from '../../services/api';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await apiService.resetPassword(token, data.password);
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Password reset failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600"></div>
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h1>
              <p className="text-purple-100 mb-6">
                This password reset link is invalid or has expired.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-300 shadow-xl"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600"></div>
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 text-center animate-fadeInUp">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 backdrop-blur-sm border border-green-400/30 mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Password Reset Successful!</h1>
            <p className="text-purple-100 mb-6">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <div className="animate-pulse text-purple-200 text-sm">
              Redirecting in 3 seconds...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Beautiful Purple Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-700 to-pink-600"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-1000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse delay-2000"></div>
      </div>

      {/* Main Reset Password Container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8 animate-fadeInUp">
          {/* Logo Area */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Reset Password
          </h1>
          <p className="text-purple-100 text-lg">
            Enter your new password
          </p>
        </div>

        {/* Glassmorphism Reset Password Card */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl shadow-2xl border border-white/20 p-8 animate-fadeInUp delay-200">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl animate-fadeInUp">
              <p className="text-red-100 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <input
                type="password"
                placeholder="New password"
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-300">{errors.password.message}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder="Confirm new password"
                className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-purple-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all duration-300"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-300">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Reset Password Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-white/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Resetting Password...
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-purple-200 hover:text-white transition-colors duration-200"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
