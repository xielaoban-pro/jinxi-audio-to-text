const audioInput = document.querySelector("#audio-file");
const audioUrlInput = document.querySelector("#audio-url");
const languageSelect = document.querySelector("#language");
const formatSelect = document.querySelector("#format");
const scriptModeSelect = document.querySelector("#script-mode");
const modelNameSelect = document.querySelector("#model-name");
const modelSourceSelect = document.querySelector("#model-source");
const player = document.querySelector("#player");
const transcribeButton = document.querySelector("#transcribe-btn");
const downloadButton = document.querySelector("#download-btn");
const copyButton = document.querySelector("#copy-btn");
const clearButton = document.querySelector("#clear-btn");
const pickFileButton = document.querySelector("#pick-file-btn");
const loadUrlButton = document.querySelector("#load-url-btn");
const loadSampleButton = document.querySelector("#load-sample-btn");
const modeFileButton = document.querySelector("#mode-file-btn");
const modeUrlButton = document.querySelector("#mode-url-btn");
const urlPanel = document.querySelector("#url-panel");
const dropzone = document.querySelector("#dropzone");
const output = document.querySelector("#output");
const statusNode = document.querySelector("#status");
const segmentsNode = document.querySelector("#segments");
const progressShell = document.querySelector("#progress-shell");
const progressStageNode = document.querySelector("#progress-stage");
const progressPercentNode = document.querySelector("#progress-percent");
const progressFillNode = document.querySelector("#progress-fill");
const progressDetailNode = document.querySelector("#progress-detail");
const metaModelNameNode = document.querySelector("#meta-model-name");
const metaModelSourceNode = document.querySelector("#meta-model-source");

let worker = null;
let audioFile = null;
let audioBuffer = null;
let transcriptionChunks = [];
let currentModelSource = "remote";
let currentModelName = "Xenova/whisper-tiny";
let converters = null;

function updateMetaCards() {
  if (metaModelNameNode) {
    metaModelNameNode.textContent = currentModelName;
  }

  if (metaModelSourceNode) {
    metaModelSourceNode.textContent =
      currentModelSource === "local" ? "本地模型目录" : "远端模型仓库";
  }
}

function getConverters() {
  if (converters) {
    return converters;
  }

  const opencc = window.OpenCC;
  if (!opencc?.Converter) {
    converters = {
      simplified: null,
      traditional: null,
    };
    return converters;
  }

  converters = {
    simplified: opencc.Converter({ from: "tw", to: "cn" }),
    traditional: opencc.Converter({ from: "cn", to: "tw" }),
  };
  return converters;
}

function setProgress({ visible, stage, percent, detail, indeterminate = false }) {
  progressShell.classList.toggle("hidden", !visible);
  progressShell.classList.toggle("indeterminate", Boolean(indeterminate));

  if (!visible) {
    progressFillNode.style.width = "0%";
    progressPercentNode.textContent = "0%";
    return;
  }

  progressStageNode.textContent = stage || "处理中";
  progressDetailNode.textContent = detail || "";

  if (typeof percent === "number" && Number.isFinite(percent)) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    progressFillNode.style.width = `${safePercent}%`;
    progressPercentNode.textContent = `${safePercent}%`;
  } else {
    progressFillNode.style.width = "36%";
    progressPercentNode.textContent = "...";
  }
}

function setStatus(message, type = "") {
  statusNode.textContent = message;
  statusNode.className = type ? `status ${type}` : "status";
}

function pad(number, size = 2) {
  return String(number).padStart(size, "0");
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  return `${pad(minutes)}:${pad(secs)}.${pad(centiseconds)}`;
}

function formatSrtTime(seconds) {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
}

function formatLrcTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  return `[${pad(minutes)}:${pad(secs)}.${pad(centiseconds)}]`;
}

function convertText(text) {
  const mode = scriptModeSelect.value;
  if (mode === "original") {
    return text;
  }

  const { simplified, traditional } = getConverters();

  if (mode === "simplified") {
    return simplified ? simplified(text) : text;
  }

  if (mode === "traditional") {
    return traditional ? traditional(text) : text;
  }

  return text;
}

function getDisplayChunks() {
  return transcriptionChunks.map((item) => ({
    ...item,
    text: convertText(item.text),
  }));
}

