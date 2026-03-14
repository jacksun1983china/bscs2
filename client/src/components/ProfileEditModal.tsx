/**
 * ProfileEditModal — 修改昵称+头像弹窗
 * 在"我的"页面点击头像或昵称区域弹出
 * 功能：
 *  - 显示当前昵称和头像
 *  - 用户可修改昵称（实时检查重复）
 *  - 用户可更换头像
 *  - 确认后调用 updateProfile 保存
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { SYSTEM_AVATARS, getAvatarUrl } from '@/lib/assets';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  currentNickname?: string;
  currentAvatar?: string;
}

export default function ProfileEditModal({ visible, onClose, currentNickname, currentAvatar }: ProfileEditModalProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('001');
  const [nicknameStatus, setNicknameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'unchanged'>('idle');
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();

  // 初始化当前值
  useEffect(() => {
    if (visible) {
      setNickname(currentNickname || '');
      setSelectedAvatar(currentAvatar || '001');
      setNicknameStatus('unchanged');
    }
  }, [visible, currentNickname, currentAvatar]);

  // 更新资料
  const updateProfile = trpc.player.updateProfile.useMutation({
    onSuccess: () => {
      utils.player.me.invalidate();
      onClose();
    },
    onError: (err) => {
      if (err.data?.code === 'CONFLICT') {
        setNicknameStatus('taken');
      }
    },
  });

  // 昵称输入变化时，防抖检查可用性
  const handleNicknameChange = useCallback((value: string) => {
    setNickname(value);

    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNicknameStatus('idle');
      return;
    }
    // 如果和当前昵称一样
    if (trimmed === currentNickname) {
      setNicknameStatus('unchanged');
      return;
    }
    if (trimmed.length < 2) {
      setNicknameStatus('invalid');
      return;
    }

    setNicknameStatus('checking');
    checkTimerRef.current = setTimeout(async () => {
      try {
        const result = await utils.player.checkNickname.fetch({ nickname: trimmed });
        setNicknameStatus(result.available ? 'available' : 'taken');
      } catch {
        setNicknameStatus('idle');
      }
    }, 500);
  }, [utils, currentNickname]);

  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    };
  }, []);

  const handleConfirm = () => {
    const trimmed = nickname.trim();
    const nicknameChanged = trimmed !== currentNickname;
    const avatarChanged = selectedAvatar !== currentAvatar;

    if (!nicknameChanged && !avatarChanged) {
      onClose();
      return;
    }

    const updates: { nickname?: string; avatar?: string } = {};
    if (nicknameChanged) {
      if (trimmed.length < 2 || nicknameStatus === 'taken' || nicknameStatus === 'invalid') return;
      updates.nickname = trimmed;
    }
    if (avatarChanged) {
      updates.avatar = selectedAvatar;
    }

    updateProfile.mutate(updates);
  };

  const nicknameChanged = nickname.trim() !== currentNickname;
  const avatarChanged = selectedAvatar !== currentAvatar;
  const hasChanges = nicknameChanged || avatarChanged;
  const nicknameValid = !nicknameChanged || nicknameStatus === 'available';
  const canConfirm = hasChanges && nicknameValid && !updateProfile.isPending;

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 9999,
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

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32,
            background: 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: '50%',
            color: '#fff', fontSize: 18,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1,
          }}
        >
          ✕
        </button>

        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>
            修改资料
          </div>
        </div>

        {/* 当前头像预览 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(168,85,247,0.8)',
            boxShadow: '0 0 20px rgba(168,85,247,0.5)',
          }}>
            <img
              src={getAvatarUrl(selectedAvatar)}
              alt="当前头像"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* 昵称输入区 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: 'rgba(200,160,255,0.8)', marginBottom: 8 }}>昵称</div>
          <input
            type="text"
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            maxLength={20}
            placeholder="请输入昵称（2-20个字符）"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.07)',
              border: `1.5px solid ${
                nicknameStatus === 'available' ? 'rgba(102,255,153,0.6)' :
                nicknameStatus === 'taken' || nicknameStatus === 'invalid' ? 'rgba(255,80,80,0.6)' :
                'rgba(160,80,255,0.4)'
              }`,
              borderRadius: 10,
              padding: '10px 14px',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: 1,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
          {nicknameStatus === 'checking' && (
            <div style={{ color: 'rgba(200,160,255,0.7)', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              检查中...
            </div>
          )}
          {nicknameStatus === 'available' && (
            <div style={{ color: '#66ff99', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              昵称可用
            </div>
          )}
          {nicknameStatus === 'taken' && (
            <div style={{ color: '#ff5050', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              昵称已被使用，请换一个
            </div>
          )}
          {nicknameStatus === 'invalid' && (
            <div style={{ color: '#ff5050', fontSize: 12, marginTop: 6, paddingLeft: 4 }}>
              昵称至少需要2个字符
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
          disabled={!canConfirm}
          style={{
            width: '100%',
            padding: '14px 0',
            background: !canConfirm
              ? 'rgba(160,80,255,0.3)'
              : 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
            border: 'none', borderRadius: 12,
            color: '#fff',
            fontSize: 17, fontWeight: 800, letterSpacing: 2,
            cursor: !canConfirm ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(120,40,220,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {updateProfile.isPending ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
