import { Injectable } from '@nestjs/common';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { UpdateMatriculaDto } from './dto/update-matricula.dto';

@Injectable()
export class MatriculaService {
  create(createMatriculaDto: CreateMatriculaDto) {
    return 'This action adds a new matricula';
  }

  findAll() {
    return `This action returns all matricula`;
  }

  findOne(id: number) {
    return `This action returns a #${id} matricula`;
  }

  update(id: number, updateMatriculaDto: UpdateMatriculaDto) {
    return `This action updates a #${id} matricula`;
  }

  remove(id: number) {
    return `This action removes a #${id} matricula`;
  }
}
