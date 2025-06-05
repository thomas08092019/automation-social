import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';
import { Button, Card, CardContent } from '../../components/ui';
import { Plus, Facebook, Instagram, Youtube, Twitter } from 'lucide-react';
import { SocialAccount } from '../../types';

export function SocialAccountsPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchConnectedAccounts();
    }
  }, [user]);

  const fetchConnectedAccounts = async () => {
    try {
      const accounts = await apiService.getSocialAccounts();
      setConnectedAccounts(accounts);
    } catch (error) {
      console.error('Failed to fetch social accounts:', error);
    }
  };

  const handleConnect = async (provider: string) => {
    // Handle social account connection
    console.log(`Connecting ${provider}`);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-6 w-6" />;
      case 'instagram':
        return <Instagram className="h-6 w-6" />;
      case 'youtube':
        return <Youtube className="h-6 w-6" />;
      case 'twitter':
        return <Twitter className="h-6 w-6" />;
      default:
        return <Plus className="h-6 w-6" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'facebook':
        return '#1877F2';
      case 'instagram':
        return '#E4405F';
      case 'youtube':
        return '#FF0000';
      case 'twitter':
        return '#1DA1F2';
      default:
        return '#000000';
    }
  };

  return (
    <div className="container mx-auto max-w-6xl">
      <div className="mt-8 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Connected Social Accounts
        </h1>
        <p className="text-gray-600">
          Manage your connected social media accounts for video publishing.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          {['Facebook', 'Instagram', 'YouTube', 'Twitter'].map((provider) => (
            <div key={provider}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4" style={{ color: getProviderColor(provider) }}>
                    {getProviderIcon(provider)}
                    <span className="ml-2 font-medium">{provider}</span>
                  </div>
                  
                  {connectedAccounts.find(account => 
                    account.platform.toLowerCase() === provider.toLowerCase()
                  ) ? (
                    <div className="space-y-2">
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="flex items-center">
                          <img
                            src="/default-profile.png"
                            alt="Profile"
                            className="w-8 h-8 rounded-full mr-2"
                          />
                          <div>
                            <div className="font-medium text-sm">Connected</div>
                            <div className="text-xs text-gray-500">Active</div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {/* Handle disconnect */}}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleConnect(provider)}
                    >
                      Connect {provider} Account
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Connection Dialog */}
      {openDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Connect Social Account</h2>
            <p className="text-gray-600 mb-6">
              Click connect to authorize access to your social media account.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setOpenDialog(false)}>
                Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}