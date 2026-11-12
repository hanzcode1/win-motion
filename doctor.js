#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const c = { reset:'\x1b[0m', red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', blue:'\x1b[34m', cyan:'\x1b[36m', bold:'\x1b[1m', dim:'\x1b[2m' };
const OK = `${c.green}✓${c.reset}`;
const FAIL = `${c.red}✗${c.reset}`;
const WARN = `${c.yellow}!${c.reset}`;

let errors = 0, warnings = 0;
function log(s, l, d = '') { console.log(`  ${s}  ${l}${d ? `  ${c.dim}${d}${c.reset}` : ''}`); }
function section(t) { console.log(`\n${c.bold}${c.cyan}▶ ${t}${c.reset}`); }

console.log(`\n${c.bold}${c.blue}╔══════════════════════════════════════════════╗${c.reset}`);
console.log(`${c.bold}${c.blue}║   🎬  Win Motion — System Doctor            ║${c.reset}`);
console.log(`${c.bold}${c.blue}╚══════════════════════════════════════════════╝${c.reset}`);

section('Node.js Environment');
const major = parseInt(process.version.slice(1).split('.')[0], 10);
major >= 18 ? log(OK, `Node.js ${process.version}`) : (log(FAIL, `Node.js ${process.version}`, 'Butuh >= 18'), errors++);
log(OK, `Platform: ${process.platform} / ${process.arch}`);

section('Dependencies');
const nodeModules = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModules)) { log(FAIL, 'node_modules', 'Jalankan: npm install'); errors++; }
else {
  ['express', 'cors', 'uuid', 'esbuild', 'puppeteer-core', 'ffmpeg-static', 'fluent-ffmpeg'].forEach(dep => {
    const p = path.join(nodeModules, dep);
    if (fs.existsSync(p)) {
      let v = '?'; try { v = require(path.join(p, 'package.json')).version; } catch {}
      log(OK, dep, `v${v}`);
    } else { log(FAIL, dep, 'tidak terinstall'); errors++; }
  });
}

section('ffmpeg-static');
try {
  const ffPath = require('ffmpeg-static');
  if (ffPath && fs.existsSync(ffPath)) {
    log(OK, 'ffmpeg binary', ffPath);
  } else {
    log(FAIL, 'ffmpeg-static path tidak valid', ffPath);
    errors++;
  }
} catch (e) {
  log(FAIL, 'ffmpeg-static error', e.message);
  errors++;
}

section('Chrome / Browser');
try {
  const { findChromePath } = require('./src/renderer');
  const chromePath = findChromePath();
  log(OK, 'Chrome ditemukan', chromePath);
} catch (e) {
  log(FAIL, 'Chrome tidak ditemukan', e.message.split('\n')[0]);
  console.log(`     ${c.dim}→ Install Google Chrome: https://www.google.com/chrome/${c.reset}`);
  console.log(`     ${c.dim}→ Atau set env CHROME_PATH ke executable Chrome${c.reset}`);
  errors++;
}

section('Project Structure');
['public', 'public/css', 'public/js', 'src', 'src/compositions', 'renders'].forEach(p => {
  fs.existsSync(path.join(__dirname, p)) ? log(OK, p) : (log(WARN, p, 'akan dibuat otomatis'), warnings++);
});

section('Critical Files');
['server.js', 'src/renderer.js', 'public/index.html', 'public/css/style.css', 'public/js/app.js'].forEach(f => {
  fs.existsSync(path.join(__dirname, f)) ? log(OK, f) : (log(FAIL, f, 'Tidak ditemukan!'), errors++);
});

section('Compositions');
const compDir = path.join(__dirname, 'src', 'compositions');
if (fs.existsSync(compDir)) {
  const comps = fs.readdirSync(compDir).filter(f => /\.(tsx|ts)$/.test(f));
  comps.length ? comps.forEach(f => log(OK, f)) : (log(WARN, 'Belum ada composition'), warnings++);
}

(async () => {
  section('Puppeteer Launch Test');
  try {
    const puppeteer = require('puppeteer-core');
    const { findChromePath } = require('./src/renderer');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: findChromePath(),
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    const ver = await browser.version();
    await browser.close();
    log(OK, 'Launch OK', ver);
  } catch (e) {
    log(FAIL, 'Launch gagal', e.message.split('\n')[0]);
    errors++;
  }

  console.log(`\n${c.bold}${c.blue}══════════════════════════════════════════════${c.reset}`);
  if (errors === 0 && warnings === 0) {
    console.log(`${c.bold}${c.green}  ✅ Semua check OK! Jalankan: npm start${c.reset}`);
  } else if (errors === 0) {
    console.log(`${c.bold}${c.yellow}  ⚠️  ${warnings} warning. Bisa jalan.${c.reset}`);
  } else {
    console.log(`${c.bold}${c.red}  ❌ ${errors} error. Perbaiki dulu.${c.reset}`);
  }
  console.log(`${c.bold}${c.blue}══════════════════════════════════════════════${c.reset}\n`);
  process.exit(errors > 0 ? 1 : 0);
})();