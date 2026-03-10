/**
 * assets.ts — 图片资源路径统一管理
 * 所有图片存放在 client/public/img/ 目录下，通过绝对路径 /img/xxx.png 访问
 * 头像存放在 client/public/img/avatars/ 目录下
 */

// ─────────────────────────────────────────────
// 系统头像（16个，001-016，8男8女）
// 001-008: 男性头像，009-016: 女性头像
// ─────────────────────────────────────────────
export const SYSTEM_AVATARS = [
  { id: '001', url: '/img/avatars/001.png', gender: 'male',   label: '男1' },
  { id: '002', url: '/img/avatars/002.png', gender: 'male',   label: '男2' },
  { id: '003', url: '/img/avatars/003.png', gender: 'male',   label: '男3' },
  { id: '004', url: '/img/avatars/004.png', gender: 'male',   label: '男4' },
  { id: '005', url: '/img/avatars/005.png', gender: 'male',   label: '男5' },
  { id: '006', url: '/img/avatars/006.png', gender: 'male',   label: '男6' },
  { id: '007', url: '/img/avatars/007.png', gender: 'male',   label: '男7' },
  { id: '008', url: '/img/avatars/008.png', gender: 'male',   label: '男8' },
  { id: '009', url: '/img/avatars/009.png', gender: 'female', label: '女1' },
  { id: '010', url: '/img/avatars/010.png', gender: 'female', label: '女2' },
  { id: '011', url: '/img/avatars/011.png', gender: 'female', label: '女3' },
  { id: '012', url: '/img/avatars/012.png', gender: 'female', label: '女4' },
  { id: '013', url: '/img/avatars/013.png', gender: 'female', label: '女5' },
  { id: '014', url: '/img/avatars/014.png', gender: 'female', label: '女6' },
  { id: '015', url: '/img/avatars/015.png', gender: 'female', label: '女7' },
  { id: '016', url: '/img/avatars/016.png', gender: 'female', label: '女8' },
] as const;

/** 根据头像ID获取URL，默认返回001 */
export function getAvatarUrl(avatarId?: string | null): string {
  if (!avatarId) return '/img/avatars/001.png';
  const found = SYSTEM_AVATARS.find(a => a.id === avatarId);
  return found ? found.url : '/img/avatars/001.png';
}

// ─────────────────────────────────────────────
// 蓝湖首页原始切图（哈希文件名）
// 对应 lanhu_shouye/assets/img/ 目录
// ─────────────────────────────────────────────
export const LANHU = {
  // 页面背景
  pageBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/045d8f688de24e63cf97f9a5ba6229a3_45ec485c.png',
  // 广播图标
  broadcastIcon: '/img/07b683cf460c39cce34497d9e48d3ce5.png',
  // 加好友按钮
  addFriend: '/img/0aebb6ef33f776e2b92f505d142ede94.png',
  // Banner图片
  banner: '/img/129884dd14c79011802dab9b4f05326b.png',
  // 游戏菜单背景框
  gameMenuBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/14e481822ebfbe505d4ddd4ddaeb3a5c_abba9987.png',
  // 背包图标（底部导航）
  bagIcon: '/img/14ff6e5e168dc0196d1cf154f6ec0693.png',
  // 钻石图标
  diamondIcon: '/img/191310623498377a5a38cb1b6b3fb4fc.png',
  // 用户信息区背景
  userInfoBg: '/img/2b7622b710edc02d17a8fe88693dbc5d.png',
  // ROLL房游戏卡片文字
  rollLabel: '/img/31711eb1f5b900af7aeaaff81e49c7df.png',
  // 游戏小头像4（ROLL房）
  gameAvatar4: '/img/317135c14daa4933152c5c6d8ebdf108.png',
  // 我的图标（底部导航）
  myIcon: '/img/32c32028db7f95dea485556ff87356b3.png',
  // 游戏小头像1（竞技场）
  gameAvatar1: '/img/411692782d655e450eff9c5382f5309a.png',
  // 游戏小头像5
  gameAvatar5: '/img/41cdda28ee3a15c028cbcabc5e00f652.png',
  // 游戏小头像3（彩虹旋风）
  gameAvatar3: '/img/4fa6b5af15f83472dc74cfced49cc88a.png',
  // 游戏卡片3背景（彩虹旋风）
  gameCard3Bg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/5793aacd4dcba1b5402c300a56493517_64dd83d4.png',
  // 幸运转盘游戏卡片文字
  wheelLabel: '/img/5a7fcb2bddee54d0a3e56812f04cef84.png',
  // 金币背景框（block_2）
  coinBg1: '/img/5f45c4de7a6adb9ba1c43b6291e59c3c.png',
  // 广播栏背景
  broadcastBg: '/img/66dd5f65c971b2d97bb39dbeb002d1de.png',
  // 底部导航背景
  bottomNavBg: '/img/6a9d66657aa7dac99b6358969e656f80.png',
  // 全部图标（顶部导航右侧）
  allGamesIcon: '/img/6c62692e0efd6e3c8fbd733b0dc7a130.png',
  // 大厅中心图标（底部导航）
  hallIcon: '/img/6ca9dff714f5b3497e2728a94aee0b4e.png',
  // Banner背景框
  bannerBg: '/img/701b6ae6376947b76d1b867bdd8e2d0d.png',
  // 游戏小头像2（幸运转盘）
  gameAvatar2: '/img/70c1c38458cd754f36a3e9cc38879bc2.png',
  // 徽章图标
  badge: '/img/844b20046813221e150394e53ef12b83.png',
  // 箭头图标
  arrowIcon: '/img/86114da13d1e3264cdf290ae967d5c23.png',
  // 客服图标（顶部导航）
  kefuIcon: '/img/934b9d7d22160c36f930b156779fc139.png',
  // 充值图标（底部导航）
  rechargeIcon: '/img/946584a33c356fbc9cbbb3a342182f9b.png',
  // LOGO背景框
  logoBg: '/img/9699644141893dd51dff2ec5caf5a175.png',
  // 广播文字滚动图
  broadcastScroll: '/img/a070df1c49f6dc23569513fc09f6a14b.png',
  // 钻石背景框（block_3）
  coinBg2: '/img/a21e0215c1d073c1fac3d112262b51d4.png',
  // 游戏卡片1背景（竞技场）
  gameCard1Bg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/a888e4d9c59e44cf49c0949345509ee4_32c3c37e.png',
  // 游戏卡片4背景（ROLL房）
  gameCard4Bg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/b48b8c0141866b5657822df30151f712_2cd7b20b.png',
  // VIP图标（顶部导航）
  vipIcon: '/img/c029e6ce51263a3aed021a4a7f65f021.png',
  // 彩虹旋风游戏卡片文字
  rainbowLabel: '/img/cb648464ef9116816393dd23baae0988.png',
  // 金币箭头图标
  coinArrow: '/img/d0e4834de7d8ee59114bea1d97fdb529.png',
  // VIP标签背景
  vipTagBg: '/img/d22c3f5056b9932be421d869fff62008.png',
  // 竞技场游戏卡片文字
  arenaLabel: '/img/d663bc9f1cc4f42ce86d9a2116da85fd.png',
  // 头像图片（用户头像示例）
  avatar: '/img/e567c4746f6118016e2b83c201377187.png',
  // 分享图标（底部导航）
  shareIcon: '/img/e9c3cca0cbc6cb3f539681d12a91a316.png',
  // 游戏卡片2背景（幸运转盘）
  gameCard2Bg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/efbb02ecc67b1ebc867f0a54973470a5_51ae6b4b.png',
  // 钻石箭头图标
  diamondArrow: '/img/f2512d2a3e6780e32f91e549a835ae0c.png',
  // 头像框
  avatarFrame: '/img/feee4e3a86c6906e2cf07d44764cbf1e.png',
  // 公共返回按钮（蓝紫色菱形箭头，所有页面统一使用）
  backBtn: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/ef4db60601dc5cfa7fb8cdf6ef9dfe19_7ecff073.png',
} as const;

