import { Test, TestingModule } from '@nestjs/testing';
import { SesionController } from './sesion.controller';
import { SesionService } from './sesion.service';

describe('SesionController', () => {
  let controller: SesionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SesionController],
      providers: [SesionService],
    }).compile();

    controller = module.get<SesionController>(SesionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