function buildOutput(format) {
  const displayChunks = getDisplayChunks();

  if (!displayChunks.length) {
    return "";
  }

  if (format === "txt") {
    return displayChunks.map((item) => item.text).join("\n");
  }

  if (format === "lrc") {
    return displayChunks
      .map((item) => `${formatLrcTime(item.start)} ${item.text}`)
      .join("\n");
  }

  return displayChunks
    .map((item, index) => {
      const end = item.end > item.start ? item.end : item.start + 1.5;
      return [
        String(index + 1),
        `${formatSrtTime(item.start)} --> ${formatSrtTime(end)}`,
        item.text,
        "",
      ].join("\n");
    })
    .join("\n");
}

function renderSegments() {
  const displayChunks = getDisplayChunks();

  if (!displayChunks.length) {
    segmentsNode.innerHTML = '<div style="color:var(--muted);font-size:14px;">暂无结果。</div>';
    return;
  }

  segmentsNode.innerHTML = displayChunks
    .map((item) => {
      return `
        <div class="timeline-item">
          <div class="timeline-time">${formatClock(item.start)}</div>
          <div>${escapeHtml(item.text)}</div>
        </div>
      `;
    })
    .join("");
}

function refreshOutput() {
  output.value = buildOutput(formatSelect.value);
  renderSegments();
  const hasData = transcriptionChunks.length > 0;
  downloadButton.disabled = !hasData;
  copyButton.disabled = !hasData;
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

async function decodeAudio(file) {
  const bytes = await file.arrayBuffer();
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await audioContext.decodeAudioData(bytes.slice(0));
  await audioContext.close();
  return decoded;
}

async function resampleToMono16k(buffer) {
  const targetRate = 16000;
  const frameCount = Math.ceil(buffer.duration * targetRate);
  const offline = new OfflineAudioContext(1, frameCount, targetRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;

  if (buffer.numberOfChannels > 1) {
    const gain = offline.createGain();
    gain.gain.value = 1 / buffer.numberOfChannels;
    source.connect(gain);
    gain.connect(offline.destination);
  } else {
    source.connect(offline.destination);
  }

  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function createWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker("./worker.js", { type: "module" });

  worker.onmessage = (event) => {
    const { type, payload, error } = event.data;

    if (type === "status") {
      setProgress({
        visible: true,
        stage: payload.stage,
        percent: payload.percent,
        detail: payload.detail || payload.message,
        indeterminate: payload.indeterminate,
      });
      setStatus(payload.message, payload.level || "");
      return;
    }

    if (type === "result") {
      transcriptionChunks = payload.chunks;
      refreshOutput();
      transcribeButton.disabled = false;
      transcribeButton.textContent = "开始转字幕";
      setProgress({
        visible: true,
        stage: "转写完成",
        percent: 100,
        detail: `共生成 ${payload.chunks.length} 段字幕。`,
      });
      setStatus(`转写完成，共 ${payload.chunks.length} 段。`, "success");
      return;
    }

    if (type === "error") {
      transcribeButton.disabled = false;
      transcribeButton.textContent = "开始转字幕";
      setProgress({
        visible: true,
        stage: "处理失败",
        percent: 100,
        detail: error || "转写失败。",
      });
      setStatus(error || "转写失败。", "error");
    }
  };

  worker.onerror = () => {
    transcribeButton.disabled = false;
    transcribeButton.textContent = "开始转字幕";
    setProgress({
      visible: true,
      stage: "Worker 错误",
      percent: 100,
      detail: "Worker 初始化失败。",
    });
    setStatus("Worker 初始化失败。", "error");
  };

  return worker;
}

function setMode(mode) {
  const isUrl = mode === "url";
  modeFileButton.classList.toggle("active", !isUrl);
  modeUrlButton.classList.toggle("active", isUrl);
  urlPanel.classList.toggle("hidden", !isUrl);
}

async function useFile(file) {
  audioFile = file;
  transcriptionChunks = [];
  refreshOutput();
  setProgress({ visible: false });
  setStatus("正在解析音频...");

  try {
    audioBuffer = await decodeAudio(file);
    player.src = URL.createObjectURL(file);
    setStatus(`音频已加载：${file.name}`, "success");
  } catch (error) {
    console.error(error);
    audioBuffer = null;
    setStatus("音频解码失败，请更换文件格式。", "error");
  }
}

async function loadAudioFromUrl() {
  const url = audioUrlInput.value.trim();
  if (!url) {
    setStatus("请输入音频 URL。", "error");
    return;
  }

  setStatus("正在加载远程音频...");

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const name = url.split("/").pop() || "remote-audio";
    const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
    await useFile(file);
  } catch (error) {
    console.error(error);
    setStatus("URL 加载失败，可能是跨域限制或地址不可访问。", "error");
  }
}

pickFileButton.addEventListener("click", () => audioInput.click());
loadUrlButton.addEventListener("click", loadAudioFromUrl);
loadSampleButton.addEventListener("click", loadAudioFromUrl);
modeFileButton.addEventListener("click", () => setMode("file"));
modeUrlButton.addEventListener("click", () => setMode("url"));
modelSourceSelect.addEventListener("change", () => {
  currentModelSource = modelSourceSelect.value;
  updateMetaCards();
  setStatus(
    currentModelSource === "local"
      ? "已切换到本地模型目录模式。"
      : "已切换到远端模型仓库模式。",
    "success"
  );
});

modelNameSelect.addEventListener("change", () => {
  currentModelName = modelNameSelect.value;
  updateMetaCards();
  setStatus(
    currentModelName === "Xenova/whisper-base"
      ? "已切换到 whisper-base，准确率更高，但会更慢。"
      : "已切换到 whisper-tiny，速度更快。",
    "success"
  );
});

scriptModeSelect.addEventListener("change", () => {
  refreshOutput();
  const labelMap = {
    original: "原始识别结果",
    simplified: "简体中文",
    traditional: "繁体中文",
  };
  setStatus(`输出字形已切换为：${labelMap[scriptModeSelect.value] || "原始识别结果"}。`, "success");
});

audioInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) {
    await useFile(file);
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    await useFile(file);
  }
});

