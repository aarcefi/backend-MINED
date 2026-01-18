import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SesionComisionService } from './sesion.service';
import { CreateSesionDto, UpdateSesionDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('sesion-comision')
@Controller('sesion-comision')
export class SesionComisionController {
  constructor(private readonly service: SesionComisionService) {}

  @Post()
  create(@Body() dto: CreateSesionDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateSesionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
