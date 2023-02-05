import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthDto } from './dto/auth.dto';
import { WordpressService } from './wordpress.service';

@Controller('wordpress')
export class WordpressController {
  constructor(private readonly wordpressService: WordpressService) {}

  @Post('jwt')
  async getJwt(@Body() authDto: AuthDto) {
    const user = await this.wordpressService.validateUser(
      authDto.username,
      authDto.passHash,
    );

    if (!user) {
      throw new BadRequestException();
    }

    return this.wordpressService.generateJwt(user);
  }
}
