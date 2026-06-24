# Jinxi Audio to Text

<p align="center">
  <img src="./favicon.svg" alt="Jinxi Audio to Text logo" width="72" height="72">
</p>

<p align="center">
  A browser-based audio transcription tool for generating <strong>TXT</strong>, <strong>SRT</strong>, and <strong>LRC</strong> subtitle results from audio files.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Project-jinxi--audio--to--text-0f766e" alt="Project Name">
  <img src="https://img.shields.io/badge/Type-Browser%20Audio%20Transcription-c46a15" alt="Project Type">
  <img src="https://img.shields.io/badge/Export-TXT%20%7C%20SRT%20%7C%20LRC-1f2937" alt="Export Formats">
  <img src="https://img.shields.io/badge/Preview-Node.js%20Static%20Server-2563eb" alt="Preview Server">
</p>

## Overview

Jinxi Audio to Text is a lightweight browser-first transcription tool built with plain HTML, JavaScript, and a small local static server.

It allows users to:

- upload audio files
- preview audio before transcription
- run Whisper transcription in the browser
- export the result as `TXT`, `SRT`, or `LRC`
- review subtitle segments with timestamps

The main transcription workflow runs on the client side through Transformers.js and Whisper models loaded in a Web Worker.

## Quick Links

- Online preview: [https://www.jxshn.com/tools/gongju/audio-subtitle/transcribe.php](https://www.jxshn.com/tools/gongju/audio-subtitle/transcribe.php)
- Project page: [https://www.jxshn.com/2429.html](https://www.jxshn.com/2429.html)
- GitHub repository: [https://github.com/xielaoban-pro/jinxi-audio-to-text](https://github.com/xielaoban-pro/jinxi-audio-to-text)

## Features

- Browser-side audio transcription
- Local audio upload and direct playback preview
- Public audio URL import
- `TXT`, `SRT`, and `LRC` export
- Timestamped segment preview
- Simplified and traditional Chinese conversion
- Support for remote model repositories and local model directories
- Static deployment friendly

## Screenshot

Current repository screenshots:

![File Upload](./screenshots/01-file-upload.png)
![URL Import](./screenshots/02-url-import.png)
![Result Formats](./screenshots/03-result-formats.png)

If you want to add more README screenshots later, see [docs/README.md](./docs/README.md) for the naming guide.

## Quick Start

### Requirements

- Windows
- `Node.js` installed and available in `PATH`

### Start with BAT

Double-click:

```bat
start-site.bat
```

### Start manually

```bash
node server.js 8000
```

Then open:

```text
http://localhost:8000
```

## How It Works

1. The user uploads an audio file or loads one from a public URL.
2. The browser decodes and resamples the audio.
3. A Web Worker loads the selected Whisper model.
4. Transcription runs in the browser.
5. The result is displayed and exported as text or subtitle files.

This design keeps the tool easy to deploy because it does not require a dedicated transcription backend for the main workflow.

## Project Structure

```text
.
├── index.html          # Main page
├── app.js              # UI logic, audio handling, export flow
├── worker.js           # Whisper model loading and transcription
├── server.js           # Local static server
├── start-site.bat      # Windows startup script
├── screenshots/        # README preview images
├── vendor/             # Frontend dependency files
└── models/             # Optional local model directories
```

## Model Notes

The default model is `Xenova/whisper-tiny`.

The project currently supports local model directories for:

- `Xenova/whisper-tiny`
- `Xenova/whisper-base`

General guidance:

- `tiny` is faster and better for quick testing
- `base` is slower but usually more stable and more accurate

If you want to add more local models, place compatible Transformers.js model files under:

```text
models/Xenova/model-name/
```

Common files include:

```text
config.json
generation_config.json
preprocessor_config.json
tokenizer.json
tokenizer_config.json
onnx/encoder_model_quantized.onnx
onnx/decoder_model_merged_quantized.onnx
```

## Deployment

This project can be deployed as a static frontend tool on services such as:

- Nginx
- Apache
- GitHub Pages
- Cloudflare Pages

Deployment notes:

- `.wasm` files should be served with `application/wasm`
- model files can be large, so first-time loading depends on network conditions
- public audio URLs must allow cross-origin access if imported directly
- the browser must support WebAssembly, Web Workers, and Web Audio API

## Privacy

Uploaded audio is decoded and processed in the browser. A dedicated transcription server is not required for the main workflow.

When remote models are used, the browser will request model files from the configured model repository.

## FAQ

### Does this tool require a transcription backend?

No dedicated transcription backend is required for the main workflow. The primary processing path runs in the user's browser.

### What output formats are supported?

The tool supports `TXT`, `SRT`, and `LRC`.

### Which model should I use?

Use `tiny` for faster tests and lighter devices. Use `base` when you want more stable recognition and can accept longer loading and processing time.

### Can I deploy this as a static site?

Yes. This project is designed to be static-deployment friendly as long as the required model and dependency files are available.

## Typical Use Cases

- audio to text
- audio to subtitle
- MP3 to SRT
- interview transcription drafts
- subtitle drafts for editing workflows

## License

This project uses the [MIT License](./LICENSE).

