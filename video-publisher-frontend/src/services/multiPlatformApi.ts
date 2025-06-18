import { apiService } from './api';
import { SocialPlatform } from '../types';

export interface MultiPlatformPostData {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    scheduledTime?: Date;
  };
  options?: {
    skipValidation?: boolean;
    continueOnError?: boolean;
    optimizeContent?: boolean;
  };
  preferences?: {
    preserveHashtags?: boolean;
    maxHashtags?: number;
    tone?: 'professional' | 'casual' | 'friendly';
    includeEmojis?: boolean;
  };
}

export interface ContentOptimizationData {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
    hashtags?: string[];
  };
  preferences?: {
    preserveHashtags?: boolean;
    maxHashtags?: number;
    tone?: 'professional' | 'casual' | 'friendly';
    includeEmojis?: boolean;
  };
}

export interface ContentValidationData {
  platforms: SocialPlatform[];
  content: {
    text?: string;
    mediaUrls?: string[];
    mediaType?: 'image' | 'video';
  };
}

export const multiPlatformApi = {
  // Create post across multiple platforms
  createMultiPlatformPost: async (data: MultiPlatformPostData) => {
    try {
      return await apiService.createMultiPlatformPost(data);
    } catch (error: any) {
      console.error('Error creating multi-platform post:', error);
      throw error;
    }
  },

  // Optimize content for multiple platforms
  optimizeContent: async (data: ContentOptimizationData) => {
    try {
      return await apiService.optimizeContent(data);
    } catch (error: any) {
      console.error('Error optimizing content:', error);
      throw error;
    }
  },

  // Validate content against platform requirements
  validateContent: async (data: ContentValidationData) => {
    try {
      return await apiService.validateContent(data);
    } catch (error: any) {
      console.error('Error validating content:', error);
      throw error;
    }
  },

  // Get platform capabilities
  getPlatformCapabilities: async () => {
    try {
      return await apiService.getPlatformCapabilities();
    } catch (error: any) {
      console.error('Error getting platform capabilities:', error);
      throw error;
    }
  },

  // Get optimal posting strategy
  getPostingStrategy: async (platforms: SocialPlatform[]) => {
    try {
      return await apiService.getPostingStrategy(platforms);
    } catch (error: any) {
      console.error('Error getting posting strategy:', error);
      throw error;
    }
  },

  // Get platform analytics
  getPlatformAnalytics: async (platforms: SocialPlatform[], dateRange: { start: string; end: string }) => {
    try {
      return await apiService.getPlatformAnalytics(platforms, dateRange);
    } catch (error: any) {
      console.error('Error getting platform analytics:', error);
      throw error;
    }
  },
};
