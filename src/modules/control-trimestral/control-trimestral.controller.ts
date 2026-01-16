import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ControlTrimestralService } from './control-trimestral.service';
import { CreateControlTrimestralDto } from './dto/create-control-trimestral.dto';
import { UpdateControlTrimestralDto } from './dto/update-control-trimestral.dto';

@Controller('control-trimestral')
export class ControlTrimestralController {
  constructor(private readonly controlTrimestralService: ControlTrimestralService) {}

  @Post()
  create(@Body() createControlTrimestralDto: CreateControlTrimestralDto) {
    return this.controlTrimestralService.create(createControlTrimestralDto);
  }

  @Get()
  findAll() {
    return this.controlTrimestralService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.controlTrimestralService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateControlTrimestralDto: UpdateControlTrimestralDto) {
    return this.controlTrimestralService.update(+id, updateControlTrimestralDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.controlTrimestralService.remove(+id);
  }
}
