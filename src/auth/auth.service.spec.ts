/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsuariosService } from '../modules/usuario/usuarios.service';
import { PerfilesService } from '../modules/perfiles/perfiles.service';
import { ValidacionIdentidadService } from '../modules/validacion-ficha-unica/validacion-ficha-unica.service';
import {
  createPrismaMock,
  PrismaMock,
  setupTransaction,
} from '../../test/prisma-mock';
import { RolUsuario } from '@prisma/client';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let usuariosService: any;
  let perfilesService: any;
  let validacion: any;
  let mailService: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = createPrismaMock();
    setupTransaction(prisma);

    usuariosService = {
      updateRefreshToken: jest.fn(),
      clearRefreshToken: jest.fn(),
      findByEmail: jest.fn(),
      findByCarnet: jest.fn(),
      getProfile: jest.fn(),
    };
    perfilesService = { findPerfilByUsuarioId: jest.fn() };
    validacion = { verificarCarnetIdentidad: jest.fn() };
    mailService = { sendPasswordResetEmail: jest.fn() };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    };
    configService = { get: jest.fn((_k, d) => d) };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
        { provide: UsuariosService, useValue: usuariosService },
        { provide: PerfilesService, useValue: perfilesService },
        { provide: ValidacionIdentidadService, useValue: validacion },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── validateUser ────────────────────────────────────────────
  describe('validateUser', () => {
    it('devuelve null si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('x@y.z', 'pw')).resolves.toBeNull();
    });

    it('devuelve null si la contraseña no coincide', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        password: 'h',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser('x@y.z', 'bad')).resolves.toBeNull();
    });

    it('devuelve el usuario sin password cuando es válido', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'x@y.z',
        password: 'h',
        rol: RolUsuario.SOLICITANTE,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const r = await service.validateUser('x@y.z', 'pw');
      expect(r).not.toHaveProperty('password');
      expect(r?.id).toBe('u1');
    });
  });

  // ── login ───────────────────────────────────────────────────
  describe('login', () => {
    it('lanza Unauthorized si credenciales inválidas', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);
      await expect(
        service.login({ email: 'a', password: 'b' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('devuelve tokens y persiste refresh token', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        rol: RolUsuario.SOLICITANTE,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        perfilSolicitante: { id: 'ps1' },
        municipioRel: { nombre: 'Plaza' },
        provinciaRel: { nombre: 'La Habana' },
      } as any);

      const r = await service.login({ email: 'a', password: 'b' } as any);
      expect(r.tokens).toHaveProperty('accessToken');
      expect(r.tokens).toHaveProperty('refreshToken');
      expect(usuariosService.updateRefreshToken).toHaveBeenCalledWith(
        'u1',
        'token',
      );
      expect(r.user.id).toBe('u1');
    });
  });

  // ── register ────────────────────────────────────────────────
  describe('register', () => {
    const buildDto = (over: any = {}) => ({
      email: 'a@b.c',
      password: 'pw',
      datosSolicitante: {
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        direccion: 'Calle X',
        municipio: 'Plaza',
        provincia: 'La Habana',
        tipoPersona: 'MADRE',
        centroTrabajo: 'H',
        ...over,
      },
    });

    it('lanza Conflict si el email ya existe', async () => {
      usuariosService.findByEmail.mockResolvedValue({ id: 'x' });
      await expect(service.register(buildDto() as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza Conflict si el carnet ya existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      usuariosService.findByCarnet.mockResolvedValue({ id: 'x' });
      await expect(service.register(buildDto() as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('lanza BadRequest si falta datosSolicitante', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      usuariosService.findByCarnet.mockResolvedValue(null);
      await expect(
        service.register({ email: 'x', password: 'y' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea usuario + perfil en éxito', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      usuariosService.findByCarnet.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      prisma.municipio.findFirst.mockResolvedValue({
        id: 'm1',
        provinciaId: 'p1',
      } as any);
      prisma.usuario.create.mockResolvedValue({ id: 'u1' } as any);
      prisma.perfilSolicitante.create.mockResolvedValue({} as any);
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        password: 'hashed',
        rol: RolUsuario.SOLICITANTE,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        perfilSolicitante: { id: 'ps1' },
      } as any);

      const r = await service.register(buildDto() as any);
      expect(r.id).toBe('u1');
      expect(prisma.usuario.create).toHaveBeenCalled();
      expect(prisma.perfilSolicitante.create).toHaveBeenCalled();
    });
  });

  // ── refreshTokens ───────────────────────────────────────────
  describe('refreshTokens', () => {
    it('lanza Unauthorized si no existe el usuario', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.refreshTokens('u1', 'rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza Unauthorized si no hay refreshToken guardado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        refreshToken: null,
      } as any);
      await expect(service.refreshTokens('u1', 'rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza Unauthorized si bcrypt falla', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        refreshToken: 'hashed',
        rol: RolUsuario.SOLICITANTE,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.refreshTokens('u1', 'rt')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('regenera tokens en éxito', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        refreshToken: 'hashed',
        rol: RolUsuario.SOLICITANTE,
        perfilSolicitante: { id: 'ps1' },
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const r = await service.refreshTokens('u1', 'rt');
      expect(r).toHaveProperty('accessToken');
      expect(usuariosService.updateRefreshToken).toHaveBeenCalled();
    });
  });

  // ── getProfile ──────────────────────────────────────────────
  describe('getProfile', () => {
    [
      RolUsuario.SOLICITANTE,
      RolUsuario.FUNCIONARIO_MUNICIPAL,
      RolUsuario.COMISION_OTORGAMIENTO,
      RolUsuario.DIRECTOR_CIRCULO,
    ].forEach((rol) => {
      it(`mapea perfil para ${rol}`, async () => {
        perfilesService.findPerfilByUsuarioId.mockResolvedValue({
          id: 'perfil1',
          usuario: {
            id: 'u1',
            email: 'a@b.c',
            rol,
            nombre: 'N',
            apellidos: 'A',
            carnetIdentidad: '123',
            telefono: '5',
            municipioRel: { nombre: 'Plaza' },
            provinciaRel: { nombre: 'La Habana' },
          },
          notificaciones: [],
        });

        const r = await service.getProfile('u1');
        expect(r.id).toBe('u1');
      });
    });

    it('cae al fallback cuando no hay perfil específico', async () => {
      perfilesService.findPerfilByUsuarioId.mockResolvedValue(null);
      usuariosService.getProfile.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        rol: RolUsuario.ADMINISTRADOR,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        municipioRel: { nombre: 'Plaza' },
        provinciaRel: { nombre: 'La Habana' },
      });

      const r = await service.getProfile('u1');
      expect(r.rol).toBe(RolUsuario.ADMINISTRADOR);
    });
  });

  // ── logout ──────────────────────────────────────────────────
  it('logout delega a clearRefreshToken', async () => {
    usuariosService.clearRefreshToken.mockResolvedValue({ message: 'ok' });
    await service.logout('u1');
    expect(usuariosService.clearRefreshToken).toHaveBeenCalledWith('u1');
  });

  // ── forgotPassword ──────────────────────────────────────────
  describe('forgotPassword', () => {
    it('devuelve mensaje genérico si no existe', async () => {
      usuariosService.findByEmail.mockResolvedValue(null);
      const r = await service.forgotPassword('x@y.z');
      expect(r.message).toContain('Si el email existe');
    });

    it('guarda código y envía correo si existe', async () => {
      usuariosService.findByEmail.mockResolvedValue({ id: 'u1' });
      prisma.usuario.update.mockResolvedValue({} as any);
      mailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      await service.forgotPassword('a@b.c');
      expect(prisma.usuario.update).toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  // ── resetPassword ───────────────────────────────────────────
  describe('resetPassword', () => {
    it('lanza Unauthorized si el token no existe', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'new')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('actualiza password en éxito', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' } as any);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      prisma.usuario.update.mockResolvedValue({} as any);
      await service.resetPassword('good', 'new');
      expect(prisma.usuario.update).toHaveBeenCalled();
    });
  });

  // ── parseExpiresIn (cubierto vía login) ────────────────────
  describe('parseExpiresIn (vía login)', () => {
    const usuarioBase = {
      id: 'u1',
      email: 'a@b.c',
      rol: RolUsuario.SOLICITANTE,
      nombre: 'N',
      apellidos: 'A',
      carnetIdentidad: '123',
      telefono: '5',
      perfilSolicitante: { id: 'ps1' },
      municipioRel: { nombre: 'Plaza' },
      provinciaRel: { nombre: 'La Habana' },
    };

    it.each([
      ['1h', 3600],
      ['30m', 1800],
      ['2d', 172800],
      ['1w', 604800],
    ])('interpreta JWT_EXPIRES_IN=%s como %i segundos', async (exp, seg) => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(usuarioBase as any);
      // Solo la PRIMERA llamada a configService.get (access token) usa `exp`; la segunda usa default.
      configService.get.mockReturnValueOnce(exp).mockReturnValueOnce('604800');

      await service.login({ email: 'a', password: 'b' } as any);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: seg }),
      );
    });

    it('usa 3600 por defecto si la unidad no es válida', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(usuarioBase as any);
      configService.get
        .mockReturnValueOnce('1x') // unidad inválida
        .mockReturnValueOnce('604800');

      await service.login({ email: 'a', password: 'b' } as any);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ expiresIn: 3600 }),
      );
    });
  });

  // ── createUsuarioResponse con ADMINISTRADOR ────────────────
  describe('createUsuarioResponse ADMINISTRADOR', () => {
    it('no añade perfil cuando el rol es ADMINISTRADOR', async () => {
      perfilesService.findPerfilByUsuarioId.mockResolvedValue(null);
      usuariosService.getProfile.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        rol: RolUsuario.ADMINISTRADOR,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        municipioRel: { nombre: 'Plaza' },
        provinciaRel: { nombre: 'La Habana' },
        notificaciones: [],
      });

      const r = await service.getProfile('u1');
      expect(r.rol).toBe(RolUsuario.ADMINISTRADOR);
      expect(r.perfilSolicitante).toBeUndefined();
      expect(r.perfilFuncionario).toBeUndefined();
      expect(r.perfilComision).toBeUndefined();
      expect(r.perfilDirector).toBeUndefined();
    });
  });

    // ── parseExpiresIn: unidad 's' y ADMINISTRADOR ─────────────
  it('interpreta JWT_EXPIRES_IN con unidad "s"', async () => {
    jest.spyOn(service, 'validateUser').mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      rol: RolUsuario.SOLICITANTE,
      nombre: 'N',
      apellidos: 'A',
      carnetIdentidad: '123',
      telefono: '5',
      perfilSolicitante: { id: 'ps1' },
      municipioRel: { nombre: 'Plaza' },
      provinciaRel: { nombre: 'La Habana' },
    } as any);

    configService.get.mockReturnValueOnce('60s').mockReturnValueOnce('604800');

    await service.login({ email: 'a', password: 'b' } as any);

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ expiresIn: 60 }),
    );
  });

  it('createUsuarioResponse no añade perfil cuando es ADMINISTRADOR', async () => {
    perfilesService.findPerfilByUsuarioId.mockResolvedValue(null);
    usuariosService.getProfile.mockResolvedValue({
      id: 'u1',
      email: 'a@b.c',
      rol: RolUsuario.ADMINISTRADOR,
      nombre: 'N',
      apellidos: 'A',
      carnetIdentidad: '123',
      telefono: '5',
      municipioRel: { nombre: 'Plaza' },
      provinciaRel: { nombre: 'La Habana' },
      notificaciones: [],
    });

    const r = await service.getProfile('u1');
    expect(r.rol).toBe(RolUsuario.ADMINISTRADOR);
    expect(r.perfilSolicitante).toBeUndefined();
    expect(r.perfilFuncionario).toBeUndefined();
    expect(r.perfilComision).toBeUndefined();
    expect(r.perfilDirector).toBeUndefined();
  });

  it('createUsuarioResponse incluye notificaciones si existen', async () => {
    perfilesService.findPerfilByUsuarioId.mockResolvedValue({
      id: 'perfil1',
      usuario: {
        id: 'u1',
        email: 'a@b.c',
        rol: RolUsuario.SOLICITANTE,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        municipioRel: { nombre: 'Plaza' },
        provinciaRel: { nombre: 'La Habana' },
      },
      notificaciones: [{ id: 'n1', mensaje: 'hola' }],
    });

    const r = await service.getProfile('u1');
    expect(r.notificaciones).toEqual([{ id: 'n1', mensaje: 'hola' }]);
  });

  it('createUsuarioResponse incluye el circulo cuando perfilDirector tiene circulo', async () => {
    perfilesService.findPerfilByUsuarioId.mockResolvedValue({
      id: 'perfil1',
      usuario: {
        id: 'u1',
        email: 'a@b.c',
        rol: RolUsuario.DIRECTOR_CIRCULO,
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        municipioRel: { nombre: 'Plaza' },
        provinciaRel: { nombre: 'La Habana' },
      },
      notificaciones: [],
      circuloId: 'c1',
      circulo: { id: 'c1', nombre: 'Mi Círculo' },
    });

    const r = await service.getProfile('u1');
    expect(r.perfilDirector?.circulo).toEqual({
      id: 'c1',
      nombre: 'Mi Círculo',
    });
  });
});
