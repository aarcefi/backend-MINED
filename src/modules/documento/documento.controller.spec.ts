import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DocumentoController } from './documento.controller';
import { DocumentoService, TAMANO_MAXIMO_ARCHIVO } from './documento.service';

describe('DocumentoController', () => {
  const solicitudId = '11111111-1111-4111-8111-111111111111';
  const documentoId = '22222222-2222-4222-8222-222222222222';
  const contenido = Buffer.from('%PDF-1.7 contenido de prueba');

  let app: INestApplication;
  let directorio: string;
  let guardado: any;

  beforeEach(async () => {
    directorio = await mkdtemp(join(tmpdir(), 'documentos-'));
    process.env.UPLOADS_DIR = directorio;

    const prisma = {
      solicitud: {
        findUnique: jest.fn().mockResolvedValue({ solicitanteId: 'perfil-1' }),
      },
      documentoSolicitud: {
        create: jest.fn(({ data }) => {
          guardado = { id: documentoId, ...data };
          return Promise.resolve(guardado);
        }),
        findUnique: jest.fn(() =>
          Promise.resolve({
            ...guardado,
            solicitud: { solicitanteId: 'perfil-1' },
          }),
        ),
      },
    };

    const usuario = { rol: 'SOLICITANTE', perfilId: 'perfil-1' };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentoController],
      providers: [
        DocumentoService,
        { provide: PrismaService, useValue: prisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = usuario;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    delete process.env.UPLOADS_DIR;
    await rm(directorio, { recursive: true, force: true });
  });

  const subir = (archivo: Buffer, nombre = 'carné.pdf') =>
    request(app.getHttpServer())
      .post('/documentos-solicitud/upload')
      .field('solicitudId', solicitudId)
      .field('tipoDocumento', 'CARNET')
      .attach('file', archivo, nombre);

  it('sube un archivo por multipart y lo devuelve íntegro', async () => {
    const subida = await subir(contenido).expect(201);
    expect(subida.body.nombreArchivo).toBe('carné.pdf');

    const descarga = await request(app.getHttpServer())
      .get(`/documentos-solicitud/${documentoId}/download`)
      .buffer(true)
      .parse((res, callback) => {
        const partes: Buffer[] = [];
        res.on('data', (parte: Buffer) => partes.push(parte));
        res.on('end', () => callback(null, Buffer.concat(partes)));
      })
      .expect(200);

    expect(descarga.headers['content-type']).toContain('application/pdf');
    expect(descarga.headers['content-disposition']).toContain(
      encodeURIComponent('carné.pdf'),
    );
    expect(descarga.body).toEqual(contenido);
  });

  it('rechaza archivos de más de 5MB', async () => {
    await subir(Buffer.alloc(TAMANO_MAXIMO_ARCHIVO + 1)).expect(413);
  });

  it('valida los campos del formulario', async () => {
    await request(app.getHttpServer())
      .post('/documentos-solicitud/upload')
      .field('solicitudId', 'no-es-uuid')
      .field('tipoDocumento', 'CARNET')
      .attach('file', contenido, 'carnet.pdf')
      .expect(400);
  });
});
