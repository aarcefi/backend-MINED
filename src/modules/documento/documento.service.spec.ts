import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { DocumentoService } from './documento.service';

describe('DocumentoService', () => {
  const dto = {
    solicitudId: 'solicitud-1',
    tipoDocumento: 'CARNET',
  } as any;
  const dueno = { rol: 'SOLICITANTE', perfilId: 'perfil-1' };
  const pdf = {
    // "carné.pdf" tal como lo entrega multer, en latin1
    originalname: Buffer.from('carné.pdf', 'utf8').toString('latin1'),
    buffer: Buffer.from('%PDF-1.7 contenido'),
  };

  let service: DocumentoService;
  let directorio: string;
  let prisma: any;

  beforeEach(async () => {
    directorio = await mkdtemp(join(tmpdir(), 'documentos-'));
    process.env.UPLOADS_DIR = directorio;

    prisma = {
      solicitud: {
        findUnique: jest.fn().mockResolvedValue({ solicitanteId: 'perfil-1' }),
      },
      documentoSolicitud: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'doc-1', ...data })),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentoService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DocumentoService>(DocumentoService);
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await rm(directorio, { recursive: true, force: true });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('guarda el archivo y registra el documento sin validar', async () => {
    const documento = await service.upload(dto, pdf, dueno);

    expect(documento.nombreArchivo).toBe('carné.pdf');
    expect(documento.validado).toBe(false);
    expect(documento.archivoUrl).toMatch(/\.pdf$/);
    expect(await readFile(join(directorio, documento.archivoUrl))).toEqual(
      pdf.buffer,
    );
  });

  it('exige un archivo', async () => {
    await expect(service.upload(dto, undefined, dueno)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza contenido que no es PDF, JPG ni PNG', async () => {
    const falso = { originalname: 'virus.pdf', buffer: Buffer.from('MZ...') };

    await expect(service.upload(dto, falso, dueno)).rejects.toThrow(
      BadRequestException,
    );
    expect(await readdir(directorio)).toEqual([]);
  });

  it('no deja a un solicitante subir a una solicitud ajena', async () => {
    const otro = { rol: 'SOLICITANTE', perfilId: 'perfil-2' };

    await expect(service.upload(dto, pdf, otro)).rejects.toThrow(
      ForbiddenException,
    );
    expect(await readdir(directorio)).toEqual([]);
  });

  it('borra el archivo si falla el registro en base de datos', async () => {
    prisma.documentoSolicitud.create.mockRejectedValue(new Error('db'));

    await expect(service.upload(dto, pdf, dueno)).rejects.toThrow('db');
    expect(await readdir(directorio)).toEqual([]);
  });

  describe('obtenerArchivo', () => {
    const conDocumento = (documento: object) =>
      prisma.documentoSolicitud.findUnique.mockResolvedValue({
        nombreArchivo: 'carné.pdf',
        solicitud: { solicitanteId: 'perfil-1' },
        ...documento,
      });

    it('entrega el archivo guardado a su dueño', async () => {
      const { archivoUrl } = await service.upload(dto, pdf, dueno);
      conDocumento({ archivoUrl });

      const { stream, mimeType } = await service.obtenerArchivo('doc-1', dueno);
      stream.destroy();

      expect(mimeType).toBe('application/pdf');
    });

    it('no entrega documentos ajenos a un solicitante', async () => {
      conDocumento({ archivoUrl: 'a.pdf' });

      await expect(
        service.obtenerArchivo('doc-1', {
          rol: 'SOLICITANTE',
          perfilId: 'perfil-2',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite el acceso del personal de revisión', async () => {
      const { archivoUrl } = await service.upload(dto, pdf, dueno);
      conDocumento({ archivoUrl });

      const { stream } = await service.obtenerArchivo('doc-1', {
        rol: 'COMISION_OTORGAMIENTO',
      });
      stream.destroy();

      expect(stream).toBeDefined();
    });

    it('no sale del directorio de documentos', async () => {
      conDocumento({ archivoUrl: '../../.env' });

      await expect(service.obtenerArchivo('doc-1', dueno)).rejects.toThrow(
        'El archivo no está disponible',
      );
    });
  });
});
