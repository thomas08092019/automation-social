import React, { useState, useEffect, useCallback } from 'react';
import { 
  SocialPlatform, 
  AccountType, 
  SocialAccount,
  PlatformButtonConfig 
} from '../../types/social';
import { socialAccountsApi, SocialAccountsQuery, SocialAccountsApiResponse } from '../../services/socialAccountsApi';
import { useNotifications } from '../../utils/notifications';
import { DataTableControls } from '../../components/ui/DataTableControls';
import { Pagination } from '../../components/ui/Pagination';
import { MetadataModal } from '../../components/ui/MetadataModal';
import { 
  YouTubeIcon, 
  FacebookIcon,   InstagramIcon, 
  TikTokIcon, 
  TwitterIcon as XIcon,
  RefreshIcon,
  DeleteIcon,
  SearchIcon
} from '../../components/social/SocialIcons';
import { Avatar } from '../../components/ui/Avatar';
import '../../styles/social.css';

const PLATFORM_CONFIGS: PlatformButtonConfig[] = [
  {
    platform: SocialPlatform.YOUTUBE,
    name: 'YouTube',
    icon: <YouTubeIcon className="platform-icon youtube-icon" />,
    color: '#ff0000',
    hoverColor: '#ff0000'
  },
  {
    platform: SocialPlatform.FACEBOOK,
    name: 'Facebook', 
    icon: <FacebookIcon className="platform-icon facebook-icon" />,
    color: '#1877f2',
    hoverColor: '#1877f2'
  },
  {
    platform: SocialPlatform.INSTAGRAM,
    name: 'Instagram',
    icon: <InstagramIcon className="platform-icon instagram-icon" />,
    color: '#e4405f',
    hoverColor: '#e4405f'
  },  {
    platform: SocialPlatform.TIKTOK,
    name: 'TikTok',
    icon: <TikTokIcon className="platform-icon tiktok-icon" />,
    color: '#000000',
    hoverColor: '#000000'
  },
  {
    platform: SocialPlatform.X,
    name: 'X (Twitter)',
    icon: <XIcon className="platform-icon x-icon" />,
    color: '#000000',
    hoverColor: '#000000'
  },
  {
    platform: SocialPlatform.ZALO,
    name: 'Zalo',
    icon: <div className="platform-icon">Z</div>,
    color: '#0068ff',
    hoverColor: '#0068ff'
  },
  {
    platform: SocialPlatform.TELEGRAM,
    name: 'Telegram',
    icon: <div className="platform-icon">T</div>,
    color: '#0088cc',
    hoverColor: '#0088cc'
  }
];

const ITEMS_PER_PAGE = 10;