// ─────────────────────────────────────────────
// 原始命名切图（来自首页slices目录）
// ─────────────────────────────────────────────
export const ASSETS = {
  // 背景
  bg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/bg_fb029be7.png',
  k4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/k4_d774f1b4.png',

  // 顶部导航
  logok: '/img/logok.png',
  kefu: '/img/kefu.png',
  vip: '/img/vip.png',
  quanbu: '/img/quanbu.png',

  // Banner
  bannerk: '/img/bannerk.png',
  banner: '/img/banner.png',

  // 广播
  guangbo: '/img/guangbo.png',
  k1: '/img/k1.png',

  // 用户信息
  touxiangk: '/img/touxiangk.png',
  touxiang1: '/img/touxiang1.png',
  touxiang2: '/img/touxiang2.png',
  touxiang3: '/img/touxiang3.png',
  touxiang4: '/img/touxiang4.png',
  touxiang5: '/img/touxiang5.png',
  huizhang: '/img/huizhang.png',
  jiahao: '/img/jiahao.png',
  jinbi1: '/img/jinbi1.png',
  jinbi2: '/img/jinbi2.png',
  gengduo: '/img/gengduo.png',
  zu39: '/img/zu39.png',

  // 游戏卡片
  jingjichangk: '/img/jingjichangk.png',
  xingyunzhuanpank: '/img/xingyunzhuanpank.png',
  caihongxuanfengk: '/img/caihongxuanfengk.png',
  rollk: '/img/rollk.png',

  // 游戏文字标签
  jingjichang: '/img/jingjichang.png',
  xingyunzhuanpan: '/img/xingyunzhuanpan.png',
  roll: '/img/roll.png',
  k2: '/img/k2.png',
  k3: '/img/k3.png',

  // 底部导航
  tucheng7: '/img/tucheng7.png',
  dating: '/img/dating.png',
  wode: '/img/wode.png',
  fenxiang: '/img/fenxiang.png',
  beibao: '/img/beibao.png',
  chongzhi: '/img/chongzhi.png',

  // 充值页面素材
  cz_k1: '/img/k1.png',
  cz_k2: '/img/k2.png',
  cz_k3: '/img/k3.png',
  cz_k4: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/k4_d774f1b4.png',
  cz_icon1: '/img/icon1.png',
  cz_icon2: '/img/icon2.png',
  cz_zhifubao: '/img/zhifubao.png',
  cz_weixin: '/img/weixin.png',
  cz_btn: '/img/btn_chongzhi.png',

  // BDCS2 LOGO（新版科幻赛博朋克风格，透明背景PNG）
  bdcs2Logo: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/logobdcs2_97ff6844.png',

  // 登录页背景
  loginBg: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym/login-bg_5ca371bd.png',
} as const;
