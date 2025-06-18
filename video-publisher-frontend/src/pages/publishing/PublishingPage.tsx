import React, { useState, useEffect } from 'react';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { multiPlatformApi, MultiPlatformPostData, ContentOptimizationData } from '../../services/multiPlatformApi';
import { SocialPlatform, SocialAccount } from '../../types';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { 
  YouTubeIcon, 
  FacebookIcon, 
  InstagramIcon, 
  TikTokIcon, 
  TwitterIcon 
} from '../../components/social/SocialIcons';
import '../../styles/dashboard.css';

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

export function PublishingPage() {
  const { socialAccounts, loading: accountsLoading } = useSocialAccounts();
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [content, setContent] = useState('');
  const [optimizedContent, setOptimizedContent] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Get active accounts grouped by platform
  const activeAccountsByPlatform = socialAccounts
    .filter((account: SocialAccount) => account.isActive)
    .reduce((acc, account) => {
      if (!acc[account.platform]) {
        acc[account.platform] = [];
      }
      acc[account.platform].push(account);
      return acc;
    }, {} as Record<SocialPlatform, SocialAccount[]>);

  const availablePlatforms = Object.keys(activeAccountsByPlatform) as SocialPlatform[];

  const handlePlatformToggle = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };  const handleOptimizeContent = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      setError('Please enter content and select at least one platform');
      return;
    }

    try {
      setIsOptimizing(true);
      setError(null);

      const result = await multiPlatformApi.optimizeContent({
        platforms: selectedPlatforms,
        content: { text: content },
        preferences: {
          preserveHashtags: true,
          maxHashtags: 5,
          tone: 'professional',
          includeEmojis: false
        }
      });

      if (result.success) {
        setOptimizedContent(result);
      } else {
        setError('Failed to optimize content');
      }
    } catch (err) {
      console.error('Failed to optimize content:', err);
      setError(err instanceof Error ? err.message : 'Failed to optimize content');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handlePublish = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      setError('Please enter content and select at least one platform');
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);

      const publishRequest: MultiPlatformPostData = {
        platforms: selectedPlatforms,
        content: { text: content },
        options: {
          skipValidation: false,
          continueOnError: true,
          optimizeContent: true
        },
        preferences: {
          preserveHashtags: true,
          maxHashtags: 5,
          tone: 'professional',
          includeEmojis: false
        }
      };

      const result = await multiPlatformApi.createMultiPlatformPost(publishRequest);
      setPublishResult(result);

    } catch (err) {
      console.error('Failed to publish:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish content');
    } finally {
      setIsPublishing(false);
    }
  };

  if (accountsLoading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <Loading size="large" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Multi-Platform Publishing</h1>
          <p className="page-description">
            Create and publish content across multiple social media platforms
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="page-content">
        {availablePlatforms.length === 0 ? (
          <Card className="empty-state">
            <div className="empty-content">
              <p>No active social accounts found. Please connect and activate your accounts first.</p>
              <a href="/social-accounts" className="btn btn-primary">
                Manage Accounts
              </a>
            </div>
          </Card>
        ) : (
          <div className="publishing-form">
            {/* Platform Selection */}
            <Card className="platform-selection">
              <h3>Select Platforms</h3>
              <div className="platforms-grid">
                {availablePlatforms.map(platform => {
                  const IconComponent = PLATFORM_ICONS[platform];
                  const color = PLATFORM_COLORS[platform];
                  const isSelected = selectedPlatforms.includes(platform);
                  
                  return (
                    <div
                      key={platform}
                      className={`platform-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => handlePlatformToggle(platform)}
                    >
                      <div className="platform-icon" style={{ color }}>
                        {IconComponent && <IconComponent />}
                      </div>
                      <div className="platform-name">{platform}</div>
                      <div className="platform-accounts">
                        {activeAccountsByPlatform[platform].length} account(s)
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Content Input */}
            <Card className="content-input">
              <h3>Content</h3>
              <textarea
                className="content-textarea"
                placeholder="Enter your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              <div className="content-actions">
                <Button
                  onClick={handleOptimizeContent}
                  disabled={!content.trim() || selectedPlatforms.length === 0 || isOptimizing}
                  variant="secondary"
                >
                  {isOptimizing ? 'Optimizing...' : 'Preview Optimized'}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={!content.trim() || selectedPlatforms.length === 0 || isPublishing}
                  variant="primary"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Now'}
                </Button>
              </div>
            </Card>

            {/* Error Display */}
            {error && (
              <Card className="error-card">
                <div className="error-content">
                  <h4>Error</h4>
                  <p>{error}</p>
                </div>
              </Card>
            )}

            {/* Optimized Content Preview */}
            {optimizedContent && (
              <Card className="optimized-preview">
                <h3>Optimized Content Preview</h3>
                <div className="optimization-results">
                  {Object.entries(optimizedContent.optimizedContent || {}).map(([platform, optimized]: [string, any]) => {
                    const IconComponent = PLATFORM_ICONS[platform as SocialPlatform];
                    const color = PLATFORM_COLORS[platform as SocialPlatform];
                    
                    return (
                      <div key={platform} className="platform-preview">
                        <div className="platform-header">
                          <div className="platform-icon" style={{ color }}>
                            {IconComponent && <IconComponent />}
                          </div>
                          <span className="platform-name">{platform}</span>
                        </div>
                        <div className="optimized-text">
                          {optimized.text || optimized}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Publish Results */}
            {publishResult && (
              <Card className="publish-results">
                <h3>Publishing Results</h3>
                <div className="results-summary">
                  <div className={`result-status ${publishResult.success ? 'success' : 'partial'}`}>
                    {publishResult.success ? 'All posts published successfully!' : 'Some posts failed to publish'}
                  </div>
                  {publishResult.summary && (
                    <div className="result-details">
                      <div>Total: {publishResult.summary.total}</div>
                      <div>Successful: {publishResult.summary.successful}</div>
                      <div>Failed: {publishResult.summary.failed}</div>
                    </div>
                  )}
                </div>
                {publishResult.results && (
                  <div className="detailed-results">
                    {publishResult.results.map((result: any, index: number) => (
                      <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                        <div className="result-platform">{result.platform}</div>
                        <div className="result-message">{result.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
