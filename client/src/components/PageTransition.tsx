/**
 * PageTransition — 全局页面入场动效 + Loading 页面
 * 
 * 使用方式：
 * 1. <PageLoader /> — 全屏Loading页面（进入游戏/页面时使用）
 * 2. <PageSlideIn> ... </PageSlideIn> — 页面从底部滑入动效
 * 3. <PageFadeIn> ... </PageFadeIn> — 页面淡入动效
 */
import { useEffect, useState } from 'react';

// ──────────────────────────────────────────────
// 全屏 Loading 页面
// ──────────────────────────────────────────────
interface PageLoaderProps {
  text?: string;
  visible?: boolean;
  minDuration?: number; // 最短显示时间(ms)，防止闪烁
}

export function PageLoader({ text = '加载中...', visible = true, minDuration = 600 }: PageLoaderProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShow(true);
    } else {
      const timer = setTimeout(() => setShow(false), 300); // 淡出动画
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #0d0621 0%, #1a0a3a 50%, #0d0621 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* 粒子背景 */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#c084fc' : i % 3 === 1 ? '#7df9ff' : '#a855f7',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `floatParticle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
              opacity: 0.6,
            }}
          />
        ))}
      </div>

      {/* Logo 区域 */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        {/* 外圈光环 */}
        <div style={{
          position: 'absolute',
          inset: -20,
          borderRadius: '50%',
          border: '2px solid rgba(168,85,247,0.3)',
          animation: 'pulseRing 1.5s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          inset: -10,
          borderRadius: '50%',
          border: '1px solid rgba(125,249,255,0.2)',
          animation: 'pulseRing 1.5s ease-in-out infinite 0.3s',
        }} />
        {/* 中心图标 */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 30px rgba(168,85,247,0.6)',
          animation: 'rotateSlow 3s linear infinite',
        }}>
          <span style={{ fontSize: 36 }}>⚡</span>
        </div>
      </div>

      {/* BDCS2 文字 */}
      <div style={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 28,
        fontWeight: 900,
        background: 'linear-gradient(90deg, #c084fc, #7df9ff, #c084fc)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shimmerText 2s linear infinite',
        letterSpacing: 4,
        marginBottom: 24,
      }}>
        BDCS2
      </div>

      {/* 进度条 */}
      <div style={{
        width: 200,
        height: 3,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #7c3aed, #c084fc, #7df9ff)',
          borderRadius: 2,
          animation: 'loadingBar 1.2s ease-in-out infinite',
        }} />
      </div>

      {/* 文字 */}
      <span style={{
        color: 'rgba(192,132,252,0.8)',
        fontSize: 13,
        fontFamily: 'sans-serif',
        letterSpacing: 2,
        animation: 'fadeInOut 1.5s ease-in-out infinite',
      }}>
        {text}
      </span>

      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
        }
        @keyframes pulseRing {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmerText {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes loadingBar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// 页面从底部滑入动效
// ──────────────────────────────────────────────
interface PageSlideInProps {
  children: React.ReactNode;
  duration?: number; // ms
  delay?: number;    // ms
}

export function PageSlideIn({ children, duration = 350, delay = 0 }: PageSlideInProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        transform: mounted ? 'translateY(0)' : 'translateY(30px)',
        opacity: mounted ? 1 : 0,
        transition: `transform ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, opacity ${duration}ms ease ${delay}ms`,
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// 页面淡入动效
// ──────────────────────────────────────────────
interface PageFadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
}

export function PageFadeIn({ children, duration = 300, delay = 0 }: PageFadeInProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        opacity: mounted ? 1 : 0,
        transition: `opacity ${duration}ms ease ${delay}ms`,
        height: '100%',
      }}
    >
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// 带 Loading 的页面包装器（自动显示Loading然后滑入内容）
// ──────────────────────────────────────────────
interface PageWithLoadingProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export function PageWithLoading({ children, loading = false, loadingText }: PageWithLoadingProps) {
  const [showContent, setShowContent] = useState(!loading);
  const [showLoader, setShowLoader] = useState(loading);

  useEffect(() => {
    if (!loading) {
      // loading结束后延迟一点再显示内容
      const t1 = setTimeout(() => setShowLoader(false), 300);
      const t2 = setTimeout(() => setShowContent(true), 100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setShowLoader(true);
      setShowContent(false);
    }
  }, [loading]);

  return (
    <>
      {showLoader && <PageLoader visible={loading} text={loadingText} />}
      {showContent && (
        <PageSlideIn>
          {children}
        </PageSlideIn>
      )}
    </>
  );
}
