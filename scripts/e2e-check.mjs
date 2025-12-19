import http from 'node:http';
import { spawn } from 'node:child_process';

const BASE = 'http://localhost:5173';

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

function fetchPath(path){
  return new Promise((resolve, reject) => {
    http.get(BASE + path, res => {
      const { statusCode } = res;
      if (statusCode && statusCode >= 200 && statusCode < 400) resolve(true);
      else reject(new Error(`HTTP ${statusCode} for ${path}`));
    }).on('error', reject);
  });
}

async function main(){
  console.log('Starting server...');
  const server = spawn(process.platform === 'win32' ? 'node' : 'node', ['server/index.js'], {
    env: { ...process.env, VITE_USE_PROXY: 'true' },
    stdio: 'inherit'
  });

  let attempts = 0;
  while (attempts < 30){
    await wait(500);
    try {
      await fetchPath('/');
      break;
    } catch {}
    attempts++;
  }
  if (attempts >= 30){
    server.kill('SIGINT');
    throw new Error('Server did not start in time');
  }
  console.log('Server is up. Probing API proxy endpoints...');

  const paths = [
    '/',
    '/huggingface-api/models?limit=1',
    '/github-api/rate_limit',
    '/modelscope-api/v1/models?limit=1',
  ];
  for (const p of paths){
    try {
      await fetchPath(p);
      console.log(`OK: ${p}`);
    } catch (e){
      console.warn(`WARN: ${p} -> ${e.message}`);
    }
  }
  server.kill('SIGINT');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


