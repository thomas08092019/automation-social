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
  });  const connectMutation = useMutation({
    mutationFn: (platform: string) => apiService.connectSocialAccount(platform),
    onSuccess: (data) => {
      if (data.success && data.authUrl) {
        // Open OAuth popup
        const popup = window.open(data.authUrl, '_blank', 'width=600,height=600,scrollbars=yes,resizable=yes');
        
        if (!popup) {
          alert('Popup blocked! Please allow popups for this site and try again.');
          setConnectingPlatform(null);
          return;
        }

        // Monitor popup for closure or completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setConnectingPlatform(null);
            // Refresh the accounts list
            queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
          }
        }, 1000);
      } else {
        // Handle error case
        if (data.error === 'OAUTH_CREDENTIALS_NOT_CONFIGURED') {
          alert(`OAuth Configuration Missing\n\n${data.message}\n\nPlease check your environment configuration and set up real OAuth credentials.`);
        } else {
          alert(`Failed to connect: ${data.message}`);
        }
        setConnectingPlatform(null);
      }
    },
    onError: (error: any) => {
      console.error('Failed to connect account:', error);
      
      // Check if this is an OAuth credentials configuration error
      if (error.response?.data?.error === 'OAUTH_CREDENTIALS_NOT_CONFIGURED') {
        alert(`OAuth Configuration Missing\n\n${error.response.data.message}\n\nPlease check your environment configuration and set up real OAuth credentials.`);
      } else {
        alert(`Failed to connect ${connectingPlatform || 'account'}: ${error.response?.data?.message || error.message}`);
      }
      
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
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading social accounts...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="error-state text-center p-8 rounded-xl">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-white" />
          <h3 className="text-xl font-semibold text-white mb-2">Unable to load accounts</h3>
          <p className="text-white/90 mb-4">Failed to load social accounts. Please try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-gradient px-6 py-2 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  const platforms = ['youtube', 'tiktok', 'instagram', 'facebook'];
  const connectedAccounts = accounts || [];
  const connectedPlatforms = connectedAccounts.map(account => account.platform);
  
  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Social Accounts
        </h1>
        <p className="text-gray-600 text-lg">Connect and manage your social media accounts</p>
      </div>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Connected Accounts ({connectedAccounts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      ) : (
        <div className="modern-card glass-effect p-8 text-center">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Social Accounts Connected</h3>
          <p className="text-gray-600 mb-6">Connect your social media accounts to start publishing content automatically</p>
          <div className="text-sm text-gray-500">
            Start by connecting to one of the platforms below
          </div>
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Available Platforms
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((platform) => {
            const isConnected = connectedPlatforms.includes(platform as any);
            const isConnecting = connectingPlatform === platform;
            
            return (
              <Card key={platform} className={`modern-card transition-all duration-300 hover:shadow-strong ${
                isConnected ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' : 'hover:border-purple-300'
              }`}>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl mb-3 animate-bounce-subtle">{getPlatformIcon(platform)}</div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {capitalizeFirst(platform)}
                  </h3>
                  {isConnected ? (
                    <div className="flex items-center justify-center text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Connected
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleConnect(platform)}
                      disabled={isConnecting}
                      size="sm"
                      className="w-full btn-gradient hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
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
      <Card className="modern-card glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <AlertCircle className="h-5 w-5 mr-2 text-blue-500" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📺</div>
              <div>
                <strong className="text-gray-900">YouTube:</strong> Requires a Google account with YouTube channel access
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">🎵</div>
              <div>
                <strong className="text-gray-900">TikTok:</strong> Requires a TikTok Business account
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📸</div>
              <div>
                <strong className="text-gray-900">Instagram:</strong> Requires a Facebook Business account linked to Instagram
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">👥</div>
              <div>
                <strong className="text-gray-900">Facebook:</strong> Requires a Facebook Page with publishing permissions
              </div>
            </div>
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
    <Card className="modern-card glass-effect hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="text-3xl mr-3 animate-bounce-subtle">{getPlatformIcon(account.platform)}</div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {capitalizeFirst(account.platform)}
              </h3>
              <p className="text-sm text-gray-500">@{account.platformUsername}</p>
            </div>
          </div>
          <div className="flex items-center">
            {account.isActive ? (
              <div className="bg-green-100 rounded-full p-1">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <div className="bg-red-100 rounded-full p-1">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            )}
          </div>
        </div>

        {/* Status and Expiry */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-600">Status:</span>
            <span className={`text-sm font-semibold px-2 py-1 rounded-full ${
              account.isActive 
                ? 'text-green-700 bg-green-100' 
                : 'text-red-700 bg-red-100'
            }`}>
              {account.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          {account.expiresAt && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-600">Expires:</span>
              <div className="flex items-center">
                <span className={`text-sm font-semibold ${
                  isExpiringSoon ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  {formatDate(account.expiresAt)}
                </span>
                {isExpiringSoon && (
                  <AlertCircle className="h-4 w-4 ml-1 text-orange-500" />
                )}
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-400 text-center">
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
            className="flex-1 hover:border-blue-300 hover:text-blue-600 transition-colors duration-200"
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
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200"
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
