import { useEffect, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface RealNameVerificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RealNameVerificationModal({ visible, onClose }: RealNameVerificationModalProps) {
  const utils = trpc.useUtils();
  const { data: meData } = trpc.player.me.useQuery(undefined, { enabled: visible });
  const submitMutation = trpc.player.submitRealNameVerification.useMutation({
    onSuccess: async () => {
      toast.success('实名认证成功');
      await utils.player.me.invalidate();
      setTimeout(() => {
        setName('');
        setIdCard('');
        onClose();
      }, 300);
    },
    onError: (error) => {
      toast.error(error.message || '实名认证失败，请稍后重试');
    },
  });

  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [name, setName] = useState('');
  const [idCard, setIdCard] = useState('');

  const verified = Boolean(meData?.realNameVerified);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setName('');
      setIdCard('');
    }
  }, [visible]);

  if (!mounted) return null;

  const handleClose = () => {
    setAnimating(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const normalizedIdCard = idCard.trim().toUpperCase();
    if (!trimmedName) {
      toast.error('请输入真实姓名');
      return;
    }
    if (!/^(\d{15}|\d{17}[\dX])$/.test(normalizedIdCard)) {
      toast.error('请输入正确的身份证号');
      return;
    }
    submitMutation.mutate({ name: trimmedName, idCard: normalizedIdCard });
  };

  return (
    <>
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.68)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 2100,
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2101,
          containerType: 'inline-size',
          transform: `translateY(${animating ? '0' : '100%'})`,
          transition: 'transform 0.35s cubic-bezier(0.32,0.72,0,1)',
          borderRadius: `${q(28)} ${q(28)} 0 0`,
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #1a0b4b 0%, #0f0630 60%, #0a0420 100%)',
          borderTop: '2px solid rgba(120,60,255,0.7)',
          borderLeft: '1px solid rgba(80,40,200,0.4)',
          borderRight: '1px solid rgba(80,40,200,0.4)',
          boxShadow: '0 -8px 40px rgba(100,40,255,0.35), inset 0 1px 0 rgba(180,100,255,0.2)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(120,60,255,0.03) 3px, rgba(120,60,255,0.03) 4px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: q(4),
            background: 'linear-gradient(90deg, transparent, rgba(160,80,255,0.8), rgba(80,200,255,0.8), transparent)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90cqh',
            overflowY: 'auto',
            paddingBottom: q(50),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${q(36)} ${q(32)} ${q(24)}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
              <div
                style={{
                  width: q(6),
                  height: q(36),
                  background: 'linear-gradient(180deg, #a855f7, #38bdf8)',
                  borderRadius: q(3),
                  boxShadow: '0 0 8px rgba(168,85,247,0.8)',
                }}
              />
              <span
                style={{
                  color: '#fff',
                  fontSize: q(34),
                  fontWeight: 700,
                  textShadow: '0 0 12px rgba(168,85,247,0.6)',
                  letterSpacing: '0.05em',
                }}
              >
                实名认证
              </span>
            </div>
            <div
              onClick={handleClose}
              style={{
                width: q(52),
                height: q(52),
                borderRadius: '50%',
                border: '1.5px solid rgba(120,60,255,0.5)',
                background: 'rgba(80,40,160,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 8px rgba(120,60,255,0.3)',
              }}
            >
              <svg width={q(22)} height={q(22)} viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="rgba(200,160,255,0.9)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div style={{ padding: `0 ${q(32)}` }}>
            <p
              style={{
                color: 'rgba(220,200,255,0.88)',
                fontSize: q(24),
                lineHeight: 1.7,
                margin: `0 0 ${q(24)}`,
              }}
            >
              为保障账户安全，请填写与身份证一致的真实姓名和证件号码。认证成功后将展示为“已认证”。
            </p>

            {verified ? (
              <div
                style={{
                  borderRadius: q(16),
                  border: '1px solid rgba(100,220,180,0.45)',
                  background: 'rgba(30,120,90,0.18)',
                  boxShadow: '0 0 18px rgba(34,197,94,0.16)',
                  padding: q(24),
                  marginBottom: q(24),
                }}
              >
                <div style={{ color: '#fff', fontSize: q(28), fontWeight: 700, marginBottom: q(10) }}>当前状态：已认证</div>
                <div style={{ color: 'rgba(210,255,235,0.86)', fontSize: q(22), lineHeight: 1.7 }}>
                  你的账号已经完成实名认证，当前无需重复提交。
                </div>
              </div>
            ) : (
              <>
                <FieldLabel label="真实姓名" />
                <InputField value={name} onChange={setName} placeholder="请输入身份证姓名" maxLength={30} />

                <FieldLabel label="身份证号" />
                <InputField
                  value={idCard}
                  onChange={(value) => setIdCard(value.replace(/[^\dXx]/g, '').slice(0, 18).toUpperCase())}
                  placeholder="请输入本人身份证号"
                  maxLength={18}
                  style={{ marginBottom: q(18) }}
                />

                <div
                  style={{
                    borderRadius: q(14),
                    border: '1px solid rgba(90,140,255,0.28)',
                    background: 'rgba(34,55,122,0.25)',
                    padding: `${q(18)} ${q(20)}`,
                    marginBottom: q(34),
                  }}
                >
                  <div style={{ color: '#93c5fd', fontSize: q(22), lineHeight: 1.7 }}>
                    实名认证仅用于身份核验，不会在个人中心展示你的身份证号码。
                  </div>
                </div>

                <div
                  onClick={!submitMutation.isPending ? handleSubmit : undefined}
                  style={{
                    height: q(90),
                    borderRadius: q(10),
                    cursor: submitMutation.isPending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    background: submitMutation.isPending
                      ? 'rgba(80,40,0,0.5)'
                      : 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 40%, #22c55e 100%)',
                    border: '2px solid',
                    borderColor: submitMutation.isPending ? 'rgba(80,120,0,0.3)' : 'rgba(110,231,183,0.55)',
                    boxShadow: submitMutation.isPending ? 'none' : '0 0 20px rgba(34,197,94,0.28), 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  {!submitMutation.isPending && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '45%',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  <span
                    style={{
                      color: submitMutation.isPending ? 'rgba(190,255,220,0.5)' : '#fff',
                      fontSize: q(32),
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      textShadow: submitMutation.isPending ? 'none' : '0 1px 6px rgba(0,80,60,0.8), 0 0 12px rgba(80,255,180,0.35)',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {submitMutation.isPending ? '认证中...' : '立即认证'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: q(10),
        marginBottom: q(10),
      }}
    >
      <div
        style={{
          width: q(8),
          height: q(8),
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #a855f7, #38bdf8)',
          boxShadow: '0 0 6px rgba(168,85,247,0.8)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: 'rgba(220,200,255,0.95)',
          fontSize: q(28),
          fontWeight: 600,
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(90deg, rgba(168,85,247,0.5), rgba(56,189,248,0.08))',
        }}
      />
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  maxLength,
  type = 'text',
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  type?: string;
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: '100%',
        height: q(82),
        borderRadius: q(10),
        border: '1.5px solid rgba(120,60,255,0.4)',
        background: 'rgba(14,8,38,0.72)',
        color: '#fff',
        padding: `0 ${q(22)}`,
        fontSize: q(26),
        outline: 'none',
        boxShadow: 'inset 0 1px 8px rgba(0,0,0,0.25), 0 0 12px rgba(120,60,255,0.08)',
        marginBottom: q(24),
        ...style,
      }}
    />
  );
}
