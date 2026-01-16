import { Injectable } from '@nestjs/common';
import { CreateComisionDto } from './dto/create-comision.dto';
import { UpdateComisionDto } from './dto/update-comision.dto';

@Injectable()
export class ComisionService {
  create(createComisionDto: CreateComisionDto) {
    return 'This action adds a new comision';
  }

  findAll() {
    return `This action returns all comision`;
  }

  findOne(id: number) {
    return `This action returns a #${id} comision`;
  }

  update(id: number, updateComisionDto: UpdateComisionDto) {
    return `This action updates a #${id} comision`;
  }

  remove(id: number) {
    return `This action removes a #${id} comision`;
  }
}
