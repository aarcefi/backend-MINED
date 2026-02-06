/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado exitosamente',
    type: UsuarioResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  create(
    @Body() createUsuarioDto: CreateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({
    summary: 'Obtener todos los usuarios con filtros opcionales',
  })
  @ApiQuery({
    name: 'rol',
    required: false,
    enum: RolUsuario,
    description: 'Filtrar por rol',
  })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filtrar por email',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    description: 'Filtrar por nombre (en cualquiera de los perfiles)',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio (en cualquiera de los perfiles)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios',
    type: [UsuarioResponseDto],
  })
  findAll(
    @Query('rol') rol?: RolUsuario,
    @Query('activo') activo?: boolean,
    @Query('email') email?: string,
    @Query('nombre') nombre?: string,
    @Query('municipio') municipio?: string,
  ): Promise<UsuarioResponseDto[]> {
    return this.usuariosService.findAll({
      rol,
      activo: activo !== undefined ? Boolean(activo) : undefined,
      email,
      nombre,
      municipio,
    });
  }

  @Get('filter')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener usuarios filtrados por rol' })
  @ApiQuery({
    name: 'rol',
    required: true,
    enum: RolUsuario,
    description: 'Rol por el cual filtrar los usuarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios filtrados por rol',
    type: [UsuarioResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetro de rol requerido',
  })
  findByRol(@Query('rol') rol: RolUsuario): Promise<UsuarioResponseDto[]> {
    return this.usuariosService.findByRol(rol);
  }

  @Get('estadisticas/roles')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios por rol' })
  @ApiResponse({ status: 200, description: 'Estadísticas de usuarios por rol' })
  getEstadisticasRoles() {
    return this.usuariosService.getEstadisticas();
  }

  @Get('activos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener usuarios activos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios activos',
    type: [UsuarioResponseDto],
  })
  findActivos(): Promise<UsuarioResponseDto[]> {
    return this.usuariosService.findAll({ activo: true });
  }

  @Get('buscar/email/:email')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Buscar usuario por email' })
  @ApiParam({ name: 'email', description: 'Email del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: UsuarioResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findByEmail(
    @Param('email') email: string,
  ): Promise<UsuarioResponseDto | { message: string }> {
    const usuario = await this.usuariosService.findByEmail(email);

    if (!usuario) {
      return { message: `Usuario con email ${email} no encontrado` };
    }

    return usuario;
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario encontrado',
    type: UsuarioResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UsuarioResponseDto> {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar correo del usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'nuevoemail@ejemplo.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email actualizado',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'El email del usuario {id} ha sido actualizado correctamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  updateEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.usuariosService.updateEmail(id, email);
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar/desactivar usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        activo: { type: 'boolean', example: true },
      },
      required: ['activo'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Usuario {id} activado/desactivado correctamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async toggleActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('activo') activo: boolean,
  ): Promise<{ message: string }> {
    return this.usuariosService.toggleActivo(id, activo);
  }

  @Patch(':id/actualizar-token')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar refresh token del usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token actualizado',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Refresh token del usuario {id} actualizado correctamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  updateRefreshToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ message: string }> {
    return this.usuariosService.updateRefreshToken(id, refreshToken);
  }

  @Patch(':id/limpiar-token')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Limpiar refresh token del usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Token limpiado',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Refresh token del usuario {id} limpiado correctamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  clearRefreshToken(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.usuariosService.clearRefreshToken(id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario eliminado',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Usuario con ID {id} eliminado exitosamente',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.usuariosService.remove(id);
  }
}
