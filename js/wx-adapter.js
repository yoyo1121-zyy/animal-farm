/**
 * 微信小游戏 API 适配层
 * 将微信 API 转换为 Web 标准 API
 */
console.log('[wx-adapter.js] 文件开始执行...');

(function() {
  'use strict';

  // 创建 wx 全局对象
  const wx = window.wx || {};

  // ========== 系统信息 API ==========
  wx.getSystemInfoSync = function() {
    const pixelRatio = window.devicePixelRatio || 1;
    // 游戏内部逻辑坐标（用于UI布局和元素定位）
    const logicWidth = 375;
    const logicHeight = 667;

    return {
      windowWidth: logicWidth,
      windowHeight: logicHeight,
      pixelRatio: pixelRatio,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      platform: navigator.platform,
      system: navigator.userAgent,
      model: 'Web Browser',
      brand: 'Web',
      fontSizeSetting: 16
    };
  };

  // ========== Canvas API ==========
  // 计数器，用于创建多个canvas
  let canvas2DCount = 0;

  wx.createCanvas = function(options) {
    const systemInfo = wx.getSystemInfoSync();
    const dpr = systemInfo.pixelRatio;

    // 游戏内部逻辑坐标（375×667）
    const gameWidth = 375;
    const gameHeight = 667;

    // 计算放大比例，使游戏在屏幕上显示更大
    // 根据浏览器窗口大小计算合适的放大倍数
    const scaleX = window.innerWidth / gameWidth;
    const scaleY = window.innerHeight / gameHeight;
    // 取较小的缩放比例，然后放大到合适大小（比如2-3倍）
    const baseScale = Math.min(scaleX, scaleY);
    const displayScale = Math.min(baseScale * 0.85, 2.5); // 最多2.5倍放大

    // 根据类型设置 context
    if (options && options.type === 'webgl') {
      // WebGL canvas
      const canvas = document.getElementById('webglCanvas') || document.createElement('canvas');
      canvas.width = gameWidth * dpr;
      canvas.height = gameHeight * dpr;

      // 逻辑尺寸，居中显示，放大显示
      canvas.style.width = gameWidth + 'px';
      canvas.style.height = gameHeight + 'px';
      canvas.style.position = 'absolute';
      canvas.style.top = '50%';
      canvas.style.left = '50%';
      canvas.style.transform = `translate(-50%, -50%) scale(${displayScale})`;
      canvas.style.transformOrigin = 'center center';
      canvas.style.border = '1px solid #ccc';
      canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';

      if (!canvas.id) {
        canvas.id = 'webglCanvas';
        document.body.appendChild(canvas);
      }
      return canvas;
    } else {
      // 2D canvas - 支持多个canvas
      const canvasId = `canvas2D_${canvas2DCount++}`;
      const canvas = document.getElementById(canvasId) || document.createElement('canvas');
      canvas.width = gameWidth * dpr;
      canvas.height = gameHeight * dpr;

      // 逻辑尺寸，居中显示，放大显示
      canvas.style.width = gameWidth + 'px';
      canvas.style.height = gameHeight + 'px';
      canvas.style.position = 'absolute';
      canvas.style.top = '50%';
      canvas.style.left = '50%';
      canvas.style.transform = `translate(-50%, -50%) scale(${displayScale})`;
      canvas.style.transformOrigin = 'center center';
      canvas.style.pointerEvents = 'auto';
      canvas.style.border = '1px solid #ccc';
      canvas.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';

      // WebGL canvas在底层，2D canvas在上层
      canvas.style.zIndex = '10';

      if (!canvas.id) {
        canvas.id = canvasId;
        document.body.appendChild(canvas);
      }
      return canvas;
    }
  };

  // ========== 图片 API ==========
  wx.createImage = function() {
    return new Image();
  };

  // ========== 存储 API ==========
  const storagePrefix = 'zhuadage_';

  wx.getStorageSync = function(key) {
    try {
      const value = localStorage.getItem(storagePrefix + key);
      return value ? JSON.parse(value) : '';
    } catch (e) {
      console.error('getStorageSync error:', e);
      return '';
    }
  };

  wx.setStorageSync = function(key, data) {
    try {
      localStorage.setItem(storagePrefix + key, JSON.stringify(data));
    } catch (e) {
      console.error('setStorageSync error:', e);
    }
  };

  wx.removeStorageSync = function(key) {
    try {
      localStorage.removeItem(storagePrefix + key);
    } catch (e) {
      console.error('removeStorageSync error:', e);
    }
  };

  wx.clearStorageSync = function() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('clearStorageSync error:', e);
    }
  };

  // ========== 动画帧 API ==========
  wx.requestAnimationFrame = function(callback) {
    return window.requestAnimationFrame(callback);
  };

  wx.cancelAnimationFrame = function(requestId) {
    window.cancelAnimationFrame(requestId);
  };

  // ========== 设备运动 API（陀螺仪） ==========
  let deviceMotionCallback = null;
  let deviceMotionListening = false;

  wx.startDeviceMotionListening = function(options) {
    return new Promise((resolve, reject) => {
      if (typeof DeviceMotionEvent !== 'undefined') {
        deviceMotionListening = true;

        // iOS 13+ 需要请求权限
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          DeviceMotionEvent.requestPermission()
            .then(response => {
              if (response === 'granted') {
                window.addEventListener('devicemotion', handleDeviceMotion);
                resolve({ errMsg: 'startDeviceMotionListening:ok' });
              } else {
                reject({ errMsg: 'startDeviceMotionListening:fail auth denied' });
              }
            })
            .catch(e => {
              console.error('DeviceMotion permission error:', e);
              reject({ errMsg: 'startDeviceMotionListening:fail ' + e.message });
            });
        } else {
          // 非 iOS 13+ 设备直接监听
          window.addEventListener('devicemotion', handleDeviceMotion);
          resolve({ errMsg: 'startDeviceMotionListening:ok' });
        }
      } else {
        // 不支持设备运动，使用备用方案（模拟或禁用）
        console.warn('DeviceMotion API not supported');
        resolve({ errMsg: 'startDeviceMotionListening:ok but not supported' });
      }
    });

    function handleDeviceMotion(event) {
      if (!deviceMotionListening || !deviceMotionCallback) return;

      const acceleration = event.accelerationIncludingGravity || {};
      const rotationRate = event.rotationRate || {};

      deviceMotionCallback({
        acceleration: acceleration,
        rotationRate: rotationRate,
        includingGravity: true
      });
    }
  };

  wx.stopDeviceMotionListening = function() {
    return new Promise((resolve) => {
      deviceMotionListening = false;
      deviceMotionCallback = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
      resolve({ errMsg: 'stopDeviceMotionListening:ok' });
    });
  };

  wx.onDeviceMotionChange = function(callback) {
    deviceMotionCallback = callback;
  };

  // ========== 触摸事件支持 ==========
  let touchStartCallback = null;
  let touchMoveCallback = null;
  let touchEndCallback = null;

  wx.onTouchStart = function(callback) {
    touchStartCallback = callback;
  };

  wx.onTouchMove = function(callback) {
    touchMoveCallback = callback;
  };

  wx.onTouchEnd = function(callback) {
    touchEndCallback = callback;
  };

  // 全局显示缩放比例（用于触摸坐标转换）
  let globalDisplayScale = 1;

  // 更新全局缩放比例
  function updateGlobalScale() {
    const gameWidth = 375;
    const gameHeight = 667;
    const scaleX = window.innerWidth / gameWidth;
    const scaleY = window.innerHeight / gameHeight;
    const baseScale = Math.min(scaleX, scaleY);
    globalDisplayScale = Math.min(baseScale * 0.85, 2.5);
  }

  // 窗口大小改变时更新缩放
  window.addEventListener('resize', updateGlobalScale);
  updateGlobalScale();

  // 统一处理函数
  function handleTouchStart(x, y) {
    if (touchStartCallback) {
      // 游戏逻辑坐标
      const gameWidth = 375;
      const gameHeight = 667;

      // 计算canvas在页面中的位置（考虑缩放后的实际尺寸）
      const scaledWidth = gameWidth * globalDisplayScale;
      const scaledHeight = gameHeight * globalDisplayScale;
      const canvasX = (window.innerWidth - scaledWidth) / 2;
      const canvasY = (window.innerHeight - scaledHeight) / 2;

      // 将窗口坐标转换为canvas坐标（需要除以显示缩放比例）
      const canvasCoordX = (x - canvasX) / globalDisplayScale;
      const canvasCoordY = (y - canvasY) / globalDisplayScale;

      // 检查点击是否在canvas范围内
      if (canvasCoordX >= 0 && canvasCoordX <= gameWidth && canvasCoordY >= 0 && canvasCoordY <= gameHeight) {
        touchStartCallback([{ x: canvasCoordX, y: canvasCoordY }]);
      }
    }
  }

  function handleTouchMove(x, y) {
    if (touchMoveCallback) {
      const gameWidth = 375;
      const gameHeight = 667;
      const scaledWidth = gameWidth * globalDisplayScale;
      const scaledHeight = gameHeight * globalDisplayScale;
      const canvasX = (window.innerWidth - scaledWidth) / 2;
      const canvasY = (window.innerHeight - scaledHeight) / 2;

      const canvasCoordX = (x - canvasX) / globalDisplayScale;
      const canvasCoordY = (y - canvasY) / globalDisplayScale;

      if (canvasCoordX >= 0 && canvasCoordX <= gameWidth && canvasCoordY >= 0 && canvasCoordY <= gameHeight) {
        touchMoveCallback([{ x: canvasCoordX, y: canvasCoordY }]);
      }
    }
  }

  function handleTouchEnd(x, y) {
    if (touchEndCallback) {
      const gameWidth = 375;
      const gameHeight = 667;
      const scaledWidth = gameWidth * globalDisplayScale;
      const scaledHeight = gameHeight * globalDisplayScale;
      const canvasX = (window.innerWidth - scaledWidth) / 2;
      const canvasY = (window.innerHeight - scaledHeight) / 2;

      const canvasCoordX = (x - canvasX) / globalDisplayScale;
      const canvasCoordY = (y - canvasY) / globalDisplayScale;

      if (canvasCoordX >= 0 && canvasCoordX <= gameWidth && canvasCoordY >= 0 && canvasCoordY <= gameHeight) {
        touchEndCallback([{ x: canvasCoordX, y: canvasCoordY }]);
      }
    }
  }

  // 监听原生触摸事件并转发给微信API
  document.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      handleTouchStart(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  document.addEventListener('touchmove', function(e) {
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      handleTouchMove(touch.clientX, touch.clientY);
    }
  }, { passive: false });

  document.addEventListener('touchend', function(e) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      handleTouchEnd(touch.clientX, touch.clientY);
    }
  });

  // 监听鼠标事件（用于PC调试）
  document.addEventListener('mousedown', function(e) {
    handleTouchStart(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', function(e) {
    handleTouchMove(e.clientX, e.clientY);
  });

  document.addEventListener('mouseup', function(e) {
    handleTouchEnd(e.clientX, e.clientY);
  });

  // ========== 模块加载（简化版 require） ==========
  const moduleCache = {};

  wx.require = function(moduleName) {
    if (moduleCache[moduleName]) {
      return moduleCache[moduleName];
    }

    // 简单的模块映射
    const moduleMap = {
      './audioManager.js': window.AudioManager,
      './gameLogic.js': window.GameLogic,
      '../utils/physics-manager.js': window.PhysicsManager,
      './frame-animation.js': window.FrameAnimation,
      '../utils/scene-3d.js': window.Scene3D,
      '../utils/three-scene.js': window.ThreeScene,
      '../utils/simple-3d-renderer.js': window.Simple3DRenderer
    };

    const module = moduleMap[moduleName];
    if (module) {
      moduleCache[moduleName] = module;
      return module;
    }

    console.warn('Module not found:', moduleName);
    return null;
  };

  // 全局 require 函数
  window.require = wx.require;

  // ========== 将 wx 对象暴露到全局 ==========
  window.wx = wx;

  console.log('微信API适配层加载完成');
})();
