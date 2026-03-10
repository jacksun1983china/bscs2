/**
 * CustomerService.tsx — 用户端客服聊天页面
 * 风格：赛博朋克深紫蓝霓虹，与整体设计一致
 * 布局：顶部标题栏 → 用户信息栏 → 聊天区域 → 输入区 → 底部导航
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { ASSETS, getAvatarUrl } from '@/lib/assets';
import BottomNav from '@/components/BottomNav';
import PlayerInfoCard from '@/components/PlayerInfoCard';

// ── 消息气泡 ──────────────────────────────────────────────────────
interface MsgBubbleProps {
  content: string;
  senderType: 'player' | 'agent' | 'system';
  senderName: string;
  senderAvatar: string;
  createdAt: Date;
  isMe: boolean;
}

function MsgBubble({ content, senderType, senderName, senderAvatar, createdAt, isMe }: MsgBubbleProps) {
  const timeStr = new Date(createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (senderType === 'system') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
        <div
          style={{
            background: 'rgba(80, 40, 160, 0.35)',
            border: '1px solid rgba(120, 60, 220, 0.3)',
            borderRadius: 20,
            padding: '4px 14px',
            color: 'rgba(200, 180, 255, 0.8)',
            fontSize: 11,
            maxWidth: '70%',
            textAlign: 'center',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  const avatarUrl = senderAvatar
    ? (senderAvatar.length <= 3 ? getAvatarUrl(senderAvatar) : senderAvatar)
    : getAvatarUrl('001');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMe ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 8,
        margin: '10px 12px',
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: `2px solid ${isMe ? 'rgba(192,132,252,0.6)' : 'rgba(120,60,220,0.5)'}`,
          boxShadow: `0 0 8px ${isMe ? 'rgba(192,132,252,0.4)' : 'rgba(80,20,160,0.4)'}`,
        }}
      >
        <img src={avatarUrl} alt={senderName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* 消息内容 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMe ? 'flex-end' : 'flex-start',
          maxWidth: 'calc(100% - 90px)',
        }}
      >
        {/* 发送者名称 + 时间 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 4,
            flexDirection: isMe ? 'row-reverse' : 'row',
          }}
        >
          <span style={{ color: 'rgba(180, 150, 255, 0.7)', fontSize: 11 }}>{senderName}</span>
          <span style={{ color: 'rgba(120, 100, 180, 0.5)', fontSize: 10 }}>{timeStr}</span>
        </div>

        {/* 气泡 */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isMe
              ? 'linear-gradient(135deg, rgba(108,103,255,0.9) 0%, rgba(32,0,162,0.95) 100%)'
              : 'linear-gradient(135deg, rgba(62,4,111,0.9) 0%, rgba(95,14,146,0.95) 100%)',
            border: `1.5px solid ${isMe ? 'rgba(108,103,255,0.6)' : 'rgba(105,51,0,0.5)'}`,
            boxShadow: `0 2px 12px ${isMe ? 'rgba(108,103,255,0.3)' : 'rgba(62,4,111,0.3)'}`,
            color: '#fff',
            fontSize: 13,
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────────
export default function CustomerService() {
  const [, navigate] = useLocation();
  const [inputText, setInputText] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [lastMsgId, setLastMsgId] = useState<number>(0);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'closed'>('waiting');
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: player } = trpc.player.me.useQuery(undefined, { staleTime: 30_000 });

  const getOrCreateMutation = trpc.cs.getOrCreateSession.useMutation({
    onSuccess: (session) => {
      setSessionId(session.id);
      setSessionStatus(session.status as any);
    },
  });

  const sendMsgMutation = trpc.cs.sendMessage.useMutation({
    onSuccess: (msg) => {
      if (msg) {
        setMessages(prev => [...prev, msg]);
        setLastMsgId(msg.id);
        scrollToBottom();
      }
      setSending(false);
      setInputText('');
    },
    onError: () => setSending(false),
  });

  const closeMutation = trpc.cs.closeSession.useMutation({
    onSuccess: () => setSessionStatus('closed'),
  });

  const utils = trpc.useUtils();

  // 初始化：获取或创建会话
  useEffect(() => {
    if (!player) return;
    getOrCreateMutation.mutate({ title: '' });
  }, [player?.id]);

  // 拉取消息（轮询）
  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;
    try {
      const msgs = await utils.cs.getMessages.fetch({ sessionId, afterId: lastMsgId || undefined });
      if (msgs && msgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const newMsgs = msgs.filter((m: any) => !existingIds.has(m.id));
          return [...prev, ...newMsgs];
        });
        setLastMsgId(msgs[msgs.length - 1].id);
        scrollToBottom();
      }
    } catch {}
  }, [sessionId, lastMsgId]);

  // 初次加载全部消息
  useEffect(() => {
    if (!sessionId) return;
    utils.cs.getMessages.fetch({ sessionId }).then(msgs => {
      if (msgs) {
        setMessages(msgs);
        if (msgs.length > 0) setLastMsgId(msgs[msgs.length - 1].id);
        scrollToBottom();
      }
    });
  }, [sessionId]);

  // 轮询新消息（2秒一次）
  useEffect(() => {
    if (!sessionId || sessionStatus === 'closed') return;
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [sessionId, sessionStatus, fetchMessages]);

  // 轮询会话状态
  useEffect(() => {
    if (!sessionId || sessionStatus === 'closed') return;
    const t = setInterval(async () => {
      try {
        const status = await utils.cs.getSessionStatus.fetch({ sessionId });
        if (status) setSessionStatus(status.status as any);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [sessionId, sessionStatus]);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = () => {
    if (!inputText.trim() || !sessionId || sending || sessionStatus === 'closed') return;
    setSending(true);
    sendMsgMutation.mutate({ sessionId, content: inputText.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="phone-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0621',
        backgroundImage: `url(${ASSETS.bg})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        containerType: 'inline-size',
      }}
    >
      {/* 内容层 */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ── 顶部标题栏 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 14px 8px',
            gap: 10,
            background: 'linear-gradient(180deg, rgba(20,8,50,0.98) 0%, rgba(10,4,30,0.9) 100%)',
            borderBottom: '1px solid rgba(120,60,220,0.3)',
            flexShrink: 0,
          }}
        >
          {/* 返回按钮 */}
          <div
            onClick={() => navigate('/')}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: 8,
              background: 'rgba(80,40,160,0.3)',
              border: '1px solid rgba(120,60,220,0.4)',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8L10 13" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* 标题 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>在线客服</div>
            <div
              style={{
                fontSize: 11,
                marginTop: 2,
                color: sessionStatus === 'active' ? '#4ade80' : sessionStatus === 'closed' ? '#888' : '#f59e0b',
              }}
            >
              {sessionStatus === 'active' ? '● 客服已接入' : sessionStatus === 'closed' ? '会话已结束' : '● 等待客服接入...'}
            </div>
          </div>

          {/* 关闭会话按钮 */}
          {sessionStatus !== 'closed' && sessionId && (
            <div
              onClick={() => closeMutation.mutate({ sessionId })}
              style={{
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: 8,
                background: 'rgba(220,38,38,0.2)',
                border: '1px solid rgba(220,38,38,0.4)',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        {/* ── 用户信息栏 ── */}
        <div style={{ flexShrink: 0, width: '100%' }}>
          <PlayerInfoCard style={{ marginTop: 8 }} />
        </div>

        {/* ── 聊天区域 ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 0',
            background: 'rgba(5,4,18,0.3)',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 12,
                padding: 40,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(108,103,255,0.4) 0%, rgba(62,4,111,0.6) 100%)',
                  border: '2px solid rgba(120,60,220,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                💬
              </div>
              <div style={{ color: 'rgba(180,150,255,0.6)', fontSize: 13, textAlign: 'center' }}>
                正在连接客服...
              </div>
            </div>
          )}

          {messages.map((msg: any) => (
            <MsgBubble
              key={msg.id}
              content={msg.content}
              senderType={msg.senderType}
              senderName={msg.senderName}
              senderAvatar={msg.senderAvatar}
              createdAt={msg.createdAt}
              isMe={msg.senderType === 'player'}
            />
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* ── 输入区 ── */}
        <div
          style={{
            flexShrink: 0,
            padding: '10px 12px',
            background: 'linear-gradient(180deg, rgba(10,4,30,0.95) 0%, rgba(20,8,50,0.98) 100%)',
            borderTop: '1px solid rgba(120,60,220,0.3)',
          }}
        >
          {sessionStatus === 'closed' ? (
            <div
              style={{
                textAlign: 'center',
                color: 'rgba(180,150,255,0.5)',
                fontSize: 13,
                padding: '10px 0',
              }}
            >
              会话已结束
              <span
                onClick={() => {
                  setSessionId(null);
                  setMessages([]);
                  setLastMsgId(0);
                  setSessionStatus('waiting');
                  getOrCreateMutation.mutate({ title: '' });
                }}
                style={{
                  color: '#c084fc',
                  cursor: 'pointer',
                  marginLeft: 8,
                  textDecoration: 'underline',
                }}
              >
                重新发起
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息..."
                rows={2}
                style={{
                  flex: 1,
                  background: 'rgba(30,10,65,0.8)',
                  border: '1.5px solid rgba(120,60,220,0.5)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: 13,
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending || !sessionId}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: inputText.trim() && !sending
                    ? 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)'
                    : 'rgba(60,30,100,0.4)',
                  border: `1.5px solid ${inputText.trim() ? 'rgba(124,58,237,0.7)' : 'rgba(80,40,120,0.3)'}`,
                  cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {sending ? (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="white" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── 底部导航 ── */}
      </div>

      {/* 底部导航 - 永远沉底（flexShrink: 0） */}
      <BottomNav />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
