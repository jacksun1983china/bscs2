/**
 * AgentDashboard.tsx — 客服坐席工作台
 * 功能：会话列表 + 实时聊天回复 + 快捷回复 + 坐席状态管理
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { getAvatarUrl } from '@/lib/assets';

// ── 类型定义 ──────────────────────────────────────────────────────
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

// ── 消息气泡（坐席视角） ──────────────────────────────────────────
function AgentMsgBubble({ msg }: { msg: Message }) {
  const isAgent = msg.senderType === 'agent';
  const isSystem = msg.senderType === 'system';
  const timeStr = new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
        <div
          style={{
            background: 'rgba(80,40,160,0.25)',
            border: '1px solid rgba(120,60,220,0.2)',
            borderRadius: 20,
            padding: '3px 12px',
            color: 'rgba(180,150,255,0.6)',
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
        alignItems: 'flex-start',
        gap: 8,
        margin: '8px 12px',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border: `2px solid ${isAgent ? 'rgba(192,132,252,0.5)' : 'rgba(120,60,220,0.4)'}`,
        }}
      >
        <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: isAgent ? 'flex-end' : 'flex-start',
          maxWidth: 'calc(100% - 80px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 3,
            flexDirection: isAgent ? 'row-reverse' : 'row',
            alignItems: 'center',
          }}
        >
          <span style={{ color: 'rgba(180,150,255,0.6)', fontSize: 11 }}>{msg.senderName}</span>
          <span style={{ color: 'rgba(120,100,180,0.4)', fontSize: 10 }}>{timeStr}</span>
        </div>
        <div
          style={{
            padding: '8px 12px',
            borderRadius: isAgent ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            background: isAgent
              ? 'linear-gradient(135deg, rgba(108,103,255,0.85) 0%, rgba(32,0,162,0.9) 100%)'
              : 'rgba(30,15,60,0.85)',
            border: `1px solid ${isAgent ? 'rgba(108,103,255,0.5)' : 'rgba(80,40,120,0.4)'}`,
            color: '#fff',
            fontSize: 13,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

// ── 主工作台 ──────────────────────────────────────────────────────
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

  // 接入会话
  const acceptMutation = trpc.cs.agentAcceptSession.useMutation({
    onSuccess: () => {
      fetchSessions();
    },
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
      if (data) setSessions(data as any);
    } catch {}
  }, []);

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
          return [...prev, ...newMsgs];
        });
        setLastMsgId((msgs[msgs.length - 1] as any).id);
        scrollToBottom();
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeSessionId, lastMsgId, fetchMessages]);

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

  const statusColors = { online: '#4ade80', busy: '#f59e0b', offline: '#6b7280' };
  const statusLabels = { online: '在线', busy: '忙碌', offline: '离线' };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0621',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* ── 顶部工具栏 ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          height: 56,
          background: 'linear-gradient(135deg, rgba(30,10,65,0.98) 0%, rgba(15,5,40,0.98) 100%)',
          borderBottom: '1px solid rgba(120,60,220,0.35)',
          gap: 12,
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #c084fc 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 1,
          }}
        >
          BDCS2 客服系统
        </div>

        <div style={{ flex: 1 }} />

        {/* 坐席信息 */}
        {agent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColors[agent.status],
                boxShadow: `0 0 6px ${statusColors[agent.status]}`,
              }}
            />
            <span style={{ color: '#e0d0ff', fontSize: 13 }}>{agent.name}</span>
            <span style={{ color: 'rgba(180,150,255,0.5)', fontSize: 12 }}>
              ({agent.activeSessionCount}/{agent.maxSessions})
            </span>

            {/* 状态切换 */}
            <select
              value={agent.status}
              onChange={e => updateStatusMutation.mutate({ status: e.target.value as any })}
              style={{
                background: 'rgba(30,10,65,0.8)',
                border: '1px solid rgba(120,60,220,0.4)',
                borderRadius: 6,
                color: '#e0d0ff',
                fontSize: 12,
                padding: '3px 6px',
                cursor: 'pointer',
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
            background: 'rgba(220,38,38,0.2)',
            border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: 12,
            padding: '5px 12px',
            cursor: 'pointer',
          }}
        >
          退出
        </button>
      </div>

      {/* ── 主内容区 ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── 左侧会话列表 ── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: '1px solid rgba(120,60,220,0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* 等待接入 */}
          {waitingSessions.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: 11,
                  color: '#f59e0b',
                  fontWeight: 700,
                  background: 'rgba(245,158,11,0.08)',
                  borderBottom: '1px solid rgba(245,158,11,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#f59e0b',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
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
                  }}
                  onAccept={() => acceptMutation.mutate({ sessionId: s.id })}
                />
              ))}
            </div>
          )}

          {/* 我的会话 */}
          <div
            style={{
              padding: '8px 12px',
              fontSize: 11,
              color: '#4ade80',
              fontWeight: 700,
              background: 'rgba(74,222,128,0.06)',
              borderBottom: '1px solid rgba(74,222,128,0.12)',
            }}
          >
            我的会话 ({activeSessions.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activeSessions.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: 'rgba(180,150,255,0.4)',
                  fontSize: 13,
                }}
              >
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
                }}
              />
            ))}
          </div>
        </div>

        {/* ── 右侧聊天区 ── */}
        {activeSessionId && activeSession ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* 会话标题栏 */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(120,60,220,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(20,8,50,0.6)',
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  用户 #{activeSession.playerId}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: activeSession.status === 'active' ? '#4ade80' : '#f59e0b',
                    marginTop: 2,
                  }}
                >
                  {activeSession.status === 'active' ? '● 进行中' : '● 等待接入'}
                </div>
              </div>

              {/* 接入按钮（等待中） */}
              {activeSession.status === 'waiting' && (
                <button
                  onClick={() => acceptMutation.mutate({ sessionId: activeSessionId })}
                  style={{
                    background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '6px 16px',
                    cursor: 'pointer',
                  }}
                >
                  接入会话
                </button>
              )}

              {/* 关闭按钮 */}
              {activeSession.status === 'active' && (
                <button
                  onClick={() => closeMutation.mutate({ sessionId: activeSessionId })}
                  style={{
                    background: 'rgba(220,38,38,0.2)',
                    border: '1px solid rgba(220,38,38,0.4)',
                    borderRadius: 8,
                    color: '#f87171',
                    fontSize: 12,
                    padding: '5px 12px',
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
                background: 'rgba(5,4,18,0.4)',
              }}
            >
              {messages.map((msg: any) => (
                <AgentMsgBubble key={msg.id} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* 快捷回复面板 */}
            {showQuickReply && quickReplies.length > 0 && (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: 'rgba(20,8,50,0.95)',
                  borderTop: '1px solid rgba(120,60,220,0.3)',
                  padding: '8px 12px',
                }}
              >
                <div style={{ fontSize: 11, color: 'rgba(180,150,255,0.5)', marginBottom: 6 }}>快捷回复</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {quickReplies.map((qr: any) => (
                    <div
                      key={qr.id}
                      onClick={() => handleSend(qr.content)}
                      style={{
                        background: 'rgba(80,40,160,0.4)',
                        border: '1px solid rgba(120,60,220,0.4)',
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        color: '#e0d0ff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {qr.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 输入区 */}
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(15,6,40,0.98)',
                borderTop: '1px solid rgba(120,60,220,0.25)',
                flexShrink: 0,
              }}
            >
              {activeSession.status !== 'active' ? (
                <div style={{ textAlign: 'center', color: 'rgba(180,150,255,0.4)', fontSize: 13, padding: '8px 0' }}>
                  请先接入会话才能发送消息
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  {/* 快捷回复按钮 */}
                  <button
                    onClick={() => setShowQuickReply(v => !v)}
                    style={{
                      width: 36,
                      height: 36,
                      background: showQuickReply ? 'rgba(124,58,237,0.4)' : 'rgba(60,30,100,0.4)',
                      border: `1px solid ${showQuickReply ? 'rgba(124,58,237,0.6)' : 'rgba(80,40,120,0.4)'}`,
                      borderRadius: 8,
                      color: '#c084fc',
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
                    placeholder="输入回复内容... (Enter发送, Shift+Enter换行)"
                    rows={2}
                    style={{
                      flex: 1,
                      background: 'rgba(30,10,65,0.8)',
                      border: '1.5px solid rgba(120,60,220,0.4)',
                      borderRadius: 10,
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
                    onClick={() => handleSend()}
                    disabled={!inputText.trim() || sending}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: inputText.trim() && !sending
                        ? 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)'
                        : 'rgba(60,30,100,0.4)',
                      border: `1.5px solid ${inputText.trim() ? 'rgba(124,58,237,0.6)' : 'rgba(80,40,120,0.3)'}`,
                      cursor: inputText.trim() && !sending ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8L14 2L8 14L7 9L2 8Z" fill="white" />
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
            }}
          >
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontSize: 16 }}>请从左侧选择或接入一个会话</div>
            <div style={{ fontSize: 13 }}>
              等待接入: {waitingSessions.length} | 我的会话: {activeSessions.length}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ── 会话列表项 ──────────────────────────────────────────────────────
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
  const timeStr = session.lastMessageAt
    ? new Date(session.lastMessageAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 12px',
        borderBottom: '1px solid rgba(80,40,120,0.2)',
        cursor: 'pointer',
        background: isActive
          ? 'linear-gradient(135deg, rgba(80,40,160,0.4) 0%, rgba(40,20,80,0.5) 100%)'
          : 'transparent',
        borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* 头像占位 */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(80,40,160,0.6) 0%, rgba(40,20,80,0.8) 100%)',
            border: '1.5px solid rgba(120,60,220,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          👤
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#e0d0ff', fontSize: 13, fontWeight: 600 }}>
              用户 #{session.playerId}
            </span>
            <span style={{ color: 'rgba(120,100,180,0.5)', fontSize: 10 }}>{timeStr}</span>
          </div>
          <div
            style={{
              color: 'rgba(180,150,255,0.5)',
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 2,
            }}
          >
            {session.lastMessage || '暂无消息'}
          </div>
        </div>

        {/* 未读数 */}
        {session.agentUnread > 0 && (
          <div
            style={{
              background: '#ef4444',
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
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
            marginTop: 6,
            width: '100%',
            background: 'linear-gradient(135deg, rgba(74,222,128,0.3) 0%, rgba(22,163,74,0.4) 100%)',
            border: '1px solid rgba(74,222,128,0.5)',
            borderRadius: 6,
            color: '#4ade80',
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 0',
            cursor: 'pointer',
          }}
        >
          接入会话
        </button>
      )}
    </div>
  );
}
