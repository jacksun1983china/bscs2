/**
 * SecurityPassword.tsx — 安全密码设置弹窗组件
 * 按蓝湖 lanhu_anquanmima 设计稿还原
 * 功能：手机验证码 + 设置新安全密码
 * 用法：<SecurityPasswordModal visible={visible} onClose={() => setVisible(false)} />
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

const IMG = {
  pageBg: CDN + '8f9d28fdfc7667250b233c3d0bfe09c5_1ed4dc7c.png',         // 卡片背景
  closeIcon: CDN + '0a565575e1660d7f436be303ee97cd36_a9baada9.png',      // 关闭图标
  phoneLabelBg: CDN + '309437a2ef150f79de28ac7201cb7788_680a4c9a.png',   // 手机号标签背景
  inputBg: CDN + 'a905cabde518af2a82a2306ac1069c8d_b809f334.png',        // 输入框背景
  codeBtnBg: CDN + '64f38d101e466a48f92c38fee3145de0_ad89d896.png',      // 获取验证码按钮
  newPwdLabelBg: CDN + 'a0bee16467b82b053f00238ad4d73bd7_325cbf8d.png',  // 新密码标签背景
  newPwdInputBg: CDN + '9bcb957b2a2d5090b6a20e3a35e2fffe_19718901.png',  // 新密码输入框背景
  confirmLabelBg: CDN + '85ee071ec9235bcdfd1bd213da52a889_d219bb4a.png', // 确认密码标签背景
  confirmInputBg: CDN + 'a88ae93ca507236c66dd234cdf29bec5_23336872.png', // 确认密码输入框背景
  submitBtnBg: CDN + '756e01f6cc100beb99443c5b871c5150_4f8979b4.png',    // 提交按钮
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface SecurityPasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SecurityPasswordModal({ visible, onClose }: SecurityPasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: meData } = trpc.player.me.useQuery(undefined, { enabled: visible });
  const phone = meData?.phone ?? '';
  const maskedPhone = phone ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未绑定手机';

  // 发送验证码（真实API）
  const sendCodeMutation = trpc.player.sendSecurityCode.useMutation({
    onSuccess: () => {
      toast.success('验证码已发送，请查收短信');
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (err) => toast.error(err.message || '发送失败，请稍后重试'),
  });

  // 设置安全密码（真实API）
  const setPasswordMutation = trpc.player.setPassword.useMutation({
    onSuccess: () => {
      toast.success('安全密码设置成功');
      setTimeout(() => {
        setCode('');
        setNewPwd('');
        setConfirmPwd('');
        onClose();
      }, 1000);
    },
    onError: (err) => toast.error(err.message || '设置失败，请重试'),
  });

  // 控制挂载/卸载动画
  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // 关闭时清理倒计时
  useEffect(() => {
    if (!visible && timerRef.current) {
      clearInterval(timerRef.current);
      setCountdown(0);
    }
  }, [visible]);

  if (!mounted) return null;

  const handleSendCode = () => {
    if (countdown > 0) return;
    if (!phone) {
      toast.error('请先绑定手机号');
      return;
    }
    sendCodeMutation.mutate();
  };

  const handleSubmit = () => {
    if (!code) { toast.error('请输入验证码'); return; }
    if (!newPwd) { toast.error('请输入新密码'); return; }
    if (newPwd.length < 6 || newPwd.length > 20) { toast.error('密码长度为6-20位'); return; }
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }
    setPasswordMutation.mutate({ code, password: newPwd });
  };

  const handleClose = () => {
    setAnimating(false);
    setTimeout(onClose, 300);
  };

  const submitting = setPasswordMutation.isPending;

  const content = (
    <>
      {/* 遮罩层（含模糊效果） */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 2000,
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* 弹窗主体（从底部滑入） */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          transform: `translateY(${animating ? '0' : '100%'})`,
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 2001,
          containerType: 'inline-size',
          maxHeight: '90%',
          borderRadius: `${q(24)} ${q(24)} 0 0`,
          overflow: 'hidden',
        }}
      >
        {/* 卡片背景 */}
        <img
          src={IMG.pageBg}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* 内容层（可滚动） */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            paddingBottom: q(60),
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* 顶部标题栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${q(40)} ${q(30)} ${q(20)}`,
            }}
          >
            <span style={{ color: '#fff', fontSize: q(36), fontWeight: 700 }}>安全密码</span>
            <img
              src={IMG.closeIcon}
              alt="关闭"
              style={{ width: q(30), height: q(30), objectFit: 'contain', cursor: 'pointer' }}
              onClick={handleClose}
            />
          </div>

          {/* 表单区域 */}
          <div style={{ padding: `0 ${q(30)}` }}>

            {/* 手机号标签 */}
            <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
              <img src={IMG.phoneLabelBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: q(30) }}>
                <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>手机号</span>
              </div>
            </div>

            {/* 手机号显示框 */}
            <div style={{ position: 'relative', height: q(80), marginBottom: q(20) }}>
              <img src={IMG.inputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: q(30) }}>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: q(28) }}>+86-{maskedPhone}</span>
              </div>
            </div>

            {/* 验证码标签 */}
            <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
              <img src={IMG.phoneLabelBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: q(30) }}>
                <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>验证码</span>
              </div>
            </div>

            {/* 验证码输入框 + 获取按钮 */}
            <div style={{ display: 'flex', gap: q(16), marginBottom: q(20) }}>
              <div style={{ flex: 1, position: 'relative', height: q(80) }}>
                <img src={IMG.inputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="手机验证码"
                  maxLength={6}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: q(28),
                    padding: `0 ${q(20)}`,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'relative',
                  width: q(200),
                  height: q(80),
                  cursor: (countdown > 0 || sendCodeMutation.isPending) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
                onClick={handleSendCode}
              >
                <img
                  src={IMG.codeBtnBg}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    opacity: (countdown > 0 || sendCodeMutation.isPending) ? 0.6 : 1,
                  }}
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fbf4ff', fontSize: q(24), fontWeight: 700 }}>
                    {sendCodeMutation.isPending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </span>
                </div>
              </div>
            </div>

            {/* 新密码标签 */}
            <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
              <img src={IMG.newPwdLabelBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: q(30) }}>
                <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>新密码</span>
              </div>
            </div>

            {/* 新密码输入框 */}
            <div style={{ position: 'relative', height: q(80), marginBottom: q(10) }}>
              <img src={IMG.newPwdInputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                placeholder="请输入您的安全密码"
                maxLength={20}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: q(28),
                  padding: `0 ${q(20)}`,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 密码提示 */}
            <p style={{ color: '#54e7f4', fontSize: q(22), margin: `0 0 ${q(20)} 0` }}>
              密码长度为6-20个字母和数字的组合
            </p>

            {/* 确认密码标签 */}
            <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
              <img src={IMG.confirmLabelBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: q(30) }}>
                <span style={{ color: '#fff', fontSize: q(28), fontWeight: 500 }}>确认密码</span>
              </div>
            </div>

            {/* 确认密码输入框 */}
            <div style={{ position: 'relative', height: q(80), marginBottom: q(40) }}>
              <img src={IMG.confirmInputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="再次输入您的密码"
                maxLength={20}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: q(28),
                  padding: `0 ${q(20)}`,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 提交按钮 */}
            <div
              style={{ position: 'relative', height: q(86), cursor: submitting ? 'not-allowed' : 'pointer' }}
              onClick={handleSubmit}
            >
              <img
                src={IMG.submitBtnBg}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', opacity: submitting ? 0.7 : 1 }}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fbf4ff', fontSize: q(30), fontWeight: 700, textShadow: '0 1px 5px rgba(33,0,80,0.67)' }}>
                  {submitting ? '提交中...' : '提交'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
