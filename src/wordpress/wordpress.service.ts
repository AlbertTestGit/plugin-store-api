import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserDto } from './dto/user.dto';
import * as hasher from 'wordpress-hash-node';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import { PluginDto } from './dto/plugin.dto';
import { PluginRestDto } from './dto/plugin-rest.dto';

@Injectable()
export class WordpressService {
  constructor(
    private jwtService: JwtService,
    @InjectDataSource('wordpressDb')
    private wordpressDataSource: DataSource,
  ) {}

  private logger = new Logger(WordpressService.name);

  async validateUser(username: string, passwordHash: string) {
    const queryRunner = this.wordpressDataSource;

    const findUserSql: { ID: number; user_login: string }[] =
      await queryRunner.manager.query(
        `SELECT ID, user_login FROM wp_users WHERE user_login='${username}' AND user_pass='${passwordHash}'`,
      );

    if (findUserSql.length == 0) return null;

    const findUserRoleSql: { meta_value: string }[] =
      await queryRunner.manager.query(
        `SELECT meta_value FROM wp_usermeta WHERE meta_key='wp_capabilities' AND user_id='${findUserSql[0].ID}'`,
      );

    const role = findUserRoleSql[0].meta_value.split('"')[1];

    const result = new UserDto();
    result.id = findUserSql[0].ID;
    result.username = findUserSql[0].user_login;
    result.role = role;

    return result;
  }

  async validateUsernameAndPassword(username: string, password: string) {
    const queryRunner = this.wordpressDataSource;

    const findUserSql: { ID: number; user_login: string; user_pass: string }[] =
      await queryRunner.manager.query(
        `SELECT ID, user_login, user_pass FROM wp_users WHERE user_login='${username}'`,
      );

    if (findUserSql.length == 0) return null;

    if (!hasher.CheckPassword(password, findUserSql[0].user_pass)) return null;

    const findUserRoleSql: { meta_value: string }[] =
      await queryRunner.manager.query(
        `SELECT meta_value FROM wp_usermeta WHERE meta_key='wp_capabilities' AND user_id='${findUserSql[0].ID}'`,
      );

    const role = findUserRoleSql[0].meta_value.split('"')[1];

    const result = new UserDto();
    result.id = findUserSql[0].ID;
    result.username = findUserSql[0].user_login;
    result.role = role;

    return result;
  }

  generateJwt(user: UserDto) {
    return {
      access_token: this.jwtService.sign({ ...user }),
    };
  }

  async findUserById(id: number) {
    const queryRunner = this.wordpressDataSource;

    const findUserSql: { ID: number; user_login: string }[] =
      await queryRunner.manager.query(
        `SELECT ID, user_login FROM wp_users WHERE ID='${id}'`,
      );

    if (findUserSql.length == 0) return null;

    const findUserRoleSql: { meta_value: string }[] =
      await queryRunner.manager.query(
        `SELECT meta_value FROM wp_usermeta WHERE meta_key='wp_capabilities' AND user_id='${findUserSql[0].ID}'`,
      );

    const role = findUserRoleSql[0].meta_value.split('"')[1];

    const result = new UserDto();
    result.id = findUserSql[0].ID;
    result.username = findUserSql[0].user_login;
    result.role = role;

    return result;
  }

  async findPluginByProductKey(productKey: string) {
    const plugins = await this.findPlugins();

    return plugins.find((plugin) => plugin.productKey == productKey);
  }

  async findPluginById(id: number): Promise<PluginDto> {
    const api = new WooCommerceRestApi({
      url: process.env.WOOCOMMERCE_API_URL,
      consumerKey: process.env.WOOCOMMERCE_CK,
      consumerSecret: process.env.WOOCOMMERCE_CS,
      version: 'wc/v3',
    });

    return await api
      .get(`products/${id}`)
      .then((response) => {
        const data = response.data as PluginRestDto;

        const plugin = new PluginDto();
        plugin.id = data.id;
        plugin.name = data.name;
        plugin.createdAt = data.date_created;
        plugin.productKey = data.attributes[0].options[0];

        return plugin;
      })
      .catch((error) => {
        // TODO:
        this.logger.error(error);
        return null;
      });
  }

  async findPlugins(): Promise<PluginDto[]> {
    const api = new WooCommerceRestApi({
      url: process.env.WOOCOMMERCE_API_URL,
      consumerKey: process.env.WOOCOMMERCE_CK,
      consumerSecret: process.env.WOOCOMMERCE_CS,
      version: 'wc/v3',
    });

    return await api
      .get(`products/`)
      .then((response) => {
        const data = response.data as PluginRestDto[];

        const plugins = [];

        for (const item of data) {
          const plugin = new PluginDto();
          plugin.id = item.id;
          plugin.name = item.name;
          plugin.createdAt = item.date_created;
          plugin.productKey = item.attributes[0].options[0];

          plugins.push(plugin);
        }

        return plugins;
      })
      .catch((error) => {
        // TODO:
        this.logger.error(error);
        return null;
      });
  }

  async checkPluginByProductKey(productKey: string) {
    const plugins = await this.findPlugins();

    return !!plugins.find((plugin) => plugin.productKey == productKey);
  }
}
