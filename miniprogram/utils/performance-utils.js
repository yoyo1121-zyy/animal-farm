// 性能优化工具类
// 包含对象池、节流、防抖等功能

/**
 * 对象池类
 * 用于复用对象，减少 GC 压力
 */
class ObjectPool {
  constructor(createFn, resetFn, initialSize = 10) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.pool = [];
    this.activeCount = 0;

    // 预创建对象
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }

  /**
   * 获取一个对象
   */
  acquire() {
    this.activeCount++;

    if (this.pool.length > 0) {
      return this.pool.pop();
    }

    return this.createFn();
  }

  /**
   * 归还对象
   */
  release(obj) {
    this.activeCount--;

    if (this.resetFn) {
      this.resetFn(obj);
    }

    this.pool.push(obj);
  }

  /**
   * 获取池状态
   */
  getStats() {
    return {
      poolSize: this.pool.length,
      activeCount: this.activeCount,
      totalCreated: this.pool.length + this.activeCount
    };
  }

  /**
   * 清空对象池
   */
  clear() {
    this.pool = [];
    this.activeCount = 0;
  }
}

/**
 * 节流函数
 * 在指定时间内只执行一次
 */
function throttle(fn, delay = 100) {
  let lastTime = 0;
  let timer = null;

  return function(...args) {
    const now = Date.now();
    const remaining = delay - (now - lastTime);

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      lastTime = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastTime = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/**
 * 防抖函数
 * 在指定时间内只执行最后一次
 */
function debounce(fn, delay = 100) {
  let timer = null;

  return function(...args) {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * 请求动画帧节流
 * 用于优化渲染性能
 */
function rafThrottle(fn) {
  let pending = false;

  return function(...args) {
    if (pending) return;

    pending = true;

    wx.nextTick(() => {
      fn.apply(this, args);
      pending = false;
    });
  };
}

/**
 * 批量更新工具
 * 将多次更新合并为一次
 */
class BatchUpdater {
  constructor(updateFn, delay = 16) {
    this.updateFn = updateFn;
    this.delay = delay;
    this.pending = false;
    this.data = [];
  }

  /**
   * 添加待更新数据
   */
  add(data) {
    this.data.push(data);

    if (!this.pending) {
      this.pending = true;

      setTimeout(() => {
        this.flush();
      }, this.delay);
    }
  }

  /**
   * 执行更新
   */
  flush() {
    if (this.data.length === 0) {
      this.pending = false;
      return;
    }

    const dataToProcess = this.data;
    this.data = [];
    this.pending = false;

    this.updateFn(dataToProcess);
  }

  /**
   * 立即执行所有待更新
   */
  flushNow() {
    if (this.pending) {
      clearTimeout(this.timer);
    }
    this.flush();
  }
}

/**
 * 渲染优化器
 * 管理渲染队列，避免过度渲染
 */
class RenderOptimizer {
  constructor() {
    this.renderQueue = new Set();
    this.isScheduled = false;
  }

  /**
   * 添加需要渲染的项
   */
  scheduleRender(itemId) {
    this.renderQueue.add(itemId);

    if (!this.isScheduled) {
      this.isScheduled = true;
      wx.nextTick(() => {
        this.render();
      });
    }
  }

  /**
   * 批量渲染
   */
  render() {
    if (this.renderQueue.size === 0) {
      this.isScheduled = false;
      return;
    }

    const items = Array.from(this.renderQueue);
    this.renderQueue.clear();
    this.isScheduled = false;

    // 触发渲染回调
    if (this.onRender) {
      this.onRender(items);
    }
  }

  /**
   * 设置渲染回调
   */
  setRenderCallback(callback) {
    this.onRender = callback;
  }

  /**
   * 清空队列
   */
  clear() {
    this.renderQueue.clear();
    this.isScheduled = false;
  }
}

/**
 * 性能监控
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      fps: 30,
      renderTime: 16,
      memory: 100
    };
  }

  /**
   * 开始计时
   */
  start(label) {
    this.metrics[label] = {
      startTime: Date.now(),
      endTime: null,
      duration: null
    };
  }

  /**
   * 结束计时
   */
  end(label) {
    if (this.metrics[label]) {
      this.metrics[label].endTime = Date.now();
      this.metrics[label].duration = this.metrics[label].endTime - this.metrics[label].startTime;
    }
  }

  /**
   * 获取耗时
   */
  getDuration(label) {
    return this.metrics[label]?.duration || 0;
  }

  /**
   * 检查是否超过阈值
   */
  isOverThreshold(label, threshold) {
    const duration = this.getDuration(label);
    return duration > (threshold || this.thresholds.renderTime);
  }

  /**
   * 获取性能报告
   */
  getReport() {
    const report = {};

    Object.entries(this.metrics).forEach(([label, metric]) => {
      report[label] = {
        duration: metric.duration,
        overThreshold: metric.duration > this.thresholds.renderTime
      };
    });

    return report;
  }

  /**
   * 清空指标
   */
  clear() {
    this.metrics = {};
  }
}

/**
 * 内存优化工具
 */
class MemoryOptimizer {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * 缓存数据
   */
  set(key, value) {
    // 如果缓存已满，删除最旧的
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * 获取缓存
   */
  get(key) {
    const item = this.cache.get(key);
    return item ? item.value : undefined;
  }

  /**
   * 清理过期缓存
   */
  clean(maxAge = 60000) {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size() {
    return this.cache.size;
  }
}

/**
 * 预加载管理器
 */
class PreloadManager {
  constructor() {
    this.loadedAssets = new Set();
    this.loadingAssets = new Map();
  }

  /**
   * 预加载图片
   */
  preloadImage(url) {
    if (this.loadedAssets.has(url)) {
      return Promise.resolve();
    }

    if (this.loadingAssets.has(url)) {
      return this.loadingAssets.get(url);
    }

    const promise = new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: url,
        success: () => {
          this.loadedAssets.add(url);
          this.loadingAssets.delete(url);
          resolve();
        },
        fail: (err) => {
          this.loadingAssets.delete(url);
          reject(err);
        }
      });
    });

    this.loadingAssets.set(url, promise);
    return promise;
  }

  /**
   * 检查是否已加载
   */
  isLoaded(url) {
    return this.loadedAssets.has(url);
  }

  /**
   * 清空已加载记录
   */
  clear() {
    this.loadedAssets.clear();
    this.loadingAssets.clear();
  }
}

module.exports = {
  ObjectPool,
  throttle,
  debounce,
  rafThrottle,
  BatchUpdater,
  RenderOptimizer,
  PerformanceMonitor,
  MemoryOptimizer,
  PreloadManager
};
