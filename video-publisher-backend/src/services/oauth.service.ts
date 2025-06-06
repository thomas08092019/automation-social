import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

@Injectable()
export class OAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  }

  async verifyGoogleToken(token: string): Promise<any> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      return {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        providerId: payload.sub,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
  async verifyFacebookToken(token: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.width(400).height(400)&access_token=${token}`
      );
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid Facebook response');
      }

      return {
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture?.data?.url,
        providerId: response.data.id,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Facebook token');
    }
  }
} 