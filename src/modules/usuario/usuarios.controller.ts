/* eslint-disable @typescript-eslint/no-unused-vars */
// usuarios.controller.ts
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
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
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
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
  findAll(
    @Query('rol') rol?: RolUsuario,
    @Query('activo') activo?: boolean,
    @Query('email') email?: string,
    @Query('nombre') nombre?: string,
    @Query('municipio') municipio?: string,
  ) {
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
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetro de rol requerido',
  })
  findByRol(@Query('rol') rol: RolUsuario) {
    return this.usuariosService.findByRol(rol);
  }

  @Get('estadisticas/roles')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener estadísticas de usuarios por rol' })
  @ApiResponse({ status: 200, description: 'Estadísticas de usuarios por rol' })
  async getEstadisticasRoles() {
    const usuarios = await this.usuariosService.findAll();

    const estadisticas = {
      ADMINISTRADOR: 0,
      SOLICITANTE: 0,
      FUNCIONARIO_MUNICIPAL: 0,
      COMISION_OTORGAMIENTO: 0,
      DIRECTOR_CIRCULO: 0,
    };

    usuarios.forEach((usuario) => {
      if (estadisticas[usuario.rol] !== undefined) {
        estadisticas[usuario.rol]++;
      }
    });

    const total = usuarios.length;

    return {
      total,
      estadisticas,
      porcentajes: {
        ADMINISTRADOR:
          total > 0 ? (estadisticas.ADMINISTRADOR / total) * 100 : 0,
        SOLICITANTE: total > 0 ? (estadisticas.SOLICITANTE / total) * 100 : 0,
        FUNCIONARIO_MUNICIPAL:
          total > 0 ? (estadisticas.FUNCIONARIO_MUNICIPAL / total) * 100 : 0,
        COMISION_OTORGAMIENTO:
          total > 0 ? (estadisticas.COMISION_OTORGAMIENTO / total) * 100 : 0,
        DIRECTOR_CIRCULO:
          total > 0 ? (estadisticas.DIRECTOR_CIRCULO / total) * 100 : 0,
      },
    };
  }

  @Get('activos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener usuarios activos' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios activos' })
  findActivos() {
    return this.usuariosService.findAll({ activo: true });
  }

  @Get('buscar/email/:email')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Buscar usuario por email' })
  @ApiParam({ name: 'email', description: 'Email del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findByEmail(@Param('email') email: string) {
    const usuario = await this.usuariosService.findByEmail(email);

    if (!usuario) {
      return { message: `Usuario con email ${email} no encontrado` };
    }

    const { password, ...result } = usuario;
    return result;
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar/desactivar usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async toggleActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('activo') activo: boolean,
  ) {
    return this.usuariosService.update(id, { activo } as UpdateUsuarioDto);
  }

  @Patch(':id/actualizar-token')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar refresh token del usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Token actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  updateRefreshToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.usuariosService.updateRefreshToken(id, refreshToken);
  }

  @Patch(':id/limpiar-token')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Limpiar refresh token del usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Token limpiado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  clearRefreshToken(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.clearRefreshToken(id);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.remove(id);
  }
}
