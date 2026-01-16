import { Test, TestingModule } from '@nestjs/testing';
import { ComisionController } from './comision.controller';
import { ComisionService } from './comision.service';

describe('ComisionController', () => {
  let controller: ComisionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComisionController],
      providers: [ComisionService],
    }).compile();

    controller = module.get<ComisionController>(ComisionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
