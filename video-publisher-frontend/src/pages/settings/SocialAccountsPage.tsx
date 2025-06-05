import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Twitter as TwitterIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const SocialAccountsPage: React.FC = () => {
  const { connectedAccounts, connectSocialAccount, disconnectSocialAccount, getConnectedAccounts } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  useEffect(() => {
    getConnectedAccounts();
  }, []);

  const handleConnect = async (provider: string) => {
    setSelectedProvider(provider);
    setOpenDialog(true);
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnectSocialAccount(accountId);
      await getConnectedAccounts();
    } catch (error) {
      console.error('Failed to disconnect account:', error);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'facebook':
        return <FacebookIcon />;
      case 'instagram':
        return <InstagramIcon />;
      case 'youtube':
        return <YouTubeIcon />;
      case 'twitter':
        return <TwitterIcon />;
      default:
        return null;
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
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Connected Social Accounts
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your connected social media accounts for video publishing.
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {['Facebook', 'Instagram', 'YouTube', 'Twitter'].map((provider) => (
            <Grid item xs={12} sm={6} md={3} key={provider}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        color: getProviderColor(provider),
                        mr: 1,
                      }}
                    >
                      {getProviderIcon(provider)}
                    </Box>
                    <Typography variant="h6">{provider}</Typography>
                  </Box>

                  {connectedAccounts
                    .filter((account) => account.provider.toLowerCase() === provider.toLowerCase())
                    .map((account) => (
                      <Box
                        key={account.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 1,
                          p: 1,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {account.profilePicture && (
                            <Box
                              component="img"
                              src={account.profilePicture}
                              alt={account.accountName}
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                mr: 1,
                              }}
                            />
                          )}
                          <Typography variant="body2">{account.accountName}</Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleDisconnect(account.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ))}

                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleConnect(provider)}
                    sx={{ mt: 2 }}
                  >
                    Connect {provider} Account
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Connect {selectedProvider} Account</DialogTitle>
        <DialogContent>
          <Typography>
            You will be redirected to {selectedProvider} to authorize access to your account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              // Implement OAuth flow here
              setOpenDialog(false);
            }}
          >
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SocialAccountsPage; 