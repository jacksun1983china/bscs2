import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── 游戏玩家表 ──────────────────────────────────────────────────────
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  nickname: varchar("nickname", { length: 100 }).notNull().default(""),
  /** 系统头像ID，001-016，8男8女，默认001 */
  avatar: varchar("avatar", { length: 10 }).notNull().default("001"),
  vipLevel: tinyint("vipLevel").notNull().default(0),
  gold: decimal("gold", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 商城币（可兑换商品） */
  shopCoin: decimal("shopCoin", { precision: 15, scale: 2 }).notNull().default("0.00"),
  diamond: decimal("diamond", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalRecharge: decimal("totalRecharge", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalWin: decimal("totalWin", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 积分（用于VIP升级） */
  points: int("points").notNull().default(0),
  status: tinyint("status").notNull().default(1),
  banReason: varchar("banReason", { length: 255 }).notNull().default(""),
  registerIp: varchar("registerIp", { length: 50 }).notNull().default(""),
  lastLogin: timestamp("lastLogin").defaultNow(),
  lastIp: varchar("lastIp", { length: 50 }).notNull().default(""),
  device: varchar("device", { length: 200 }).notNull().default(""),
  inviteCode: varchar("inviteCode", { length: 20 }).notNull().default(""),
  invitedBy: int("invitedBy"),
  /** 身份：player/streamer/merchant */
  identity: mysqlEnum("identity", ["player", "streamer", "merchant"]).notNull().default("player"),
  /** 返佣比例（百分比，默认4） */
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull().default("4.00"),
  /** 是否开启返佣 */
  commissionEnabled: tinyint("commissionEnabled").notNull().default(0),
  /** 待提取返佣余额（商城币） */
  commissionBalance: decimal("commissionBalance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** STEAM账号 */
  steamAccount: varchar("steamAccount", { length: 100 }).notNull().default(""),
  /** 安全密码（6位数字，加密存储） */
  safePassword: varchar("safePassword", { length: 100 }).notNull().default(""),
  /** 实名认证：姓名 */
  realName: varchar("realName", { length: 50 }).notNull().default(""),
  /** 实名认证：身份证号 */
  idCard: varchar("idCard", { length: 20 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// ── 验证码表 ──────────────────────────────────────────────────────
export const smsCodes = mysqlTable("smsCodes", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull().default("login"),
  used: tinyint("used").notNull().default(0),
  expireAt: timestamp("expireAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmsCode = typeof smsCodes.$inferSelect;

// ── 道具/皮肤库 ──────────────────────────────────────────────────────
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  /** 道具名称 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 道具图片URL */
  imageUrl: varchar("imageUrl", { length: 500 }).notNull().default(""),
  /** 品质：common/rare/epic/legendary */
  quality: mysqlEnum("quality", ["common", "rare", "epic", "legendary"]).notNull().default("common"),
  /** 市场价值（金币） */
  value: decimal("value", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 道具类型：skin/weapon/equipment */
  type: varchar("type", { length: 50 }).notNull().default("skin"),
  /** 游戏分类（CS/PUBG等） */
  game: varchar("game", { length: 50 }).notNull().default("CS"),
  /** 状态：1启用 0禁用 */
  status: tinyint("status").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;

// ── 玩家背包 ──────────────────────────────────────────────────────
export const playerItems = mysqlTable("playerItems", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  itemId: int("itemId").notNull(),
  /** 来源：box/roll/admin/reward */
  source: varchar("source", { length: 50 }).notNull().default("box"),
  /** 状态：0待处理 1已提取 2已回收 */
  status: tinyint("status").notNull().default(0),
  /** 提取时间 */
  extractedAt: timestamp("extractedAt"),
  /** 回收金币数 */
  recycleGold: decimal("recycleGold", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlayerItem = typeof playerItems.$inferSelect;

// ── 充值档位配置 ──────────────────────────────────────────────────────
export const rechargeConfigs = mysqlTable("rechargeConfigs", {
  id: int("id").autoincrement().primaryKey(),
  /** 充值金额（人民币） */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** 获得金币 */
  gold: decimal("gold", { precision: 15, scale: 2 }).notNull(),
  /** 赠送钻石 */
  bonusDiamond: decimal("bonusDiamond", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 标签（如"最热门"） */
  tag: varchar("tag", { length: 50 }).notNull().default(""),
  /** 是否首充优惠 */
  isFirstRecharge: tinyint("isFirstRecharge").notNull().default(0),
  /** 排序 */
  sort: int("sort").notNull().default(0),
  /** 状态：1启用 0禁用 */
  status: tinyint("status").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RechargeConfig = typeof rechargeConfigs.$inferSelect;

// ── 充值订单 ──────────────────────────────────────────────────────
export const rechargeOrders = mysqlTable("rechargeOrders", {
  id: int("id").autoincrement().primaryKey(),
  /** 订单号 */
  orderNo: varchar("orderNo", { length: 64 }).notNull().unique(),
  playerId: int("playerId").notNull(),
  /** 充值金额 */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** 获得金币 */
  gold: decimal("gold", { precision: 15, scale: 2 }).notNull(),
  /** 赠送钻石 */
  bonusDiamond: decimal("bonusDiamond", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 支付方式：alipay/wechat/manual */
  payMethod: varchar("payMethod", { length: 50 }).notNull().default("manual"),
  /** 状态：0待支付 1已完成 2已取消 */
  status: tinyint("status").notNull().default(0),
  /** 备注 */
  remark: varchar("remark", { length: 255 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RechargeOrder = typeof rechargeOrders.$inferSelect;

// ── 邀请/推广记录 ──────────────────────────────────────────────────────
export const inviteRecords = mysqlTable("inviteRecords", {
  id: int("id").autoincrement().primaryKey(),
  /** 邀请人ID */
  inviterId: int("inviterId").notNull(),
  /** 被邀请人ID */
  inviteeId: int("inviteeId").notNull(),
  /** 佣金金额 */
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** 来源充值订单ID */
  orderId: int("orderId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InviteRecord = typeof inviteRecords.$inferSelect;

// ── 返佣记录 ──────────────────────────────────────────────────────
export const commissionLogs = mysqlTable("commissionLogs", {
  id: int("id").autoincrement().primaryKey(),
  /** 受益人ID */
  playerId: int("playerId").notNull(),
  /** 来源玩家ID（充值的下级） */
  fromPlayerId: int("fromPlayerId").notNull(),
  /** 返佣金额（商城币） */
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  /** 来源充值订单ID */
  orderId: int("orderId"),
  /** 状态：0待提取 1已提取 */
  status: tinyint("status").notNull().default(0),
  /** 提取时间 */
  withdrawnAt: timestamp("withdrawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CommissionLog = typeof commissionLogs.$inferSelect;

// ── 金币流水 ──────────────────────────────────────────────────────
export const goldLogs = mysqlTable("goldLogs", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  /** 变动金额（正为增加，负为减少） */
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  /** 变动后余额 */
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull(),
  /** 类型：recharge/win/recycle/admin/refund/roll */
  type: varchar("type", { length: 50 }).notNull(),
  /** 描述 */
  description: varchar("description", { length: 255 }).notNull().default(""),
  /** 关联ID（订单ID等） */
  refId: int("refId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GoldLog = typeof goldLogs.$inferSelect;

// ── Banner轮播图 ──────────────────────────────────────────────────────
export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  /** 图片URL */
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  /** 跳转链接 */
  linkUrl: varchar("linkUrl", { length: 500 }).notNull().default(""),
  /** 标题 */
  title: varchar("title", { length: 100 }).notNull().default(""),
  /** 排序 */
  sort: int("sort").notNull().default(0),
  /** 状态：1显示 0隐藏 */
  status: tinyint("status").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Banner = typeof banners.$inferSelect;

// ── 广播消息 ──────────────────────────────────────────────────────
export const broadcasts = mysqlTable("broadcasts", {
  id: int("id").autoincrement().primaryKey(),
  /** 消息内容 */
  content: varchar("content", { length: 500 }).notNull(),
  /** 排序 */
  sort: int("sort").notNull().default(0),
  /** 状态：1启用 0禁用 */
  status: tinyint("status").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Broadcast = typeof broadcasts.$inferSelect;

// ── VIP等级配置 ──────────────────────────────────────────────────────
export const vipConfigs = mysqlTable("vipConfigs", {
  id: int("id").autoincrement().primaryKey(),
  /** VIP等级 0-7 */
  level: tinyint("level").notNull().unique(),
  /** 等级名称 */
  name: varchar("name", { length: 50 }).notNull(),
  /** 升级所需积分 */
  requiredPoints: int("requiredPoints").notNull().default(0),
  /** 充值返利比例（百分比） */
  rechargeBonus: decimal("rechargeBonus", { precision: 5, scale: 2 }).notNull().default("0.00"),
  /** 特权描述 */
  privileges: text("privileges"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VipConfig = typeof vipConfigs.$inferSelect;

// ── Roll房间表 ──────────────────────────────────────────────────────
export const rollRooms = mysqlTable("rollRooms", {
  id: int("id").autoincrement().primaryKey(),
  /** 房间标题 */
  title: varchar("title", { length: 200 }).notNull(),
  /** 房间头像URL */
  avatarUrl: varchar("avatarUrl", { length: 500 }).notNull().default(""),
  /** 上级ID（填写后仅该上级及其下级可参与） */
  ownerId: int("ownerId"),
  /** 门槛金额（0表示无门槛） */
  threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull().default("0.00"),
  /** 参与人数上限（0表示不限） */
  maxParticipants: int("maxParticipants").notNull().default(0),
  /** 开始时间 */
  startAt: timestamp("startAt").notNull(),
  /** 截止时间 */
  endAt: timestamp("endAt").notNull(),
  /** 状态：pending=待开奖 ended=已结束 */
  status: mysqlEnum("status", ["pending", "ended"]).notNull().default("pending"),
  /** Roll房总金额（自动计算） */
  totalValue: decimal("totalValue", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 奖品总数（自动计算） */
  totalPrizes: int("totalPrizes").notNull().default(0),
  /** 实际参与人数 */
  participantCount: int("participantCount").notNull().default(0),
  /** 机器人数量 */
  botCount: int("botCount").notNull().default(0),
  /** 实际发放金额（不含机器人） */
  actualPaidValue: decimal("actualPaidValue", { precision: 15, scale: 2 }).notNull().default("0.00"),
  /** 实际发放数量 */
  actualPaidCount: int("actualPaidCount").notNull().default(0),
  /** 创建者（管理员openId） */
  createdBy: varchar("createdBy", { length: 64 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RollRoom = typeof rollRooms.$inferSelect;
export type InsertRollRoom = typeof rollRooms.$inferInsert;

// ── Roll房奖品表 ──────────────────────────────────────────────────────
export const rollRoomPrizes = mysqlTable("rollRoomPrizes", {
  id: int("id").autoincrement().primaryKey(),
  rollRoomId: int("rollRoomId").notNull(),
  /** 奖品名称 */
  name: varchar("name", { length: 200 }).notNull(),
  /** 奖品图片URL */
  imageUrl: varchar("imageUrl", { length: 500 }).notNull().default(""),
  /** 奖品单价（金币） */
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  /** 奖品数量 */
  quantity: int("quantity").notNull().default(1),
  /** 奖品类型：shopCoin=商城币 gold=平台币 */
  coinType: mysqlEnum("coinType", ["shopCoin", "gold"]).notNull().default("shopCoin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RollRoomPrize = typeof rollRoomPrizes.$inferSelect;
export type InsertRollRoomPrize = typeof rollRoomPrizes.$inferInsert;

// ── Roll房参与记录 ──────────────────────────────────────────────────────
export const rollParticipants = mysqlTable("rollParticipants", {
  id: int("id").autoincrement().primaryKey(),
  rollRoomId: int("rollRoomId").notNull(),
  playerId: int("playerId").notNull(),
  /** 是否机器人 */
  isBot: tinyint("isBot").notNull().default(0),
  /** 机器人昵称（仅机器人有） */
  botNickname: varchar("botNickname", { length: 100 }).notNull().default(""),
  /** 机器人头像URL（仅机器人有） */
  botAvatar: varchar("botAvatar", { length: 500 }).notNull().default(""),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RollParticipant = typeof rollParticipants.$inferSelect;

// ── Roll房中奖记录 ──────────────────────────────────────────────────────
export const rollWinners = mysqlTable("rollWinners", {
  id: int("id").autoincrement().primaryKey(),
  rollRoomId: int("rollRoomId").notNull(),
  prizeId: int("prizeId").notNull(),
  /** 中奖玩家ID（机器人为0） */
  playerId: int("playerId").notNull().default(0),
  /** 是否机器人 */
  isBot: tinyint("isBot").notNull().default(0),
  /** 中奖时玩家昵称（快照） */
  nicknameSnapshot: varchar("nicknameSnapshot", { length: 100 }).notNull().default(""),
  /** 是否指定中奖 */
  isDesignated: tinyint("isDesignated").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RollWinner = typeof rollWinners.$inferSelect;

// ── 站内信 ──────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  /** 标题 */
  title: varchar("title", { length: 200 }).notNull(),
  /** 内容 */
  content: text("content").notNull(),
  /** 是否已读 */
  isRead: tinyint("isRead").notNull().default(0),
  /** 类型：roll/system/reward */
  type: varchar("type", { length: 50 }).notNull().default("system"),
  /** 关联ID */
  refId: int("refId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;

// ── ROLL-X 幸运转盘游戏记录 ──────────────────────────────────────────────────────
export const rollxGames = mysqlTable("rollxGames", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  /** 投注金额（金币） */
  betAmount: decimal("betAmount", { precision: 18, scale: 2 }).notNull(),
  /** 倍率X（如2.00, 3.00, 10.00） */
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }).notNull(),
  /** 是否赢 */
  isWin: tinyint("isWin").notNull().default(0),
  /** 赢得金额（输为0） */
  winAmount: decimal("winAmount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  /** 净盈亏（赢为正，输为负） */
  netAmount: decimal("netAmount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  /** 转盘停止角度 */
  stopAngle: decimal("stopAngle", { precision: 10, scale: 4 }).notNull().default("0.0000"),
  /** 玩家余额快照（游戏后） */
  balanceAfter: decimal("balanceAfter", { precision: 18, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RollxGame = typeof rollxGames.$inferSelect;

// ── 游戏设置（管理后台控制）──────────────────────────────────────────────────────
export const gameSettings = mysqlTable("gameSettings", {
  id: int("id").autoincrement().primaryKey(),
  /** 游戏标识：rollx / arena 等 */
  gameKey: varchar("gameKey", { length: 50 }).notNull().unique(),
  /** RTP 百分比（0-100），如 96 表示 96% */
  rtp: decimal("rtp", { precision: 5, scale: 2 }).notNull().default("96.00"),
  /** 最小投注金额 */
  minBet: decimal("minBet", { precision: 18, scale: 2 }).notNull().default("1.00"),
  /** 最大投注金额 */
  maxBet: decimal("maxBet", { precision: 18, scale: 2 }).notNull().default("10000.00"),
  /** 最小倍率 */
  minMultiplier: decimal("minMultiplier", { precision: 10, scale: 2 }).notNull().default("1.10"),
  /** 最大倍率 */
  maxMultiplier: decimal("maxMultiplier", { precision: 10, scale: 2 }).notNull().default("30000.00"),
  /** 是否启用 */
  enabled: tinyint("enabled").notNull().default(1),
  /** 备注 */
  remark: varchar("remark", { length: 255 }).notNull().default(""),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GameSetting = typeof gameSettings.$inferSelect;
