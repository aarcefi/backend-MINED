import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CirculoInfantilService } from './circulo-infantil.service';
import { CreateCirculoInfantilDto, UpdateCirculoInfantilDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('circulo-infantil')
@Controller('circulo-infantil')
export class CirculoInfantilController {
  constructor(private readonly service: CirculoInfantilService) {}

  @Post()
  create(@Body() dto: CreateCirculoInfantilDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateCirculoInfantilDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
