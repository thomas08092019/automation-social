# Firebase Configuration Guide

## 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Nhấn "Create a project" hoặc "Add project"
3. Đặt tên project: `automation-social` (hoặc tên bạn muốn)
4. Bật Google Analytics nếu cần
5. Nhấn "Create project"

## 2. Cấu hình Authentication

1. Trong Firebase Console, chọn "Authentication" từ menu bên trái
2. Nhấn "Get started"
3. Chọn tab "Sign-in method"
4. Bật các provider cần thiết:

### Google Sign-in
- Nhấn "Google" → "Enable"
- Nhập Project support email
- Nhấn "Save"

### Facebook Sign-in
- Nhấn "Facebook" → "Enable"
- Nhập Facebook App ID và App secret (cần tạo Facebook App trước)
- Nhấn "Save"

## 3. Cấu hình Web App

1. Trong Firebase Console, nhấn icon "Web" (</>) trong "Project Overview"
2. Đặt tên app: `automation-social-web`
3. Chọn "Also set up Firebase Hosting" (tùy chọn)
4. Nhấn "Register app"
5. Copy Firebase config object

## 4. Cấu hình Frontend (.env)

Tạo file `.env` trong thư mục `video-publisher-frontend`:

\`\`\`env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
\`\`\`

## 5. Tạo Service Account cho Backend

1. Trong Firebase Console, chọn "Project settings" (icon bánh răng)
2. Chọn tab "Service accounts"
3. Nhấn "Generate new private key"
4. Tải file JSON

## 6. Cấu hình Backend (.env)

Tạo file `.env` trong thư mục `video-publisher-backend`:

\`\`\`env
# Database Configuration
DATABASE_URL="your-database-url"

# JWT Configuration
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"

# Firebase Configuration
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour-private-key\\n-----END PRIVATE KEY-----\\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your-client-id"
FIREBASE_CLIENT_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
\`\`\`

**Lưu ý:** Các thông tin Firebase cho backend lấy từ file Service Account JSON đã tải ở bước 5.

## 7. Cấu hình Facebook App (nếu dùng Facebook Login)

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo App mới
3. Thêm Facebook Login product
4. Cấu hình Valid OAuth Redirect URIs:
   - `https://your-project-id.firebaseapp.com/__/auth/handler`
5. Copy App ID và App Secret để dùng trong Firebase

## 8. Test Authentication

Sau khi cấu hình xong:

1. Start backend: `cd video-publisher-backend && npm run start:dev`
2. Start frontend: `cd video-publisher-frontend && npm run dev`
3. Truy cập `http://localhost:3000/auth/login`
4. Test Google/Facebook login

## 9. Troubleshooting

### Lỗi "auth/configuration-not-found"
- Kiểm tra Firebase config trong frontend
- Đảm bảo tất cả environment variables đã được set

### Lỗi "Firebase token verification failed"
- Kiểm tra Firebase Service Account config trong backend
- Đảm bảo private key đúng format (có \\n)

### Lỗi Facebook login
- Kiểm tra Facebook App settings
- Đảm bảo redirect URI đã được cấu hình
- Kiểm tra App ID và App Secret trong Firebase

## 10. Cấu trúc mới của Authentication Flow

1. **Frontend**: Người dùng nhấn nút Google/Facebook
2. **Firebase**: Xử lý authentication với Google/Facebook
3. **Frontend**: Nhận Firebase ID token
4. **Backend**: Verify Firebase token và tạo/cập nhật user
5. **Backend**: Trả về JWT token cho app
6. **Frontend**: Lưu JWT token và redirect to dashboard

Flow này an toàn hơn và đơn giản hơn so với OAuth truyền thống.
