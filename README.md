<div align="center">

# Win Motion Studio

**Web-based video renderer dengan API ala Remotion | render TypeScript composition menjadi video langsung dari browser (Edisi Windows).**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-Core-40B5A4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://pptr.dev/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Static-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://www.microsoft.com/windows)

[Fitur](#fitur) · [Instalasi](#instalasi-windows) · [Cara Pakai](#cara-pakai) · [API](#api-remotion-like) · [Troubleshooting](#troubleshooting-windows)

</div>

---

## Tentang

**Win Motion Studio** adalah aplikasi web open-source untuk membuat video secara programatik dari **TypeScript compositions** — terinspirasi dari [Remotion](https://remotion.dev), dirancang untuk berjalan secara lokal di **Windows** menggunakan Chrome sebagai renderer dan `ffmpeg-static` sebagai encoder.

> **Catatan Platform:** Edisi ini dikhususkan untuk Windows. Paket `ffmpeg-static` sudah menyertakan binary `ffmpeg.exe`, sehingga instalasi FFmpeg secara manual tidak diperlukan.

### Keunggulan Utama

- **Zero Setup FFmpeg:** Binary sudah terintegrasi di dalam `node_modules`.
- **Browser Native:** Menggunakan Google Chrome atau Microsoft Edge yang sudah terpasang (tanpa mengunduh ulang Chromium ~300MB).
- **Antarmuka Modern & Responsif:** Mendukung mode gelap/terang, font Poppins, dan ikon Font Awesome.
- **Multi-Format Output:** Mendukung ekspor ke MP4, WebM, dan GIF dengan preset resolusi 480p hingga 4K.
- **Editor Terintegrasi:** Buat dan ubah file `.tsx` langsung melalui browser.
- **GUI Props Builder:** Mendeteksi properti secara otomatis dari definisi TypeScript.

---

## Fitur

### Antarmuka Pengguna (UI/UX)
- **Dark/Light Mode:** Penyimpanan preferensi tema secara otomatis.
- **Desain Responsif:** Optimal untuk tampilan desktop, tablet, maupun perangkat seluler.
- **Notifikasi & Dialog:** Toast notifications dan modal dialog kustom.
- **Pemantauan Real-Time:** Progress bar lengkap dengan estimasi waktu (ETA) dan pratinjau frame langsung.

### Mesin Rendering
- **API Kompatibel Remotion:** Mendukung `useCurrentFrame`, `useVideoConfig`, `interpolate`, `spring`, dan `AbsoluteFill`.
- **Preset Resolusi:** 480p, 720p, 1080p, 1440p, dan 4K.
- **Preset Rasio Aspek:** 16:9, 9:16, 1:1, 4:3, 3:4, 4:5, dan 21:9.
- **Preset Frame Rate (FPS):** 24, 25, 30, 50, dan 60 FPS.
- **Format Output:** MP4 (H.264), WebM (VP9), dan GIF.
- **Kontrol Render:** Pratinjau frame langsung saat proses berjalan dan fitur pembatalan proses yang aman.
- **Preset Kualitas:** Low, Medium, High, dan Ultra (berbasis CRF).

### Editor Composition
- **Manajemen File:** Buat, baca, perbarui, dan hapus composition langsung dari browser.
- **Template Siap Pakai:** 7 template dasar (Blank, Title Animation, Slideshow, Counter, Logo Reveal, Animated Bars).
- **Fitur Editor:** Nomor baris, dukungan indentasi Tab, dan pintasan `Ctrl+S` untuk menyimpan.
- **Validasi Dasar:** Pengecekan kecocokan tanda kurung dan eksport komponen.

### Manajemen Props
- **Deteksi Otomatis:** Membaca properti dari `interface Props` pada kode TypeScript.
- **Mode Visual (GUI Builder):** Antarmuka formulir otomatis untuk kemudahan pengisian data.
- **Mode JSON:** Penyuntingan langsung struktur data JSON untuk pengguna tingkat lanjut.
- **Sinkronisasi Dua Arah:** Perubahan pada mode GUI otomatis memperbarui mode JSON, dan sebaliknya.

---

## Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Backend** | Node.js, Express 4 |
| **Renderer** | Puppeteer Core (Chrome/Edge), esbuild |
| **Encoder** | `ffmpeg-static` (Windows binary) |
| **Frontend** | Vanilla JavaScript, HTML5, CSS3 |
| **Composition** | TypeScript, React 18 (bundled) |

---

## Instalasi (Windows)

### Prasyarat Sistem

| Komponen | Keterangan |
| :--- | :--- |
| **Sistem Operasi** | Windows 10 atau Windows 11 (64-bit direkomendasikan) |
| **Node.js ≥ 18** | [Unduh Node.js](https://nodejs.org/) (disarankan versi LTS) |
| **Browser** | [Google Chrome](https://www.google.com/chrome/) atau **Microsoft Edge** (bawaan Windows) |

### Langkah Instalasi

#### 1. Clone Repository
Buka PowerShell atau Command Prompt (CMD), lalu jalankan perintah berikut:

```powershell
git clone https://github.com/hanzcode1/win-motion.git
cd win-motion
```

#### 2. Instalasi Dependensi

```powershell
npm install
```
*Estimasi waktu: 1–3 menit (mengunduh binary `ffmpeg-static` sebesar ~80MB pada instalasi pertama).*

#### 3. Verifikasi Sistem
Jalankan skrip diagnostik untuk memastikan seluruh prasyarat terpenuhi:

```powershell
npm run doctor
```

**Contoh output yang diharapkan:**

```text
================================================
  Win Motion — System Doctor
================================================

> Node.js Environment
  [OK] Node.js v20.x.x
  [OK] Platform: win32 / x64

> Dependencies
  [OK] express v4.21.2
  [OK] cors v2.8.5
  [OK] uuid v11.0.3
  [OK] esbuild v0.24.0
  [OK] puppeteer-core v23.10.0
  [OK] ffmpeg-static v5.3.0

> FFmpeg (static)
  [OK] ffmpeg.exe tersedia: D:\...\node_modules\ffmpeg-static\ffmpeg.exe

> Chrome / Chromium
  [OK] Chrome ditemukan: C:\Program Files\Google\Chrome\Application\chrome.exe

> Compositions
  [OK] HelloWorld.tsx
```

#### 4. Menjalankan Aplikasi

```powershell
npm start
```

Akses aplikasi melalui browser pada alamat **http://localhost:3000**.

---

## Cara Pakai

### 1. Membuat Composition Baru
1. Navigasi ke halaman **`/compositions`**.
2. Klik tombol **"Composition Baru"**.
3. Pilih salah satu template yang tersedia (misalnya: **Title Animation**).
4. Masukkan nama composition, lalu klik **"Buat"**.
5. Sesuaikan kode pada editor dan tekan **`Ctrl+S`** untuk menyimpan perubahan.

### 2. Melakukan Render Video
1. Navigasi ke halaman **`/studio`**.
2. Pilih composition dari panel sidebar.
3. Sesuaikan nilai properti melalui panel GUI atau mode JSON.
4. Tentukan pengaturan **Resolusi**, **Aspect Ratio**, **FPS**, dan **Durasi**.
5. Klik **"Render Video"**.
6. Pantau progres melalui progress bar dan pratinjau langsung.
7. Setelah selesai, video dapat diunduh atau dikelola melalui halaman **`/render`**.

### 3. Contoh Kode Composition

Simpan kode berikut sebagai `src/compositions/MyIntro.tsx`:

```tsx
declare const React: any;
declare const Remotion: any;

const { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } = Remotion;

interface Props {
  title?: string;
  subtitle?: string;
  showBadge?: boolean;
}

export default function MyIntro(props: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = props.title || 'Hello, World!';
  const subtitle = props.subtitle || 'Made with Win Motion';
  const showBadge = props.showBadge ?? true;

  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        background: 'linear-gradient(135deg, #0078d4, #00b7c3)',
        color: 'white',
        fontFamily: 'Poppins, sans-serif',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }
    },
    React.createElement('h1', {
      style: { fontSize: 96, margin: 0, opacity, transform: `scale(${scale})` }
    }, title),
    React.createElement('p', {
      style: { fontSize: 32, marginTop: 20, opacity: 0.9 }
    }, subtitle),
    showBadge && React.createElement('div', {
      style: {
        marginTop: 40,
        padding: '8px 24px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        fontSize: 20
      }
    }, 'WINDOWS EDITION')
  );
}
```

Properti (`title`, `subtitle`, `showBadge`) akan terdeteksi secara otomatis sebagai input formulir di halaman Studio.

---

## API (Remotion-like)

### `useCurrentFrame()`
Mengembalikan indeks frame saat ini (dimulai dari `0`).

```javascript
const frame = useCurrentFrame();
```

### `useVideoConfig()`
Mengembalikan objek konfigurasi video yang sedang dirender.

```javascript
const { fps, width, height, durationInFrames } = useVideoConfig();
```

### `interpolate(input, inputRange, outputRange, opts?)`
Memetakan nilai dari rentang input ke rentang output.

```javascript
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateRight: 'clamp' // Opsi: 'clamp' | 'extend' | 'identity'
});
```

### `spring({ frame, fps, config? })`
Menghasilkan nilai animasi pegas berbasis fisika.

```javascript
const scale = spring({
  frame,
  fps,
  config: {
    damping: 12,    // Default: 10
    stiffness: 100, // Default: 100
    mass: 1         // Default: 1
  }
});
```

### `<AbsoluteFill>`
Komponen pembungkus layar penuh dengan gaya `position: absolute`.

```javascript
React.createElement(AbsoluteFill, { style: { background: '#000' } },
  React.createElement('h1', null, 'Hello!')
);
```

---

## REST API

### Compositions

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/compositions` | Mengambil daftar semua composition |
| `GET` | `/api/compositions/:id` | Mengambil kode sumber composition |
| `GET` | `/api/compositions/:id/props` | Mendeteksi properti (props) secara otomatis |
| `POST` | `/api/compositions` | Membuat composition baru |
| `PUT` | `/api/compositions/:id` | Memperbarui kode composition |
| `POST` | `/api/compositions/:id/rename` | Mengubah nama composition |
| `DELETE` | `/api/compositions/:id` | Menghapus composition |

### Render

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/render` | Memulai proses render baru |
| `GET` | `/api/render/:jobId` | Memeriksa status proses render |
| `POST` | `/api/render/:jobId/cancel` | Membatalkan proses render yang berjalan |

**Contoh Request Body (`POST /api/render`):**

```json
{
  "compositionId": "MyIntro",
  "props": { "title": "Hello!" },
  "durationInFrames": 90,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "quality": "high",
  "format": "mp4"
}
```

### Renders & Utilitas

| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/renders` | Mengambil daftar video hasil render |
| `DELETE` | `/api/renders/:name` | Menghapus file hasil render |
| `GET` | `/api/presets` | Mengambil daftar preset resolusi dan FPS |
| `GET` | `/api/templates` | Mengambil daftar template composition |
| `GET` | `/api/health` | Memeriksa status kesehatan server |

---

## Struktur Project

```text
win-motion/
├── server.js                    # Server Express dan routing API
├── doctor.js                    # Skrip diagnostik prasyarat sistem
├── package.json
├── src/
│   ├── renderer.js              # Mesin render (Puppeteer + ffmpeg-static)
│   └── compositions/            # Direktori file composition (.tsx)
│       └── HelloWorld.tsx
├── public/
│   ├── studio.html              # Antarmuka utama rendering
│   ├── compositions.html        # Antarmuka editor kode
│   ├── render.html              # Galeri hasil render
│   ├── docs.html                # Halaman dokumentasi
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── common.js            # Fungsi utilitas bersama
│       ├── studio.js            # Logika halaman studio
│       ├── compositions.js      # Logika editor kode
│       ├── render.js            # Logika galeri render
│       ├── docs.js
│       └── props-detector.js    # Parser deteksi properti TypeScript
├── renders/                     # Direktori output video (.mp4, .webm, .gif)
│   └── previews/                # Direktori cache pratinjau JPEG
└── README.md
```

---

## Konfigurasi

### Environment Variables

| Variable | Default | Deskripsi |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port jaringan untuk server lokal |
| `CHROME_PATH` | `auto-detect` | Lokasi manual file executable `chrome.exe` atau `msedge.exe` |

**Contoh penggunaan pada PowerShell:**

```powershell
# Mengubah port server
$env:PORT="8080"
npm start

# Menentukan lokasi browser secara manual
$env:CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm start
```

**Contoh penggunaan pada Command Prompt (CMD):**

```cmd
set PORT=8080
npm start

set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
npm start
```

### Preset Kualitas Encoding

| Quality | CRF (MP4) | Preset | Keterangan |
| :--- | :--- | :--- | :--- |
| `low` | 28 | veryfast | Ukuran file kecil, proses render sangat cepat |
| `medium` | 23 | fast | Keseimbangan antara ukuran file dan kualitas |
| `high` | 20 | medium | **Direkomendasikan** untuk hasil produksi |
| `ultra` | 16 | slow | Kualitas visual maksimal, waktu render lebih lama |

---

## Troubleshooting (Windows)

<details>
<summary><b>1. Error: <code>ffmpeg-static tidak ditemukan</code></b></summary>

**Penyebab:** Binary `ffmpeg.exe` gagal diekstrak saat proses `npm install`.

**Solusi:**
Jalankan perintah berikut pada PowerShell untuk membangun ulang paket:

```powershell
# 1. Rebuild paket
npm rebuild ffmpeg-static

# 2. Jika masih gagal, instal ulang paket tersebut
Remove-Item -Recurse -Force node_modules\ffmpeg-static
npm install ffmpeg-static

# 3. Verifikasi lokasi file
node -e "console.log(require('ffmpeg-static'))"
```
Output harus menampilkan path lengkap menuju `ffmpeg.exe`. Jika folder tersebut hanya berisi `index.js`, bersihkan cache npm dan instal ulang secara paksa:
```powershell
npm cache clean --force
npm install ffmpeg-static --force
```
</details>

<details>
<summary><b>2. Error: <code>Chrome/Chromium tidak ditemukan</code></b></summary>

**Penyebab:** Google Chrome tidak terpasang atau berada di direktori kustom.

**Solusi:**
Anda dapat menginstal Google Chrome atau mengarahkan aplikasi ke **Microsoft Edge** (bawaan Windows):

```powershell
$env:CHROME_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
npm start
```

Untuk memeriksa lokasi instalasi Chrome di sistem Anda:
```powershell
Test-Path "C:\Program Files\Google\Chrome\Application\chrome.exe"
Test-Path "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
Test-Path "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
```
</details>

<details>
<summary><b>3. Error: <code>height not divisible by 2 (WxH)</code></b></summary>

**Penyebab:** Codec H.264 (`libx264`) mewajibkan dimensi lebar dan tinggi video berupa bilangan genap.

**Solusi:** Aplikasi memiliki fungsi otomatis untuk membulatkan dimensi ganjil ke bilangan genap terdekat. Pastikan fungsi `toEven` pada `src/renderer.js` berjalan dengan benar:

```javascript
function toEven(n) {
  const num = Math.floor(Number(n));
  if (!num || num < 2) return 2;
  return num % 2 === 0 ? num : num - 1;
}
```
</details>

<details>
<summary><b>4. Puppeteer gagal meluncurkan browser di Windows</b></summary>

**Penyebab:** Perangkat lunak antivirus atau Windows Defender memblokir eksekusi headless browser.

**Solusi:**
1. Tambahkan direktori proyek ke dalam daftar pengecualian (**Exclusions**) pada Windows Security.
2. Jalankan terminal PowerShell dengan hak akses **Administrator**.
3. Lakukan pengujian peluncuran browser secara langsung:

```powershell
node -e "
const puppeteer = require('puppeteer-core');
(async () => {
  try {
    const b = await puppeteer.launch({
      headless: true,
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox']
    });
    console.log('Status OK:', await b.version());
    await b.close();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
"
```
</details>

<details>
<summary><b>5. Proses render berjalan sangat lambat</b></summary>

**Rekomendasi Optimasi:**
- Gunakan resolusi **720p** dan kualitas **Low** saat tahap pengujian komposisi.
- Batasi durasi pengujian (misalnya 3 detik / 90 frame).
- Tutup aplikasi lain yang memakan memori (RAM) dan CPU berlebih sebelum memulai render resolusi tinggi (1080p/4K).

**Estimasi waktu render (untuk 90 frame @ 30fps):**

| Resolusi | Estimasi Waktu |
| :--- | :--- |
| 480p | ~15 detik |
| 720p | ~30 detik |
| 1080p | ~1 menit |
| 4K | ~5 menit |
</details>

<details>
<summary><b>6. Proses <code>npm install</code> terhenti atau lambat</b></summary>

**Penyebab:** Proses pengunduhan binary `ffmpeg-static` (~80MB) terhambat koneksi jaringan.

**Solusi:**
Gunakan registry alternatif atau lakukan instalasi manual:
```powershell
npm install --registry https://registry.npmmirror.com
```
</details>

<details>
<summary><b>7. Error: <code>ENOENT: no such file or directory, open '...\ffmpeg.exe'</code></b></summary>

**Penyebab:** Windows Defender atau antivirus pihak ketiga mengkarantina `ffmpeg.exe` karena dianggap *false positive*.

**Solusi:**
1. Buka **Windows Security** > **Virus & threat protection** > **Protection history**.
2. Pulihkan file `ffmpeg.exe` yang terkarantina.
3. Tambahkan folder `node_modules\ffmpeg-static` ke dalam daftar pengecualian antivirus, lalu jalankan `npm install ffmpeg-static --force`.
</details>

---

## Catatan Khusus Windows

- **Pemisah Direktori (Path Separator):** Windows menggunakan backslash (`\`). Seluruh kode internal telah menggunakan modul `path.join()` untuk menjaga kompatibilitas lintas platform. Hindari penulisan path secara statis (*hardcode*).
- **Sinkronisasi Cloud (OneDrive):** Hindari menyimpan direktori proyek di dalam folder yang tersinkronisasi dengan OneDrive, karena proses penulisan frame sementara dapat memperlambat performa I/O disk secara signifikan. Disarankan menempatkan proyek pada partisi lokal standar (contoh: `D:\projects\win-motion`).
- **Windows Defender Firewall:** Jika ingin mengakses antarmuka web dari perangkat lain dalam satu jaringan lokal, izinkan akses jaringan untuk Node.js saat diminta oleh sistem operasi.

---

## Lisensi

Didistribusikan di bawah lisensi **MIT**. Lihat file `LICENSE` untuk informasi lebih lanjut.

---

## Kredit

Terinspirasi dari proyek open-source berikut:
- [Remotion](https://remotion.dev) — Programmatic video framework
- [Puppeteer](https://pptr.dev) — Headless Chrome Node.js API
- [FFmpeg](https://ffmpeg.org) — Multimedia framework
