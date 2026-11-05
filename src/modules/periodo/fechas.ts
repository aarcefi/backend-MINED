// Las fechas del período son columnas DATE: se guardan como medianoche UTC
// del día elegido, para que "2026-11-05" siga siendo el 5 en cualquier zona.

/** Convierte "YYYY-MM-DD" o un ISO completo al día que representa, en UTC. */
export const aFecha = (valor: string | Date): Date => {
  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  return new Date(`${texto.slice(0, 10)}T00:00:00.000Z`);
};

/** El día de hoy según el reloj local del servidor, como fecha UTC. */
export const hoy = (ahora = new Date()): Date =>
  new Date(Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()));

/** dd/mm/aaaa de una fecha DATE. */
export const formatoFecha = (fecha: Date): string =>
  fecha.toISOString().slice(0, 10).split('-').reverse().join('/');

export const estaVigente = (
  periodo: { fechaInicio: Date; fechaCierre: Date },
  dia = hoy(),
): boolean =>
  periodo.fechaInicio.getTime() <= dia.getTime() &&
  periodo.fechaCierre.getTime() >= dia.getTime();
