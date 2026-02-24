import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { RolUsuario } from '@prisma/client';
import { CreatePerfilSolicitanteDto } from '../../perfiles/perfil-solicitante/dto/create-perfil-solicitante.dto';
import { CreatePerfilFuncionarioDto } from '../../perfiles/perfil-funcionario/dto/create-perfil-funcionario.dto';
import { CreatePerfilComisionDto } from '../../perfiles/perfil-comision/dto/create-perfil-comision.dto';
import { CreatePerfilDirectorDto } from '../../perfiles/perfil-director/create-perfil-director.dto';

@ApiExtraModels(
  CreatePerfilSolicitanteDto,
  CreatePerfilFuncionarioDto,
  CreatePerfilComisionDto,
  CreatePerfilDirectorDto,
)
export class CreateUsuarioDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: RolUsuario, example: 'SOLICITANTE' })
  @IsEnum(RolUsuario)
  rol: RolUsuario;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  apellidos: string;

  @ApiProperty({ example: '85010112345' })
  @IsString()
  carnetIdentidad: string;

  @ApiProperty({ example: '+5351234567', required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ example: 'Plaza de la Revolución' })
  @IsString()
  municipio: string;

  @ApiProperty({ example: 'La Habana' })
  @IsString()
  provincia: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean = true;

  @ApiProperty({
    description: 'Datos específicos del perfil según el rol',
    oneOf: [
      { $ref: getSchemaPath(CreatePerfilSolicitanteDto) },
      { $ref: getSchemaPath(CreatePerfilFuncionarioDto) },
      { $ref: getSchemaPath(CreatePerfilComisionDto) },
      { $ref: getSchemaPath(CreatePerfilDirectorDto) },
    ],
  })
  @ValidateNested()
  perfil:
    | CreatePerfilSolicitanteDto
    | CreatePerfilFuncionarioDto
    | CreatePerfilComisionDto
    | CreatePerfilDirectorDto;
}
