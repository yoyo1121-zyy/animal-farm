// 3D 模型配置 - 物品类型到 GLB 模型的映射

// 可用的 GLB 模型列表 (cube-pets 动物模型)
const GLB_MODELS = [
  'animal-beaver',
  'animal-bee',
  'animal-bunny',
  'animal-cat',
  'animal-caterpillar',
  'animal-chick',
  'animal-cow',
  'animal-crab',
  'animal-deer',
  'animal-dog',
  'animal-elephant',
  'animal-fish',
  'animal-fox',
  'animal-giraffe',
  'animal-hog',
  'animal-koala',
  'animal-lion',
  'animal-monkey',
  'animal-panda',
  'animal-parrot',
  'animal-penguin',
  'animal-pig',
  'animal-polar',
  'animal-tiger'
];

// 物品类型到 3D 模型的映射
// 将游戏中的物品类型映射到可用的 GLB 模型
// 每种动物/物品使用对应的3D模型，不再用颜色区分同一类型
const ITEM_TO_MODEL_MAPPING = {
  // 牧场牛羊主题 - 使用对应动物模型
  1: 'animal-cow',           // 奶牛 -> 牛模型
  2: 'animal-hog',           // 绵羊 -> 野猪模型（代替羊）
  3: 'animal-caterpillar',   // 牧草 -> 毛虫模型
  4: 'animal-pig',           // 奶桶 -> 猪模型
  5: 'animal-dog',           // 牧羊犬 -> 狗模型
  6: 'animal-lion',          // 马厩 -> 狮子模型
  7: 'animal-fox',           // 围栏 -> 狐狸模型
  41: 'animal-crab',         // 干草堆 -> 螃蟹模型
  42: 'animal-elephant',     // 水槽 -> 大象模型
  43: 'animal-tiger',        // 牧场大门 -> 老虎模型
  44: 'animal-deer',         // 风车 -> 鹿模型

  // 魔法植物园主题
  9: 'animal-caterpillar',   // 魔法花 -> 毛虫模型
  10: 'animal-bee',          // 发光蘑菇 -> 蜜蜂模型
  11: 'animal-parrot',       // 魔法药水 -> 鹦鹉模型
  12: 'animal-chick',        // 星星草 -> 小鸡模型
  13: 'animal-giraffe',      // 魔法树 -> 长颈鹿模型
  14: 'animal-cat',          // 水晶花 -> 猫模型
  15: 'animal-bunny',        // 魔法扫帚 -> 兔子模型
  16: 'animal-koala',        // 水晶球 -> 考拉模型
  45: 'animal-caterpillar',  // 魔法叶子 -> 毛虫模型
  46: 'animal-bee',          // 萤火虫 -> 蜜蜂模型
  47: 'animal-polar',        // 月亮 -> 北极熊模型
  48: 'animal-panda',        // 魔法书 -> 熊猫模型
  61: 'animal-bunny',        // 魔杖 -> 兔子模型
  62: 'animal-penguin',      // 猫头鹰 -> 企鹅模型
  63: 'animal-chick',        // 精灵 -> 小鸡模型
  64: 'animal-parrot',       // 彩虹 -> 鹦鹉模型
  65: 'animal-caterpillar',  // 四叶草 -> 毛虫模型
  66: 'animal-giraffe',      // 魔法塔 -> 长颈鹿模型
  67: 'animal-bee',          // 魔法蝴蝶 -> 蜜蜂模型
  68: 'animal-deer',         // 古树 -> 鹿模型
  69: 'animal-fox',          // 魔法钥匙 -> 狐狸模型
  70: 'animal-polar',        // 新月 -> 北极熊模型
  71: 'animal-elephant',     // 龙蛋 -> 大象模型
  72: 'animal-parrot',       // 魔法羽毛 -> 鹦鹉模型

  // 田间美食主题
  17: 'animal-bunny',        // 面包 -> 兔子模型
  18: 'animal-chick',        // 鸡蛋 -> 小鸡模型
  19: 'animal-cow',          // 牛奶 -> 奶牛模型
  20: 'animal-pig',          // 奶酪 -> 猪模型
  21: 'animal-caterpillar',  // 苹果 -> 毛虫模型
  22: 'animal-hog',          // 三明治 -> 野猪模型
  23: 'animal-lion',         // 谷仓 -> 狮子模型
  24: 'animal-tiger',        // 鸡舍 -> 老虎模型
  49: 'animal-beaver',       // 牛油果 -> 海狸模型
  50: 'animal-monkey',       // 柠檬 -> 猴子模型
  51: 'animal-pig',          // 蛋糕 -> 猪模型
  52: 'animal-fish',         // 果汁 -> 鱼模型

  // 四季物语主题
  25: 'animal-caterpillar',  // 种子 -> 毛虫模型
  26: 'animal-fish',         // 雨滴 -> 鱼模型
  27: 'animal-penguin',      // 雪花 -> 企鹅模型
  28: 'animal-lion',         // 阳光 -> 狮子模型
  29: 'animal-deer',         // 秋叶 -> 鹿模型
  30: 'animal-caterpillar',  // 花蕾 -> 毛虫模型
  31: 'animal-parrot',       // 彩虹 -> 鹦鹉模型
  32: 'animal-elephant',     // 水井 -> 大象模型
  53: 'animal-bunny',        // 云朵 -> 兔子模型
  54: 'animal-fish',         // 露珠 -> 鱼模型
  55: 'animal-penguin',      // 雪花人 -> 企鹅模型
  56: 'animal-parrot',       // 彩虹桥 -> 鹦鹉模型

  // 花海露营主题
  33: 'animal-pig',          // 帐篷 -> 猪模型
  34: 'animal-fox',          // 营火 -> 狐狸模型
  35: 'animal-caterpillar',  // 花朵 -> 毛虫模型
  36: 'animal-bee',          // 蝴蝶 -> 蜜蜂模型
  37: 'animal-crab',         // 篮子 -> 螃蟹模型
  38: 'animal-deer',         // 望远镜 -> 鹿模型
  39: 'animal-giraffe',      // 筒仓 -> 长颈鹿模型
  40: 'animal-lion',         // 开放谷仓 -> 狮子模型
  57: 'animal-monkey',       // 背包 -> 猴子模型
  58: 'animal-elephant',     // 水壶 -> 大象模型
  59: 'animal-panda',        // 地图 -> 熊猫模型
  60: 'animal-tiger'         // 篝火架 -> 老虎模型
};

