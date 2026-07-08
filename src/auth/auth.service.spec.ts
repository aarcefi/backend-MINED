/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { UsuariosService } from '../modules/usuario/usuarios.service';
import { PerfilesService } from '../modules/perfiles/perfiles.service';
import { ValidacionIdentidadService } from '../modules/validacion-ficha-unica/validacion-ficha-unica.service';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { RolUsuario } from '@prisma/client';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mailService: MailService;
  let usuariosService: UsuariosService;
  let validacionService: ValidacionIdentidadService;

  const mockUser = {
    id: 'user-id-1',
    email: 'test@example.com',
    password: 'hashed',
    rol: RolUsuario.SOLICITANTE,
    nombre: 'Test',
    apellidos: 'User',
    carnetIdentidad: '85010112345',
    telefono: '+5351234567',
    municipio: 'La Habana',
    provincia: 'La Habana',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: null,
    tokenExpiry: null,
    resetPasswordCode: null,
    resetPasswordExpiry: null,
    perfilSolicitante: { id: 'profile-1' },
    perfilFuncionario: null,
    perfilComision: null,
    perfilDirector: null,
    notificaciones: [],
  };

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    perfilSolicitante: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockImplementation((payload, options) => {
      if (options?.expiresIn === 604800) {
        return Promise.resolve('refresh-token');
      }
      return Promise.resolve('access-token');
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'JWT_EXPIRES_IN') return '3600';
      if (key === 'JWT_REFRESH_EXPIRES_IN') return '604800';
      return undefined;
    }),
  };

  const mockMailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockUsuariosService = {
    findByEmail: jest.fn(),
    findByCarnet: jest.fn(),
    updateRefreshToken: jest.fn().mockResolvedValue({ message: 'ok' }),
    clearRefreshToken: jest.fn().mockResolvedValue({ message: 'ok' }),
    getProfile: jest.fn().mockResolvedValue(mockUser),
  };

  const mockPerfilesService = {
    findPerfilByUsuarioId: jest.fn().mockResolvedValue({
      usuario: mockUser,
      notificaciones: [],
      ...mockUser.perfilSolicitante,
    }),
  };

  const mockValidacionService = {
    verificarCarnetIdentidad: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: PerfilesService, useValue: mockPerfilesService },
        {
          provide: ValidacionIdentidadService,
          useValue: mockValidacionService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    mailService = module.get<MailService>(MailService);
    usuariosService = module.get<UsuariosService>(UsuariosService);
    validacionService = module.get<ValidacionIdentidadService>(
      ValidacionIdentidadService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are correct', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).not.toHaveProperty('password');
    });

    it('should return null if user not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
      const result = await service.validateUser('notfound@example.com', 'pass');
      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      const result = await service.validateUser('test@example.com', 'wrong');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return tokens and user response on successful login', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };

      const result = await service.login(loginDto);
      expect(result).toHaveProperty('tokens');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id', mockUser.id);
      expect(usuariosService.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'refresh-token',
      );
    });

    it('should throw UnauthorizedException if validation fails', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrong' };
      jest.spyOn(service, 'validateUser').mockResolvedValueOnce(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'password123',
      datosSolicitante: {
        carnetIdentidad: '85010112345',
        nombre: 'New',
        apellidos: 'User',
        telefono: '+5351234567',
        municipio: 'Habana',
        provincia: 'Habana',
        tipoPersona: 'MADRE' as any,
        cantHijos: 1,
        direccion: 'Calle 123',
        centroTrabajo: 'Oficina',
      },
    };

    it('should throw ConflictException if email already exists', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce({ id: 'existing' });
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if carnet already registered', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce(null);
      mockUsuariosService.findByCarnet.mockResolvedValueOnce({
        id: 'existing',
      });
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if datosSolicitante missing', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce(null);
      mockUsuariosService.findByCarnet.mockResolvedValueOnce(null);
      const dto = { ...registerDto, datosSolicitante: undefined };
      await expect(service.register(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should register successfully and return user response', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce(null);
      mockUsuariosService.findByCarnet.mockResolvedValueOnce(null);
      mockValidacionService.verificarCarnetIdentidad.mockResolvedValueOnce(
        true,
      );
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed');
      mockPrisma.$transaction.mockImplementationOnce(async (cb) => {
        const tx = mockPrisma;
        tx.usuario.create = jest.fn().mockResolvedValueOnce({
          id: 'new-user-id',
          ...registerDto,
          rol: RolUsuario.SOLICITANTE,
          activo: true,
        });
        tx.perfilSolicitante.create = jest
          .fn()
          .mockResolvedValueOnce({ id: 'profile-1' });
        tx.usuario.findUnique = jest.fn().mockResolvedValueOnce({
          ...mockUser,
          id: 'new-user-id',
          email: registerDto.email,
          carnetIdentidad: registerDto.datosSolicitante.carnetIdentidad,
          perfilSolicitante: { id: 'profile-1' },
        });
        return cb(tx);
      });

      const result = await service.register(registerDto);
      expect(result).toHaveProperty('id', 'new-user-id');
      expect(result.email).toBe(registerDto.email);
    });
  });

  describe('logout', () => {
    it('should call clearRefreshToken and return message', async () => {
      const result = await service.logout('user-id');
      expect(usuariosService.clearRefreshToken).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens if refresh token is valid', async () => {
      const mockUserWithRefresh = {
        ...mockUser,
        refreshToken: 'hashed-refresh',
      };
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(mockUserWithRefresh);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const result = await service.refreshTokens('user-id', 'refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(usuariosService.updateRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'new-refresh',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
      await expect(service.refreshTokens('user-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has no refresh token', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValueOnce({
        ...mockUser,
        refreshToken: null,
      });
      await expect(service.refreshTokens('user-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const mockUserWithRefresh = {
        ...mockUser,
        refreshToken: 'hashed-refresh',
      };
      mockPrisma.usuario.findUnique.mockResolvedValueOnce(mockUserWithRefresh);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(service.refreshTokens('user-id', 'token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getProfile', () => {
    it('should return profile using PerfilesService if perfil exists', async () => {
      const perfilData = {
        usuario: mockUser,
        notificaciones: [],
        id: 'profile-1',
        direccion: 'Calle',
        centroTrabajo: 'Oficina',
        tipoPersona: 'MADRE',
        cantHijos: 1,
      };
      mockPerfilesService.findPerfilByUsuarioId.mockResolvedValueOnce(
        perfilData,
      );
      const result = await service.getProfile('user-id');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('perfilSolicitante');
      expect(result.perfilSolicitante).toHaveProperty('direccion', 'Calle');
    });

    it('should fallback to UsuariosService.getProfile if no perfil found', async () => {
      mockPerfilesService.findPerfilByUsuarioId.mockResolvedValueOnce(null);
      mockUsuariosService.getProfile.mockResolvedValueOnce(mockUser);
      const result = await service.getProfile('user-id');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).not.toHaveProperty('perfilSolicitante');
    });
  });

  describe('forgotPassword', () => {
    it('should generate code and send email if user exists', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce({
        ...mockUser,
        id: 'user-id',
      });
      mockPrisma.usuario.update.mockResolvedValueOnce({});
      const result = await service.forgotPassword('test@example.com');
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toContain('Si el email existe');
    });

    it('should return generic message even if user not found (security)', async () => {
      mockUsuariosService.findByEmail.mockResolvedValueOnce(null);
      const result = await service.forgotPassword('nonexistent@example.com');
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toContain('Si el email existe');
    });
  });

  describe('resetPassword', () => {
    it('should reset password if token is valid', async () => {
      const token = '123456';
      const newPassword = 'newPass123';
      const userWithToken = {
        ...mockUser,
        resetPasswordCode: token,
        resetPasswordExpiry: new Date(Date.now() + 60000),
      };
      mockPrisma.usuario.findFirst.mockResolvedValueOnce(userWithToken);
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('new-hashed');
      mockPrisma.usuario.update.mockResolvedValueOnce({});
      const result = await service.resetPassword(token, newPassword);
      expect(result.message).toBe('Contraseña actualizada exitosamente');
    });

    it('should throw UnauthorizedException if token invalid or expired', async () => {
      mockPrisma.usuario.findFirst.mockResolvedValueOnce(null);
      await expect(service.resetPassword('invalid', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateTokens (private)', () => {
    it('should generate tokens with correct payload', async () => {
      const spySign = jest.spyOn(jwtService, 'signAsync');
      const tokens = await service['generateTokens'](mockUser);
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(spySign).toHaveBeenCalledTimes(2);
    });

    it('should extract perfilId based on role', async () => {
      const userWithPerfilFuncionario = {
        ...mockUser,
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        perfilFuncionario: { id: 'func-profile' },
      };
      const tokens = await service['generateTokens'](userWithPerfilFuncionario);
      expect(tokens).toBeDefined();
    });
  });

  describe('updateRefreshToken (private)', () => {
    it('should hash and store refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed-refresh');
      await service['updateRefreshToken']('user-id', 'refresh-token');
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: expect.objectContaining({
          refreshToken: 'hashed-refresh',
          tokenExpiry: expect.any(Date),
        }),
      });
    });
  });

  describe('createUsuarioResponse (private)', () => {
    it('should format response for SOLICITANTE', () => {
      const userWithPerfil = {
        ...mockUser,
        perfilSolicitante: {
          id: 'p1',
          usuarioId: 'u1',
          direccion: 'Calle',
          centroTrabajo: 'Oficina',
          tipoPersona: 'MADRE',
          cantHijos: 1,
        },
        notificaciones: [],
      };
      const response = service['createUsuarioResponse'](userWithPerfil);
      expect(response).toHaveProperty('perfilSolicitante');
      expect(response.perfilSolicitante).toHaveProperty('direccion', 'Calle');
    });

    it('should format response for FUNCIONARIO_MUNICIPAL', () => {
      const user = {
        ...mockUser,
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        perfilFuncionario: { id: 'p2', usuarioId: 'u1', cargo: 'Jefe' },
      };
      const response = service['createUsuarioResponse'](user);
      expect(response).toHaveProperty('perfilFuncionario');
      expect(response.perfilFuncionario).toHaveProperty('cargo', 'Jefe');
    });

    it('should format response for COMISION_OTORGAMIENTO', () => {
      const user = {
        ...mockUser,
        rol: RolUsuario.COMISION_OTORGAMIENTO,
        perfilComision: { id: 'p3', usuarioId: 'u1', cargo: 'Presidente' },
      };
      const response = service['createUsuarioResponse'](user);
      expect(response).toHaveProperty('perfilComision');
    });

    it('should format response for DIRECTOR_CIRCULO', () => {
      const user = {
        ...mockUser,
        rol: RolUsuario.DIRECTOR_CIRCULO,
        perfilDirector: {
          id: 'p4',
          usuarioId: 'u1',
          circuloId: 'c1',
          circulo: { id: 'c1', nombre: 'Circulo' },
        },
      };
      const response = service['createUsuarioResponse'](user);
      expect(response).toHaveProperty('perfilDirector');
      expect(response.perfilDirector).toHaveProperty('circulo');
    });

    it('should include notificaciones if present', () => {
      const user = {
        ...mockUser,
        notificaciones: [{ id: 'n1', titulo: 'Test' }],
      };
      const response = service['createUsuarioResponse'](user);
      expect(response).toHaveProperty('notificaciones');
      expect(response.notificaciones).toHaveLength(1);
    });
  });
});
