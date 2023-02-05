import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserDto } from './dto/user.dto';

@Injectable()
export class WordpressService {
  constructor(
    private jwtService: JwtService,
    @InjectDataSource('wordpressDb')
    private wordpressDataSource: DataSource,
  ) {}

  async validateUser(username: string, passwordHash) {
    const queryRunner = this.wordpressDataSource.createQueryRunner();

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

  generateJwt(user: UserDto) {
    return {
      access_token: this.jwtService.sign({ ...user }),
    };
  }
}
