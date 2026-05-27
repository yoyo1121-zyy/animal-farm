// 抓大鹅小游戏 - 主游戏类

// 微信小游戏模块加载兼容处理
function loadModule(moduleName, globalName) {
  try {
    const module = require(moduleName);
    if (module) return module;
  } catch (e) {
    console.warn(`require ${moduleName} 失败:`, e);
  }
  // 尝试从全局获取
  if (typeof wx !== 'undefined' && wx[globalName]) {
    return wx[globalName];
  }
  if (typeof global !== 'undefined' && global[globalName]) {
    return global[globalName];
  }
  console.error(`无法加载模块: ${moduleName}`);
  return null;
}

const AudioMgr = loadModule('./audioManager.js', 'AudioManager');
const GameLogic = loadModule('./gameLogic.js', 'GameLogic');
const PhysicsManager = loadModule('../utils/physics-manager.js', 'PhysicsManager');
const FrameAnimation = loadModule('./frame-animation.js', 'FrameAnimation');

// 加载 3D 渲染器
let Scene3D = null;
let ThreeScene = null;
let Simple3DRenderer = null;

// 优先尝试加载 Scene3D (Three.js + Cannon.js 完整3D方案)
try {
  Scene3D = loadModule('../utils/scene-3d.js', 'Scene3D');
  if (Scene3D) {
    console.log('Scene3D (Three.js + Cannon.js) loaded successfully');
  }
} catch (e) {
  console.warn('Scene3D not available:', e);
}

// 备用：尝试加载 ThreeScene (预渲染3D模型)
if (!Scene3D) {
  try {
    ThreeScene = loadModule('../utils/three-scene.js', 'ThreeScene');
    if (ThreeScene) {
      console.log('ThreeScene loaded successfully');
    }
  } catch (e) {
    console.warn('ThreeScene not available:', e);
  }
}

// 如果 ThreeScene 不可用，尝试使用 Simple3DRenderer (PNG预览图)
if (!Scene3D && !ThreeScene) {
  try {
    Simple3DRenderer = loadModule('../utils/simple-3d-renderer.js', 'Simple3DRenderer');
    if (Simple3DRenderer) {
      console.log('Simple3DRenderer loaded successfully');
    }
  } catch (e) {
    console.warn('Simple3DRenderer not available:', e);
  }
}

// ========== 纪念碑谷风格配色方案 ==========
const MONUMENT_COLORS = {
  // 主色调 - 柔和渐变
  primary: ['#FF9A8B', '#FF6A88'],      // 粉红到珊瑚橙
  secondary: ['#A8EDEA', '#FED6E3'],    // 青色到粉色
  accent: ['#FFD89B', '#19547B'],      // 金黄到深蓝

  // 纪念碑谷特色色
  monumentPink: '#FF6B9D',              // 标志性粉红
  monumentCoral: '#FF8A71',             // 珊瑚橙
  monumentTeal: '#4ECDC4',              // 青色
  monumentPurple: '#A8D8EA',            // 淡紫
  monumentGold: '#FFE66D',              // 金黄
  monumentRose: '#FFB6B9',              // 玫瑰粉

  // 背景色
  bgLight: '#FFF5F7',                   // 浅粉背景
  bgDark: '#2C3E50',                    // 深蓝灰
  bgCream: '#FDF6E3',                   // 奶油色

  // 按钮渐变
  buttonGradient: ['#FF9A9E', '#FECFEF'], // 粉色渐变
  buttonActive: ['#FF6B95', '#C06C84'],   // 深粉渐变
  buttonTeal: ['#4ECDC4', '#44A08D'],     // 青色渐变

  // 关卡颜色
  levelLocked: '#E8E8E8',                // 未解锁浅灰
  levelUnlocked: ['#FFB6B9', '#FAE3D9'], // 已解锁粉橙
  levelCurrent: ['#FFE66D', '#FF6B9D'],  // 当前关卡金黄到粉红

  // 边框颜色
  borderLight: '#FFE5E8',                // 浅粉边框
  borderDark: '#C9A9A6',                 // 深粉边框
  borderGold: '#D4A574',                 // 金色边框
  borderTeal: '#4ECDC4',                 // 青色边框

  // 阴影
  shadowSoft: 'rgba(255, 107, 157, 0.12)',  // 柔和粉红阴影
  shadowMedium: 'rgba(255, 107, 157, 0.2)',
  shadowStrong: 'rgba(199, 169, 166, 0.35)',

  // 建筑风格装饰色
  architectureLight: '#F8F9FA',          // 建筑亮面
  architectureDark: '#495057',           // 建筑暗面
  architectureAccent: '#FF6B9D'          // 建筑强调色
};

class Game {
  constructor() {
    console.log('Game constructor');

    // 适配屏幕
    const systemInfo = wx.getSystemInfoSync();
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.dpr = systemInfo.pixelRatio || 1;
    console.log('Device pixel ratio:', this.dpr, 'Screen size:', this.width, 'x', this.height);

    // ========== 双 Canvas 系统 ==========
    // 首页使用 2D canvas，游戏场景使用 WebGL canvas + UI canvas

    // 1. 创建 2D canvas（首页用）
    this.canvas2D = wx.createCanvas();
    this.canvas2D.width = this.width * this.dpr;
    this.canvas2D.height = this.height * this.dpr;
    this.ctx = this.canvas2D.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);

    // 2. 创建 WebGL canvas（游戏场景用 - 3D模型）
    this.canvas3D = wx.createCanvas({ type: 'webgl' });
    this.canvas3D.width = this.width * this.dpr;
    this.canvas3D.height = this.height * this.dpr;

    // 3. 创建 UI canvas（游戏场景用 - UI覆盖层）
    this.canvasUI = wx.createCanvas();
    this.canvasUI.width = this.width * this.dpr;
    this.canvasUI.height = this.height * this.dpr;
    this.ctxUI = this.canvasUI.getContext('2d');
    this.ctxUI.scale(this.dpr, this.dpr);

    // 4. 设置主 canvas（首页用 2D，游戏场景用 3D）
    this.canvas = this.canvas2D;
    this.currentCanvasType = '2D'; // '2D' or '3D'

    console.log('三 Canvas 系统初始化完成（2D首页 + 3D游戏 + UI覆盖）');

    // 屏幕适配
    this.scaleRatio = Math.min(this.width / 375, this.height / 667);

    // ========== 初始化纪念碑谷风格配色 ==========
    this.monumentColors = MONUMENT_COLORS;

    // 游戏状态
    this.scene = 'home';

    // 游戏数据
    this.currentLevel = 1;
    this.maxLevel = 1;
    this.highScore = 0;

    // 加载保存的数据
    this.loadGameData();

    // 初始化音频管理器
    this.audioManager = new AudioMgr();

    // 陀螺仪/颠勺相关
    this.shakeEnabled = true;
    this.lastShakeTime = 0;
    this.shakeCooldown = 1000; // 颠勺冷却时间（毫秒）
    this.shakeThreshold = 30; // 摇晃阈值
    this.lastAcceleration = { x: 0, y: 0, z: 0 };

    // 启动陀螺仪监听
    this.startDeviceMotionListening();

    // 图片资源
    this.images = {};
    this.imagesLoaded = false;

    // 加载图片
    this.loadImages();

    // ========== 帧序列动画背景 + 音频 ==========
    this.frameAnimation = new FrameAnimation();
    // 帧序列路径：images/bg/frame_001.png, frame_002.png, ... (三位数编号)
    const framePattern = 'images/bg/frame_{n:03d}.png';
    const frameCount = 119; // 总帧数
    const audioPath = 'images/animal-farm.mp3';
    this.frameAnimation.init(framePattern, frameCount, 100, audioPath, 0.3, 1); // 100ms每帧，音量30%，起始帧编号为1

    // 游戏数据
    this.gameData = null;

    // 触摸状态
    this.lastTouchTime = 0;
    this.currentTouchX = null;
    this.currentTouchY = null;
    this.hoveredItem = null;
    this.touchStartTime = 0; // 触摸开始时间（用于长按检测）
    this.touchStartPos = null; // 触摸开始位置
    this.longPressThreshold = 500; // 长按阈值（毫秒）
    this.isLongPress = false; // 是否是长按
    this.lockedHoverItem = null; // 触摸锁定的物品（从触摸开始到结束保持不变）
    this.touchedArea = null; // 记录触摸区域类型：'game', 'storage', 'prop', 'back', null

    // 动画系统
    this.animations = []; // 存储所有进行中的动画
    this.lastAnimationTime = Date.now();

    // 物理引擎
    this.physicsManager = null;
    this.physicsEnabled = true; // 启用物理引擎（用于颠勺效果和物品堆叠）

    // ========== 添加切换 Canvas 函数 ==========
    this.switchCanvas = (type) => {
      console.log('[switchCanvas] 从', this.currentCanvasType, '切换到', type);

      if (type === '2D') {
        // 切换到 2D canvas（首页）
        this.canvas = this.canvas2D;
        this.ctx = this.canvas2D.getContext('2d');
        this.ctx.scale(this.dpr, this.dpr);
        this.currentCanvasType = '2D';
      } else if (type === '3D') {
        // 切换到 WebGL canvas（游戏场景）
        this.canvas = this.canvas3D;
        this.ctx = null; // WebGL 模式不需要 2D 上下文
        // UI canvas 保持激活用于绘制 UI
        this.currentCanvasType = '3D';
      }
    };

    // ========== 3D 场景管理器 ==========
    this.threeScene = null;
    this.use3DModels = true; // 启用 3D 模型渲染
    // 初始化 3D 场景（传入 WebGL canvas）
    this.init3DScene().catch(err => console.error('3D init error:', err));

    // 开始渲染循环
    this.render();

