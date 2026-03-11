/**
 * AgentDashboard.tsx — 客服坐席工作台（重新设计）
 * 功能：会话列表 + 实时聊天回复 + 快捷回复 + 坐席状态管理 + 浏览器推送通知
 * 移动端友好，现代化 UI
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { getAvatarUrl } from '@/lib/assets';

// -- 工具函数 ------------------------------------------------------
/** 将 Base64 URL 编码的 VAPID 公钥转换为 Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// -- 类型定义 ------------------------------------------------------
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

// -- 工具函数 ------------------------------------------------------
function formatTime(date: Date | null) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

// -- 消息气泡 ------------------------------------------------------
function MsgBubble({ msg }: { msg: Message }) {
  const isAgent = msg.senderType === 'agent';
  const isSystem = msg.senderType === 'system';
  const timeStr = new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 20,
            padding: '4px 14px',
            color: 'rgba(200,180,255,0.5)',
            fontSize: 11,
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  const avatarUrl = msg.senderAvatar
    ? (msg.senderAvatar.length <= 3 ? getAvatarUrl(msg.senderAvatar) : msg.senderAvatar)
    : getAvatarUrl('001');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isAgent ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        margin: '6px 12px',
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: `2px solid ${isAgent ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.15)'}`,
        }}
      >
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* 内容 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAgent ? 'flex-end' : 'flex-start',
          maxWidth: 'calc(100% - 90px)',
          gap: 3,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            flexDirection: isAgent ? 'row-reverse' : 'row',
          }}
        >
          <span style={{ color: 'rgba(200,180,255,0.6)', fontSize: 11, fontWeight: 600 }}>
            {msg.senderName}
          </span>
          <span style={{ color: 'rgba(150,130,200,0.4)', fontSize: 10 }}>{timeStr}</span>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: isAgent ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
            background: isAgent
              ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
              : 'rgba(255,255,255,0.08)',
            border: isAgent ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: isAgent ? '0 4px 12px rgba(124,58,237,0.3)' : 'none',
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// -- 会话列表项 ------------------------------------------------------
function SessionItem({
  session,
  isActive,
  isWaiting,
  onClick,
  onAccept,
}: {
  session: Session;
  isActive: boolean;
  isWaiting: boolean;
  onClick: () => void;
  onAccept?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        background: isActive
          ? 'rgba(124,58,237,0.2)'
          : 'transparent',
        borderLeft: `3px solid ${isActive ? '#7c3aed' : 'transparent'}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* 头像 */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: isWaiting
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            boxShadow: isWaiting ? '0 0 12px rgba(245,158,11,0.4)' : 'none',
          }}
        >
          👤
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
              用户 #{session.playerId}
            </span>
            <span style={{ color: 'rgba(180,150,255,0.45)', fontSize: 11 }}>
              {formatTime(session.lastMessageAt)}
            </span>
          </div>
          <div
            style={{
              color: 'rgba(180,150,255,0.55)',
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {session.lastMessage || (isWaiting ? '⏳ 等待接入...' : '暂无消息')}
          </div>
        </div>

        {/* 未读数 */}
        {session.agentUnread > 0 && (
          <div
            style={{
              background: '#ef4444',
              borderRadius: '50%',
              minWidth: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              padding: '0 4px',
            }}
          >
            {session.agentUnread > 9 ? '9+' : session.agentUnread}
          </div>
        )}
      </div>

      {/* 接入按钮 */}
      {isWaiting && onAccept && (
        <button
          onClick={e => { e.stopPropagation(); onAccept(); }}
          style={{
            marginTop: 8,
            width: '100%',
            background: 'linear-gradient(135deg, rgba(74,222,128,0.25) 0%, rgba(22,163,74,0.35) 100%)',
            border: '1px solid rgba(74,222,128,0.5)',
            borderRadius: 8,
            color: '#4ade80',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 0',
            cursor: 'pointer',
            letterSpacing: 0.5,
          }}
        >
          ✅ 接入会话
        </button>
      )}
    </div>
  );
}

