import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PluginVersion } from './entities/plugin-version.entity';

@Injectable()
export class PluginVersionService {
  constructor(
    @InjectRepository(PluginVersion)
    private licenseRepository: Repository<PluginVersion>,
  ) {}
}
