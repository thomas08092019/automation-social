import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { RegisterRequest } from '../../types';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const registerData: RegisterRequest = {
        email: data.email,
        username: data.username,
        password: data.password,
      };

      await registerUser(registerData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fadeInUp">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Join us today
          </h2>
          <p className="text-gray-600 text-lg mb-2">
            Create your account
          </p>
          <p className="text-sm text-gray-500">
            Or{' '}
            <Link
              to="/login"
              className="font-semibold text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        <Card className="modern-card shadow-strong">
          <CardContent className="p-8">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="error-state text-center p-4 rounded-lg animate-fadeInUp">
                  <p className="text-white font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  error={errors.email?.message}
                  className="modern-input"
                  {...register('email')}
                />

                <Input
                  label="Username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter your username"
                  error={errors.username?.message}
                  className="modern-input"
                  {...register('username')}
                />

                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Enter your password"
                  error={errors.password?.message}
                  className="modern-input"
                  {...register('password')}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm your password"
                  error={errors.confirmPassword?.message}
                  className="modern-input"
                  {...register('confirmPassword')}
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-gradient py-3 text-lg font-semibold rounded-xl"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
