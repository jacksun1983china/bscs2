/**
 * NicknameSetupModal — 首次登录昵称+头像设置弹窗
 * 触发条件：player.needSetNickname === true
 * 功能：
 *  - 显示随机生成的昵称候选（摇骰子）
 *  - 支持手动输入昵称（实时检查唯一性）
 *  - 16个系统头像选择
 *  - 确认后调用 updateProfile 保存
 */
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { SYSTEM_AVATARS } from '@/lib/assets';

interface NicknameSetupModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NicknameSetupModal({ visible, onClose }: NicknameSetupModalProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('001');
  const [isRolling, setIsRolling] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkTimer, setCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  // 获取随机昵称候选
  const { data: nicknameData, refetch: refetchNicknames } = trpc.player.generateNicknames.useQuery(
    { count: 1 },
    { enabled: visible, refetchOnWindowFocus: false }
  );

  // 更新资料
  const updateProfile = trpc.player.updateProfile.useMutation({
    onSuccess: () => {
      utils.player.me.invalidate();
      onClose();
    },
    onError: (err) => {
      setNicknameError(err.message || '保存失败，请重试');
    },
  });

  // 初始化时设置随机昵称
  useEffect(() => {
    if (nicknameData?.nicknames?.[0] && !nickname) {
      setNickname(nicknameData.nicknames[0]);
    }
  }, [nicknameData]);

  // 摇骰子：重新生成随机昵称
  const handleRoll = useCallback(async () => {
    if (isRolling) return;
    setIsRolling(true);
    setNicknameError('');
    // 动画效果：快速切换几次
    const frames = 6;
    for (let i = 0; i < frames; i++) {
      await new Promise(r => setTimeout(r, 80));
      const { data } = await refetchNicknames();
      if (data?.nicknames?.[0]) {
        setNickname(data.nicknames[0]);
      }
    }
    setIsRolling(false);
  }, [isRolling, refetchNicknames]);

  // 手动输入时检查唯一性（防抖）
  const handleNicknameChange = (val: string) => {
    setNickname(val);
    setNicknameError('');
    if (checkTimer) clearTimeout(checkTimer);
    if (val.length < 2) {
      setNicknameError('昵称至少2个字');
      return;
    }
    if (val.length > 8) {
      setNicknameError('昵称最多8个字');
      return;
    }
    setIsChecking(true);
    const t = setTimeout(async () => {
      try {
        const result = await utils.player.checkNickname.fetch({ nickname: val });
        if (!result.available) {
          setNicknameError('昵称已被使用，换一个吧');
        }
      } catch {
        // ignore
      } finally {
        setIsChecking(false);
      }
    }, 500);
    setCheckTimer(t);
  };

  const handleConfirm = () => {
    if (!nickname || nickname.length < 2) {
      setNicknameError('请输入昵称');
      return;
    }
    if (nicknameError) return;
    updateProfile.mutate({ nickname, avatar: selectedAvatar });
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: 400,
          background: 'linear-gradient(160deg, #1a0a3a 0%, #0d0621 100%)',
          border: '1.5px solid rgba(160,80,255,0.5)',
          borderRadius: 20,
          boxShadow: '0 0 60px rgba(120,40,220,0.4)',
          padding: '28px 20px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 顶部光晕装饰 */}
        <div style={{
          position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
          width: 200, height: 80,
          background: 'radial-gradient(ellipse, rgba(160,80,255,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>
            🎮 设置你的昵称
          </div>
          <div style={{ fontSize: 13, color: 'rgba(200,160,255,0.7)', marginTop: 6 }}>
            昵称一旦设置不可更改，请谨慎选择
          </div>
        </div>

        {/* 昵称输入区 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'rgba(200,160,255,0.8)', marginBottom: 8 }}>昵称</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                value={nickname}
                onChange={e => handleNicknameChange(e.target.value)}
                maxLength={8}
                placeholder="2-8个汉字"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1.5px solid ${nicknameError ? '#ff4444' : 'rgba(160,80,255,0.4)'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              {isChecking && (
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  width: 16, height: 16,
                  border: '2px solid rgba(160,80,255,0.5)',
                  borderTopColor: '#a050ff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
              )}
            </div>
            {/* 摇骰子按钮 */}
            <button
              onClick={handleRoll}
              disabled={isRolling}
              style={{
                flexShrink: 0,
                width: 44, height: 44,
                background: isRolling
                  ? 'rgba(160,80,255,0.2)'
                  : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                border: 'none', borderRadius: 10,
                cursor: isRolling ? 'not-allowed' : 'pointer',
                fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                transform: isRolling ? 'rotate(180deg)' : 'none',
              }}
              title="随机生成昵称"
            >
              🎲
            </button>
          </div>
          {nicknameError && (
            <div style={{ color: '#ff6666', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              {nicknameError}
            </div>
          )}
          {!nicknameError && nickname.length >= 2 && !isChecking && (
            <div style={{ color: '#66ff99', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              ✓ 昵称可用
            </div>
          )}
        </div>

        {/* 头像选择区 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: 'rgba(200,160,255,0.8)', marginBottom: 10 }}>选择头像</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gap: 8,
          }}>
            {SYSTEM_AVATARS.map(avatar => (
              <div
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar.id)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: selectedAvatar === avatar.id
                    ? '2.5px solid #a855f7'
                    : '2px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: selectedAvatar === avatar.id
                    ? '0 0 12px rgba(168,85,247,0.7)'
                    : 'none',
                  transition: 'all 0.15s',
                  transform: selectedAvatar === avatar.id ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                <img
                  src={avatar.url}
                  alt={avatar.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {selectedAvatar === avatar.id && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(168,85,247,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 14, color: '#fff', fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 确认按钮 */}
        <button
          onClick={handleConfirm}
          disabled={updateProfile.isPending || !!nicknameError || nickname.length < 2 || isChecking}
          style={{
            width: '100%',
            padding: '14px 0',
            background: (updateProfile.isPending || !!nicknameError || nickname.length < 2 || isChecking)
              ? 'rgba(160,80,255,0.3)'
              : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
            border: 'none', borderRadius: 12,
            color: '#fff',
            fontSize: 17, fontWeight: 800, letterSpacing: 2,
            cursor: (updateProfile.isPending || !!nicknameError || nickname.length < 2 || isChecking)
              ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(120,40,220,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {updateProfile.isPending ? '保存中...' : '✨ 确认，进入游戏'}
        </button>

        <style>{`
          @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
