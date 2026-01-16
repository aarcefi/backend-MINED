import { Injectable } from '@nestjs/common';
import { CreateTrazabilidadDto } from './dto/create-trazabilidad.dto';
import { UpdateTrazabilidadDto } from './dto/update-trazabilidad.dto';

@Injectable()
export class TrazabilidadService {
  create(createTrazabilidadDto: CreateTrazabilidadDto) {
    return 'This action adds a new trazabilidad';
  }

  findAll() {
    return `This action returns all trazabilidad`;
  }

  findOne(id: number) {
    return `This action returns a #${id} trazabilidad`;
  }

  update(id: number, updateTrazabilidadDto: UpdateTrazabilidadDto) {
    return `This action updates a #${id} trazabilidad`;
  }

  remove(id: number) {
    return `This action removes a #${id} trazabilidad`;
  }
}
