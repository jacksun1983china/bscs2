/**
 * useSound.ts — 全局音效管理 Hook
 *
 * 功能：
 * - 背景音乐（BGM）全局循环播放，用户首次交互后自动开始
 * - 音效播放（点击、中奖、失败、旋转停止、铃声等）
 * - **音乐和音效独立控制**：分别持久化到 localStorage
 *
 * 使用方式：
 *   const { playClick, isMusicOn, isSfxOn, toggleMusic, toggleSfx } = useSound();
 */
import { useCallback, useEffect, useState } from 'react';

// ── CDN 音效地址 ──────────────────────────────────────────────────
const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

export const SOUND_URLS = {
  bgm:      `${CDN}/bgm_7d6d5ecd.mp3`,
  click:    `${CDN}/click_87f2f04e.mp3`,
  win:      `${CDN}/win_9d1ca62e.mp3`,
  lose:     `${CDN}/lose_cde8823d.mp3`,
  spinStop: `${CDN}/spin_stop_8ba80f5e.mp3`,
  ring:     `${CDN}/ring_d1b4fd4d.mp3`,
  betUp:    `${CDN}/bet_up_a8d1fd9c.mp3`,
  betDown:  `${CDN}/bet_down_fad60c93.mp3`,
} as const;

// ── 全局状态 ─────────────────────────────────────────────────────
let bgmAudio: HTMLAudioElement | null = null;

// 分离音乐和音效的静音状态
let isMusicMutedGlobal = (() => {
  try { return localStorage.getItem('music_muted') === 'true'; } catch { return false; }
})();
let isSfxMutedGlobal = (() => {
  try { return localStorage.getItem('sfx_muted') === 'true'; } catch { return false; }
})();

// 兼容旧的 sound_muted（如果存在，迁移到新的 key）
(() => {
  try {
    const oldMuted = localStorage.getItem('sound_muted');
    if (oldMuted === 'true') {
      isMusicMutedGlobal = true;
      isSfxMutedGlobal = true;
      localStorage.setItem('music_muted', 'true');
      localStorage.setItem('sfx_muted', 'true');
      localStorage.removeItem('sound_muted');
    }
  } catch {/* 忽略 */}
})();

// ── 音效缓存池 ────────────────────────────────────────────────────
const sfxCache: Record<string, HTMLAudioElement> = {};

function getSfxAudio(url: string): HTMLAudioElement {
  if (!sfxCache[url]) {
    const audio = new Audio(url);
    audio.preload = 'auto';
    sfxCache[url] = audio;
  }
  return sfxCache[url];
}

function playSfx(url: string, volume = 0.7) {
  if (isSfxMutedGlobal) return;
  try {
    const audio = getSfxAudio(url);
    // 克隆节点以支持快速连续播放
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.volume = volume;
    clone.play().catch(() => {/* 忽略自动播放限制 */});
  } catch {/* 忽略错误 */}
}

// ── 初始化 BGM ────────────────────────────────────────────────────
function initBgm() {
  if (bgmAudio) return;
  bgmAudio = new Audio(SOUND_URLS.bgm);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.25;
  bgmAudio.preload = 'auto';
}

function startBgm() {
  if (isMusicMutedGlobal) return;
  initBgm();
  if (bgmAudio && bgmAudio.paused) {
    bgmAudio.play().catch(() => {/* 忽略自动播放限制 */});
  }
}

function stopBgm() {
  if (bgmAudio && !bgmAudio.paused) {
    bgmAudio.pause();
  }
}

// ── 用户首次交互后启动 BGM ────────────────────────────────────────
let bgmStarted = false;
function onFirstInteraction() {
  if (bgmStarted) return;
  bgmStarted = true;
  startBgm();
  document.removeEventListener('click', onFirstInteraction);
  document.removeEventListener('touchstart', onFirstInteraction);
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onFirstInteraction, { once: true });
  document.addEventListener('touchstart', onFirstInteraction, { once: true });
}

