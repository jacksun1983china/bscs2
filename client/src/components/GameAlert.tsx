/**
 * GameAlert.tsx — 全项目公共提示弹窗组件
 * 使用赛博朋克风格背景框（d09e9b0c...png）
 * 替换全项目的 alert() 系统弹窗
 *
 * 使用方式：
 *   import { useGameAlert, GameAlertProvider } from '@/components/GameAlert';
 *   const { showAlert } = useGameAlert();
 *   showAlert('提示内容');
 *   showAlert('提示内容', { title: '标题', onConfirm: () => {} });
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ── 弹窗背景图 CDN 地址 ──────────────────────────────────────────
const ALERT_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/d09e9b0c41659080572b5e90cc65a06e_5c765143.png';

// ── 类型定义 ─────────────────────────────────────────────────────
interface AlertOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'info' | 'success' | 'error' | 'warning';
}

interface AlertState {
  visible: boolean;
  message: string;
  options: AlertOptions;
}

interface GameAlertContextType {
  showAlert: (message: string, options?: AlertOptions) => void;
  hideAlert: () => void;
}

// ── Context ──────────────────────────────────────────────────────
const GameAlertContext = createContext<GameAlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

// ── Provider ─────────────────────────────────────────────────────
export function GameAlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    message: '',
    options: {},
  });

  const showAlert = useCallback((message: string, options: AlertOptions = {}) => {
    setState({ visible: true, message, options });
  }, []);

  const hideAlert = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const handleConfirm = () => {
    state.options.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    state.options.onCancel?.();
    hideAlert();
  };

  // 颜色主题
  const typeColors: Record<string, string> = {
    info: '#a78bfa',
    success: '#4ade80',
    error: '#f87171',
    warning: '#fbbf24',
  };
  const accentColor = typeColors[state.options.type ?? 'info'];

  return (
    <GameAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      {state.visible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={handleCancel}
        >
          {/* 弹窗主体 */}
          <div
            style={{
              position: 'relative',
              width: 'min(88vw, 420px)',
              minHeight: 180,
              backgroundImage: `url(${ALERT_BG})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 32px 28px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* 标题 */}
            {state.options.title && (
              <div
                style={{
                  color: accentColor,
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 12,
                  textShadow: `0 0 12px ${accentColor}88`,
                  letterSpacing: 1,
                  textAlign: 'center',
                }}
              >
                {state.options.title}
              </div>
            )}

            {/* 消息内容 */}
            <div
              style={{
                color: '#e2e8f0',
                fontSize: 15,
                lineHeight: 1.6,
                textAlign: 'center',
                marginBottom: 28,
                flex: 1,
                wordBreak: 'break-word',
              }}
            >
              {state.message}
            </div>

            {/* 按钮区域 */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {state.options.showCancel && (
                <button
                  onClick={handleCancel}
                  style={{
                    flex: 1,
                    maxWidth: 120,
                    padding: '10px 0',
                    borderRadius: 6,
                    border: '1px solid rgba(167,139,250,0.4)',
                    background: 'rgba(167,139,250,0.1)',
                    color: '#a78bfa',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    letterSpacing: 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {state.options.cancelText ?? '取消'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  maxWidth: state.options.showCancel ? 120 : 160,
                  padding: '10px 0',
                  borderRadius: 6,
                  border: 'none',
                  background: `linear-gradient(135deg, ${accentColor}cc 0%, ${accentColor}88 100%)`,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 1,
                  boxShadow: `0 0 16px ${accentColor}44`,
                  transition: 'all 0.2s',
                }}
              >
                {state.options.confirmText ?? '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </GameAlertContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────
export function useGameAlert() {
  return useContext(GameAlertContext);
}
