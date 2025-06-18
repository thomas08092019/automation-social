import { useState, useEffect } from 'react';
import { SocialAccount } from '../types';
import { socialAccountsApi } from '../services/socialAccountsApi';

interface UseSocialAccountsReturn {
  socialAccounts: SocialAccount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSocialAccounts(): UseSocialAccountsReturn {
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSocialAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await socialAccountsApi.getAllAccounts();
      setSocialAccounts(response.data);
    } catch (err) {
      console.error('Failed to fetch social accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch social accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSocialAccounts();
  }, []);

  return {
    socialAccounts,
    loading,
    error,
    refetch: fetchSocialAccounts,
  };
}
