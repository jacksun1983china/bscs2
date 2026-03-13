/**
 * Mailbox.tsx — 邮件/站内信界面
 * 赛博朋克深紫蓝霓虹风格，与整体设计一致
 * 功能：列表展示、已读/未读、查看详情、标记已读、删除
 */
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import TopNav from '@/components/TopNav';
import SettingsModal from '@/components/SettingsModal';
import { PageSlideIn } from '@/components/PageTransition';
import { ASSETS } from '@/lib/assets';

// px → cqw 转换（基准 750px）
const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

// 邮件类型图标和颜色
const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  system: { icon: '📢', color: '#7b2fff', label: '系统通知' },
  reward: { icon: '🎁', color: '#f5a623', label: '奖励发放' },
  roll:   { icon: '🎲', color: '#06b6d4', label: 'Roll房通知' },
  recharge: { icon: '💳', color: '#10b981', label: '充值通知' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: '📩', color: '#c084fc', label: '消息' };
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)}天前`;
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

export default function Mailbox() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [page] = useState(1);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.player.messages.useQuery({ page, limit: 50 });
  const markReadMutation = trpc.player.markMessageRead.useMutation({
    onSuccess: () => utils.player.messages.invalidate(),
  });
  const deleteMutation = trpc.player.deleteMessage.useMutation({
    onSuccess: () => {
      utils.player.messages.invalidate();
      setSelectedId(null);
      toast.success('邮件已删除');
    },
    onError: (e) => toast.error(e.message),
  });

  const messages = data?.list ?? [];
  const unreadCount = messages.filter(m => m.isRead === 0).length;
  const selectedMsg = messages.find(m => m.id === selectedId);

  const handleOpen = (id: number) => {
    setSelectedId(id);
    const msg = messages.find(m => m.id === id);
    if (msg && msg.isRead === 0) {
      markReadMutation.mutate({ id });
    }
  };

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ all: true });
    toast.success('已全部标记为已读');
  };

  return (
    <PageSlideIn>
      <div className="phone-container" style={{ containerType: 'inline-size', display: 'flex', flexDirection: 'column' }}>
        {/* 背景图 */}
        <img
          src={ASSETS.bg}
          alt=""
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            opacity: 0.45,
            pointerEvents: 'none',
          }}
        />

        {/* 内容层 */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* 顶部导航 */}
          <TopNav showLogo={false} onSettingsOpen={() => setSettingsVisible(true)} settingsOpen={settingsVisible} />

          {/* 页面标题 */}
          <div style={{ padding: `${q(12)} ${q(30)} ${q(8)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
              <span style={{ color: '#fff', fontSize: q(36), fontWeight: 700, fontFamily: 'Orbitron, sans-serif', letterSpacing: 1 }}>
                邮件
              </span>
              {unreadCount > 0 && (
                <span style={{
                  background: 'linear-gradient(135deg, #7b2fff, #c084fc)',
                  borderRadius: 20,
                  padding: `${q(4)} ${q(14)}`,
                  color: '#fff',
                  fontSize: q(22),
                  fontWeight: 700,
                }}>
                  {unreadCount} 未读
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'rgba(120,60,220,0.2)',
                  border: '1px solid rgba(120,60,220,0.4)',
                  borderRadius: q(16),
                  padding: `${q(8)} ${q(20)}`,
                  color: '#c084fc',
                  fontSize: q(22),
                  cursor: 'pointer',
                }}
              >
                全部已读
              </button>
            )}
          </div>

          {/* 邮件列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: `0 ${q(20)} ${q(20)}` }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: q(80), color: 'rgba(180,150,255,0.5)', fontSize: q(26) }}>
                加载中...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: q(100) }}>
                <div style={{ fontSize: q(80), marginBottom: q(20) }}>📭</div>
                <div style={{ color: 'rgba(180,150,255,0.5)', fontSize: q(26) }}>暂无邮件</div>
              </div>
            ) : (
              messages.map(msg => {
                const tc = getTypeConfig(msg.type);
                const isUnread = msg.isRead === 0;
                const isSelected = selectedId === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleOpen(msg.id)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(123,47,255,0.25), rgba(6,182,212,0.12))'
                        : isUnread
                          ? 'linear-gradient(135deg, rgba(20,8,50,0.95), rgba(15,5,40,0.98))'
                          : 'rgba(10,4,30,0.7)',
                      border: isSelected
                        ? '1px solid rgba(120,60,220,0.6)'
                        : isUnread
                          ? '1px solid rgba(120,60,220,0.35)'
                          : '1px solid rgba(80,40,140,0.2)',
                      borderRadius: q(16),
                      padding: `${q(18)} ${q(20)}`,
                      marginBottom: q(12),
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 未读指示点 */}
                    {isUnread && (
                      <div style={{
                        position: 'absolute',
                        top: q(14),
                        right: q(14),
                        width: q(14),
                        height: q(14),
                        borderRadius: '50%',
                        background: '#c084fc',
                        boxShadow: '0 0 8px rgba(192,132,252,0.8)',
                      }} />
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: q(16) }}>
                      {/* 类型图标 */}
                      <div style={{
                        width: q(72),
                        height: q(72),
                        borderRadius: q(16),
                        background: `${tc.color}22`,
                        border: `1px solid ${tc.color}55`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: q(34),
                        flexShrink: 0,
                      }}>
                        {tc.icon}
                      </div>

                      {/* 内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: q(6) }}>
                          <span style={{
                            color: isUnread ? '#fff' : 'rgba(200,180,255,0.7)',
                            fontSize: q(26),
                            fontWeight: isUnread ? 700 : 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '75%',
                          }}>
                            {msg.title}
                          </span>
                          <span style={{ color: 'rgba(150,120,200,0.5)', fontSize: q(20), flexShrink: 0 }}>
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <div style={{
                          color: 'rgba(150,120,200,0.6)',
                          fontSize: q(22),
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {msg.content}
                        </div>
                        <div style={{
                          display: 'inline-block',
                          marginTop: q(6),
                          padding: `${q(2)} ${q(10)}`,
                          borderRadius: q(8),
                          background: `${tc.color}22`,
                          border: `1px solid ${tc.color}44`,
                          color: tc.color,
                          fontSize: q(18),
                        }}>
                          {tc.label}
                        </div>
                      </div>
                    </div>

                    {/* 展开详情 */}
                    {isSelected && (
                      <div style={{
                        marginTop: q(16),
                        paddingTop: q(16),
                        borderTop: '1px solid rgba(120,60,220,0.2)',
                      }}>
                        <div style={{
                          color: 'rgba(220,200,255,0.85)',
                          fontSize: q(24),
                          lineHeight: 1.7,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}>
                          {msg.content}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: q(16) }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteMutation.mutate({ id: msg.id });
                            }}
                            disabled={deleteMutation.isPending}
                            style={{
                              background: 'rgba(220,50,50,0.15)',
                              border: '1px solid rgba(220,50,50,0.3)',
                              borderRadius: q(12),
                              padding: `${q(8)} ${q(24)}`,
                              color: '#ff6b6b',
                              fontSize: q(22),
                              cursor: 'pointer',
                            }}
                          >
                            🗑 删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
      </div>
    </PageSlideIn>
  );
}
