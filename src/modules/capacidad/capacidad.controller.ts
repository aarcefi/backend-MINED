import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CapacidadCirculoService } from './capacidad.service';
import { CreateCapacidadDto, UpdateCapacidadDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('capacidad-circulo')
@Controller('capacidad-circulo')
export class CapacidadCirculoController {
  constructor(private readonly service: CapacidadCirculoService) {}

  @Post()
  create(@Body() dto: CreateCapacidadDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateCapacidadDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
