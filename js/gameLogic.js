// 抓大鹅小游戏 H5 版本 - 游戏核心逻辑
console.log('[gameLogic.js] 文件开始执行...');
// 从微信小游戏版本转换而来

// ========== 物品大小配置 ==========
const ITEM_SIZE_CONFIG = {
  small: {
    radius: 18,
    density: 0.0008,
    restitution: 0.7,
    friction: 0.2,
    spawnLayer: 'top',
    probability: 0.4
  },
  medium: {
    radius: 25,
    density: 0.001,
    restitution: 0.6,
    friction: 0.3,
    spawnLayer: 'middle',
    probability: 0.4
  },
  large: {
    radius: 35,
    density: 0.0012,
    restitution: 0.5,
    friction: 0.4,
    spawnLayer: 'bottom',
    probability: 0.2
  }
};

// 为每种物品类型分配大小（完整映射）
const ITEM_SIZE_MAPPING = {
  // 牧场牛羊主题
  1: 'large',    // 奶牛
  2: 'large',    // 绵羊
  3: 'small',    // 牧草
  4: 'medium',   // 奶桶
  5: 'medium',   // 牧羊犬
  6: 'large',    // 马厩
  7: 'large',    // 鸡
  41: 'medium',  // 干草堆
  42: 'medium',  // 水槽
  43: 'large',   // 牧场大门
  44: 'medium',  // 风车
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
  72: 'small',   // 魔法羽毛
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

function getItemSize(typeId) {
  return ITEM_SIZE_MAPPING[typeId] || 'medium';
}

// ========== 三阶段推送策略 ==========
const PHASE_CONFIG = {
  early: {
    name: '前期',
    progressRange: [0, 0.3],
    pushStrategy: 'large_priority',
    description: '优先推送大件物品，密集分布',
    itemSizeBias: { large: 0.6, medium: 0.3, small: 0.1 },
    spawnDensity: 0.85,
    layerDistribution: { bottom: 0.5, middle: 0.35, top: 0.15 },
    playerTip: '先消大件，不碰小件'
  },
  middle: {
    name: '中期',
    progressRange: [0.3, 0.7],
    pushStrategy: 'mixed',
    description: '混合推送，开始埋藏关键物品',
    itemSizeBias: { large: 0.25, medium: 0.5, small: 0.25 },
    spawnDensity: 0.7,
    layerDistribution: { bottom: 0.35, middle: 0.4, top: 0.25 },
    buryKeyItems: true,
    playerTip: '开始用"打乱"道具'
  },
  late: {
    name: '后期',
    progressRange: [0.7, 1.0],
    pushStrategy: 'small_priority',
    description: '推送小件，故意制造单数卡槽',
    itemSizeBias: { large: 0.1, medium: 0.25, small: 0.65 },
    spawnDensity: 0.5,
    layerDistribution: { bottom: 0.2, middle: 0.3, top: 0.5 },
    createOddSlots: true,
    playerTip: '用"移出""凑齐"道具救场'
  }
};

const ITEM_COUNT_CONTROL = {
  minActiveItems: 30,
  maxActiveItems: 55,
  pushBatchSize: 12,
  checkInterval: 1000,
  spawnHeight: 50,
  spawnVelocity: { x: 0, y: 2 },
  phaseControl: {
    early: { minActive: 42, maxActive: 60 },
    middle: { minActive: 35, maxActive: 50 },
    late: { minActive: 25, maxActive: 35 }
  }
};

function getCurrentPhase(eliminationProgress) {
  if (eliminationProgress < 0.3) return 'early';
  if (eliminationProgress < 0.7) return 'middle';
  return 'late';
}

// ========== 5个主题场景配置 ==========
const THEMES = [
  { id: 'ranch', name: '牧场牛羊', emoji: '🐄', bgColor: '#FFF8DC', levels: [1, 2] },
  { id: 'magic', name: '魔法植物园', emoji: '✨', bgColor: '#E6E6FA', levels: [3, 4] },
  { id: 'food', name: '田间美食', emoji: '🍞', bgColor: '#FFE4B5', levels: [5, 6] },
  { id: 'seasons', name: '四季物语', emoji: '🍀', bgColor: '#E0FFFF', levels: [7, 8] },
  { id: 'camping', name: '花海露营', emoji: '⛺', bgColor: '#FFE4E1', levels: [9, 10] }
];

// 物品类型定义
const ITEM_TYPES = {
  ranch: [
    { id: 1, name: '奶牛', emoji: '🐄', color: '#FFFFFF' },
    { id: 2, name: '绵羊', emoji: '🐑', color: '#F5F5DC' },
    { id: 3, name: '牧草', emoji: '🌿', color: '#32CD32' },
    { id: 4, name: '奶桶', emoji: '🪣', color: '#8B4513' },
    { id: 5, name: '牧羊犬', emoji: '🐕', color: '#D2691E' },
    { id: 6, name: '马厩', emoji: '🏠', color: '#CD853F' },
    { id: 7, name: '鸡', emoji: '🐔', color: '#CD853F' },
    { id: 41, name: '干草堆', emoji: '🌾', color: '#DAA520' },
    { id: 42, name: '水槽', emoji: '🛁', color: '#4682B4' },
    { id: 43, name: '牧场大门', emoji: '🚪', color: '#8B4513' },
    { id: 44, name: '风车', emoji: '🌀', color: '#B0C4DE' }
  ],
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

function getAllItemTypes() {
  let allTypes = [];
  Object.values(ITEM_TYPES).forEach(themeTypes => {
    allTypes = allTypes.concat(themeTypes);
  });
  return allTypes;
}

const ALL_ITEM_TYPES = getAllItemTypes();

// 初始化检查：输出所有物品类型（简单直接）
console.log('===== 物品类型检查 =====');
console.log('type:1 =', ITEM_TYPES.ranch.find(t => t.id === 1));
console.log('type:4 =', ITEM_TYPES.ranch.find(t => t.id === 4));
console.log('type:43 =', ITEM_TYPES.ranch.find(t => t.id === 43));
console.log('type:44 =', ITEM_TYPES.ranch.find(t => t.id === 44));
console.log('=======================');

function shuffleArray(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 获取关卡配置
function getLevelConfig(level) {
  const themeIndex = Math.min(Math.floor((level - 1) / 2), THEMES.length - 1);
  const theme = THEMES[themeIndex];
  const isSecondLevelInTheme = level % 2 === 0;

  if (level === 1) {
    const themeItems = ITEM_TYPES[theme.id] || ITEM_TYPES.ranch;
    const selectedTypes = themeItems.slice(0, Math.min(5, themeItems.length)).map(t => t.id);

    return {
      level: 1,
      name: '新手教学',
      theme: theme,
      timeLimit: 150,
      itemCount: 45,
      initialSpawnCount: 27,
      itemTypes: selectedTypes,
      maxLayer: 1,
      density: 0.4,
      difficulty: '新手'
    };
  }

  // 从第2关开始，每个关卡只使用当前主题的物品
  const themeItems = ITEM_TYPES[theme.id] || ITEM_TYPES.ranch;

  // 根据主题物品数量，决定使用多少品种
  // 如果主题物品较少，使用所有物品；如果较多，随机选择一部分
  let selectedTypes;
  if (themeItems.length <= 15) {
    // 物品较少，使用全部
    selectedTypes = themeItems.map(t => t.id);
  } else {
    // 物品较多，随机选择12-18个品种（只从当前主题选择）
    const minVarieties = 12;
    const maxVarieties = 18;
    const typeCount = Math.min(
      themeItems.length,
      Math.floor(Math.random() * (maxVarieties - minVarieties + 1)) + minVarieties
    );
    selectedTypes = shuffleArray(themeItems).slice(0, typeCount).map(t => t.id);
  }

  const baseItemCount = isSecondLevelInTheme ? 200 : 120;
  const levelProgress = level - 2;
  const itemCountAdd = levelProgress * 30;
  const finalItemCount = Math.min(baseItemCount + itemCountAdd, 300);

  console.log(`[getLevelConfig] 关卡${level}: 主题=${theme.id}, 品种数=${selectedTypes.length}（仅当前主题）, 物品总数=${finalItemCount}`);

  const maxLayer = level >= 7 ? 3 : 2;

  let timeLimit;
  if (level <= 5) {
    timeLimit = 300;
  } else {
    timeLimit = 360;
  }

  return {
    level: level,
    name: theme.name + (isSecondLevelInTheme ? '·进阶' : '·入门'),
    theme: theme,
    timeLimit: timeLimit,
    itemCount: Math.ceil(finalItemCount / 3) * 3,
    initialSpawnCount: 45 + Math.floor(level / 2) * 6,
    itemTypes: selectedTypes,
    maxLayer: maxLayer,
    density: Math.min(0.6 + level * 0.03, 0.9),
    difficulty: isSecondLevelInTheme ? '困难' : '普通'
  };
}

// 生成游戏物品
function generateGameItems(config, phase = 'early', spawnCount = null) {
  const { itemCount, itemTypes } = config;
  const phaseConfig = PHASE_CONFIG[phase];

  let actualSpawnCount = spawnCount !== null ? Math.min(spawnCount, itemCount) : itemCount;
  actualSpawnCount = Math.floor(actualSpawnCount / 3) * 3;

  const items = [];

  function findItemType(typeId) {
    for (const themeKey in ITEM_TYPES) {
      const found = ITEM_TYPES[themeKey].find(t => t.id === typeId);
      if (found) return found;
    }
    return ALL_ITEM_TYPES.find(t => t.id === typeId) || ALL_ITEM_TYPES[0];
  }

  let itemsGenerated = 0;
  const itemsPerType = Math.max(3, Math.floor(actualSpawnCount / itemTypes.length / 3) * 3);

  for (let typeIdx = 0; typeIdx < itemTypes.length && itemsGenerated < actualSpawnCount; typeIdx++) {
    const typeId = itemTypes[typeIdx];
    const itemType = findItemType(typeId);
    const size = getItemSize(typeId);

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

  const largeItems = items.filter(i => i.size === 'large');
  const mediumItems = items.filter(i => i.size === 'medium');
  const smallItems = items.filter(i => i.size === 'small');

  const layerDist = phaseConfig.layerDistribution;
  const totalItems = items.length;

  const bottomCount = Math.floor(totalItems * layerDist.bottom);
  const middleCount = Math.floor(totalItems * layerDist.middle);
  const topCount = totalItems - bottomCount - middleCount;

  const bottomLayer = [];
  const midLayer = [];
  const topLayer = [];

  largeItems.forEach(item => {
    if (bottomLayer.length < bottomCount) {
      bottomLayer.push(item);
    } else if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else {
      topLayer.push(item);
    }
  });

  mediumItems.forEach(item => {
    if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else if (bottomLayer.length < bottomCount) {
      bottomLayer.push(item);
    } else {
      topLayer.push(item);
    }
  });

  smallItems.forEach(item => {
    if (topLayer.length < topCount) {
      topLayer.push(item);
    } else if (midLayer.length < middleCount) {
      midLayer.push(item);
    } else {
      bottomLayer.push(item);
    }
  });

  const shuffledItems = shuffleArray(bottomLayer)
    .concat(shuffleArray(midLayer))
    .concat(shuffleArray(topLayer));

  // 生成位置
  const containerWidth = 300;
  const containerHeight = 300;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const maxRadius = Math.min(containerWidth, containerHeight) / 2 - 25;

  let itemIndex = 0;

  const bottomLayerItems = bottomLayer.length;
  for (let i = 0; i < bottomLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const progress = i / Math.max(bottomLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (1.5 + Math.random());
    const radius = Math.sqrt(progress) * maxRadius * 0.9;

    const randomOffset = 20 * (1 - config.density * 0.3);
    let x = centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * randomOffset;
    let y = centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * randomOffset;

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

  const midLayerItems = midLayer.length;
  for (let i = 0; i < midLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const progress = i / Math.max(midLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (2 + Math.random() * 1.5);
    const radius = Math.sqrt(progress) * maxRadius * 0.75;

    const randomOffset = 15 * (1 - config.density * 0.4);
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

  const topLayerItems = topLayer.length;
  for (let i = 0; i < topLayerItems && itemIndex < shuffledItems.length; i++, itemIndex++) {
    const item = shuffledItems[itemIndex];
    const progress = i / Math.max(topLayerItems - 1, 1);
    const angle = progress * Math.PI * 2 * (2.5 + Math.random() * 2);
    const radius = Math.sqrt(progress) * maxRadius * 0.6;

    const randomOffset = 10 * (1 - config.density * 0.5);
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

  return updateClickable(shuffledItems);
}

// 更新物品的可点击状态
function updateClickable(items) {
  if (items.length === 0) return items;

  const sortedItems = items.slice().sort((a, b) => b.zIndex - a.zIndex);

  const result = items.map(item => ({
    ...item,
    clickable: false
  }));

  for (let i = 0; i < sortedItems.length; i++) {
    const currentItem = sortedItems[i];
    const resultIndex = result.findIndex(r => r.id === currentItem.id);

    let isBlocked = false;
    for (let j = 0; j < i; j++) {
      const higherItem = sortedItems[j];
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

// 检查两个物品是否重叠
function isOverlap(item1, item2) {
  const size = 60;
  const halfSize = size / 2;

  const item1Left = item1.x - halfSize;
  const item1Right = item1.x + halfSize;
  const item1Top = item1.y - halfSize;
  const item1Bottom = item1.y + halfSize;

  const item2Left = item2.x - halfSize;
  const item2Right = item2.x + halfSize;
  const item2Top = item2.y - halfSize;
  const item2Bottom = item2.y + halfSize;

  const overlapLeft = Math.max(item1Left, item2Left);
  const overlapRight = Math.min(item1Right, item2Right);
  const overlapTop = Math.max(item1Top, item2Top);
  const overlapBottom = Math.min(item1Bottom, item2Bottom);

  if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
    return false;
  }

  const overlapWidth = overlapRight - overlapLeft;
  const overlapHeight = overlapBottom - overlapTop;
  const overlapArea = overlapWidth * overlapHeight;
  const item1Area = size * size;
  const overlapRatio = overlapArea / item1Area;

  const hasExposedEdge = checkExposedEdge(item1, item2, size);
  const isFullyBlocked = overlapRatio > 0.8 && !hasExposedEdge;

  return isFullyBlocked;
}

// 检查被遮挡物品是否有边缘露出
function checkExposedEdge(item1, item2, size) {
  const tolerance = 2;
  const halfSize = size / 2;

  const item1Left = item1.x - halfSize;
  const item1Right = item1.x + halfSize;
  const item1Top = item1.y - halfSize;
  const item1Bottom = item1.y + halfSize;

  const item2Left = item2.x - halfSize;
  const item2Right = item2.x + halfSize;
  const item2Top = item2.y - halfSize;
  const item2Bottom = item2.y + halfSize;

  if (item1Left < item2Left - tolerance) return true;
  if (item1Right > item2Right + tolerance) return true;
  if (item1Top < item2Top - tolerance) return true;
  if (item1Bottom > item2Bottom + tolerance) return true;

  if (item1Left < item2Left - tolerance && item1Top < item2Top - tolerance) return true;
  if (item1Right > item2Right + tolerance && item1Top < item2Top - tolerance) return true;
  if (item1Left < item2Left - tolerance && item1Bottom > item2Bottom + tolerance) return true;
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

// 动态推送系统
function generatePushItems(phase, existingItemTypes, count, currentSlotState) {
  const phaseConfig = PHASE_CONFIG[phase];
  const items = [];

  const slotCounts = {};
  for (const typeId in currentSlotState) {
    slotCounts[typeId] = currentSlotState[typeId];
  }

  for (let i = 0; i < count; i++) {
    let typeId;

    if (phase === 'late' && phaseConfig.createOddSlots) {
      typeId = selectItemForOddSlots(existingItemTypes, slotCounts);
    } else if (phase === 'middle' && phaseConfig.buryKeyItems) {
      typeId = selectExistingItemPriority(existingItemTypes, slotCounts);
    } else {
      typeId = selectItemBySizeBias(existingItemTypes, phaseConfig.itemSizeBias);
    }

    const itemType = findItemTypeById(typeId);
    const size = getItemSize(typeId);
    const itemColor = itemType.color || '#CCCCCC';

    items.push({
      id: `push_${typeId}_${i}_${Date.now()}_${Math.random()}`,
      type: typeId,
      name: itemType.name,
      emoji: itemType.emoji,
      color: itemColor,
      size: size,
      sizeConfig: ITEM_SIZE_CONFIG[size],
      isPushed: true
    });
  }

  return items;
}

function selectItemBySizeBias(itemTypes, sizeBias) {
  const rand = Math.random();
  let targetSize;

  if (rand < sizeBias.large) {
    targetSize = 'large';
  } else if (rand < sizeBias.large + sizeBias.medium) {
    targetSize = 'medium';
  } else {
    targetSize = 'small';
  }

  const matchingTypes = itemTypes.filter(id => getItemSize(id) === targetSize);

  if (matchingTypes.length > 0) {
    return matchingTypes[Math.floor(Math.random() * matchingTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

function selectExistingItemPriority(itemTypes, slotCounts) {
  const existingTypes = itemTypes.filter(id => slotCounts[id] && slotCounts[id] > 0);

  if (existingTypes.length > 0 && Math.random() < 0.7) {
    return existingTypes[Math.floor(Math.random() * existingTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

function selectItemForOddSlots(itemTypes, slotCounts) {
  const dangerTypes = [];
  for (const typeId in slotCounts) {
    if (slotCounts[typeId] === 1 || slotCounts[typeId] === 2) {
      dangerTypes.push(typeId);
    }
  }

  if (dangerTypes.length > 0 && Math.random() < 0.5) {
    return dangerTypes[Math.floor(Math.random() * dangerTypes.length)];
  }

  const smallTypes = itemTypes.filter(id => getItemSize(id) === 'small');
  if (smallTypes.length > 0 && Math.random() < 0.6) {
    return smallTypes[Math.floor(Math.random() * smallTypes.length)];
  }

  return itemTypes[Math.floor(Math.random() * itemTypes.length)];
}

function findItemTypeById(typeId) {
  for (const themeKey in ITEM_TYPES) {
    const found = ITEM_TYPES[themeKey].find(t => t.id === typeId);
    if (found) {
      console.log(`[findItemTypeById] 找到 typeId=${typeId}, name=${found.name}, emoji=${found.emoji}`);
      return found;
    }
  }
  const fallback = ALL_ITEM_TYPES.find(t => t.id === typeId) || ALL_ITEM_TYPES[0];
  console.warn(`[findItemTypeById] typeId=${typeId} 未找到，使用 fallback: name=${fallback.name}, emoji=${fallback.emoji}`);
  return fallback;
}

function calculateEliminationProgress(initialCount, currentCount) {
  if (initialCount === 0) return 0;
  return (initialCount - currentCount) / initialCount;
}

function shouldTriggerPush(phase, currentItemCount, threshold) {
  const config = ITEM_COUNT_CONTROL;

  if (currentItemCount < config.minActiveItems) {
    return true;
  }
  if (currentItemCount >= config.maxActiveItems) {
    return false;
  }

  if (phase === 'early') {
    return currentItemCount < config.maxActiveItems;
  } else if (phase === 'middle') {
    return currentItemCount < config.maxActiveItems - 5;
  } else {
    return currentItemCount < config.minActiveItems;
  }
}

function generateItemsFromTop(itemTypes, count, phase, slotState) {
  const phaseConfig = PHASE_CONFIG[phase];
  const items = [];

  const containerWidth = 300;
  const centerX = containerWidth / 2;

  for (let i = 0; i < count; i++) {
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
    const itemColor = itemType.color || '#CCCCCC';

    const spawnX = 30 + Math.random() * (containerWidth - 90);
    const spawnY = ITEM_COUNT_CONTROL.spawnHeight + Math.random() * 30;

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
      zIndex: 2,
      layer: 'top',
      clickable: false,
      isDropped: true,
      initialForce: {
        x: (Math.random() - 0.5) * 0.5,
        y: ITEM_COUNT_CONTROL.spawnVelocity.y + Math.random() * 1
      },
      initialAngularVel: (Math.random() - 0.5) * 0.1
    });
  }

  return items;
}

// 导出模块
const GameLogic = {
  THEMES,
  ITEM_TYPES,
  ALL_ITEM_TYPES,
  ITEM_SIZE_CONFIG,
  ITEM_SIZE_MAPPING,
  PHASE_CONFIG,
  ITEM_COUNT_CONTROL,
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
  selectItemBySizeBias,
  selectItemForOddSlots,
  selectExistingItemPriority,
  findItemTypeById
};

// Web 环境导出
console.log('[gameLogic.js] 开始导出...');
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameLogic;
} else {
  if (typeof window !== 'undefined') {
    window.GameLogic = GameLogic;
    console.log('[gameLogic.js] 导出到 window.GameLogic');
  }
  if (typeof global !== 'undefined') {
    global.GameLogic = GameLogic;
  }
}
console.log('[gameLogic.js] 导出完成');
