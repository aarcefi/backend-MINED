import { ApiProperty } from '@nestjs/swagger';
import { TokensDto } from './token.dto';
import { ProfileResponseDto } from './profile-response.dto';

export class LoginResponseDto {
  @ApiProperty({ type: TokensDto })
  tokens: TokensDto;

  @ApiProperty({ type: ProfileResponseDto })
  user: ProfileResponseDto;
}
