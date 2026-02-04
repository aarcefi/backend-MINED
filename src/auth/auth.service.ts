/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokensDto } from './dto/token.dto';
import { ConfigService } from '@nestjs/config';
import { RolUsuario, TipoPersona } from '@prisma/client';
import { UsuarioSinPassword } from './types';

// Función helper para parsear tiempos
function parseExpiresIn(expiresIn: string): number {
  if (!isNaN(Number(expiresIn))) {
    return Number(expiresIn);
  }

  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    case 'w':
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
      },
    });

    if (!usuario) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, usuario.password);

    if (!isPasswordValid) {
      return null;
    }

    // Eliminar password del objeto de retorno
    const { password: _, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword as UsuarioSinPassword;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ tokens: TokensDto; user: UsuarioSinPassword }> {
    const usuario = await this.validateUser(loginDto.email, loginDto.password);

    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const tokens = await this.generateTokens(usuario);
    await this.updateRefreshToken(usuario.id, tokens.refreshToken);

    return {
      tokens,
      user: usuario,
    };
  }

  async register(registerDto: RegisterDto): Promise<UsuarioSinPassword> {
    // Verificar si el usuario ya existe
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

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Crear transacción para asegurar consistencia
    const usuario = await this.prisma.$transaction(async (prisma) => {
      // Crear usuario base con rol SOLICITANTE
      const newUser = await prisma.usuario.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          rol: RolUsuario.SOLICITANTE,
          activo: true,
        },
      });

      // Crear perfil de solicitante con datos explícitos
      await prisma.perfilSolicitante.create({
        data: {
          usuarioId: newUser.id,
          nombre: registerDto.datosSolicitante.nombre,
          apellidos: registerDto.datosSolicitante.apellidos,
          carnetIdentidad: registerDto.datosSolicitante.carnetIdentidad,
          telefono: registerDto.datosSolicitante.telefono || null,
          direccion: registerDto.datosSolicitante.direccion,
          municipio: registerDto.datosSolicitante.municipio,
          tipoPersona: registerDto.datosSolicitante.tipoPersona as TipoPersona,
          cantHijos: registerDto.datosSolicitante.cantHijos || 1,
        },
      });

      // Obtener el usuario creado con sus relaciones
      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id: newUser.id },
        include: {
          perfilSolicitante: true,
        },
      });

      if (!usuarioCompleto) {
        throw new Error('Error al crear usuario');
      }

      // Eliminar password del objeto de retorno
      const { password, ...usuarioSinPassword } = usuarioCompleto;
      return usuarioSinPassword;
    });

    return usuario as UsuarioSinPassword;
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

    const accessTokenExpiresIn = parseExpiresIn(
      this.configService.get<string>('JWT_EXPIRES_IN', '3600'),
    );

    const refreshTokenExpiresIn = parseExpiresIn(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '604800'),
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
    tokenExpiry.setDate(tokenExpiry.getDate() + 7);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        refreshToken: hashedRefreshToken,
        tokenExpiry,
      },
    });
  }

  async getProfile(userId: string): Promise<UsuarioSinPassword> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        perfilSolicitante: true,
        notificaciones: {
          orderBy: { fecha: 'desc' },
          take: 10,
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword as UsuarioSinPassword;
  }
}
