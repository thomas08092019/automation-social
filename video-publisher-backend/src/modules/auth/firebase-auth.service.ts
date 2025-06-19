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
      const decodedToken = await this.firebaseConfig.verifyIdToken(idToken);
      
      // Get additional user info from Firebase
      const userRecord = await this.firebaseConfig.getAuth().getUser(decodedToken.uid);
      
      // Determine provider from Firebase user data
      let provider = 'firebase';
      let providerId = decodedToken.uid;
      
      if (userRecord.providerData && userRecord.providerData.length > 0) {
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
        email: decodedToken.email || userRecord.email,
        name: decodedToken.name || userRecord.displayName || 'User',
        picture: decodedToken.picture || userRecord.photoURL,
        provider,
        providerId,
      };
    } catch (error) {
      throw new Error(`Firebase authentication failed: ${error.message}`);
    }
  }
}
