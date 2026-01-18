import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DocumentoService } from './documento.service';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('documento-solicitud')
@Controller('documento-solicitud')
export class DocumentoController {
  constructor(private readonly service: DocumentoService) {}

  @Post()
  create(@Body() dto: CreateDocumentoDto) {
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
  update(@Param('id') id: string, @Body() dto: UpdateDocumentoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
