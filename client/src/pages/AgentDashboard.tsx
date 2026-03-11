/**
 * AgentDashboard.tsx — 客服坐席工作台（微信风格）
 * 结构：会话列表页（首屏）→ 点击进入聊天详情页（全屏覆盖）
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { getAvatarUrl } from '@/lib/assets';

// -- 工具函数 ----------------------------------------------------------
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function formatTime(date: Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '昨天';
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function formatMsgTime(date: Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// -- 类型定义 ----------------------------------------------------------
interface Session {
  id: number;
  playerId: number;
  agentId: number | null;
  status: 'waiting' | 'active' | 'closed';
  title: string;
  agentUnread: number;
  playerUnread: number;
  lastMessage: string;
  lastMessageAt: Date | null;
  createdAt: Date;
}

interface Message {
  id: number;
  sessionId: number;
  senderType: 'player' | 'agent' | 'system';
  senderId: number;
  senderName: string;
  senderAvatar: string;
  msgType: 'text' | 'image';
  content: string;
  isRead: number;
  createdAt: Date;
}

interface Agent {
  id: number;
  name: string;
  username: string;
  status: 'online' | 'busy' | 'offline';
  activeSessionCount: number;
  maxSessions: number;
}

// -- 消息气泡 ----------------------------------------------------------
function MsgBubble({ msg, agentId }: { msg: Message; agentId: number }) {
  const isAgent = msg.senderType === 'agent';
  const isSystem = msg.senderType === 'system';
  const timeStr = formatMsgTime(msg.createdAt);

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
        <span style={{
          background: 'rgba(0,0,0,0.18)',
          borderRadius: 10,
          padding: '3px 12px',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 11,
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  const avatarUrl = msg.senderAvatar
    ? (msg.senderAvatar.length <= 3 ? getAvatarUrl(msg.senderAvatar) : msg.senderAvatar)
    : getAvatarUrl('001');

  return (
    <div style={{
      display: 'flex',
      flexDirection: isAgent ? 'row-reverse' : 'row',
      alignItems: 'flex-start',
      gap: 8,
      margin: '8px 12px',
    }}>
      {/* 头像 */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 0,
        background: isAgent ? '#07c160' : '#576b95',
      }}>
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* 气泡 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isAgent ? 'flex-end' : 'flex-start',
        maxWidth: 'calc(100% - 100px)',
        gap: 4,
      }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{timeStr}</span>
        <div style={{
          padding: '10px 14px',
          borderRadius: isAgent ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
          background: isAgent ? '#07c160' : 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: 15,
          lineHeight: 1.55,
          wordBreak: 'break-word',
          position: 'relative',
        }}>
          {/* 三角 */}
          <div style={{
            position: 'absolute',
            top: 12,
            [isAgent ? 'right' : 'left']: -6,
            width: 0,
            height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            [isAgent ? 'borderLeft' : 'borderRight']: `6px solid ${isAgent ? '#07c160' : 'rgba(255,255,255,0.12)'}`,
          }} />
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// -- 会话列表项 ----------------------------------------------------------
function SessionListItem({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  const isWaiting = session.status === 'waiting';
  const unread = session.agentUnread || 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        background: 'transparent',
        transition: 'background 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* 头像 */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 8,
          background: isWaiting
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #576b95, #3b4f73)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
        }}>
          👤
        </div>
        {/* 未读红点 */}
        {unread > 0 && (
          <div style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#f44',
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#fff',
            padding: '0 4px',
          }}>
            {unread > 99 ? '99+' : unread}
          </div>
        )}
        {/* 等待标记 */}
        {isWaiting && (
          <div style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            background: '#f59e0b',
            borderRadius: 6,
            padding: '1px 5px',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
          }}>
            待接
          </div>
        )}
      </div>

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
            用户 #{session.playerId}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            {formatTime(session.lastMessageAt)}
          </span>
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.lastMessage || '暂无消息'}
        </div>
      </div>
    </div>
  );
}

