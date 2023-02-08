import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { catchError, firstValueFrom } from 'rxjs';
import { WordpressService } from 'src/wordpress/wordpress.service';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { UnpackedTokenDto } from './dto/unpacked-token.dto';
import { License } from './entities/license.entity';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    private readonly httpService: HttpService,
    private readonly wordpressService: WordpressService,
  ) {}

  private logger = new Logger(LicenseService.name);
  private readonly LICENSE_URL = process.env.LICENSE_URL;

  async issueLicense(issueLicenseDto: IssueOrRemoveLicenseDto) {
    const dateNow = new Date();
    const expireDate = new Date(dateNow.setFullYear(dateNow.getFullYear() + 1));

    const licenses: License[] = [];

    for (let i = 0; i < issueLicenseDto.amount; i++) {
      const license = new License();
      license.swid = issueLicenseDto.swid;
      license.userId = issueLicenseDto.userId;
      license.expireDate = expireDate;

      licenses.push(license);
    }

    return await this.licenseRepository.save(licenses);
  }

  async removeLicense(removeLicenseDto: IssueOrRemoveLicenseDto) {
    const unusedLicenses = await this.licenseRepository.find({
      where: {
        swid: removeLicenseDto.swid,
        userId: removeLicenseDto.userId,
        expireDate: MoreThan(new Date()),
        hwid: IsNull(),
      },
    });

    return await this.licenseRepository.delete(
      unusedLicenses
        .slice(0, removeLicenseDto.amount)
        .map((license) => license.id),
    );
  }

  async userLicenseList(userId) {
    const sql: { swid: string }[] = await this.licenseRepository.manager.query(
      `SELECT DISTINCT "swid" FROM license WHERE "userId"='${userId}';`,
    );

    const productKeys = sql.map((p) => p.swid);

    const result = [];

    for (const productKey of productKeys) {
      const unusedLicenses = await this.licenseRepository.find({
        where: {
          swid: productKey,
          userId,
          expireDate: MoreThan(new Date()),
          hwid: IsNull(),
        },
      });

      const licenses = await this.licenseRepository.find({
        where: {
          swid: productKey,
          userId,
          expireDate: MoreThan(new Date()),
        },
      });

      const plugin = await this.wordpressService.findPluginByProductKey(
        productKey,
      );

      result.push({
        productKey: productKey,
        name: plugin.name,
        unused: unusedLicenses.length,
        total: licenses.length,
      });
    }

    return result;
  }

  async unpackToken(token: string) {
    const { data } = await firstValueFrom(
      this.httpService.get(`${this.LICENSE_URL}/unpack?token=${token}`).pipe(
        catchError((error) => {
          this.logger.error(error);
          throw new HttpException(
            {
              status: false,
              message: 'problems with the licensing service',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }),
      ),
    );

    return data.data as UnpackedTokenDto;
  }

  async getLicenseCode(token: string, expire: string) {
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.LICENSE_URL}/license?token=${token}&expire=${expire}`)
        .pipe(
          catchError((error) => {
            this.logger.error(error);
            throw new HttpException(
              {
                status: false,
                message: 'problems with the licensing service',
              },
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }),
        ),
    );

    return data.data as string;
  }

  async findOrActivateLicense(swid: string, userId: number, hwid: string) {
    const license = await this.licenseRepository.findOne({
      where: {
        swid,
        userId,
        expireDate: MoreThan(new Date()),
        hwid,
      },
    });

    if (license) return license;

    const unusedLicenses = await this.licenseRepository.find({
      where: {
        swid,
        userId,
        expireDate: MoreThan(new Date()),
        hwid: IsNull(),
      },
    });

    if (unusedLicenses.length == 0) return null;

    unusedLicenses[0].hwid = hwid;

    return await this.licenseRepository.save(unusedLicenses[0]);
  }
}
