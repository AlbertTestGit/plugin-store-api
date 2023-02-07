import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { License } from './license/entities/license.entity';
import { LicenseModule } from './license/license.module';
import { WordpressModule } from './wordpress/wordpress.module';
import { PluginVersionModule } from './plugin-version/plugin-version.module';
import { PluginVersion } from './plugin-version/entities/plugin-version.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [License, PluginVersion],
      synchronize: true,
    }),
    TypeOrmModule.forRoot({
      name: 'wordpressDb',
      type: 'mysql',
      host: process.env.WP_DB_HOST,
      port: +process.env.WP_DB_PORT,
      username: process.env.WP_DB_USER,
      password: process.env.WP_DB_PASS,
      database: process.env.WP_DB_NAME,
      entities: [],
      synchronize: false,
    }),
    LicenseModule,
    WordpressModule,
    PluginVersionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