    console.log('Game initialized, canvas size:', this.width, this.height);
  }

  // 颜色辅助函数 - 调亮颜色
  lightenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  // 颜色辅助函数 - 调暗颜色
  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 + (B > 0 ? B : 0)).toString(16).slice(1);
  }

  // 颜色辅助函数 - 将十六进制转换为rgba
  hexToRgba(hex, alpha = 1) {
    const num = parseInt(hex.replace('#', ''), 16);
    const R = (num >> 16) & 0xFF;
    const G = (num >> 8 & 0x00FF) & 0xFF;
    const B = num & 0x0000FF;
    return `rgba(${R}, ${G}, ${B}, ${alpha})`;
  }

  // ========== 颜色标准化函数 - 修复颜色比较问题 ==========
  /**
   * 标准化颜色值，确保颜色比较的一致性
   * - 统一转为大写
   * - 移除空格
   * - 确保 # 开头
   * - 6位十六进制格式（支持3位简写转换）
   */
  normalizeColor(color) {
    if (!color || typeof color !== 'string') return '#CCCCCC';
    let normalized = color.trim().toUpperCase();
    if (!normalized.startsWith('#')) {
      normalized = '#' + normalized;
    }
    // 支持3位简写转6位 (如 #FFF -> #FFFFFF)
    if (normalized.length === 4) {
      normalized = '#' + normalized[1] + normalized[1] +
                   normalized[2] + normalized[2] +
                   normalized[3] + normalized[3];
    }
    return normalized;
  }

  /**
   * 比较两个颜色是否相同（使用标准化后的值）
   */
  isSameColor(color1, color2) {
    return this.normalizeColor(color1) === this.normalizeColor(color2);
  }

  // ========== 纪念碑谷风格绘制方法 ==========

  /**
   * 绘制纪念碑谷风格的圆角矩形
   */
  drawMonumentRect(x, y, width, height, radius = 12) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  /**
   * 绘制纪念碑谷风格的按钮
   */
  drawMonumentButton(x, y, width, height, text, isActive = true) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;

    // 柔和阴影
    ctx.fillStyle = colors.shadowSoft;
    this.drawMonumentRect(x + 4, y + 6, width, height, 16);
    ctx.fill();

    // 主体渐变
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    if (isActive) {
      gradient.addColorStop(0, colors.buttonGradient[0]);
      gradient.addColorStop(1, colors.buttonGradient[1]);
    } else {
      gradient.addColorStop(0, '#E0E0E0');
      gradient.addColorStop(1, '#BDBDBD');
    }
    ctx.fillStyle = gradient;
    this.drawMonumentRect(x, y, width, height, 16);
    ctx.fill();

    // 内边框
    ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 3, y + 3, width - 6, height - 6, 14);
    ctx.stroke();

    // 外边框
    ctx.strokeStyle = isActive ? colors.borderDark : '#999999';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x, y, width, height, 16);
    ctx.stroke();

    // 文字
    ctx.fillStyle = isActive ? '#FFFFFF' : '#999999';
    ctx.font = `bold ${20 * this.scaleRatio}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
  }

  /**
   * 绘制纪念碑谷风格的关卡框
   */
  drawMonumentLevelBox(x, y, size, level, isUnlocked, isCurrent) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const themeColors = this.getThemeColors(level);

    // ========== 多层阴影效果 ==========
    for (let i = 4; i >= 1; i--) {
      const shadowColor = isUnlocked ?
        `rgba(255, 107, 157, ${0.1 * i})` :
        `rgba(150, 150, 150, ${0.08 * i})`;
      ctx.fillStyle = shadowColor;
      this.drawMonumentRect(x + i * 2, y + i * 2, size, size, 12);
      ctx.fill();
    }

    // ========== 背景渐变 ==========
    if (isCurrent) {
      const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
      gradient.addColorStop(0, colors.monumentGold);
      gradient.addColorStop(0.5, colors.monumentPink);
      gradient.addColorStop(1, colors.monumentCoral);
      ctx.fillStyle = gradient;
    } else if (isUnlocked) {
      const gradient = ctx.createLinearGradient(x, y, x, y + size);
      gradient.addColorStop(0, themeColors.primary);
      gradient.addColorStop(1, themeColors.secondary);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = '#E8E8E8';
    }
    this.drawMonumentRect(x, y, size, size, 12);
    ctx.fill();

    // ========== 顶部高光面 ==========
    if (isUnlocked) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + size - 12, y);
      ctx.lineTo(x + size - 12, y + 6);
      ctx.lineTo(x + 12, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // ========== 内边框高光 ==========
    ctx.strokeStyle = isUnlocked ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 3, y + 3, size - 6, size - 6, 10);
    ctx.stroke();

    // ========== 外边框 ==========
    if (isCurrent) {
      ctx.strokeStyle = colors.borderGold;
      ctx.lineWidth = 3;
    } else if (isUnlocked) {
      ctx.strokeStyle = this.darkenColor(themeColors.accent, 20);
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#C0C0C0';
      ctx.lineWidth = 2;
    }
    this.drawMonumentRect(x, y, size, size, 12);
    ctx.stroke();

    // ========== 角落装饰 ==========
    if (isUnlocked) {
      const diamondSize = 4;
      const cornerOffset = 8;
      ctx.fillStyle = isCurrent ? colors.monumentGold : themeColors.decor;
      ctx.globalAlpha = 0.7;
      this.drawDiamond(x + cornerOffset, y + cornerOffset, diamondSize);
      this.drawDiamond(x + size - cornerOffset, y + cornerOffset, diamondSize);
      this.drawDiamond(x + cornerOffset, y + size - cornerOffset, diamondSize);
      this.drawDiamond(x + size - cornerOffset, y + size - cornerOffset, diamondSize);
      ctx.globalAlpha = 1;
    }

    // ========== 当前关卡的星形装饰 ==========
    if (isCurrent) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      const centerX = x + size / 2;
      const centerY = y + size / 2;
      const starRadius = size * 0.15;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? starRadius : starRadius * 0.4;
        const px = centerX + Math.cos(angle) * r;
        const py = centerY + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // ========== 关卡数字 ==========
    ctx.fillStyle = isUnlocked ? '#FFFFFF' : '#AAAAAA';
    ctx.font = `bold ${24 * this.scaleRatio}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (isUnlocked) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
    }

    ctx.fillText(level, x + size / 2, y + size / 2);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * 绘制角落装饰（纪念碑谷建筑风格）
   */
  drawCornerDecorations(x, y, size, color) {
    const ctx = this.ctx;
    const cornerSize = 4;
    const offset = 6;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6;

    // 左上角
    ctx.fillRect(x + offset, y + offset, cornerSize, cornerSize);
    // 右上角
    ctx.fillRect(x + size - offset - cornerSize, y + offset, cornerSize, cornerSize);
    // 左下角
    ctx.fillRect(x + offset, y + size - offset - cornerSize, cornerSize, cornerSize);
    // 右下角
    ctx.fillRect(x + size - offset - cornerSize, y + size - offset - cornerSize, cornerSize, cornerSize);

    ctx.globalAlpha = 1;
  }

  /**
   * 绘制纪念碑谷风格的立体边框（等轴测建筑风格）
   */
  drawMonumentBorder(x, y, width, height, radius = 10, style = 'pink') {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;

    // 根据风格选择颜色
    let primaryColor, secondaryColor, shadowColor;
    switch (style) {
      case 'teal':
        primaryColor = colors.monumentTeal;
        secondaryColor = '#44A08D';
        shadowColor = 'rgba(78, 205, 196, 0.2)';
        break;
      case 'gold':
        primaryColor = colors.monumentGold;
        secondaryColor = '#F4C430';
        shadowColor = 'rgba(255, 230, 109, 0.2)';
        break;
      case 'purple':
        primaryColor = colors.monumentPurple;
        secondaryColor = '#9B89B3';
        shadowColor = 'rgba(168, 216, 234, 0.2)';
        break;
      default: // pink
        primaryColor = colors.monumentPink;
        secondaryColor = colors.monumentCoral;
        shadowColor = 'rgba(255, 107, 157, 0.2)';
    }

    // 多层阴影
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = shadowColor;
      this.drawMonumentRect(x + i * 3, y + i * 3, width, height, radius);
      ctx.fill();
    }

    // 主体渐变
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(0.5, secondaryColor);
    gradient.addColorStop(1, this.darkenColor(secondaryColor, 10));
    ctx.fillStyle = gradient;
    this.drawMonumentRect(x, y, width, height, radius);
    ctx.fill();

    // 顶部高光面（等轴测效果）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.lineTo(x + width - radius, y + radius * 0.6);
    ctx.lineTo(x + radius, y + radius * 0.6);
    ctx.closePath();
    ctx.fill();

    // 右侧阴影面
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x + width - radius * 0.6, y + radius);
    ctx.lineTo(x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.lineTo(x + width - radius * 0.6, y + height - radius);
    ctx.closePath();
    ctx.fill();

    // 内边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 3, y + 3, width - 6, height - 6, radius - 2);
    ctx.stroke();

    // 外边框
    ctx.strokeStyle = this.darkenColor(secondaryColor, 20);
    ctx.lineWidth = 2;
    this.drawMonumentRect(x, y, width, height, radius);
    ctx.stroke();

    // 装饰性线条
    this.drawMonumentPattern(x, y, width, height, radius);
  }

  /**
   * 绘制纪念碑谷风格的装饰图案
   */
  drawMonumentPattern(x, y, width, height, radius) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // 顶部装饰线
    const decorY = y + radius * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + radius + 8, decorY);
    ctx.lineTo(x + width - radius - 8, decorY);
    ctx.stroke();

    // 底部装饰线
    const decorY2 = y + height - radius * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + radius + 8, decorY2);
    ctx.lineTo(x + width - radius - 8, decorY2);
    ctx.stroke();
  }

  /**
   * 绘制纪念碑谷风格的圆形边框（用于返回按钮等）- 增强版
   */
  drawMonumentCircleBorder(x, y, radius, style = 'pink') {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const themeColors = this.getThemeColors();

    let primaryColor, shadowColor;
    // 检查 style 是否是颜色值（以#开头）
    if (typeof style === 'string' && style.startsWith('#')) {
      primaryColor = style;
      shadowColor = this.hexToRgba(primaryColor, 0.3);
    } else {
      switch (style) {
        case 'teal':
          primaryColor = colors.monumentTeal;
          shadowColor = 'rgba(78, 205, 196, 0.3)';
          break;
        case 'gold':
          primaryColor = colors.monumentGold;
          shadowColor = 'rgba(255, 230, 109, 0.3)';
          break;
        default:
          primaryColor = themeColors.accent; // 使用主题色
          shadowColor = `rgba(255, 107, 157, 0.3)`;
      }
    }

    // ========== 多层阴影 ==========
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = shadowColor;
      ctx.globalAlpha = 0.3 * i / 3;
      ctx.beginPath();
      ctx.arc(x + i * 1.5, y + i * 1.5, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ========== 主体渐变 ==========
    const gradient = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, 0, x, y, radius);
    gradient.addColorStop(0, this.lightenColor(primaryColor, 25));
    gradient.addColorStop(0.6, primaryColor);
    gradient.addColorStop(1, this.darkenColor(primaryColor, 10));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // ========== 高光（左上角）==========
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // ========== 阴影（右下角）==========
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.arc(x + radius * 0.3, y + radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // ========== 外边框 ==========
    ctx.strokeStyle = this.darkenColor(primaryColor, 20);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // ========== 内边框 ==========
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius - 3, 0, Math.PI * 2);
    ctx.stroke();

    // ========== 装饰环 ==========
    ctx.strokeStyle = themeColors.decor;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, radius - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /**
   * 绘制纪念碑谷风格的收集栏（带主题装饰）
   */
  drawMonumentCollectionBar(x, y, width, height) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const themeColors = this.getThemeColors();

    // ========== 多层阴影（立体效果）==========
    for (let i = 4; i >= 1; i--) {
      ctx.fillStyle = `rgba(78, 205, 196, ${0.08 * i})`;
      this.drawMonumentRect(x + i * 2, y + i * 2, width, height, 14);
      ctx.fill();
    }

    // ========== 主体渐变（青色系，与游戏区域呼应）==========
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, this.lightenColor(colors.monumentTeal, 15));
    gradient.addColorStop(0.3, colors.monumentTeal);
    gradient.addColorStop(0.7, '#44A08D');
    gradient.addColorStop(1, this.darkenColor('#44A08D', 10));
    ctx.fillStyle = gradient;
    this.drawMonumentRect(x, y, width, height, 14);
    ctx.fill();

    // ========== 顶部高光面（等轴测效果）==========
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.lineTo(x + width - 14, y);
    ctx.lineTo(x + width - 14, y + 8);
    ctx.lineTo(x + 14, y + 8);
    ctx.closePath();
    ctx.fill();

    // ========== 侧面阴影效果 ==========
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x + width - 8, y + 14);
    ctx.lineTo(x + width, y + 14);
    ctx.lineTo(x + width, y + height - 14);
    ctx.lineTo(x + width - 8, y + height - 14);
    ctx.closePath();
    ctx.fill();

    // ========== 内边框（高光）==========
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 4, y + 4, width - 8, height - 8, 12);
    ctx.stroke();

    // ========== 外边框（深色）==========
    ctx.strokeStyle = this.darkenColor(colors.monumentTeal, 25);
    ctx.lineWidth = 2.5;
    this.drawMonumentRect(x, y, width, height, 14);
    ctx.stroke();

    // ========== 装饰元素 ==========
    // 左侧装饰条（主题色）
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.5;
    this.roundRect(x + 8, y + height - 18, 4, 10, 2);
    ctx.fill();

    // 右侧装饰条
    this.roundRect(x + width - 12, y + height - 18, 4, 10, 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // ========== 顶部装饰点 ==========
    const dotCount = 7;
    const dotSpacing = width / dotCount;
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < dotCount; i++) {
      const dotX = x + dotSpacing / 2 + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, y + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * 绘制纪念碑谷风格的收集栏（带主题装饰，使用指定主题色）
   */
  drawMonumentCollectionBarThemed(x, y, width, height, themeColors) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;

    // ========== 多层阴影（立体效果，使用主题色）==========
    for (let i = 4; i >= 1; i--) {
      ctx.fillStyle = themeColors.shadow;
      ctx.globalAlpha = 0.15 * i / 4;
      this.drawMonumentRect(x + i * 2, y + i * 2, width, height, 14);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ========== 主体渐变（使用主题色）==========
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, this.lightenColor(themeColors.primary, 15));
    gradient.addColorStop(0.3, themeColors.primary);
    gradient.addColorStop(0.7, themeColors.secondary);
    gradient.addColorStop(1, this.darkenColor(themeColors.secondary, 10));
    ctx.fillStyle = gradient;
    this.drawMonumentRect(x, y, width, height, 14);
    ctx.fill();

    // ========== 顶部高光面（等轴测效果）==========
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.lineTo(x + width - 14, y);
    ctx.lineTo(x + width - 14, y + 8);
    ctx.lineTo(x + 14, y + 8);
    ctx.closePath();
    ctx.fill();

    // ========== 侧面阴影效果 ==========
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x + width - 8, y + 14);
    ctx.lineTo(x + width, y + 14);
    ctx.lineTo(x + width, y + height - 14);
    ctx.lineTo(x + width - 8, y + height - 14);
    ctx.closePath();
    ctx.fill();

    // ========== 内边框（高光）==========
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 4, y + 4, width - 8, height - 8, 12);
    ctx.stroke();

    // ========== 外边框（深色，使用主题色）==========
    ctx.strokeStyle = this.darkenColor(themeColors.accent, 25);
    ctx.lineWidth = 2.5;
    this.drawMonumentRect(x, y, width, height, 14);
    ctx.stroke();

    // ========== 装饰元素 ==========
    // 左侧装饰条（主题色装饰）
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.5;
    this.roundRect(x + 8, y + height - 18, 4, 10, 2);
    ctx.fill();

    // 右侧装饰条
    this.roundRect(x + width - 12, y + height - 18, 4, 10, 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    // ========== 顶部装饰点 ==========
    const dotCount = 7;
    const dotSpacing = width / dotCount;
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i < dotCount; i++) {
      const dotX = x + dotSpacing / 2 + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, y + 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * 绘制纪念碑谷风格的道具按钮
   */
  drawMonumentPropButton(x, y, width, height, isActive, propType) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const themeColors = this.getThemeColors();

    // 根据道具类型选择颜色
    let style = 'pink';
    if (propType === 'shuffle') style = 'teal';
    if (propType === 'complete') style = 'gold';

    let primaryColor, shadowColor, glowColor;
    switch (style) {
      case 'teal':
        primaryColor = colors.monumentTeal;
        shadowColor = 'rgba(78, 205, 196, 0.3)';
        glowColor = 'rgba(78, 205, 196, 0.4)';
        break;
      case 'gold':
        primaryColor = colors.monumentGold;
        shadowColor = 'rgba(255, 230, 109, 0.3)';
        glowColor = 'rgba(255, 230, 109, 0.4)';
        break;
      case 'purple':
        primaryColor = colors.monumentPurple;
        shadowColor = 'rgba(168, 216, 234, 0.3)';
        glowColor = 'rgba(168, 216, 234, 0.4)';
        break;
      default:
        primaryColor = colors.monumentPink;
        shadowColor = 'rgba(255, 107, 157, 0.3)';
        glowColor = 'rgba(255, 107, 157, 0.4)';
    }

    // 多层阴影（立体效果）
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = isActive ? shadowColor : 'rgba(150, 150, 150, 0.15)';
      this.drawMonumentRect(x + i * 2, y + i * 2, width, height, 10);
      ctx.fill();
    }

    // 主体渐变
    if (isActive) {
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, this.lightenColor(primaryColor, 20));
      gradient.addColorStop(0.5, primaryColor);
      gradient.addColorStop(1, this.darkenColor(primaryColor, 10));
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = '#D8D8D8';
    }
    this.drawMonumentRect(x, y, width, height, 10);
    ctx.fill();

    // 顶部高光面
    if (isActive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(x + 10, y);
      ctx.lineTo(x + width - 10, y);
      ctx.lineTo(x + width - 10, y + 6);
      ctx.lineTo(x + 10, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // 侧面阴影
    if (isActive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.beginPath();
      ctx.moveTo(x + width - 6, y + 10);
      ctx.lineTo(x + width, y + 10);
      ctx.lineTo(x + width, y + height - 10);
      ctx.lineTo(x + width - 6, y + height - 10);
      ctx.closePath();
      ctx.fill();
    }

    // 内边框
    ctx.strokeStyle = isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 3, y + 3, width - 6, height - 6, 8);
    ctx.stroke();

    // 外边框
    ctx.strokeStyle = isActive ? this.darkenColor(primaryColor, 20) : '#AAAAAA';
    ctx.lineWidth = 2;
    this.drawMonumentRect(x, y, width, height, 10);
    ctx.stroke();

    // 激活状态的光晕效果
    if (isActive) {
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      this.drawMonumentRect(x - 2, y - 2, width + 4, height + 4, 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 中心装饰点
    if (isActive) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.arc(x + width / 2, y + 8, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * 绘制纪念碑谷风格的统计信息框（增强版）
   */
  drawMonumentStatsBox(x, y, width, height) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const themeColors = this.getThemeColors();

    // ========== 多层阴影 ==========
    for (let i = 3; i >= 1; i--) {
      ctx.fillStyle = `rgba(255, 107, 157, ${0.08 * i})`;
      this.drawMonumentRect(x + i * 2, y + i * 2, width, height, 10);
      ctx.fill();
    }

    // ========== 背景（半透明白，带渐变）==========
    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
    bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    bgGradient.addColorStop(1, 'rgba(255, 245, 247, 0.92)');
    ctx.fillStyle = bgGradient;
    this.drawMonumentRect(x, y, width, height, 10);
    ctx.fill();

    // ========== 边框（主题色）==========
    ctx.strokeStyle = themeColors.primary;
    ctx.lineWidth = 2.5;
    this.drawMonumentRect(x, y, width, height, 10);
    ctx.stroke();

    // ========== 内边框（金色装饰）==========
    ctx.strokeStyle = themeColors.decor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    this.drawMonumentRect(x + 3, y + 3, width - 6, height - 6, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ========== 四角装饰（菱形）==========
    const diamondSize = 5;
    const cornerOffset = 12;
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.6;

    // 左上菱形
    this.drawDiamond(x + cornerOffset, y + cornerOffset, diamondSize);
    // 右上菱形
    this.drawDiamond(x + width - cornerOffset, y + cornerOffset, diamondSize);
    // 左下菱形
    this.drawDiamond(x + cornerOffset, y + height - cornerOffset, diamondSize);
    // 右下菱形
    this.drawDiamond(x + width - cornerOffset, y + height - cornerOffset, diamondSize);

    ctx.globalAlpha = 1;
  }

  /**
   * 绘制菱形装饰
   */
  drawDiamond(cx, cy, size) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size, cy);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 绘制纪念碑谷风格的游戏区域边框（建筑几何风格）- 渐变透明效果
   */
  drawMonumentGameBorder(area) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const colors = this.monumentColors;
    const x = area.x;
    const y = area.y;
    const width = area.width;
    const height = area.height;

    // 获取当前主题配色
    const themeColors = this.getThemeColors();

    // ========== 渐变透明边框 - 外层淡入效果 ==========
    // 从上到下的透明度渐变
    const borderGradient = ctx.createLinearGradient(x, y, x, y + height);

    // 解析主题色并添加透明度
    function addAlpha(color, alpha) {
      // 移除 # 号
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // 创建渐变：顶部半透明 → 中间较不透明 → 底部半透明
    borderGradient.addColorStop(0, addAlpha(themeColors.primary, 0.15));
    borderGradient.addColorStop(0.2, addAlpha(themeColors.secondary, 0.25));
    borderGradient.addColorStop(0.5, addAlpha(themeColors.accent, 0.3));
    borderGradient.addColorStop(0.8, addAlpha(themeColors.secondary, 0.25));
    borderGradient.addColorStop(1, addAlpha(themeColors.primary, 0.15));

    // 绘制渐变透明背景
    ctx.fillStyle = borderGradient;
    this.drawMonumentRect(x, y, width, height, 16);
    ctx.fill();

    // ========== 渐变边框线 ==========
    // 外边框 - 渐变透明
    const strokeGradient = ctx.createLinearGradient(x, y, x, y + height);
    strokeGradient.addColorStop(0, addAlpha(themeColors.accent, 0.4));
    strokeGradient.addColorStop(0.5, addAlpha(themeColors.accent, 0.6));
    strokeGradient.addColorStop(1, addAlpha(themeColors.accent, 0.4));

    ctx.strokeStyle = strokeGradient;
    ctx.lineWidth = 3;
    this.drawMonumentRect(x, y, width, height, 16);
    ctx.stroke();

    // ========== 内边框（高光渐变）==========
    const innerStrokeGradient = ctx.createLinearGradient(x, y, x, y + height);
    innerStrokeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    innerStrokeGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    innerStrokeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

    ctx.strokeStyle = innerStrokeGradient;
    ctx.lineWidth = 2;
    this.drawMonumentRect(x + 4, y + 4, width - 8, height - 8, 14);
    ctx.stroke();

    // ========== 装饰性建筑元素（简化版，降低透明度）==========
    ctx.globalAlpha = 0.3;
    this.drawMonumentArchitectureDecor(x, y, width, height, themeColors);
    ctx.globalAlpha = 1;
  }

  /**
   * 获取当前主题配色
   */
  getThemeColors(levelOverride) {
    const level = levelOverride !== undefined ? levelOverride : this.currentLevel;
    const themes = {
      // 第1关：清新薄荷绿
      1: {
        primary: '#C8E6C9',
        secondary: '#A5D6A7',
        accent: '#81C784',
        decor: '#FFF59D',
        bgGradient: ['#E8F5E9', '#C8E6C9', '#A5D6A7'],
        shadow: 'rgba(129, 199, 132, 0.2)'
      },
      // 第2关：温暖珊瑚橙
      2: {
        primary: '#FFAB91',
        secondary: '#FF8A65',
        accent: '#FF7043',
        decor: '#FFF9C4',
        bgGradient: ['#FBE9E7', '#FFAB91', '#FF8A65'],
        shadow: 'rgba(255, 112, 67, 0.2)'
      },
      // 第3关：魔法紫
      3: {
        primary: '#E1BEE7',
        secondary: '#CE93D8',
        accent: '#BA68C8',
        decor: '#FFF9C4',
        bgGradient: ['#F3E5F5', '#E1BEE7', '#CE93D8'],
        shadow: 'rgba(186, 104, 200, 0.2)'
      },
      // 第4关：魔法紫（进阶）
      4: {
        primary: '#D1C4E9',
        secondary: '#B39DDB',
        accent: '#9575CD',
        decor: '#FFE0B2',
        bgGradient: ['#EDE7F6', '#D1C4E9', '#B39DDB'],
        shadow: 'rgba(149, 117, 205, 0.2)'
      },
      // 第5关：柔和杏色
      5: {
        primary: '#FFE0B2',
        secondary: '#FFCC80',
        accent: '#FFB74D',
        decor: '#FFCDD2',
        bgGradient: ['#FFF3E0', '#FFE0B2', '#FFCC80'],
        shadow: 'rgba(255, 183, 77, 0.2)'
      },
      // 第6关：柠檬黄
      6: {
        primary: '#FFF59D',
        secondary: '#FFF176',
        accent: '#FFEE58',
        decor: '#C8E6C9',
        bgGradient: ['#FFFDE7', '#FFF59D', '#FFF176'],
        shadow: 'rgba(255, 238, 88, 0.2)'
      },
      // 第7关：淡天蓝
      7: {
        primary: '#B3E5FC',
        secondary: '#81D4FA',
        accent: '#4FC3F7',
        decor: '#F8BBD0',
        bgGradient: ['#E1F5FE', '#B3E5FC', '#81D4FA'],
        shadow: 'rgba(79, 195, 247, 0.2)'
      },
      // 第8关：薄荷青
      8: {
        primary: '#80CBC4',
        secondary: '#4DB6AC',
        accent: '#26A69A',
        decor: '#FFF9C4',
        bgGradient: ['#E0F2F1', '#80CBC4', '#4DB6AC'],
        shadow: 'rgba(38, 166, 154, 0.2)'
      },
      // 第9关：淡玫瑰粉
      9: {
        primary: '#F8BBD0',
        secondary: '#F48FB1',
        accent: '#F06292',
        decor: '#C5E1A5',
        bgGradient: ['#FCE4EC', '#F8BBD0', '#F48FB1'],
        shadow: 'rgba(240, 98, 146, 0.2)'
      },
      // 第10关：玫瑰粉
      10: {
        primary: '#F48FB1',
        secondary: '#F06292',
        accent: '#E91E63',
        decor: '#C5E1A5',
        bgGradient: ['#FCE4EC', '#F8BBD0', '#F48FB1'],
        shadow: 'rgba(233, 30, 99, 0.2)'
      }
    };
    return themes[level] || themes[1];
  }

  /**
   * 绘制纪念碑谷风格建筑装饰元素
   */
  drawMonumentArchitectureDecor(x, y, width, height, themeColors) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null

    // ========== 四个角落的建筑拱门装饰 ==========
    const archSize = 24;
    const cornerOffset = 20;

    // 左上角拱门
    this.drawIsometricArch(x + cornerOffset, y + cornerOffset, archSize, themeColors.decor);
    // 右上角拱门
    this.drawIsometricArch(x + width - cornerOffset - archSize, y + cornerOffset, archSize, themeColors.decor);
    // 左下角拱门
    this.drawIsometricArch(x + cornerOffset, y + height - cornerOffset - archSize, archSize, themeColors.decor);
    // 右下角拱门
    this.drawIsometricArch(x + width - cornerOffset - archSize, y + height - cornerOffset - archSize, archSize, themeColors.decor);

    // ========== 边缘装饰线条（建筑轮廓）==========
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;

    // 顶部装饰线
    ctx.beginPath();
    ctx.moveTo(x + 50, y + 8);
    ctx.lineTo(x + width - 50, y + 8);
    ctx.stroke();

    // 底部装饰线
    ctx.beginPath();
    ctx.moveTo(x + 50, y + height - 8);
    ctx.lineTo(x + width - 50, y + height - 8);
    ctx.stroke();

    // ========== 中央装饰图案（等轴测星形）==========
    this.drawIsometricStar(x + width / 2, y + height / 2, 15, themeColors.decor);

    // ========== 装饰性圆点阵列 ==========
    const dotSize = 3;
    const dotSpacing = 40;
    ctx.fillStyle = themeColors.decor;
    ctx.globalAlpha = 0.4;

    // 顶部圆点
    for (let i = 0; i < 3; i++) {
      const dotX = x + width / 2 - dotSpacing + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, y + 20, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // 底部圆点
    for (let i = 0; i < 3; i++) {
      const dotX = x + width / 2 - dotSpacing + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, y + height - 20, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  /**
   * 绘制等轴测拱门装饰
   */
  drawIsometricArch(x, y, size, color) {
    const ctx = this.ctx;
    ctx.save();

    // 拱门阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(x + size / 2 + 2, y + size / 2 + 2, size / 2 - 2, Math.PI, Math.PI * 2);
    ctx.fill();

    // 拱门主体
    const gradient = ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, this.lightenColor(color, 20));
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, Math.PI, Math.PI * 2);
    ctx.fill();

    // 拱门高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 3, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 绘制等轴测星形装饰
   */
  drawIsometricStar(cx, cy, radius, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.25;

    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 8;
      const r = i % 2 === 0 ? radius : radius * 0.4;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * 绘制几何装饰图案
   */
  drawGeometricPattern(x, y, width, height) {
    const ctx = this.ctx;
    const colors = this.monumentColors;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;

    // 四个角落的三角形装饰
    const triangleSize = 12;
    const offset = 18;

    // 左上
    ctx.beginPath();
    ctx.moveTo(x + offset, y + offset);
    ctx.lineTo(x + offset + triangleSize, y + offset);
    ctx.lineTo(x + offset, y + offset + triangleSize);
    ctx.closePath();
    ctx.stroke();

    // 右上
    ctx.beginPath();
    ctx.moveTo(x + width - offset - triangleSize, y + offset);
    ctx.lineTo(x + width - offset, y + offset);
    ctx.lineTo(x + width - offset, y + offset + triangleSize);
    ctx.closePath();
    ctx.stroke();

    // 左下
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height - offset - triangleSize);
    ctx.lineTo(x + offset, y + height - offset);
    ctx.lineTo(x + offset + triangleSize, y + height - offset);
    ctx.closePath();
    ctx.stroke();

    // 右下
    ctx.beginPath();
    ctx.moveTo(x + width - offset, y + height - offset - triangleSize);
    ctx.lineTo(x + width - offset, y + height - offset);
    ctx.lineTo(x + width - offset - triangleSize, y + height - offset);
    ctx.closePath();
    ctx.stroke();

    // 金色装饰点
    ctx.fillStyle = colors.monumentGold;
    const dotRadius = 2.5;
    ctx.beginPath();
    ctx.arc(x + offset + triangleSize / 2, y + offset + triangleSize / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width - offset - triangleSize / 2, y + offset + triangleSize / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + offset + triangleSize / 2, y + height - offset - triangleSize / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width - offset - triangleSize / 2, y + height - offset - triangleSize / 2, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // ========== 3D 场景管理器 ==========

  /**
   * 初始化 3D 场景（优先使用 Scene3D 完整3D方案）
   */
  async init3DScene() {
    console.log('[init3DScene] 开始初始化3D场景...');

    // ========== 优先使用 Scene3D（Three.js + Cannon.js 完整3D方案）==========
    if (Scene3D) {
      try {
        console.log('[init3DScene] 尝试使用 Scene3D (Three.js + Cannon.js)...');
        this.threeScene = new Scene3D();
        // 使用 WebGL canvas 初始化
        const success = await this.threeScene.init(this.canvas3D);
        if (success) {
          this.use3DModels = true;
          this.useFull3D = true; // 标记使用完整3D
          console.log('[init3DScene] ✓ Scene3D 初始化成功 - 完整3D模式');
          return;
        }
      } catch (e) {
        console.warn('[init3DScene] ✗ Scene3D 初始化失败:', e);
      }
    } else {
      console.warn('[init3DScene] Scene3D 不可用');
    }

    // ========== 备用：尝试 ThreeScene（预渲染3D模型）==========
    if (ThreeScene) {
      try {
        console.log('[init3DScene] 尝试使用 ThreeScene...');
        this.threeScene = new ThreeScene();
        const success = await this.threeScene.init();
        if (success) {
          this.use3DModels = true;
          this.useFull3D = false;
          console.log('[init3DScene] ✓ ThreeScene 初始化成功 - 预渲染模式');
          return;
        }
      } catch (e) {
        console.warn('[init3DScene] ✗ ThreeScene 初始化失败:', e);
      }
    } else {
      console.warn('[init3DScene] ThreeScene 不可用');
    }

    // ========== 最后备用：Simple3DRenderer（PNG预览图）==========
    if (Simple3DRenderer) {
      try {
        console.log('[init3DScene] 尝试使用 Simple3DRenderer...');
        this.threeScene = new Simple3DRenderer();
        const success = await this.threeScene.init();
        if (success) {
          this.use3DModels = true;
          this.useFull3D = false;
          console.log('[init3DScene] ✓ Simple3DRenderer 初始化成功 - 2D模式');
          return;
        }
      } catch (e) {
        console.warn('[init3DScene] ✗ Simple3DRenderer 初始化失败:', e);
      }
    } else {
      console.warn('[init3DScene] Simple3DRenderer 不可用');
    }

    console.log('[init3DScene] ✗ 所有3D渲染方法都失败，使用2D渲染');
    this.use3DModels = false;
    this.useFull3D = false;
  }

  /**
   * 预渲染物品的 3D 模型
   * @param {Array} items - 物品数组
   */
  async preRenderItems3D(items) {
    // 完整3D模式下不需要预渲染
    if (this.useFull3D) {
      console.log('[preRenderItems3D] 完整3D模式，跳过预渲染');
      return;
    }

    if (!this.use3DModels || !this.threeScene) {
      console.log('3D models not enabled, skipping pre-render');
      return;
    }

    // 检查 threeScene 是否有 getItemImage 方法
    if (!this.threeScene.getItemImage) {
      console.log('[preRenderItems3D] threeScene 没有 getItemImage 方法，跳过预渲染');
      return;
    }

    console.log('开始预渲染 3D 模型...');
    const startTime = Date.now();

    // 获取所有需要预渲染的唯一物品（按 type + color 分组）
    const uniqueItems = new Map();
    items.forEach(item => {
      const key = `${item.type}_${item.color}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });

    console.log(`需要预渲染 ${uniqueItems.size} 个唯一物品`);

    // 并发预渲染所有物品
    const renderPromises = Array.from(uniqueItems.values()).map(async (item) => {
      try {
        const result = await this.threeScene.getItemImage({
          type: item.type,
          color: item.color,
          emoji: item.emoji
        });

        if (result && result.canvas) {
          return {
            type: item.type,
            color: item.color,
            canvas: result.canvas
          };
        }
      } catch (e) {
        console.warn('预渲染失败:', item.type, item.color, e);
      }
      return null;
    });

    const renderedResults = await Promise.all(renderPromises);

    // 将预渲染结果存储到缓存中
    this.renderedImageCache = this.renderedImageCache || new Map();
    let successCount = 0;

    renderedResults.forEach(result => {
      if (result) {
        const key = `${result.type}_${result.color}`;
        this.renderedImageCache.set(key, result.canvas);
        successCount++;
      }
    });

    console.log(`3D 模型预渲染完成: ${successCount}/${uniqueItems.size} 成功，耗时 ${Date.now() - startTime}ms`);

    // 将预渲染的图片分配给所有物品
    items.forEach(item => {
      const key = `${item.type}_${item.color}`;
      const canvas = this.renderedImageCache.get(key);
      if (canvas) {
        item.renderedImage = canvas;
      }
    });
  }

  // ========== 陀螺仪/颠勺功能 ==========

  /**
   * 启动设备运动监听（陀螺仪）
   */
  startDeviceMotionListening() {
    try {
      wx.startDeviceMotionListening({
        interval: 'ui', // ui间隔适合游戏
        success: () => {
          console.log('Device motion listening started');
          wx.onDeviceMotionChange(this.handleDeviceMotionChange.bind(this));
        },
        fail: (err) => {
          console.log('Device motion not available:', err);
          this.shakeEnabled = false;
        }
      });
    } catch (e) {
      console.log('Device motion API error:', e);
      this.shakeEnabled = false;
    }
  }

  /**
   * 处理设备运动变化 - 使用陀螺仪旋转角速度检测颠勺
   */
  handleDeviceMotionChange(res) {
    if (!this.shakeEnabled) return;

    const now = Date.now();

    // 检查冷却时间
    if (now - this.lastShakeTime < this.shakeCooldown) {
      return;
    }

    // 获取旋转角速度（弧度/秒）- 这是检测"摇晃"的关键
    const rotationRate = res.rotationRate || {};
    const rx = Math.abs(rotationRate.x || 0); // X轴旋转速度（前后翻转手机）
    const ry = Math.abs(rotationRate.y || 0); // Y轴旋转速度（左右翻转手机）
    const rz = Math.abs(rotationRate.z || 0); // Z轴旋转速度（平面旋转）

    // 颠勺动作检测：主要是前后翻转（X轴）
    // 阈值 1.5 弧度/秒 ≈ 86度/秒，这是一个快速的颠勺动作
    const shakeThreshold = 1.5; // 弧度/秒

    // 检测到颠勺动作（前后快速翻转手机）
    const isShaking = rx > shakeThreshold;

    if (isShaking) {
      console.log('颠勺检测到! 旋转速度:', {x: rx.toFixed(2), y: ry.toFixed(2), z: rz.toFixed(2)});
      this.triggerShake(rx); // 传递旋转速度作为力度
      this.lastShakeTime = now;
    }
  }

  /**
   * 触发"颠勺"效果 - 使用陀螺仪旋转速度施加物理力
   * @param {number} rotationSpeed - 旋转角速度（弧度/秒），用于计算颠勺力度
   */
  triggerShake(rotationSpeed = 2.0) {
    if (!this.gameData || this.scene !== 'game') return;

    // 播放颠勺音效
    if (this.audioManager) {
      this.audioManager.playShake && this.audioManager.playShake();
    }

    // 使用物理引擎实现颠勺效果 - 根据旋转速度施加力
    if (this.physicsEnabled && this.physicsManager) {
      // 将旋转速度映射为力度系数（旋转越快，力度越大）
      const forceMultiplier = rotationSpeed * 3; // 可根据手感调整
      this.physicsManager.tumble(forceMultiplier);
    } else {
      // 备用方案：对所有物品施加随机位移和旋转
      const containerWidth = 300;
      const containerHeight = 300;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      const maxRadius = Math.min(containerWidth, containerHeight) / 2 - 30;

      // 根据旋转速度计算位移距离（旋转越快，位移越大）
      const baseMoveDistance = 20 + rotationSpeed * 20; // 20-80像素

      this.gameData.items.forEach(item => {
        // 随机旋转角度（模拟颠勺时的翻滚）
        const rotationAngle = (Math.random() - 0.5) * Math.PI * 0.5; // ±45度

        // 位移距离（基于旋转速度）
        const moveDistance = baseMoveDistance * (0.5 + Math.random() * 0.5);

        // 随机移动方向
        const moveAngle = Math.random() * Math.PI * 2;

        // 计算新位置
        let newX = item.x + Math.cos(moveAngle) * moveDistance;
        let newY = item.y + Math.sin(moveAngle) * moveDistance;

        // 限制在容器内
        const distFromCenter = Math.sqrt(Math.pow(newX - centerX, 2) + Math.pow(newY - centerY, 2));
        if (distFromCenter > maxRadius) {
          newX = centerX + (newX - centerX) / distFromCenter * maxRadius;
          newY = centerY + (newY - centerY) / distFromCenter * maxRadius;
        }

        // 确保不超出边界
        newX = Math.max(20, Math.min(containerWidth - 60, newX));
        newY = Math.max(20, Math.min(containerHeight - 60, newY));

        // 更新物品位置
        item.x = newX;
        item.y = newY;
        item.targetX = newX;
        item.targetY = newY;
        item.currentX = newX;
        item.currentY = newY;

        // 随机调整层级（模拟翻滚效果）
        if (Math.random() > 0.7) {
          item.zIndex = Math.max(0, Math.min(2, item.zIndex + (Math.random() > 0.5 ? 1 : -1)));
        }
      });

      // 重新计算可点击状态
      this.gameData.items = GameLogic.updateClickable(this.gameData.items);
    }

    // ========== 颠勺可能触发补充物品 ==========
    // 使用统一的补充逻辑
    const config = GameLogic.ITEM_COUNT_CONTROL;
    const needsRefill =
      this.gameData.remainingItemsToSpawn > 0 &&
      this.gameData.items.length < config.minActiveItems;

    if (needsRefill) {
      // 颠勺时补充概率更高（50%概率触发）
      if (Math.random() < 0.5) {
        console.log('颠勺触发补充物品');
        this.refillFromBottom();
      }
    }

    // 显示颠勺效果提示
    this.showShakeEffect = true;
    this.shakeEffectAlpha = 1.0;
  }

  /**
   * 手动触发颠勺（供按钮调用）
   */
  manualShake() {
    const now = Date.now();
    if (now - this.lastShakeTime < this.shakeCooldown) {
      return false; // 冷却中
    }
    this.triggerShake();
    this.lastShakeTime = now;
    return true;
  }

  // ========== 陀螺仪/颠勺功能结束 ==========

  /**
   * 绘制金色光芒高亮效果（用于指向/点击物品）
   * @param {number} screenX - 物品屏幕X坐标
   * @param {number} screenY - 物品屏幕Y坐标
   * @param {number} itemSize - 物品大小
   */
  drawGoldenGlow(screenX, screenY, itemSize) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const centerX = screenX + itemSize / 2;
    const centerY = screenY + itemSize / 2;
    const radius = itemSize / 2;

    // 保存上下文状态
    ctx.save();

    // ========== 脉冲动画效果 ==========
    const time = Date.now() * 0.003; // 脉冲速度
    const pulseScale = 1 + Math.sin(time) * 0.1; // 0.9-1.1 倍缩放
    const pulseAlpha = 0.6 + Math.sin(time) * 0.3; // 0.3-0.9 透明度

    // ========== 最外层光晕 - 大范围金色光 ==========
    const outerGlow = ctx.createRadialGradient(
      centerX, centerY, radius * 0.5,
      centerX, centerY, radius * 2.2 * pulseScale
    );
    outerGlow.addColorStop(0, `rgba(255, 215, 0, ${pulseAlpha * 0.5})`); // 金色
    outerGlow.addColorStop(0.5, `rgba(255, 193, 7, ${pulseAlpha * 0.3})`); // 深金色
    outerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)'); // 透明边缘

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 2.2 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // ========== 中层光晕 - 明亮金色 ==========
    const midGlow = ctx.createRadialGradient(
      centerX, centerY, radius * 0.3,
      centerX, centerY, radius * 1.6 * pulseScale
    );
    midGlow.addColorStop(0, `rgba(255, 235, 59, ${pulseAlpha * 0.7})`); // 亮黄色
    midGlow.addColorStop(0.6, `rgba(255, 215, 0, ${pulseAlpha * 0.4})`); // 金色
    midGlow.addColorStop(1, 'rgba(255, 193, 7, 0)'); // 透明边缘

    ctx.fillStyle = midGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.6 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // ========== 内层光晕 - 核心高光 ==========
    const innerGlow = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius * 1.2
    );
    innerGlow.addColorStop(0, `rgba(255, 255, 224, ${pulseAlpha * 0.8})`); // 接近白色
    innerGlow.addColorStop(0.5, `rgba(255, 235, 59, ${pulseAlpha * 0.5})`); // 亮黄色
    innerGlow.addColorStop(1, 'rgba(255, 215, 0, 0)'); // 透明边缘

    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // ========== 金色旋转光芒（星芒效果）==========
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(time * 0.5); // 缓慢旋转

    const rayCount = 8; // 8条光芒
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const rayLength = radius * 1.8 * pulseScale;
      const rayWidth = 3;

      ctx.save();
      ctx.rotate(angle);

      // 光芒渐变
      const rayGradient = ctx.createLinearGradient(0, 0, rayLength, 0);
      rayGradient.addColorStop(0, `rgba(255, 255, 224, ${pulseAlpha * 0.9})`);
      rayGradient.addColorStop(0.3, `rgba(255, 215, 0, ${pulseAlpha * 0.6})`);
      rayGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = rayGradient;
      ctx.beginPath();
      ctx.moveTo(0, -rayWidth / 2);
      ctx.lineTo(rayLength, 0);
      ctx.lineTo(0, rayWidth / 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // ========== 金色边框 - 双层效果 ==========
    // 外边框
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha * 0.9})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    // 内边框
    ctx.strokeStyle = `rgba(255, 255, 224, ${pulseAlpha * 0.7})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // ========== 闪光星星效果 ==========
    const starCount = 4;
    for (let i = 0; i < starCount; i++) {
      const starAngle = time + (i / starCount) * Math.PI * 2;
      const starDistance = radius * 1.3 + Math.sin(time * 2 + i) * 10;
      const starX = centerX + Math.cos(starAngle) * starDistance;
      const starY = centerY + Math.sin(starAngle) * starDistance;
      const starSize = 3 + Math.sin(time * 3 + i) * 1.5;

      // 绘制四角星
      ctx.save();
      ctx.translate(starX, starY);
      ctx.rotate(time * 2 + i);

      ctx.fillStyle = `rgba(255, 255, 224, ${pulseAlpha})`;
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const angle = (j / 4) * Math.PI * 2;
        const innerR = starSize * 0.4;
        const outerR = starSize;
        if (j === 0) {
          ctx.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        } else {
          ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
        }
        const midAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(midAngle) * innerR, Math.sin(midAngle) * innerR);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 恢复上下文状态
    ctx.restore();
  }

  // 绘制带3D效果的物品
  drawItem3D(item, screenX, screenY, itemSize, isHovered = false) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 阴影 - 更柔和
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(screenX + itemSize / 2, screenY + itemSize / 2 + itemSize * 0.4,
                      itemSize * 0.4, itemSize * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 主体渐变 - 更柔和的效果
    const gradient = ctx.createRadialGradient(
      screenX + itemSize / 3, screenY + itemSize / 3, itemSize * 0.1,
      screenX + itemSize / 2, screenY + itemSize / 2, itemSize / 2
    );
    const baseColor = item.clickable ? item.color : '#E0E0E0';
    // 使用更柔和的渐变
    gradient.addColorStop(0, this.lightenColor(baseColor, 60));  // 更亮的高光
    gradient.addColorStop(0.5, baseColor);                        // 中间保持原色
    gradient.addColorStop(1, this.darkenColor(baseColor, 10));    // 更淡的阴影

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX + itemSize / 2, screenY + itemSize / 2, itemSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 柔和高光
    if (item.clickable) {
      const highlightGradient = ctx.createRadialGradient(
        screenX + itemSize / 2 - itemSize * 0.25,
        screenY + itemSize / 2 - itemSize * 0.25,
        0,
        screenX + itemSize / 2 - itemSize * 0.25,
        screenY + itemSize / 2 - itemSize * 0.25,
        itemSize * 0.25
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.beginPath();
      ctx.arc(screenX + itemSize / 2 - itemSize * 0.2, screenY + itemSize / 2 - itemSize * 0.2, itemSize * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ========== 指向/点击高亮 - 金色光芒效果 ==========
    if (isHovered && item.clickable) {
      this.drawGoldenGlow(screenX, screenY, itemSize);
    }

    // emoji/图标 - 使用深色确保可读性
    ctx.fillStyle = '#4A4A4A';
    ctx.font = `bold ${itemSize * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.emoji, screenX + itemSize / 2, screenY + itemSize / 2);
  }

  // ========== 动画系统 ==========

  /**
   * 创建物品移动动画
   */
  createItemMoveAnimation(item, fromX, fromY, toX, toY, onComplete) {
    const animation = {
      type: 'itemMove',
      item: item,
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      progress: 0,
      duration: 400, // 400ms动画
      startTime: Date.now(),
      onComplete: onComplete
    };
    this.animations.push(animation);
    return animation;
  }

  /**
   * 创建消除动画
   */
  createEliminateAnimation(slotIndex, onComplete) {
    const animation = {
      type: 'eliminate',
      slotIndex: slotIndex,
      progress: 0,
      duration: 500, // 500ms动画
      startTime: Date.now(),
      onComplete: onComplete
    };
    this.animations.push(animation);
    return animation;
  }

  /**
   * 更新和绘制所有动画
   */
  updateAndDrawAnimations() {
    if (this.animations.length === 0) return;

    const now = Date.now();
    const finishedAnimations = [];

    this.animations.forEach((anim, index) => {
      const elapsed = now - anim.startTime;
      anim.progress = Math.min(elapsed / anim.duration, 1);

      if (anim.progress >= 1) {
        finishedAnimations.push(index);
        console.log('Animation completed:', anim.type, anim.item ? anim.item.emoji : '');
        if (anim.onComplete) anim.onComplete();
        return;
      }

      // 缓动函数 - easeOutCubic
      const eased = 1 - Math.pow(1 - anim.progress, 3);

      if (anim.type === 'itemMove') {
        this.drawItemMoveAnimation(anim, eased);
      } else if (anim.type === 'eliminate') {
        this.drawEliminateAnimation(anim, eased);
      }
    });

    // 移除完成的动画
    for (let i = finishedAnimations.length - 1; i >= 0; i--) {
      this.animations.splice(finishedAnimations[i], 1);
    }
  }

  /**
   * 绘制物品移动动画（提起 + 平移）
   */
  drawItemMoveAnimation(anim, progress) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 计算当前位置
    const currentX = anim.fromX + (anim.toX - anim.fromX) * progress;
    const currentY = anim.fromY + (anim.toY - anim.fromY) * progress;

    // 基础物品大小
    const baseItemSize = 60 * this.scaleRatio; // 与渲染尺寸保持一致

    // 提起效果：前30%时间物品放大并稍微上浮
    let scale = 1;
    let offsetY = 0;
    if (progress < 0.3) {
      const liftProgress = progress / 0.3;
      scale = 1 + liftProgress * 0.25; // 放大25%
      offsetY = -liftProgress * 25; // 上浮25像素
    } else {
      // 后70%时间逐渐恢复正常大小
      const dropProgress = (progress - 0.3) / 0.7;
      scale = 1.25 - dropProgress * 0.25;
      offsetY = -25 + dropProgress * 25;
    }

    const itemSize = baseItemSize * scale;
    const centerX = currentX + baseItemSize / 2;
    const centerY = currentY + baseItemSize / 2 + offsetY;

    // 绘制阴影（随高度变化）
    const shadowScale = Math.max(0.3, 1 - Math.abs(offsetY) / 30);
    const shadowAlpha = 0.3 * shadowScale;
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(centerX, currentY + baseItemSize / 2 + 5,
                      itemSize * 0.4 * shadowScale, itemSize * 0.15 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 绘制物品背景
    const gradient = ctx.createRadialGradient(
      centerX - itemSize * 0.15, centerY - itemSize * 0.15, itemSize * 0.1,
      centerX, centerY, itemSize / 2 - 2
    );
    gradient.addColorStop(0, this.lightenColor(anim.item.color, 40));
    gradient.addColorStop(0.7, anim.item.color);
    gradient.addColorStop(1, this.darkenColor(anim.item.color, 20));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, itemSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(centerX - itemSize * 0.2, centerY - itemSize * 0.2, itemSize * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, itemSize / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    // emoji
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${itemSize * 0.55}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(anim.item.emoji, centerX, centerY);
  }

  /**
   * 绘制消除动画
   */
  drawEliminateAnimation(anim, progress) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const slotBarY = this.height * 0.72;
    const slotBarHeight = this.height * 0.10;
    const slotCount = 7;
    const slotGap = 10 * this.scaleRatio;
    const slotSize = (this.width * 0.9 - slotGap * (slotCount - 1)) / slotCount;
    const slotBarX = (this.width - (slotSize * slotCount + slotGap * (slotCount - 1))) / 2;

    const slotX = slotBarX + anim.slotIndex * (slotSize + slotGap);
    const slotY = slotBarY + (slotBarHeight - slotSize) / 2;

    // 前半段：显示物品缩小
    // 后半段：显示消除特效
    if (progress < 0.4) {
      const shrinkProgress = progress / 0.4;
      const currentSize = slotSize * (1 - shrinkProgress * 0.6);
      const currentAlpha = 1 - shrinkProgress * 0.3;

      ctx.globalAlpha = currentAlpha;

      // 绘制缩小的物品
      ctx.fillStyle = anim.item.color;
      ctx.beginPath();
      ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, currentSize / 2 - 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000000';
      ctx.font = `${currentSize * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(anim.item.emoji, slotX + slotSize / 2, slotY + slotSize / 2);

      ctx.globalAlpha = 1;
    } else {
      // 消除特效
      const effectProgress = (progress - 0.4) / 0.6;
      const effectSize = slotSize * (0.5 + effectProgress * 2);
      const effectAlpha = 1 - effectProgress;

      // 星星/闪光效果
      ctx.globalAlpha = effectAlpha;

      // 外圈扩散
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, effectSize / 2, 0, Math.PI * 2);
      ctx.stroke();

      // 内圈
      ctx.strokeStyle = '#FFF176';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, effectSize / 3, 0, Math.PI * 2);
      ctx.stroke();

      // 星星符号
      ctx.fillStyle = '#FFD700';
      ctx.font = `bold ${effectSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', slotX + slotSize / 2, slotY + slotSize / 2);

      ctx.globalAlpha = 1;
    }
  }

  // ========== 游戏背景绘制 ==========

  /**
   * 绘制关卡1专用背景 - 淡粉色建筑场景
   */
  drawLevel1Background() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 尝试加载并绘制关卡1背景图
    if (!this.level1BgImage) {
      this.level1BgImage = wx.createImage();
      this.level1BgImage.onload = () => {
        console.log('关卡1背景图加载完成');
      };
      this.level1BgImage.onerror = () => {
        console.error('关卡1背景图加载失败');
      };
      this.level1BgImage.src = 'images/bg-level-1.png';
    }

    // 绘制背景图（cover 模式）
    if (this.level1BgImage && this.level1BgImage.complete) {
      const imgRatio = this.level1BgImage.width / this.level1BgImage.height;
      const screenRatio = this.width / this.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > screenRatio) {
        drawHeight = this.height;
        drawWidth = this.height * imgRatio;
        offsetX = (this.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = this.width;
        drawHeight = this.width / imgRatio;
        offsetX = 0;
        offsetY = (this.height - drawHeight) / 2;
      }

      ctx.drawImage(this.level1BgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // 如果图片未加载，使用默认背景
      ctx.fillStyle = '#FFF5F7';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 绘制关卡2专用背景 - 淡蓝色海边场景
   */
  drawLevel2Background() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 尝试加载并绘制关卡2背景图
    if (!this.level2BgImage) {
      this.level2BgImage = wx.createImage();
      this.level2BgImage.onload = () => {
        console.log('关卡2背景图加载完成');
      };
      this.level2BgImage.onerror = () => {
        console.error('关卡2背景图加载失败');
      };
      this.level2BgImage.src = 'images/bg-level-2.png';
    }

    // 绘制背景图（cover 模式）
    if (this.level2BgImage && this.level2BgImage.complete) {
      const imgRatio = this.level2BgImage.width / this.level2BgImage.height;
      const screenRatio = this.width / this.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > screenRatio) {
        drawHeight = this.height;
        drawWidth = this.height * imgRatio;
        offsetX = (this.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = this.width;
        drawHeight = this.width / imgRatio;
        offsetX = 0;
        offsetY = (this.height - drawHeight) / 2;
      }

      ctx.drawImage(this.level2BgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // 如果图片未加载，使用默认背景
      ctx.fillStyle = '#E3F2FD';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 绘制关卡3专用背景
   */
  drawLevel3Background() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 尝试加载并绘制关卡3背景图
    if (!this.level3BgImage) {
      this.level3BgImage = wx.createImage();
      this.level3BgImage.onload = () => {
        console.log('关卡3背景图加载完成');
      };
      this.level3BgImage.onerror = () => {
        console.error('关卡3背景图加载失败');
      };
      this.level3BgImage.src = 'images/bg-level-3.png';
    }

    // 绘制背景图（cover 模式）
    if (this.level3BgImage && this.level3BgImage.complete) {
      const imgRatio = this.level3BgImage.width / this.level3BgImage.height;
      const screenRatio = this.width / this.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > screenRatio) {
        drawHeight = this.height;
        drawWidth = this.height * imgRatio;
        offsetX = (this.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = this.width;
        drawHeight = this.width / imgRatio;
        offsetX = 0;
        offsetY = (this.height - drawHeight) / 2;
      }

      ctx.drawImage(this.level3BgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // 如果图片未加载，使用默认背景
      ctx.fillStyle = '#F3E5F5';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 绘制关卡4专用背景
   */
  drawLevel4Background() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 尝试加载并绘制关卡4背景图
    if (!this.level4BgImage) {
      this.level4BgImage = wx.createImage();
      this.level4BgImage.onload = () => {
        console.log('关卡4背景图加载完成');
      };
      this.level4BgImage.onerror = () => {
        console.error('关卡4背景图加载失败');
      };
      this.level4BgImage.src = 'images/bg-level-4.png';
    }

    // 绘制背景图（cover 模式）
    if (this.level4BgImage && this.level4BgImage.complete) {
      const imgRatio = this.level4BgImage.width / this.level4BgImage.height;
      const screenRatio = this.width / this.height;
      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > screenRatio) {
        drawHeight = this.height;
        drawWidth = this.height * imgRatio;
        offsetX = (this.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = this.width;
        drawHeight = this.width / imgRatio;
        offsetX = 0;
        offsetY = (this.height - drawHeight) / 2;
      }

      ctx.drawImage(this.level4BgImage, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // 如果图片未加载，使用默认背景
      ctx.fillStyle = '#EDE7F6';
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  /**
   * 绘制游戏页面背景 - 简洁风格
   */
  drawGameBackground() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    // 基础背景色 - 柔和渐变
    const bgGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    bgGradient.addColorStop(0, '#FFF5F7');
    bgGradient.addColorStop(0.5, '#FED6E3');
    bgGradient.addColorStop(1, '#FFE5E8');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * 绘制木质纹理
   */
  drawWoodTexture() {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    const time = Date.now() * 0.001;

    // 绘制木纹线条
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.08)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 30; i++) {
      const y = (i / 30) * this.height;
      ctx.beginPath();
      ctx.moveTo(0, y);

      // 波浪形木纹
      for (let x = 0; x < this.width; x += 50) {
        const wave = Math.sin(x * 0.02 + i * 0.5 + time * 0.1) * 10;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    // 添加木节效果
    const knots = [
      { x: this.width * 0.15, y: this.height * 0.3, r: 25 },
      { x: this.width * 0.85, y: this.height * 0.6, r: 30 },
      { x: this.width * 0.7, y: this.height * 0.25, r: 20 }
    ];

    knots.forEach(knot => {
      // 木节阴影
      const gradient = ctx.createRadialGradient(knot.x, knot.y, 0, knot.x, knot.y, knot.r);
      gradient.addColorStop(0, 'rgba(101, 67, 33, 0.3)');
      gradient.addColorStop(0.7, 'rgba(139, 90, 43, 0.15)');
      gradient.addColorStop(1, 'rgba(139, 90, 43, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(knot.x, knot.y, knot.r, 0, Math.PI * 2);
      ctx.fill();

      // 木节圈
      ctx.strokeStyle = 'rgba(101, 67, 33, 0.2)';
      ctx.lineWidth = 2;
      for (let r = 5; r < knot.r; r += 5) {
        ctx.beginPath();
        ctx.arc(knot.x, knot.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  /**
   * 绘制包围游戏区域的装饰边框
   */
  drawGameAreaBorder(area) {
    const ctx = this.ctx;
    const padding = 15;
    const cornerRadius = 20;

    // 外层装饰阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.roundRect(area.x - padding + 4, area.y - padding + 4,
                   area.width + padding * 2, area.height + padding * 2, cornerRadius);
    ctx.fill();

    // 外层木质边框 - 渐变
    const borderGradient = ctx.createLinearGradient(
      area.x - padding, area.y - padding,
      area.x + area.width + padding, area.y + area.height + padding
    );
    borderGradient.addColorStop(0, '#A0522D');
    borderGradient.addColorStop(0.25, '#8B4513');
    borderGradient.addColorStop(0.5, '#CD853F');
    borderGradient.addColorStop(0.75, '#8B4513');
    borderGradient.addColorStop(1, '#654321');

    ctx.fillStyle = borderGradient;
    this.roundRect(area.x - padding, area.y - padding,
                   area.width + padding * 2, area.height + padding * 2, cornerRadius);
    ctx.fill();

    // 内层装饰线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 3;
    this.roundRect(area.x - padding + 6, area.y - padding + 6,
                   area.width + padding * 2 - 12, area.height + padding * 2 - 12, cornerRadius - 3);
    ctx.stroke();

    // 角落装饰 - 铆钉效果
    const corners = [
      { x: area.x - padding + 15, y: area.y - padding + 15 },
      { x: area.x + area.width + padding - 15, y: area.y - padding + 15 },
      { x: area.x - padding + 15, y: area.y + area.height + padding - 15 },
      { x: area.x + area.width + padding - 15, y: area.y + area.height + padding - 15 }
    ];

    corners.forEach(corner => {
      // 铆钉外圈
      ctx.fillStyle = '#5D3A1A';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // 铆钉内圈
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // 铆钉高光
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(corner.x - 2, corner.y - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // 边框装饰图案 - 木雕花纹
    this.drawBorderPattern(area, padding);
  }

  /**
   * 绘制边框装饰图案
   */
  drawBorderPattern(area, padding) {
    const ctx = this.ctx;
    const patternSize = 40;
    const leftX = area.x - padding + 25;
    const rightX = area.x + area.width + padding - 25;
    const topY = area.y - padding;
    const bottomY = area.y + area.height + padding;

    // 左侧花纹
    this.drawCarvedPattern(leftX, topY + 40, bottomY - topY - 80, 'vertical');

    // 右侧花纹
    this.drawCarvedPattern(rightX, topY + 40, bottomY - topY - 80, 'vertical');
  }

  /**
   * 绘制雕刻花纹
   */
  drawCarvedPattern(x, y, height, direction) {
    const ctx = this.ctx;
    const patternCount = Math.floor(height / 50);

    for (let i = 0; i < patternCount; i++) {
      const py = y + i * 50;

      // 简单的花纹 - 波浪形
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (direction === 'vertical') {
        ctx.moveTo(x - 10, py);
        ctx.quadraticCurveTo(x, py + 15, x - 10, py + 30);
        ctx.quadraticCurveTo(x - 20, py + 15, x - 10, py);
      }
      ctx.stroke();
    }
  }

  // ========== 立体边框绘制 ==========

  /**
   * 绘制立体边框（带阴影和渐变）- 木质风格
   */
  draw3DBorder(x, y, width, height, radius = 8, borderColor = '#8B4513', style = 'wood') {
    // 深层阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    this.roundRect(x + 5, y + 5, width, height, radius);
    ctx.fill();

    // 外边框渐变 - 木质纹理感
    const outerGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    if (style === 'wood') {
      outerGradient.addColorStop(0, '#A0522D');
      outerGradient.addColorStop(0.25, '#8B4513');
      outerGradient.addColorStop(0.5, '#CD853F');
      outerGradient.addColorStop(0.75, '#8B4513');
      outerGradient.addColorStop(1, '#654321');
    } else {
      outerGradient.addColorStop(0, this.lightenColor(borderColor, 30));
      outerGradient.addColorStop(0.5, borderColor);
      outerGradient.addColorStop(1, this.darkenColor(borderColor, 20));
    }
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    this.roundRect(x, y, width, height, radius);
    ctx.fill();

    // 内边框 - 亮色边
    const innerPadding = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(x + innerPadding, y + innerPadding, width - innerPadding * 2, height - innerPadding * 2, radius - 1);
    ctx.stroke();

    // 顶部高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y + 2);
    ctx.lineTo(x + width - radius, y + 2);
    ctx.stroke();

    // 底部阴影
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y + height - 2);
    ctx.lineTo(x + width - radius, y + height - 2);
    ctx.stroke();

    // 外边框线
    ctx.strokeStyle = style === 'wood' ? '#5D3A1A' : borderColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    this.roundRect(x, y, width, height, radius);
    ctx.stroke();
  }

  /**
   * 绘制收集栏立体边框
   */
  drawCollectionBarBorder(x, y, width, height) {
    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    this.roundRect(x + 4, y + 4, width, height, 12);
    ctx.fill();

    // 木质渐变背景
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, '#DEB887');
    gradient.addColorStop(0.3, '#D2B48C');
    gradient.addColorStop(0.7, '#C19A6B');
    gradient.addColorStop(1, '#A0522D');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    this.roundRect(x, y, width, height, 12);
    ctx.fill();

    // 内凹槽效果
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(x + 4, y + 4, width - 8, height - 8, 8);
    ctx.stroke();

    // 顶部高光
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 2);
    ctx.lineTo(x + width - 12, y + 2);
    ctx.stroke();

    // 外边框
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    this.roundRect(x, y, width, height, 12);
    ctx.stroke();
  }

  /**
   * 绘制道具按钮立体边框
   */
  drawPropButtonBorder(x, y, width, height, isActive) {
    const baseColor = isActive ? '#8B4513' : '#999999';

    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    this.roundRect(x + 3, y + 3, width, height, 8);
    ctx.fill();

    // 按钮渐变
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    if (isActive) {
      gradient.addColorStop(0, '#CD853F');
      gradient.addColorStop(0.5, '#DEB887');
      gradient.addColorStop(1, '#8B4513');
    } else {
      gradient.addColorStop(0, '#CCCCCC');
      gradient.addColorStop(0.5, '#AAAAAA');
      gradient.addColorStop(1, '#888888');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    this.roundRect(x, y, width, height, 8);
    ctx.fill();

    // 顶部高光
    if (isActive) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 2);
      ctx.lineTo(x + width - 8, y + 2);
      ctx.stroke();
    }

    // 边框
    ctx.strokeStyle = isActive ? '#5D3A1A' : '#666666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.roundRect(x, y, width, height, 8);
    ctx.stroke();
  }

  /**
   * 圆角矩形辅助函数
   */
  roundRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    if (!ctx) return; // 3D模式下ctx可能为null
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // ========== 动画系统结束 ==========

  // 加载图片
  loadImages() {
    const loadSingleImage = (key, src) => {
      return new Promise((resolve) => {
        const img = wx.createImage();
        img.onload = () => {
          this.images[key] = img;
          resolve();
        };
        img.onerror = () => {
          resolve(); // 即使失败也继续
        };
        img.src = src;
      });
    };

    // 加载关卡图标 1-10
    const levelIconPromises = [];
    for (let i = 1; i <= 10; i++) {
      levelIconPromises.push(loadSingleImage(`level-${i}`, `images/level-icons/level-${i}.png`));
    }

    Promise.all([
      loadSingleImage('background', 'images/homepage-bg.png'),
      loadSingleImage('star-filled', 'images/star-filled.png'),
      loadSingleImage('star-empty', 'images/star-empty.png')
    ].concat(levelIconPromises)).then(() => {
      this.imagesLoaded = true;
      console.log('Images loaded');
    });
  }

  // 加载游戏数据
  loadGameData() {
    try {
      // ========== 测试模式：解锁到第4关 ==========
      // 正式发布时请改为：this.maxLevel = Math.min(wx.getStorageSync('maxLevel') || 1, 12);
      this.maxLevel = 4; // 只解锁到第4关
      this.highScore = wx.getStorageSync('highScore') || 0;
      this.currentLevel = 1; // 默认从第1关开始
    } catch (e) {
      console.error('Load game data error:', e);
    }
  }

  // 保存游戏数据
  saveGameData() {
    try {
      wx.setStorageSync('maxLevel', this.maxLevel);
      wx.setStorageSync('highScore', this.highScore);
    } catch (e) {
      console.error('Save game data error:', e);
    }
  }

  // 触摸开始
  onTouchStart(x, y) {
    const now = Date.now();
    if (now - this.lastTouchTime < 150) return;
    this.lastTouchTime = now;

    console.log('Touch:', x, y, 'scene:', this.scene);

    // 记录触摸开始时间和位置（用于长按检测）
    this.touchStartTime = now;
    this.touchStartPos = { x, y };
    this.isLongPress = false;
    this.touchedArea = null; // 重置触摸区域

    // 立即更新并锁定 hoveredItem（用于点击高亮）
    if (this.scene === 'game') {
      this.updateHoveredItem(x, y);
      this.lockedHoverItem = this.hoveredItem; // 锁定当前高亮的物品
      console.log('[触摸开始] lockedHoverItem:', this.lockedHoverItem ? this.lockedHoverItem.emoji : null, 'id:', this.lockedHoverItem ? this.lockedHoverItem.id : null);
    }

    if (this.scene === 'home') {
      this.handleHomeTouch(x, y);
    } else if (this.scene === 'game') {
      // 游戏场景下，不在 onTouchStart 时处理物品收集
      // 只处理返回按钮（立即响应），其他操作在 onTouchEnd 时处理
      this.handleGameTouchStartOnly(x, y);
    } else if (this.scene === 'gameover') {
      this.handleGameOverTouch(x, y);
    }
  }

  // 触摸移动
  onTouchMove(x, y) {
    this.currentTouchX = x;
    this.currentTouchY = y;

    // 在游戏中检测指向的物品
    if (this.scene === 'game' && this.gameData) {
      this.updateHoveredItem(x, y);
    }
  }

  // 触摸结束
  onTouchEnd(x, y) {
    // 检测是否是长按
    const touchDuration = Date.now() - this.touchStartTime;
    this.isLongPress = touchDuration >= this.longPressThreshold;

    if (this.isLongPress) {
      console.log('检测到长按，不触发任何操作');
    } else {
      // 不是长按，根据触摸区域类型处理
      if (this.scene === 'game') {
        if (this.touchedArea === 'game' && this.lockedHoverItem) {
          // 游戏区域物品点击
          console.log('[触摸结束] 触发物品收集:', this.lockedHoverItem.emoji, 'id:', this.lockedHoverItem.id);
          this.onItemClick(this.lockedHoverItem.id);
        } else if (this.touchedArea === 'storage') {
          // 暂存栏点击
          this.handleStorageSlotTouchEnd(x, y);
        } else if (this.touchedArea === 'prop') {
          // 道具栏点击
          this.handlePropsTouch(x);
        }
        // 'back' 区域已经在 onTouchStart 时处理了
      }
    }

    this.currentTouchX = null;
    this.currentTouchY = null;
    this.hoveredItem = null;
    this.lockedHoverItem = null; // 清除锁定物品
    this.touchedArea = null; // 清除触摸区域
  }

  // 处理暂存栏触摸结束
  handleStorageSlotTouchEnd(x, y) {
    const slotBarY = this.height * 0.72;
    const slotBarHeight = this.height * 0.10;
    const slotCount = 7;
    const slotGap = 10 * this.scaleRatio;
    const slotSize = (this.width * 0.9 - slotGap * (slotCount - 1)) / slotCount;

    const storageSlotCount = 3;
    const storageSlotSize = slotSize * 0.7;
    const storageSlotGap = 8 * this.scaleRatio;
    const storageSlotBarWidth = storageSlotSize * storageSlotCount + storageSlotGap * (storageSlotCount - 1);
    const storageSlotBarX = (this.width - storageSlotBarWidth) / 2;
    const storageSlotBarY = slotBarY - storageSlotSize - 20;

    this.handleStorageSlotClick(x, y, storageSlotBarX, storageSlotBarY, storageSlotSize, storageSlotGap);
  }

  // 更新指向的物品
  updateHoveredItem(x, y) {
    if (!this.gameData || !this.gameData.items) return;

    // ========== 如果有锁定的物品，优先使用锁定物品 ==========
    if (this.lockedHoverItem) {
      // 检查锁定物品是否仍然存在且可点击
      const stillExists = this.gameData.items.some(i => i.id === this.lockedHoverItem.id && i.clickable);
      if (stillExists) {
        this.hoveredItem = this.lockedHoverItem;
        return;
      } else {
        // 锁定物品已被移除或不可点击，清除锁定
        this.lockedHoverItem = null;
      }
    }

    const gameArea = {
      x: this.width * 0.05,
      y: this.height * 0.18,
      width: this.width * 0.9,
      height: this.width * 0.9
    };

    // 检查是否在游戏区域内
    if (x < gameArea.x || x > gameArea.x + gameArea.width ||
        y < gameArea.y || y > gameArea.y + gameArea.height) {
      this.hoveredItem = null;
      return;
    }

    const itemSize = 60 * this.scaleRatio; // 与渲染尺寸保持一致

    // ========== 按照渲染时的相同方式排序：zIndex 升序，y 坐标升序 ==========
    // 然后反向遍历，优先检查最后绘制的（最上层的）物品
    const sortedItems = this.gameData.items.slice().sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.y - b.y;
    });

    // ========== 从后往前遍历（从最上层开始检查）==========
    let found = null;
    for (let i = sortedItems.length - 1; i >= 0; i--) {
      const item = sortedItems[i];

      // 跳过不可点击的物品
      if (!item.clickable) continue;

      // ========== 边界检查：跳过超出逻辑容器的物品 ==========
      const margin = 25;
      if (item.x < margin || item.x > 300 - margin || item.y < margin || item.y > 300 - margin) {
        continue;
      }

      const screenX = gameArea.x + (item.x / 300) * gameArea.width - itemSize / 2;
      const screenY = gameArea.y + (item.y / 300) * gameArea.height - itemSize / 2;

      // ========== 检查点击是否在物品范围内 ==========
      const inRange = x >= screenX && x <= screenX + itemSize &&
                      y >= screenY && y <= screenY + itemSize;

      if (inRange) {
        found = item;
        break;
      }
    }

    // ========== 保存触摸位置用于调试 ==========
    this.lastTouchPosition = { x, y };

    this.hoveredItem = found;
  }

  // 处理首页触摸
  handleHomeTouch(x, y) {
    // 开始按钮 - 与渲染位置保持一致
    const btnX = this.width * 0.15;
    const btnY = this.height * 0.70;
    const btnW = this.width * 0.7;
    const btnH = this.height * 0.09;

    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.audioManager.playClick();
      this.startGame();
      return;
    }

    // 关卡选择 - 与渲染位置保持一致（10关，2行5列，紧凑排列）
    const levelCount = 10;
    const levelsPerRow = 5; // 5列
    const levelGap = this.width * 0.025; // 与渲染位置一致
    const levelSize = Math.min(this.width * 0.13, 55);
    const totalWidth = levelSize * levelsPerRow + levelGap * (levelsPerRow - 1);
    const levelStartX = (this.width - totalWidth) / 2;
    const levelStartY = this.height * 0.80; // 与渲染位置一致：0.80

    console.log(`[关卡选择检测] maxLevel=${this.maxLevel}, levelStartY=${levelStartY.toFixed(0)}, levelSize=${levelSize.toFixed(0)}`);

    for (let i = 0; i < levelCount; i++) {
      const row = Math.floor(i / levelsPerRow);
      const col = i % levelsPerRow;
      const lx = levelStartX + col * (levelSize + levelGap);
      const ly = levelStartY + row * (levelSize + levelGap - 8); // 与渲染位置一致

      console.log(`[关卡${i+1}] 位置: x=${lx.toFixed(0)}-${(lx+levelSize).toFixed(0)}, y=${ly.toFixed(0)}-${(ly+levelSize).toFixed(0)}`);

      if (x >= lx && x <= lx + levelSize && y >= ly && y <= ly + levelSize) {
        console.log(`[点击关卡${i+1}] 解锁状态: ${i < this.maxLevel}`);
        if (i < this.maxLevel) {
          this.audioManager.playClick();
          this.currentLevel = i + 1;
          console.log('选择关卡:', this.currentLevel);
        } else {
          console.log('关卡未解锁');
        }
        return;
      }
    }
  }

  // 处理游戏触摸（完整处理，包括物品点击）
  handleGameTouch(x, y) {
    if (!this.gameData || this.gameData.isPaused) return;

    // 检查是否是长按（长按不触发物品收集）
    if (this.isLongPress) {
      console.log('[长按] 跳过物品点击处理');
      return;
    }

    // 检查返回按钮（左上角，往下30像素）
    const backBtnSize = 35 * this.scaleRatio;
    const backBtnY = backBtnSize / 2 + 30;
    if (x <= backBtnSize + 5 && y <= backBtnY + backBtnSize / 2) {
      this.scene = 'home';
      if (this.timer) clearInterval(this.timer);
      // 停止背景音乐
      this.audioManager.stopBGM();
      // 恢复帧序列动画背景播放
      if (this.frameAnimation) {
        this.frameAnimation.play();
      }
      return;
    }

    if (x >= backBtnLeft && x <= backBtnRight && y >= backBtnTop && y <= backBtnBottom) {
      this.scene = 'home';
      if (this.timer) clearInterval(this.timer);
      // 停止背景音乐
      this.audioManager.stopBGM();
      // 恢复帧序列动画背景播放
      if (this.frameAnimation) {
        this.frameAnimation.play();
      }
      return;
    }

    // ========== 检查暂存栏点击（如果存在）==========
    const hasStorageItems = this.gameData.storageSlots.some(slot => slot !== null);
    if (hasStorageItems) {
      const slotBarY = this.height * 0.72;
      const slotBarHeight = this.height * 0.10;
      const slotCount = 7;
      const slotGap = 10 * this.scaleRatio;
      const slotSize = (this.width * 0.9 - slotGap * (slotCount - 1)) / slotCount;

      const storageSlotCount = 3;
      const storageSlotSize = slotSize * 0.7;
      const storageSlotGap = 8 * this.scaleRatio;
      const storageSlotBarWidth = storageSlotSize * storageSlotCount + storageSlotGap * (storageSlotCount - 1);
      const storageSlotBarX = (this.width - storageSlotBarWidth) / 2;
      const storageSlotBarY = slotBarY - storageSlotSize - 20; // 与渲染位置一致

      // 检查是否点击了暂存栏区域
      if (x >= storageSlotBarX && x <= storageSlotBarX + storageSlotBarWidth &&
          y >= storageSlotBarY && y <= storageSlotBarY + storageSlotSize) {
        this.handleStorageSlotClick(x, y, storageSlotBarX, storageSlotBarY, storageSlotSize, storageSlotGap);
        return;
      }
    }

    // 检查道具栏
    const propsY = this.height * 0.82;
    if (y >= propsY) {
      this.handlePropsTouch(x);
      return;
    }

    // 检查游戏区域
    const gameArea = {
      x: this.width * 0.05,
      y: this.height * 0.18,
      width: this.width * 0.9,
      height: this.width * 0.9
    };

    if (x >= gameArea.x && x <= gameArea.x + gameArea.width &&
        y >= gameArea.y && y <= gameArea.y + gameArea.height) {
      this.handleItemClick(x, y, gameArea);
    }
  }

  // 处理游戏触摸开始（只处理返回按钮，记录其他触摸区域供 onTouchEnd 使用）
  handleGameTouchStartOnly(x, y) {
    if (!this.gameData || this.gameData.isPaused) return;

    // 检查返回按钮（左上角，往下30像素，立即响应）
    const backBtnSize = 35 * this.scaleRatio;
    const backBtnY = backBtnSize / 2 + 30;
    if (x <= backBtnSize + 5 && y <= backBtnY + backBtnSize / 2) {
      this.scene = 'home';
      if (this.timer) clearInterval(this.timer);
      // 停止背景音乐
      this.audioManager.stopBGM();
      // 恢复帧序列动画背景播放
      if (this.frameAnimation) {
        this.frameAnimation.play();
      }
      this.touchedArea = 'back'; // 标记已处理
      return;
    }

    // 检查道具栏
    const propsY = this.height * 0.82;
    if (y >= propsY) {
      this.touchedArea = 'prop'; // 标记道具栏区域
      return;
    }

    // ========== 检查暂存栏点击（如果存在）==========
    const hasStorageItems = this.gameData.storageSlots.some(slot => slot !== null);
    if (hasStorageItems) {
      const slotBarY = this.height * 0.72;
      const slotBarHeight = this.height * 0.10;
      const slotCount = 7;
      const slotGap = 10 * this.scaleRatio;
      const slotSize = (this.width * 0.9 - slotGap * (slotCount - 1)) / slotCount;

      const storageSlotCount = 3;
      const storageSlotSize = slotSize * 0.7;
      const storageSlotGap = 8 * this.scaleRatio;
      const storageSlotBarWidth = storageSlotSize * storageSlotCount + storageSlotGap * (storageSlotCount - 1);
      const storageSlotBarX = (this.width - storageSlotBarWidth) / 2;
      const storageSlotBarY = slotBarY - storageSlotSize - 20;

      // 检查是否点击了暂存栏区域
      if (x >= storageSlotBarX && x <= storageSlotBarX + storageSlotBarWidth &&
          y >= storageSlotBarY && y <= storageSlotBarY + storageSlotSize) {
        this.touchedArea = 'storage'; // 标记暂存栏区域
        return;
      }
    }

    // 检查游戏区域
    const gameArea = {
      x: this.width * 0.05,
      y: this.height * 0.18,
      width: this.width * 0.9,
      height: this.width * 0.9
    };

    if (x >= gameArea.x && x <= gameArea.x + gameArea.width &&
        y >= gameArea.y && y <= gameArea.y + gameArea.height) {
      this.touchedArea = 'game'; // 标记游戏区域
    }
  }

  // 处理物品点击
  handleItemClick(x, y, gameArea) {
    const itemSize = 60 * this.scaleRatio; // 与渲染尺寸保持一致

    // ========== 调试日志：显示点击坐标 ==========
    console.log(`[点击坐标] 点击位置: (${x.toFixed(0)}, ${y.toFixed(0)})`);

    // ========== 按照渲染时的相同方式排序：zIndex 升序，y 坐标升序 ==========
    const sortedItems = this.gameData.items.slice().sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.y - b.y;
    });

    // ========== 从后往前遍历（从最上层开始检查）==========
    for (let i = sortedItems.length - 1; i >= 0; i--) {
      const item = sortedItems[i];

      // 跳过不可点击的物品
      if (!item.clickable) continue;

      // ========== 边界检查：跳过超出逻辑容器的物品 ==========
      const margin = 25;
      if (item.x < margin || item.x > 300 - margin || item.y < margin || item.y > 300 - margin) {
        console.log(`[物品跳过] ${item.emoji} 超出边界:(${item.x.toFixed(0)},${item.y.toFixed(0)})`);
        continue;
      }

      // 计算物品在屏幕上的位置
      const screenX = gameArea.x + (item.x / 300) * gameArea.width - itemSize / 2;
      const screenY = gameArea.y + (item.y / 300) * gameArea.height - itemSize / 2;

      // ========== 调试日志：显示每个可点击物品的位置范围 ==========
      const inRange = x >= screenX && x <= screenX + itemSize && y >= screenY && y <= screenY + itemSize;
      const rangeFlag = inRange ? '★命中' : '  ';
      console.log(`[物品检测] ${rangeFlag} ${item.emoji} 原始:(${item.x.toFixed(0)},${item.y.toFixed(0)}) 屏幕:(${screenX.toFixed(0)}~${(screenX+itemSize).toFixed(0)}, ${screenY.toFixed(0)}~${(screenY+itemSize).toFixed(0)}) zIndex:${item.zIndex}`);

      // 检查点击是否在物品范围内
      if (inRange) {
        console.log(`[点击成功] ${item.emoji} zIndex:${item.zIndex} ${item.isSupplement ? '(补充物品)' : '(原有物品)'}`);
        this.onItemClick(item.id);
        return;
      }
    }

    console.log('[点击检测] 未击中任何可点击物品');
  }

  // 物品点击回调
  onItemClick(itemId) {
    if (!this.gameData || this.gameData.isPaused) return;

    const itemIndex = this.gameData.items.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;

    const item = this.gameData.items[itemIndex];

    console.log(`[onItemClick] 点击物品: ${item.emoji} id:${item.id} hoveredItem:${this.hoveredItem ? this.hoveredItem.id : ''}`);

    // 检查收集栏是否已满
    const fullSlots = this.gameData.collectionSlots.filter(s => s !== null).length;
    if (fullSlots >= 7) {
      this.gameOver(false);
      return;
    }

    // 检查是否会导致游戏结束
    const willGameOver = this.willCauseGameOver(item.color, item.type);

    // 正常点击
    this.audioManager.playClick();

    // ========== 清除 hoveredItem，避免高亮已删除的物品 ==========
    this.hoveredItem = null;

    // 使用物理引擎处理点击（触发重力下落）
    if (this.physicsEnabled && this.physicsManager) {
      this.physicsManager.clickItem(itemId);
    }

    // 创建动画，完成后添加到收集栏
    this.createItemToCollectionAnimation(item, () => {
      this.addToCollection(item);
      if (willGameOver) {
        setTimeout(() => this.gameOver(false), 300);
      }
    });

    // 立即从游戏区域移除物品
    this.gameData.items.splice(itemIndex, 1);

    // 更新可点击状态
    this.gameData.items = GameLogic.updateClickable(this.gameData.items);

    // ========== 检查是否需要补充物品 ==========
    this.checkAndPushItems();
  }

  // 找到目标槽位索引（基于颜色和类型）
  findTargetSlotIndex(itemColor, itemType) {
    const items = this.gameData.collectionSlots.filter(i => i !== null);

    // 标准化目标颜色
    const normalizedItemColor = this.normalizeColor(itemColor);

    // 找到相同颜色和类型的插入位置（使用标准化颜色比较）
    let insertPos = items.length;
    for (let i = items.length - 1; i >= 0; i--) {
      const normalizedSlotColor = this.normalizeColor(items[i].color);
      if (normalizedSlotColor === normalizedItemColor && items[i].type === itemType) {
        insertPos = i + 1;
        break;
      }
    }

    return insertPos;
  }

  // 创建物品到收集栏的动画
  createItemToCollectionAnimation(item, onComplete) {
    const gameArea = {
      x: this.width * 0.05,
      y: this.height * 0.18,
      width: this.width * 0.9,
      height: this.width * 0.9
    };

    const itemSize = 60 * this.scaleRatio; // 与渲染尺寸保持一致

    // 计算起始位置（物品在游戏区域的左上角位置）
    const fromX = gameArea.x + (item.x / 300) * gameArea.width - itemSize / 2;
    const fromY = gameArea.y + (item.y / 300) * gameArea.height - itemSize / 2;

    // 计算目标位置（收集栏槽位，基于颜色和类型）
    const targetSlotIndex = this.findTargetSlotIndex(item.color, item.type);

    const slotBarY = this.height * 0.72;
    const slotBarHeight = this.height * 0.10;
    const slotCount = 7;
    const slotGap = 10 * this.scaleRatio;
    const slotSize = (this.width * 0.9 - slotGap * (slotCount - 1)) / slotCount;
    const slotBarX = (this.width - (slotSize * slotCount + slotGap * (slotCount - 1))) / 2;

    const toX = slotBarX + targetSlotIndex * (slotSize + slotGap);
    const toY = slotBarY + (slotBarHeight - slotSize) / 2;

    console.log('Creating animation:', item.emoji, 'from:', fromX, fromY, 'to:', toX, toY, 'slot:', targetSlotIndex);

    // 创建动画
    const animation = {
      type: 'itemMove',
      item: item,
      fromX: fromX,
      fromY: fromY,
      toX: toX,
      toY: toY,
      progress: 0,
      duration: 500, // 500ms动画
      startTime: Date.now(),
      onComplete: onComplete
    };

    this.animations.push(animation);
    console.log('Animation pushed, total animations:', this.animations.length);
  }

  // 检查是否会导致游戏结束（同时检查颜色和类型）
  willCauseGameOver(newItemColor, newItemType) {
    const itemCounts = {};
    for (const item of this.gameData.collectionSlots) {
      if (item) {
        // 使用标准化颜色确保匹配一致性
        const normalizedColor = this.normalizeColor(item.color);
        const key = `${normalizedColor}_${item.type}`;
        itemCounts[key] = (itemCounts[key] || 0) + 1;
      }
    }
    const normalizedNewColor = this.normalizeColor(newItemColor);
    const newKey = `${normalizedNewColor}_${newItemType}`;
    itemCounts[newKey] = (itemCounts[newKey] || 0) + 1;

    const totalItems = Object.values(itemCounts).reduce((sum, count) => sum + count, 0);
    if (totalItems < 7) return false;

    const hasMatch = Object.values(itemCounts).some(count => count >= 3);
    return !hasMatch;
  }

  // 添加到收集栏（按颜色和类型分组）
  addToCollection(item) {
    console.log('========== addToCollection ==========');
    console.log('添加物品:', item.emoji, 'color:', item.color, 'type:', item.type);

    const items = this.gameData.collectionSlots.filter(i => i !== null);
    console.log('当前收集栏物品数量:', items.length);
    console.log('当前收集栏物品详情:');
    items.forEach(i => {
      console.log(`  - ${i.emoji} color:${i.color} type:${i.type}`);
    });

    // 标准化新物品的颜色
    const normalizedItemColor = this.normalizeColor(item.color);
    // 确保 type 是数值类型
    const itemType = parseInt(item.type);

    // 找到相同颜色和类型的插入位置（使用标准化颜色比较）
    let insertPos = items.length;
    for (let i = items.length - 1; i >= 0; i--) {
      const normalizedSlotColor = this.normalizeColor(items[i].color);
      const slotType = parseInt(items[i].type);
      if (normalizedSlotColor === normalizedItemColor && slotType === itemType) {
        insertPos = i + 1;
        break;
      }
    }

    items.splice(insertPos, 0, {
      id: item.id,
      type: itemType,  // 保存为数值类型
      emoji: item.emoji,
      color: normalizedItemColor  // 使用标准化颜色，确保匹配一致性
    });

    // ========== 智能分组：让相同物品聚在一起，但保持原有的相对顺序 ==========
    // 按组收集物品
    const groups = [];
    const groupKeyToIndex = {};

    for (const item of items) {
      const normalizedColor = this.normalizeColor(item.color);
      const itemType = parseInt(item.type);
      const key = `${normalizedColor}_${itemType}`;

      if (groupKeyToIndex[key] === undefined) {
        // 新组
        groupKeyToIndex[key] = groups.length;
        groups.push([item]);
      } else {
        // 添加到已有组
        groups[groupKeyToIndex[key]].push(item);
      }
    }

    // 展平分组，保持组内顺序（添加时间顺序）
    const sortedItems = [];
    for (const group of groups) {
      sortedItems.push(...group);
    }

    console.log('After group, items:', sortedItems.map(i => `${i.emoji}(color:${i.color},type:${i.type})`).join(', '));

    // 重新填充
    this.gameData.collectionSlots = new Array(7).fill(null);
    sortedItems.forEach((item, i) => {
      this.gameData.collectionSlots[i] = item;
    });

    console.log('After add, collection slots:', this.gameData.collectionSlots.map(s => s ? `${s.emoji}(color:${s.color},type:${s.type})` : 'null').join(', '));

    // 强制刷新UI确保一致性
    this.refreshSlotUI();

    // 检查是否需要消除（基于颜色和类型）
    const itemCounts = {};
    for (const slot of this.gameData.collectionSlots) {
      if (slot) {
        const normalizedColor = this.normalizeColor(slot.color);
        const slotType = parseInt(slot.type);
        const key = `${normalizedColor}_${slotType}`;
        itemCounts[key] = (itemCounts[key] || 0) + 1;
      }
    }
    console.log('Item counts (使用标准化颜色):', itemCounts);

    const matchInfo = this.checkMatchType();
    if (matchInfo) {
      console.log('✓ Match detected, color:', matchInfo.color, 'type:', matchInfo.type, '- performing elimination');
      // 直接消除
      this.performElimination(matchInfo);
    } else {
      console.log('✗ No match detected');
      // ========== 没有三连时，检查收集栏是否已满 ==========
      const fullSlots = this.gameData.collectionSlots.filter(s => s !== null).length;
      if (fullSlots >= 7) {
        console.log('❌ 收集栏已满且无三连，游戏结束！');
        setTimeout(() => this.gameOver(false), 300);
      }
    }
  }

  // 检查是否有三连，返回匹配的 {color, type} 或 null
  checkMatchType() {
    const itemCounts = {};
    for (const item of this.gameData.collectionSlots) {
      if (item) {
        // 使用标准化颜色确保匹配一致性
        const normalizedColor = this.normalizeColor(item.color);
        const itemType = parseInt(item.type);  // 确保是数值类型
        const key = `${normalizedColor}_${itemType}`;
        itemCounts[key] = (itemCounts[key] || 0) + 1;
      }
    }

    // ========== 详细日志：显示收集栏中每种组合的数量 ==========
    console.log('[三消检查] 收集栏物品详情:');
    for (let i = 0; i < this.gameData.collectionSlots.length; i++) {
      const item = this.gameData.collectionSlots[i];
      if (item) {
        const normalizedColor = this.normalizeColor(item.color);
        const itemType = parseInt(item.type);  // 确保是数值类型
        const key = `${normalizedColor}_${itemType}`;
        console.log(`  [槽位${i}] ${item.emoji} name="${item.name}" id="${item.id}" color="${item.color}" normalized="${normalizedColor}" type=${item.type}(parsed:${itemType}) key="${key}"`);
      }
    }

    // ========== 显示所有组合统计 ==========
    console.log('[三消检查] 组合统计:');
    for (const key in itemCounts) {
      const parts = key.split('_');
      const color = parts.slice(0, -1).join('_'); // 处理颜色中可能包含下划线的情况
      const type = parseInt(parts[parts.length - 1]);
      console.log(`  - key:"${key}" 颜色:"${color}" 类型:${type} 数量:${itemCounts[key]}`);
    }

    for (const key in itemCounts) {
      if (itemCounts[key] >= 3) {
        // 解析 key 获取 color 和 type
        const parts = key.split('_');
        const color = parts.slice(0, -1).join('_');
        const type = parseInt(parts[parts.length - 1]);
        console.log(`[三消成功] 找到可消除组合: 颜色:${color} 类型:${type} 数量:${itemCounts[key]}`);
        return { color, type };
      }
    }
    console.log('[三消失败] 没有找到数量>=3的组合');
    return null;
  }

  /**
   * 强制刷新槽位UI
   * 确保槽位显示与实际数据一致
   */
  refreshSlotUI() {
    if (!this.gameData || !this.gameData.collectionSlots) return;

    // 压缩槽位，移除空隙
    const remaining = this.gameData.collectionSlots.filter(i => i !== null);
    this.gameData.collectionSlots = new Array(7).fill(null);
    remaining.forEach((item, i) => {
      this.gameData.collectionSlots[i] = item;
    });

    console.log('槽位UI已刷新:', this.gameData.collectionSlots.map(s => s ? `${s.emoji}(type:${s.type})` : 'null').join(', '));

    // 强制重绘（通过设置标志位）
    this.gameData.slotUIRefreshed = true;
    setTimeout(() => {
      this.gameData.slotUIRefreshed = false;
    }, 100);
  }

  // 执行消除（基于颜色和类型匹配）
  performElimination(matchInfo) {
    console.log('performElimination called for color:', matchInfo.color, 'type:', matchInfo.type);

    // 连击计算
    const now = Date.now();
    if (now - this.gameData.lastEliminateTime < 2000) {
      this.gameData.comboCount++;
    } else {
      this.gameData.comboCount = 1;
    }
    this.gameData.lastEliminateTime = now;

    // 计算分数
    const baseScore = 30;
    const comboBonus = Math.min(this.gameData.comboCount - 1, 5) * 10;
    this.gameData.score += baseScore + comboBonus;

    this.audioManager.playCombo(this.gameData.comboCount);

    // ========== 调试日志：显示所有槽位物品的详细信息 ==========
    console.log('[消除前] 槽位物品详情:');
    for (let i = 0; i < this.gameData.collectionSlots.length; i++) {
      const item = this.gameData.collectionSlots[i];
      if (item) {
        const normalizedColor = this.normalizeColor(item.color);
        console.log(`  [槽位${i}] emoji:${item.emoji} color:"${item.color}" normalized:"${normalizedColor}" type:${item.type}`);
      }
    }
    console.log(`[目标] matchInfo.color:"${matchInfo.color}" matchInfo.type:${matchInfo.type}`);

    // 标准化目标颜色
    const normalizedMatchColor = this.normalizeColor(matchInfo.color);
    console.log(`[目标] normalizedMatchColor:"${normalizedMatchColor}"`);

    // 找到要消除的物品（前3个相同颜色和类型的，使用标准化颜色比较）
    const eliminateItems = [];
    let count = 0;
    for (let i = 0; i < this.gameData.collectionSlots.length && count < 3; i++) {
      const slotItem = this.gameData.collectionSlots[i];
      if (slotItem) {
        const normalizedSlotColor = this.normalizeColor(slotItem.color);
        // 确保类型比较使用数值类型（避免字符串比较导致的问题）
        const slotType = parseInt(slotItem.type);
        const targetType = parseInt(matchInfo.type);
        const isMatch = normalizedSlotColor === normalizedMatchColor && slotType === targetType;

        console.log(`[比较] 槽位${i}: color="${slotItem.color}" normalized="${normalizedSlotColor}" type=${slotItem.type}(parsed:${slotType}) ` +
                    `vs targetColor="${normalizedMatchColor}" targetType=${matchInfo.type}(parsed:${targetType}) ` +
                    `match=${isMatch}`);

        if (isMatch) {
          eliminateItems.push({
            index: i,
            item: slotItem
          });
          this.gameData.collectionSlots[i] = null;
          count++;
        }
      }
    }

    console.log('Eliminating', eliminateItems.length, 'items of color:', matchInfo.color, 'type:', matchInfo.type);

    // 创建消除动画
    eliminateItems.forEach((eliminate, idx) => {
      setTimeout(() => {
        this.createEliminateAnimation(eliminate.item, eliminate.index);
        // 播放牛羊消除音效
        this.audioManager.playEliminateSound(eliminate.item.type, eliminate.item.name);
      }, idx * 100);
    });

    // 延迟压缩，让动画先播放
    setTimeout(() => {
      // 压缩
      const remaining = this.gameData.collectionSlots.filter(i => i !== null);
      this.gameData.collectionSlots = new Array(7).fill(null);
      remaining.forEach((item, i) => {
        this.gameData.collectionSlots[i] = item;
      });

      console.log('After compression:', this.gameData.collectionSlots.map(s => s ? s.emoji : 'null'));

      // ========== 修复胜利判定BUG - 同时检查场景物品和槽位 ==========
      // 胜利条件：场景无物品 且 槽位无物品
      const hasItemsInScene = this.gameData.items.length > 0;
      const hasItemsInSlots = this.gameData.collectionSlots.some(s => s !== null);

      console.log(`胜利检查: 场景物品=${this.gameData.items.length}, 槽位物品=${remaining.length}`);

      // 强制刷新UI确保槽位显示正确
      this.refreshSlotUI();

      if (!hasItemsInScene && !hasItemsInSlots) {
        // 同时满足两个条件才算胜利
        console.log('✓ 胜利条件达成！');
        this.gameOver(true);
      } else if (!hasItemsInScene && hasItemsInSlots) {
        // 场景无物品但槽位有物品 - 需要继续消除或使用道具
        console.log('⚠ 场景已清空，但槽位仍有物品，需要继续消除');
        // 不触发游戏结束，让玩家继续处理槽位物品
        // 可以在这里提示玩家使用道具
      }
    }, 600);
  }

  // 创建消除动画
  createEliminateAnimation(item, slotIndex) {
    const animation = {
      type: 'eliminate',
      item: item,
      slotIndex: slotIndex,
      progress: 0,
      duration: 500,
      startTime: Date.now()
    };
    this.animations.push(animation);
  }

  // 检查三消（旧版本，保留兼容性）
  checkMatch() {
    // 这个函数已被上面的新逻辑替代
  }

  // 处理暂存栏点击 - 取回物品到收集栏
  handleStorageSlotClick(x, y, storageSlotBarX, storageSlotBarY, storageSlotSize, storageSlotGap) {
    // 计算点击了哪个槽位
    const clickedIndex = Math.floor((x - storageSlotBarX) / (storageSlotSize + storageSlotGap));

    if (clickedIndex >= 0 && clickedIndex < 3) { // 暂存栏固定3个槽位
      const item = this.gameData.storageSlots[clickedIndex];

      if (item) {
        // 检查收集栏是否已满
        const fullSlots = this.gameData.collectionSlots.filter(s => s !== null).length;
        if (fullSlots >= 7) {
          console.log('[暂存栏] 收集栏已满，无法取回物品');
          return;
        }

        // 检查是否会导致游戏结束
        const willGameOver = this.willCauseGameOver(item.color, item.type);
        if (willGameOver) {
          console.log('[暂存栏] 取回此物品会导致游戏失败');
          return;
        }

        // 播放音效
        this.audioManager.playClick();

        // 从暂存栏移除
        this.gameData.storageSlots[clickedIndex] = null;

        // 添加到收集栏（使用相同的添加逻辑）
        this.addToCollection(item);

        console.log(`[暂存栏] 取回物品: ${item.emoji}`);
      }
    }
  }

  // 处理道具栏触摸
  handlePropsTouch(x) {
    const propsX = this.width * 0.08;
    const propsWidth = this.width * 0.84;
    const propCount = 3; // 3个道具
    const propWidth = propsWidth / propCount;

    const index = Math.floor((x - propsX) / propWidth);
    const props = ['remove', 'shuffle', 'complete'];

    if (index >= 0 && index < props.length) {
      const propKey = props[index];

      // 道具需要数量
      if (this.gameData.道具[propKey] > 0) {
        this.useProp(propKey);
      }
    }
  }

  // 使用道具
  useProp(propKey) {
    this.audioManager.playProp();

    switch (propKey) {
      case 'remove':
        // 将收集栏前3个物品移动到暂存栏
        let removed = 0;
        const itemsToMove = [];

        // 收集要移动的物品（前3个非空物品）
        for (let i = 0; i < this.gameData.collectionSlots.length && removed < 3; i++) {
          if (this.gameData.collectionSlots[i] !== null) {
            itemsToMove.push(this.gameData.collectionSlots[i]);
            this.gameData.collectionSlots[i] = null;
            removed++;
          }
        }

        // 将物品移动到暂存栏（找到空位）
        if (itemsToMove.length > 0) {
          // 压缩收集栏
          const remaining = this.gameData.collectionSlots.filter(i => i !== null);
          this.gameData.collectionSlots = new Array(7).fill(null);
          remaining.forEach((item, i) => {
            this.gameData.collectionSlots[i] = item;
          });

          // 添加到暂存栏
          let storageIndex = 0;
          for (const item of itemsToMove) {
            // 找到暂存栏的第一个空位
            while (storageIndex < this.gameData.storageSlots.length &&
                   this.gameData.storageSlots[storageIndex] !== null) {
              storageIndex++;
            }
            if (storageIndex < this.gameData.storageSlots.length) {
              this.gameData.storageSlots[storageIndex] = item;
            }
          }

          this.gameData.道具.remove--;
          this.refreshSlotUI();

          console.log(`[移除道具] 将 ${itemsToMove.length} 个物品移动到暂存栏`);
        }
        break;

      case 'shuffle':
        this.gameData.items = GameLogic.shuffleItems(this.gameData.items);
        this.gameData.道具.shuffle--;
        // 打乱后更新可点击状态
        this.gameData.items = GameLogic.updateClickable(this.gameData.items);
        break;

      case 'complete':
        // 统计收集栏中每种"颜色+类型"的数量（使用标准化颜色）
        const comboCount = {};
        this.gameData.collectionSlots.forEach(item => {
          if (item) {
            // 使用标准化颜色确保匹配一致性
            const normalizedColor = this.normalizeColor(item.color);
            const key = `${normalizedColor}_${item.type}`;
            comboCount[key] = (comboCount[key] || 0) + 1;
          }
        });

        console.log('[凑齐道具] 收集栏状态:', comboCount);

        // 找到数量最多但小于3的组合（优先凑2个的）
        let targetKey = null;
        let maxCount = 0;
        for (const key in comboCount) {
          if (comboCount[key] > maxCount && comboCount[key] < 3) {
            maxCount = comboCount[key];
            targetKey = key;
          }
        }

        console.log('[凑齐道具] 目标:', targetKey, '数量:', maxCount);

        if (targetKey && maxCount > 0) {
          const parts = targetKey.split('_');
          const targetColor = parts.slice(0, -1).join('_'); // 处理颜色中可能包含下划线的情况
          const targetType = parseInt(parts[parts.length - 1]);

          // 先查找可点击的物品（使用标准化颜色比较）
          let gameItem = this.gameData.items.find(i => {
            const normalizedItemColor = this.normalizeColor(i.color);
            return normalizedItemColor === targetColor && i.type === targetType && i.clickable;
          });

          // 如果没有可点击的，查找任何匹配的物品
          if (!gameItem) {
            console.log('[凑齐道具] 没有可点击物品，查找所有物品...');
            gameItem = this.gameData.items.find(i => {
              const normalizedItemColor = this.normalizeColor(i.color);
              return normalizedItemColor === targetColor && i.type === targetType;
            });
          }

          if (gameItem) {
            console.log('[凑齐道具] 找到物品:', gameItem.emoji, '可点击:', gameItem.clickable);

            // 如果物品不可点击，先更新可点击状态（通过移动到顶层）
            if (!gameItem.clickable) {
              // 将目标物品移到最高层级
              var maxZ = 0;
              for (var i = 0; i < this.gameData.items.length; i++) {
                if (this.gameData.items[i].zIndex > maxZ) {
                  maxZ = this.gameData.items[i].zIndex;
                }
              }
              gameItem.zIndex = maxZ + 1;
              // 更新所有物品的可点击状态
              this.gameData.items = GameLogic.updateClickable(this.gameData.items);
              console.log('[凑齐道具] 已将物品移到顶层');
            }

            // 点击物品
            this.onItemClick(gameItem.id);
            this.gameData.道具.complete--;
            console.log('[凑齐道具] 使用成功，剩余数量:', this.gameData.道具.complete);
          } else {
            console.log('[凑齐道具] 未找到匹配物品');
            // 播放失败音效或提示（可选）
          }
        } else {
          console.log('[凑齐道具] 没有可以凑齐的组合');
        }
        break;
    }
  }

  // 处理游戏结束触摸
  handleGameOverTouch(x, y) {
    const btnW = this.width * 0.35;
    const btnH = this.height * 0.08;
    const btnY = this.height * 0.65;

    // 下一关/重新开始按钮
    const nextBtnX = this.width * 0.12;
    if (x >= nextBtnX && x <= nextBtnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.audioManager.playClick();
      if (this.gameData.isWin && this.currentLevel < 4) {
        this.currentLevel++;
      }
      this.startGame();
      return;
    }

    // 返回首页按钮
    const homeBtnX = this.width * 0.53;
    if (x >= homeBtnX && x <= homeBtnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.audioManager.playClick();
      this.scene = 'home';
      // 停止背景音乐
      this.audioManager.stopBGM();
      // 恢复帧序列动画背景和音频播放
      if (this.frameAnimation) {
        this.frameAnimation.play();
      }
      return;
    }
  }

  // 开始游戏
  async startGame() {
    console.log('Starting game, level:', this.currentLevel);

    // ========== 暂停帧序列动画背景 ==========
    if (this.frameAnimation) {
      this.frameAnimation.pause();
    }

    // ========== 播放背景音乐（根据关卡）==========
    this.audioManager.playBGM(this.currentLevel);

    const config = GameLogic.getLevelConfig(this.currentLevel);
    const phase = 'early'; // 初始阶段

    // 只生成初始数量的物品（约40个）
    const initialSpawnCount = config.initialSpawnCount || 40;
    // 传入主题ID
    const items = GameLogic.generateGameItems(config, phase, initialSpawnCount, config.theme.id);

    // 初始化物理引擎
    if (this.physicsManager) {
      this.physicsManager.destroy();
    }
    this.physicsManager = new PhysicsManager(this.width, this.height);
    this.physicsEnabled = true;

    // 为物品创建物理刚体
    this.physicsManager.createItemBodies(items);

    // 立即同步一次物品位置
    this.physicsManager.syncBodyPositions();

    // 更新可点击状态
    const updatedItems = GameLogic.updateClickable(items);

    console.log('游戏初始化完成，物品数量:', updatedItems.length);
    console.log('可点击物品数量:', updatedItems.filter(i => i.clickable).length);

    this.gameData = {
      config: config,
      items: updatedItems,
      collectionSlots: new Array(7).fill(null),
      storageSlots: new Array(3).fill(null),
      score: 0,
      timeLeft: config.timeLimit,
      comboCount: 0,
      lastEliminateTime: 0,
      isPaused: false,
      道具: { remove: 3, shuffle: 3, complete: 3 },
      totalItemCount: config.itemCount,
      spawnedCount: updatedItems.length,
      remainingItemsToSpawn: config.itemCount - updatedItems.length,
      currentPhase: phase
    };

    this.scene = 'game';

    // 启动计时器
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.gameData.isPaused && this.scene === 'game') {
        this.gameData.timeLeft--;
        if (this.gameData.timeLeft <= 0) {
          this.gameOver(false);
        }
      }
    }, 1000);

    console.log('Game started successfully');
  }

  // 处理补货物品
  async handleRefillItems(newItems) {
    if (!this.gameData) return;

    console.log('Handling refill items:', newItems.length);

    // ========== 预渲染新物品的 3D 模型（等待完成）==========
    console.log('[handleRefillItems] 开始预渲染新物品3D模型...');
    await this.preRenderItems3D(newItems);
    console.log('[handleRefillItems] 新物品3D模型预渲染完成');

    // 添加物品到游戏数据
    newItems.forEach(item => {
      this.gameData.items.push(item);
    });

    // 为新物品创建物理刚体
    if (this.physicsManager) {
      this.physicsManager.addItems(newItems);
    }

    // 更新可点击状态
    this.gameData.items = GameLogic.updateClickable(this.gameData.items);

    // 播放补货音效提示
    if (this.audioManager) {
      // 可以添加一个特殊的补货音效
    }
  }

  // ========== 物品补充系统 ==========

  /**
   * 检查场上是否有可三消的组合
   * 考虑场上物品和收集栏物品的总数
   * @returns {boolean} 是否存在可三消的组合
   */
  checkHasPossibleMatch() {
    if (!this.gameData || !this.gameData.items) return false;

    // 统计场上每种"颜色+类型"组合的数量（使用标准化颜色）
    const fieldCounts = {};
    this.gameData.items.forEach(item => {
      const normalizedColor = this.normalizeColor(item.color);
      const key = `${normalizedColor}_${item.type}`;
      fieldCounts[key] = (fieldCounts[key] || 0) + 1;
    });

    // 统计收集栏每种"颜色+类型"组合的数量（使用标准化颜色）
    const slotCounts = {};
    this.gameData.collectionSlots.forEach(slot => {
      if (slot) {
        const normalizedColor = this.normalizeColor(slot.color);
        const key = `${normalizedColor}_${slot.type}`;
        slotCounts[key] = (slotCounts[key] || 0) + 1;
      }
    });

    // 合并统计
    const totalCounts = {};
    for (const key in fieldCounts) {
      totalCounts[key] = (totalCounts[key] || 0) + fieldCounts[key];
    }
    for (const key in slotCounts) {
      totalCounts[key] = (totalCounts[key] || 0) + slotCounts[key];
    }

    // ========== 详细日志：显示所有组合的数量 ==========
    console.log('[可消性检查] 场上+收集栏物品组合统计:');
    for (const key in totalCounts) {
      const parts = key.split('_');
      const color = parts[0];
      const type = parts[1];
      const fieldCount = fieldCounts[key] || 0;
      const slotCount = slotCounts[key] || 0;
      console.log(`  - 颜色:${color} 类型:${type} 总数:${totalCounts[key]} (场上:${fieldCount} 收集栏:${slotCount})`);
    }

    // 检查是否有可三消的组合
    // 条件1：任何组合总数 >= 3
    // 条件2：任何组合场上 >= 2（可以再补充1个）
    for (const key in totalCounts) {
      if (totalCounts[key] >= 3) {
        console.log(`[可消性] 找到可三消组合: ${key} 数量:${totalCounts[key]}`);
        return true; // 已经有三连可以消除
      }
    }

    for (const key in fieldCounts) {
      if (fieldCounts[key] >= 2) {
        console.log(`[可消性] 场上有2个相同，可补充: ${key}`);
        return true; // 场上有2个相同，可以补充第3个
      }
    }

    // 检查是否有暂存栏的物品可以帮助凑齐（使用标准化颜色）
    if (this.gameData.storageSlots) {
      const storageCounts = {};
      this.gameData.storageSlots.forEach(slot => {
        if (slot) {
          const normalizedColor = this.normalizeColor(slot.color);
          const key = `${normalizedColor}_${slot.type}`;
          storageCounts[key] = (storageCounts[key] || 0) + 1;
        }
      });

      for (const key in storageCounts) {
        const total = (totalCounts[key] || 0) + storageCounts[key];
        if (total >= 2) {
          console.log(`[可消性] 暂存栏+场上>=2个: ${key}`);
          return true; // 暂存栏 + 场上/收集栏 >= 2个，可以补充
        }
      }
    }

    console.log('[可消性] 警告：场上没有可三消的组合！');
    return false;
  }

  /**
   * 检查并补充物品（点击物品后调用）
   * 基于活跃物品数量控制策略
   */
  checkAndPushItems() {
    if (!this.gameData) return;

    const config = GameLogic.ITEM_COUNT_CONTROL;
    const currentCount = this.gameData.items.length;

    // 检查是否需要补充
    const needsRefill =
      this.gameData.remainingItemsToSpawn > 0 &&
      currentCount < config.minActiveItems;

    if (needsRefill) {
      this.refillFromBottom();
    } else {
      console.log(`当前物品数: ${currentCount}，待生成: ${this.gameData.remainingItemsToSpawn}，无需补充`);
    }
  }

  /**
   * 从底部补充新物品（模拟"锅里还有东西"弹跳效果）
   * 根据当前阶段和物品数量控制策略
   * 确保所有物品都能消除（每种类型都是3的倍数）
   */
  async refillFromBottom() {
    if (!this.gameData || this.gameData.remainingItemsToSpawn <= 0) return;

    const currentCount = this.gameData.items.length;
    const config = GameLogic.ITEM_COUNT_CONTROL;

    // 检查是否需要补充
    if (currentCount >= config.maxActiveItems) {
      console.log('当前物品数量已达上限，暂停补充');
      return;
    }

    // 计算本次补充数量 - 必须是3的倍数
    let refillCount = config.pushBatchSize;
    if (currentCount + refillCount > config.maxActiveItems) {
      refillCount = config.maxActiveItems - currentCount;
    }
    refillCount = Math.min(refillCount, this.gameData.remainingItemsToSpawn);
    // 确保是3的倍数
    refillCount = Math.floor(refillCount / 3) * 3;

    if (refillCount <= 0) return;

    // 计算消除进度
    const progress = 1 - (this.gameData.items.length / this.gameData.totalItemCount);
    const phase = GameLogic.getCurrentPhase(progress);

    // 获取现有物品类型
    var typeSet = {};
    this.gameData.items.forEach(function(i) {
      typeSet[i.type] = true;
    });
    var existingTypes = Object.keys(typeSet).map(function(k) { return parseInt(k); });

    // 获取当前卡槽状态
    const slotState = {};
    this.gameData.collectionSlots.forEach(slot => {
      if (slot) {
        slotState[slot.type] = (slotState[slot.type] || 0) + 1;
      }
    });

    // 使用阶段策略生成物品 - 按组生成（每次3个相同类型）
    const phaseConfig = GameLogic.PHASE_CONFIG[phase];
    const pushItems = [];

    // 计算需要生成多少组
    const groupsToSpawn = refillCount / 3;

    // ========== 检查场上是否有可三消的组合 ==========
    const hasPossibleMatch = this.checkHasPossibleMatch();
    console.log(`[三消检查] 场上${hasPossibleMatch ? '有' : '没有'}可三消的组合`);

    // 如果没有可三消的组合，第一组必须是可三消的（3个相同颜色+相同类型）
    let needsGuaranteedMatch = !hasPossibleMatch;

    for (let g = 0; g < groupsToSpawn; g++) {
      let typeId;
      let selectedColor = null;

      if (needsGuaranteedMatch) {
        // ========== 生成一组可三消的物品 ==========
        // 统计场上每种物品的数量（按标准化颜色+类型）
        const itemCounts = {};
        this.gameData.items.forEach(item => {
          const normalizedColor = this.normalizeColor(item.color);
          const key = `${normalizedColor}_${item.type}`;
          itemCounts[key] = (itemCounts[key] || 0) + 1;
        });

        // 找到数量最多但小于3的组合（优先凑2个的，补充1个就能三消）
        let bestKey = null;
        let maxCount = 0;
        for (const key in itemCounts) {
          if (itemCounts[key] > maxCount && itemCounts[key] < 3) {
            maxCount = itemCounts[key];
            bestKey = key;
          }
        }

        if (bestKey && maxCount > 0) {
          // 补充1个就能凑齐3个
          const [color, type] = bestKey.split('_');
          typeId = parseInt(type);
          selectedColor = color;
          console.log(`[三消保障] 补充1个凑齐: ${typeId} ${color} (已有${maxCount}个)`);
        } else {
          // 没有可补充的组合，生成全新的3个
          typeId = existingTypes[Math.floor(Math.random() * existingTypes.length)];
          const itemType = GameLogic.findItemTypeById(typeId);
          const colorVariants = itemType.colorVariants || [itemType.color || '#CCCCCC'];
          selectedColor = colorVariants[Math.floor(Math.random() * colorVariants.length)];
          console.log(`[三消保障] 生成全新组合: ${typeId} ${selectedColor}`);
        }

        needsGuaranteedMatch = false; // 已处理，后续组不需要保证
      } else {
        // ========== 正常阶段策略 ==========
        if (phase === 'late' && phaseConfig.createOddSlots) {
          typeId = GameLogic.selectItemForOddSlots(existingTypes, slotState);
        } else if (phase === 'middle' && phaseConfig.buryKeyItems) {
          typeId = GameLogic.selectExistingItemPriority(existingTypes, slotState);
        } else {
          typeId = GameLogic.selectItemBySizeBias(existingTypes, phaseConfig.itemSizeBias);
        }
      }

      const itemType = GameLogic.findItemTypeById(typeId);
      const size = GameLogic.getItemSize(typeId);

      // 如果没有指定颜色，随机选择
      if (!selectedColor) {
        const colorVariants = itemType.colorVariants || [itemType.color || '#CCCCCC'];
        selectedColor = colorVariants[Math.floor(Math.random() * colorVariants.length)];
      }

      // 每组生成3个相同颜色+相同类型的物品（确保可三消）
      for (let i = 0; i < 3; i++) {
        pushItems.push({
          id: `refill_${typeId}_${g}_${i}_${Date.now()}_${Math.random()}`,
          type: typeId,
          name: itemType.name,
          emoji: itemType.emoji,
          color: selectedColor,
          size: size,
          sizeConfig: GameLogic.ITEM_SIZE_CONFIG[size]
        });
      }
    }

    if (pushItems.length === 0) return;

    console.log(`从底部弹起 ${pushItems.length} 个物品 (${groupsToSpawn}组) [阶段:${phase}]，剩余待生成: ${this.gameData.remainingItemsToSpawn - refillCount}`);

    // ========== 预渲染补充物品的 3D 模型（等待完成）==========
    console.log('[refillFromBottom] 开始预渲染补充物品3D模型...');
    await this.preRenderItems3D(pushItems);
    console.log('[refillFromBottom] 补充物品3D模型预渲染完成');

    this.gameData.remainingItemsToSpawn -= refillCount;
    this.gameData.spawnedCount += refillCount;

    // 为补充物品生成位置（使用物理引擎弹跳效果）
    const containerWidth = 300;
    const containerHeight = 300;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    // 限制物品在较小的半径内，确保不超出边界
    const containerRadius = Math.min(containerWidth, containerHeight) / 2 - 50;
    const spawnRadius = containerRadius * 0.4; // 限制在中心40%半径内

    // ========== 获取现有物品的最低 zIndex，补充物品应该在最底层 ==========
    const existingZIndexes = this.gameData.items.map(i => i.zIndex);
    var minZIndex = 0;
    if (existingZIndexes.length > 0) {
      minZIndex = existingZIndexes[0];
      for (var i = 1; i < existingZIndexes.length; i++) {
        if (existingZIndexes[i] < minZIndex) {
          minZIndex = existingZIndexes[i];
        }
      }
    }
    // 补充物品的 zIndex 从最低值-1 开始，确保在最底层（在所有原有物品下面）
    const supplementBaseZIndex = minZIndex - 1;

    // ========== 调试日志：显示 zIndex 分配情况 ==========
    console.log(`[补充物品] 现有物品最小zIndex: ${minZIndex}, 补充物品起始zIndex: ${supplementBaseZIndex}`);

    pushItems.forEach((item, index) => {
      // ========== 在容器中心附近生成（确保在边界内）==========
      const angle = Math.random() * Math.PI * 2;
      // 在中心区域随机分布（40%半径内，约44px）
      const radius = Math.random() * spawnRadius;

      // 从中心偏下位置生成
      item.x = centerX + Math.cos(angle) * radius;
      item.y = centerY + 30; // 中心下方30px

      // 确保坐标在有效范围内
      item.x = Math.max(30, Math.min(270, item.x));
      item.y = Math.max(30, Math.min(270, item.y));

      // ========== zIndex 设置：补充物品在最底层 ==========
      item.zIndex = supplementBaseZIndex; // 所有补充物品使用相同的低 zIndex
      item.layer = 'bottom';
      item.clickable = false; // 初始不可点击（在底层，被遮挡）
      item.isSupplement = true; // 标记为补充物品

      // ========== 设置较小的弹跳初速度（避免跳出边界）==========
      item.initialForce = {
        x: Math.cos(angle) * 0.15, // 向外扩散力度减小
        y: 0.5 + Math.random() * 0.3 // 向上弹起力度减小
      };
      item.initialAngularVel = (Math.random() - 0.5) * 0.05; // 随机旋转减小
    });

    // ========== 添加到游戏数据（只添加一次）==========
    pushItems.forEach(item => {
      this.gameData.items.push(item);
    });

    console.log(`[补充物品] 已添加 ${pushItems.length} 个物品到游戏区域`);

    // ========== 为补充物品创建物理刚体（必须有物理刚体才能弹跳）==========
    if (this.physicsManager) {
      pushItems.forEach(item => {
        this.physicsManager.createItemBody(item);
      });
      console.log('[补充物品] 已为补充物品创建物理刚体');
    }

    // ========== 延迟更新可点击状态（确保物理引擎已经处理）==========
    setTimeout(() => {
      if (this.gameData) {
        // 重新计算可点击状态，确保补充物品正确显示为可点击
        this.gameData.items = GameLogic.updateClickable(this.gameData.items);

        // 验证补充物品的可点击状态
        const supplementItems = this.gameData.items.filter(i => i.isSupplement);
        const clickableSupplements = supplementItems.filter(i => i.clickable);
        console.log(`[补充物品] 总数: ${supplementItems.length}, 可点击: ${clickableSupplements.length}`);
      }
    }, 300);
  }

  // 游戏结束
  gameOver(isWin) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.scene = 'gameover';
    this.gameData.isWin = isWin;

    if (this.gameData.score > this.highScore) {
      this.highScore = this.gameData.score;
      this.saveGameData();
    }

    if (isWin && this.currentLevel >= this.maxLevel && this.currentLevel < 4) {
      this.maxLevel = this.currentLevel + 1;
      this.saveGameData();
    }

    // 停止背景音乐
    this.audioManager.stopBGM();

    if (isWin) {
      this.audioManager.playWin();
    } else {
      this.audioManager.playLose();
    }
  }

  /**
   * 检测 WebGL 是否可用
   */
  checkWebGLAvailable() {
    // WebGL 可用，因为我们要在游戏场景使用 3D 模型
    return true;
  }

  // 渲染循环
  render() {
    // 调试日志
    if (Math.random() < 0.01) { // 偶尔打印，避免刷屏
      console.log('[render] scene:', this.scene);
    }

    // ========== 根据场景渲染 ==========
    if (this.scene === 'home') {
      // 首页使用 2D 渲染
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this.renderHome();
    } else if (this.scene === 'game') {
      // 游戏场景使用 2D 渲染，物品使用 emoji 或预渲染图片
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this.renderGame();
    } else if (this.scene === 'gameover') {
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this.renderGame();
      this.renderGameOver();
    }

    // 微信小程序使用 wx.requestAnimationFrame
    if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
      wx.requestAnimationFrame(() => this.render());
    } else if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.render());
    } else {
      // 备用方案：使用 setTimeout
      setTimeout(() => this.render(), 16);
    }
  }

  // 渲染首页
  renderHome() {
    // 测试：绘制一个简单的红色背景，确认 canvas 能正常工作
    this.ctx.fillStyle = '#FFE5E8'; // 浅粉色背景
    this.ctx.fillRect(0, 0, this.width, this.height);

    // ========== 帧序列动画背景控制 ==========
    // 确保动画在首页播放
    if (this.frameAnimation && !this.frameAnimation.isPlaying) {
      this.frameAnimation.play();
    }

    // 绘制帧序列动画背景
    const animRendered = this.frameAnimation && this.frameAnimation.render(this.ctx, this.width, this.height);

    // 如果动画未加载，使用图片背景作为备用
    if (!animRendered) {
      if (this.imagesLoaded && this.images.background) {
        const img = this.images.background;
        // 计算 cover 模式的尺寸和位置
        const imgRatio = img.width / img.height;
        const screenRatio = this.width / this.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > screenRatio) {
          // 图片更宽，以高度为准
          drawHeight = this.height;
          drawWidth = this.height * imgRatio;
          offsetX = (this.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          // 图片更高，以宽度为准
          drawWidth = this.width;
          drawHeight = this.width / imgRatio;
          offsetX = 0;
          offsetY = (this.height - drawHeight) / 2;
        }
        this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      }
      // 如果图片也没加载，就使用开始时绘制的浅粉色背景
    }

    // 统计信息区域 - 纪念碑谷风格
    const statsY = this.height * 0.28;
    const statsPadding = 15;
    const statsText = `最高分: ${this.highScore}  |  已解锁: ${this.maxLevel}关`;

    this.ctx.font = `${16 * this.scaleRatio}px sans-serif`;
    const statsTextWidth = this.ctx.measureText(statsText).width;
    const statsBoxWidth = statsTextWidth + statsPadding * 2;
    const statsBoxHeight = 40;
    const statsBoxX = (this.width - statsBoxWidth) / 2;
    const statsBoxY = statsY - statsBoxHeight / 2;

    // 使用纪念碑谷风格统计框
    this.drawMonumentStatsBox(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight);

    // 统计文字
    this.ctx.fillStyle = '#4A4A4A';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(statsText, this.width / 2, statsY);

    // ========== 开始按钮 - 纪念碑谷风格 ==========
    const btnX = this.width * 0.15;
    const btnY = this.height * 0.70;
    const btnW = this.width * 0.7;
    const btnH = this.height * 0.09;

    // 使用纪念碑谷风格按钮
    this.drawMonumentButton(btnX, btnY, btnW, btnH, `开始游戏 (第${this.currentLevel}关)`, true);

    // ========== 关卡选择 - 纪念碑谷风格 ==========
    const levelCount = 10;
    const levelsPerRow = 5;
    const levelGap = this.width * 0.025;
    const levelSize = Math.min(this.width * 0.13, 55);
    const totalWidth = levelSize * levelsPerRow + levelGap * (levelsPerRow - 1);
    const levelStartX = (this.width - totalWidth) / 2;
    const levelStartY = this.height * 0.80;

    for (let i = 0; i < levelCount; i++) {
      const row = Math.floor(i / levelsPerRow);
      const col = i % levelsPerRow;
      const lx = levelStartX + col * (levelSize + levelGap);
      const ly = levelStartY + row * (levelSize + levelGap - 8);

      const isUnlocked = i < this.maxLevel;
      const isCurrent = i === this.currentLevel - 1;

      // 使用关卡图标
      this.drawMonumentLevelBox(lx, ly, levelSize, i + 1, isUnlocked, isCurrent);
    }
  }

  // 渲染游戏
  renderGame() {
    // 调试日志
    if (Math.random() < 0.01) { // 偶尔打印，避免刷屏
      console.log('[renderGame] gameData:', !!this.gameData, 'items:', this.gameData ? this.gameData.items.length : 0);
    }

    if (!this.gameData) return;

    // 更新物理引擎
    if (this.physicsEnabled && this.physicsManager && !this.gameData.isPaused) {
      this.physicsManager.update(16); // 约60fps
    }

    // ========== 限制所有物品坐标在有效范围内 ==========
    if (this.gameData && this.gameData.items) {
      const margin = 25;
      this.gameData.items.forEach(item => {
        // 限制 x, y 在有效范围内
        if (item.x < margin) item.x = margin;
        if (item.x > 300 - margin) item.x = 300 - margin;
        if (item.y < margin) item.y = margin;
        if (item.y > 300 - margin) item.y = 300 - margin;
      });
    }

    // 实时更新指向状态（如果有触摸位置）
    if (this.currentTouchX !== null && this.currentTouchY !== null) {
      this.updateHoveredItem(this.currentTouchX, this.currentTouchY);
    }

    // ========== 绘制游戏页面背景 ==========
    // 根据关卡使用不同的背景图
    if (this.currentLevel === 1) {
      this.drawLevel1Background();
    } else if (this.currentLevel === 2) {
      this.drawLevel2Background();
    } else if (this.currentLevel === 3) {
      this.drawLevel3Background();
    } else if (this.currentLevel === 4) {
      this.drawLevel4Background();
    } else {
      this.drawGameBackground();
    }

    // 顶部信息栏 - 纪念碑谷风格
    const topBarHeight = this.height * 0.12;
    const topBarGradient = this.ctx.createLinearGradient(0, 0, 0, topBarHeight);
    topBarGradient.addColorStop(0, '#FFF5F7');
    topBarGradient.addColorStop(1, '#FED6E3');
    this.ctx.fillStyle = topBarGradient;
    this.ctx.fillRect(0, 0, this.width, topBarHeight);

    // 顶部信息栏底边
    this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, topBarHeight);
    this.ctx.lineTo(this.width, topBarHeight);
    this.ctx.stroke();

    // 返回按钮 - 纪念碑谷风格圆形按钮，使用关卡主题深色
    const backBtnSize = 35 * this.scaleRatio;
    const backBtnX = backBtnSize / 2 + 5;
    const backBtnY = backBtnSize / 2 + 30;
    const themeColors = this.getThemeColors();
    this.drawMonumentCircleBorder(backBtnX, backBtnY, backBtnSize / 2, themeColors.accent);

    // 返回箭头 - 使用深色
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${20 * this.scaleRatio}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('◀', backBtnX, backBtnY);

    // 关卡和时间 - 纪念碑谷风格颜色
    this.ctx.fillStyle = '#4A4A4A';
    this.ctx.font = `${16 * this.scaleRatio}px sans-serif`;
    this.ctx.textAlign = 'left';
    const timeColor = this.gameData.timeLeft <= 10 ? '#FF6B9D' : '#4A4A4A';
    this.ctx.fillText(`关卡${this.gameData.config.level}`, backBtnSize + 15, topBarHeight * 0.35 + 10);
    this.ctx.fillStyle = timeColor;
    this.ctx.fillText(`时间 ${this.gameData.timeLeft}s`, backBtnSize + 15, topBarHeight * 0.7 + 10);

    // 分数
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = '#4A4A4A';
    this.ctx.fillText(`分数 ${this.gameData.score}`, this.width - 15, topBarHeight * 0.5);

    // 游戏区域 - 纪念碑谷风格建筑几何边框
    const gameArea = {
      x: this.width * 0.05,
      y: this.height * 0.18,
      width: this.width * 0.9,
      height: this.width * 0.9
    };

    // 使用纪念碑谷风格游戏区域边框
    this.drawMonumentGameBorder(gameArea);

    // 内容器背景 - 浅色渐变
    const cx = gameArea.x;
    const cy = gameArea.y;
    const cw = gameArea.width;
    const ch = gameArea.height;

    const innerGradient = this.ctx.createRadialGradient(
      cx + cw / 2, cy + ch / 2, 0,
      cx + cw / 2, cy + ch / 2, cw / 2 - 12
    );
    innerGradient.addColorStop(0, '#FFFBFB');
    innerGradient.addColorStop(0.8, '#FFF5F7');
    innerGradient.addColorStop(1, '#FED6E3');

    this.ctx.fillStyle = innerGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(cx + cw / 2, cy + ch / 2, cw / 2 - 12, ch / 2 - 12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 内边缘阴影
    this.ctx.strokeStyle = 'rgba(255, 107, 157, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.ellipse(cx + cw / 2, cy + ch / 2, cw / 2 - 12, ch / 2 - 12, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // ========== 收集栏 - 纪念碑谷风格 ==========
    const slotBarY = this.height * 0.72;
    const slotBarHeight = this.height * 0.10;
    const slotCount = 7;
    const slotGap = 4 * this.scaleRatio;  // 减小间距：从10改为4
    const slotSize = (this.width * 0.95 - slotGap * (slotCount - 1)) / slotCount;  // 增大宽度：从0.9改为0.95
    const slotBarX = (this.width - (slotSize * slotCount + slotGap * (slotCount - 1))) / 2;

    // themeColors 已在前面声明，直接使用

    // 绘制纪念碑谷风格收集栏边框（使用主题色）
    this.drawMonumentCollectionBarThemed(slotBarX - 8, slotBarY - 4,
      slotSize * slotCount + slotGap * (slotCount - 1) + 16, slotBarHeight + 8, themeColors);

    for (let i = 0; i < slotCount; i++) {
      const slotX = slotBarX + i * (slotSize + slotGap);
      const slotY = slotBarY + (slotBarHeight - slotSize) / 2;

      // 槽位背景 - 使用关卡主题色渐变
      const slotGradient = this.ctx.createLinearGradient(slotX, slotY, slotX, slotY + slotSize);
      slotGradient.addColorStop(0, themeColors.primary);
      slotGradient.addColorStop(1, themeColors.secondary);
      this.ctx.fillStyle = slotGradient;
      this.ctx.beginPath();
      this.roundRect(slotX, slotY, slotSize, slotSize, 6);
      this.ctx.fill();

      // 槽位内边框 - 使用主题色，加深颜色使更清晰
      this.ctx.strokeStyle = this.darkenColor(themeColors.accent, 30);
      this.ctx.globalAlpha = 0.7;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.roundRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4, 4);
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;

      const item = this.gameData.collectionSlots[i];
      if (item) {
        // 物品背景 - 渐变
        const gradient = this.ctx.createRadialGradient(
          slotX + slotSize / 3, slotY + slotSize / 3, slotSize * 0.1,
          slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 2
        );
        gradient.addColorStop(0, this.lightenColor(item.color, 30));
        gradient.addColorStop(1, item.color);

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 4, 0, Math.PI * 2);
        this.ctx.fill();

        // 高光
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.beginPath();
        this.ctx.arc(slotX + slotSize / 2 - slotSize * 0.15, slotY + slotSize / 2 - slotSize * 0.15, slotSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        // 边框
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 4, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold ${slotSize * 0.5}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(item.emoji, slotX + slotSize / 2, slotY + slotSize / 2);
      } else {
        // 空槽位 - 装饰性加号
        this.ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        this.ctx.font = `${slotSize * 0.45}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('+', slotX + slotSize / 2, slotY + slotSize / 2);
      }
    }

    // ========== 暂存栏 - 纪念碑谷风格 ==========
    const hasStorageItems = this.gameData.storageSlots.some(slot => slot !== null);

    if (hasStorageItems) {
      const storageSlotCount = 3;
      const storageSlotSize = slotSize * 0.7;
      const storageSlotGap = 8 * this.scaleRatio;
      const storageSlotBarWidth = storageSlotSize * storageSlotCount + storageSlotGap * (storageSlotCount - 1);
      const storageSlotBarX = (this.width - storageSlotBarWidth) / 2;
      const storageSlotBarY = slotBarY - storageSlotSize - 20;

      // 绘制暂存栏边框（金色边框，纪念碑谷风格）
      this.ctx.fillStyle = 'rgba(255, 230, 109, 0.15)';
      this.ctx.beginPath();
      this.roundRect(storageSlotBarX - 6, storageSlotBarY - 4, storageSlotBarWidth + 12, storageSlotSize + 8, 8);
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(255, 230, 109, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // 绘制暂存栏槽位
      for (let i = 0; i < storageSlotCount; i++) {
        const slotX = storageSlotBarX + i * (storageSlotSize + storageSlotGap);
        const slotY = storageSlotBarY;

        // 槽位背景（金色系）
        const slotGradient = this.ctx.createLinearGradient(slotX, slotY, slotX, slotY + storageSlotSize);
        slotGradient.addColorStop(0, '#FFF8DC');
        slotGradient.addColorStop(1, '#FFE5B4');
        this.ctx.fillStyle = slotGradient;
        this.ctx.beginPath();
        this.roundRect(slotX, slotY, storageSlotSize, storageSlotSize, 5);
        this.ctx.fill();

        // 槽位边框
        this.ctx.strokeStyle = 'rgba(255, 230, 109, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        const item = this.gameData.storageSlots[i];
        if (item) {
          // 绘制物品
          const gradient = this.ctx.createRadialGradient(
            slotX + storageSlotSize / 3, slotY + storageSlotSize / 3, storageSlotSize * 0.1,
            slotX + storageSlotSize / 2, slotY + storageSlotSize / 2, storageSlotSize / 2 - 2
          );
          gradient.addColorStop(0, this.lightenColor(item.color, 30));
          gradient.addColorStop(1, item.color);

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(slotX + storageSlotSize / 2, slotY + storageSlotSize / 2, storageSlotSize / 2 - 3, 0, Math.PI * 2);
          this.ctx.fill();

          // 高光
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(slotX + storageSlotSize / 2 - storageSlotSize * 0.15, slotY + storageSlotSize / 2 - storageSlotSize * 0.15, storageSlotSize * 0.12, 0, Math.PI * 2);
          this.ctx.fill();

          // 绘制emoji
          this.ctx.fillStyle = '#000000';
          this.ctx.font = `bold ${storageSlotSize * 0.5}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(item.emoji, slotX + storageSlotSize / 2, slotY + storageSlotSize / 2);
        } else {
          // 空槽位
          this.ctx.fillStyle = 'rgba(255, 230, 109, 0.3)';
          this.ctx.font = `${storageSlotSize * 0.3}px sans-serif`;
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText('···', slotX + storageSlotSize / 2, slotY + storageSlotSize / 2);
        }
      }
    }

    // ========== 绘制游戏物品 - 在收集栏之上 ==========
    const itemSize = 60 * this.scaleRatio; // 放大物品尺寸（原45，现在60）

    // 排序：先按 zIndex，zIndex 相同时按 y 坐标（y 大的在后绘制，覆盖上面的）
    const sortedItems = this.gameData.items.slice().sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.y - b.y; // y 小的先绘制
    });

    // 调试：每秒打印一次物品数量
    if (!this.lastDebugPrint || Date.now() - this.lastDebugPrint > 1000) {
      this.lastDebugPrint = Date.now();
      console.log('渲染中 - 物品总数:', sortedItems.length, '可点击:', sortedItems.filter(i => i.clickable).length);
    }

    // ========== 使用 3D 预渲染图片绘制物品 ==========
    sortedItems.forEach(item => {
      const screenX = gameArea.x + (item.x / 300) * gameArea.width - itemSize / 2;
      const screenY = gameArea.y + (item.y / 300) * gameArea.height - itemSize / 2;
      const isHovered = this.hoveredItem && this.hoveredItem.id === item.id;

      let use3D = false;
      if (this.use3DModels && this.threeScene && item.renderedImage) {
        // 使用预渲染的 3D 图片
        use3D = true;
        // 阴影
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(screenX + itemSize / 2, screenY + itemSize / 2 + itemSize * 0.4,
                          itemSize * 0.4, itemSize * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 绘制预渲染的 3D 图片
        this.ctx.drawImage(item.renderedImage, screenX, screenY, itemSize, itemSize);

        // ========== 指向/点击高亮 - 金色光芒效果 ==========
        if (isHovered && item.clickable) {
          this.drawGoldenGlow(screenX, screenY, itemSize);
        }

        // 不可点击时变暗
        if (!item.clickable) {
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(screenX + itemSize / 2, screenY + itemSize / 2, itemSize / 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }

      // 如果 3D 未使用或失败，使用 2D 绘制
      if (!use3D) {
        this.drawItem3D(item, screenX, screenY, itemSize, isHovered);
      }
    });

    // 调试：打印 3D 模型使用情况
    if (!this.last3DDebugPrint || Date.now() - this.last3DDebugPrint > 2000) {
      this.last3DDebugPrint = Date.now();
      const itemsWith3D = sortedItems.filter(i => i.renderedImage).length;
      console.log('[3D模型] 物品总数:', sortedItems.length, '有3D模型:', itemsWith3D,
                  'use3DModels:', this.use3DModels, 'threeScene:', !!this.threeScene);
    }

    // ========== 绘制移动动画 - 在最上层（在收集栏之上） ==========
    this.updateAndDrawAnimations();

    // 道具栏 - 纪念碑谷风格
    const propsY = this.height * 0.83;
    const propsHeight = this.height * 0.12;
    const propsX = this.width * 0.08;
    const propsWidth = this.width * 0.84;
    const propCount = 3;
    const propWidth = propsWidth / propCount;
    const props = [
      { key: 'remove', icon: '❌', name: '移除' },
      { key: 'shuffle', icon: '🔀', name: '重排' },
      { key: 'complete', icon: '✨', name: '凑齐' }
    ];

    props.forEach((prop, i) => {
      const px = propsX + i * propWidth;
      const pSize = Math.min(propWidth - 12, propsHeight * 0.85);
      const px2 = px + (propWidth - pSize) / 2;
      const py2 = propsY + (propsHeight - pSize) / 2;

      // 判断按钮是否激活
      const isActive = this.gameData.道具[prop.key] > 0;

      // 使用纪念碑谷风格道具按钮
      this.drawMonumentPropButton(px2, py2, pSize, pSize, isActive, prop.key);

      // 绘制图标
      this.ctx.fillStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = `${pSize * 0.45}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(prop.icon, px2 + pSize / 2, py2 + pSize * 0.35);

      // 绘制名称/数量
      const count = this.gameData.道具[prop.key];
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = `${pSize * 0.22}px sans-serif`;
      this.ctx.fillText(count > 0 ? `×${count}` : prop.name, px2 + pSize / 2, py2 + pSize * 0.7);
    });
  }

  // 渲染游戏结束 - 纪念碑谷风格
  renderGameOver() {
    const isWin = this.gameData.isWin;

    // 半透明背景 - 纪念碑谷风格颜色
    this.ctx.fillStyle = 'rgba(44, 62, 80, 0.75)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 弹窗 - 纪念碑谷风格
    const modalW = this.width * 0.8;
    const modalH = this.height * 0.45;
    const modalX = (this.width - modalW) / 2;
    const modalY = (this.height - modalH) / 2;

    // 弹窗阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.drawMonumentRect(modalX + 5, modalY + 5, modalW, modalH, 16);
    this.ctx.fill();

    // 弹窗背景 - 渐变
    const modalGradient = this.ctx.createLinearGradient(modalX, modalY, modalX, modalY + modalH);
    modalGradient.addColorStop(0, '#FFFBFB');
    modalGradient.addColorStop(1, '#FFF5F7');
    this.ctx.fillStyle = modalGradient;
    this.drawMonumentRect(modalX, modalY, modalW, modalH, 16);
    this.ctx.fill();

    // 弹窗外边框
    this.ctx.strokeStyle = isWin ? this.monumentColors.monumentGold : this.monumentColors.monumentPink;
    this.ctx.lineWidth = 3;
    this.drawMonumentRect(modalX, modalY, modalW, modalH, 16);
    this.ctx.stroke();

    // 弹窗内边框
    this.ctx.strokeStyle = isWin ? 'rgba(255, 230, 109, 0.4)' : 'rgba(255, 107, 157, 0.3)';
    this.ctx.lineWidth = 2;
    this.drawMonumentRect(modalX + 3, modalY + 3, modalW - 6, modalH - 6, 14);
    this.ctx.stroke();

    // 标题 - 纪念碑谷风格颜色
    this.ctx.fillStyle = isWin ? '#FF6B9D' : '#A8D8EA';
    this.ctx.font = `bold ${32 * this.scaleRatio}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(isWin ? '🎉 恭喜通关！' : '😢 游戏结束', this.width / 2, modalY + modalH * 0.2);

    // 星级 - 使用图片绘制
    const starCount = isWin ? 3 : 0;
    const starSize = 40 * this.scaleRatio;
    const starGap = 10 * this.scaleRatio;
    const totalStarsWidth = starSize * 3 + starGap * 2;
    const starStartX = (this.width - totalStarsWidth) / 2;

    for (let i = 0; i < 3; i++) {
      const starX = starStartX + i * (starSize + starGap);
      const starY = modalY + modalH * 0.4 - starSize / 2;

      if (i < starCount) {
        // 实心星星（通关）- 金色
        if (this.images['star-filled'] && this.images['star-filled'].complete) {
          this.ctx.drawImage(this.images['star-filled'], starX, starY, starSize, starSize);
        } else {
          this.ctx.fillStyle = '#FFE66D';
          this.ctx.font = `${starSize}px sans-serif`;
          this.ctx.fillText('⭐', starX + starSize / 2, starY + starSize / 2);
        }
      } else {
        // 空心星星（失败）- 浅灰
        if (this.images['star-empty'] && this.images['star-empty'].complete) {
          this.ctx.drawImage(this.images['star-empty'], starX, starY, starSize, starSize);
        } else {
          this.ctx.fillStyle = '#E0E0E0';
          this.ctx.font = `${starSize}px sans-serif`;
          this.ctx.fillText('☆', starX + starSize / 2, starY + starSize / 2);
        }
      }
    }

    // 统计 - 纪念碑谷风格颜色
    this.ctx.fillStyle = '#5A5A5A';
    this.ctx.font = `${18 * this.scaleRatio}px sans-serif`;
    this.ctx.fillText(`关卡: ${this.currentLevel}`, this.width / 2, modalY + modalH * 0.55);
    this.ctx.fillText(`得分: ${this.gameData.score}`, this.width / 2, modalY + modalH * 0.62);
    this.ctx.fillText(`最高分: ${this.highScore}`, this.width / 2, modalY + modalH * 0.69);

    // 按钮 - 纪念碑谷风格
    const btnW = this.width * 0.35;
    const btnH = this.height * 0.08;
    const btnY = modalY + modalH * 0.82;

    // 下一关/重新开始按钮 - 青色
    this.drawMonumentBorder(this.width * 0.12, btnY, btnW, btnH, 10, 'teal');
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = `${20 * this.scaleRatio}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const nextText = isWin && this.currentLevel < 4 ? '下一关' : '重新开始';
    this.ctx.fillText(nextText, this.width * 0.12 + btnW / 2, btnY + btnH / 2);

    // 返回首页按钮 - 粉色
    this.drawMonumentBorder(this.width * 0.53, btnY, btnW, btnH, 10, 'pink');
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('返回首页', this.width * 0.53 + btnW / 2, btnY + btnH / 2);
  }

  /**
   * 渲染游戏UI覆盖层（用于完整3D模式）
   * 在3D场景之上绘制分数、时间、道具等UI
   */
  renderGameUI() {
    if (!this.gameData) return;

    // 使用 UI canvas 绘制
    const ctx = this.ctxUI || this.ctx;
    if (!ctx) return;

    // 清空 UI canvas
    ctx.clearRect(0, 0, this.width, this.height);

    // ========== 顶部信息栏 - 纪念碑谷风格 ==========
    const topBarHeight = this.height * 0.12;
    const topBarGradient = ctx.createLinearGradient(0, 0, 0, topBarHeight);
    topBarGradient.addColorStop(0, '#FFF5F7');
    topBarGradient.addColorStop(1, '#FED6E3');
    ctx.fillStyle = topBarGradient;
    ctx.fillRect(0, 0, this.width, topBarHeight);

    // 顶部信息栏底边
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, topBarHeight);
    ctx.lineTo(this.width, topBarHeight);
    ctx.stroke();

    // 返回按钮 - 纪念碑谷风格圆形按钮
    const backBtnSize = 35 * this.scaleRatio;
    const backBtnX = backBtnSize / 2 + 5;
    const backBtnY = backBtnSize / 2 + 30;
    const themeColors = this.getThemeColors();
    this.drawMonumentCircleBorder(backBtnX, backBtnY, backBtnSize / 2, themeColors.accent);

    // 返回箭头
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${20 * this.scaleRatio}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◀', backBtnX, backBtnY);

    // 关卡和时间
    ctx.fillStyle = '#4A4A4A';
    ctx.font = `${16 * this.scaleRatio}px sans-serif`;
    ctx.textAlign = 'left';
    const timeColor = this.gameData.timeLeft <= 10 ? '#FF6B9D' : '#4A4A4A';
    ctx.fillText(`关卡${this.gameData.config.level}`, backBtnSize + 15, topBarHeight * 0.35 + 10);
    ctx.fillStyle = timeColor;
    ctx.fillText(`时间 ${this.gameData.timeLeft}s`, backBtnSize + 15, topBarHeight * 0.7 + 10);

    // 分数
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4A4A4A';
    ctx.fillText(`分数 ${this.gameData.score}`, this.width - 15, topBarHeight * 0.5);

    // ========== 收集栏 - 纪念碑谷风格 ==========
    const slotBarY = this.height * 0.72;
    const slotBarHeight = this.height * 0.10;
    const slotCount = 7;
    const slotGap = 4 * this.scaleRatio;
    const slotSize = (this.width * 0.95 - slotGap * (slotCount - 1)) / slotCount;
    const slotBarX = (this.width - (slotSize * slotCount + slotGap * (slotCount - 1))) / 2;

    // 绘制纪念碑谷风格收集栏边框
    this.drawMonumentCollectionBarThemed(slotBarX - 8, slotBarY - 4,
      slotSize * slotCount + slotGap * (slotCount - 1) + 16, slotBarHeight + 8, themeColors);

    for (let i = 0; i < slotCount; i++) {
      const slotX = slotBarX + i * (slotSize + slotGap);
      const slotY = slotBarY + (slotBarHeight - slotSize) / 2;

      // 槽位背景
      const slotGradient = ctx.createLinearGradient(slotX, slotY, slotX, slotY + slotSize);
      slotGradient.addColorStop(0, themeColors.primary);
      slotGradient.addColorStop(1, themeColors.secondary);
      ctx.fillStyle = slotGradient;
      ctx.beginPath();
      this.roundRect(slotX, slotY, slotSize, slotSize, 6);
      ctx.fill();

      // 槽位内边框
      ctx.strokeStyle = this.darkenColor(themeColors.accent, 30);
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      this.roundRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4, 4);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      const item = this.gameData.collectionSlots[i];
      if (item) {
        // 物品背景 - 渐变
        const gradient = ctx.createRadialGradient(
          slotX + slotSize / 3, slotY + slotSize / 3, slotSize * 0.1,
          slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 2
        );
        gradient.addColorStop(0, this.lightenColor(item.color, 30));
        gradient.addColorStop(1, item.color);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 4, 0, Math.PI * 2);
        ctx.fill();

        // 高光
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(slotX + slotSize / 2 - slotSize * 0.15, slotY + slotSize / 2 - slotSize * 0.15, slotSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // 边框
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(slotX + slotSize / 2, slotY + slotSize / 2, slotSize / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = `bold ${slotSize * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, slotX + slotSize / 2, slotY + slotSize / 2);
      } else {
        // 空槽位
        ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        ctx.font = `${slotSize * 0.45}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', slotX + slotSize / 2, slotY + slotSize / 2);
      }
    }

    // ========== 道具栏 - 纪念碑谷风格 ==========
    const propsY = this.height * 0.83;
    const propsHeight = this.height * 0.12;
    const propsX = this.width * 0.08;
    const propsWidth = this.width * 0.84;
    const propCount = 3;
    const propWidth = propsWidth / propCount;
    const props = [
      { key: 'remove', icon: '❌', name: '移除' },
      { key: 'shuffle', icon: '🔀', name: '重排' },
      { key: 'complete', icon: '✨', name: '凑齐' }
    ];

    props.forEach((prop, i) => {
      const px = propsX + i * propWidth;
      const pSize = Math.min(propWidth - 12, propsHeight * 0.85);
      const px2 = px + (propWidth - pSize) / 2;
      const py2 = propsY + (propsHeight - pSize) / 2;

      let isActive;
      isActive = this.gameData.道具[prop.key] > 0;

      this.drawMonumentPropButton(px2, py2, pSize, pSize, isActive, prop.key);

      ctx.fillStyle = isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.6)';
      ctx.font = `${pSize * 0.45}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prop.icon, px2 + pSize / 2, py2 + pSize * 0.35);

      ctx.font = `${pSize * 0.22}px sans-serif`;
      const count = this.gameData.道具[prop.key];
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(count > 0 ? `×${count}` : prop.name, px2 + pSize / 2, py2 + pSize * 0.7);
    });
  }

  /**
   * 渲染道具UI（完整3D模式）
   */
  renderPropsUI() {
    // WebGL 模式下跳过
    if (!this.ctx) return;

    const ctx = this.ctx;
    const props = [
      { key: 'shuffle', name: '洗牌', icon: '🔀' },
      { key: 'bomb', name: '炸弹', icon: '💣' },
      { key: 'time', name: '加时', icon: '⏰' }
    ];

    const pSize = 50 * this.scaleRatio;
    const gap = 10 * this.scaleRatio;
    const totalW = props.length * (pSize + gap);
    let startX = (this.width - totalW) / 2 + gap / 2;
    const y = this.height - pSize - 20;

    props.forEach((prop, i) => {
      const px = startX + i * (pSize + gap);

      // 道具背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(px + pSize / 2, y + pSize / 2, pSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // 道具边框
      ctx.strokeStyle = '#FF6B9D';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 道具图标
      ctx.font = `${pSize * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(prop.icon, px + pSize / 2, y + pSize * 0.35);

      // 道具名称/数量
      ctx.font = `${pSize * 0.2}px sans-serif`;
      const count = this.gameData.道具[prop.key];
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(count > 0 ? `×${count}` : prop.name, px + pSize / 2, y + pSize * 0.7);
    });
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Game;
} else {
  if (typeof global !== 'undefined') {
    global.Game = Game;
  }
  if (typeof wx !== 'undefined') {
    wx.Game = Game;
  }
}
