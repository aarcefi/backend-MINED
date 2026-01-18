import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TrazabilidadService } from './trazabilidad.service';
import { CreateTrazabilidadDto, UpdateTrazabilidadDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('trazabilidad')
@Controller('trazabilidad')
export class TrazabilidadController {
  constructor(private readonly service: TrazabilidadService) {}

  @Post()
  create(@Body() dto: CreateTrazabilidadDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrazabilidadDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
