import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { IssueOrRemoveLicenseDto } from './dto/issue-or-remove-license.dto';
import { PluginDto } from './dto/plugin.dto';
import { UserDto } from './dto/user.dto';
import { License } from './entities/license.entity';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
  ) {}

  private plugins: PluginDto[] = [
    {
      id: 1,
      name: 'plugin1',
      petrelVersion: '2022.1',
      createdAt: new Date(),
      productKey: 'wqwqw',
    },
    {
      id: 1,
      name: 'zxc plugin',
      petrelVersion: '2023.1',
      createdAt: new Date(),
      productKey: 'jhjhj',
    },
  ];

  private users: UserDto[] = [
    {
      ID: 1,
      user_login: 'admin',
      user_pass: 'passhash',
    },
    {
      ID: 2,
      user_login: 'alice',
      user_pass: 'passhash',
    },
  ];

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
    const result = [];

    // FIXME: брать плагины из БД wordpress
    const plugins = this.plugins;

    for (const plugin of plugins) {
      const unusedLicenses = await this.licenseRepository.find({
        where: {
          swid: plugin.productKey,
          userId,
          expireDate: MoreThan(new Date()),
          hwid: IsNull(),
        },
      });

      const licenses = await this.licenseRepository.find({
        where: {
          swid: plugin.productKey,
          userId,
          expireDate: MoreThan(new Date()),
        },
      });

      result.push({
        productKey: plugin.productKey,
        name: plugin.name,
        unused: unusedLicenses.length,
        total: licenses.length,
      });
    }

    return result;
  }

  async findUserById(id: number) {
    return this.users.find((user) => user.ID == id);
  }

  async findPluginByProductKey(productKey: string) {
    return this.plugins.find((plugin) => plugin.productKey == productKey);
  }
}
