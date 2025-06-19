import { 
  signInWithPopup, 
  signOut, 
  User,
  UserCredential 
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../config/firebase';

export interface FirebaseUserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: string;
}

export class FirebaseAuthService {
  
  /**
   * Login với Google
   */
  static async signInWithGoogle(): Promise<{ user: FirebaseUserInfo; idToken: string }> {
    try {
      const result: UserCredential = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerId: 'google.com'
        },
        idToken
      };
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  }

  /**
   * Login với Facebook
   */
  static async signInWithFacebook(): Promise<{ user: FirebaseUserInfo; idToken: string }> {
    try {
      const result: UserCredential = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      
      return {
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          providerId: 'facebook.com'
        },
        idToken
      };
    } catch (error: any) {
      console.error('Error signing in with Facebook:', error);
      throw new Error(error.message || 'Failed to sign in with Facebook');
    }
  }

  /**
   * Logout
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Get ID token của user hiện tại
   */
  static async getCurrentUserIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }
}
