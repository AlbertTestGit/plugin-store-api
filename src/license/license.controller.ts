import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserDto } from 'src/wordpress/dto/user.dto';
import { Role } from 'src/wordpress/enums/role.enum';
import { JwtAuthGuard } from 'src/wordpress/guards/jwt-auth.guard';
import { WordpressService } from 'src/wordpress/wordpress.service';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { LicenseService } from './license.service';

@ApiTags('licenses')
@Controller('licenses')
export class LicenseController {
  constructor(
    private readonly licenseService: LicenseService,
    private readonly wordpressService: WordpressService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ручная активация' })
  @UseGuards(JwtAuthGuard)
  @Get('manual-activation')
  async manualActivation(@Request() req, @Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }

    const user: UserDto = req.user;

    if (user.role == Role.Developer || user.role == Role.Admin) {
      const expire = new Date().toISOString().substr(0, 10);

      return {
        success: true,
        data: await this.licenseService.getLicenseCode(token, expire),
      };
    }

    const unpackedToken = await this.licenseService.unpackToken(token);

    const license = await this.licenseService.findOrActivateLicense(
      unpackedToken.swid,
      user.id,
      unpackedToken.hwid,
    );

    if (!license) {
      throw new NotFoundException({
        success: false,
        message: 'You do not have active licenses',
      });
    }

    const expire = license.expireDate.toISOString().substr(0, 10);

    return {
      success: true,
      data: await this.licenseService.getLicenseCode(token, expire),
    };
  }

  @ApiOperation({ summary: 'Автоматическая активация' })
  @Get('automatic-activation')
  async automaticActivation(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }

    const unpackedToken = await this.licenseService.unpackToken(token);

    const user = await this.wordpressService.validateUsernameAndPassword(
      unpackedToken.user,
      unpackedToken.pass,
    );

    if (!user) {
      throw new BadRequestException({
        success: false,
        message: 'Incorrect username or password',
      });
    }

    if (user.role == Role.Developer || user.role == Role.Admin) {
      const expire = new Date().toISOString().substr(0, 10);

      return {
        success: true,
        data: await this.licenseService.getLicenseCode(token, expire),
      };
    }

    const license = await this.licenseService.findOrActivateLicense(
      unpackedToken.swid,
      user.id,
      unpackedToken.hwid,
    );

    if (!license) {
      throw new NotFoundException({
        success: false,
        message: 'You do not have active licenses',
      });
    }

    const expire = license.expireDate.toISOString().substr(0, 10);

    return {
      success: true,
      data: await this.licenseService.getLicenseCode(token, expire),
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выдача лицензий' })
  @UseGuards(JwtAuthGuard)
  @Post()
  async issueLicense(
    @Request() req,
    @Body() issueLicenseDto: IssueOrRemoveLicenseDto,
  ) {
    const issuerUser: UserDto = req.user;

    if (issuerUser.role != Role.Admin && issuerUser.role != Role.Manager) {
      throw new ForbiddenException();
    }

    const user = await this.wordpressService.findUserById(
      issueLicenseDto.userId,
    );

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    const plugin = await this.wordpressService.findPluginByProductKey(
      issueLicenseDto.swid,
    );

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return await this.licenseService.issueLicense(issueLicenseDto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удаление лицензий' })
  @UseGuards(JwtAuthGuard)
  @Delete()
  async removeLicense(
    @Request() req,
    @Body() removeLicenseDto: IssueOrRemoveLicenseDto,
  ) {
    const issuerUser: UserDto = req.user;

    if (issuerUser.role != Role.Admin && issuerUser.role != Role.Manager) {
      throw new ForbiddenException();
    }

    const user = await this.wordpressService.findUserById(
      removeLicenseDto.userId,
    );

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    const plugin = await this.wordpressService.findPluginByProductKey(
      removeLicenseDto.swid,
    );

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return await this.licenseService.removeLicense(removeLicenseDto);
  }

  @ApiOperation({ summary: 'Количество лицензий пользователя' })
  @Get(':userId')
  async getUserLicenses(@Param('userId') userId: number) {
    return await this.licenseService.userLicenseList(userId);
  }
}
