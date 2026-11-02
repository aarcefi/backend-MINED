import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  exigirBaseDePruebas,
  PrismaService,
} from '../../prisma/prisma.service';

describe('exigirBaseDePruebas', () => {
  it('should reject the development database', () => {
    expect(() =>
      exigirBaseDePruebas('postgresql://u:p@localhost:5432/bd-mined'),
    ).toThrow('bd-mined');
  });

  it('should reject a missing url', () => {
    expect(() => exigirBaseDePruebas(undefined)).toThrow();
  });

  it('should reject a name that only contains test', () => {
    expect(() =>
      exigirBaseDePruebas('postgresql://u:p@localhost:5432/testimonios'),
    ).toThrow();
  });

  it('should accept a database ending in _test', () => {
    expect(() =>
      exigirBaseDePruebas(
        'postgresql://u:p@localhost:5432/bd_mined_test?schema=public',
      ),
    ).not.toThrow();
  });

  it('should stop PrismaService before connecting to a real database', () => {
    const config = {
      get: () => 'postgresql://u:p@localhost:5432/bd-mined',
    } as unknown as ConfigService;
    expect(() => new PrismaService(config)).toThrow('bd-mined');
  });

  it('should not resolve the .env database during tests', async () => {
    const modulo = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
    }).compile();
    const url = modulo.get(ConfigService).get<string>('DATABASE_URL');
    expect(() => exigirBaseDePruebas(url)).not.toThrow();
  });
});
