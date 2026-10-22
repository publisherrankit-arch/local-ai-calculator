// ══════════════════════════════════════════════════════════════
//  VRAMFORGE - Local AI & LLM Hardware Sizing Engine
//  script.js - Accurate VRAM, KV Cache, Speed & Power Math
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. Model Knowledge Base ──
  const MODEL_REGISTRY = {
    // DeepSeek R1 Family
    'deepseek-r1-1.5b': { name: 'DeepSeek-R1 (1.5B)', params: 1.5, layers: 28, hidden: 1536, ollama: 'ollama run deepseek-r1:1.5b', baseSpeed: 95 },
    'deepseek-r1-7b':   { name: 'DeepSeek-R1 (7B)',   params: 7.0, layers: 32, hidden: 4096, ollama: 'ollama run deepseek-r1:7b',   baseSpeed: 55 },
    'deepseek-r1-8b':   { name: 'DeepSeek-R1 (8B)',   params: 8.0, layers: 32, hidden: 4096, ollama: 'ollama run deepseek-r1:8b',   baseSpeed: 50 },
    'deepseek-r1-14b':  { name: 'DeepSeek-R1 (14B)',  params: 14.7, layers: 48, hidden: 5120, ollama: 'ollama run deepseek-r1:14b',  baseSpeed: 34 },
    'deepseek-r1-32b':  { name: 'DeepSeek-R1 (32B)',  params: 32.8, layers: 64, hidden: 5120, ollama: 'ollama run deepseek-r1:32b',  baseSpeed: 22 },
    'deepseek-r1-70b':  { name: 'DeepSeek-R1 (70B)',  params: 70.6, layers: 80, hidden: 8192, ollama: 'ollama run deepseek-r1:70b',  baseSpeed: 14 },
    'deepseek-r1-671b-moe': { name: 'DeepSeek-R1 (671B MoE)', params: 671, activeParams: 37, layers: 61, hidden: 7168, ollama: 'ollama run deepseek-r1:671b', baseSpeed: 8, isMoE: true },

    // Llama 3 Family
    'llama-3.2-1b':  { name: 'Llama 3.2 (1B)',  params: 1.23, layers: 16, hidden: 2048, ollama: 'ollama run llama3.2:1b', baseSpeed: 110 },
    'llama-3.2-3b':  { name: 'Llama 3.2 (3B)',  params: 3.21, layers: 28, hidden: 3072, ollama: 'ollama run llama3.2:3b', baseSpeed: 85 },
    'llama-3.1-8b':  { name: 'Llama 3.1 (8B)',  params: 8.03, layers: 32, hidden: 4096, ollama: 'ollama run llama3.1:8b', baseSpeed: 52 },
    'llama-3.3-70b': { name: 'Llama 3.3 (70B)', params: 70.6, layers: 80, hidden: 8192, ollama: 'ollama run llama3.3:70b', baseSpeed: 15 },
    'llama-3.1-405b': { name: 'Llama 3.1 (405B)', params: 405.0, layers: 126, hidden: 16384, ollama: 'ollama run llama3.1:405b', baseSpeed: 3 },

    // Qwen 2.5 Family
    'qwen-2.5-7b':  { name: 'Qwen 2.5 (7B)',  params: 7.61, layers: 28, hidden: 3584, ollama: 'ollama run qwen2.5:7b',  baseSpeed: 58 },
    'qwen-2.5-14b': { name: 'Qwen 2.5 (14B)', params: 14.7, layers: 48, hidden: 5120, ollama: 'ollama run qwen2.5:14b', baseSpeed: 35 },
    'qwen-2.5-32b': { name: 'Qwen 2.5 (32B)', params: 32.5, layers: 64, hidden: 5120, ollama: 'ollama run qwen2.5:32b', baseSpeed: 23 },
    'qwen-2.5-72b': { name: 'Qwen 2.5 (72B)', params: 72.7, layers: 80, hidden: 8192, ollama: 'ollama run qwen2.5:72b', baseSpeed: 13 },

    // Mistral Family
    'mistral-7b':        { name: 'Mistral (7B v0.3)',   params: 7.24, layers: 32, hidden: 4096, ollama: 'ollama run mistral:7b', baseSpeed: 60 },
    'mixtral-8x7b':      { name: 'Mixtral 8x7B (MoE)', params: 46.7, activeParams: 12.9, layers: 32, hidden: 4096, ollama: 'ollama run mixtral:8x7b', baseSpeed: 32, isMoE: true },
    'mistral-nemo-12b':  { name: 'Mistral NeMo (12B)', params: 12.2, layers: 40, hidden: 5120, ollama: 'ollama run mistral-nemo', baseSpeed: 40 },

    // Diffusion Models
    'flux-schnell': { name: 'FLUX.1 [schnell] (12B)', params: 12.0, layers: 38, hidden: 4096, ollama: '# ComfyUI / Diffusers: FLUX.1 schnell', baseSpeed: 1.8, isDiffusion: true },
    'flux-dev':     { name: 'FLUX.1 [dev] (12B)',     params: 12.0, layers: 38, hidden: 4096, ollama: '# ComfyUI / Diffusers: FLUX.1 dev',     baseSpeed: 1.2, isDiffusion: true },
    'sdxl-base':    { name: 'Stable Diffusion XL (6.6B)', params: 6.6, layers: 32, hidden: 2048, ollama: '# ComfyUI / A1111: SDXL Base 1.0', baseSpeed: 3.5, isDiffusion: true }
  };

  // Bytes per parameter for quantization
  const QUANT_SPECS = {
    'fp16':   { bytesPerParam: 2.05, label: 'FP16 (16-bit uncompressed)' },
    'q8_0':   { bytesPerParam: 1.10, label: 'Q8_0 (8-bit)' },
    'q5_k_m': { bytesPerParam: 0.72, label: 'Q5_K_M (5-bit)' },
    'q4_k_m': { bytesPerParam: 0.58, label: 'Q4_K_M (4-bit default)' },
    'q3_k_m': { bytesPerParam: 0.46, label: 'Q3_K_M (3-bit)' },
    'q2_k':   { bytesPerParam: 0.35, label: 'Q2_K (2-bit)' }
  };

  // Hardware Presets
  const HARDWARE_PRESETS = {
    'rtx3060':    { platform: 'nvidia', vram: 12, watts: 170 },
    'rtx4070':    { platform: 'nvidia', vram: 12, watts: 200 },
    'rtx4090':    { platform: 'nvidia', vram: 24, watts: 450 },
    'macm4pro':   { platform: 'apple',  vram: 24, watts: 45  },
    'macm2ultra': { platform: 'apple',  vram: 64, watts: 110 },
    'dual3090':   { platform: 'nvidia', vram: 48, watts: 700 }
  };

  // ── 2. DOM Elements ──
  const platformSelect = document.getElementById('platformType');
  const vramInput      = document.getElementById('vramAmount');
  const vramSlider     = document.getElementById('vramSlider');
  const modelSelect    = document.getElementById('modelSelect');
  const quantSelect    = document.getElementById('quantSelect');
  const contextSelect  = document.getElementById('contextLength');
  const kvQuantSelect  = document.getElementById('kvQuant');
  const concurInput    = document.getElementById('concurrency');

  // Outputs
  const verdictBanner  = document.getElementById('verdictBanner');
  const verdictIcon    = document.getElementById('verdictIcon');
  const verdictTitle   = document.getElementById('verdictTitle');
  const verdictSub     = document.getElementById('verdictSub');
  const speedEst       = document.getElementById('speedEst');
  const memorySummary  = document.getElementById('memorySummary');

  // Memory Bar
  const barWeights     = document.getElementById('barWeights');
  const barKv          = document.getElementById('barKv');
  const barOverhead    = document.getElementById('barOverhead');
  const limitMarker    = document.getElementById('limitMarker');

  // Legend Values
  const valWeights     = document.getElementById('valWeights');
  const valKv          = document.getElementById('valKv');
  const valOverhead    = document.getElementById('valOverhead');
  const valFree        = document.getElementById('valFree');

  // Terminal & Advice
  const cliCommand     = document.getElementById('cliCommand');
  const btnCopyCommand = document.getElementById('btnCopyCommand');
  const adviceIcon     = document.getElementById('adviceIcon');
  const adviceTitle    = document.getElementById('adviceTitle');
  const adviceBody     = document.getElementById('adviceBody');

  // Power Calculator Elements
  const gpuWattsInput  = document.getElementById('gpuWatts');
  const kwhRateInput   = document.getElementById('kwhRate');
  const dailyHoursSlider = document.getElementById('dailyHours');
  const monthlyCost    = document.getElementById('monthlyCost');
  const monthlyKwh     = document.getElementById('monthlyKwh');
  const yearlyCost     = document.getElementById('yearlyCost');
  const cloudComp      = document.getElementById('cloudComparison');

  // ── 3. Core Sizing Calculation Engine ──
  function runCalculation() {
    const platform = platformSelect.value;
    const vramCap  = parseFloat(vramInput.value) || 12;
    const modelKey = modelSelect.value;
    const quantKey = quantSelect.value;
    const ctxTokens = parseInt(contextSelect.value, 10) || 8192;
    const kvQuant  = kvQuantSelect.value || 'fp16';
    const streams  = parseInt(concurInput.value, 10) || 1;

    const model = MODEL_REGISTRY[modelKey] || MODEL_REGISTRY['deepseek-r1-8b'];
    const quant = QUANT_SPECS[quantKey] || QUANT_SPECS['q4_k_m'];

    // A. Model Weights Size (GB)
    // Formula: Total params in Billions * bytes per param
    const weightGigaBytes = model.params * quant.bytesPerParam;

    // B. KV Cache Calculation (GB)
    // Standard KV cache: 2 * layers * hiddenSize * 2 bytes (FP16) * tokens * streams / 10^9
    let kvMultiplier = 1.0;
    if (kvQuant === 'q8_0') kvMultiplier = 0.5;
    if (kvQuant === 'q4_0') kvMultiplier = 0.25;

    // Attention KV size in Gigabytes
    const kvGigaBytes = ((2 * model.layers * model.hidden * 2 * ctxTokens * streams * kvMultiplier) / (1024 * 1024 * 1024));

    // C. Driver & OS Overhead
    let overheadGigaBytes = 1.2; // default Nvidia
    if (platform === 'apple') {
      overheadGigaBytes = 0.8;
    } else if (platform === 'cpu') {
      overheadGigaBytes = 2.0;
    }

    const totalRequired = weightGigaBytes + kvGigaBytes + overheadGigaBytes;
    const freeMemory = Math.max(0, vramCap - totalRequired);

    // Update Numerical Legend
    valWeights.textContent  = `${weightGigaBytes.toFixed(1)} GB`;
    valKv.textContent       = `${kvGigaBytes.toFixed(1)} GB`;
    valOverhead.textContent = `${overheadGigaBytes.toFixed(1)} GB`;
    valFree.textContent     = `${freeMemory.toFixed(1)} GB`;
    memorySummary.textContent = `${totalRequired.toFixed(1)} / ${vramCap} GB (${Math.round((totalRequired / vramCap) * 100)}%)`;

    // Stacked Bar Percentages
    // If totalRequired > vramCap, normalize by totalRequired so user visualizes the overflow
    const scaleBase = Math.max(vramCap, totalRequired);
    const pctWeights  = (weightGigaBytes / scaleBase) * 100;
    const pctKv       = (kvGigaBytes / scaleBase) * 100;
    const pctOverhead = (overheadGigaBytes / scaleBase) * 100;

    barWeights.style.width  = `${pctWeights}%`;
    barKv.style.width       = `${pctKv}%`;
    barOverhead.style.width = `${pctOverhead}%`;

    // Show overflow limit line if overflowed
    if (totalRequired > vramCap) {
      const limitPct = (vramCap / scaleBase) * 100;
      limitMarker.style.display = 'block';
      limitMarker.style.left = `${limitPct}%`;
    } else {
      limitMarker.style.display = 'none';
    }

    // D. Diagnostic Verdict & Speed Estimation
    const vramDeficit = totalRequired - vramCap;

    if (totalRequired <= vramCap) {
      // 🟢 100% Full Acceleration
      verdictBanner.className = 'verdict-banner status-green';
      verdictIcon.textContent = '🟢';
      verdictTitle.textContent = '100% Pure GPU Acceleration';
      verdictSub.textContent = `Model and ${Math.round(ctxTokens / 1024)}k context window fit completely inside ${vramCap}GB memory.`;

      // Speed calculation
      let speed = model.baseSpeed;
      if (platform === 'apple') speed = Math.round(speed * 0.85);
      if (quantKey === 'fp16') speed = Math.round(speed * 0.65);
      speedEst.textContent = model.isDiffusion ? `${speed.toFixed(1)} s/it` : `~${Math.round(speed)}`;

      adviceIcon.textContent = '⚡';
      adviceTitle.textContent = 'Optimal Configuration';
      adviceBody.textContent = `Your hardware possesses ${freeMemory.toFixed(1)} GB of headroom. You can safely increase the context window to 32k or use a higher precision quantization (e.g. Q5_K_M or Q8_0) for improved reasoning logic.`;

    } else if (vramDeficit <= (weightGigaBytes * 0.45)) {
      // 🟡 Partial Offload (Spills to RAM)
      verdictBanner.className = 'verdict-banner status-yellow';
      verdictIcon.textContent = '🟡';
      verdictTitle.textContent = 'Partial CPU/RAM Offload';
      verdictSub.textContent = `VRAM exceeded by ${vramDeficit.toFixed(1)} GB. Framework will offload remaining layers to slow system RAM.`;

      speedEst.textContent = model.isDiffusion ? `~18 s/it` : `~4-9`;

      adviceIcon.textContent = '⚠️';
      adviceTitle.textContent = 'Speed Degradation Warning';
      adviceBody.textContent = `While this model will run, token speed drops 5x-10x during CPU offload. Recommend: Switch quantization to Q3_K_M or lower the context window to 4,096 tokens to bring it within your ${vramCap}GB threshold.`;

    } else {
      // 🔴 Out of Memory (OOM)
      verdictBanner.className = 'verdict-banner status-red';
      verdictIcon.textContent = '🔴';
      verdictTitle.textContent = 'Out of Memory (OOM Warning)';
      verdictSub.textContent = `Requires ${totalRequired.toFixed(1)} GB, but you only have ${vramCap} GB available (${vramDeficit.toFixed(1)} GB deficit).`;

      speedEst.textContent = `< 1`;

      adviceIcon.textContent = '🛑';
      adviceTitle.textContent = 'Hardware Upgrade Required';
      adviceBody.textContent = `To run ${model.name} locally, you need at least ${Math.ceil(totalRequired)}GB of VRAM/Unified Memory. Upgrade suggestion: Consider adding a secondary GPU or deploying on a Mac Studio with 64GB Unified Memory.`;
    }

    // E. CLI Command Generator
    let cmd = model.ollama;
    if (quantKey !== 'q4_k_m' && !model.isDiffusion) {
      cmd += `:${quantKey}`;
    }
    cliCommand.textContent = cmd;
  }

  // ── 4. Electricity & Power Cost Engine ──
  function runPowerCalculation() {
    const watts = parseFloat(gpuWattsInput.value) || 280;
    const rate  = parseFloat(kwhRateInput.value) || 0.16;
    const hours = parseFloat(dailyHoursSlider.value) || 8;

    // Monthly kWh = (Watts * hours/day * 30.4) / 1000
    const kwhMonthly = (watts * hours * 30.41) / 1000;
    const costMonth  = kwhMonthly * rate;
    const costYear   = costMonth * 12;

    monthlyCost.textContent = `$${costMonth.toFixed(2)}`;
    monthlyKwh.textContent  = `${kwhMonthly.toFixed(1)} kWh/month (${hours}h daily)`;
    yearlyCost.textContent  = `$${costYear.toFixed(2)}`;

    // Comparison with typical AI subscriptions
    const cloudSubCost = 240 + 240; // ChatGPT Plus + Claude Pro = $480/yr
    const savings = cloudSubCost - costYear;
    if (savings > 0) {
      cloudComp.textContent = `Saves ~$${Math.round(savings)}/year compared to ChatGPT Plus ($20/mo) & Claude Pro ($20/mo).`;
    } else {
      cloudComp.textContent = `High continuous power usage. Optimize idle sleep states when not prompting.`;
    }
  }

  // ── 5. Presets Handler ──
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const preset = HARDWARE_PRESETS[presetKey];
      if (!preset) return;

      platformSelect.value = preset.platform;
      vramInput.value      = preset.vram;
      vramSlider.value     = Math.min(128, preset.vram);
      gpuWattsInput.value  = preset.watts;

      // Animate button feedback
      btn.style.transform = 'scale(0.96)';
      setTimeout(() => btn.style.transform = '', 150);

      runCalculation();
      runPowerCalculation();
    });
  });

  // ── 6. Event Listeners ──
  // Sync VRAM Input with Slider
  vramInput.addEventListener('input', () => {
    vramSlider.value = vramInput.value;
    runCalculation();
  });

  vramSlider.addEventListener('input', () => {
    vramInput.value = vramSlider.value;
    runCalculation();
  });

  platformSelect.addEventListener('change', runCalculation);
  modelSelect.addEventListener('change', runCalculation);
  quantSelect.addEventListener('change', runCalculation);
  contextSelect.addEventListener('change', runCalculation);
  kvQuantSelect.addEventListener('change', runCalculation);
  concurInput.addEventListener('input', runCalculation);

  // Power Inputs
  gpuWattsInput.addEventListener('input', runPowerCalculation);
  kwhRateInput.addEventListener('input', runPowerCalculation);
  dailyHoursSlider.addEventListener('input', runPowerCalculation);

  // Copy CLI Command Button
  btnCopyCommand.addEventListener('click', () => {
    const textToCopy = cliCommand.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = btnCopyCommand.textContent;
      btnCopyCommand.textContent = '✅ Copied!';
      setTimeout(() => btnCopyCommand.textContent = originalText, 2000);
    });
  });

  // Advanced Toggle Drawer
  const btnToggleAdv = document.getElementById('btnToggleAdv');
  const advDrawer    = document.getElementById('advDrawer');
  const advIcon      = document.getElementById('advIcon');

  btnToggleAdv.addEventListener('click', () => {
    const isHidden = advDrawer.classList.contains('hidden');
    if (isHidden) {
      advDrawer.classList.remove('hidden');
      advIcon.textContent = '−';
    } else {
      advDrawer.classList.add('hidden');
      advIcon.textContent = '+';
    }
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const panel = btn.nextElementSibling;
      const isOpen = item.classList.contains('active');

      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('active');
        const p = other.querySelector('.faq-panel');
        if (p) p.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('active');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // Initial Calculation Run
  runCalculation();
  runPowerCalculation();
});
