/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { ValidacionIdentidadService } from './validacion-ficha-unica.service';

@ApiTags('Validación Identidad')
@ApiBearerAuth()
@Controller('validacion-identidad')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR) // Solo administradores pueden acceder a estos endpoints
export class ValidacionIdentidadController {
  constructor(private readonly service: ValidacionIdentidadService) {}

  @Get('ciudadano/:carnet')
  @ApiOperation({ summary: 'Obtener datos de un ciudadano (solo admin)' })
  @ApiParam({ name: 'carnet', description: 'Carnet de identidad' })
  async getCiudadano(@Param('carnet') carnet: string) {
    return this.service.obtenerCiudadano(carnet);
  }

  @Post('cargar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Carga masiva de ciudadanos (solo admin)' })
  async cargarCiudadanos(
    @Body()
    data: Array<{
      carnetIdentidad: string;
      nombre?: string;
      apellidos?: string;
      fechaNacimiento?: Date;
    }>,
  ) {
    return this.service.cargarCiudadanos(data);
  }
}
