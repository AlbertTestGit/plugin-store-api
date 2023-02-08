import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  Request,
  UseGuards,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WordpressService } from 'src/wordpress/wordpress.service';
import { UploadDto } from './dto/upload.dto';
import { PluginVersionService } from './plugin-version.service';
import * as fs from 'node:fs';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import slugify from 'slugify';
import { JwtAuthGuard } from 'src/wordpress/guards/jwt-auth.guard';
import { Role } from 'src/wordpress/enums/role.enum';
import { UserDto } from 'src/wordpress/dto/user.dto';

@ApiTags('plugin vesions')
@Controller('plugin-version')
export class PluginVersionController {
  constructor(
    private readonly pluginVersionService: PluginVersionService,
    private readonly wordpressService: WordpressService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Загрузка новой версии плагина на сервер' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'pluginFile', maxCount: 1 },
      { name: 'helpFileEn', maxCount: 1 },
      { name: 'helpFileRu', maxCount: 1 },
      { name: 'helpFileKz', maxCount: 1 },
    ]),
  )
  async upload(
    @Request() req,
    @UploadedFiles()
    files: {
      pluginFile?: Express.Multer.File[];
      helpFileEn?: Express.Multer.File[];
      helpFileRu?: Express.Multer.File[];
      helpFileKz?: Express.Multer.File[];
    },
    @Body() uploadDto: UploadDto,
  ) {
    const user: UserDto = req.user;
    uploadDto.pluginId = JSON.parse(String(uploadDto.pluginId));

    if (user.role != Role.Admin && user.role != Role.Developer) {
      throw new ForbiddenException();
    }

    if (!files || !files.pluginFile) {
      if (files.helpFileEn) fs.unlinkSync(files.helpFileEn[0].path);
      if (files.helpFileRu) fs.unlinkSync(files.helpFileRu[0].path);
      if (files.helpFileKz) fs.unlinkSync(files.helpFileKz[0].path);

      throw new BadRequestException('pluginFile cannot be empty');
    }

    uploadDto.pluginFile = files.pluginFile[0];
    uploadDto.helpFileEn = files.helpFileEn?.[0];
    uploadDto.helpFileRu = files.helpFileRu?.[0];
    uploadDto.helpFileKz = files.helpFileKz?.[0];

    const plugin = await this.wordpressService.findPluginById(
      uploadDto.pluginId,
    );

    if (!plugin) {
      if (files.pluginFile) fs.unlinkSync(files.pluginFile[0].path);
      if (files.helpFileEn) fs.unlinkSync(files.helpFileEn[0].path);
      if (files.helpFileRu) fs.unlinkSync(files.helpFileRu[0].path);
      if (files.helpFileKz) fs.unlinkSync(files.helpFileKz[0].path);

      throw new NotFoundException('Plugin not found');
    }

    const pluginVersion = await this.pluginVersionService.findByVersion(
      uploadDto.pluginId,
      uploadDto.version,
    );

    if (pluginVersion) {
      if (files.pluginFile) fs.unlinkSync(files.pluginFile[0].path);
      if (files.helpFileEn) fs.unlinkSync(files.helpFileEn[0].path);
      if (files.helpFileRu) fs.unlinkSync(files.helpFileRu[0].path);
      if (files.helpFileKz) fs.unlinkSync(files.helpFileKz[0].path);

      throw new BadRequestException('This version already exists');
    }

    return await this.pluginVersionService.uploadVersion(uploadDto, user);
  }

  @ApiOperation({ summary: 'Скачать версию плагина' })
  @Get('download')
  async download(@Query('id') id: number) {
    const pluginVersion = await this.pluginVersionService.findById(id);

    if (!pluginVersion) {
      throw new NotFoundException('Plugin Version not found');
    }

    const pluginFile = createReadStream(
      join(process.cwd(), 'upload', pluginVersion.fileName),
    );

    const plugin = await this.wordpressService.findPluginById(
      pluginVersion.pluginId,
    );
    console.log(plugin);
    const pluginFileName =
      slugify(`${plugin.name}-${pluginVersion.version}`) + '.pip';

    return new StreamableFile(pluginFile, {
      disposition: `attachment; filename="${pluginFileName}"`,
    });
  }

  @ApiOperation({
    summary: 'Получение плагина по его версии или списка версий плагина',
  })
  @ApiQuery({ name: 'version', required: false })
  @Get('list/:pluginId')
  async getOneOrListPluginVersions(
    @Param('pluginId') pluginId: number,
    @Query('version') version?: string,
  ) {
    const plugin = await this.wordpressService.findPluginById(pluginId);

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    if (version) {
      const pluginVersion = await this.pluginVersionService.findByVersion(
        pluginId,
        version,
      );

      if (!pluginVersion) {
        throw new NotFoundException('Plugin Version not found');
      }

      return pluginVersion;
    }

    return await this.pluginVersionService.findPluginVersions(pluginId);
  }

  @ApiOperation({ summary: 'Получение текущей версии плагина' })
  @Get('current/:pluginId')
  async getCurrentPluginVersion(@Param('pluginId') pluginId: number) {
    const plugin = await this.wordpressService.findPluginById(pluginId);

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    const pluginVersion = await this.pluginVersionService.getCurrentVersion(
      pluginId,
    );

    if (!pluginVersion) {
      throw new NotFoundException('Current version not found');
    }

    return pluginVersion;
  }

  @ApiOperation({ summary: '' })
  @Get(':pluginVersionId')
  async getOne(@Param('pluginVersionId') pluginVersionId: number) {
    const pluginVersion = await this.pluginVersionService.findById(
      pluginVersionId,
    );

    if (!pluginVersion) {
      throw new NotFoundException('Plugin Version not found');
    }

    return pluginVersion;
  }

  @ApiQuery({ name: 'beta', required: false })
  @ApiQuery({ name: 'deprecated', required: false })
  @Post('switch/:pluginVersionId')
  async switchBetaOrDeprecated(
    @Param('pluginVersionId') pluginVersionId: number,
    @Query('beta') beta?: boolean,
    @Query('deprecated') deprecated?: boolean,
  ) {
    if (beta == null && deprecated == null) {
      throw new BadRequestException('beta or deprecated cannot be empty');
    }

    const pluginVersion = await this.pluginVersionService.findById(
      pluginVersionId,
    );

    if (!pluginVersion) {
      throw new NotFoundException('Plugin Version not found');
    }

    if (beta && `${beta}` != 'true' && `${beta}` != 'false') {
      throw new BadRequestException('invalid value in beta');
    }

    if (deprecated && `${deprecated}` != 'true' && `${deprecated}` != 'false') {
      throw new BadRequestException('invalid value in deprecated');
    }

    return await this.pluginVersionService.updateBeta(
      pluginVersion,
      JSON.parse(String(beta || null)),
      JSON.parse(String(deprecated || null)),
    );
  }
}
