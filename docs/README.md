# Docs Assets Guide

This directory is reserved for repository documentation assets, especially screenshots used by `README.md` and `README.en.md`.

## Recommended Screenshot Naming

Use clear and stable file names so README references do not need to change often.

Suggested names:

```text
docs/
├─ screenshot-home.png
├─ screenshot-upload-panel.png
├─ screenshot-progress.png
├─ screenshot-result-panel.png
└─ screenshot-timeline.png
```

## Naming Rules

- use lowercase letters
- use hyphen-separated names
- prefer `.png`
- keep one screenshot per feature area
- avoid spaces and Chinese characters in file names

## Suggested Usage

- `screenshot-home.png`
  Main tool page / hero area
- `screenshot-upload-panel.png`
  Upload and settings panel
- `screenshot-progress.png`
  Model loading or transcription progress area
- `screenshot-result-panel.png`
  Final text / SRT / LRC result area
- `screenshot-timeline.png`
  Subtitle segment timeline preview

## README Reference Example

```md
![Main UI](./docs/screenshot-home.png)
![Progress](./docs/screenshot-progress.png)
![Result](./docs/screenshot-result-panel.png)
```

