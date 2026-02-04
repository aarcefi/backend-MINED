import { Test, TestingModule } from '@nestjs/testing';
import { CirculoInfantilController } from './circulo-infantil.controller';
import { CirculoInfantilService } from './circulo-infantil.service';

describe('CirculoInfantilController', () => {
  let controller: CirculoInfantilController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CirculoInfantilController],
      providers: [CirculoInfantilService],
    }).compile();

    controller = module.get<CirculoInfantilController>(CirculoInfantilController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
