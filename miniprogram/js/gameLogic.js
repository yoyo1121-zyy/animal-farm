// 抓大鹅小游戏 - 游戏核心逻辑

// ========== 物品大小配置 ==========
const ITEM_SIZE_CONFIG = {
  small: {
    radius: 18,
    density: 0.0008,
    restitution: 0.7,      // 增加弹性，弹跳更明显
    friction: 0.2,
    spawnLayer: 'top',
    probability: 0.4
  },
  medium: {
    radius: 25,
    density: 0.001,
    restitution: 0.6,      // 增加弹性
    friction: 0.3,
    spawnLayer: 'middle',
    probability: 0.4
  },
  large: {
    radius: 35,
    density: 0.0012,
    restitution: 0.5,      // 增加弹性
    friction: 0.4,
    spawnLayer: 'bottom',
    probability: 0.2
  }
};

// 为每种物品类型分配大小
const ITEM_SIZE_MAPPING = {
  // 厨房主题 - 大件蔬菜
  1: 'medium',   // 白菜
  2: 'large',    // 萝卜（大件）
  3: 'medium',   // 玉米
  4: 'small',    // 番茄
  5: 'small',    // 蘑菇
  6: 'small',    // 辣椒
  7: 'medium',   // 茄子
  8: 'large',    // 土豆（大件）

  // 菜市场主题
  9: 'medium',   // 黄瓜
  10: 'small',   // 大蒜
  11: 'small',   // 生姜
  12: 'large',   // 南瓜（大件）
  13: 'large',   // 西瓜（大件）
  14: 'medium',  // 桃子
  15: 'medium',  // 香蕉
  16: 'small',   // 葡萄

  // 梳妆台主题 - 小件为主
  17: 'small',   // 口红
  18: 'small',   // 指甲油
  19: 'medium',  // 镜子
  20: 'medium',  // 香水
  21: 'small',   // 梳子
  22: 'small',   // 刷子
  23: 'small',   // 发卡
  24: 'small',   // 粉扑

  // 玉石主题
  25: 'medium',  // 翡翠
  26: 'large',   // 红宝石
  27: 'medium',  // 蓝宝石
  28: 'large',   // 钻石
  29: 'small',   // 珍珠
  30: 'medium',  // 琥珀
  31: 'medium',  // 玛瑙
  32: 'small',   // 水晶

  // 甜品主题
  33: 'large',   // 蛋糕
  34: 'medium',  // 甜甜圈
  35: 'small',   // 冰淇淋
  36: 'medium',  // 布丁
  37: 'small',   // 马卡龙
  38: 'small',   // 棒棒糖
  39: 'medium',  // 巧克力
  40: 'small',   // 杯子蛋糕

  // 宝藏主题
  41: 'small',   // 金币
  42: 'large',   // 皇冠
  43: 'large',   // 宝箱
  44: 'small',   // 钥匙
  45: 'medium',  // 项链
  46: 'small',   // 戒指
  47: 'large',   // 奖杯
  48: 'medium',   // 宝石

  // 新主题物品映射（覆盖上面的默认配置）
  // 牧场牛羊主题
  1: 'large',    // 奶牛
  2: 'large',    // 绵羊
  3: 'medium',   // 小羊
  4: 'small',    // 牧草
  5: 'medium',   // 奶桶
  6: 'medium',   // 牧羊犬
  7: 'large',    // 马厩
  8: 'large',    // 围栏

  // 魔法植物园主题
  9: 'medium',   // 魔法花
  10: 'small',   // 发光蘑菇
  11: 'small',   // 魔法药水
  12: 'small',   // 星星草
  13: 'large',   // 魔法树
  14: 'medium',  // 水晶花
  15: 'medium',  // 魔法扫帚
  16: 'medium',  // 水晶球
  45: 'small',   // 魔法叶子
  46: 'small',   // 萤火虫
  47: 'medium',  // 月亮
  48: 'large',   // 魔法书
  61: 'medium',  // 魔杖
  62: 'medium',  // 猫头鹰
  63: 'small',   // 精灵
  64: 'large',   // 彩虹
  65: 'small',   // 四叶草
  66: 'large',   // 魔法塔
  67: 'small',   // 魔法蝴蝶
  68: 'large',   // 古树
  69: 'small',   // 魔法钥匙
  70: 'medium',  // 新月
  71: 'medium',  // 龙蛋
  72: 'small',    // 魔法羽毛

  // 田间美食主题
  17: 'medium',  // 面包
  18: 'small',   // 鸡蛋
  19: 'medium',  // 牛奶
  20: 'medium',  // 奶酪
  21: 'small',   // 蜂蜜
  22: 'medium',  // 三明治
  23: 'large',   // 谷仓
  24: 'large',   // 鸡舍

  // 四季物语主题
  25: 'small',   // 种子
  26: 'small',   // 雨滴
  27: 'small',   // 雪花
  28: 'small',   // 阳光
  29: 'small',   // 秋叶
  30: 'small',   // 花蕾
  31: 'medium',  // 彩虹
  32: 'large',   // 水井

  // 花海露营主题
  33: 'large',   // 帐篷
  34: 'medium',  // 营火
  35: 'small',   // 花朵
  36: 'small',   // 蝴蝶
  37: 'medium',  // 篮子
  38: 'medium',  // 望远镜
  39: 'large',   // 筒仓
  40: 'large'    // 开放谷仓
};

