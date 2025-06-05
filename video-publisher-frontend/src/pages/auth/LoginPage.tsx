import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, CardContent } from '../../components/ui';
import { LoginRequest } from '../../types';
import { apiService } from '../../services/api';
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { Google as GoogleIcon, Facebook as FacebookIcon } from '@mui/icons-material';
import { Container, Box, Typography, TextField, Divider } from '@mui/material';

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
  const { login, socialLogin } = useAuth();
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

  const handleSocialLogin = async (provider: string) => {
    try {
      setSocialLoading(provider);
      setError(null);
      const token = await getSocialToken(provider);
      await socialLogin(provider, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(`${provider} login failed: ${err.message}`);
      setSocialLoading(null);
    }
  };

  const getSocialToken = async (provider: string): Promise<string> => {
    // Implement OAuth flow here
    // This is just a placeholder
    return 'dummy-token';
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await apiService.forgotPassword(email);
      alert('If an account with that email exists, a password reset link has been sent.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError('Failed to send password reset email. Please try again.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Sign in
        </Typography>
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={register('email').value}
            onChange={(e) => register('email').onChange(e)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={register('password').value}
            onChange={(e) => register('password').onChange(e)}
          />
          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Sign In
          </Button>
          <Divider sx={{ my: 2 }}>OR</Divider>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleSocialLogin('google')}
            sx={{ mb: 1 }}
          >
            Continue with Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<FacebookIcon />}
            onClick={() => handleSocialLogin('facebook')}
          >
            Continue with Facebook
          </Button>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link to="/forgot-password">
              <Typography variant="body2">Forgot password?</Typography>
            </Link>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link to="/register">Sign up</Link>
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
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
