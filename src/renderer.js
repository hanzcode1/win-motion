const esbuild = require('esbuild');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

const COMP_DIR = path.join(__dirname, 'compositions');
const RENDERS_DIR = path.join(__dirname, '..', 'renders');

/* ============================================================
   CHROME DETECTION
   ============================================================ */
function findChromePath() {
  const platform = process.platform;
  const candidates = [];

  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    );
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    );
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    'Chrome/Edge tidak ditemukan.\n' +
    'Install Google Chrome atau set env CHROME_PATH.'
  );
}

/* ============================================================
   UTILS
   ============================================================ */
function toEven(n) {
  const num = Math.floor(Number(n));
  if (!num || num < 2) return 2;
  return num % 2 === 0 ? num : num - 1;
}

const QUALITY_MAP = {
  low:    { crf: 28, preset: 'veryfast' },
  medium: { crf: 23, preset: 'fast' },
  high:   { crf: 20, preset: 'medium' },
  ultra:  { crf: 16, preset: 'slow' }
};

/* ============================================================
   MAIN RENDER FUNCTION
   ============================================================ */
async function renderComposition({
  compositionId,
  props,
  durationInFrames,
  fps,
  width,
  height,
  quality = 'high',
  format = 'mp4',
  outputPath,
  onProgress = () => {},
  onStage = () => {},
  onFramePreview = () => {},
  shouldCancel = () => false
}) {
  const t0 = Date.now();
  let canceled = false;

  // ✅ FIX: Pastikan dimensi genap (libx264 butuh divisible by 2)
  const originalW = width;
  const originalH = height;
  width = toEven(width);
  height = toEven(height);

  if (width !== originalW || height !== originalH) {
    console.log(`⚠️  Dimensi disesuaikan: ${originalW}×${originalH} → ${width}×${height}`);
  }

  const checkCancel = () => {
    if (shouldCancel() && !canceled) {
      canceled = true;
      throw new Error('CANCELED');
    }
  };

  // Cari file
  let entry = path.join(COMP_DIR, `${compositionId}.tsx`);
  if (!fs.existsSync(entry)) {
    const alt = path.join(COMP_DIR, `${compositionId}.ts`);
    if (fs.existsSync(alt)) entry = alt;
    else throw new Error(`Composition "${compositionId}" tidak ditemukan di ${COMP_DIR}`);
  }

  console.log(`\n══════════════════════════════════════════════════`);
  console.log(`🎬 RENDER: ${compositionId}`);
  console.log(`   Size:    ${width}×${height} @ ${fps}fps`);
  console.log(`   Frames:  ${durationInFrames} (${(durationInFrames / fps).toFixed(2)}s)`);
  console.log(`   Format:  ${format} · ${quality}`);
  console.log(`   Output:  ${path.basename(outputPath)}`);
  console.log(`   FFmpeg:  ${ffmpegStatic}`);
  console.log(`══════════════════════════════════════════════════\n`);

  if (!ffmpegStatic || !fs.existsSync(ffmpegStatic)) {
    throw new Error(`ffmpeg-static tidak ditemukan di: ${ffmpegStatic}`);
  }

  /* ===== 1. Bundle TSX ===== */
  onStage('bundling');
  onProgress(2);
  checkCancel();

  console.log('📦 Bundling TSX...');
  const buildResult = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'CompositionBundle',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'silent'
  });
  const bundledJS = buildResult.outputFiles[0].text;
  console.log(`   ✅ Bundle OK (${(bundledJS.length / 1024).toFixed(1)} KB)`);

  /* ===== 2. Launch browser ===== */
  onStage('launching-browser');
  onProgress(5);
  checkCancel();

  const chromePath = findChromePath();
  console.log(`🌐 Chrome: ${chromePath}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--disable-gpu',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  /* ===== 3. Setup page ===== */
  const html = buildHTML(bundledJS, width, height);
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction('window.__ready === true', { timeout: 20000 });
  console.log(`   ✅ Page siap`);

  /* ===== 4. Prepare dirs ===== */
  const frameDir = path.join(os.tmpdir(), `winmotion_frames_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const previewDir = path.join(RENDERS_DIR, 'previews');
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });

  const previewPath = path.join(previewDir, 'preview.jpg');
  const previewEvery = Math.max(1, Math.min(5, Math.floor(durationInFrames / 20)));

  let frameCount = 0;

  try {
    /* ===== 5. Render frames ===== */
    onStage('rendering-frames');
    console.log(`🎞️  Rendering ${durationInFrames} frames...`);

    for (let frame = 0; frame < durationInFrames; frame++) {
      checkCancel();

      await page.evaluate((f, d, fp, p) => {
        window.__FRAME__ = f;
        window.__DURATION__ = d;
        window.__FPS__ = fp;
        window.__PROPS__ = p;
        window.__renderFrame__();
      }, frame, durationInFrames, fps, props);

      await page.evaluate(() => new Promise(r =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      ));

      const framePath = path.join(frameDir, `frame_${String(frame).padStart(6, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png' });

      if (!fs.existsSync(framePath)) {
        throw new Error(`Gagal menyimpan frame ${frame}`);
      }
      frameCount++;

      if (frame % previewEvery === 0 || frame === durationInFrames - 1) {
        try {
          await page.screenshot({ path: previewPath, type: 'jpeg', quality: 60 });
          onFramePreview(previewPath);
        } catch {}
      }

      const pct = 5 + Math.round(((frame + 1) / durationInFrames) * 80);
      onProgress(pct);
      onStage(`rendering-frames:${frame + 1}:${durationInFrames}`);

      if ((frame + 1) % Math.max(1, Math.floor(durationInFrames / 10)) === 0) {
        console.log(`   [${pct}%] frame ${frame + 1}/${durationInFrames}`);
      }
    }

    console.log(`   ✅ ${frameCount} frame selesai`);
  } finally {
    await browser.close();
  }

  if (canceled || shouldCancel()) {
    try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {}
    throw new Error('CANCELED');
  }

  /* ===== 6. Encode ===== */
  checkCancel();
  onStage('encoding');
  onProgress(87);

  const frameFiles = fs.readdirSync(frameDir).filter(f => f.endsWith('.png'));
  console.log(`\n🎬 Encoding ${frameFiles.length} frames → ${format.toUpperCase()}`);

  if (frameFiles.length === 0) {
    throw new Error(`Tidak ada frame yang dirender di ${frameDir}`);
  }

  console.log(`   First: ${frameFiles[0]}`);
  console.log(`   Last:  ${frameFiles[frameFiles.length - 1]}`);

  const q = QUALITY_MAP[quality] || QUALITY_MAP.high;

  // Build args untuk spawn
  const args2 = [
    '-y',
    '-hide_banner',
    '-loglevel', 'warning',
    '-framerate', String(fps),
    '-start_number', '0',
    '-i', path.join(frameDir, 'frame_%06d.png'),
  ];

  if (format === 'webm') {
    args2.push(
      '-vf', `scale=${width}:${height}`,  // ✅ Paksa dimensi genap
      '-c:v', 'libvpx-vp9',
      '-pix_fmt', 'yuv420p',
      '-crf', String(q.crf + 8),
      '-b:v', '0',
      '-row-mt', '1',
      '-an'
    );
  } else if (format === 'gif') {
    const gifW = toEven(Math.min(width, 800));
    args2.push(
      '-vf', `fps=${Math.min(fps, 15)},scale=${gifW}:-2:flags=lanczos`,
      '-loop', '0'
    );
  } else {
    // MP4 — safety net filter paksa dimensi genap
    args2.push(
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', String(q.crf),
      '-preset', q.preset,
      '-movflags', '+faststart',
      '-an'
    );
  }

  args2.push(outputPath);

  console.log(`   FFmpeg args: ${args2.length} args`);

  let ffmpegProcess = null;

  try {
    await new Promise((resolve, reject) => {
      ffmpegProcess = spawn(ffmpegStatic, args2, { stdio: ['ignore', 'pipe', 'pipe'] });
      renderComposition.currentFfmpeg = ffmpegProcess;

      let stderr = '';
      let lastProgress = 0;

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
        if (stderr.length > 4000) stderr = stderr.slice(-3000);

        const match = chunk.match(/frame=\s*(\d+)/);
        if (match) {
          const frameNum = parseInt(match[1], 10);
          if (frameNum > lastProgress) {
            lastProgress = frameNum;
            const pct = 87 + Math.round((frameNum / durationInFrames) * 12);
            onProgress(Math.min(99, pct));
          }
        }
      });

      ffmpegProcess.on('error', (err) => {
        renderComposition.currentFfmpeg = null;
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });

      ffmpegProcess.on('close', (code) => {
        renderComposition.currentFfmpeg = null;

        if (canceled || shouldCancel()) {
          return reject(new Error('CANCELED'));
        }

        if (code === 0) {
          resolve();
        } else {
          console.error('❌ FFmpeg gagal');
          console.error('   Exit code:', code);
          console.error('   Stderr (last 1500):\n', stderr.slice(-1500));

          const errLines = stderr.split('\n').filter(l => l.trim()).slice(-5).join('\n');
          reject(new Error(
            `ffmpeg gagal (code ${code})\n${errLines || 'Tidak ada detail'}`
          ));
        }
      });

      // Cancel watcher
      const cancelWatcher = setInterval(() => {
        if (shouldCancel() && ffmpegProcess) {
          clearInterval(cancelWatcher);
          try {
            if (process.platform === 'win32') {
              execSync(`taskkill /F /PID ${ffmpegProcess.pid} /T`, { stdio: 'ignore' });
            } else {
              ffmpegProcess.kill('SIGKILL');
            }
          } catch {}
        }
      }, 300);

      ffmpegProcess.on('close', () => clearInterval(cancelWatcher));
    });
  } catch (e) {
    try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {}
    throw e;
  }

  if (canceled || shouldCancel()) {
    try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {}
    throw new Error('CANCELED');
  }

  /* ===== 7. Verifikasi ===== */
  if (!fs.existsSync(outputPath)) {
    throw new Error(`Output tidak dibuat: ${outputPath}`);
  }
  const stat = fs.statSync(outputPath);
  if (stat.size === 0) {
    throw new Error(`Output kosong (0 byte): ${outputPath}`);
  }

  /* ===== 8. Cleanup ===== */
  try { fs.rmSync(frameDir, { recursive: true, force: true }); } catch {}

  onProgress(100);
  onStage('done');

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Selesai dalam ${elapsed}s`);
  console.log(`   Output: ${path.basename(outputPath)} (${(stat.size / 1024 / 1024).toFixed(2)} MB)\n`);
}

/* ============================================================
   HTML BUILDER
   ============================================================ */
function buildHTML(bundledJS, width, height) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  html, body { margin:0; padding:0; background:#000; overflow:hidden; }
  #root { width:${width}px; height:${height}px; }
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script>
  function interpolate(input, inputRange, outputRange, opts = {}) {
    const { extrapolateLeft = 'extend', extrapolateRight = 'extend' } = opts;
    let i = input;
    if (i <= inputRange[0]) {
      if (extrapolateLeft === 'clamp') return outputRange[0];
      if (extrapolateLeft === 'identity') return i;
    }
    const last = inputRange.length - 1;
    if (i >= inputRange[last]) {
      if (extrapolateRight === 'clamp') return outputRange[last];
      if (extrapolateRight === 'identity') return i;
    }
    for (let k = 0; k < last; k++) {
      if (i >= inputRange[k] && i <= inputRange[k + 1]) {
        const t = (i - inputRange[k]) / (inputRange[k + 1] - inputRange[k]);
        return outputRange[k] + t * (outputRange[k + 1] - outputRange[k]);
      }
    }
    return outputRange[last];
  }

  function spring({ frame, fps, config = {} }) {
    const { damping = 10, stiffness = 100, mass = 1 } = config;
    const t = frame / fps;
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  function AbsoluteFill({ children, style }) {
    return React.createElement('div', {
      style: Object.assign({
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }, style || {})
    }, children);
  }

  window.Remotion = {
    useCurrentFrame: () => window.__FRAME__ || 0,
    useVideoConfig: () => ({
      fps: window.__FPS__ || 30,
      durationInFrames: window.__DURATION__ || 90,
      width: ${width},
      height: ${height}
    }),
    interpolate,
    spring,
    AbsoluteFill
  };

  window.__FRAME__ = 0;
  window.__DURATION__ = 90;
  window.__FPS__ = 30;
  window.__PROPS__ = {};
  window.__ready = false;
  window.__renderFrame__ = function () {};
</script>
<script>
${bundledJS}
</script>
<script>
  (function () {
    try {
      const mod = window.CompositionBundle || {};
      const Comp = mod.default || Object.values(mod).find(v => typeof v === 'function');
      if (!Comp) throw new Error('Composition tidak mengekspor React component');

      let root = null;
      window.__renderFrame__ = function () {
        const tree = React.createElement(Comp, window.__PROPS__);
        if (!root) root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(tree);
      };
      window.__renderFrame__();
      window.__ready = true;
    } catch (e) {
      document.body.innerHTML = '<pre style="color:#f66;font:14px monospace;padding:20px">' + e.message + '\\n' + e.stack + '</pre>';
      window.__ready = true;
    }
  })();
</script>
</body>
</html>`;
}

module.exports = { renderComposition, findChromePath };