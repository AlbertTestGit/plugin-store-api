import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { License } from './license/entities/license.entity';
import { LicenseModule } from './license/license.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'qwerty123',
      database: 'plugin-store',
      entities: [License],
      synchronize: true,
    }),
    LicenseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
