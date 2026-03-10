/**
 * useSound.ts — 全局音效管理 Hook
 *
 * 功能：
 * - 背景音乐（BGM）全局循环播放，用户首次交互后自动开始
 * - 音效播放（点击、中奖、失败、旋转停止、铃声等）
 * - 音量控制和静音切换，状态持久化到 localStorage
 *
 * 使用方式：
 *   const { playClick, playWin, playLose, playSpinStop, isMuted, toggleMute } = useSound();
 */
import { useCallback, useEffect, useRef } from 'react';

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

// ── 全局音频实例（单例，避免重复创建）────────────────────────────
let bgmAudio: HTMLAudioElement | null = null;
let isMutedGlobal = (() => {
  try { return localStorage.getItem('sound_muted') === 'true'; } catch { return false; }
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
  if (isMutedGlobal) return;
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
  if (isMutedGlobal) return;
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

// ── Hook ─────────────────────────────────────────────────────────
export function useSound() {
  // 使用 ref 追踪当前静音状态（避免闭包问题）
  const mutedRef = useRef(isMutedGlobal);

  // 同步 ref 与全局状态
  const getMuted = useCallback(() => isMutedGlobal, []);

  const toggleMute = useCallback(() => {
    isMutedGlobal = !isMutedGlobal;
    mutedRef.current = isMutedGlobal;
    try { localStorage.setItem('sound_muted', String(isMutedGlobal)); } catch {/* 忽略 */}
    if (isMutedGlobal) {
      stopBgm();
    } else {
      startBgm();
    }
    // 触发重渲染
    window.dispatchEvent(new CustomEvent('soundMuteChange', { detail: isMutedGlobal }));
  }, []);

  // 监听静音状态变化（跨组件同步）
  useEffect(() => {
    const handler = (e: Event) => {
      mutedRef.current = (e as CustomEvent).detail;
    };
    window.addEventListener('soundMuteChange', handler);
    return () => window.removeEventListener('soundMuteChange', handler);
  }, []);

  return {
    isMuted: getMuted(),
    toggleMute,
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
