/**
 * SteamSettings.tsx — STEAM 设置弹窗组件
 * 按蓝湖 lanhu_steamshezhi 设计稿还原
 * 功能：主号设置、副号绑定、提货绑定码生成
 * 用法：<SteamSettingsModal visible={visible} onClose={() => setVisible(false)} />
 */
import { useState, useEffect } from 'react';

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/';

// 蓝湖图片映射
const IMG = {
  cardBg: CDN + 'f31991704ee2ae0c587bced542f86af9_c8c76942.png',       // 主卡片背景
  sectionBg1: CDN + 'd09e9b0c41659080572b5e90cc65a06e_0ea3b19a.png',   // 主号区块背景
  sectionBg2: CDN + 'f6a12549e4cd7f3843b9f1f5a02b6d91_9e281d3f.png',   // 绑定码区块背景
  titleBar1: CDN + '1d7e261be951086027fd4afa74519eac_e5cc90f2.png',    // 主号设置标题栏
  titleBar2: CDN + 'fd249b8e32859497c0e3cdaad438be9b_2bfa8228.png',    // 添加副号标题栏
  titleBar3: CDN + '95b2dc2c538cd12013472581eaa183ea_1c762b74.png',    // 绑定我为副号标题栏
  inputBg: CDN + '2cd5764ce675cb004fd2948d7d73b8be_897c676f.png',      // 输入框背景
  deleteBtnBg: CDN + 'da1f4eb057b1627460ee2ef3f162c961_3dda0d8c.png',  // 删除按钮
  btnLeft: CDN + '30891d6e753664f6eeefe71a7457c648_81cdefe1.png',      // 获取STEAM链接按钮
  btnRight: CDN + '0e94ebe24f5956232a3627460f2189fa_aab1991a.png',     // 设置库存公开按钮
  generateBtn: CDN + '86daed5c4fc2cbe2954b7c4c4195aab4_87d91b1c.png', // 生成按钮
  helpIcon: CDN + '7b9abdce7efd48e4bf794582020cd232_460fee18.png',     // 帮助图标
  closeIcon: CDN + '77b36a661a44644f99bca08c29eff2fa_abd1ea48.png',    // 关闭图标
};

const q = (px: number) => `${(px / 750 * 100).toFixed(4)}cqw`;

