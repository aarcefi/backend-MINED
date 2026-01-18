import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ControlTrimestralService } from './control-trimestral.service';
import { CreateControlTrimestralDto, UpdateControlTrimestralDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('control-trimestral')
@Controller('control-trimestral')
export class ControlTrimestralController {
  constructor(private readonly service: ControlTrimestralService) {}

  @Post()
  create(@Body() dto: CreateControlTrimestralDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateControlTrimestralDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
