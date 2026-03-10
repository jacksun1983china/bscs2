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

## 管理后台改造
- [x] 管理后台全屏布局（不嵌入手机框）
- [x] 管理后台独立登录页（账号密码登录）
- [x] 中英文切换（默认中文）

## 布局比例修复
- [ ] PC端竖屏容器改为9:16自适应（高度满屏，宽度=高度xd79/16）

## 「我的」页面
- [ ] 底部导航点击「我的」弹出页面（从底部滑入+遗罩淡入动画）
- [ ] 关闭时反向滑出+遗罩淡出动画
- [ ] 用户信息卡片（头像、昵称、ID、金币、鈢石）
- [ ] VIP等级卡片（显示升级所需积分）
- [ ] 功能菜单（分享招募、我的记录、STEAM、安全密码、实名认证、音乐音效）
- [ ] 退出登录按鈕

## 数据库扩展
- [ ] 添加 items 表（道具/皮肤库）
- [ ] 添加 player_items 表（玩家背包）
- [ ] 添加 recharge_orders 表（充值订单）
- [ ] 添加 recharge_configs 表（充值档位配置）
- [ ] 添加 invite_records 表（招募记录）
- [ ] 添加 gold_logs 表（金币流水）
- [ ] 添加 banners 表（轮播图配置）
- [ ] 添加 broadcasts 表（广播消息）
- [ ] 添加 vip_configs 表（VIP等级配置）

## 前端页面开发
- [ ] 「我的」页面（底部滑入动画）
- [ ] 「分享招募」页面（邀请码+收益列表）
- [ ] 「背包」页面（道具列表+提取功能）
- [ ] 「充值」页面（充值档位+记录）

## 管理后台扩展模块
- [ ] 充值管理（充值档位配置、充值订单查询）
- [ ] 道具管理（道具库、玩家背包查询/发放/回收）
- [ ] 分享管理（推广数据、佣金比例配置）
- [ ] VIP配置（各等级积分门槛、特权内容）
- [ ] Banner管理（轮播图增删改）
- [ ] 公告管理（广播消息增删改）
- [ ] 订单管理（开筱记录、充值记录）
- [ ] 财务统计（总充值、金币流水、每日收入）

## 待完成（后续功能）
- [ ] 接入真实短信 API（替换模拟验证码）
- [ ] 管理后台：订单管理
- [ ] 管理后台：箱子配置（CS盲盒）
- [ ] 管理后台：财务统计
- [ ] 游戏功能：竞技场、幸运转盘、彩虹旋风、ROLL房
- [ ] 充值功能
- [ ] 背包功能

## Roll房功能
- [x] 数据库：roll_rooms 表（房间信息）
- [x] 数据库：roll_room_prizes 表（奖品列表）
- [x] 数据库：roll_room_participants 表（参与记录）
- [x] 数据库：roll_room_winners 表（中奖记录）
- [x] 后端API：Roll房列表（全部/可参与/我的/已结束）
- [x] 后端API：Roll房详情（奖品+参与人员）
- [x] 后端API：参与Roll房
- [x] 后端API：管理员创建/编辑Roll房
- [x] 后端API：管理员添加机器人
- [x] 后端API：管理员指定中奖人员
- [x] 后端API：开奖逻辑（自动+手动）
- [x] 前端：Roll房列表页（从大厅进入，筛选Tab+搜索）
- [x] 前端：Roll房详情页（奖品展示+参与按钮+参与人员）
- [x] 前端：参与成功/失败浮层提示
- [x] 管理后台：Roll房管理（列表+创建+编辑+中奖设置）

## 返佣功能
- [x] 数据库：players表扩展（identity字段：merchant/streamer/player）
- [x] 数据库：commission_logs 表（返佣记录）
- [x] 后端API：绑定邀请码
- [x] 后端API：获取推广数据（团队人数、单日推广等）
- [x] 后端API：返佣余额查询
- [x] 后端API：提取返佣（转为商城币）
- [x] 后端API：管理员修改用户身份/上级/返佣比例
- [x] 前端：分享页面（邀请码+邀请链接+推广数据）
- [x] 前端：绑定邀请码浮层
- [x] 管理后台：返佣管理（身份配置、返佣比例、数据统计）

