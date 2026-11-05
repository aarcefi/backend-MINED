import { Test, TestingModule } from '@nestjs/testing';
import { CirculoInfantilController } from './circulo-infantil.controller';
import { CirculoInfantilService } from './circulo-infantil.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('CirculoInfantilController', () => {
  let controller: CirculoInfantilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CirculoInfantilController],
      providers: [
        CirculoInfantilService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CirculoInfantilController>(
      CirculoInfantilController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
