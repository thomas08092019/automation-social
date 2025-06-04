export enum SocialPlatform {
  FACEBOOK = 'facebook',
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  TIKTOK = 'tiktok'
}

export type SocialPlatformType = 'facebook' | 'instagram' | 'youtube' | 'tiktok';

export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: SocialPlatform.FACEBOOK, label: 'Facebook' },
  { value: SocialPlatform.INSTAGRAM, label: 'Instagram' },
  { value: SocialPlatform.YOUTUBE, label: 'YouTube' },
  { value: SocialPlatform.TIKTOK, label: 'TikTok' }
];