// 获取物品类型对应的 GLB 模型路径
function getModelPathForItemType(itemType) {
  const modelName = ITEM_TO_MODEL_MAPPING[itemType] || 'animal-cat';
  return `models/animals/${modelName}.glb`;
}

// 获取物品类型对应的 GLB 模型名称
function getModelNameForItemType(itemType) {
  return ITEM_TO_MODEL_MAPPING[itemType] || 'animal-cat';
}

// 检查模型是否可用
function isModelAvailable(modelName) {
  return GLB_MODELS.includes(modelName);
}

// 获取所有可用模型列表
function getAllAvailableModels() {
  return [...GLB_MODELS];
}

// 获取模型颜色配置
function getModelColor(modelName) {
  const colors = {
    'animal-cow': { color: 0xffffff, name: '奶牛' },
    'animal-pig': { color: 0xffb6c1, name: '猪' },
    'animal-caterpillar': { color: 0x32cd32, name: '毛虫' },
    'animal-dog': { color: 0x8b4513, name: '狗' },
    'animal-lion': { color: 0xffd700, name: '狮子' },
    'animal-fox': { color: 0xff6600, name: '狐狸' },
    'animal-elephant': { color: 0x808080, name: '大象' },
    'animal-deer': { color: 0x8b4513, name: '鹿' },
    'animal-bee': { color: 0xffd700, name: '蜜蜂' },
    'animal-parrot': { color: 0xff4500, name: '鹦鹉' },
    'animal-chick': { color: 0xffff00, name: '小鸡' },
    'animal-giraffe': { color: 0xffd700, name: '长颈鹿' },
    'animal-cat': { color: 0xffa500, name: '猫' },
    'animal-bunny': { color: 0xffffff, name: '兔子' },
    'animal-penguin': { color: 0x333333, name: '企鹅' },
    'animal-panda': { color: 0xffffff, name: '熊猫' },
    'animal-monkey': { color: 0x8b4513, name: '猴子' },
    'animal-fish': { color: 0x00bfff, name: '鱼' },
    'animal-koala': { color: 0x808080, name: '考拉' },
    'animal-tiger': { color: 0xffa500, name: '老虎' },
    'animal-polar': { color: 0xffffff, name: '北极熊' },
    'animal-crab': { color: 0xff4500, name: '螃蟹' },
    'animal-hog': { color: 0x8b4513, name: '野猪' },
    'animal-beaver': { color: 0x8b4513, name: '海狸' }
  };
  return colors[modelName] || { color: 0xffffff, name: '未知' };
}

// 导出模块
const exports = {
  GLB_MODELS,
  ITEM_TO_MODEL_MAPPING,
  getModelPathForItemType,
  getModelNameForItemType,
  isModelAvailable,
  getAllAvailableModels,
  getModelColor
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exports;
} else {
  // 同时将函数直接挂载到导出对象上，以便直接访问
  if (typeof global !== 'undefined') {
    global.ModelConfig3D = exports;
  }
  if (typeof wx !== 'undefined') {
    wx.ModelConfig3D = exports;
  }
}