// -- 聊天详情页 ----------------------------------------------------------
function ChatPage({
  session,
  agent,
  onBack,
  onAccept,
  onClose,
}: {
  session: Session;
  agent: Agent;
  onBack: () => void;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMsgId, setLastMsgId] = useState(0);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: quickRepliesData } = trpc.cs.getQuickReplies.useQuery(undefined);
  useEffect(() => { if (quickRepliesData) setQuickReplies(quickRepliesData); }, [quickRepliesData]);

  const sendMutation = trpc.cs.agentSendMessage.useMutation({
    onSuccess: (msg) => {
      if (msg) {
        setMessages(prev => [...prev, msg as any]);
        setLastMsgId((msg as any).id);
        scrollToBottom();
      }
      setSending(false);
      setInputText('');
    },
    onError: () => setSending(false),
  });

  const fetchMessages = useCallback(async (afterId?: number) => {
    try {
      const msgs = await utils.cs.agentGetMessages.fetch({ sessionId: session.id, afterId });
      return msgs || [];
    } catch { return []; }
  }, [session.id]);

  // 初始加载消息
  useEffect(() => {
    fetchMessages().then(msgs => {
      setMessages(msgs as any);
      if (msgs.length > 0) setLastMsgId((msgs[msgs.length - 1] as any).id);
      scrollToBottom();
    });
  }, [session.id]);

  // 轮询新消息（2秒）
  useEffect(() => {
    const t = setInterval(async () => {
      const msgs = await fetchMessages(lastMsgId || undefined);
      if (msgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const newMsgs = (msgs as any[]).filter(m => !existingIds.has(m.id));
          return [...prev, ...newMsgs];
        });
        setLastMsgId((msgs[msgs.length - 1] as any).id);
        scrollToBottom();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [lastMsgId, fetchMessages]);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  const handleSend = (text?: string) => {
    const content = text || inputText.trim();
    if (!content || sending) return;
    setSending(true);
    setShowQuickReply(false);
    sendMutation.mutate({ sessionId: session.id, content });
    if (!text) setInputText('');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#1a1a2e',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* 顶部导航栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        height: 56,
        background: 'rgba(15,12,41,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        gap: 10,
      }}>
        {/* 返回按钮 */}
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#07c160',
            fontSize: 24,
            cursor: 'pointer',
            padding: '4px 8px 4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="#07c160" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* 用户名 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 700 }}>
            用户 #{session.playerId}
          </div>
          <div style={{ fontSize: 11, color: session.status === 'active' ? '#07c160' : '#f59e0b', marginTop: 1 }}>
            {session.status === 'active' ? '进行中' : '等待接入'}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {session.status === 'waiting' && (
            <button
              onClick={onAccept}
              style={{
                background: '#07c160',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                padding: '6px 12px',
                cursor: 'pointer',
              }}
            >
              接入
            </button>
          )}
          {session.status === 'active' && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 8,
                color: '#fca5a5',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              结束
            </button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0 16px',
        background: '#1a1a2e',
      }}>
        {messages.length === 0 && (
          <div style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 14,
          }}>
            暂无消息记录
          </div>
        )}
        {messages.map((msg: any) => (
          <MsgBubble key={msg.id} msg={msg} agentId={agent.id} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 快捷回复面板 */}
      {showQuickReply && quickReplies.length > 0 && (
        <div style={{
          maxHeight: 160,
          overflowY: 'auto',
          background: 'rgba(15,12,41,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '10px 14px',
        }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>快捷回复</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickReplies.map((qr: any) => (
              <button
                key={qr.id}
                onClick={() => handleSend(qr.content)}
                style={{
                  background: 'rgba(7,193,96,0.15)',
                  border: '1px solid rgba(7,193,96,0.35)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: 13,
                  color: '#07c160',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {qr.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div style={{
        padding: '10px 12px',
        background: 'rgba(10,8,30,0.98)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {session.status !== 'active' ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '8px 0' }}>
            请先接入会话才能发送消息
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* 快捷回复按钮 */}
            <button
              onClick={() => setShowQuickReply(v => !v)}
              style={{
                width: 38,
                height: 38,
                background: showQuickReply ? 'rgba(7,193,96,0.2)' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${showQuickReply ? 'rgba(7,193,96,0.5)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 10,
                color: '#07c160',
                fontSize: 16,
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="快捷回复"
            >
              ⚡
            </button>

            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入消息..."
              rows={2}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                padding: '9px 12px',
                color: '#fff',
                fontSize: 15,
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
                fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(7,193,96,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />

            {/* 发送按钮 */}
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || sending}
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 10,
                background: inputText.trim() && !sending ? '#07c160' : 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                color: inputText.trim() && !sending ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              发送
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// -- 主工作台（会话列表页） --------------------------------------------------
export default function AgentDashboard() {
  const [, navigate] = useLocation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const utils = trpc.useUtils();

  const { data: agentData, refetch: refetchAgent } = trpc.cs.agentMe.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (agentData) setAgent(agentData as any);
    else if (agentData === null) navigate('/agent/login');
  }, [agentData]);

  // Web Push
  const registerPushMutation = trpc.cs.registerPushSubscription.useMutation();
  const { data: vapidData } = trpc.cs.getVapidPublicKey.useQuery(undefined, { enabled: !!agentData });

  useEffect(() => {
    if (!agentData) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/agent-sw.js', { scope: '/' }).catch(() => {});
    }
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifEnabled(true);
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => setNotifEnabled(p === 'granted'));
      }
    }
  }, [agentData]);

  useEffect(() => {
    if (!agentData || !notifEnabled || !vapidData?.publicKey) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    async function subscribePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) { setPushSubscribed(true); return; }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData!.publicKey),
        });
        const subJson = sub.toJSON();
        await registerPushMutation.mutateAsync({
          endpoint: subJson.endpoint!,
          p256dh: (subJson.keys as any)?.p256dh || '',
          auth: (subJson.keys as any)?.auth || '',
          deviceLabel: navigator.userAgent.slice(0, 100),
        });
        setPushSubscribed(true);
      } catch {}
    }
    subscribePush();
  }, [agentData, notifEnabled, vapidData]);

  const sendBrowserNotif = useCallback((title: string, body: string) => {
    if (!notifEnabled || document.visibilityState === 'visible') return;
    try { new Notification(title, { body, icon: '/img/logok.png', tag: 'cs-message' }); } catch {}
  }, [notifEnabled]);

  const acceptMutation = trpc.cs.agentAcceptSession.useMutation({
    onSuccess: () => {
      fetchSessions();
      // 刷新当前会话状态
      if (activeSession) {
        setActiveSession(prev => prev ? { ...prev, status: 'active', agentId: agent?.id ?? null } : null);
      }
    },
  });

  const closeMutation = trpc.cs.agentCloseSession.useMutation({
    onSuccess: () => {
      fetchSessions();
      setActiveSession(null);
    },
  });

  const updateStatusMutation = trpc.cs.agentUpdateStatus.useMutation({
    onSuccess: () => { refetchAgent(); setShowStatusMenu(false); },
  });

  const logoutMutation = trpc.cs.agentLogout.useMutation({
    onSuccess: () => navigate('/agent/login'),
  });

  const fetchSessions = useCallback(async () => {
    try {
      const data = await utils.cs.agentGetSessions.fetch({});
      if (data) {
        setSessions(prev => {
          const newSessions = data as any[];
          const prevWaiting = new Set(prev.filter(s => s.status === 'waiting').map(s => s.id));
          newSessions.filter(s => s.status === 'waiting' && !prevWaiting.has(s.id)).forEach(s => {
            sendBrowserNotif('新客服请求', `用户 #${s.playerId} 正在等待接入`);
          });
          return newSessions;
        });
        // 同步更新当前打开的会话状态
        if (activeSession) {
          const updated = (data as any[]).find(s => s.id === activeSession.id);
          if (updated) setActiveSession(updated);
        }
      }
    } catch {}
  }, [sendBrowserNotif, activeSession]);

  useEffect(() => {
    if (!agentData) return;
    fetchSessions();
  }, [agentData]);

  useEffect(() => {
    if (!agentData) return;
    const t = setInterval(fetchSessions, 3000);
    return () => clearInterval(t);
  }, [agentData, fetchSessions]);

  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const activeSessions = sessions.filter(s => s.status === 'active');
  const totalUnread = sessions.reduce((sum, s) => sum + (s.agentUnread || 0), 0);

  const statusConfig = {
    online: { color: '#07c160', label: '在线' },
    busy: { color: '#f59e0b', label: '忙碌' },
    offline: { color: '#6b7280', label: '离线' },
  };

  // 如果有打开的会话，显示聊天详情页
  if (activeSession && agent) {
    return (
      <ChatPage
        session={activeSession}
        agent={agent}
        onBack={() => { setActiveSession(null); fetchSessions(); }}
        onAccept={() => acceptMutation.mutate({ sessionId: activeSession.id })}
        onClose={() => closeMutation.mutate({ sessionId: activeSession.id })}
      />
    );
  }

  // 会话列表页
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f0c29',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif',
      overflow: 'hidden',
    }}>
      {/* 顶部栏（微信风格） */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: 56,
        background: 'rgba(15,12,41,0.98)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* 标题 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
            客服工作台
          </span>
          {totalUnread > 0 && (
            <span style={{
              marginLeft: 6,
              background: '#f44',
              borderRadius: 10,
              padding: '1px 6px',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}>
              {totalUnread}
            </span>
          )}
        </div>

        {/* 右侧：坐席状态 + 退出 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'absolute', right: 12 }}>
          {agent && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusMenu(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 13,
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusConfig[agent.status].color,
                }} />
                {agent.name}
              </button>
              {showStatusMenu && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  background: '#1e1b3a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  zIndex: 200,
                  minWidth: 110,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {(['online', 'busy', 'offline'] as const).map(s => (
                    <div
                      key={s}
                      onClick={() => updateStatusMutation.mutate({ status: s })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        background: agent.status === s ? 'rgba(7,193,96,0.1)' : 'transparent',
                        color: agent.status === s ? statusConfig[s].color : 'rgba(255,255,255,0.7)',
                        fontSize: 14,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = agent.status === s ? 'rgba(7,193,96,0.1)' : 'transparent')}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusConfig[s].color }} />
                      {statusConfig[s].label}
                    </div>
                  ))}
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div
                    onClick={() => logoutMutation.mutate()}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      color: '#fca5a5',
                      fontSize: 14,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    退出登录
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 统计条 */}
      <div style={{
        display: 'flex',
        padding: '8px 16px',
        gap: 12,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>{waitingSessions.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>等待中</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>|</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color: '#07c160', fontSize: 13, fontWeight: 700 }}>{activeSessions.length}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>进行中</span>
        </div>
        {agent && (
          <>
            <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>|</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: '#c084fc', fontSize: 13, fontWeight: 700 }}>
                {agent.activeSessionCount}/{agent.maxSessions}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>容量</span>
            </div>
          </>
        )}
      </div>

      {/* 会话列表 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 等待接入分组 */}
        {waitingSessions.length > 0 && (
          <>
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              color: '#f59e0b',
              fontWeight: 600,
              background: 'rgba(245,158,11,0.05)',
              borderBottom: '1px solid rgba(245,158,11,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ animation: 'blink 1.2s ease-in-out infinite', display: 'inline-block' }}>●</span>
              等待接入 ({waitingSessions.length})
            </div>
            {waitingSessions.map(s => (
              <SessionListItem
                key={s.id}
                session={s}
                onClick={() => setActiveSession(s)}
              />
            ))}
          </>
        )}

        {/* 进行中分组 */}
        {activeSessions.length > 0 && (
          <>
            <div style={{
              padding: '8px 16px',
              fontSize: 12,
              color: '#07c160',
              fontWeight: 600,
              background: 'rgba(7,193,96,0.04)',
              borderBottom: '1px solid rgba(7,193,96,0.08)',
            }}>
              ● 进行中 ({activeSessions.length})
            </div>
            {activeSessions.map(s => (
              <SessionListItem
                key={s.id}
                session={s}
                onClick={() => setActiveSession(s)}
              />
            ))}
          </>
        )}

        {/* 空状态 */}
        {sessions.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            gap: 12,
            color: 'rgba(255,255,255,0.25)',
          }}>
            <div style={{ fontSize: 56 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>暂无会话</div>
            <div style={{ fontSize: 13 }}>等待玩家发起客服请求</div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        textarea::placeholder { color: rgba(255,255,255,0.25); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}
