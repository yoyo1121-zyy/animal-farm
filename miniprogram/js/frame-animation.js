/**
 * 帧序列动画管理器
 * 支持多帧图片序列实现动画效果
 */
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
   * @param {string} framePattern - 帧文件路径模式，如 'images/bg/frame_{n}.png'，{n} 会被替换为帧编号
   * @param {number} frameCount - 总帧数
   * @param {number} frameDelay - 每帧间隔（毫秒）
   * @param {string} audioPath - 音频文件路径（可选）
   * @param {number} volume - 音量 0-1
   * @param {number} startFrame - 起始帧编号（默认为0或1，取决于文件命名）
   */
  init(framePattern, frameCount, frameDelay = 100, audioPath = null, volume = 0.5, startFrame = 1) {
    this.frameDelay = frameDelay;
    this.loadedCount = 0;

    console.log(`开始加载 ${frameCount} 帧动画...`);

    // 加载所有帧
    for (let i = 0; i < frameCount; i++) {
      const img = wx.createImage();
      const frameNumber = i + startFrame; // 计算实际帧编号
      // 支持三种格式：{n} 普通编号，{n:03d} 三位数编号，{n:04d} 四位数编号
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
      this.audio = wx.createInnerAudioContext();
      this.audio.src = audioPath;
      this.audio.loop = true;
      this.audio.volume = volume;
      this.audio.autoplay = false;

      this.audio.onCanplay(() => {
        console.log('背景音频加载完成:', audioPath);
        if (this.isPlaying && this.isLoaded) {
          this.audio.play();
        }
      });

      this.audio.onError((err) => {
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

    // 更新帧
    const now = Date.now();
    if (this.isPlaying && now - this.lastFrameTime >= this.frameDelay) {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.lastFrameTime = now;
    }

    const img = this.frames[this.currentFrame];

    // 绘制当前帧（cover 模式）
    const imgRatio = img.width / img.height;
    const screenRatio = width / height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > screenRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    return true;
  }

  /**
   * 播放动画和音频
   */
  play() {
    this.isPlaying = true;
    if (this.audio) {
      this.audio.play();
    }
  }

  /**
   * 暂停动画和音频
   */
  pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * 设置音量
   */
  setVolume(volume) {
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  /**
   * 检查是否已加载
   */
  isReady() {
    return this.isLoaded;
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.audio) {
      this.audio.stop();
      this.audio.destroy();
      this.audio = null;
    }
    this.frames = [];
    this.isLoaded = false;
    this.isPlaying = false;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FrameAnimation;
} else {
  if (typeof global !== 'undefined') {
    global.FrameAnimation = FrameAnimation;
  }
  if (typeof wx !== 'undefined') {
    wx.FrameAnimation = FrameAnimation;
  }
}
