import { Injectable } from '@nestjs/common';

export enum AnioVida {
  ANIO_1 = 'ANIO_1',
  ANIO_2 = 'ANIO_2',
  ANIO_3 = 'ANIO_3',
  ANIO_4 = 'ANIO_4',
  ANIO_5 = 'ANIO_5',
  ANIO_6 = 'ANIO_6',
}

@Injectable()
export class DateUtilsService {
  calcularAnioVida(
    fechaNacimiento: Date,
    fechaReferencia: Date,
  ): AnioVida | null {
    const edadEnMeses =
      (fechaReferencia.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
      (fechaReferencia.getMonth() - fechaNacimiento.getMonth());
    const edadEnAnios = Math.floor(edadEnMeses / 12);
    if (edadEnAnios >= 1 && edadEnAnios <= 6) {
      return `ANIO_${edadEnAnios}` as AnioVida;
    }
    return null;
  }
}
