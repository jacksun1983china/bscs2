# BDCS2 游戏平台 TODO

## 数据库 & 后端
- [x] 扩展 drizzle schema：players 表、smsCodes 表
- [x] 推送数据库 schema（pnpm db:push）
- [x] 玩家注册/登录 API（手机号+模拟验证码 123456）
- [x] 玩家信息查询 API（player.me）
- [x] 玩家退出登录 API（player.logout）
- [x] 管理后台玩家列表 API（admin.playerList，需 admin 角色）
- [x] 管理后台玩家详情 API（admin.playerDetail）
- [x] 管理后台封禁/解封 API（admin.updatePlayerStatus）
- [x] JWT token 认证（30天有效期）

## 前端页面
- [x] 全局样式：赛博朋克深紫主题，PC竖屏居中容器
- [x] 登录页：手机号+验证码，BDCS2 LOGO，测试模式提示
- [x] 首页：切图还原（顶部导航、Banner、广播、用户信息、游戏菜单、底部导航）
- [x] 首页接入真实玩家数据（金币、钻石、昵称、VIP等级）
- [x] 管理后台：玩家列表、搜索、筛选、封禁/解封、详情弹窗
- [x] 路由配置：/ → 首页，/login → 登录页，/admin → 管理后台

## 素材 & 资源
- [x] 切图素材上传 CDN
- [x] BDCS2 LOGO 生成（赛博朋克风格）
- [x] LOGO 去除白色背景（透明版）
- [x] 登录页背景图生成

## 测试
- [x] player.sendCode 测试
- [x] player.login 测试（新用户注册）
- [x] player.me 测试（未登录返回 null）
- [x] admin.playerList 测试（权限验证）
- [x] auth.logout 测试

## 布局修复
- [x] 修复登录页验证码按鈕溢出布局问题

## GitHub 远程仓库
- [x] 绑定远程仓库 https://github.com/jacksun1983china/bscs2 并推送代码

## Bug 修复
- [x] 登录成功后没有跳转到首页
- [x] 首页顶部 BDCS2 图标重新设计为霍光渐变文字

## 待完成（后续功能）
- [ ] 接入真实短信 API（替换模拟验证码）
- [ ] 管理后台：订单管理
- [ ] 管理后台：箱子配置（CS盲盒）
- [ ] 管理后台：财务统计
- [ ] 游戏功能：竞技场、幸运转盘、彩虹旋风、ROLL房
- [ ] 充值功能
- [ ] 背包功能