// ── 事件名 ───────────────────────────────────────────────────────
const MUSIC_CHANGE_EVENT = 'musicMuteChange';
const SFX_CHANGE_EVENT = 'sfxMuteChange';

// ── Hook ─────────────────────────────────────────────────────────
export function useSound() {
  const [musicOn, setMusicOn] = useState(!isMusicMutedGlobal);
  const [sfxOn, setSfxOn] = useState(!isSfxMutedGlobal);

  // 切换背景音乐
  const toggleMusic = useCallback(() => {
    isMusicMutedGlobal = !isMusicMutedGlobal;
    try { localStorage.setItem('music_muted', String(isMusicMutedGlobal)); } catch {/* 忽略 */}
    if (isMusicMutedGlobal) {
      stopBgm();
    } else {
      startBgm();
    }
    setMusicOn(!isMusicMutedGlobal);
    window.dispatchEvent(new CustomEvent(MUSIC_CHANGE_EVENT, { detail: isMusicMutedGlobal }));
  }, []);

  // 切换音效
  const toggleSfx = useCallback(() => {
    isSfxMutedGlobal = !isSfxMutedGlobal;
    try { localStorage.setItem('sfx_muted', String(isSfxMutedGlobal)); } catch {/* 忽略 */}
    setSfxOn(!isSfxMutedGlobal);
    window.dispatchEvent(new CustomEvent(SFX_CHANGE_EVENT, { detail: isSfxMutedGlobal }));
  }, []);

  // 兼容旧的 toggleMute（同时切换音乐和音效）
  const toggleMute = useCallback(() => {
    // 如果任一开着，就全关；否则全开
    const shouldMute = !isMusicMutedGlobal || !isSfxMutedGlobal;
    isMusicMutedGlobal = shouldMute;
    isSfxMutedGlobal = shouldMute;
    try {
      localStorage.setItem('music_muted', String(shouldMute));
      localStorage.setItem('sfx_muted', String(shouldMute));
    } catch {/* 忽略 */}
    if (shouldMute) {
      stopBgm();
    } else {
      startBgm();
    }
    setMusicOn(!shouldMute);
    setSfxOn(!shouldMute);
    window.dispatchEvent(new CustomEvent(MUSIC_CHANGE_EVENT, { detail: shouldMute }));
    window.dispatchEvent(new CustomEvent(SFX_CHANGE_EVENT, { detail: shouldMute }));
  }, []);

  // 监听跨组件状态变化
  useEffect(() => {
    const handleMusic = (e: Event) => {
      setMusicOn(!(e as CustomEvent).detail);
    };
    const handleSfx = (e: Event) => {
      setSfxOn(!(e as CustomEvent).detail);
    };
    window.addEventListener(MUSIC_CHANGE_EVENT, handleMusic);
    window.addEventListener(SFX_CHANGE_EVENT, handleSfx);
    return () => {
      window.removeEventListener(MUSIC_CHANGE_EVENT, handleMusic);
      window.removeEventListener(SFX_CHANGE_EVENT, handleSfx);
    };
  }, []);

  return {
    // 状态
    isMusicOn: musicOn,
    isSfxOn: sfxOn,
    isMuted: !musicOn && !sfxOn, // 兼容旧接口
    // 控制
    toggleMusic,
    toggleSfx,
    toggleMute, // 兼容旧接口：同时切换
    // 各类音效播放函数
    playClick:    () => playSfx(SOUND_URLS.click, 0.6),
    playWin:      () => playSfx(SOUND_URLS.win, 0.8),
    playLose:     () => playSfx(SOUND_URLS.lose, 0.6),
    playSpinStop: () => playSfx(SOUND_URLS.spinStop, 0.7),
    playRing:     () => playSfx(SOUND_URLS.ring, 0.7),
    playBetUp:    () => playSfx(SOUND_URLS.betUp, 0.5),
    playBetDown:  () => playSfx(SOUND_URLS.betDown, 0.5),
    startBgm,
    stopBgm,
  };
}