interface SteamSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SteamSettingsModal({ visible, onClose }: SteamSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mainUrl, setMainUrl] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [bindingCode, setBindingCode] = useState('');
  const [generating, setGenerating] = useState(false);

  // 控制挂载/卸载动画
  useEffect(() => {
    if (visible) {
      setMounted(true);
      // 下一帧触发入场动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      setAnimating(false);
      // 等动画结束后卸载
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (!mounted) return null;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setBindingCode(code);
      setGenerating(false);
    }, 800);
  };

  const handleClose = () => {
    setAnimating(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      {/* 遮罩层 */}
      <div
        onClick={handleClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 200,
          transition: 'opacity 0.3s ease',
          opacity: animating ? 1 : 0,
        }}
      />

      {/* 弹窗主体 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          containerType: 'inline-size',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          opacity: animating ? 1 : 0,
          maxHeight: '90%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* 顶部标题栏 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${q(32)} ${q(30)} ${q(20)}`,
            background: 'linear-gradient(180deg, rgba(20,8,55,0.98) 0%, rgba(15,5,40,0.95) 100%)',
            borderTop: '1.5px solid rgba(120,60,220,0.6)',
            borderRadius: `${q(24)} ${q(24)} 0 0`,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: q(36),
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            STEAM设置
          </span>
          <img
            src={IMG.closeIcon}
            alt="关闭"
            style={{ width: q(56), height: q(56), objectFit: 'contain', cursor: 'pointer' }}
            onClick={handleClose}
          />
        </div>

        {/* 可滚动内容区 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'rgba(10,4,30,0.97)',
            paddingBottom: q(40),
          }}
        >
          {/* 主卡片 */}
          <div
            style={{
              margin: `${q(10)} ${q(25)} 0`,
              position: 'relative',
              borderRadius: q(20),
              overflow: 'hidden',
            }}
          >
            <img
              src={IMG.cardBg}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                zIndex: 0,
              }}
            />

            <div style={{ position: 'relative', zIndex: 1, padding: `${q(20)} ${q(20)} ${q(30)}` }}>

              {/* ── 主号设置区块 ── */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: q(12),
                  overflow: 'hidden',
                  marginBottom: q(20),
                }}
              >
                <img
                  src={IMG.sectionBg1}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0 }}
                />
                <div style={{ position: 'relative', zIndex: 1, padding: `${q(10)} ${q(10)} ${q(20)}` }}>
                  {/* 主号设置标题 */}
                  <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
                    <img src={IMG.titleBar1} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700 }}>主号设置</span>
                    </div>
                  </div>

                  {/* 主号URL输入框 + 删除按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: q(10), marginBottom: q(16) }}>
                    <div style={{ flex: 1, position: 'relative', height: q(80) }}>
                      <img src={IMG.inputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                      <input
                        value={mainUrl}
                        onChange={e => setMainUrl(e.target.value)}
                        placeholder="请输入您的Steam交易链接"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#fff',
                          fontSize: q(22),
                          padding: `0 ${q(20)}`,
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div
                      style={{ position: 'relative', width: q(100), height: q(52), cursor: 'pointer', flexShrink: 0 }}
                      onClick={() => setMainUrl('')}
                    >
                      <img src={IMG.deleteBtnBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fbf4ff', fontSize: q(26), fontWeight: 700 }}>删除</span>
                      </div>
                    </div>
                  </div>

                  {/* 两个功能按钮 */}
                  <div style={{ display: 'flex', gap: q(10) }}>
                    <div
                      style={{ flex: 1, position: 'relative', height: q(76), cursor: 'pointer' }}
                      onClick={() => window.open('https://steamcommunity.com/id/me/tradeoffers/privacy', '_blank')}
                    >
                      <img src={IMG.btnLeft} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: q(20), fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>点击获取STEAM链接</span>
                      </div>
                    </div>
                    <div
                      style={{ flex: 1.5, position: 'relative', height: q(76), cursor: 'pointer' }}
                      onClick={() => window.open('https://steamcommunity.com/my/edit/settings', '_blank')}
                    >
                      <img src={IMG.btnRight} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: q(20), fontWeight: 500, textAlign: 'center', lineHeight: 1.3 }}>点击将STEAM库存设置为公开</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 添加副号 ── */}
              <div style={{ position: 'relative', height: q(59), marginBottom: q(10) }}>
                <img src={IMG.titleBar2} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700 }}>添加副号</span>
                </div>
              </div>
              <p style={{ color: '#fff', fontSize: q(26), margin: `0 0 ${q(16)} 0`, textAlign: 'center' }}>
                点击新增您的副号
              </p>

              {/* 副号URL输入框 */}
              <div style={{ position: 'relative', height: q(80), marginBottom: q(20) }}>
                <img src={IMG.inputBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                <input
                  value={subUrl}
                  onChange={e => setSubUrl(e.target.value)}
                  placeholder="请输入副号Steam交易链接"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: q(22),
                    padding: `0 ${q(20)}`,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* ── 绑定我为副号区块 ── */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: q(12),
                  overflow: 'hidden',
                  marginBottom: q(20),
                }}
              >
                <img
                  src={IMG.sectionBg2}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', zIndex: 0 }}
                />
                <div style={{ position: 'relative', zIndex: 1, padding: `${q(10)} ${q(10)} ${q(20)}` }}>
                  {/* 标题 */}
                  <div style={{ position: 'relative', height: q(59), marginBottom: q(16) }}>
                    <img src={IMG.titleBar3} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: q(28), fontWeight: 700 }}>绑定我为副号</span>
                    </div>
                  </div>

                  {/* 提货绑定码 + 生成按钮 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${q(10)}` }}>
                    <div>
                      <div style={{ color: '#fff', fontSize: q(26), fontWeight: 500, marginBottom: q(6) }}>提货绑定码</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: q(22) }}>新增提取饰品的副号时使用</div>
                      {bindingCode && (
                        <div
                          style={{
                            marginTop: q(10),
                            color: '#54e7f4',
                            fontSize: q(30),
                            fontWeight: 700,
                            letterSpacing: 3,
                          }}
                        >
                          {bindingCode}
                        </div>
                      )}
                    </div>
                    <div
                      style={{ position: 'relative', width: q(130), height: q(62), cursor: 'pointer', flexShrink: 0 }}
                      onClick={handleGenerate}
                    >
                      <img src={IMG.generateBtn} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fbf4ff', fontSize: q(26), fontWeight: 700 }}>
                          {generating ? '生成中...' : '生成'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 帮助链接 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `0 ${q(10)}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: q(12) }}>
                  <img src={IMG.helpIcon} alt="" style={{ width: q(37), height: q(49), objectFit: 'contain' }} />
                  <span style={{ color: '#fff', fontSize: q(22) }}>打不开Steam怎么办</span>
                </div>
                <span
                  style={{ color: '#54e7f4', fontSize: q(22), cursor: 'pointer' }}
                  onClick={() => alert('教程功能即将上线')}
                >
                  查看教程》
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
