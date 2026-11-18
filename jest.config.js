/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    'base-de-pruebas\\.spec\\.ts$',
    'integration\\.spec\\.ts$',
    'decision\\.(service|controller)\\.spec\\.ts$',
    'nino\\.(service|controller)\\.spec\\.ts$',
    'sesion\\.(service|controller)\\.spec\\.ts$',
    'control-trimestral\\.(service|controller)\\.spec\\.ts$',
    'solicitud\\.controller\\.spec\\.ts$',
    'solicitud-decisiones\\.spec\\.ts$',
    'trazabilidad\\.(service|controller)\\.spec\\.ts$',
    'matricula\\.(service|controller)\\.spec\\.ts$',
    'circulo-infantil\\.controller\\.spec\\.ts$',
  ],
  collectCoverageFrom: [
    'src/auth/auth.service.ts',
    'src/common/prioridades/**/*.ts',
    '!src/common/prioridades/index.ts',
    '!src/common/prioridades/prioridad.module.ts',
    'src/modules/solicitud/solicitud.service.ts',
    'src/modules/notificacion/notificaciones.service.ts',
    'src/modules/perfiles/perfiles.service.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov'],
  testEnvironment: 'node',
};
