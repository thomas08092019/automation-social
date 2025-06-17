import { Module } from '@nestjs/common';
import { MultiPlatformController } from './multi-platform.controller';

@Module({
  controllers: [MultiPlatformController],
})
export class MultiPlatformModule {}
