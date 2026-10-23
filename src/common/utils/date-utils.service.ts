import { Injectable } from '@nestjs/common';
import { AnioVida } from '@prisma/client';

// Reexportar el tipo de Prisma para que todo el proyecto use el mismo
export { AnioVida };

@Injectable()
export class DateUtilsService {
  calcularAnioVida(
    fechaNacimiento: Date,
    fechaReferencia: Date,
  ): AnioVida | null {
    const edadMeses =
      (fechaReferencia.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
      (fechaReferencia.getMonth() - fechaNacimiento.getMonth());

    if (edadMeses >= 11 && edadMeses < 24) return AnioVida.ANIO_2;
    if (edadMeses >= 24 && edadMeses < 36) return AnioVida.ANIO_3;
    if (edadMeses >= 36 && edadMeses < 48) return AnioVida.ANIO_4;
    if (edadMeses >= 48 && edadMeses < 60) return AnioVida.ANIO_5;
    if (edadMeses >= 60 && edadMeses < 72) return AnioVida.ANIO_6;
    return null;
  }
}
