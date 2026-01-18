import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PeriodoService } from './periodo.service';
import { CreatePeriodoDto, UpdatePeriodoDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('periodo-otorgamiento')
@Controller('periodo-otorgamiento')
export class PeriodoOtorgamientoController {
  constructor(private readonly service: PeriodoService) {}

  @Post()
  create(@Body() dto: CreatePeriodoDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdatePeriodoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