// 获取物品大小
function getItemSize(typeId) {
  return ITEM_SIZE_MAPPING[typeId] || 'medium';
}

// ========== 三阶段推送策略 ==========
const PHASE_CONFIG = {
  early: {
    name: '前期',
    progressRange: [0, 0.3],      // 修改为0-30%
    pushStrategy: 'large_priority',
    description: '优先推送大件物品，密集分布',
    itemSizeBias: { large: 0.6, medium: 0.3, small: 0.1 },  // 大件概率进一步提升
    spawnDensity: 0.85,
    layerDistribution: { bottom: 0.5, middle: 0.35, top: 0.15 },
    playerTip: '先消大件，不碰小件'
  },
  middle: {
    name: '中期',
    progressRange: [0.3, 0.7],    // 修改为30%-70%
    pushStrategy: 'mixed',
    description: '混合推送，开始埋藏关键物品',
    itemSizeBias: { large: 0.25, medium: 0.5, small: 0.25 }, // 中期以中件为主
    spawnDensity: 0.7,
    layerDistribution: { bottom: 0.35, middle: 0.4, top: 0.25 },
    buryKeyItems: true,
    playerTip: '开始用"打乱"道具'
  },
  late: {
    name: '后期',
    progressRange: [0.7, 1.0],    // 修改为70%后
    pushStrategy: 'small_priority',
    description: '推送小件，故意制造单数卡槽',
    itemSizeBias: { large: 0.1, medium: 0.25, small: 0.65 }, // 小件概率大幅提升
    spawnDensity: 0.5,
    layerDistribution: { bottom: 0.2, middle: 0.3, top: 0.5 },
    createOddSlots: true,
    playerTip: '用"移出""凑齐"道具救场'
  }
};

// 物品数量控制配置
const ITEM_COUNT_CONTROL = {
  minActiveItems: 30,      // 最小活跃物品数（低于此值触发补充，增加）
  maxActiveItems: 55,      // 最大活跃物品数（补充到此值停止，增加）
  pushBatchSize: 12,       // 每次推送数量（必须是3的倍数，增加）
  checkInterval: 1000,     // 检查间隔（毫秒）
  spawnHeight: 50,         // 生成高度（从顶部）
  spawnVelocity: {         // 生成初速度
    x: 0,
    y: 2                   // 向下的初速度
  },
  // 分阶段物品数量控制 - 优化：初期中期更多物品，后期减少
  phaseControl: {
    early: { minActive: 42, maxActive: 60 },   // 初期：大量物品，方便三消
    middle: { minActive: 35, maxActive: 50 },  // 中期：较多物品
    late: { minActive: 25, maxActive: 35 }     // 后期：减少物品，增加难度
  }
};

// 获取当前阶段
function getCurrentPhase(eliminationProgress) {
  if (eliminationProgress < 0.3) return 'early';   // 0-30%
  if (eliminationProgress < 0.7) return 'middle';  // 30%-70%
  return 'late';                                   // 70%后
}

// ========== 5个主题场景配置 ==========
const THEMES = [
  {
    id: 'ranch',
    name: '牧场牛羊',
    emoji: '🐄',
    bgColor: '#FFF8DC',
    levels: [1, 2]
  },
  {
    id: 'magic',
    name: '魔法植物园',
    emoji: '✨',
    bgColor: '#E6E6FA',
    levels: [3, 4]
  },
  {
    id: 'food',
    name: '田间美食',
    emoji: '🍞',
    bgColor: '#FFE4B5',
    levels: [5, 6]
  },
  {
    id: 'seasons',
    name: '四季物语',
    emoji: '🍀',
    bgColor: '#E0FFFF',
    levels: [7, 8]
  },
  {
    id: 'camping',
    name: '花海露营',
    emoji: '⛺',
    bgColor: '#FFE4E1',
    levels: [9, 10]
  }
];

// 物品类型定义 - 按主题分类（每个类型包含差异大的颜色变体）
// 使用深色马卡龙色系 - 更有辨识度
const SOFT_RAINBOW_COLORS = [
  '#F48FB1', // 深粉红
  '#FFB74D', // 深橙色
  '#FFF176', // 深黄色
  '#81C784', // 深薄荷绿
  '#64B5F6', // 深天蓝
  '#BA68C8', // 深紫色
  '#C5E1A5', // 深青柠
  '#FF8A65', // 深珊瑚
  '#4DB6AC', // 深青色
  '#9575CD'  // 深薰衣草
];

// 颜色名称（用于调试）
const COLOR_NAMES = ['红色', '橙色', '黄色', '绿色', '蓝色'];

