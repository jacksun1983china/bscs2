import { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

/**
 * WelfareRedeem.tsx
 * 用户端：福利 CDK 兑换页
 */
export default function WelfareRedeem() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState('');

  const redeemMutation = trpc.player.redeemCdk.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || `兑换成功，已到账 ${Number(res.amount).toFixed(2)} 平台币`);
      setCode('');
      navigate('/');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = () => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error('请输入 CDK');
      return;
    }
    redeemMutation.mutate({ code: normalizedCode });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, rgba(123,47,255,0.22), transparent 35%), #0b1020',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'linear-gradient(180deg, rgba(17,24,39,0.96), rgba(15,23,42,0.96))',
        border: '1px solid rgba(129,140,248,0.18)',
        borderRadius: 22,
        padding: 24,
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>福利兑换</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 6 }}>输入福利 CDK，点击领取后自动增加平台币。</div>
          </div>
          <button
            onClick={() => navigate('/')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: 16,
          padding: 14,
          color: 'rgba(255,255,255,0.72)',
          fontSize: 13,
          lineHeight: 1.7,
          marginBottom: 18,
        }}>
          兑换规则：每个 CDK 仅可使用一次；成功兑换后会立即增加当前账号的平台币余额；已过期或已删除的 CDK 无法领取。
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ color: '#e5e7eb', fontSize: 14, fontWeight: 700 }}>CDK</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="请输入 CDK"
            style={{
              height: 46,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              padding: '0 14px',
              outline: 'none',
              letterSpacing: 1,
            }}
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={redeemMutation.isPending}
          style={{
            width: '100%',
            height: 46,
            marginTop: 20,
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 15,
            cursor: redeemMutation.isPending ? 'wait' : 'pointer',
            boxShadow: '0 12px 30px rgba(37,99,235,0.35)',
          }}
        >
          {redeemMutation.isPending ? '领取中...' : '领取'}
        </button>
      </div>
    </div>
  );
}
