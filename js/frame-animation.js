/**
 * 帧序列动画管理器 - H5版本
 * 支持多帧图片序列实现动画效果
 */
console.log('[frame-animation.js] 文件开始执行...');
class FrameAnimation {
  constructor() {
    this.frames = []; // 存储所有帧图片
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.frameDelay = 100; // 每帧间隔（毫秒）
    this.isPlaying = false;
    this.isLoaded = false;
    this.loadedCount = 0;
  }

  /**
   * 初始化帧序列动画
   */
  init(framePattern, frameCount, frameDelay = 100, audioPath = null, volume = 0.5, startFrame = 1) {
    this.frameDelay = frameDelay;
    this.loadedCount = 0;

    console.log(`开始加载 ${frameCount} 帧动画...`);

    // 加载所有帧
    for (let i = 0; i < frameCount; i++) {
      const img = new Image();
      const frameNumber = i + startFrame;
      let framePath = framePattern.replace('{n}', frameNumber);
      if (framePattern.includes('{n:03d}')) {
        framePath = framePattern.replace('{n:03d}', String(frameNumber).padStart(3, '0'));
      } else if (framePattern.includes('{n:04d}')) {
        framePath = framePattern.replace('{n:04d}', String(frameNumber).padStart(4, '0'));
      }

      img.onload = () => {
        this.loadedCount++;
        if (this.loadedCount === frameCount) {
          this.isLoaded = true;
          this.isPlaying = true;
          this.lastFrameTime = Date.now();
          console.log(`帧序列动画加载完成，共 ${frameCount} 帧`);
        }
      };

      img.onerror = () => {
        console.error(`帧 ${i} 加载失败: ${framePath}`);
      };

      img.src = framePath;
      this.frames.push(img);
    }

    // 如果提供了音频路径，加载音频
    if (audioPath) {
      this.loadAudio(audioPath, volume);
    }

    return true;
  }

  /**
   * 加载音频
   */
  loadAudio(audioPath, volume = 0.5) {
    try {
      this.audio = new Audio();
      this.audio.src = audioPath;
      this.audio.loop = true;
      this.audio.volume = volume;
      this.audio.autoplay = false;

      this.audio.addEventListener('canplay', () => {
        console.log('背景音频加载完成:', audioPath);
        // 不自动播放，等待用户交互
        // if (this.isPlaying && this.isLoaded) {
        //   this.audio.play();
        // }
      }, { once: true });

      this.audio.addEventListener('error', (err) => {
        console.error('背景音频加载失败:', err);
      });
    } catch (e) {
      console.error('创建音频失败:', e);
    }
  }

  /**
   * 绘制当前帧到 Canvas
   */
  render(ctx, width, height) {
    if (!this.isLoaded || this.frames.length === 0) return false;

    const now = Date.now();
    if (now - this.lastFrameTime >= this.frameDelay) {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.lastFrameTime = now;
    }

    const frame = this.frames[this.currentFrame];
    if (frame && frame.complete) {
      ctx.drawImage(frame, 0, 0, width, height);
      return true;
    }
    return false;
  }

  /**
   * 播放动画
   */
  play() {
    this.isPlaying = true;
    if (this.audio) {
      // 尝试播放音频，如果失败（由于用户未交互）则静默处理
      this.audio.play().catch(e => {
        console.log('[FrameAnimation] 等待用户交互后播放音频');
      });
    }
  }

  /**
   * 暂停动画
   */
  pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * 停止动画
   */
  stop() {
    this.isPlaying = false;
    this.currentFrame = 0;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  /**
   * 销毁动画资源
   */
  destroy() {
    this.stop();
    this.frames = [];
    if (this.audio) {
      this.audio = null;
    }
    this.isLoaded = false;
    this.isPlaying = false;
  }
}

// Web环境导出
console.log('[frame-animation.js] 开始导出...');
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FrameAnimation;
} else {
  if (typeof window !== 'undefined') {
    window.FrameAnimation = FrameAnimation;
    console.log('[frame-animation.js] 导出到 window.FrameAnimation');
  }
  if (typeof global !== 'undefined') {
    global.FrameAnimation = FrameAnimation;
  }
  if (typeof wx !== 'undefined') {
    wx.FrameAnimation = FrameAnimation;
  }
}
console.log('[frame-animation.js] 导出完成');