const ITEM_TYPES = {
  // 牧场牛羊主题（11种）
  ranch: [
    { id: 1, name: '奶牛', emoji: '🐄', color: '#FFFFFF' },
    { id: 2, name: '绵羊', emoji: '🐑', color: '#F5F5DC' },
    { id: 3, name: '牧草', emoji: '🌿', color: '#32CD32' },
    { id: 4, name: '奶桶', emoji: '🪣', color: '#8B4513' },
    { id: 5, name: '牧羊犬', emoji: '🐕', color: '#D2691E' },
    { id: 6, name: '马厩', emoji: '🏠', color: '#CD853F' },
    { id: 7, name: '围栏', emoji: '🚧', color: '#8B4513' },
    { id: 41, name: '干草堆', emoji: '🌾', color: '#DAA520' },
    { id: 42, name: '水槽', emoji: '🛁', color: '#4682B4' },
    { id: 43, name: '牧场大门', emoji: '🚪', color: '#8B4513' },
    { id: 44, name: '风车', emoji: '🌀', color: '#B0C4DE' }
  ],
  // 魔法植物园主题（24种）
  magic: [
    { id: 9, name: '魔法花', emoji: '🌸', color: '#FF69B4' },
    { id: 10, name: '发光蘑菇', emoji: '🍄', color: '#9370DB' },
    { id: 11, name: '魔法药水', emoji: '🧪', color: '#00CED1' },
    { id: 12, name: '星星草', emoji: '✨', color: '#FFD700' },
    { id: 13, name: '魔法树', emoji: '🌳', color: '#228B22' },
    { id: 14, name: '水晶花', emoji: '💮', color: '#E0FFFF' },
    { id: 15, name: '魔法扫帚', emoji: '🧹', color: '#8B4513' },
    { id: 16, name: '水晶球', emoji: '🔮', color: '#9932CC' },
    { id: 45, name: '魔法叶子', emoji: '🍃', color: '#32CD32' },
    { id: 46, name: '萤火虫', emoji: '🌟', color: '#FFD700' },
    { id: 47, name: '月亮', emoji: '🌙', color: '#F0F8FF' },
    { id: 48, name: '魔法书', emoji: '📖', color: '#8B0000' },
    { id: 61, name: '魔杖', emoji: '🪄', color: '#DEB887' },
    { id: 62, name: '猫头鹰', emoji: '🦉', color: '#8B4513' },
    { id: 63, name: '精灵', emoji: '🧚', color: '#FFC0CB' },
    { id: 64, name: '彩虹', emoji: '🌈', color: '#FF69B4' },
    { id: 65, name: '四叶草', emoji: '🍀', color: '#32CD32' },
    { id: 66, name: '魔法塔', emoji: '🏰', color: '#4B0082' },
    { id: 67, name: '魔法蝴蝶', emoji: '🦋', color: '#9370DB' },
    { id: 68, name: '古树', emoji: '🌲', color: '#8B4513' },
    { id: 69, name: '魔法钥匙', emoji: '🗝️', color: '#FFD700' },
    { id: 70, name: '新月', emoji: '🌑', color: '#F0F8FF' },
    { id: 71, name: '龙蛋', emoji: '🥚', color: '#FF4500' },
    { id: 72, name: '魔法羽毛', emoji: '🪶', color: '#FFD700' }
  ],
  // 田间美食主题（12种）
  food: [
    { id: 17, name: '面包', emoji: '🍞', color: '#DEB887' },
    { id: 18, name: '鸡蛋', emoji: '🥚', color: '#FFFACD' },
    { id: 19, name: '牛奶', emoji: '🥛', color: '#F0F8FF' },
    { id: 20, name: '奶酪', emoji: '🧀', color: '#FFD700' },
    { id: 21, name: '苹果', emoji: '🍎', color: '#FF0000' },
    { id: 22, name: '三明治', emoji: '🥪', color: '#DEB887' },
    { id: 23, name: '谷仓', emoji: '🏠', color: '#8B4513' },
    { id: 24, name: '鸡舍', emoji: '🐔', color: '#CD853F' },
    { id: 49, name: '牛油果', emoji: '🥑', color: '#32CD32' },
    { id: 50, name: '柠檬', emoji: '🍋', color: '#FFD700' },
    { id: 51, name: '蛋糕', emoji: '🍰', color: '#FFC0CB' },
    { id: 52, name: '果汁', emoji: '🧃', color: '#FFA500' }
  ],
  // 四季物语主题（12种）
  seasons: [
    { id: 25, name: '种子', emoji: '🌰', color: '#8B4513' },
    { id: 26, name: '雨滴', emoji: '💧', color: '#4682B4' },
    { id: 27, name: '雪花', emoji: '❄️', color: '#F0F8FF' },
    { id: 28, name: '阳光', emoji: '☀️', color: '#FFD700' },
    { id: 29, name: '秋叶', emoji: '🍂', color: '#D2691E' },
    { id: 30, name: '花蕾', emoji: '🌷', color: '#FF69B4' },
    { id: 31, name: '彩虹', emoji: '🌈', color: '#FF69B4' },
    { id: 32, name: '水井', emoji: '🕳️', color: '#696969' },
    { id: 53, name: '云朵', emoji: '☁️', color: '#F0F8FF' },
    { id: 54, name: '露珠', emoji: '💎', color: '#E0FFFF' },
    { id: 55, name: '雪花人', emoji: '⛄', color: '#F0F8FF' },
    { id: 56, name: '彩虹桥', emoji: '🌉', color: '#FF69B4' }
  ],
  // 花海露营主题（12种）
  camping: [
    { id: 33, name: '帐篷', emoji: '⛺', color: '#FFA500' },
    { id: 34, name: '营火', emoji: '🔥', color: '#FF4500' },
    { id: 35, name: '花朵', emoji: '🌸', color: '#FF69B4' },
    { id: 36, name: '蝴蝶', emoji: '🦋', color: '#9370DB' },
    { id: 37, name: '篮子', emoji: '🧺', color: '#D2691E' },
    { id: 38, name: '望远镜', emoji: '🔭', color: '#2F4F4F' },
    { id: 39, name: '筒仓', emoji: '🏗️', color: '#CD853F' },
    { id: 40, name: '开放谷仓', emoji: '🏠', color: '#8B4513' },
    { id: 57, name: '背包', emoji: '🎒', color: '#4169E1' },
    { id: 58, name: '水壶', emoji: '🚿', color: '#4682B4' },
    { id: 59, name: '地图', emoji: '🗺️', color: '#DEB887' },
    { id: 60, name: '篝火架', emoji: '🔥', color: '#8B4513' }
  ]
};

