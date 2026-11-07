import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export async function resolverUbicacion(
  prisma: PrismaService,
  municipioNombre: string,
  provinciaNombre?: string,
): Promise<{ municipioId: string; provinciaId: string }> {
  const municipio = await prisma.municipio.findFirst({
    where: {
      nombre: { equals: municipioNombre, mode: 'insensitive' },
      ...(provinciaNombre && {
        provincia: {
          nombre: { equals: provinciaNombre, mode: 'insensitive' },
        },
      }),
    },
    select: { id: true, provinciaId: true },
  });

  if (!municipio) {
    throw new BadRequestException(
      `Municipio "${municipioNombre}" no encontrado${
        provinciaNombre ? ` en provincia "${provinciaNombre}"` : ''
      }`,
    );
  }

  return { municipioId: municipio.id, provinciaId: municipio.provinciaId };
}
