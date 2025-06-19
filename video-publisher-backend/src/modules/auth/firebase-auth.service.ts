import { Injectable } from '@nestjs/common';
import { FirebaseConfig } from '../../config/firebase.config';

export interface FirebaseUserData {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  provider: string;
  providerId: string;
}

@Injectable()
export class FirebaseAuthService {
  constructor(private firebaseConfig: FirebaseConfig) {}
  async verifyAndGetUserData(idToken: string): Promise<FirebaseUserData> {
    try {
      // Validate input
      if (!idToken || typeof idToken !== 'string' || idToken.trim() === '') {
        throw new Error('Invalid or empty ID token provided');
      }

      // Verify the ID token
      const decodedToken = await this.firebaseConfig.verifyIdToken(idToken);

      // Get additional user info from Firebase
      let userRecord;
      try {
        userRecord = await this.firebaseConfig
          .getAuth()
          .getUser(decodedToken.uid);
      } catch (userError) {
        // Continue with decoded token info only
        userRecord = null;
      }

      // Determine provider from Firebase user data
      let provider = 'firebase';
      let providerId = decodedToken.uid;

      // Check provider information from decoded token first
      if (decodedToken.firebase?.sign_in_provider) {
        switch (decodedToken.firebase.sign_in_provider) {
          case 'google.com':
            provider = 'google';
            providerId = decodedToken.uid;
            break;
          case 'facebook.com':
            provider = 'facebook';
            providerId = decodedToken.uid;
            break;
          default:
            provider = decodedToken.firebase.sign_in_provider;
            providerId = decodedToken.uid;
        }
      } else if (
        userRecord?.providerData &&
        userRecord.providerData.length > 0
      ) {
        // Fallback to user record provider data
        const providerInfo = userRecord.providerData[0];
        switch (providerInfo.providerId) {
          case 'google.com':
            provider = 'google';
            providerId = providerInfo.uid;
            break;
          case 'facebook.com':
            provider = 'facebook';
            providerId = providerInfo.uid;
            break;
          default:
            provider = providerInfo.providerId;
            providerId = providerInfo.uid;
        }
      }

      return {
        uid: decodedToken.uid,
        email: decodedToken.email || userRecord?.email || '',
        name: decodedToken.name || userRecord?.displayName || 'User',
        picture: decodedToken.picture || userRecord?.photoURL || null,
        provider,
        providerId,
      };
    } catch (error) {
      // Provide more specific error messages
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Firebase token has expired. Please sign in again.');
      } else if (error.code === 'auth/invalid-id-token') {
        throw new Error('Invalid Firebase token format.');
      } else if (error.code === 'auth/project-not-found') {
        throw new Error('Firebase project configuration error.');
      } else {
        throw new Error(`Firebase authentication failed: ${error.message}`);
      }
    }
  }
}
