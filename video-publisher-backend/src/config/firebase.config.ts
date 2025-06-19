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
    const firebaseConfig = {
      type: 'service_account',
      project_id: this.configService.get<string>('FIREBASE_PROJECT_ID'),
      private_key_id: this.configService.get<string>('FIREBASE_PRIVATE_KEY_ID'),
      private_key: this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
      client_email: this.configService.get<string>('FIREBASE_CLIENT_EMAIL'),
      client_id: this.configService.get<string>('FIREBASE_CLIENT_ID'),
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: this.configService.get<string>('FIREBASE_CLIENT_CERT_URL'),
    };

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig as admin.ServiceAccount),
      });
    } else {
      this.app = admin.app();
    }
  }

  getAuth() {
    return admin.auth(this.app);
  }

  async verifyIdToken(idToken: string) {
    try {
      const decodedToken = await this.getAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase token');
    }
  }
}
