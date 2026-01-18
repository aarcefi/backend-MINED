import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { NinoService } from './nino.service';
import { CreateNinoDto, UpdateNinoDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('nino')
@Controller('nino')
export class NinoController {
  constructor(private readonly ninoService: NinoService) {}

  @Post()
  create(@Body() dto: CreateNinoDto) {
    return this.ninoService.create(dto);
  }

  @Get()
  findAll() {
    return this.ninoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ninoService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNinoDto) {
    return this.ninoService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ninoService.remove(id);
  }
}