// 获取所有物品类型
function getAllItemTypes() {
  let allTypes = [];
  Object.values(ITEM_TYPES).forEach(themeTypes => {
    allTypes = allTypes.concat(themeTypes);
  });
  return allTypes;
}

const ALL_ITEM_TYPES = getAllItemTypes();

// 随机打乱数组
function shuffleArray(array) {
  var result = array.slice();
  for (var i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

// 获取关卡配置 - 按照抓大鹅的难度设计
function getLevelConfig(level) {
  // 获取主题
  const themeIndex = Math.min(Math.floor((level - 1) / 2), THEMES.length - 1);
  const theme = THEMES[themeIndex];
  const isSecondLevelInTheme = level % 2 === 0;

  // 第一关：教学关，45个物品 - 使用对应主题的物品
  if (level === 1) {
    // 获取当前主题的物品类型
    const themeItems = ITEM_TYPES[theme.id] || ITEM_TYPES.ranch;
    const selectedTypes = themeItems.slice(0, Math.min(5, themeItems.length)).map(t => t.id);

    return {
      level: 1,
      name: '新手教学',
      theme: theme,
      timeLimit: 150, // 2.5分钟
      itemCount: 45,  // 15组
      initialSpawnCount: 27, // 开局生成27个（9组，增加）
      itemTypes: selectedTypes,
      maxLayer: 1,    // 单层堆叠
      density: 0.4,   // 稀疏布局
      difficulty: '新手'
    };
  }

  // 第二关：进阶，使用对应主题的物品
  if (level === 2) {
    // 获取当前主题的物品类型
    const themeItems = ITEM_TYPES[theme.id] || ITEM_TYPES.ranch;
    const selectedTypes = themeItems.map(t => t.id);

    return {
      level: 2,
      name: '牧场进阶',
      theme: theme,
      timeLimit: 300, // 5分钟
      itemCount: 120, // 40组
      initialSpawnCount: 42, // 开局生成42个（14组，增加）
      itemTypes: selectedTypes,
      maxLayer: 2,    // 2层堆叠
      density: 0.75,  // 中高密度
      difficulty: '普通'
    };
  }

  // 第3-12关：渐进难度
  const baseItemCount = isSecondLevelInTheme ? 200 : 120; // 主题第二关更难
  const levelProgress = level - 2;
  const itemCountAdd = levelProgress * 30;
  const finalItemCount = Math.min(baseItemCount + itemCountAdd, 300);

  // 获取当前主题的物品类型
  const themeItems = ITEM_TYPES[theme.id] || ITEM_TYPES.kitchen;
  // 魔法植物园主题使用更多种类的物品（18种），其他主题使用原来的数量
  let typeCount;
  if (theme.id === 'magic') {
    typeCount = Math.min(themeItems.length, 18); // 魔法主题使用18种物品
  } else {
    typeCount = Math.min(themeItems.length, 6 + Math.floor(level / 2));
  }
  const selectedTypes = shuffleArray(themeItems).slice(0, typeCount).map(t => t.id);

  // 后期主题（第7关起）可能3层堆叠
  const maxLayer = level >= 7 ? 3 : 2;

  // ========== 时间配置 ==========
  // 第3-5关: 300秒(5分钟)
  // 第6-12关: 360秒(6分钟)
  let timeLimit;
  if (level <= 5) {
    timeLimit = 300; // 5分钟
  } else {
    timeLimit = 360; // 6分钟
  }

  return {
    level: level,
    name: theme.name + (isSecondLevelInTheme ? '·进阶' : '·入门'),
    theme: theme,
    timeLimit: timeLimit,
    itemCount: Math.ceil(finalItemCount / 3) * 3, // 确保是3的倍数
    initialSpawnCount: 45 + Math.floor(level / 2) * 6, // 开局物品随关卡增加（第3关48个，第4关51个...）
    itemTypes: selectedTypes,
    maxLayer: maxLayer,
    density: Math.min(0.6 + level * 0.03, 0.9),
    difficulty: isSecondLevelInTheme ? '困难' : '普通'
  };
}

// 生成游戏物品 - 多层堆叠模拟（优化版：大件优先底层）
// spawnCount: 要生成的物品数量，如果未指定则生成全部
function generateGameItems(config, phase = 'early', spawnCount = null, themeId = null) {
  const { itemCount, itemTypes, maxLayer, density } = config;
  const phaseConfig = PHASE_CONFIG[phase];

  // 确定要生成的物品数量 - 必须是3的倍数
  let actualSpawnCount = spawnCount !== null ? Math.min(spawnCount, itemCount) : itemCount;
  // 确保是3的倍数
  actualSpawnCount = Math.floor(actualSpawnCount / 3) * 3;

  const items = [];

  // ========== 每种物品类型使用单一颜色，通过3D模型区分 ==========
  // 从所有主题中查找物品类型
  function findItemType(typeId) {
    for (const themeKey in ITEM_TYPES) {
      const found = ITEM_TYPES[themeKey].find(t => t.id === typeId);
      if (found) return found;
    }
    return ALL_ITEM_TYPES.find(t => t.id === typeId) || ALL_ITEM_TYPES[0];
  }

  // 为每种物品类型生成3的倍数个物品
  let itemsGenerated = 0;
  // 确保每种类型至少生成3个（1组）
  const itemsPerType = Math.max(3, Math.floor(actualSpawnCount / itemTypes.length / 3) * 3);

  for (let typeIdx = 0; typeIdx < itemTypes.length && itemsGenerated < actualSpawnCount; typeIdx++) {
    const typeId = itemTypes[typeIdx];
    const itemType = findItemType(typeId);
    const size = getItemSize(typeId);

    // 每种类型生成物品数（确保是3的倍数）
    const countForThisType = Math.min(itemsPerType, actualSpawnCount - itemsGenerated);
    const finalCount = Math.floor(countForThisType / 3) * 3;

    for (let i = 0; i < finalCount; i++) {
      items.push({
        id: `${typeId}_${i}_${Date.now()}_${Math.random()}`,
        type: typeId,
        name: itemType.name,
        emoji: itemType.emoji,
        color: itemType.color || '#CCCCCC',
        size: size,
        sizeConfig: ITEM_SIZE_CONFIG[size]
      });

      itemsGenerated++;
    }
  }

  // ========== 按大小分组，用于分层放置 ==========
  const largeItems = items.filter(i => i.size === 'large');
  const mediumItems = items.filter(i => i.size === 'medium');
  const smallItems = items.filter(i => i.size === 'small');

  // 根据阶段配置的分层比例
  const layerDist = phaseConfig.layerDistribution;
  const totalItems = items.length;

  const bottomCount = Math.floor(totalItems * layerDist.bottom);
  const middleCount = Math.floor(totalItems * layerDist.middle);
  const topCount = totalItems - bottomCount - middleCount;

  // ========== 底层：优先放大件（骨架） ==========
  const bottomLayer = [];
  const midLayer = [];
  const topLayer = [];

  // 先放所有大件到底层
  largeItems.forEach(item => {
    if (bottomLayer.length < bottomCount) {
      bottomLayer.push(item);
    } else if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else {
      topLayer.push(item);
    }
  });

  // 中件优先放中层
  mediumItems.forEach(item => {
    if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else if (bottomLayer.length < bottomCount) {
      bottomLayer.push(item);
    } else {
      topLayer.push(item);
    }
  });

  // 小件优先放顶层
  smallItems.forEach(item => {
    if (topLayer.length < topCount) {
      topLayer.push(item);
    } else if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else {
      bottomLayer.push(item);
    }
  });

  // 打乱每层内部的顺序
  var shuffledItems = []
    .concat(shuffleArray(bottomLayer))
    .concat(shuffleArray(midLayer))
    .concat(shuffleArray(topLayer));

  // ========== 多层堆叠生成 ==========
  const containerWidth = 300;
  const containerHeight = 300;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const maxRadius = Math.min(containerWidth, containerHeight) / 2 - 25;

  // 逐层生成物品位置
  let itemIndex = 0;

  // 底层（zIndex=0）- 大件骨架
  const bottomLayerItems = bottomLayer.length;
  for (let i = 0; i < bottomLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const sizeConfig = item.sizeConfig || ITEM_SIZE_CONFIG.medium;

    // 螺旋分布，大件更分散
    const progress = i / Math.max(bottomLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (1.5 + Math.random());
    const radius = Math.sqrt(progress) * maxRadius * 0.9;

    const randomOffset = 20 * (1 - density * 0.3);
    let x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * randomOffset;
    let y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * randomOffset;

    // 限制在容器内
    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (dist > maxRadius) {
      x = centerX + (x - centerX) / dist * maxRadius;
      y = centerY + (y - centerY) / dist * maxRadius;
    }

    item.x = Math.max(20, Math.min(containerWidth - 60, x));
    item.y = Math.max(20, Math.min(containerHeight - 60, y));
    item.zIndex = 0;
    item.layer = 'bottom';
    item.clickable = false;
    item.targetX = item.x;
    item.targetY = item.y;
    item.currentX = item.x;
    item.currentY = item.y;
    item.rotation = Math.random() * Math.PI * 0.15 - Math.PI * 0.075;
  }

  // 中层（zIndex=1）
  const midLayerItems = midLayer.length;
  for (let i = 0; i < midLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const sizeConfig = item.sizeConfig || ITEM_SIZE_CONFIG.medium;

    const progress = i / Math.max(midLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (2 + Math.random() * 1.5);
    const radius = Math.sqrt(progress) * maxRadius * 0.75;

    const randomOffset = 15 * (1 - density * 0.4);
    let x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * randomOffset;
    let y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * randomOffset;

    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (dist > maxRadius * 0.85) {
      x = centerX + (x - centerX) / dist * maxRadius * 0.85;
      y = centerY + (y - centerY) / dist * maxRadius * 0.85;
    }

    item.x = Math.max(20, Math.min(containerWidth - 60, x));
    item.y = Math.max(20, Math.min(containerHeight - 60, y));
    item.zIndex = 1;
    item.layer = 'middle';
    item.clickable = false;
    item.targetX = item.x;
    item.targetY = item.y;
    item.currentX = item.x;
    item.currentY = item.y;
    item.rotation = Math.random() * Math.PI * 0.2 - Math.PI * 0.1;
  }

  // 顶层（zIndex=2）- 小件为主
  const topLayerItems = topLayer.length;
  for (let i = 0; i < topLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const sizeConfig = item.sizeConfig || ITEM_SIZE_CONFIG.small;

    const progress = i / Math.max(topLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (2.5 + Math.random() * 2);
    const radius = Math.sqrt(progress) * maxRadius * 0.6;

    const randomOffset = 10 * (1 - density * 0.5);
    let x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * randomOffset;
    let y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * randomOffset;

    const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (dist > maxRadius * 0.75) {
      x = centerX + (x - centerX) / dist * maxRadius * 0.75;
      y = centerY + (y - centerY) / dist * maxRadius * 0.75;
    }

    item.x = Math.max(20, Math.min(containerWidth - 60, x));
    item.y = Math.max(20, Math.min(containerHeight - 60, y));
    item.zIndex = 2;
    item.layer = 'top';
    item.clickable = false;
    item.targetX = item.x;
    item.targetY = item.y;
    item.currentX = item.x;
    item.currentY = item.y;
    item.rotation = Math.random() * Math.PI * 0.25 - Math.PI * 0.125;
  }

  // 更新可点击状态
  return updateClickable(shuffledItems);
}

// 更新物品的可点击状态
function updateClickable(items) {
  if (items.length === 0) return items;

  // 按zIndex排序，从高到低
  var sortedItems = items.slice().sort(function(a, b) { return b.zIndex - a.zIndex; });

  // 先标记所有物品为不可点击
  var result = items.map(function(item) {
    var newItem = {};
    for (var key in item) {
      newItem[key] = item[key];
    }
    newItem.clickable = false;
    return newItem;
  });

  // 从最高层开始，逐层确定可点击状态
  for (var i = 0; i < sortedItems.length; i++) {
    var currentItem = sortedItems[i];
    var resultIndex = result.findIndex(function(r) { return r.id === currentItem.id; });

    // 检查是否被任何更高层的物品遮挡
    var isBlocked = false;
    for (var j = 0; j < i; j++) {
      var higherItem = sortedItems[j];
      if (isOverlap(higherItem, currentItem)) {
        isBlocked = true;
        break;
      }
    }

    if (!isBlocked) {
      result[resultIndex].clickable = true;
    }
  }

  return result;
}

// 检查两个物品是否重叠 - 使用80%重叠率标准
function isOverlap(item1, item2) {
  const size = 60; // 物品大小（与渲染尺寸保持一致）
  const halfSize = size / 2;

  // 物品边界（x, y 是中心点）
  const item1Left = item1.x - halfSize;
  const item1Right = item1.x + halfSize;
  const item1Top = item1.y - halfSize;
  const item1Bottom = item1.y + halfSize;

  const item2Left = item2.x - halfSize;
  const item2Right = item2.x + halfSize;
  const item2Top = item2.y - halfSize;
  const item2Bottom = item2.y + halfSize;

  // 计算重叠区域
  const overlapLeft = Math.max(item1Left, item2Left);
  const overlapRight = Math.min(item1Right, item2Right);
  const overlapTop = Math.max(item1Top, item2Top);
  const overlapBottom = Math.min(item1Bottom, item2Bottom);

  // 如果没有重叠
  if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
    return false;
  }

  // 计算重叠面积
  const overlapWidth = overlapRight - overlapLeft;
  const overlapHeight = overlapBottom - overlapTop;
  const overlapArea = overlapWidth * overlapHeight;

  // 计算被遮挡物品的面积
  const item1Area = size * size;

  // 计算重叠率
  const overlapRatio = overlapArea / item1Area;

  // 检查边缘露出 - 如果被遮挡物品有任何边缘完全露出，则不算完全遮挡
  const hasExposedEdge = checkExposedEdge(item1, item2, size);

  // 判定标准：重叠率超过80% 且无边缘露出 = 完全遮挡
  const isFullyBlocked = overlapRatio > 0.8 && !hasExposedEdge;

  return isFullyBlocked;
}

// 检查被遮挡物品是否有边缘露出
function checkExposedEdge(item1, item2, size) {
  const tolerance = 2; // 容差像素
  const halfSize = size / 2;

  // 物品1的四个边界（x, y 是中心点）
  const item1Left = item1.x - halfSize;
  const item1Right = item1.x + halfSize;
  const item1Top = item1.y - halfSize;
  const item1Bottom = item1.y + halfSize;

  // 物品2的四个边界（x, y 是中心点）
  const item2Left = item2.x - halfSize;
  const item2Right = item2.x + halfSize;
  const item2Top = item2.y - halfSize;
  const item2Bottom = item2.y + halfSize;

  // 检查物品1的四个边缘是否有任何部分未被物品2覆盖
  // 左边缘
  if (item1Left < item2Left - tolerance) return true;
  // 右边缘
  if (item1Right > item2Right + tolerance) return true;
  // 上边缘
  if (item1Top < item2Top - tolerance) return true;
  // 下边缘
  if (item1Bottom > item2Bottom + tolerance) return true;

  // 检查四个角是否露出
  // 左上角
  if (item1Left < item2Left - tolerance && item1Top < item2Top - tolerance) return true;
  // 右上角
  if (item1Right > item2Right + tolerance && item1Top < item2Top - tolerance) return true;
  // 左下角
  if (item1Left < item2Left - tolerance && item1Bottom > item2Bottom + tolerance) return true;
  // 右下角
  if (item1Right > item2Right + tolerance && item1Bottom > item2Bottom + tolerance) return true;

  return false;
}

// 打乱物品
function shuffleItems(items) {
  const containerWidth = 300;
  const containerHeight = 300;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const maxRadius = Math.min(containerWidth, containerHeight) / 2 - 30;

  const maxLayer = Math.max(...items.map(i => i.zIndex)) + 1;
  const itemsPerLayer = Math.ceil(items.length / maxLayer);

  return items.map((item, index) => {
    const layer = item.zIndex;
    const indexInLayer = index % itemsPerLayer;

    const angle = (indexInLayer / itemsPerLayer) * Math.PI * 2 * 3;
    const radius = (indexInLayer / itemsPerLayer) * maxRadius;

    const randomOffset = 15;
    const offsetX = (Math.random() - 0.5) * randomOffset;
    const offsetY = (Math.random() - 0.5) * randomOffset;

    let x = centerX + Math.cos(angle) * radius + offsetX;
    let y = centerY + Math.sin(angle) * radius + offsetY;

    x = Math.max(20, Math.min(containerWidth - 60, x));
    y = Math.max(20, Math.min(containerHeight - 60, y));

    return {
      ...item,
      x: x,
      y: y,
      targetX: x,
      targetY: y,
      currentX: x,
      currentY: y
    };
  });
}

// ========== 动态推送系统 ==========

/**
 * 根据当前阶段生成推送物品
 * @param {string} phase - 当前阶段 ('early', 'middle', 'late')
 * @param {Array} existingItemTypes - 现有物品类型ID数组
 * @param {number} count - 推送数量
 * @param {Object} currentSlotState - 当前卡槽状态 {typeId: count}
 * @returns {Array} 新推送的物品数组
 */
function generatePushItems(phase, existingItemTypes, count, currentSlotState) {
  const phaseConfig = PHASE_CONFIG[phase];
  const items = [];

  // 获取当前卡槽中各类型的数量
  const slotCounts = {};
  for (const typeId in currentSlotState) {
    slotCounts[typeId] = currentSlotState[typeId];
  }

  for (let i = 0; i < count; i++) {
    let typeId;

    if (phase === 'late' && phaseConfig.createOddSlots) {
      // 后期：故意制造单数卡槽
      typeId = selectItemForOddSlots(existingItemTypes, slotCounts);
    } else if (phase === 'middle' && phaseConfig.buryKeyItems) {
      // 中期：埋藏关键物品（推送已有的类型，增加堆叠）
      typeId = selectExistingItemPriority(existingItemTypes, slotCounts);
    } else {
      // 前期/默认：按阶段配置的大小偏差推送
      typeId = selectItemBySizeBias(existingItemTypes, phaseConfig.itemSizeBias);
    }

    const itemType = findItemTypeById(typeId);
    const size = getItemSize(typeId);

    // 使用物品类型的单一颜色
    const itemColor = itemType.color || '#CCCCCC';

    items.push({
      id: `push_${typeId}_${i}_${Date.now()}_${Math.random()}`,
      type: typeId,
      name: itemType.name,
      emoji: itemType.emoji,
      color: itemColor,
      size: size,
      sizeConfig: ITEM_SIZE_CONFIG[size],
      isPushed: true  // 标记为推送物品
    });
  }

  return items;
}

/**
 * 根据大小偏差选择物品类型
 */
function selectItemBySizeBias(itemTypes, sizeBias) {
  // 按大小偏差随机选择
  const rand = Math.random();
  let targetSize;

  if (rand < sizeBias.large) {
    targetSize = 'large';
  } else if (rand < sizeBias.large + sizeBias.medium) {
    targetSize = 'medium';
  } else {
    targetSize = 'small';
  }

  // 找到对应大小的物品类型
  const matchingTypes = itemTypes.filter(id => getItemSize(id) === targetSize);

  if (matchingTypes.length > 0) {
    return matchingTypes[Math.floor(Math.random() * matchingTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

/**
 * 选择已有物品优先（中期埋藏策略）
 */
function selectExistingItemPriority(itemTypes, slotCounts) {
  // 优先选择卡槽中已有的类型（增加堆叠难度）
  const existingTypes = itemTypes.filter(id => slotCounts[id] && slotCounts[id] > 0);

  if (existingTypes.length > 0 && Math.random() < 0.7) {
    return existingTypes[Math.floor(Math.random() * existingTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

/**
 * 选择制造单数卡槽的物品（后期策略）
 */
function selectItemForOddSlots(itemTypes, slotCounts) {
  // 找出卡槽中数量为1或2的类型（容易造成单数卡槽）
  const dangerTypes = [];
  for (const typeId in slotCounts) {
    if (slotCounts[typeId] === 1 || slotCounts[typeId] === 2) {
      dangerTypes.push(typeId);
    }
  }

  // 50%概率推送危险类型
  if (dangerTypes.length > 0 && Math.random() < 0.5) {
    return dangerTypes[Math.floor(Math.random() * dangerTypes.length)];
  }

  // 否则推送小件（小件更容易造成卡槽问题）
  const smallTypes = itemTypes.filter(id => getItemSize(id) === 'small');
  if (smallTypes.length > 0 && Math.random() < 0.6) {
    return smallTypes[Math.floor(Math.random() * smallTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

/**
 * 根据类型ID查找物品类型信息
 */
function findItemTypeById(typeId) {
  for (const themeKey in ITEM_TYPES) {
    const found = ITEM_TYPES[themeKey].find(t => t.id === typeId);
    if (found) return found;
  }
  return ALL_ITEM_TYPES.find(t => t.id === typeId) || ALL_ITEM_TYPES[0];
}

/**
 * 从物品类型获取颜色（单一颜色）
 */
function getRandomColorFromType(itemType) {
  return itemType.color || '#CCCCCC';
}

/**
 * 计算消除进度
 * @param {number} initialCount - 初始物品数量
 * @param {number} currentCount - 当前物品数量
 * @returns {number} 进度 0-1
 */
function calculateEliminationProgress(initialCount, currentCount) {
  if (initialCount === 0) return 0;
  return (initialCount - currentCount) / initialCount;
}

/**
 * 检查是否应该触发推送
 * @param {number} phase - 当前阶段
 * @param {number} currentItemCount - 当前物品数量
 * @param {number} threshold - 推送阈值
 * @returns {boolean}
 */
function shouldTriggerPush(phase, currentItemCount, threshold) {
  const config = ITEM_COUNT_CONTROL;

  // 基于活跃物品数量控制
  if (currentItemCount < config.minActiveItems) {
    return true; // 低于最小值，必须推送
  }
  if (currentItemCount >= config.maxActiveItems) {
    return false; // 高于最大值，不推送
  }

  // 不同阶段有不同的推送触发条件
  if (phase === 'early') {
    // 前期：保持较高物品密度
    return currentItemCount < config.maxActiveItems;
  } else if (phase === 'middle') {
    // 中期：正常推送
    return currentItemCount < config.maxActiveItems - 5;
  } else {
    // 后期：较少触发推送，让玩家处理现有物品
    return currentItemCount < config.minActiveItems;
  }
}

/**
 * 从顶部生成物品（模拟掉落效果）
 * @param {Array} itemTypes - 可用的物品类型ID数组
 * @param {number} count - 生成数量
 * @param {string} phase - 当前阶段
 * @param {Object} slotState - 当前卡槽状态
 * @returns {Array} 新生成的物品数组
 */
function generateItemsFromTop(itemTypes, count, phase, slotState) {
  const phaseConfig = PHASE_CONFIG[phase];
  const items = [];

  const containerWidth = 300;
  const containerHeight = 300;
  const centerX = containerWidth / 2;

  for (let i = 0; i < count; i++) {
    // 根据阶段选择物品类型
    let typeId;
    if (phase === 'late' && phaseConfig.createOddSlots) {
      typeId = selectItemForOddSlots(itemTypes, slotState);
    } else if (phase === 'middle' && phaseConfig.buryKeyItems) {
      typeId = selectExistingItemPriority(itemTypes, slotState);
    } else {
      typeId = selectItemBySizeBias(itemTypes, phaseConfig.itemSizeBias);
    }

    const itemType = findItemTypeById(typeId);
    const size = getItemSize(typeId);

    // 使用物品类型的单一颜色
    const itemColor = itemType.color || '#CCCCCC';

    // 从顶部随机位置生成
    const spawnX = 30 + Math.random() * (containerWidth - 90); // 留出边距
    const spawnY = ITEM_COUNT_CONTROL.spawnHeight + Math.random() * 30; // 顶部区域

    items.push({
      id: `drop_${typeId}_${i}_${Date.now()}_${Math.random()}`,
      type: typeId,
      name: itemType.name,
      emoji: itemType.emoji,
      color: itemColor,
      size: size,
      sizeConfig: ITEM_SIZE_CONFIG[size],
      x: spawnX,
      y: spawnY,
      zIndex: 2, // 顶层
      layer: 'top',
      clickable: false, // 初始不可点击，落地后更新
      isDropped: true,  // 标记为掉落物品
      initialForce: {
        x: (Math.random() - 0.5) * 0.5, // 轻微随机水平力
        y: ITEM_COUNT_CONTROL.spawnVelocity.y + Math.random() * 1 // 向下速度
      },
      initialAngularVel: (Math.random() - 0.5) * 0.1 // 轻微旋转
    });
  }

  return items;
}

// 导出模块 - 微信小游戏兼容
const exports = {
  THEMES,
  ITEM_TYPES,
  ALL_ITEM_TYPES,
  ITEM_SIZE_CONFIG,
  ITEM_SIZE_MAPPING,
  PHASE_CONFIG,
  ITEM_COUNT_CONTROL,
  SOFT_RAINBOW_COLORS,
  getLevelConfig,
  generateGameItems,
  generatePushItems,
  generateItemsFromTop,
  updateClickable,
  shuffleItems,
  checkExposedEdge,
  getItemSize,
  getCurrentPhase,
  calculateEliminationProgress,
  shouldTriggerPush,
  // 添加缺失的辅助函数
  selectItemBySizeBias,
  selectItemForOddSlots,
  selectExistingItemPriority,
  findItemTypeById,
  getRandomColorFromType
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
} else {
  if (typeof global !== 'undefined') {
    global.GameLogic = exports;
  }
  if (typeof wx !== 'undefined') {
    wx.GameLogic = exports;
  }
}
