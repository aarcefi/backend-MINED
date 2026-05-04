export interface PriorityContext {
  sector: string;
  tipoSolicitud: string;
  nino: {
    casoEspecial?: boolean;
    tipoNecesidad?: string;
  };
  solicitante: {
    cantHijos: number;
  };
  [key: string]: any;
}

export interface PriorityStrategy {
  calculate(context: PriorityContext): number;
  getName(): string;
}
