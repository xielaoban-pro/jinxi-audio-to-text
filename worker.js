let pipelineFactory = null;
let env = null;
const transcribers = new Map();

async function loadTransformers() {
  if (pipelineFactory) {
    return;
  }

  const module = await import("./vendor/transformers.js");
  pipelineFactory = module.pipeline;
  env = module.env;
  env.allowLocalModels = true;
  env.useBrowserCache = true;

  env.localModelPath = new URL("./models/", self.location.href).href;
}

function mapLanguage(value) {
  if (value === "zh") return "chinese";
  if (value === "en") return "english";
  if (value === "ja") return "japanese";
  return null;
}

async function getTranscriber(modelSource, modelName, progressCallback) {
  await loadTransformers();

  const cacheKey = `${modelSource}:${modelName}`;
  if (!transcribers.has(cacheKey)) {
    env.allowLocalModels = true;
    env.localModelPath = new URL("./models/", self.location.href).href;
    env.allowRemoteModels = modelSource !== "local";

    const transcriber = await pipelineFactory(
      "automatic-speech-recognition",
      modelName,
      {
        progress_callback: progressCallback,
        local_files_only: modelSource === "local",
      }
    );
    transcribers.set(cacheKey, transcriber);
  }

  return transcribers.get(cacheKey);
}

self.addEventListener("message", async (event) => {
  try {
    const modelSource = event.data.modelSource === "local" ? "local" : "remote";
    const modelName = event.data.modelName || "Xenova/whisper-tiny";
    const sourceLabel = modelSource === "local" ? "本地模型目录" : "远端模型仓库";
    const modelShortName = modelName.split("/").pop();

    self.postMessage({
      type: "status",
      payload: {
        message: `当前模式：${sourceLabel}，模型：${modelShortName}`,
        stage: "准备模型",
        percent: 10,
        detail: modelSource === "local"
          ? `将只从项目目录 models/${modelName}/ 读取模型文件。`
          : "将优先从远端模型仓库加载模型文件，并使用浏览器缓存。",
        indeterminate: false,
        level: "",
      },
    });

    const model = await getTranscriber(modelSource, modelName, (progress) => {
      const fileInfo = progress.file ? `文件: ${progress.file}` : "正在准备模型资源。";

      if (progress.status === "initiate") {
        self.postMessage({
          type: "status",
          payload: {
            message: "开始加载模型...",
            stage: "加载模型",
            percent: 12,
            detail: `${sourceLabel}，模型 ${modelShortName}，${fileInfo}`,
            indeterminate: true,
            level: "",
          },
        });
      } else if (progress.status === "progress") {
        const percent = typeof progress.progress === "number"
          ? 12 + Math.round(progress.progress * 0.72)
          : null;
        self.postMessage({
          type: "status",
          payload: {
            message: `模型加载中 ${Math.round(progress.progress)}%`,
            stage: "下载模型",
            percent,
            detail: `${sourceLabel}，模型 ${modelShortName}，${fileInfo}${progress.loaded ? `，已接收 ${progress.loaded} bytes` : ""}`,
            indeterminate: false,
            level: "",
          },
        });
      } else if (progress.status === "done") {
        self.postMessage({
          type: "status",
          payload: {
            message: "模型已加载，开始转写...",
            stage: "初始化完成",
            percent: 88,
            detail: `${sourceLabel}，模型 ${modelShortName}，${fileInfo}`,
            indeterminate: false,
            level: "",
          },
        });
      }
    });

    self.postMessage({
      type: "status",
      payload: {
        message: "模型初始化完成，正在执行转写。",
        stage: "执行转写",
        percent: 92,
        detail: `当前使用${sourceLabel}中的 ${modelShortName}。这一步取决于音频长度和机器性能。`,
        indeterminate: true,
        level: "",
      },
    });

    const result = await model(event.data.audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      task: "transcribe",
      language: mapLanguage(event.data.language),
    });

    const chunks = (result.chunks || [])
      .map((item) => ({
        start: item.timestamp?.[0] ?? 0,
        end: item.timestamp?.[1] ?? item.timestamp?.[0] ?? 0,
        text: (item.text || "").trim(),
      }))
      .filter((item) => item.text);

    self.postMessage({
      type: "result",
      payload: { chunks },
    });
  } catch (error) {
    console.error(error);
    self.postMessage({
      type: "error",
      error: error?.message || String(error),
    });
  }
});
