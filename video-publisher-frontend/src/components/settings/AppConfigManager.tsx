import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Trash2, Plus, Edit, Settings, CheckCircle, XCircle } from 'lucide-react';
import { SocialPlatform } from '../../types/social-platform';
import type { SocialApp } from '../../types/social-app';
import { SocialAppsService } from '../../services/social-apps.service';

// Using the SocialApp type from types/social-app.ts

interface AppConfigManagerProps {
  userId: string;
}

export const AppConfigManager: React.FC<AppConfigManagerProps> = ({ userId: _ }) => {
  const [apps, setApps] = useState<SocialApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<SocialApp | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, any>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    platform: '' as SocialPlatform,
    appId: '',
    appSecret: '',
    redirectUri: '',
    isDefault: false,
  });

  useEffect(() => {
    fetchApps();
  }, []);
  const fetchApps = async () => {
    try {
      setLoading(true);
      const apps = await SocialAppsService.getUserApps();
      setApps(apps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };  const createApp = async () => {
    try {
      setError(null);
      
      // Validate app credentials first
      const validation = await SocialAppsService.validateAppCredentials({
        appId: formData.appId,
        appSecret: formData.appSecret,
        platform: formData.platform,
        redirectUri: formData.redirectUri,
      });

      if (!validation.isValid) {
        throw new Error(`Invalid app credentials: ${validation.errorMessage || 'Unknown validation error'}`);
      }

      // Create the app
      await SocialAppsService.createApp({
        name: formData.name,
        platform: formData.platform,
        appId: formData.appId,
        appSecret: formData.appSecret,
        redirectUri: formData.redirectUri,
        isDefault: formData.isDefault,
      });

      await fetchApps();
      setShowCreateDialog(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };  const updateApp = async () => {
    if (!editingApp) return;

    try {
      setError(null);
      
      await SocialAppsService.updateApp(editingApp.id, {
        name: formData.name,
        appId: formData.appId,
        appSecret: formData.appSecret,
        redirectUri: formData.redirectUri,
        isDefault: formData.isDefault,
      });

      await fetchApps();
      setShowEditDialog(false);
      setEditingApp(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };
  const deleteApp = async (appId: string) => {
    if (!confirm('Are you sure you want to delete this app configuration?')) {
      return;
    }

    try {
      setError(null);
      
      await SocialAppsService.deleteApp(appId);
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };  const checkAppHealth = async (appId: string) => {
    try {
      const result = await SocialAppsService.checkAppHealth(appId);
      setValidationResults(prev => ({
        ...prev,
        [appId]: result,
      }));
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };  const importSystemDefaults = async (platforms: SocialPlatform[]) => {
    try {
      setError(null);
      
      await SocialAppsService.importDefaultApps(platforms);
      await fetchApps();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      platform: '' as SocialPlatform,
      appId: '',
      appSecret: '',
      redirectUri: '',
      isDefault: false,
    });
  };

  const startEdit = (app: SocialApp) => {
    setEditingApp(app);
    setFormData({
      name: app.name,
      platform: app.platform,
      appId: app.appId,
      appSecret: '', // Don't pre-fill for security
      redirectUri: app.redirectUri,
      isDefault: app.isDefault,
    });
    setShowEditDialog(true);
  };  const getPlatformBadgeColor = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.YOUTUBE: return 'bg-red-100 text-red-800';
      case SocialPlatform.FACEBOOK: return 'bg-blue-100 text-blue-800';
      case SocialPlatform.INSTAGRAM: return 'bg-purple-100 text-purple-800';
      case SocialPlatform.TIKTOK: return 'bg-black text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading app configurations...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">App Configurations</h2>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => importSystemDefaults([SocialPlatform.FACEBOOK, SocialPlatform.YOUTUBE, SocialPlatform.TIKTOK])}
          >
            Import System Defaults
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add App
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Card key={app.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{app.name}</CardTitle>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => checkAppHealth(app.id)}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(app)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteApp(app.id)}
                    disabled={(app.connectedAccountsCount || 0) > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getPlatformBadgeColor(app.platform)}>
                  {app.platform.replace('_', ' ')}
                </Badge>
                
                {app.isDefault && (
                  <Badge variant="outline">Default</Badge>
                )}

                <div className="text-sm text-gray-600">
                  <p>App ID: {app.appId.substring(0, 20)}...</p>
                  <p>Connected Accounts: {app.connectedAccountsCount}</p>
                </div>

                {validationResults[app.id] && (
                  <div className="flex items-center space-x-1">
                    {validationResults[app.id].isHealthy ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm">
                      {validationResults[app.id].isHealthy ? 'Healthy' : 'Issues detected'}
                    </span>
                  </div>
                )}

                <div className="text-xs text-gray-400">
                  Created: {new Date(app.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create App Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New App Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">App Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., My Facebook App"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>              <Select 
                value={formData.platform} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value as SocialPlatform }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SocialPlatform.FACEBOOK}>Facebook</SelectItem>
                  <SelectItem value={SocialPlatform.INSTAGRAM}>Instagram</SelectItem>
                  <SelectItem value={SocialPlatform.YOUTUBE}>YouTube</SelectItem>
                  <SelectItem value={SocialPlatform.TIKTOK}>TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App ID / Client ID</label>
              <Input
                value={formData.appId}
                onChange={(e) => setFormData(prev => ({ ...prev, appId: e.target.value }))}
                placeholder="Your app's client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App Secret / Client Secret</label>
              <Input
                type="password"
                value={formData.appSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, appSecret: e.target.value }))}
                placeholder="Your app's client secret"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Redirect URI</label>
              <Input
                value={formData.redirectUri}
                onChange={(e) => setFormData(prev => ({ ...prev, redirectUri: e.target.value }))}
                placeholder="https://yourdomain.com/auth/callback"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              />
              <label htmlFor="isDefault" className="text-sm">
                Set as default app for this platform
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createApp}>
                Create App
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit App Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit App Configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Similar form fields as create, but for editing */}
            <div>
              <label className="block text-sm font-medium mb-1">App Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Platform</label>              <Select 
                value={formData.platform} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value as SocialPlatform }))}
                disabled
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SocialPlatform.FACEBOOK}>Facebook</SelectItem>
                  <SelectItem value={SocialPlatform.INSTAGRAM}>Instagram</SelectItem>
                  <SelectItem value={SocialPlatform.YOUTUBE}>YouTube</SelectItem>
                  <SelectItem value={SocialPlatform.TIKTOK}>TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App ID / Client ID</label>
              <Input
                value={formData.appId}
                onChange={(e) => setFormData(prev => ({ ...prev, appId: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">App Secret / Client Secret</label>
              <Input
                type="password"
                value={formData.appSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, appSecret: e.target.value }))}
                placeholder="Leave empty to keep current secret"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Redirect URI</label>
              <Input
                value={formData.redirectUri}
                onChange={(e) => setFormData(prev => ({ ...prev, redirectUri: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="editIsDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              />
              <label htmlFor="editIsDefault" className="text-sm">
                Set as default app for this platform
              </label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={updateApp}>
                Update App
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
