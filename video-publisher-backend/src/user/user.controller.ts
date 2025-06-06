import { Controller, Get, Patch, UseGuards, Request, Body, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/user.dto';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = (req as any).user.id;
    const uploadPath = path.join(process.cwd(), 'uploads', 'avatars', userId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const filename = `avatar-${Date.now()}${fileExtension}`;
    cb(null, filename);
  },
});

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req): Promise<UserResponseDto> {
    return this.userService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(
    @Request() req, 
    @Body() updates: Partial<{ username: string; profilePicture: string }>
  ): Promise<UserResponseDto> {
    return this.userService.updateProfile(req.user.id, updates);
  }

  @UseGuards(JwtAuthGuard)
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for avatars
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Invalid image file type. Only JPEG, PNG, GIF, and WebP are allowed.'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ profilePicture: string; message: string }> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    // Get current user to check for existing avatar
    const currentUser = await this.userService.findById(req.user.id);
    
    // Delete old avatar file if it exists and is a local file
    if (currentUser.profilePicture && currentUser.profilePicture.startsWith('/api/uploads/avatars/')) {
      try {
        const oldAvatarPath = path.join(process.cwd(), currentUser.profilePicture.replace('/api/', ''));
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
        // Continue with upload even if old file deletion fails
      }
    }

    // Generate URL for the uploaded file
    const avatarUrl = `/api/uploads/avatars/${req.user.id}/${file.filename}`;
    
    // Update user's profile picture in database
    await this.userService.updateProfile(req.user.id, { 
      profilePicture: avatarUrl 
    });

    return {
      profilePicture: avatarUrl,
      message: 'Avatar uploaded successfully',
    };
  }
}
