import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FirebaseConfig {
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }
  private initializeFirebase() {
    try {
      // Validate required environment variables
      const requiredVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_PRIVATE_KEY_ID',
        'FIREBASE_PRIVATE_KEY',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_CLIENT_ID',
      ];

      const missingVars = requiredVars.filter(
        (varName) => !this.configService.get<string>(varName),
      );

      if (missingVars.length > 0) {
        throw new Error(
          `Missing Firebase environment variables: ${missingVars.join(', ')}`,
        );
      }

      const firebaseConfig = {
        type: 'service_account',
        project_id: this.configService.get<string>('FIREBASE_PROJECT_ID'),
        private_key_id: this.configService.get<string>(
          'FIREBASE_PRIVATE_KEY_ID',
        ),
        private_key: this.configService
          .get<string>('FIREBASE_PRIVATE_KEY')
          ?.replace(/\\n/g, '\n'),
        client_email: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
        client_id: this.configService.get<string>('FIREBASE_CLIENT_ID'),
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url:
          'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: this.configService.get<string>(
          'FIREBASE_CLIENT_CERT_URL',
        ),
      };
      if (!admin.apps.length) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert(
            firebaseConfig as admin.ServiceAccount,
          ),
        });
      } else {
        this.app = admin.app();
      }
    } catch (error) {
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  getAuth() {
    return admin.auth(this.app);
  }
  async verifyIdToken(idToken: string) {
    try {
      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Invalid token format');
      }

      const decodedToken = await this.getAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Token expired');
      } else if (error.code === 'auth/invalid-id-token') {
        throw new Error('Invalid token');
      } else if (error.code === 'auth/project-not-found') {
        throw new Error('Firebase project not found');
      } else {
        throw new Error('Invalid Firebase token');
      }
    }
  }
}
