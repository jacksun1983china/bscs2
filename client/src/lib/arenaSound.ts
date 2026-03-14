/**
 * arenaSound.ts — 竞技场音效工具
 *
 * 提供以下音效：
 *   - playSlotStop()   : 滚动停止提示音（真实音效文件）
 *   - playSlotTick()   : 简短滴答音（合成）
 *   - playWinFanfare() : 胜利号角（合成）
 *   - playLoseTone()   : 失败提示音（合成）
 */

// ── CDN 音效文件 ──
const SFX_URLS = {
  slotStop: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/slot-win-alert_70e6b7a7.mp3',
};

let audioCtx: AudioContext | null = null;

/** 检查音效是否被静音 */
function isSfxMuted(): boolean {
  try { return localStorage.getItem('sfx_muted') === 'true'; } catch { return false; }
}

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ── 音效缓存 ──
const bufferCache = new Map<string, AudioBuffer>();

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (bufferCache.has(url)) return bufferCache.get(url)!;
  try {
    const ctx = getCtx();
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    bufferCache.set(url, audioBuf);
    return audioBuf;
  } catch (e) {
    console.warn('[arenaSound] 加载音效失败:', url, e);
    return null;
  }
}

// 预加载音效
let preloaded = false;
function preloadSfx() {
  if (preloaded) return;
  preloaded = true;
  loadBuffer(SFX_URLS.slotStop);
}

/** 播放停止提示音（真实音效） */
export function playSlotStop(level: number = 3) {
  if (isSfxMuted()) return;
  preloadSfx();

  (async () => {
    try {
      const ctx = getCtx();
      const buffer = await loadBuffer(SFX_URLS.slotStop);
      if (!buffer) return;

      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = buffer;

      // 根据品质调整音量和播放速率
      if (level === 1) {
        gain.gain.value = 0.7;
        source.playbackRate.value = 1.0;
      } else if (level === 2) {
        gain.gain.value = 0.5;
        source.playbackRate.value = 1.1;
      } else {
        gain.gain.value = 0.35;
        source.playbackRate.value = 1.3;
      }

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn('[arenaSound] playSlotStop error:', e);
    }
  })();
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

/** 胜利号角（合成音效） */
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

/** 失败提示音（合成音效） */
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
