import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { multiPlatformApi } from '../../services/multiPlatformApi';
import { SocialPlatform, SocialAccount } from '../../types';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { 
  YouTubeIcon, 
  FacebookIcon, 
  InstagramIcon, 
  TikTokIcon, 
  TwitterIcon 
} from '../../components/social/SocialIcons';
import '../../styles/dashboard.css';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalPosts: number;
  lastWeekPosts: number;
}

interface PlatformCapabilities {
  [key: string]: {
    supportsText: boolean;
    supportsImages: boolean;
    supportsVideos: boolean;
    supportsScheduling: boolean;
    supportsHashtags: boolean;
    maxTextLength?: number;
    maxImageSize?: number;
    maxVideoSize?: number;
    supportedFormats?: string[];
  };
}

const PLATFORM_ICONS: Partial<Record<SocialPlatform, React.ComponentType<any>>> = {
  [SocialPlatform.YOUTUBE]: YouTubeIcon,
  [SocialPlatform.FACEBOOK]: FacebookIcon,
  [SocialPlatform.INSTAGRAM]: InstagramIcon,
  [SocialPlatform.TIKTOK]: TikTokIcon,
  [SocialPlatform.X]: TwitterIcon,
};

const PLATFORM_COLORS: Partial<Record<SocialPlatform, string>> = {
  [SocialPlatform.YOUTUBE]: '#ff0000',
  [SocialPlatform.FACEBOOK]: '#1877f2',
  [SocialPlatform.INSTAGRAM]: '#e4405f',
  [SocialPlatform.TIKTOK]: '#000000',
  [SocialPlatform.X]: '#1da1f2',
};

export function DashboardPage() {
  const { user } = useAuth();
  const { socialAccounts, loading: accountsLoading } = useSocialAccounts();
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalPosts: 0,
    lastWeekPosts: 0,
  });
  const [capabilities, setCapabilities] = useState<PlatformCapabilities>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load platform capabilities
        const capabilitiesResponse = await multiPlatformApi.getPlatformCapabilities();
        if (capabilitiesResponse.success) {
          setCapabilities(capabilitiesResponse.capabilities);
        }        // Calculate stats from social accounts
        if (socialAccounts.length > 0) {
          const activeAccounts = socialAccounts.filter((account: SocialAccount) => account.isActive).length;
          setStats({
            totalAccounts: socialAccounts.length,
            activeAccounts,
            totalPosts: 0, // TODO: Add posts tracking
            lastWeekPosts: 0, // TODO: Add posts tracking
          });
        }

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (!accountsLoading) {
      loadDashboardData();
    }
  }, [socialAccounts, accountsLoading]);

  if (loading || accountsLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <Loading size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="page-content">
          <div className="error-message">
            <p>Error loading dashboard: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Dashboard</h1>          <p className="page-description">
            Welcome back, {user?.username || user?.email}! Here's your publishing overview.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        {/* Stats Cards */}
        <div className="dashboard-stats">
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.totalAccounts}</div>
              <div className="stat-label">Total Accounts</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.activeAccounts}</div>
              <div className="stat-label">Active Accounts</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.totalPosts}</div>
              <div className="stat-label">Total Posts</div>
            </div>
          </Card>
          <Card className="stat-card">
            <div className="stat-content">
              <div className="stat-number">{stats.lastWeekPosts}</div>
              <div className="stat-label">This Week</div>
            </div>
          </Card>
        </div>

        {/* Connected Accounts */}
        <div className="dashboard-section">
          <h2 className="section-title">Connected Accounts</h2>
          {socialAccounts.length > 0 ? (            <div className="accounts-grid">
              {socialAccounts.map((account: SocialAccount) => {
                const IconComponent = PLATFORM_ICONS[account.platform];
                const color = PLATFORM_COLORS[account.platform];
                
                return (
                  <Card key={account.id} className="account-card">
                    <div className="account-header">
                      <div className="account-icon" style={{ color }}>
                        {IconComponent && <IconComponent />}
                      </div>
                      <div className="account-info">
                        <div className="account-name">{account.accountName}</div>
                        <div className="account-platform">{account.platform}</div>
                      </div>
                      <div className={`account-status ${account.isActive ? 'active' : 'inactive'}`}>
                        {account.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="empty-state">
              <div className="empty-content">
                <p>No social accounts connected yet.</p>
                <a href="/social-accounts" className="btn btn-primary">
                  Connect Account
                </a>
              </div>
            </Card>
          )}
        </div>

        {/* Platform Capabilities */}
        <div className="dashboard-section">
          <h2 className="section-title">Platform Capabilities</h2>          <div className="capabilities-grid">
            {Object.entries(capabilities).map(([platform, caps]) => {
              const IconComponent = PLATFORM_ICONS[platform as SocialPlatform];
              const color = PLATFORM_COLORS[platform as SocialPlatform];
              
              return (
                <Card key={platform} className="capability-card">
                  <div className="capability-header">
                    <div className="capability-icon" style={{ color }}>
                      {IconComponent && <IconComponent />}
                    </div>
                    <h3 className="capability-name">{platform}</h3>
                  </div>
                  <div className="capability-features">
                    <div className={`feature ${caps.supportsText ? 'supported' : 'not-supported'}`}>
                      Text Posts
                    </div>
                    <div className={`feature ${caps.supportsImages ? 'supported' : 'not-supported'}`}>
                      Images
                    </div>
                    <div className={`feature ${caps.supportsVideos ? 'supported' : 'not-supported'}`}>
                      Videos
                    </div>
                    <div className={`feature ${caps.supportsScheduling ? 'supported' : 'not-supported'}`}>
                      Scheduling
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
