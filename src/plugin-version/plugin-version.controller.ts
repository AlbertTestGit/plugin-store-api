import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WordpressService } from 'src/wordpress/wordpress.service';
import { UploadDto } from './dto/upload.dto';
import { PluginVersionService } from './plugin-version.service';

@ApiTags('plugin vesions')
@Controller('plugin-version')
export class PluginVersionController {
  constructor(
    private readonly pluginVersionService: PluginVersionService,
    private readonly wordpressService: WordpressService,
  ) {}

  // TODO: Проверить авторизацию
  @ApiOperation({ summary: 'Загрузка новой версии плагина на сервер' })
  @ApiConsumes('multipart/form-data')
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
    @UploadedFiles()
    files: {
      pluginFile?: Express.Multer.File[];
      helpFileEn?: Express.Multer.File[];
      helpFileRu?: Express.Multer.File[];
      helpFileKz?: Express.Multer.File[];
    },
    @Body() uploadDto: UploadDto,
  ) {
    if (!files || !files.pluginFile) {
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
      throw new NotFoundException('Plugin not found');
    }

    // TODO: Проверить version на уникальность

    return 1;
  }

  @ApiOperation({ summary: 'Получение списка версий плагина' })
  @Get(':pluginId')
  async getPluginVersions(@Param('pluginId') pluginId: number) {
    return `Version list for plugin #${pluginId}`;
  }

  @ApiOperation({ summary: 'Получение текущей версии плагина' })
  @Get(':pluginId/current')
  async getCurrentPluginVersion(@Param('pluginId') pluginId: number) {
    return `Current version for plugin #${pluginId}`;
  }
}
