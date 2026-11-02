// Se ejecuta antes de cada archivo de test. Sin .env.test se usa una dirección
// sin servidor, de modo que el .env de desarrollo nunca llegue a los tests.
const { config } = require('dotenv');

const { parsed } = config({ path: '.env.test', override: true, quiet: true });

if (!parsed?.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://falta_env_test@127.0.0.1:1/falta_env_test';
}
