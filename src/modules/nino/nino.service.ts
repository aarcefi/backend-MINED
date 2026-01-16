import { Injectable } from '@nestjs/common';
import { CreateNinoDto } from './dto/create-nino.dto';
import { UpdateNinoDto } from './dto/update-nino.dto';

@Injectable()
export class NinoService {
  create(createNinoDto: CreateNinoDto) {
    return 'This action adds a new nino';
  }

  findAll() {
    return `This action returns all nino`;
  }

  findOne(id: number) {
    return `This action returns a #${id} nino`;
  }

  update(id: number, updateNinoDto: UpdateNinoDto) {
    return `This action updates a #${id} nino`;
  }

  remove(id: number) {
    return `This action removes a #${id} nino`;
  }
}
