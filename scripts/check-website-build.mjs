import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
for (const page of ['index.html', 'admin/index.html']) {
  const html = readFileSync(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]).filter(p => p.startsWith('/'));
  assert.ok(scripts.length, `${page} must reference a bundle`);
  for (const script of scripts) assert.ok(existsSync(path.join(root, script)), `Missing ${script}`);
  if (page.startsWith('admin/')) assert.ok(scripts.every(script => script.startsWith('/admin/')), 'Admin bundles must keep their subpath');
  else assert.match(html, /100dvh/);
}
for (const file of ['goal-setting.pdf', 'action-planning-problem-solving.pdf', 'self-monitoring.pdf', 'talking-to-yourself-about-physical-activity.pdf']) {
  assert.ok(existsSync(path.join(root, 'resources', file)), `Missing original resource: ${file}`);
}
console.log('Built website checked: both entry points, JavaScript bundles, and four original PDFs exist.');
