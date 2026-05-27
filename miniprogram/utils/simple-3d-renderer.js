// 简化版 3D 模型渲染器 - 使用预览图代替实时 3D 渲染
// 确保在微信小游戏环境中稳定运行

// 加载模型配置
let ModelConfig3D;
try {
  ModelConfig3D = require('./3d-models-config.js');
} catch (e) {
  console.warn('3d-models-config not found:', e);
}

class Simple3DRenderer {
  constructor() {
    this.renderedItems = new Map(); // 缓存预渲染的图片
    this.imageCache = new Map(); // 缓存加载的图片
    this.isInitialized = false;
    this.isLoading = false;
  }

  /**
   * 初始化
   */
  async init() {
    if (this.isLoading) return false;
    this.isLoading = true;

    try {
      // 预加载所有模型预览图
      await this.preloadModelImages();
      this.isInitialized = true;
      console.log('Simple3DRenderer initialized with preview images');
      return true;
    } catch (e) {
      console.error('Simple3DRenderer init failed:', e);
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 预加载所有模型预览图
   */
  async preloadModelImages() {
    const modelNames = [
      'animal-beaver', 'animal-bee', 'animal-bunny', 'animal-cat',
      'animal-caterpillar', 'animal-chick', 'animal-cow', 'animal-crab',
      'animal-deer', 'animal-dog', 'animal-elephant', 'animal-fish',
      'animal-fox', 'animal-giraffe', 'animal-hog', 'animal-koala',
      'animal-lion', 'animal-monkey', 'animal-panda', 'animal-parrot',
      'animal-penguin', 'animal-pig', 'animal-polar', 'animal-tiger'
    ];

    const loadPromises = modelNames.map(modelName => {
      return new Promise((resolve) => {
        if (typeof wx !== 'undefined' && wx.createImage) {
          const img = wx.createImage();

          // 尝试多种可能的路径格式
          const possiblePaths = [
            `images/models/${modelName}.png`,
            `../images/models/${modelName}.png`,
            `../../images/models/${modelName}.png`,
            `miniprogram/images/models/${modelName}.png`,
            `/images/models/${modelName}.png`
          ];

          let pathIndex = 0;

          const tryLoadImage = () => {
            if (pathIndex >= possiblePaths.length) {
              console.log(`[Simple3DRenderer] 所有路径都失败: ${modelName}`);
              resolve(null);
              return;
            }

            img.src = possiblePaths[pathIndex];
            console.log(`[Simple3DRenderer] 尝试加载 ${pathIndex + 1}/${possiblePaths.length}:`, img.src);
          };

          img.onload = () => {
            console.log(`[Simple3DRenderer] 成功加载: ${modelName}`);
            this.imageCache.set(modelName, img);
            resolve(modelName);
          };

          img.onerror = () => {
            console.log(`[Simple3DRenderer] 路径失败: ${possiblePaths[pathIndex]}`);
            pathIndex++;
            tryLoadImage();
          };

          // 开始尝试第一个路径
          tryLoadImage();
        } else {
          resolve(null);
        }
      });
    });

    const results = await Promise.all(loadPromises);
    const successCount = results.filter(r => r !== null).length;
    console.log(`预加载了 ${successCount}/${modelNames.length} 个模型预览图`);
  }

  /**
   * 获取物品的预渲染图片
   * @param {Object} itemData - {type, color, emoji}
   * @returns {Promise<Object>} {canvas, rotation} 预渲染的 Canvas 和旋转角度
   */
  async getItemImage(itemData) {
    if (!this.isInitialized) {
      console.log('[Simple3DRenderer] 未初始化，开始初始化...');
      const initSuccess = await this.init();
      if (!initSuccess) {
        console.warn('[Simple3DRenderer] 初始化失败');
        return null;
      }
    }

    console.log('[Simple3DRenderer] getItemImage 被调用:', itemData.type, itemData.color);

    // 获取模型名称
    let modelName = null;
    if (ModelConfig3D) {
      modelName = ModelConfig3D.getModelNameForItemType(itemData.type);
    }

    if (!modelName) {
      console.warn('[Simple3DRenderer] 无法找到模型名称');
      return null;
    }

    console.log('[Simple3DRenderer] 模型名称:', modelName);

    // 检查缓存
    const cacheKey = `${itemData.type}_${itemData.color}`;
    let cached = this.renderedItems.get(cacheKey);
    if (cached) {
      console.log('[Simple3DRenderer] 使用缓存的渲染结果');
      return cached;
    }

    // 获取模型预览图
    const modelImage = this.imageCache.get(modelName);
    console.log('[Simple3DRenderer] 模型图片是否存在:', !!modelImage, modelImage && modelImage.complete);

    // 创建渲染结果
    let canvas;
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
      canvas = wx.createOffscreenCanvas({
        type: '2d',
        width: 128,
        height: 128
      });
    } else if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
    } else {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 清空画布
    ctx.clearRect(0, 0, 128, 128);

    if (modelImage && modelImage.complete && modelImage.width > 0) {
      console.log('[Simple3DRenderer] 绘制模型预览图');
      // 绘制模型预览图
      const size = 110;
      const x = (128 - size) / 2;
      const y = (128 - size) / 2;

      // 添加阴影效果
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      try {
        ctx.drawImage(modelImage, x, y, size, size);
        console.log('[Simple3DRenderer] 模型图片绘制成功');
      } catch (e) {
        console.error('[Simple3DRenderer] 模型图片绘制失败:', e);
        this.drawEmojiFallback(ctx, itemData.emoji || '?');
      }

      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 添加边框高光
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.stroke();

    } else {
      console.warn('[Simple3DRenderer] 模型图片不可用，使用emoji后备');
      // 使用 emoji 后备
      this.drawEmojiFallback(ctx, itemData.emoji || '?');
    }

    // 随机旋转角度
    const rotY = Math.random() * Math.PI * 2;

    const result = {
      canvas: canvas,
      rotation: { x: 0, y: rotY, z: 0 }
    };

    // 缓存结果
    this.renderedItems.set(cacheKey, result);
    console.log('[Simple3DRenderer] 渲染完成并缓存:', cacheKey);

    return result;
  }

  /**
   * 绘制 emoji 后备方案
   */
  drawEmojiFallback(ctx, emoji) {
    // 绘制背景圆形
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(64, 64, 55, 0, Math.PI * 2);
    ctx.fill();

    // 绘制 emoji
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 70px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.renderedItems.clear();
  }

  /**
   * 销毁
   */
  dispose() {
    this.renderedItems.clear();
    this.imageCache.clear();
    this.isInitialized = false;
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Simple3DRenderer;
} else {
  if (typeof global !== 'undefined') {
    global.Simple3DRenderer = Simple3DRenderer;
  }
  if (typeof wx !== 'undefined') {
    wx.Simple3DRenderer = Simple3DRenderer;
  }
}

export default Simple3DRenderer;
