import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WordpressModule } from 'src/wordpress/wordpress.module';
import { License } from './entities/license.entity';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';

@Module({
  imports: [TypeOrmModule.forFeature([License]), WordpressModule, HttpModule],
  controllers: [LicenseController],
  providers: [LicenseService],
})
export class LicenseModule {}
