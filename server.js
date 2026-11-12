const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8000;

const PUBLIC_DIR = path.join(__dirname, 'public');
const COMP_DIR = path.join(__dirname, 'src', 'compositions');
const RENDERS_DIR = path.join(__dirname, 'renders');

[PUBLIC_DIR, COMP_DIR, RENDERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(PUBLIC_DIR));
app.use('/renders', express.static(RENDERS_DIR));

// ===== HELPERS =====
/**
 * Bulatkan ke angka genap terdekat (untuk H.264 / libx264)
 * Libx264 butuh width & height divisible by 2
 */
function toEven(num) {
  const n = Math.floor(Number(num));
  if (!n || n < 2) return 2;
  return n % 2 === 0 ? n : n - 1;
}

// ===== PRESETS =====
const PRESETS = {
  resolutions: {
    '480p': { width: 854, height: 480, label: '480p SD' },
    '720p': { width: 1280, height: 720, label: '720p HD' },
    '1080p': { width: 1920, height: 1080, label: '1080p Full HD' },
    '1440p': { width: 2560, height: 1440, label: '1440p QHD' },
    '4k': { width: 3840, height: 2160, label: '4K UHD' }
  },
  fpsOptions: [24, 25, 30, 50, 60]
};

// ===== COMPOSITION TEMPLATES =====
const COMP_TEMPLATES = {
  blank: {
    name: 'Blank',
    description: 'Composition kosong dengan background solid',
    code: `declare const React: any;
declare const Remotion: any;

const { AbsoluteFill } = Remotion;

export default function MyComposition() {
  return React.createElement(
    AbsoluteFill,
    { style: { background: '#0078d4', color: 'white', fontFamily: 'Poppins, sans-serif' } },
    React.createElement('h1', { style: { fontSize: 64 } }, 'Hello!')
  );
}
`
  },
  title: {
    name: 'Title Animation',
    description: 'Judul dengan fade in + spring scale',
    code: `declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } = Remotion;

interface Props {
  title?: string;
  subtitle?: string;
}

export default function TitleAnimation(props: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const title = props.title || 'My Title';
  const subtitle = props.subtitle || 'Subtitle here';

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        background: 'linear-gradient(135deg, #0078d4 0%, #00b7c3 100%)',
        flexDirection: 'column',
        fontFamily: 'Poppins, sans-serif',
        color: 'white'
      }
    },
    React.createElement(
      'div',
      { style: { opacity, transform: \`scale(\${scale})\`, textAlign: 'center' } },
      React.createElement('h1', { style: { fontSize: 96, margin: 0, fontWeight: 700 } }, title),
      React.createElement('p', { style: { fontSize: 32, marginTop: 20, opacity: 0.9 } }, subtitle)
    )
  );
}
`
  },
  slideshow: {
    name: 'Slideshow',
    description: 'Ganti background warna tiap 1 detik',
    code: `declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, AbsoluteFill } = Remotion;

const COLORS = ['#0078d4', '#00b7c3', '#e81123', '#f7a501', '#107c10'];

export default function Slideshow() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const idx = Math.floor(frame / fps) % COLORS.length;

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        background: COLORS[idx],
        color: 'white',
        fontFamily: 'Poppins, sans-serif',
        flexDirection: 'column'
      }
    },
    React.createElement('h1', { style: { fontSize: 120, margin: 0 } }, \`\${idx + 1}\`),
    React.createElement('p', { style: { fontSize: 28, opacity: 0.9 } }, COLORS[idx])
  );
}
`
  },
  counter: {
    name: 'Counter',
    description: 'Angka naik dari 0 ke target',
    code: `declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } = Remotion;

interface Props {
  from?: number;
  to?: number;
  label?: string;
}

export default function Counter(props: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const from = props.from ?? 0;
  const to = props.to ?? 100;
  const label = props.label || 'Total';

  const value = Math.round(interpolate(frame, [0, durationInFrames], [from, to]));

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        background: '#0a1929',
        color: '#4fa3e8',
        fontFamily: 'Poppins, sans-serif',
        flexDirection: 'column'
      }
    },
    React.createElement('div', { style: { fontSize: 140, fontWeight: 700, fontFamily: 'monospace' } }, value),
    React.createElement('p', { style: { fontSize: 24, color: '#8b949e', marginTop: 10 } }, label)
  );
}
`
  },
  logo: {
    name: 'Logo Reveal',
    description: 'Animasi reveal dengan rotasi + scale',
    code: `declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } = Remotion;

interface Props {
  emoji?: string;
  text?: string;
}

export default function LogoReveal(props: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const emoji = props.emoji || '⚙️';
  const text = props.text || 'Win Motion';

  const scale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const rotate = interpolate(frame, [0, 60], [-180, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  return React.createElement(
    AbsoluteFill,
    { style: { background: '#000', fontFamily: 'Poppins, sans-serif', color: 'white', flexDirection: 'column' } },
    React.createElement(
      'div',
      { style: { transform: \`rotate(\${rotate}deg) scale(\${scale})\`, fontSize: 120 } },
      emoji
    ),
    React.createElement(
      'h1',
      { style: { fontSize: 56, marginTop: 30, opacity, fontWeight: 600 } },
      text
    )
  );
}
`
  },
  bars: {
    name: 'Animated Bars',
    description: 'Bar chart dengan animasi bertingkat',
    code: `declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } = Remotion;

const VALUES = [40, 75, 60, 90, 55, 80, 70];
const COLORS = ['#0078d4', '#00b7c3', '#4fa3e8', '#106ebe', '#60aee8', '#00b7c3', '#0078d4'];

export default function AnimatedBars() {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const maxH = height * 0.6;

  return React.createElement(
    AbsoluteFill,
    { style: { background: '#0a1929', flexDirection: 'row', alignItems: 'flex-end', gap: 20, padding: 60 } },
    VALUES.map((v, i) => {
      const start = i * 5;
      const h = interpolate(frame, [start, start + 20], [0, (v / 100) * maxH], { extrapolateRight: 'clamp' });
      return React.createElement('div', {
        key: i,
        style: {
          flex: 1,
          height: h,
          background: COLORS[i],
          borderRadius: 8,
          alignSelf: 'flex-end'
        }
      });
    })
  );
}
`
  }
};

