import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CirculoInfantilService } from './circulo-infantil.service';
import { CreateCirculoInfantilDto } from './dto/create-circulo-infantil.dto';
import { UpdateCirculoInfantilDto } from './dto/update-circulo-infantil.dto';

@Controller('circulo-infantil')
export class CirculoInfantilController {
  constructor(private readonly circuloInfantilService: CirculoInfantilService) {}

  @Post()
  create(@Body() createCirculoInfantilDto: CreateCirculoInfantilDto) {
    return this.circuloInfantilService.create(createCirculoInfantilDto);
  }

  @Get()
  findAll() {
    return this.circuloInfantilService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.circuloInfantilService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCirculoInfantilDto: UpdateCirculoInfantilDto) {
    return this.circuloInfantilService.update(+id, updateCirculoInfantilDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.circuloInfantilService.remove(+id);
  }
}
