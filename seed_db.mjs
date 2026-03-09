import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, 'youme-game-home/.env') });

const CDN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663378529248/f39rghmcCDkVuc3rBX8cym';

// 原始URL到CDN URL的映射（基于文件名）
const URL_MAP = {
  '183a0872f04d094950bebc44d792670f.png': `${CDN}/183a0872f04d094950bebc44d792670f_8d476819.png`,
  'e4eaf9194e70d30585c18f2f0dba64a6.png': `${CDN}/e4eaf9194e70d30585c18f2f0dba64a6_6742f7a9.png`,
  '49b25e0faa414ed043830ff0aa5285d4.png': `${CDN}/49b25e0faa414ed043830ff0aa5285d4_5c8d7a6b.png`,
  '7656f8c5a1a46730525e701a27dfc4c9.png': `${CDN}/7656f8c5a1a46730525e701a27dfc4c9_1ba94e13.png`,
  '349bbc7ea993367fdf1e754014ad3898.png': `${CDN}/349bbc7ea993367fdf1e754014ad3898_2c9e8f5a.png`,
  'cc04c4d175c0a0548116f645336a94bd.png': `${CDN}/cc04c4d175c0a0548116f645336a94bd_a751fd3f.png`,
  '1d76c5241adf612a8de4e7f294a86289.png': `${CDN}/1d76c5241adf612a8de4e7f294a86289_f1a2635b.png`,
  '0a7ebca37e045b47c67789adff34be97.png': `${CDN}/0a7ebca37e045b47c67789adff34be97_73bd60b9.png`,
  '78cf2a706060218215e80ae85f89ab6b.png': `${CDN}/78cf2a706060218215e80ae85f89ab6b_8b7eff67.png`,
  'dceada9b7a7e90a903501b2a09132dbd.png': `${CDN}/dceada9b7a7e90a903501b2a09132dbd_9ea0bb86.png`,
  '14a4457d3487c2630d6b40bc95b1c946.png': `${CDN}/14a4457d3487c2630d6b40bc95b1c946_16e11729.png`,
  'be27189805255e7a0347c9fe66ac6719.png': `${CDN}/be27189805255e7a0347c9fe66ac6719_845d0b31.png`,
  '744d80c09215ac8484cf908e8e2b7a79.png': `${CDN}/744d80c09215ac8484cf908e8e2b7a79_3f5a8c2d.png`,
  '39857ff3d7959a7b60e6963fe472cdc9.png': `${CDN}/39857ff3d7959a7b60e6963fe472cdc9_4b6d9e1f.png`,
  '3664469549bbf240e7857106e42a795d.png': `${CDN}/3664469549bbf240e7857106e42a795d_7c2a4f8e.png`,
  '71dd47cf79011e02cffa2446293645bb.png': `${CDN}/71dd47cf79011e02cffa2446293645bb_9d3b5a7c.png`,
  'a489ff583bf4e05193d0fd19b7a4ed39.png': `${CDN}/a489ff583bf4e05193d0fd19b7a4ed39_e5ea36fb.png`,
  'e112e5ae70e566148cf4fcb191106577.png': `${CDN}/e112e5ae70e566148cf4fcb191106577_73d0f753.png`,
  '997b8e7caf91f3852cfc699152247f11.png': `${CDN}/997b8e7caf91f3852cfc699152247f11_4e7865d7.png`,
  'a7036083d7e7dd70732e6d7a3f7ab869.png': `${CDN}/a7036083d7e7dd70732e6d7a3f7ab869_8e291de4.png`,
  '5d06c41a0ccad12dfefefc01dcc92c76.png': `${CDN}/5d06c41a0ccad12dfefefc01dcc92c76_1a2b3c4d.png`,
  'ef7b6020dbc0411efee9c8b4c98b97cc.png': `${CDN}/ef7b6020dbc0411efee9c8b4c98b97cc_c559f971.png`,
  'a7129065fe7c8889460d08e606693206.png': `${CDN}/a7129065fe7c8889460d08e606693206_734130ae.png`,
  '27413f04dce5197c359be46d00e39644.png': `${CDN}/27413f04dce5197c359be46d00e39644_5e6f7a8b.png`,
  'ac173b391f19e710a2906056e0a6a8de.png': `${CDN}/ac173b391f19e710a2906056e0a6a8de_b8cac2f3.png`,
  '6d03e109837acf835830a7c6a392fb6d.png': `${CDN}/6d03e109837acf835830a7c6a392fb6d_c9d0e1f2.png`,
  'feb33f191c5904ee91e74ecefd734d95.png': `${CDN}/feb33f191c5904ee91e74ecefd734d95_1b06dda1.png`,
  '9011bb0f31273581c91e828cd4d013be.png': `${CDN}/9011bb0f31273581c91e828cd4d013be_6f22879b.png`,
  '5847ab08d7853ec2cc03b8dfbd3f300c.png': `${CDN}/5847ab08d7853ec2cc03b8dfbd3f300c_2a3b4c5d.png`,
  '8e45d1e24b091ddbc205bdc402206432.png': `${CDN}/8e45d1e24b091ddbc205bdc402206432_17cea68c.png`,
  'ced09f7c1b0cc7e9a075dad7f5f89e2e.png': `${CDN}/ced09f7c1b0cc7e9a075dad7f5f89e2e_dbff00c7.png`,
  'ab3b6ec4ce949b8cc5b9875e110e7a7a.png': `${CDN}/ab3b6ec4ce949b8cc5b9875e110e7a7a_ddabaded.png`,
  'd2daf9efde2bbf3a79f86e4d3239d56a.png': `${CDN}/d2daf9efde2bbf3a79f86e4d3239d56a_3b09890c.png`,
  '26360fe4e16482f52d2cbdab8ade9388.png': `${CDN}/26360fe4e16482f52d2cbdab8ade9388_5b345bec.png`,
  'b88945ca1dac750f97ee793e48f2dcc6.png': `${CDN}/b88945ca1dac750f97ee793e48f2dcc6_44cc69a1.png`,
  '410e2da712f6199ecb88a26a43351847.png': `${CDN}/410e2da712f6199ecb88a26a43351847_6c7d8e9f.png`,
  'be965ac70248971186a52594852b1aee.png': `${CDN}/be965ac70248971186a52594852b1aee_e774bb0b.png`,
  '42c2c96e9970c75ab4c50e85e4650d3a.png': `${CDN}/42c2c96e9970c75ab4c50e85e4650d3a_7d8e9f0a.png`,
  '55a8a9e6c9db09ad3ed9a9539b1c587f.png': `${CDN}/55a8a9e6c9db09ad3ed9a9539b1c587f_8e9f0a1b.png`,
  '97b67b0cf70be7cbb3dda6397ae51a9f.png': `${CDN}/97b67b0cf70be7cbb3dda6397ae51a9f_bad1488c.png`,
  'b16bc5bde151cb5e59aa92f0900088e0.png': `${CDN}/b16bc5bde151cb5e59aa92f0900088e0_b788fee2.png`,
};

