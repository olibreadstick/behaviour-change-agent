import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnv } from 'vite';
import { websiteEnvironment } from './website-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// Existing Vercel VITE_* settings configure both browser bundles. Private keys
// are never assigned EXPO_PUBLIC_* names or written into the generated HTML.
const env = websiteEnvironment({ ...loadEnv('production', root, ''), ...process.env });
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
execFileSync(npm, ['run', 'build:admin'], { cwd: root, env, stdio: 'inherit' });
execFileSync(npm, ['run', 'export:web'], { cwd: path.join(root, 'mobile'), env, stdio: 'inherit' });

const output = path.join(root, 'dist');
rmSync(output, { recursive: true, force: true });
cpSync(path.join(root, 'mobile/dist'), output, { recursive: true });
cpSync(path.join(root, 'dist-admin'), path.join(output, 'admin'), { recursive: true });
// Preserve the original PDF URLs, logo and other public assets.
if (existsSync(path.join(root, 'public'))) cpSync(path.join(root, 'public'), output, { recursive: true });
const index = path.join(output, 'index.html');
const html = readFileSync(index, 'utf8').replace('</head>', `<meta name="theme-color" content="#EAF6FA" />
<meta name="description" content="Learn strategies, make a plan, and find support with your penguin coach." />
<link rel="apple-touch-icon" href="/behaviour-logo.png" />
<style>html,body,#root{height:100%;height:100dvh;margin:0;background:#EAF6FA}body{overscroll-behavior:none}input,textarea{font-size:16px}</style>
</head>`);
writeFileSync(index, html);
console.log('Website built: participants at /, researchers at /admin/, existing PDFs at /resources/.');