export function SocialAccountsPage() {  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | ''>('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'expired' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
  });
  
  // Multi-select state
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Metadata modal state
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [selectedAccountMetadata, setSelectedAccountMetadata] = useState<{
    title: string;
    metadata: any;
  } | null>(null);
  
  const { confirm, alert, toast } = useNotifications();
  // Reset function to clear all filters and go back to page 1
  const handleReset = useCallback(() => {
    setSearchTerm('');
    setPlatformFilter('');
    setAccountTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  }, []);

  // Multi-select handlers
  const handleSelectAccount = useCallback((accountId: string, checked: boolean) => {
    setSelectedAccountIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(accountId);
      } else {
        newSet.delete(accountId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(accounts.map(account => account.id));
      setSelectedAccountIds(allIds);
      setIsAllSelected(true);
    } else {
      setSelectedAccountIds(new Set());
      setIsAllSelected(false);
    }
  }, [accounts]);

  // Update isAllSelected when selectedAccountIds changes
  useEffect(() => {
    const allAccountIds = accounts.map(account => account.id);
    const allSelected = allAccountIds.length > 0 && allAccountIds.every(id => selectedAccountIds.has(id));
    setIsAllSelected(allSelected);
  }, [selectedAccountIds, accounts]);

  // Clear selection when accounts change (e.g., after delete/filter)
  useEffect(() => {
    setSelectedAccountIds(new Set());
    setIsAllSelected(false);
  }, [accounts]);

  // Load accounts on component mount and when filters change
  useEffect(() => {
    loadAccounts();
  }, [currentPage, searchTerm, platformFilter, accountTypeFilter, statusFilter]);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
        const query: SocialAccountsQuery = {
        page: currentPage,
        limit: 10,
        sortBy: 'accountName',
        sortOrder: 'desc',
      };

      if (searchTerm) query.search = searchTerm;
      if (platformFilter) query.platform = platformFilter;
      if (accountTypeFilter) query.accountType = accountTypeFilter;
      if (statusFilter) query.status = statusFilter;

      const response = await socialAccountsApi.getAllAccounts(query);
      console.log('Loaded accounts:', response); // Debug log
      
      setAccounts(response.data);
      setPagination({
        total: response.total,
        totalPages: response.totalPages,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage,
        limit: response.limit,
      });    } catch (error) {
      console.error('Failed to load social accounts:', error);
      setAccounts([]);
      setPagination({
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
      });
      toast.error('Error', 'Failed to load social accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, platformFilter, accountTypeFilter, statusFilter]);
  const handleConnectPlatform = async (platform: SocialPlatform) => {
    try {
      const response = await socialAccountsApi.connectPlatform(platform.toLowerCase());
      
      if (response.success && response.data?.authUrl) {
        // Show connecting status
        toast.info('Connecting...', `Opening ${platform} OAuth window`);
        
        // Open OAuth popup window
        const popup = window.open(
          response.data.authUrl, 
          `${platform.toLowerCase()}-oauth`, 
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          toast.error('Popup Blocked', 'Please allow popups for this site and try again.');
          return;
        }

        // Initialize cleanup variables
        let checkClosed: NodeJS.Timeout;
        let timeoutId: NodeJS.Timeout;

        // Listen for OAuth completion message from popup
        const messageHandler = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
            if (event.data.type === 'oauth-success') {
            cleanup();
            toast.success('Connected!', `Successfully connected ${platform} account`);
            
            // Add delay to ensure backend transaction is committed before reloading
            // This fixes the issue where TikTok metadata doesn't appear on first connection
            setTimeout(async () => {
              await loadAccounts(); // Reload accounts after successful connection
            }, 1000); // 1 second delay to ensure database consistency
            
          } else if (event.data.type === 'oauth-error') {
            cleanup();
            toast.error('Connection Failed', `OAuth failed: ${event.data.error}`);
          }
        };

        // Cleanup function
        const cleanup = () => {
          if (checkClosed) clearInterval(checkClosed);
          if (timeoutId) clearTimeout(timeoutId);
          window.removeEventListener('message', messageHandler);
        };

        // Start cleanup processes
        window.addEventListener('message', messageHandler);
        
        // Check if popup was closed manually
        checkClosed = setInterval(() => {
          if (popup.closed) {
            cleanup();
            toast.info('Cancelled', 'OAuth connection was cancelled');
          }
        }, 1000);

        // Timeout after 5 minutes
        timeoutId = setTimeout(() => {
          cleanup();
          popup.close();
          toast.error('Timeout', 'OAuth connection timeout. Please try again.');
        }, 300000);

      } else {
        console.error('Failed to get auth URL:', response.message);
        toast.error('Connection Failed', response.message || 'Failed to connect to platform');
      }
    } catch (error) {
      console.error('Failed to connect platform:', error);
      toast.error('Connection Error', 'An error occurred while connecting to the platform');
    }
  };  const handleRefreshAccount = async (accountId: string) => {
    try {
      toast.info('Refresh Started', 'Account refresh is in progress...');
      
      await socialAccountsApi.refreshAccount(accountId);
      
      // Reload accounts to show updated data
      await loadAccounts();
      
      toast.success('Refresh Complete', 'Account has been refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh the account';
      toast.error('Refresh Failed', errorMessage);
    }
  };  const handleDeleteAccount = async (accountId: string) => {
    const confirmed = await confirm(
      'Delete Account', 
      'Are you sure you want to remove this social account? This action cannot be undone.',
      'danger'
    );
    
    if (!confirmed) {
      return;
    }

    try {
      await socialAccountsApi.deleteAccount(accountId);
      await loadAccounts(); // Reload accounts after deletion
      toast.success('Account Deleted', 'The social account has been successfully removed');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Delete Failed', 'Failed to delete the account. Please try again.');
    }
  };

  // Bulk actions
  const handleBulkRefresh = async () => {
    if (selectedAccountIds.size === 0) {
      toast.error('No Selection', 'Please select accounts to refresh');
      return;
    }    const confirmed = await confirm(
      'Refresh Accounts',
      `Are you sure you want to refresh ${selectedAccountIds.size} selected account(s)?`,
      'default'
    );

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const accountIds = Array.from(selectedAccountIds);
      const result = await socialAccountsApi.refreshAccounts(accountIds);
      
      await loadAccounts(); // Reload accounts to show updated data
      
      if (result.successCount === accountIds.length) {
        toast.success('Refresh Complete', `Successfully refreshed all ${result.successCount} accounts`);
      } else {
        toast.info('Partial Success', `Refreshed ${result.successCount} out of ${accountIds.length} accounts. ${result.failureCount} failed.`);
      }
      
      // Clear selection after successful operation
      setSelectedAccountIds(new Set());
    } catch (error) {
      console.error('Failed to refresh accounts:', error);
      toast.error('Bulk Refresh Failed', 'Failed to refresh the selected accounts');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAccountIds.size === 0) {
      toast.error('No Selection', 'Please select accounts to delete');
      return;
    }

    const confirmed = await confirm(
      'Delete Accounts',
      `Are you sure you want to delete ${selectedAccountIds.size} selected account(s)? This action cannot be undone.`,
      'danger'
    );

    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      const accountIds = Array.from(selectedAccountIds);
      const result = await socialAccountsApi.deleteAccounts(accountIds);
      
      await loadAccounts(); // Reload accounts after deletion
      
      if (result.deletedCount === accountIds.length) {
        toast.success('Delete Complete', `Successfully deleted all ${result.deletedCount} accounts`);
      } else {
        toast.info('Partial Success', `Deleted ${result.deletedCount} out of ${accountIds.length} accounts. Some may have failed.`);
      }
      
      // Clear selection after successful operation
      setSelectedAccountIds(new Set());
    } catch (error) {
      console.error('Failed to delete accounts:', error);
      toast.error('Bulk Delete Failed', 'Failed to delete the selected accounts');
    } finally {
      setBulkActionLoading(false);
    }
  };const handleViewMetadata = (account: SocialAccount) => {
    setSelectedAccountMetadata({
      title: `Metadata for ${account.accountName}`,
      metadata: account.metadata
    });
    setIsMetadataModalOpen(true);
  };
  // Pagination logic
  const showingStart = accounts.length > 0 ? ((currentPage - 1) * pagination.limit) + 1 : 0;
  const showingEnd = Math.min(currentPage * pagination.limit, pagination.total);
  const getPlatformBadgeClass = (platform: SocialPlatform) => {
    const baseClass = 'platform-badge';
    switch (platform) {
      case SocialPlatform.FACEBOOK: return `${baseClass} facebook-badge`;
      case SocialPlatform.INSTAGRAM: return `${baseClass} instagram-badge`;
      case SocialPlatform.YOUTUBE: return `${baseClass} youtube-badge`;
      case SocialPlatform.TIKTOK: return `${baseClass} tiktok-badge`;
      case SocialPlatform.X: return `${baseClass} x-badge`;
      case SocialPlatform.ZALO: return `${baseClass} zalo-badge`;
      case SocialPlatform.TELEGRAM: return `${baseClass} telegram-badge`;
      default: return baseClass;
    }
  };

  const getAccountTypeBadgeClass = (accountType: AccountType) => {
    const baseClass = 'account-type-badge';
    switch (accountType) {
      case AccountType.PAGE: return `${baseClass} page-badge`;
      case AccountType.CREATOR: return `${baseClass} creator-badge`;
      case AccountType.BUSINESS: return `${baseClass} business-badge`;
      case AccountType.PROFILE: return `${baseClass} profile-badge`;
      case AccountType.GROUP: return `${baseClass} group-badge`;
      default: return baseClass;
    }
  };

  const getStatusBadgeClass = (account: SocialAccount) => {
    const baseClass = 'status-badge';
    if (!account.isActive) return `${baseClass} inactive-status`;
    
    if (account.expiresAt) {
      const expiryDate = new Date(account.expiresAt);
      const now = new Date();
      if (expiryDate <= now) return `${baseClass} expired-status`;
    }
    
    return `${baseClass} active-status`;
  };

  const getStatusText = (account: SocialAccount) => {
    if (!account.isActive) return 'Inactive';
    
    if (account.expiresAt) {
      const expiryDate = new Date(account.expiresAt);
      const now = new Date();
      if (expiryDate <= now) return 'Expired';
    }
    
    return 'Active';
  };
  const getPlatformIcon = (platform: SocialPlatform) => {
    switch (platform) {
      case SocialPlatform.FACEBOOK: return <FacebookIcon />;
      case SocialPlatform.INSTAGRAM: return <InstagramIcon />;
      case SocialPlatform.YOUTUBE: return <YouTubeIcon />;
      case SocialPlatform.TIKTOK: return <TikTokIcon />;
      case SocialPlatform.X: return <XIcon />;
      case SocialPlatform.ZALO: return <div className="platform-icon">Z</div>;
      case SocialPlatform.TELEGRAM: return <div className="platform-icon">T</div>;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="social-accounts-page">
      {/* Platform Connection Buttons */}
      <div className="dashboard-card">
        <h3 className="card-title">Connect Social Platforms</h3>
        <p className="card-description">Connect your social media accounts to start publishing content.</p>
        
        <div className="platform-buttons">
          {PLATFORM_CONFIGS.map((config) => (
            <button
              key={config.platform}
              className="platform-btn"
              data-platform={config.platform.toLowerCase()}
              onClick={() => handleConnectPlatform(config.platform)}
            >
              <div className="platform-icon">
                {config.icon}
              </div>
              <span>{config.name}</span>
            </button>
          ))}
        </div>
      </div>      {/* Search and Filter Section */}
      <DataTableControls
        searchPlaceholder="Search account name..."
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1); // Reset to first page when searching
        }}
        onReset={handleReset}
        isLoading={loading}
        filters={[
          {
            key: 'platform',
            label: 'All Platforms',
            value: platformFilter,            options: [
              { value: SocialPlatform.FACEBOOK, label: 'Facebook' },
              { value: SocialPlatform.INSTAGRAM, label: 'Instagram' },
              { value: SocialPlatform.TIKTOK, label: 'TikTok' },
              { value: SocialPlatform.YOUTUBE, label: 'YouTube' },
              { value: SocialPlatform.X, label: 'X (Twitter)' },
              { value: SocialPlatform.ZALO, label: 'Zalo' },
              { value: SocialPlatform.TELEGRAM, label: 'Telegram' },
            ],onChange: (value) => {
              setPlatformFilter(value as SocialPlatform | '');
              setCurrentPage(1); // Reset to first page when filtering
            }
          },
          {
            key: 'accountType',
            label: 'All Types',
            value: accountTypeFilter,
            options: [
              { value: AccountType.PAGE, label: 'Page' },
              { value: AccountType.GROUP, label: 'Group' },
              { value: AccountType.PROFILE, label: 'Profile' },
              { value: AccountType.BUSINESS, label: 'Business' },
              { value: AccountType.CREATOR, label: 'Creator' },
            ],
            onChange: (value) => {
              setAccountTypeFilter(value as AccountType | '');
              setCurrentPage(1); // Reset to first page when filtering
            }
          },
          {
            key: 'status',
            label: 'All Status',
            value: statusFilter,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'expired', label: 'Expired' },
            ],
            onChange: (value) => {
              setStatusFilter(value as 'active' | 'inactive' | 'expired' | '');
              setCurrentPage(1); // Reset to first page when filtering
            }
          }
        ]}
      />      {/* Social Accounts Table */}
      <div className="dashboard-card">
        <div className="table-header">
          <h3 className="card-title">Connected Social Accounts</h3>
          <div className="table-header-actions">
            {/* Bulk Actions */}
            {selectedAccountIds.size > 0 && (
              <div className="bulk-actions">
                <span className="bulk-selection-count">
                  {selectedAccountIds.size} selected
                </span>
                <button
                  className="bulk-action-btn refresh-btn"
                  onClick={handleBulkRefresh}
                  disabled={bulkActionLoading}
                  title="Refresh Selected Accounts"
                >
                  <RefreshIcon className={bulkActionLoading ? 'rotating' : ''} />
                  Refresh
                </button>
                <button
                  className="bulk-action-btn delete-btn"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  title="Delete Selected Accounts"
                >
                  <DeleteIcon />
                  Delete
                </button>
              </div>
            )}
            <button
              className="table-refresh-btn"
              onClick={loadAccounts}
              disabled={loading}
              title="Refresh Data"
            >
              <RefreshIcon className={loading ? 'rotating' : ''} />
            </button>
          </div>
        </div>
        
        <div className="table-container">
          <table className="social-accounts-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    disabled={accounts.length === 0}
                    className="select-all-checkbox"
                  />
                </th>
                <th>Platform</th>
                <th>Type</th>
                <th>Account Name</th>
                <th>Account ID</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Metadata</th>
                <th>Actions</th>
              </tr>
            </thead>            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                    Loading accounts...
                  </td>
                </tr>              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                    {pagination.total === 0
                      ? 'No social accounts connected yet. Connect your first platform above!'
                      : 'No accounts match your search criteria.'
                    }
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} data-account-id={account.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedAccountIds.has(account.id)}
                        onChange={(e) => handleSelectAccount(account.id, e.target.checked)}
                        className="account-select-checkbox"
                      />
                    </td>
                    <td>
                      <div className={getPlatformBadgeClass(account.platform)}>
                        {getPlatformIcon(account.platform)}
                        {account.platform.charAt(0) + account.platform.slice(1).toLowerCase()}
                      </div>
                    </td>
                    <td>
                      <span className={getAccountTypeBadgeClass(account.accountType)}>
                        {account.accountType}
                      </span>
                    </td>
                    <td>
                      <div className="account-name-with-avatar">
                        <Avatar
                          src={account.profilePicture}
                          alt={account.accountName}
                          size="small"
                          fallbackText={account.accountName}
                        />
                        <span className="account-name-text">{account.accountName}</span>
                      </div>
                    </td>
                    <td>{account.accountId}</td>
                    <td>
                      <span className={getStatusBadgeClass(account)}>
                        {getStatusText(account)}
                      </span>
                    </td>
                    <td>{account.expiresAt ? formatDate(account.expiresAt) : '-'}</td>
                    <td>
                      <button 
                        className="view-metadata-btn"
                        onClick={() => handleViewMetadata(account)}
                      >
                        View
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn refresh-btn"
                          title="Refresh Token"
                          onClick={() => handleRefreshAccount(account.id)}
                        >
                          <RefreshIcon />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          title="Remove Account"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
          onPageChange={setCurrentPage}
          isLoading={loading}
        />
      </div>

      {/* Metadata Modal */}
      <MetadataModal
        isOpen={isMetadataModalOpen}
        onClose={() => setIsMetadataModalOpen(false)}
        title={selectedAccountMetadata?.title || ''}
        metadata={selectedAccountMetadata?.metadata || {}}
      />
    </div>
  );
}