transcribeButton.addEventListener("click", async () => {
  if (!audioBuffer || !audioFile) {
    setStatus("请先上传或加载音频。", "error");
    return;
  }

  transcribeButton.disabled = true;
  transcribeButton.textContent = "处理中...";
  transcriptionChunks = [];
  refreshOutput();
  setProgress({
    visible: true,
    stage: "准备音频",
    percent: 5,
    detail: "正在把音频重采样为 16kHz 单声道，这一步是本地处理。",
  });
  setStatus("正在准备音频...");

  try {
    const mono16k = await resampleToMono16k(audioBuffer);
    setProgress({
      visible: true,
      stage: "提交转写任务",
      percent: 10,
      detail: `音频预处理完成，准备使用${currentModelSource === "local" ? "本地模型" : "远端模型"}中的 ${currentModelName} 开始转写。`,
      indeterminate: false,
    });
    createWorker().postMessage({
      audio: mono16k,
      language: languageSelect.value,
      modelSource: currentModelSource,
      modelName: currentModelName,
    });
  } catch (error) {
    console.error(error);
    transcribeButton.disabled = false;
    transcribeButton.textContent = "开始转字幕";
    setProgress({
      visible: true,
      stage: "预处理失败",
      percent: 100,
      detail: "音频预处理失败。",
    });
    setStatus("音频预处理失败。", "error");
  }
});

formatSelect.addEventListener("change", refreshOutput);

downloadButton.addEventListener("click", () => {
  const text = buildOutput(formatSelect.value);
  const extension = formatSelect.value;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const baseName = (audioFile?.name || "subtitle").replace(/\.[^.]+$/, "");
  link.href = url;
  link.download = `${baseName}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(buildOutput(formatSelect.value));
    setStatus("结果已复制到剪贴板。", "success");
  } catch (error) {
    console.error(error);
    setStatus("复制失败。", "error");
  }
});

clearButton.addEventListener("click", () => {
  audioInput.value = "";
  audioUrlInput.value = "";
  player.removeAttribute("src");
  player.load();
  output.value = "";
  audioFile = null;
  audioBuffer = null;
  transcriptionChunks = [];
  transcribeButton.disabled = false;
  transcribeButton.textContent = "开始转字幕";
  downloadButton.disabled = true;
  copyButton.disabled = true;
  renderSegments();
  setProgress({ visible: false });
  setStatus("已清空。");
});

renderSegments();
updateMetaCards();
