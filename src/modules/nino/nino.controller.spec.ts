import { Test, TestingModule } from '@nestjs/testing';
import { NinoController } from './nino.controller';
import { NinoService } from './nino.service';

describe('NinoController', () => {
  let controller: NinoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NinoController],
      providers: [NinoService],
    }).compile();

    controller = module.get<NinoController>(NinoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
