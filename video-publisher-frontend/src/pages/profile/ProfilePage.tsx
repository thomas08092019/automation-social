import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../config';
import apiService from '../../services/api';
import { showNotification } from '../../utils/notification';
import '../../styles/profile.css';

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Profile update form state
  const [username, setUsername] = useState(user?.username || '');
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || '');  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropSettings, setCropSettings] = useState({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    scale: 1,
    rotate: 0
  });

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Forgot password form state
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  // Handle profile picture change
  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Show crop modal instead of immediate upload
      setSelectedFile(file);
      setShowCropModal(true);
    }
  };

  // Handle crop and upload
  const handleCropAndUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploadingAvatar(true);
    setShowCropModal(false);
    
    try {
      // Create canvas to crop image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = cropSettings.width;
        canvas.height = cropSettings.height;
        
        if (ctx) {
          // Apply transformations
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((cropSettings.rotate * Math.PI) / 180);
          ctx.scale(cropSettings.scale, cropSettings.scale);
          
          // Draw cropped image
          ctx.drawImage(
            img,
            cropSettings.x,
            cropSettings.y,
            cropSettings.width,
            cropSettings.height,
            -cropSettings.width / 2,
            -cropSettings.height / 2,
            cropSettings.width,
            cropSettings.height
          );
          ctx.restore();
          
          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              const croppedFile = new File([blob], selectedFile.name, {
                type: selectedFile.type,
                lastModified: Date.now(),
              });
              
              try {
                // Upload cropped avatar to backend
                const uploadResult = await apiService.uploadAvatar(croppedFile);
                
                // Update profile picture URL with the uploaded avatar
                setProfilePicture(uploadResult.profilePicture);
                
                // Auto-update profile with new avatar
                await apiService.updateProfile({ profilePicture: uploadResult.profilePicture });
                await refreshProfile();
                
                showNotification('Avatar uploaded successfully', 'success');
              } catch (error: any) {
                console.error('Avatar upload failed:', error);
                showNotification(error.response?.data?.message || 'Failed to upload avatar', 'error');
                setProfilePicture(user?.profilePicture || '');
              } finally {
                setIsUploadingAvatar(false);
                setSelectedFile(null);
              }
            }
          }, selectedFile.type, 0.9);
        }
      };
      
      // Load image for cropping
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(selectedFile);
      
    } catch (error: any) {
      console.error('Avatar processing failed:', error);
      showNotification('Failed to process avatar', 'error');
      setIsUploadingAvatar(false);
      setShowCropModal(false);
      setSelectedFile(null);
    }
  };
  // Handle profile picture URL paste
  const handleProfilePictureUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setProfilePictureUrl(url);
    // Don't auto-set profilePicture here - let user save it manually
  };
  // Handle profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);

    try {
      const updates: any = {};
      
      if (username.trim() && username !== user?.username) {
        updates.username = username.trim();
      }
        // Only update profile picture if URL is provided and different from current
      if (profilePictureUrl && profilePictureUrl.trim() && profilePictureUrl !== user?.profilePicture) {
        updates.profilePicture = profilePictureUrl.trim();
      }

      if (Object.keys(updates).length === 0) {
        showNotification('No changes to save', 'info');
        return;
      }

      await apiService.updateProfile(updates);
      await refreshProfile();
      
      // Update local state with new profile picture if it was from URL
      if (updates.profilePicture) {
        setProfilePicture(updates.profilePicture);
      }
      
      showNotification('Profile updated successfully', 'success');
    } catch (error: any) {
      console.error('Profile update failed:', error);
      showNotification(error.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showNotification('New password must be at least 6 characters long', 'error');
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiService.changePassword({
        currentPassword,
        newPassword
      });
      
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      showNotification('Password changed successfully', 'success');
    } catch (error: any) {
      console.error('Password change failed:', error);
      showNotification(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);

    try {
      await apiService.forgotPassword({ email: resetEmail });
      showNotification('Password reset email sent successfully', 'success');
      setShowForgotPassword(false);
    } catch (error: any) {
      console.error('Forgot password failed:', error);
      showNotification(error.response?.data?.message || 'Failed to send reset email', 'error');
    } finally {
      setIsSendingReset(false);
    }
  };

  // Get display name for greeting
  const getDisplayName = () => {
    return user?.username || user?.email || 'User';
  };
  // Get OAuth avatar if available
  const getDefaultAvatar = () => {
    // Return the user's OAuth profile picture if available
    return user?.profilePicture || null;
  };  const getProfilePictureDisplay = () => {
    // Prioritize URL input preview if available
    if (profilePictureUrl && profilePictureUrl.trim()) {
      return profilePictureUrl.trim();
    }
    
    const currentPicture = profilePicture || user?.profilePicture || getDefaultAvatar();
    
    // Convert relative URLs to full URLs
    if (currentPicture && currentPicture.startsWith('/api/')) {
      return `${API_BASE_URL}${currentPicture}`;
    }
    
    return currentPicture;
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        
        {/* Section 1: Update Username and Profile Picture */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Profile Information</h2>
            <p className="section-description">Update your username and profile picture</p>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="profile-form">
            {/* Profile Picture Section */}
            <div className="form-group profile-picture-group">
              <label className="form-label">Profile Picture</label>
              <div className="profile-picture-container">
                <div className="profile-avatar-preview">                  {getProfilePictureDisplay() ? (
                    <img 
                      src={getProfilePictureDisplay() || ''} 
                      alt="Profile" 
                      className="profile-avatar-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) {
                          nextElement.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    className="profile-avatar-placeholder"
                    style={{ display: getProfilePictureDisplay() ? 'none' : 'flex' }}
                  >
                    <svg className="avatar-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                  <div className="profile-picture-controls">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfilePictureChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={isUploadingAvatar}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline upload-btn"
                    disabled={isUploadingAvatar}
                  >                    {isUploadingAvatar ? (
                      <>
                        <div className="inline-spinner"></div>
                        Uploading...
                      </>
                    ) : (
                      'Upload from Computer'
                    )}
                  </button>
                  
                  <div className="url-input-group">
                    <input
                      type="url"
                      value={profilePictureUrl}
                      onChange={handleProfilePictureUrlChange}
                      placeholder="Or paste image URL here"
                      className="form-input url-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Username Field */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                placeholder="Enter your username"
                required
              />
            </div>

            {/* Email Field (Read-only) */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                className="form-input"
                disabled
                readOnly
              />
              <small className="form-help">Email cannot be changed</small>
            </div>            <button 
              type="submit" 
              className="btn btn-primary save-btn"
              disabled={isUpdatingProfile || isUploadingAvatar}            >
              {isUpdatingProfile ? (
                <>
                  <div className="inline-spinner"></div>
                  Saving...
                </>
              ) : 'Save Profile Changes'}
            </button>
          </form>
        </div>

        {/* Section 2: Change Password */}
        <div className="profile-section">
          <div className="section-header">
            <h2 className="section-title">Change Password</h2>
            <p className="section-description">Update your account password</p>
          </div>
          
          <form onSubmit={handleChangePassword} className="password-form">
            <div className="form-group">
              <label htmlFor="currentPassword" className="form-label">Current Password</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your current password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your new password"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input"
                placeholder="Confirm your new password"
                minLength={6}
                required
              />
            </div>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary save-btn"
                disabled={isChangingPassword}              >
                {isChangingPassword ? (
                  <>
                    <div className="inline-spinner"></div>
                    Changing...
                  </>
                ) : 'Change Password'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="btn btn-link forgot-password-btn"
              >
                Forgot Password?
              </button>
            </div>
          </form>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="modal-overlay" onClick={() => setShowForgotPassword(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Reset Password</h3>
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleForgotPassword} className="modal-form">
                <div className="form-group">
                  <label htmlFor="resetEmail" className="form-label">Email Address</label>
                  <input
                    type="email"
                    id="resetEmail"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="form-input"
                    placeholder="Enter your email address"
                    required
                  />
                  <small className="form-help">
                    We'll send you a password reset link
                  </small>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? (
                      <>
                        <div className="inline-spinner"></div>
                        Sending...
                      </>
                    ) : 'Send Reset Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>        )}

        {/* Avatar Crop Modal */}
        {showCropModal && selectedFile && (
          <div className="modal-overlay" onClick={() => setShowCropModal(false)}>
            <div className="modal-content crop-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Crop Avatar</h3>
                <button
                  onClick={() => setShowCropModal(false)}
                  className="modal-close"
                >
                  ×
                </button>
              </div>
              
              <div className="crop-container">
                <div className="crop-preview">
                  <img 
                    src={URL.createObjectURL(selectedFile)}
                    alt="Crop preview"
                    className="crop-image"
                    style={{
                      transform: `scale(${cropSettings.scale}) rotate(${cropSettings.rotate}deg)`,
                      objectPosition: `${-cropSettings.x}px ${-cropSettings.y}px`
                    }}
                  />
                  <div className="crop-overlay"></div>
                </div>
                
                <div className="crop-controls">
                  <div className="control-group">
                    <label>Scale</label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={cropSettings.scale}
                      onChange={(e) => setCropSettings(prev => ({...prev, scale: parseFloat(e.target.value)}))}
                    />
                  </div>
                  
                  <div className="control-group">
                    <label>Rotate</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="15"
                      value={cropSettings.rotate}
                      onChange={(e) => setCropSettings(prev => ({...prev, rotate: parseInt(e.target.value)}))}
                    />
                  </div>
                  
                  <div className="control-group">
                    <label>Position X</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="5"
                      value={cropSettings.x}
                      onChange={(e) => setCropSettings(prev => ({...prev, x: parseInt(e.target.value)}))}
                    />
                  </div>
                  
                  <div className="control-group">
                    <label>Position Y</label>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      step="5"
                      value={cropSettings.y}
                      onChange={(e) => setCropSettings(prev => ({...prev, y: parseInt(e.target.value)}))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCropModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleCropAndUpload}
                  className="btn btn-primary"
                  disabled={isUploadingAvatar}                  >
                    {isUploadingAvatar ? (
                      <>
                        <div className="inline-spinner"></div>
                        Uploading...
                      </>
                    ) : 'Upload Avatar'}
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