## Banner管理
- [x] 后端API：Banner列表（前端展示用）
- [x] 后端API：管理员上传Banner图片（S3存储）
- [x] 后端API：管理员增删改Banner（排序、状态）
- [x] 前端首页：Banner轮播（多图自动滚动，赛博朋克边框样式）
- [x] 管理后台：Banner管理页面（上传/排序/启用禁用）

## 分类/宝箱数据导入
- [ ] 从bdcs2.com抓取分类管理数据（名称+图片）
- [ ] 从bdcs2.com抓取宝箱管理数据（名称+图片+价格等）
- [ ] 下载所有图片上传至CDN
- [ ] 将分类和宝箱数据写入数据库
- [ ] 管理后台：分类管理页面
- [ ] 管理后台：宝箱管理页面

## PC版两侧背景
- [ ] PC版（>480px宽）两侧添加赛博朋克风格背景（暗色调科幻网格+光晕，不喧宾夺主）

## 布局精修
- [ ] 修复首页下方大量空白问题：底部导航固定在底部，内容区自然高度，不强制撑高容器
- [ ] PC版两侧赛博朋克背景（暗色调科幻网格+光晕，不喧宾夺主）

## 首页布局精修（按蓝湖原型）
- [x] Banner高度约占屏幕25%，全宽，赛博朋克边框
- [x] 广播区：两行滚动文字
- [x] 用户信息区：头像框+名字+VIP+ID+金币/钻石，右侧加号
- [x] 游戏菜单：左侧4个小头像，右侧4个卡片撑满剩余空间（flex:1）
- [x] 底部导航：固定底部，大厅图标居中突出
- [x] 整体无空白，内容填满屏幕

## 充值页面设计
- [ ] 充值档位卡片（赛博朋克风格，金币数量+价格，选中高亮）
- [ ] 充值方式选择（支付宝/微信/USDT等）
- [ ] 充值说明文字
- [ ] 充值记录Tab（历史充值列表）
- [ ] 后端API：充值档位列表
- [ ] 后端API：充值记录查询
- [ ] 管理后台：充值档位配置（增删改档位）

## 顶部导航LOGO后台上传
- [ ] 后端API：网站设置（LOGO图片URL存储）
- [ ] 管理后台：网站设置页面（上传LOGO）
- [ ] 前端首页：顶部LOGO从后台配置读取

## ROLL-X 幸运转盘游戏
- [ ] 数据库：rollxGames 表（游戏记录）
- [ ] 数据库：gameSettings 表（游戏设置/胜率控制）
- [ ] 后端API：rollx.spin（旋转，服务端决定结果，扣/加金币）
- [ ] 后端API：rollx.getSettings（获取游戏设置）
- [ ] 后端API：rollx.getHistory（获取游戏历史）
- [ ] 后端API：admin.updateGameSettings（管理后台修改RTP）
- [ ] 前端：ROLL-X 游戏页面（赛博朋克风格转盘，完整玩法）
- [ ] 管理后台：ROLL-X 胜率（RTP）控制面板

## 首页游戏菜单区改造
- [ ] 左侧小头像列严格按原版切图比例（不修改元素比例）
- [ ] 右侧游戏卡片可左右拖动滚动
- [ ] 游戏列表动态从后台加载（支持4~N个）
- [ ] 管理后台：游戏列表管理（图片上传、名称、跳转链接、排序）

## 首页布局严格还原（蓝湖1:1）
- [ ] 严格按蓝湖CSS/JSX重写Home.tsx（750px设计稿比例转换）
- [ ] 严格按蓝湖CSS/JSX重写BottomNav.tsx
- [ ] 严格按蓝湖CSS/JSX重写PlayerInfoBar.tsx

## 头像功能
- [x] 16个系统头像（8男8女，001-016）复制到public/img/avatars
- [x] 数据库players表avatar字段改为存储头像ID（001-016）
- [x] 后端API: player.updateProfile（更新昵称+头像ID）
- [x] 前端: 我的页面头像选择弹窗（8男+8女，点击即更换）
- [x] PlayerInfoBar组件使用getAvatarUrl显示系统头像
- [x] 所有图片改为相对路径（/img/xxx.png）