// -- 主工作台 ------------------------------------------------------
export default function AgentDashboard() {
  const [, navigate] = useLocation();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMsgId, setLastMsgId] = useState(0);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  // 获取坐席信息
  const { data: agentData, refetch: refetchAgent } = trpc.cs.agentMe.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (agentData) setAgent(agentData as any);
    else if (agentData === null) navigate('/agent/login');
  }, [agentData]);

  // 获取快捷回复
  const { data: quickRepliesData } = trpc.cs.getQuickReplies.useQuery(undefined, {
    enabled: !!agentData,
  });
  useEffect(() => {
    if (quickRepliesData) setQuickReplies(quickRepliesData);
  }, [quickRepliesData]);

  // Web Push 订阅相关
  const registerPushMutation = trpc.cs.registerPushSubscription.useMutation();
  const { data: vapidData } = trpc.cs.getVapidPublicKey.useQuery(undefined, { enabled: !!agentData });

  // 注册 Service Worker 并请求推送权限
  useEffect(() => {
    if (!agentData) return;

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/agent-sw.js', { scope: '/' })
        .then(reg => {
          console.log('[SW] Registered:', reg.scope);
        })
        .catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
    }

    // 请求通知权限
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotifEnabled(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
          setNotifEnabled(perm === 'granted');
        });
      }
    }
  }, [agentData]);

  // 当 VAPID 公钥和通知权限就绪后，订阅 Web Push
  useEffect(() => {
    if (!agentData || !notifEnabled || !vapidData?.publicKey) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    async function subscribePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        // 检查是否已有订阅
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setPushSubscribed(true);
          return;
        }
        // 创建新订阅
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
        console.log('[WebPush] Subscribed successfully');
      } catch (err) {
        console.warn('[WebPush] Subscribe failed:', err);
      }
    }

    subscribePush();
  }, [agentData, notifEnabled, vapidData]);

  // 发送浏览器通知
  const sendBrowserNotif = useCallback((title: string, body: string) => {
    if (!notifEnabled || document.visibilityState === 'visible') return;
    try {
      new Notification(title, {
        body,
        icon: '/img/logok.png',
        badge: '/img/logok.png',
        tag: 'cs-message',
      });
    } catch {}
  }, [notifEnabled]);

  // 接入会话
  const acceptMutation = trpc.cs.agentAcceptSession.useMutation({
    onSuccess: () => fetchSessions(),
  });

  // 发送消息
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

  // 关闭会话
  const closeMutation = trpc.cs.agentCloseSession.useMutation({
    onSuccess: () => {
      fetchSessions();
      setActiveSessionId(null);
      setMessages([]);
    },
  });

  // 更新状态
  const updateStatusMutation = trpc.cs.agentUpdateStatus.useMutation({
    onSuccess: () => refetchAgent(),
  });

  // 退出
  const logoutMutation = trpc.cs.agentLogout.useMutation({
    onSuccess: () => navigate('/agent/login'),
  });

  // 获取会话列表
  const fetchSessions = useCallback(async () => {
    try {
      const data = await utils.cs.agentGetSessions.fetch({});
      if (data) {
        setSessions(prev => {
          const newSessions = data as any[];
          // 检测新的等待会话，发送通知
          const prevWaiting = new Set(prev.filter(s => s.status === 'waiting').map(s => s.id));
          newSessions.filter(s => s.status === 'waiting' && !prevWaiting.has(s.id)).forEach(s => {
            sendBrowserNotif('新客服请求', `用户 #${s.playerId} 正在等待接入`);
          });
          return newSessions;
        });
      }
    } catch {}
  }, [sendBrowserNotif]);

  // 获取消息
  const fetchMessages = useCallback(async (sessionId: number, afterId?: number) => {
    try {
      const msgs = await utils.cs.agentGetMessages.fetch({ sessionId, afterId });
      return msgs || [];
    } catch { return []; }
  }, []);

  // 初始化
  useEffect(() => {
    if (!agentData) return;
    fetchSessions();
  }, [agentData]);

  // 轮询会话列表（3秒）
  useEffect(() => {
    if (!agentData) return;
    const t = setInterval(fetchSessions, 3000);
    return () => clearInterval(t);
  }, [agentData, fetchSessions]);

  // 切换会话时加载消息
  useEffect(() => {
    if (!activeSessionId) return;
    fetchMessages(activeSessionId).then(msgs => {
      setMessages(msgs as any);
      if (msgs.length > 0) setLastMsgId((msgs[msgs.length - 1] as any).id);
      scrollToBottom();
    });
  }, [activeSessionId]);

  // 轮询新消息（2秒）
  useEffect(() => {
    if (!activeSessionId) return;
    const t = setInterval(async () => {
      const msgs = await fetchMessages(activeSessionId, lastMsgId || undefined);
      if (msgs.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          const newMsgs = (msgs as any[]).filter(m => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            const last = newMsgs[newMsgs.length - 1];
            if (last.senderType === 'player') {
              sendBrowserNotif('新消息', `用户 #${last.senderId}: ${last.content.slice(0, 40)}`);
            }
          }
          return [...prev, ...newMsgs];
        });
        setLastMsgId((msgs[msgs.length - 1] as any).id);
        scrollToBottom();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeSessionId, lastMsgId, fetchMessages, sendBrowserNotif]);

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSend = (text?: string) => {
    const content = text || inputText.trim();
    if (!content || !activeSessionId || sending) return;
    setSending(true);
    setShowQuickReply(false);
    sendMutation.mutate({ sessionId: activeSessionId, content });
    if (!text) setInputText('');
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const activeSessions = sessions.filter(s => s.status === 'active' && s.agentId === agent?.id);

  const statusConfig = {
    online: { color: '#4ade80', label: '在线', glow: 'rgba(74,222,128,0.5)' },
    busy: { color: '#f59e0b', label: '忙碌', glow: 'rgba(245,158,11,0.5)' },
    offline: { color: '#6b7280', label: '离线', glow: 'rgba(107,114,128,0.3)' },
  };

  const totalUnread = sessions.reduce((sum, s) => sum + (s.agentUnread || 0), 0);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0c29',
        color: '#fff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* -- 顶部工具栏 -- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 14px',
          height: 56,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          gap: 10,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* 侧边栏切换（移动端） */}
        <button
          onClick={() => setShowSidebar(v => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#c084fc',
            fontSize: 20,
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 8,
            position: 'relative' as const,
          }}
        >
          ☰
          {totalUnread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#ef4444',
                borderRadius: '50%',
                width: 14,
                height: 14,
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>

        {/* Logo */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 0.5,
          }}
        >
          🎧 客服工作台
        </div>

        <div style={{ flex: 1 }} />

        {/* 通知状态 */}
        <div
          title={notifEnabled ? '推送通知已开启' : '推送通知未开启'}
          style={{
            fontSize: 18,
            opacity: notifEnabled ? 1 : 0.4,
            cursor: 'pointer',
          }}
          onClick={() => {
            if (!notifEnabled && 'Notification' in window) {
              Notification.requestPermission().then(p => setNotifEnabled(p === 'granted'));
            }
          }}
        >
          {notifEnabled ? '🔔' : '🔕'}
        </div>

        {/* 坐席状态 */}
        {agent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusConfig[agent.status].color,
            boxShadow: `0 0 8px ${statusConfig[agent.status].glow}`,
            animation: agent.status === 'online' ? 'pulse 2s ease-in-out infinite' : 'none',
          } as React.CSSProperties}
            />
            <span style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 600 }}>{agent.name}</span>
            <select
              value={agent.status}
              onChange={e => updateStatusMutation.mutate({ status: e.target.value as any })}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: statusConfig[agent.status].color,
                fontSize: 12,
                padding: '4px 8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <option value="online">在线</option>
              <option value="busy">忙碌</option>
              <option value="offline">离线</option>
            </select>
          </div>
        )}

        {/* 退出 */}
        <button
          onClick={() => logoutMutation.mutate()}
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: 12,
            padding: '5px 10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          退出
        </button>
      </div>

      {/* -- 主内容区 -- */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* -- 左侧会话列表 -- */}
        <div
          style={{
            width: showSidebar ? 280 : 0,
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.25s ease',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          {/* 统计条 */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              gap: 12,
            }}
          >
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#f59e0b', fontSize: 18, fontWeight: 800 }}>{waitingSessions.length}</div>
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 10 }}>等待中</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#4ade80', fontSize: 18, fontWeight: 800 }}>{activeSessions.length}</div>
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 10 }}>进行中</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#c084fc', fontSize: 18, fontWeight: 800 }}>
                {agent ? `${agent.activeSessionCount}/${agent.maxSessions}` : '-'}
              </div>
              <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: 10 }}>容量</div>
            </div>
          </div>

          {/* 等待接入 */}
          {waitingSessions.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 14px',
                  fontSize: 11,
                  color: '#f59e0b',
                  fontWeight: 700,
                  background: 'rgba(245,158,11,0.06)',
                  borderBottom: '1px solid rgba(245,158,11,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  letterSpacing: 0.5,
                }}
              >
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block' }}>●</span>
                等待接入 ({waitingSessions.length})
              </div>
              {waitingSessions.map(s => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={activeSessionId === s.id}
                  isWaiting
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setMessages([]);
                    setLastMsgId(0);
                    if (window.innerWidth < 640) setShowSidebar(false);
                  }}
                  onAccept={() => acceptMutation.mutate({ sessionId: s.id })}
                />
              ))}
            </div>
          )}

          {/* 我的会话 */}
          <div
            style={{
              padding: '8px 14px',
              fontSize: 11,
              color: '#4ade80',
              fontWeight: 700,
              background: 'rgba(74,222,128,0.04)',
              borderBottom: '1px solid rgba(74,222,128,0.1)',
              letterSpacing: 0.5,
            }}
          >
            ● 我的会话 ({activeSessions.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeSessions.length === 0 && (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'rgba(180,150,255,0.35)',
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                暂无进行中的会话
              </div>
            )}
            {activeSessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                isActive={activeSessionId === s.id}
                isWaiting={false}
                onClick={() => {
                  setActiveSessionId(s.id);
                  setMessages([]);
                  setLastMsgId(0);
                  if (window.innerWidth < 640) setShowSidebar(false);
                }}
              />
            ))}
          </div>
        </div>

        {/* -- 右侧聊天区 -- */}
        {activeSessionId && activeSession ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {/* 会话标题栏 */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(255,255,255,0.03)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: activeSession.status === 'waiting'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                👤
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
                  用户 #{activeSession.playerId}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: activeSession.status === 'active' ? '#4ade80' : '#f59e0b',
                    marginTop: 1,
                  }}
                >
                  {activeSession.status === 'active' ? '● 进行中' : '● 等待接入'}
                </div>
              </div>

              {/* 接入按钮 */}
              {activeSession.status === 'waiting' && (
                <button
                  onClick={() => acceptMutation.mutate({ sessionId: activeSessionId })}
                  style={{
                    background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
                    border: 'none',
                    borderRadius: 10,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(74,222,128,0.4)',
                  }}
                >
                  ✅ 接入
                </button>
              )}

              {/* 结束按钮 */}
              {activeSession.status === 'active' && (
                <button
                  onClick={() => closeMutation.mutate({ sessionId: activeSessionId })}
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 10,
                    color: '#fca5a5',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '7px 14px',
                    cursor: 'pointer',
                  }}
                >
                  结束会话
                </button>
              )}
            </div>

            {/* 消息列表 */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
                background: 'rgba(0,0,0,0.15)',
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'rgba(180,150,255,0.35)',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                  暂无消息记录
                </div>
              )}
              {messages.map((msg: any) => (
                <MsgBubble key={msg.id} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* 快捷回复面板 */}
            {showQuickReply && quickReplies.length > 0 && (
              <div
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  background: 'rgba(15,12,41,0.98)',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  padding: '10px 14px',
                }}
              >
                <div style={{ fontSize: 11, color: 'rgba(180,150,255,0.5)', marginBottom: 8, fontWeight: 600 }}>
                  ⚡ 快捷回复
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickReplies.map((qr: any) => (
                    <button
                      key={qr.id}
                      onClick={() => handleSend(qr.content)}
                      style={{
                        background: 'rgba(124,58,237,0.2)',
                        border: '1px solid rgba(124,58,237,0.4)',
                        borderRadius: 8,
                        padding: '5px 12px',
                        fontSize: 12,
                        color: '#c084fc',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                      }}
                    >
                      {qr.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 输入区 */}
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(15,12,41,0.98)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
              }}
            >
              {activeSession.status !== 'active' ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'rgba(180,150,255,0.4)',
                    fontSize: 13,
                    padding: '10px 0',
                  }}
                >
                  请先接入会话才能发送消息
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {/* 快捷回复 */}
                  <button
                    onClick={() => setShowQuickReply(v => !v)}
                    style={{
                      width: 38,
                      height: 38,
                      background: showQuickReply ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${showQuickReply ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 10,
                      color: '#c084fc',
                      fontSize: 18,
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
                    placeholder="输入回复内容... (Enter发送)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: '9px 12px',
                      color: '#fff',
                      fontSize: 14,
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.5,
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.7)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />

                  <button
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || sending}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: inputText.trim() && !sending
                        ? 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)'
                        : 'rgba(255,255,255,0.06)',
                      border: 'none',
                      cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: inputText.trim() && !sending ? '0 4px 12px rgba(124,58,237,0.4)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9L16 2L9 16L8 10L2 9Z" fill="white" opacity={inputText.trim() && !sending ? 1 : 0.3} />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 未选择会话时的占位 */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              color: 'rgba(180,150,255,0.4)',
              background: 'rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: 56 }}>🎧</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(200,180,255,0.6)' }}>
              客服工作台
            </div>
            <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.8 }}>
              等待接入: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{waitingSessions.length}</span> 个会话
              <br />
              我的会话: <span style={{ color: '#4ade80', fontWeight: 700 }}>{activeSessions.length}</span> 个
            </div>
            {waitingSessions.length > 0 && (
              <button
                onClick={() => setShowSidebar(true)}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  borderRadius: 12,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '10px 24px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(245,158,11,0.4)',
                }}
              >
                查看等待队列 ({waitingSessions.length})
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        textarea::placeholder { color: rgba(180,150,255,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 2px; }
      `}</style>
    </div>
  );
}
