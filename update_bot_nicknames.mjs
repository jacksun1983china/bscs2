/**
 * 更新数据库中所有竞技场机器人的昵称为更真实的玩家昵称
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ── 真实感昵称池 ──────────────────────────────────────────────────
const CHINESE_NAMES = [
  "小明同学", "阿杰打游戏", "夜猫子", "大白兔", "小黑子",
  "老王头", "小胖墩", "二狗子", "铁柱哥", "翠花姐",
  "豆豆龙", "小鱼干", "大橙子", "小柠檬", "芒果酱",
  "西瓜太郎", "草莓味", "奶茶控", "火锅侠", "烧烤王",
  "打工人", "摸鱼达人", "咸鱼翻身", "躺平侠", "加班狗",
  "不想上班", "今天吃啥", "明天再说", "随便看看", "路过打酱油",
  "隔壁老张", "楼下小李", "对面阿强", "胡同口", "巷子里",
  "追风少年", "逐梦人", "星辰大海", "诗和远方", "岁月静好",
  "浮生若梦", "半夏微凉", "清风明月", "落叶知秋", "春暖花开",
  "一只猫咪", "两只仓鼠", "三只小鸟", "四只蚂蚁", "五只蝴蝶",
  "吃货一枚", "游戏菜鸟", "永远的萌新", "佛系玩家", "肝帝",
  "氪金大佬", "零氪党", "月卡党", "白嫖怪", "非酋",
  "欧皇附体", "脸黑到底", "运气爆棚", "天选之人", "锦鲤本鲤",
  "深夜食堂", "凌晨两点", "午夜游侠", "黎明之前", "日出东方",
  "南风知我", "北风吹雪", "东风破", "西风烈", "春风十里",
  "一杯清茶", "两盏烈酒", "三碗米饭", "四季如歌", "五味杂陈",
  "小确幸", "大梦想", "老司机", "新手村", "回血中",
  "在线摸鱼", "已读不回", "消息已读", "正在输入", "对方正在",
  "不知道叫啥", "随便取的", "想不出名字", "名字被占了", "换个名字",
  "今晚吃鸡", "明天上分", "昨天掉段", "刚才翻车", "马上回来",
];

const PINYIN_NAMES = [
  "xiaoming", "daxiong", "xiaohei", "laowang", "ajie",
  "xiaoyu", "dawei", "xiaofeng", "laozhang", "xiaoli",
  "tiger", "lucky", "happy", "cool", "nice",
  "king", "boss", "master", "pro", "ace",
  "sky", "star", "moon", "sun", "rain",
  "wolf", "eagle", "lion", "bear", "fox",
  "zero", "neo", "max", "rex", "zed",
  "alex", "jack", "tom", "jerry", "mike",
  "kevin", "jason", "david", "peter", "chris",
  "amy", "lisa", "lucy", "mary", "anna",
];

const NATURAL_PREFIXES = [
  "快乐的", "忧伤的", "沉默的", "暴躁的", "温柔的",
  "可爱的", "帅气的", "美丽的", "神秘的", "搞笑的",
  "无敌的", "最强的", "最菜的", "永远的", "孤独的",
  "迷路的", "飞翔的", "奔跑的", "睡觉的", "吃饭的",
];

const NATURAL_SUFFIXES = [
  "小猫咪", "大熊猫", "小企鹅", "小狐狸", "小兔子",
  "老虎", "狮子", "大象", "长颈鹿", "小海豚",
  "战士", "法师", "射手", "刺客", "辅助",
  "少年", "青年", "大叔", "阿姨", "同学",
];

function randomDigits() {
  const patterns = [
    () => String(Math.floor(Math.random() * 900) + 100),
    () => String(Math.floor(Math.random() * 9000) + 1000),
    () => String(Math.floor(Math.random() * 90) + 10),
    () => ['233', '666', '888', '520', '1314', '999', '777', '555', '111', '000',
           '6666', '8888', '2333', '9527', '007', '404', '996', '251'][
             Math.floor(Math.random() * 18)],
    () => '',
  ];
  return patterns[Math.floor(Math.random() * patterns.length)]();
}

function generateName() {
  const mode = Math.random();
  if (mode < 0.45) {
    const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)];
    const digits = Math.random() < 0.4 ? randomDigits() : '';
    return name + digits;
  } else if (mode < 0.65) {
    const name = PINYIN_NAMES[Math.floor(Math.random() * PINYIN_NAMES.length)];
    const digits = randomDigits();
    return name + digits;
  } else if (mode < 0.85) {
    const prefix = NATURAL_PREFIXES[Math.floor(Math.random() * NATURAL_PREFIXES.length)];
    const suffix = NATURAL_SUFFIXES[Math.floor(Math.random() * NATURAL_SUFFIXES.length)];
    return prefix + suffix;
  } else {
    const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)];
    const formats = [
      () => `${name}呀`, () => `${name}吖`, () => `${name}哦`,
      () => `是${name}`, () => `我是${name}`,
    ];
    return formats[Math.floor(Math.random() * formats.length)]();
  }
}

function generateUniqueNames(count) {
  const names = [];
  const used = new Set();
  let attempts = 0;
  while (names.length < count && attempts < count * 10) {
    const name = generateName();
    if (!used.has(name) && name.length <= 20) {
      used.add(name);
      names.push(name);
    }
    attempts++;
  }
  return names;
}

// ── 主逻辑 ──────────────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 获取所有机器人ID
  const [bots] = await conn.execute('SELECT id FROM players WHERE isBot = 1 ORDER BY id');
  console.log(`Found ${bots.length} bot players`);

  // 生成不重复的昵称
  const names = generateUniqueNames(bots.length);
  console.log(`Generated ${names.length} unique realistic names`);

  // 批量更新
  let updated = 0;
  for (let i = 0; i < bots.length; i++) {
    await conn.execute('UPDATE players SET nickname = ? WHERE id = ?', [names[i], bots[i].id]);
    updated++;
  }
  console.log(`Updated ${updated} bot nicknames`);

  // 验证
  const [sample] = await conn.execute('SELECT id, nickname FROM players WHERE isBot = 1 LIMIT 20');
  console.log('\nSample updated nicknames:');
  sample.forEach(r => console.log(`  ${r.id}: ${r.nickname}`));
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await conn.end();
}