## 管理后台补全模块（2026-03-10）
- [ ] 数据库：boxes（箱子配置表）、boxItems（箱子道具关联表）
- [ ] 数据库：siteSettings（网站系统设置表）
- [ ] 后端API：admin.orderList（充值订单列表+搜索+状态筛选）
- [ ] 后端API：admin.orderStats（订单统计：总金额、今日、本月）
- [ ] 后端API：admin.manualRecharge（手动充值）
- [ ] 后端API：admin.boxList / createBox / updateBox / deleteBox
- [ ] 后端API：admin.boxItemList / addBoxItem / removeBoxItem
- [ ] 后端API：admin.financeStats（财务统计：总充值、金币流水、每日收入图表）
- [ ] 后端API：admin.getSiteSettings / updateSiteSettings
- [ ] 前端：管理后台「订单管理」页面（充值订单列表、手动充值、统计卡片）
- [ ] 前端：管理后台「箱子配置」页面（箱子列表、创建/编辑箱子、道具配置）
- [ ] 前端：管理后台「财务统计」页面（统计卡片、金币流水图表、每日收入）
- [ ] 前端：管理后台「系统设置」页面（网站名称、LOGO、公告、充值档位、游戏设置）
- [ ] 侧边栏导航：将4个新模块从"功能即将上线"改为真实跳转
- [ ] 提交到GitHub仓库 jacksun1983china/bscs2

## 从 bdcs2.com 抓取分类和宝箱数据（2026-03-10）
- [x] 登录 bdcs2.com 后台抓取分类管理数据（名称+图片）
- [x] 登录 bdcs2.com 后台抓取宝箱管理数据（名称+图片+价格等）
- [x] 下载所有图片存储到 client/public/img/boxes/（相对路径）
- [x] 数据库：skuCategories（分类表）、boxes（宝箱表）、boxGoods（宝箱道具）
- [x] 将分类和宝箱数据写入数据库（4分类、48宝箱、468道具）
- [x] 后端API：分类管理（列表/创建/编辑/删除）
- [x] 后端API：宝箱管理（列表/详情/更新状态/删除）
- [x] 管理后台：分类管理页面
- [x] 管理后台：宝箱管理页面
- [x] 侧边栏导航集成

## Logo 替换（2026-03-10）
- [x] 替换登录页 Logo 为新 BDCS2 设计图
- [x] 替换首页左上角 Logo 为新 BDCS2 设计图

## Banner轮播功能（2026-03-10）
- [x] 替换登录页和首页Logo为新设计图
- [x] 生成2张新Banner图（赛博朋克风格）
- [x] 将3张Banner图上传CDN并写入数据库
- [x] 首页Banner轮播（从数据库读取）
- [x] 后台Banner管理（增删改排序）

## 游戏菜单区滚动布局（2026-03-10）
- [x] 游戏菜单区改为可上下滚动，支捴7-8个以上卡片

## 游戏卡片文字标签调整（2026-03-10）
- [x] 游戏卡片文字标签缩小并居中显示

## PlayerInfoCard 公共组件（2026-03-10）
- [ ] 从首页提取用户信息区为公共组件 PlayerInfoCard
- [ ] 在线客服页面顶部替换为 PlayerInfoCard 公共组件

## PlayerInfoCard 公共组件 + Roll房间功能（2026-03-10）
- [x] 从首页提取用户信息卡为 PlayerInfoCard 公共组件
- [x] 在线客服页面顶部替换为 PlayerInfoCard
- [x] 数据库：rollRooms表、rollParticipants表、rollPrizes表
- [x] 后端tRPC：Roll房间CRUD、参与、列表、详情
- [x] 客户端Roll房列表页面（首页入口+房间详情）
- [x] 管理后台Roll房管理页面，创建10个房间数据
- [x] 修复AdminRollRooms.tsx字段名映射（title/startAt/endAt/participantCount/totalValue/actualPaidValue/actualPaidCount）
- [x] 修复getRollRoomList返回奖品预览数据（prizes字段）
- [x] 数据库插入10个Roll房间初始数据（每房间10种奖品）
