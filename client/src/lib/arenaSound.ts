/**
 * arenaSound.ts — 竞技场音效工具（Web Audio API 合成，无需外部文件）
 *
 * 提供三种音效：
 *   - playSlotSpin()   : 老虎机滚动音（快速随机噪声）
 *   - playSlotStop()   : 滚动停止音（品质越高音效越华丽）
 *   - playWinFanfare() : 胜利号角
 *   - playLoseTone()   : 失败提示音
 */

let audioCtx: AudioContext | null = null;

/** 检查音效是否被静音 */
function isSfxMuted(): boolean {
  try { return localStorage.getItem('sfx_muted') === 'true'; } catch { return false; }
}

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ── SLOT 旋转持续音效 ──
let spinOsc: OscillatorNode | null = null;
let spinGain: GainNode | null = null;
let spinLfo: OscillatorNode | null = null;

/** 开始播放 SLOT 旋转循环音效（持续播放直到调用 stopSlotSpin） */
export function playSlotSpin() {
  if (isSfxMuted()) return;
  try {
    stopSlotSpin(); // 先停止之前的
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 主振荡器：模拟滚轮转动的嗡嗡声
    spinOsc = ctx.createOscillator();
    spinGain = ctx.createGain();
    spinOsc.type = 'sawtooth';
    spinOsc.frequency.setValueAtTime(120, now);

    // LFO 调制频率，产生"滚动"感
    spinLfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    spinLfo.type = 'sine';
    spinLfo.frequency.setValueAtTime(8, now); // 8Hz 调制
    lfoGain.gain.setValueAtTime(30, now); // 频率偏移量
    spinLfo.connect(lfoGain);
    lfoGain.connect(spinOsc.frequency);

    // 音量：淡入
    spinOsc.connect(spinGain);
    spinGain.connect(ctx.destination);
    spinGain.gain.setValueAtTime(0, now);
    spinGain.gain.linearRampToValueAtTime(0.06, now + 0.3);

    spinOsc.start(now);
    spinLfo.start(now);
  } catch {}
}

/** 停止 SLOT 旋转循环音效（淡出） */
export function stopSlotSpin() {
  try {
    if (spinGain && spinOsc) {
      const ctx = getCtx();
      const now = ctx.currentTime;
      spinGain.gain.cancelScheduledValues(now);
      spinGain.gain.setValueAtTime(spinGain.gain.value, now);
      spinGain.gain.linearRampToValueAtTime(0, now + 0.15);
      spinOsc.stop(now + 0.2);
      spinLfo?.stop(now + 0.2);
    }
  } catch {}
  spinOsc = null;
  spinGain = null;
  spinLfo = null;
}

/** 播放简短的滴答音（老虎机滚动时循环调用） */
export function playSlotTick() {
  if (isSfxMuted()) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + Math.random() * 400, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch {}
}

/** 播放停止音效，level决定华丽程度 */
export function playSlotStop(level: number = 3) {
  if (isSfxMuted()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    if (level === 1) {
      // 传说：三音和弦 + 金属撞击
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.25, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.8);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.8);
      });
      // 金属撞击
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(1200, now);
      noise.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      noise.start(now);
      noise.stop(now + 0.15);
    } else if (level === 2) {
      // 稀有：双音上扬
      [440, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.18, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.5);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.5);
      });
    } else {
      // 普通/回收：单音短促
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {}
}

/** 胜利号角 */
export function playWinFanfare() {
  if (isSfxMuted()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  } catch {}
}

/** 失败提示音 */
export function playLoseTone() {
  if (isSfxMuted()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
}
