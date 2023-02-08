import { Module } from '@nestjs/common';
import { PluginVersionService } from './plugin-version.service';
import { PluginVersionController } from './plugin-version.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginVersion } from './entities/plugin-version.entity';
import { MulterModule } from '@nestjs/platform-express';
import { WordpressModule } from 'src/wordpress/wordpress.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PluginVersion]),
    MulterModule.register({ dest: './upload' }),
    WordpressModule,
  ],
  controllers: [PluginVersionController],
  providers: [PluginVersionService],
})
export class PluginVersionModule {}
