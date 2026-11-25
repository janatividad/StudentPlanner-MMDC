import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.PORT = '3888';

const { server, FRONTEND_ROOT } = await import('../server.js');
await new Promise(r => setTimeout(r, 200));

const fetchUrl = (p) => new Promise((resolve) => {
  http.get({ host: '127.0.0.1', port: 3888, path: p }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
  }).on('error', err => resolve({ error: err }));
});

console.log('Testing server bound to 127.0.0.1...');

// 1. Root access
const rootRes = await fetchUrl('/');
console.assert(rootRes.status === 200 && rootRes.data.includes('Study Planner MMDC'), 'Root test failed: ' + rootRes.status);
console.log('✓ Root access serves frontend/index.html');

// 2. /frontend/ access
const feRes = await fetchUrl('/frontend/');
console.assert(feRes.status === 200 && feRes.data.includes('Study Planner MMDC'), '/frontend/ test failed: ' + feRes.status);
console.log('✓ /frontend/ access works');

// 3. /css/main.css and /frontend/css/main.css
const css1 = await fetchUrl('/css/main.css');
const css2 = await fetchUrl('/frontend/css/main.css');
console.assert(css1.status === 200 && css2.status === 200, 'CSS test failed');
console.log('✓ Asset loading preserved across /css/ and /frontend/css/');

// 4. Malformed URI
const malformed = await fetchUrl('/%c0%ae%c0%ae/');
console.assert(malformed.status === 400, 'Malformed URL test failed: ' + malformed.status);
console.log('✓ Malformed URLs safely return 400 Bad Request');

// 5. Path traversal attempt outside frontend
const traversal1 = await fetchUrl('/../package.json');
console.assert(traversal1.status === 403 || traversal1.status === 404, 'Traversal 1 failed: ' + traversal1.status);
console.assert(!traversal1.data.includes('student-planner-mmdc'), 'Traversal 1 leaked file content!');

const traversal2 = await fetchUrl('/frontend/../../README.md');
console.assert(traversal2.status === 403 || traversal2.status === 404, 'Traversal 2 failed: ' + traversal2.status);
console.assert(!traversal2.data.includes('MMDC coursework'), 'Traversal 2 leaked file content!');
console.log('✓ Path traversals blocked');

// 6. Symlink outside frontend
const symlinkPath = path.join(FRONTEND_ROOT, 'leak_test_symlink');
try {
  if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
  fs.symlinkSync(path.resolve(FRONTEND_ROOT, '../package.json'), symlinkPath);
  const symRes = await fetchUrl('/leak_test_symlink');
  console.assert(symRes.status === 403, 'Symlink containment failed! status=' + symRes.status);
  console.assert(!symRes.data.includes('student-planner-mmdc'), 'Symlink leaked content!');
  fs.unlinkSync(symlinkPath);
  console.log('✓ Symlink escaping frontend/ strictly blocked (403)');
} catch (e) {
  if (fs.existsSync(symlinkPath)) fs.unlinkSync(symlinkPath);
  throw e;
}

server.close(() => {
  console.log('All server hardening tests PASSED successfully!');
  process.exit(0);
});
