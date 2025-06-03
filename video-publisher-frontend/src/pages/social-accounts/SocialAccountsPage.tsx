import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import apiService from '../../services/api';
import { Button, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { SocialAccount } from '../../types';
import { formatDate, getPlatformIcon, capitalizeFirst } from '../../utils';

export function SocialAccountsPage() {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => apiService.getSocialAccounts(),
  });

  const connectMutation = useMutation({
    mutationFn: (platform: string) => apiService.connectSocialAccount(platform),
    onSuccess: (data) => {
      window.open(data.authUrl, '_blank', 'width=600,height=600');
      setConnectingPlatform(null);
    },
    onError: (error) => {
      console.error('Failed to connect account:', error);
      setConnectingPlatform(null);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (accountId: string) => apiService.disconnectSocialAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (accountId: string) => apiService.refreshSocialAccountToken(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    },
  });

  const handleConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      await connectMutation.mutateAsync(platform);
    } catch (error) {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string, platform: string) => {
    if (window.confirm(`Are you sure you want to disconnect your ${capitalizeFirst(platform)} account?`)) {
      try {
        await disconnectMutation.mutateAsync(accountId);
      } catch (error) {
        console.error('Failed to disconnect account:', error);
      }
    }
  };

  const handleRefresh = async (accountId: string) => {
    try {
      await refreshMutation.mutateAsync(accountId);
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load social accounts. Please try again.
      </div>
    );
  }

  const platforms = ['youtube', 'tiktok', 'instagram', 'facebook'];
  const connectedAccounts = accounts || [];
  const connectedPlatforms = connectedAccounts.map(account => account.platform);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Social Accounts</h1>
        <p className="text-gray-600">Connect and manage your social media accounts</p>
      </div>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedAccounts.map((account) => (
              <SocialAccountCard
                key={account.id}
                account={account}
                onDisconnect={() => handleDisconnect(account.id, account.platform)}
                onRefresh={() => handleRefresh(account.id)}
                isDisconnecting={disconnectMutation.isPending}
                isRefreshing={refreshMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Available Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform as any);
            const isConnecting = connectingPlatform === platform;
            
            return (
              <Card key={platform} className={isConnected ? 'border-green-200 bg-green-50' : ''}>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3">{getPlatformIcon(platform)}</div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    {capitalizeFirst(platform)}
                  </h3>
                  {isConnected ? (
                    <div className="flex items-center justify-center text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Connected
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting}
                      size="sm"
                      className="w-full"
                    >
                      {isConnecting ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• <strong>YouTube:</strong> Requires a Google account with YouTube channel access</p>
            <p>• <strong>TikTok:</strong> Requires a TikTok Business account</p>
            <p>• <strong>Instagram:</strong> Requires a Facebook Business account linked to Instagram</p>
            <p>• <strong>Facebook:</strong> Requires a Facebook Page with publishing permissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SocialAccountCardProps {
  account: SocialAccount;
  onDisconnect: () => void;
  onRefresh: () => void;
  isDisconnecting: boolean;
  isRefreshing: boolean;
}

function SocialAccountCard({ 
  account, 
  onDisconnect, 
  onRefresh, 
  isDisconnecting, 
  isRefreshing 
}: SocialAccountCardProps) {
  const isExpiringSoon = account.expiresAt && 
    new Date(account.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return (
    <Card className="border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className="text-2xl mr-3">{getPlatformIcon(account.platform)}</div>
            <div>
              <h3 className="font-medium text-gray-900">
                {capitalizeFirst(account.platform)}
              </h3>
              <p className="text-sm text-gray-500">@{account.platformUsername}</p>
            </div>
          </div>
          <div className="flex items-center">
            {account.isActive ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Status and Expiry */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status:</span>
            <span className={account.isActive ? 'text-green-600' : 'text-red-600'}>
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {account.expiresAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Expires:</span>
              <span className={isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}>
                {formatDate(account.expiresAt)}
                {isExpiringSoon && (
                  <AlertCircle className="h-4 w-4 inline ml-1 text-orange-500" />
                )}
              </span>
            </div>
          )}
          
          <div className="text-xs text-gray-400">
            Connected {formatDate(account.createdAt)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex-1"
          >
            {isRefreshing ? (
              <>
                <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="flex-1"
          >
            {isDisconnecting ? (
              <>
                <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Removing
              </>
            ) : (
              <>
                <Trash2 className="h-3 w-3 mr-1" />
                Remove
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
