import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CapacidadService } from './capacidad.service';
import { CreateCapacidadDto } from './dto/create-capacidad.dto';
import { UpdateCapacidadDto } from './dto/update-capacidad.dto';

@Controller('capacidad')
export class CapacidadController {
  constructor(private readonly capacidadService: CapacidadService) {}

  @Post()
  create(@Body() createCapacidadDto: CreateCapacidadDto) {
    return this.capacidadService.create(createCapacidadDto);
  }

  @Get()
  findAll() {
    return this.capacidadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capacidadService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCapacidadDto: UpdateCapacidadDto) {
    return this.capacidadService.update(+id, updateCapacidadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capacidadService.remove(+id);
  }
}
