import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Request,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
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
    @Body() updates: Partial<{ username: string; profilePicture: string }>,
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

        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const avatarPath = `/api/uploads/avatars/${req.user.id}/${file.filename}`;

    return this.userService.updateProfile(req.user.id, {
      profilePicture: avatarPath,
    });
  }
}
