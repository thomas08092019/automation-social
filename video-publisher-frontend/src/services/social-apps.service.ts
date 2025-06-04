import axios from 'axios';
import { SocialPlatform } from '../types/social-platform';
import { 
  SocialApp, 
  CreateSocialAppRequest, 
  UpdateSocialAppRequest,
  ValidateAppCredentialsRequest,
  SocialAppValidationResult,
  ImportDefaultAppsRequest
} from '../types/social-app';

const API_URL = '/api/social-apps';

export const SocialAppsService = {
  /**
   * Get all social apps for the current user
   */
  async getUserApps(platform?: SocialPlatform): Promise<SocialApp[]> {
    const params = platform ? { platform } : {};
    const response = await axios.get(API_URL, { params });
    return response.data;
  },

  /**
   * Create a new social app
   */
  async createApp(data: CreateSocialAppRequest): Promise<SocialApp> {
    const response = await axios.post(API_URL, data);
    return response.data;
  },

  /**
   * Update an existing social app
   */
  async updateApp(id: string, data: UpdateSocialAppRequest): Promise<SocialApp> {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data;
  },

  /**
   * Delete a social app
   */
  async deleteApp(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`);
  },

  /**
   * Validate app credentials
   */
  async validateAppCredentials(data: ValidateAppCredentialsRequest): Promise<SocialAppValidationResult> {
    const response = await axios.post(`${API_URL}/validate`, data);
    return response.data;
  },

  /**
   * Set an app as default for a platform
   */
  async setDefaultApp(id: string): Promise<SocialApp> {
    const response = await axios.put(`${API_URL}/${id}/default`, {});
    return response.data;
  },

  /**
   * Link social account to a social app
   */
  async linkAccount(socialAccountId: string, socialAppId: string): Promise<void> {
    await axios.post(`${API_URL}/link-account`, {
      socialAccountId,
      socialAppId,
    });
  },

  /**
   * Check app health status
   */
  async checkAppHealth(id: string): Promise<SocialAppValidationResult> {
    const response = await axios.get(`${API_URL}/${id}/health`);
    return response.data;
  },

  /**
   * Import default system apps
   */
  async importDefaultApps(platforms: SocialPlatform[]): Promise<SocialApp[]> {
    const response = await axios.post(`${API_URL}/import-defaults`, { platforms } as ImportDefaultAppsRequest);
    return response.data;
  }
};