// ===== API =====

app.get('/api/presets', (req, res) => res.json(PRESETS));
app.get('/api/templates', (req, res) => {
  const templates = {};
  Object.entries(COMP_TEMPLATES).forEach(([k, v]) => {
    templates[k] = { name: v.name, description: v.description, code: v.code };
  });
  res.json(templates);
});

// List compositions
app.get('/api/compositions', (req, res) => {
  try {
    if (!fs.existsSync(COMP_DIR)) return res.json([]);
    const files = fs.readdirSync(COMP_DIR);
    const list = files
      .filter(f => /\.(tsx|ts)$/.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(COMP_DIR, f));
        return {
          id: f.replace(/\.(tsx|ts)$/, ''),
          name: f.replace(/\.(tsx|ts)$/, ''),
          file: f,
          size: stat.size,
          modified: stat.mtime
        };
      });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get composition content
app.get('/api/compositions/:id', (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const tsxPath = path.join(COMP_DIR, `${id}.tsx`);
    const tsPath = path.join(COMP_DIR, `${id}.ts`);
    const filePath = fs.existsSync(tsxPath) ? tsxPath : tsPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Composition tidak ditemukan' });
    }
    const code = fs.readFileSync(filePath, 'utf-8');
    res.json({ id, code, file: path.basename(filePath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-detect props dari composition
app.get('/api/compositions/:id/props', (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const tsxPath = path.join(COMP_DIR, `${id}.tsx`);
    const tsPath = path.join(COMP_DIR, `${id}.ts`);
    const filePath = fs.existsSync(tsxPath) ? tsxPath : tsPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Composition tidak ditemukan' });
    }
    const code = fs.readFileSync(filePath, 'utf-8');
    const fields = detectPropsFromCodeServer(code);
    const defaultProps = {};
    fields.forEach(f => {
      if (f.defaultValue !== undefined) defaultProps[f.name] = f.defaultValue;
    });
    res.json({ fields, defaultProps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create composition
app.post('/api/compositions', (req, res) => {
  try {
    const { id, code, template } = req.body;
    if (!id || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id)) {
      return res.status(400).json({ error: 'Nama composition harus diawali huruf, hanya boleh huruf/angka/_/-' });
    }

    const filePath = path.join(COMP_DIR, `${id}.tsx`);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'Composition sudah ada' });
    }

    let finalCode = code;
    if (!finalCode && template && COMP_TEMPLATES[template]) {
      finalCode = COMP_TEMPLATES[template].code;
    }
    if (!finalCode) {
      finalCode = COMP_TEMPLATES.blank.code.replace(/MyComposition/g, id);
    }

    fs.writeFileSync(filePath, finalCode, 'utf-8');
    res.json({ ok: true, id, file: path.basename(filePath) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update composition
app.put('/api/compositions/:id', (req, res) => {
  try {
    const { code } = req.body;
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const tsxPath = path.join(COMP_DIR, `${id}.tsx`);
    const tsPath = path.join(COMP_DIR, `${id}.ts`);
    const filePath = fs.existsSync(tsxPath) ? tsxPath : tsPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Composition tidak ditemukan' });
    }
    if (typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Code tidak boleh kosong' });
    }
    fs.writeFileSync(filePath, code, 'utf-8');
    res.json({ ok: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename composition
app.post('/api/compositions/:id/rename', (req, res) => {
  try {
    const { newId } = req.body;
    if (!newId || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(newId)) {
      return res.status(400).json({ error: 'Nama baru tidak valid' });
    }
    const oldId = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const tsxPath = path.join(COMP_DIR, `${oldId}.tsx`);
    const tsPath = path.join(COMP_DIR, `${oldId}.ts`);
    const oldPath = fs.existsSync(tsxPath) ? tsxPath : tsPath;
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Composition tidak ditemukan' });
    }
    const newPath = path.join(COMP_DIR, `${newId}.tsx`);
    if (fs.existsSync(newPath)) {
      return res.status(409).json({ error: 'Nama baru sudah digunakan' });
    }
    fs.renameSync(oldPath, newPath);
    res.json({ ok: true, id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete composition
app.delete('/api/compositions/:id', (req, res) => {
  try {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const tsxPath = path.join(COMP_DIR, `${id}.tsx`);
    const tsPath = path.join(COMP_DIR, `${id}.ts`);
    const filePath = fs.existsSync(tsxPath) ? tsxPath : tsPath;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Composition tidak ditemukan' });
    }
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List renders
app.get('/api/renders', (req, res) => {
  try {
    if (!fs.existsSync(RENDERS_DIR)) return res.json([]);
    const files = fs.readdirSync(RENDERS_DIR)
      .filter(f => /\.(mp4|webm|gif)$/.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(RENDERS_DIR, f));
        return {
          name: f,
          url: `/renders/${f}`,
          size: stat.size,
          createdAt: stat.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/renders/:name', (req, res) => {
  try {
    const filePath = path.join(RENDERS_DIR, path.basename(req.params.name));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File tidak ditemukan' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== RENDER =====
const renderJobs = {};
const renderCancels = {};

app.post('/api/render', async (req, res) => {
  const {
    compositionId,
    props = {},
    durationInFrames = 90,
    fps = 30,
    width = 1280,
    height = 720,
    quality = 'high',
    format = 'mp4'
  } = req.body;

  if (!compositionId) return res.status(400).json({ error: 'compositionId wajib diisi' });

  // ✅ FIX: Sanitize dimensi genap (H.264 butuh divisible by 2)
  const safeWidth = toEven(width);
  const safeHeight = toEven(height);

  if (safeWidth !== width || safeHeight !== height) {
    console.log(`⚠️  Dimensi disesuaikan: ${width}×${height} → ${safeWidth}×${safeHeight} (harus genap)`);
  }

  let renderComposition;
  try {
    renderComposition = require('./src/renderer').renderComposition;
  } catch (err) {
    return res.status(500).json({ error: 'Renderer tidak bisa dimuat: ' + err.message });
  }

  const jobId = uuidv4();
  renderJobs[jobId] = {
    status: 'pending',
    progress: 0,
    output: null,
    error: null,
    stage: 'pending',
    frame: 0,
    totalFrames: durationInFrames,
    previewUrl: null,
    startedAt: Date.now(),
    width: safeWidth,
    height: safeHeight,
    fps,
    format,
    quality
  };
  renderCancels[jobId] = false;

  const previewFileUrl = `/renders/previews/preview.jpg`;

  (async () => {
    try {
      renderJobs[jobId].status = 'rendering';
      const outputPath = path.join(RENDERS_DIR, `${compositionId}_${jobId.slice(0, 8)}.${format}`);

      await renderComposition({
        compositionId,
        props,
        durationInFrames,
        fps,
        width: safeWidth,
        height: safeHeight,
        quality,
        format,
        outputPath,
        onProgress: (p) => {
          if (renderJobs[jobId]) renderJobs[jobId].progress = p;
        },
        onStage: (s) => {
          if (!renderJobs[jobId]) return;
          if (typeof s === 'string' && s.startsWith('rendering-frames:')) {
            const [, frame, total] = s.split(':');
            renderJobs[jobId].stage = 'rendering-frames';
            renderJobs[jobId].frame = parseInt(frame, 10);
            renderJobs[jobId].totalFrames = parseInt(total, 10);
          } else {
            renderJobs[jobId].stage = s;
          }
        },
        onFramePreview: () => {
          if (renderJobs[jobId]) {
            renderJobs[jobId].previewUrl = previewFileUrl + '?t=' + Date.now();
          }
        },
        shouldCancel: () => renderCancels[jobId] === true
      });

      if (renderCancels[jobId]) {
        throw new Error('CANCELED');
      }

      renderJobs[jobId].status = 'done';
      renderJobs[jobId].progress = 100;
      renderJobs[jobId].output = `/renders/${path.basename(outputPath)}`;
      renderJobs[jobId].stage = 'done';
    } catch (err) {
      if (err.message === 'CANCELED' || renderCancels[jobId]) {
        console.log(`🚫 Render ${jobId} dibatalkan`);
        renderJobs[jobId].status = 'canceled';
        renderJobs[jobId].error = 'Dibatalkan oleh user';
        renderJobs[jobId].stage = 'canceled';
      } else {
        console.error('❌ Render error:', err);
        renderJobs[jobId].status = 'error';
        renderJobs[jobId].error = err.message;
      }
    } finally {
      setTimeout(() => {
        delete renderCancels[jobId];
        delete renderJobs[jobId];
      }, 30000);
    }
  })();

  res.json({ jobId });
});

// Cancel render
app.post('/api/render/:jobId/cancel', (req, res) => {
  const jobId = req.params.jobId;
  if (!renderJobs[jobId]) {
    return res.status(404).json({ error: 'Job tidak ditemukan' });
  }
  renderCancels[jobId] = true;

  try {
    const renderer = require('./src/renderer');
    if (renderer.renderComposition && renderer.renderComposition.currentFfmpeg) {
      const proc = renderer.renderComposition.currentFfmpeg;
      try {
        if (process.platform === 'win32') {
          require('child_process').execSync(`taskkill /F /PID ${proc.pid} /T`, { stdio: 'ignore' });
        } else {
          proc.kill('SIGKILL');
        }
      } catch {}
    }
  } catch {}

  renderJobs[jobId].status = 'canceling';
  res.json({ ok: true, message: 'Cancel requested' });
});

// Get job status
app.get('/api/render/:jobId', (req, res) => {
  const job = renderJobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan' });
  res.json(job);
});

app.get('/api/health', (req, res) => {
  let ffmpegPath = 'unknown';
  try { ffmpegPath = require('ffmpeg-static'); } catch {}
  res.json({
    ok: true,
    uptime: process.uptime(),
    node: process.version,
    express: require('express/package.json').version,
    ffmpeg: ffmpegPath
  });
});

// ===== PAGE ROUTES =====
app.get('/', (req, res) => res.redirect('/studio'));
app.get('/studio', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'studio.html')));
app.get('/compositions', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'compositions.html')));
app.get('/render', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'render.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'docs.html')));

// API 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} tidak ditemukan` });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, 'studio.html'));
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🎬  Win Motion Studio v2                        ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  →  http://localhost:${PORT}`);
  console.log(`  →  Compositions: ${COMP_DIR}`);
  console.log(`  →  Renders:      ${RENDERS_DIR}\n`);
});

/* ============================================================
   PROPS DETECTOR (Server-side mirror dari public/js/props-detector.js)
   ============================================================ */
function detectPropsFromCodeServer(code) {
  const fields = [];
  const interfaceMatch = code.match(
    /(?:export\s+)?(?:interface|type)\s+Props\s*(?:=\s*)?\{([\s\S]*?)\}/m
  );
  if (interfaceMatch) {
    const body = interfaceMatch[1];
    const fieldRegex = /(?:^|\n)\s*([a-zA-Z_$][\w$]*)(\?)?\s*:\s*([^;,\n]+)/g;
    let m;
    while ((m = fieldRegex.exec(body)) !== null) {
      const name = m[1];
      const optional = !!m[2];
      const rawType = m[3].trim();
      const def = detectDefaultFromCodeServer(code, name);
      fields.push(parseFieldServer(name, rawType, def, optional));
    }
  }
  if (fields.length === 0) {
    const names = new Set();
    const re = /props\.([a-zA-Z_$][\w$]*)/g;
    let m;
    while ((m = re.exec(code)) !== null) names.add(m[1]);
    [...names].forEach(name => {
      const def = detectDefaultFromCodeServer(code, name);
      const type =
        typeof def === 'boolean' ? 'checkbox' :
        typeof def === 'number' ? 'number' :
        (def && /^#[0-9a-f]{3,8}$/i.test(def)) ? 'color' : 'text';
      fields.push({
        name, type, label: humanizeServer(name),
        defaultValue: def !== undefined ? def : (type === 'checkbox' ? false : type === 'number' ? 0 : ''),
        optional: true
      });
    });
  }
  return fields;
}

function parseFieldServer(name, rawType, def, optional) {
  const t = rawType.toLowerCase();
  if (rawType.includes('|')) {
    const options = [...rawType.matchAll(/'([^']+)'/g)].map(m => m[1]);
    if (options.length > 0) {
      return {
        name, type: 'select', label: humanizeServer(name),
        defaultValue: def !== undefined ? def : options[0], optional, options
      };
    }
  }
  if (t.includes('string') && !t.includes('[]')) {
    const isColor = /color/i.test(name) || /^#[0-9a-f]{3,8}$/i.test(def || '');
    return {
      name, type: isColor ? 'color' : 'text', label: humanizeServer(name),
      defaultValue: def !== undefined ? def : '', optional
    };
  }
  if (t.includes('number')) return {
    name, type: 'number', label: humanizeServer(name),
    defaultValue: def !== undefined ? def : 0, optional
  };
  if (t.includes('boolean')) return {
    name, type: 'checkbox', label: humanizeServer(name),
    defaultValue: def !== undefined ? def : false, optional
  };
  if (t.includes('[]') || t.includes('array')) return {
    name, type: 'json', label: humanizeServer(name),
    defaultValue: def !== undefined ? def : [], optional
  };
  return {
    name, type: 'json', label: humanizeServer(name),
    defaultValue: def !== undefined ? def : {}, optional
  };
}

function detectDefaultFromCodeServer(code, propName) {
  const patterns = [
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*'([^']*)'`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*"([^"]*)"`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*(-?\\d+\\.?\\d*)`, 'i'),
    new RegExp(`props\\.${propName}\\s*(?:\\|\\||\\?\\?)\\s*(true|false)`, 'i'),
  ];
  for (const re of patterns) {
    const m = code.match(re);
    if (m) {
      const val = m[1];
      if (val === 'true') return true;
      if (val === 'false') return false;
      if (/^-?\d/.test(val)) return Number(val);
      return val;
    }
  }
  const destructureRe = new RegExp(`\\b${propName}\\s*=\\s*(?:'([^']*)'|"([^"]*)"|(-?\\d+\\.?\\d*)|(true|false))`, 'i');
  const dm = code.match(destructureRe);
  if (dm) {
    if (dm[1] !== undefined) return dm[1];
    if (dm[2] !== undefined) return dm[2];
    if (dm[3] !== undefined) return Number(dm[3]);
    if (dm[4] === 'true') return true;
    if (dm[4] === 'false') return false;
  }
  return undefined;
}

function humanizeServer(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}