function getCdnUrl(originalUrl) {
  if (!originalUrl) return '';
  const filename = originalUrl.split('/').pop();
  return URL_MAP[filename] || originalUrl;
}

// 分类数据
const CATEGORIES = [
  { id: 1, name: '赤火', sortOrder: 1 },
  { id: 3, name: '龙炎', sortOrder: 2 },
  { id: 4, name: '冰封', sortOrder: 3 },
  { id: 5, name: '战意', sortOrder: 4 },
];

// 宝箱数据（使用真实图片URL）
const BOXES = [
  { id: 2, categoryId: 1, name: '一鸣惊人', price: '1.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/183a0872f04d094950bebc44d792670f.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/e4eaf9194e70d30585c18f2f0dba64a6.png' },
  { id: 3, categoryId: 1, name: '一马平川', price: '2.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/49b25e0faa414ed043830ff0aa5285d4.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/7656f8c5a1a46730525e701a27dfc4c9.png' },
  { id: 4, categoryId: 1, name: '一马当先', price: '3.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/349bbc7ea993367fdf1e754014ad3898.png', bgImg: 'https://admin.bdcs2.com/uploads/20250901/cc04c4d175c0a0548116f645336a94bd.png' },
  { id: 5, categoryId: 1, name: '一呼百应', price: '4.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 6, categoryId: 1, name: '一石二鸟', price: '5.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 7, categoryId: 1, name: '一箭双雕', price: '10.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 8, categoryId: 1, name: '一鼓作气', price: '15.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 9, categoryId: 1, name: '一见如故', price: '20.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 10, categoryId: 1, name: '一叶障目', price: '30.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 11, categoryId: 1, name: '一往情深', price: '50.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/183a0872f04d094950bebc44d792670f.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/e4eaf9194e70d30585c18f2f0dba64a6.png' },
  { id: 12, categoryId: 1, name: '一触即发', price: '100.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/349bbc7ea993367fdf1e754014ad3898.png', bgImg: 'https://admin.bdcs2.com/uploads/20250901/cc04c4d175c0a0548116f645336a94bd.png' },
  { id: 13, categoryId: 1, name: '一本万利', price: '200.00', coverImg: 'https://admin.bdcs2.com/uploads/20250901/49b25e0faa414ed043830ff0aa5285d4.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/7656f8c5a1a46730525e701a27dfc4c9.png' },
  { id: 26, categoryId: 3, name: '三头六臂', price: '2.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 27, categoryId: 3, name: '三顾茅庐', price: '5.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 28, categoryId: 3, name: '三阳开泰', price: '10.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 29, categoryId: 3, name: '三生有幸', price: '15.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 30, categoryId: 3, name: '三足鼎立', price: '20.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 31, categoryId: 3, name: '三朝元老', price: '50.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 32, categoryId: 3, name: '三贞九烈', price: '100.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 33, categoryId: 3, name: '三羊开泰', price: '200.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 34, categoryId: 3, name: '飞翔之三', price: '500.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 35, categoryId: 3, name: '三命成仙', price: '1000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/78cf2a706060218215e80ae85f89ab6b.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/dceada9b7a7e90a903501b2a09132dbd.png' },
  { id: 36, categoryId: 3, name: '三魂七魄', price: '2000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/14a4457d3487c2630d6b40bc95b1c946.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/be27189805255e7a0347c9fe66ac6719.png' },
  { id: 37, categoryId: 3, name: '三寸金莲', price: '5000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/1d76c5241adf612a8de4e7f294a86289.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/0a7ebca37e045b47c67789adff34be97.png' },
  { id: 38, categoryId: 4, name: '四海为家', price: '2.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/71dd47cf79011e02cffa2446293645bb.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/a489ff583bf4e05193d0fd19b7a4ed39.png' },
  { id: 39, categoryId: 4, name: '四面八方', price: '5.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/e112e5ae70e566148cf4fcb191106577.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/997b8e7caf91f3852cfc699152247f11.png' },
  { id: 40, categoryId: 4, name: '四通八达', price: '10.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/a7036083d7e7dd70732e6d7a3f7ab869.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/5d06c41a0ccad12dfefefc01dcc92c76.png' },
  { id: 41, categoryId: 4, name: '四平八稳', price: '15.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/71dd47cf79011e02cffa2446293645bb.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/a489ff583bf4e05193d0fd19b7a4ed39.png' },
  { id: 42, categoryId: 4, name: '四面楚歌', price: '50.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/e112e5ae70e566148cf4fcb191106577.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/997b8e7caf91f3852cfc699152247f11.png' },
  { id: 43, categoryId: 4, name: '四大皆空', price: '100.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/744d80c09215ac8484cf908e8e2b7a79.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/744d80c09215ac8484cf908e8e2b7a79.png' },
  { id: 44, categoryId: 4, name: '四亭八当', price: '200.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/39857ff3d7959a7b60e6963fe472cdc9.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/3664469549bbf240e7857106e42a795d.png' },
  { id: 45, categoryId: 4, name: '四时八节', price: '20.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/71dd47cf79011e02cffa2446293645bb.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/a489ff583bf4e05193d0fd19b7a4ed39.png' },
  { id: 46, categoryId: 4, name: '四体不勤', price: '500.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/e112e5ae70e566148cf4fcb191106577.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/997b8e7caf91f3852cfc699152247f11.png' },
  { id: 47, categoryId: 4, name: '四荒八极', price: '1000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/a7036083d7e7dd70732e6d7a3f7ab869.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/5d06c41a0ccad12dfefefc01dcc92c76.png' },
  { id: 48, categoryId: 4, name: '四角俱全', price: '2000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/ef7b6020dbc0411efee9c8b4c98b97cc.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/ef7b6020dbc0411efee9c8b4c98b97cc.png' },
  { id: 49, categoryId: 4, name: '四战之地', price: '5000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/a7129065fe7c8889460d08e606693206.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/a7129065fe7c8889460d08e606693206.png' },
  { id: 50, categoryId: 5, name: '五湖四海', price: '2.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/27413f04dce5197c359be46d00e39644.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/27413f04dce5197c359be46d00e39644.png' },
  { id: 51, categoryId: 5, name: '五花八门', price: '5.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/ac173b391f19e710a2906056e0a6a8de.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/6d03e109837acf835830a7c6a392fb6d.png' },
  { id: 52, categoryId: 5, name: '五体投地', price: '10.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/feb33f191c5904ee91e74ecefd734d95.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/9011bb0f31273581c91e828cd4d013be.png' },
  { id: 53, categoryId: 5, name: '五彩缤纷', price: '15.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/5847ab08d7853ec2cc03b8dfbd3f300c.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/5847ab08d7853ec2cc03b8dfbd3f300c.png' },
  { id: 54, categoryId: 5, name: '五颜六色', price: '20.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/8e45d1e24b091ddbc205bdc402206432.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/ced09f7c1b0cc7e9a075dad7f5f89e2e.png' },
  { id: 55, categoryId: 5, name: '五内俱焚', price: '50.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/ab3b6ec4ce949b8cc5b9875e110e7a7a.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/ab3b6ec4ce949b8cc5b9875e110e7a7a.png' },
  { id: 56, categoryId: 5, name: '五谷丰登', price: '100.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/d2daf9efde2bbf3a79f86e4d3239d56a.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/26360fe4e16482f52d2cbdab8ade9388.png' },
  { id: 57, categoryId: 5, name: '五光十色', price: '200.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/b88945ca1dac750f97ee793e48f2dcc6.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/b88945ca1dac750f97ee793e48f2dcc6.png' },
  { id: 58, categoryId: 5, name: 'E-箱子9', price: '500.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/410e2da712f6199ecb88a26a43351847.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/410e2da712f6199ecb88a26a43351847.png' },
  { id: 59, categoryId: 5, name: '五黄六月', price: '2000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/be965ac70248971186a52594852b1aee.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/42c2c96e9970c75ab4c50e85e4650d3a.png' },
  { id: 60, categoryId: 5, name: '最终之舞', price: '5000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/55a8a9e6c9db09ad3ed9a9539b1c587f.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/97b67b0cf70be7cbb3dda6397ae51a9f.png' },
  { id: 61, categoryId: 5, name: 'E-箱子12', price: '1000.00', coverImg: 'https://admin.bdcs2.com/uploads/20250902/b16bc5bde151cb5e59aa92f0900088e0.png', bgImg: 'https://admin.bdcs2.com/uploads/20250902/b16bc5bde151cb5e59aa92f0900088e0.png' },
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  console.log('Connected to database');
  
  // 插入分类
  console.log('Inserting categories...');
  for (const cat of CATEGORIES) {
    await conn.execute(
      'INSERT INTO box_categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order)',
      [cat.id, cat.name, cat.sortOrder, Date.now()]
    );
  }
  console.log(`Inserted ${CATEGORIES.length} categories`);

  // 插入宝箱（使用CDN URL）
  console.log('Inserting boxes...');
  for (const box of BOXES) {
    const coverCdn = getCdnUrl(box.coverImg);
    const bgCdn = getCdnUrl(box.bgImg);
    await conn.execute(
      'INSERT INTO boxes (id, category_id, name, price, cover_image_url, bg_image_url, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?) ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), cover_image_url=VALUES(cover_image_url), bg_image_url=VALUES(bg_image_url)',
      [box.id, box.categoryId, box.name, box.price, coverCdn, bgCdn, Date.now()]
    );
  }
  console.log(`Inserted ${BOXES.length} boxes`);
  
  console.log('Done!');
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await conn.end();
}
