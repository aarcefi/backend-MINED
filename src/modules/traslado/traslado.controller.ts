import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CreateTrasladoDto, UpdateEstadoTrasladoDto } from './dto';
import { TrasladoService } from './traslado.service';

@ApiTags('Traslados')
@ApiBearerAuth()
@Controller('traslados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrasladoController {
  constructor(private readonly service: TrasladoService) {}

  @Post()
  @Roles(RolUsuario.SOLICITANTE)
  @ApiOperation({ summary: 'Crear una solicitud de traslado' })
  create(@Request() req, @Body() dto: CreateTrasladoDto) {
    return this.service.create(dto, req.user);
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.DIRECTOR_CIRCULO)
  findAll() {
    return this.service.findAll();
  }

  @Get('mis')
  @Roles(RolUsuario.SOLICITANTE)
  findMis(@Request() req) {
    return this.service.findMis(req.user.perfilId);
  }

  @Get(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.DIRECTOR_CIRCULO, RolUsuario.SOLICITANTE)
  findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id, req.user);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.DIRECTOR_CIRCULO)
  updateEstado(@Request() req, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEstadoTrasladoDto) {
    return this.service.updateEstado(id, dto, req.user);
  }
}
