import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ComisionService } from './comision.service';
import { CreateComisionDto, UpdateComisionDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('comision')
@Controller('comision')
export class ComisionController {
  constructor(private readonly service: ComisionService) {}

  @Post()
  create(@Body() dto: CreateComisionDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateComisionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
