/**
 * 真实感机器人昵称生成器
 * 模拟真实玩家的取名风格，包含多种常见网名模式：
 *  - 中文网名（小X、阿X、X哥/姐）
 *  - 拼音+数字
 *  - 英文混搭
 *  - 表情/符号风格
 *  - 游戏圈常见风格
 */

// ── 模式1：中文常见网名 ──────────────────────────────────────────
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

// ── 模式2：拼音/英文混搭 ──────────────────────────────────────────
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

// ── 模式3：前缀+后缀组合（更自然） ──────────────────────────────
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

// ── 数字后缀池 ──────────────────────────────────────────────────
function randomDigits(): string {
  const patterns = [
    () => String(Math.floor(Math.random() * 900) + 100),           // 3位数 100-999
    () => String(Math.floor(Math.random() * 9000) + 1000),         // 4位数 1000-9999
    () => String(Math.floor(Math.random() * 90) + 10),             // 2位数 10-99
    () => ['233', '666', '888', '520', '1314', '999', '777', '555', '111', '000',
           '6666', '8888', '2333', '9527', '007', '404', '996', '251'][
             Math.floor(Math.random() * 18)],                       // 常见梗数字
    () => '',                                                       // 无数字
  ];
  return patterns[Math.floor(Math.random() * patterns.length)]();
}

/**
 * 生成一个真实感机器人昵称
 */
export function generateRealisticBotName(): string {
  const mode = Math.random();

  if (mode < 0.45) {
    // 45%：直接使用中文常见网名（可能加数字后缀）
    const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)];
    const digits = Math.random() < 0.4 ? randomDigits() : '';
    return name + digits;
  } else if (mode < 0.65) {
    // 20%：拼音/英文名+数字
    const name = PINYIN_NAMES[Math.floor(Math.random() * PINYIN_NAMES.length)];
    const digits = randomDigits();
    return name + digits;
  } else if (mode < 0.85) {
    // 20%：前缀+后缀自然组合
    const prefix = NATURAL_PREFIXES[Math.floor(Math.random() * NATURAL_PREFIXES.length)];
    const suffix = NATURAL_SUFFIXES[Math.floor(Math.random() * NATURAL_SUFFIXES.length)];
    return prefix + suffix;
  } else {
    // 15%：中文名+下划线/特殊格式
    const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)];
    const formats = [
      () => `${name}_`,
      () => `_${name}`,
      () => `${name}呀`,
      () => `${name}吖`,
      () => `${name}哦`,
      () => `${name}嘛`,
      () => `是${name}`,
      () => `我是${name}`,
    ];
    return formats[Math.floor(Math.random() * formats.length)]();
  }
}

/**
 * 批量生成不重复的真实感机器人昵称
 */
export function generateRealisticBotNames(count: number): string[] {
  const names: string[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (names.length < count && attempts < count * 10) {
    const name = generateRealisticBotName();
    if (!used.has(name) && name.length <= 20) {
      used.add(name);
      names.push(name);
    }
    attempts++;
  }
  return names;
}
