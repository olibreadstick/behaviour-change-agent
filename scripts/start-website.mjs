import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnv } from 'vite';
import { websiteEnvironment } from './website-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = websiteEnvironment({ ...loadEnv('development', root, ''), ...process.env });
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'web', '--', '--port', '3000'], { cwd: path.join(root, 'mobile'), env, stdio: 'inherit' });
