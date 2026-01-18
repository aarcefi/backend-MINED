import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { CreateMatriculaDto, UpdateMatriculaDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('matricula')
@Controller('matricula')
export class MatriculaController {
  constructor(private readonly service: MatriculaService) {}

  @Post()
  create(@Body() dto: CreateMatriculaDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateMatriculaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
