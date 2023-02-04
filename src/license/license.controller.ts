import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { LicenseService } from './license.service';

@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  // TODO: Only authorized users
  @Get('manual-activation')
  async manualActivation(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }
  }

  @Get('automatic-activation')
  async automaticActivation(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException({
        success: false,
        message: 'token cannot be empty',
      });
    }
  }

  // TODO: Only managers and administrators can issue licenses
  @Post()
  async issueLicense(@Body() issueLicenseDto: IssueOrRemoveLicenseDto) {
    const user = await this.licenseService.findUserById(issueLicenseDto.userId);

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    const plugin = await this.licenseService.findPluginByProductKey(
      issueLicenseDto.swid,
    );

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return await this.licenseService.issueLicense(issueLicenseDto);
  }

  // TODO: Only managers and administrators can remove licenses
  @Delete()
  async removeLicense(@Body() removeLicenseDto: IssueOrRemoveLicenseDto) {
    const user = await this.licenseService.findUserById(
      removeLicenseDto.userId,
    );

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    const plugin = await this.licenseService.findPluginByProductKey(
      removeLicenseDto.swid,
    );

    if (!plugin) {
      throw new NotFoundException('Plugin not found');
    }

    return await this.licenseService.removeLicense(removeLicenseDto);
  }

  @Get(':userId')
  async getUserLicenses(@Param('userId') userId: number) {
    return await this.licenseService.userLicenseList(userId);
  }
}
