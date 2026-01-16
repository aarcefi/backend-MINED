import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { UpdateMatriculaDto } from './dto/update-matricula.dto';

@Controller('matricula')
export class MatriculaController {
  constructor(private readonly matriculaService: MatriculaService) {}

  @Post()
  create(@Body() createMatriculaDto: CreateMatriculaDto) {
    return this.matriculaService.create(createMatriculaDto);
  }

  @Get()
  findAll() {
    return this.matriculaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.matriculaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMatriculaDto: UpdateMatriculaDto) {
    return this.matriculaService.update(+id, updateMatriculaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.matriculaService.remove(+id);
  }
}
