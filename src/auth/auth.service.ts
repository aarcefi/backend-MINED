/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/token.dto';
import { ConfigService } from '@nestjs/config';
import { RolUsuario } from '@prisma/client';
import { UsuarioSinPassword } from './types';
import { LoginResponseDto } from './dto/login-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

function parseExpiresIn(expiresIn: string): number {
  if (!isNaN(Number(expiresIn))) {
    return Number(expiresIn);
  }

  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's': // segundos
      return value;
    case 'm': // minutos
      return value * 60;
    case 'h': // horas
      return value * 60 * 60;
    case 'd': // días
      return value * 60 * 60 * 24;
    case 'w': // semanas
      return value * 60 * 60 * 24 * 7;
    default:
      return 3600;
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UsuarioSinPassword | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
      },
    });

    if (!usuario) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword as UsuarioSinPassword;
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const usuario = await this.validateUser(loginDto.email, loginDto.password);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const tokens = await this.generateTokens(usuario);
    await this.updateRefreshToken(usuario.id, tokens.refreshToken);

    const userResponse = this.createUsuarioResponse(usuario);

    return {
      tokens,
      user: userResponse,
    };
  }

  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const existingUser = await this.prisma.usuario.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const existingCarnet = await this.prisma.perfilSolicitante.findUnique({
      where: { carnetIdentidad: registerDto.datosSolicitante.carnetIdentidad },
    });

    if (existingCarnet) {
      throw new ConflictException('El carnet de identidad ya está registrado');
    }

    if (!registerDto.datosSolicitante) {
      throw new BadRequestException('Datos del solicitante son requeridos');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const usuario = await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.usuario.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          rol: RolUsuario.SOLICITANTE,
          activo: true,
        },
      });

      await prisma.perfilSolicitante.create({
        data: {
          usuarioId: newUser.id,
          ...registerDto.datosSolicitante,
        },
      });

      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id: newUser.id },
        include: {
          perfilSolicitante: true,
        },
      });

      if (!usuarioCompleto) {
        throw new Error('Error al crear usuario');
      }

      const { password, ...usuarioSinPassword } = usuarioCompleto;
      return usuarioSinPassword;
    });

    return this.createUsuarioResponse(usuario);
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        tokenExpiry: null,
      },
    });

    return { message: 'Sesión cerrada exitosamente' };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokensDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.refreshToken) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      usuario.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Acceso denegado');
    }

    const tokens = await this.generateTokens(usuario);
    await this.updateRefreshToken(usuario.id, tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(usuario: any): Promise<TokensDto> {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    // Obtener tiempos de expiración usando nuestra función helper
    const accessTokenExpiresIn = parseExpiresIn(
      this.configService.get<string>('JWT_EXPIRES_IN', '3600'), // Default: 3600 segundos (1 hora)
    );

    const refreshTokenExpiresIn = parseExpiresIn(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800'), // Default: 604800 segundos (7 días)
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 7); // 7 días

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        refreshToken: hashedRefreshToken,
        tokenExpiry,
      },
    });
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        notificaciones: {
          orderBy: { fecha: 'desc' },
          take: 10,
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.createUsuarioResponse(usuario);
  }

  private createUsuarioResponse(usuario: any): ProfileResponseDto {
    const {
      password,
      createdAt,
      updatedAt,
      activo,
      refreshToken,
      tokenExpiry,
      ...userData
    } = usuario;

    const response: ProfileResponseDto = {
      id: userData.id,
      email: userData.email,
      rol: userData.rol,
    };

    switch (userData.rol) {
      case RolUsuario.SOLICITANTE:
        response.perfilSolicitante = userData.perfilSolicitante;
        break;
      case RolUsuario.FUNCIONARIO_MUNICIPAL:
        response.perfilFuncionario = userData.perfilFuncionario;
        break;
      case RolUsuario.COMISION_OTORGAMIENTO:
        response.perfilComision = userData.perfilComision;
        break;
      // Para otros roles (DIRECTOR_CIRCULO, ADMINISTRADOR) no se incluye perfil
    }

    if (userData.notificaciones) {
      response.notificaciones = userData.notificaciones;
    }

    return response;
  }
}
