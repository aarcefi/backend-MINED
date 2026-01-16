import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TrazabilidadService } from './trazabilidad.service';
import { CreateTrazabilidadDto } from './dto/create-trazabilidad.dto';
import { UpdateTrazabilidadDto } from './dto/update-trazabilidad.dto';

@Controller('trazabilidad')
export class TrazabilidadController {
  constructor(private readonly trazabilidadService: TrazabilidadService) {}

  @Post()
  create(@Body() createTrazabilidadDto: CreateTrazabilidadDto) {
    return this.trazabilidadService.create(createTrazabilidadDto);
  }

  @Get()
  findAll() {
    return this.trazabilidadService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trazabilidadService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTrazabilidadDto: UpdateTrazabilidadDto) {
    return this.trazabilidadService.update(+id, updateTrazabilidadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trazabilidadService.remove(+id);
  }
}
