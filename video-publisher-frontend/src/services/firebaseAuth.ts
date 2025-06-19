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
      
      // Force token refresh to get the latest token
      const idToken = await user.getIdToken(true);
      
      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Failed to obtain valid ID token from Firebase');
      }
      
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
      // Provide more user-friendly error messages
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Đăng nhập bị hủy bởi người dùng');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bị chặn. Vui lòng cho phép popup và thử lại');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Yêu cầu đăng nhập bị hủy');
      } else {
        throw new Error(error.message || 'Đăng nhập Google thất bại');
      }
    }
  }

  /**
   * Login với Facebook
   */
  static async signInWithFacebook(): Promise<{ user: FirebaseUserInfo; idToken: string }> {
    try {
      const result: UserCredential = await signInWithPopup(auth, facebookProvider);
      const user = result.user;
      
      // Force token refresh to get the latest token
      const idToken = await user.getIdToken(true);
      
      if (!idToken || typeof idToken !== 'string') {
        throw new Error('Failed to obtain valid ID token from Firebase');
      }
      
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
      // Provide more user-friendly error messages
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Đăng nhập bị hủy bởi người dùng');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bị chặn. Vui lòng cho phép popup và thử lại');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Yêu cầu đăng nhập bị hủy');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('Tài khoản đã tồn tại với phương thức đăng nhập khác');
      } else {
        throw new Error(error.message || 'Đăng nhập Facebook thất bại');
      }
    }
  }

  /**
   * Logout
   */
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
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
