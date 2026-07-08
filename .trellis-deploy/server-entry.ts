
import { TenantPool, startServer } from 'trellis/server';
import { readConfig, defaultLocalConfig, writeConfig } from 'trellis/client';
import { join } from 'path';
import { existsSync } from 'fs';

const dbPath = '/home/sprite/trellis-db/data';
const configDir = '/home/sprite/trellis-db';

if (!existsSync(join(configDir, '.trellis-db.json'))) {
  writeConfig(defaultLocalConfig(dbPath, {
    apiKey: 'spk_6ELYagtlBXTM5P2lt6ElwnoIR_hNdF1W',
    jwtSecret: 'jws_ZmR5EAjxktRoX5WY3kKvTlvwuhtz5dHx',
    port: 3000,
  }), configDir);
}

const config = readConfig(configDir)!;
const pool = new TenantPool(dbPath);

const server = startServer({ port: 3000, config, pool });

console.log('Trellis DB running on port 3000');
console.log(`URL: https://${process.env.SPRITE_NAME ?? 'localhost'}.sprites.app`);
