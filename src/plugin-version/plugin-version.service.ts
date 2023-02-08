import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserDto } from 'src/wordpress/dto/user.dto';
import { IsNull, Repository } from 'typeorm';
import { UploadDto } from './dto/upload.dto';
import { PluginVersion } from './entities/plugin-version.entity';

@Injectable()
export class PluginVersionService {
  constructor(
    @InjectRepository(PluginVersion)
    private pluginVersionRepository: Repository<PluginVersion>,
  ) {}

  async findPluginVersions(pluginId: number) {
    return await this.pluginVersionRepository.find({
      where: { pluginId },
    });
  }

  async findByVersion(pluginId: number, version: string) {
    return await this.pluginVersionRepository.findOne({
      where: {
        pluginId,
        version,
      },
    });
  }

  async findById(pluginVersionId: number) {
    return await this.pluginVersionRepository.findOne({
      where: {
        id: pluginVersionId,
      },
    });
  }

  async uploadVersion(uploadDto: UploadDto, user: UserDto) {
    const pluginVersion = new PluginVersion();
    pluginVersion.version = uploadDto.version;
    pluginVersion.description = uploadDto.description;
    pluginVersion.fileName = uploadDto.pluginFile.filename;
    pluginVersion.helpFileEn = uploadDto.helpFileEn?.filename;
    pluginVersion.helpFileRu = uploadDto.helpFileRu?.filename;
    pluginVersion.helpFileKz = uploadDto.helpFileKz?.filename;
    pluginVersion.author = user.id;
    pluginVersion.gitRepository = uploadDto.gitRepository;
    pluginVersion.beta = JSON.parse(String(uploadDto.beta || true));
    pluginVersion.pluginId = uploadDto.pluginId;

    return await this.pluginVersionRepository.save(pluginVersion);
  }

  async getCurrentVersion(pluginId: number) {
    return await this.pluginVersionRepository.findOne({
      where: {
        pluginId,
        deprecated: IsNull(),
        beta: false,
      },
      order: {
        version: 'DESC',
      },
    });
  }

  async updateBeta(
    pluginVersion: PluginVersion,
    beta?: boolean,
    deprecated?: boolean,
  ) {
    console.log(beta, deprecated);
    if (
      pluginVersion.beta == beta &&
      !!pluginVersion.deprecated == deprecated
    ) {
      return pluginVersion;
    }

    pluginVersion.beta = beta;
    pluginVersion.deprecated = deprecated ? new Date() : null;

    return await this.pluginVersionRepository.save(pluginVersion);
  }
}
