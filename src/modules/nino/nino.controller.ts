import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NinoService } from './nino.service';
import { CreateNinoDto } from './dto/create-nino.dto';
import { UpdateNinoDto } from './dto/update-nino.dto';

@Controller('nino')
export class NinoController {
  constructor(private readonly ninoService: NinoService) {}

  @Post()
  create(@Body() createNinoDto: CreateNinoDto) {
    return this.ninoService.create(createNinoDto);
  }

  @Get()
  findAll() {
    return this.ninoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ninoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNinoDto: UpdateNinoDto) {
    return this.ninoService.update(+id, updateNinoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ninoService.remove(+id);
  }
}
