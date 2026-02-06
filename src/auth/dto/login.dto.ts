import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@test.com',
    description: 'Correo electrónico del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123123',
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
