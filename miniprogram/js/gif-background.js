/**
 * GIF 动画背景管理器（带音频支持）
 * 在微信小游戏中创建 GIF 动画背景 + 音频播放
 */
class GifBackground {
  constructor() {
    this.gif = null;
    this.audio = null;
    this.frames = [];
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.frameDelay = 100; // 默认每帧 100ms
    this.isPlaying = false;
    this.isLoaded = false;
  }

  /**
   * 初始化 GIF 背景（带音频）
   * @param {string} gifPath - GIF 文件路径（相对路径）
   * @param {string} audioPath - 音频文件路径（可选，相对路径）
   * @param {number} frameDelay - 每帧间隔（毫秒）
   * @param {boolean} loop - 音频是否循环
   * @param {number} volume - 音量 0-1
   */
  init(gifPath, audioPath = null, frameDelay = 100, loop = true, volume = 0.5) {
    this.frameDelay = frameDelay;

    try {
      // 创建图片对象加载 GIF
      const img = wx.createImage();

      img.onload = () => {
        console.log('GIF 背景加载完成:', gifPath);
        this.gif = img;
        this.isLoaded = true;
        this.isPlaying = true;
        this.lastFrameTime = Date.now();
      };

      img.onerror = (err) => {
        console.error('GIF 背景加载失败:', err);
        this.isLoaded = false;
      };

      img.src = gifPath;

      // 如果提供了音频路径，加载音频
      if (audioPath) {
        this.loadAudio(audioPath, loop, volume);
      }

      return true;
    } catch (e) {
      console.error('创建 GIF 背景失败:', e);
      return false;
    }
  }

  /**
   * 加载音频
   * @param {string} audioPath - 音频文件路径
   * @param {boolean} loop - 是否循环
   * @param {number} volume - 音量
   */
  loadAudio(audioPath, loop = true, volume = 0.5) {
    try {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = audioPath;
      this.audio.loop = loop;
      this.audio.volume = volume;
      this.audio.autoplay = false; // 手动控制播放

      this.audio.onCanplay(() => {
        console.log('背景音频加载完成:', audioPath);
        if (this.isPlaying) {
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
   * 绘制 GIF 当前帧到 Canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} width - 画布宽度
   * @param {number} height - 画布高度
   */
  render(ctx, width, height) {
    if (!this.gif || !this.isLoaded) return false;

    // 更新帧
    const now = Date.now();
    if (this.isPlaying && now - this.lastFrameTime >= this.frameDelay) {
      this.currentFrame = (this.currentFrame + 1) % 1; // GIF 会自动动画
      this.lastFrameTime = now;
    }

    // 绘制 GIF（cover 模式）
    const imgRatio = this.gif.width / this.gif.height;
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

    ctx.drawImage(this.gif, offsetX, offsetY, drawWidth, drawHeight);
    return true;
  }

  /**
   * 播放 GIF 和音频
   */
  play() {
    this.isPlaying = true;
    if (this.audio) {
      this.audio.play();
    }
  }

  /**
   * 暂停 GIF 和音频
   */
  pause() {
    this.isPlaying = false;
    if (this.audio) {
      this.audio.pause();
    }
  }

  /**
   * 设置音量
   * @param {number} volume - 音量 0-1
   */
  setVolume(volume) {
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  /**
   * 检查 GIF 是否已加载
   */
  isReady() {
    return this.isLoaded;
  }

  /**
   * 销毁 GIF 和音频
   */
  destroy() {
    if (this.audio) {
      this.audio.stop();
      this.audio.destroy();
      this.audio = null;
    }
    this.gif = null;
    this.frames = [];
    this.isLoaded = false;
    this.isPlaying = false;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GifBackground;
} else {
  if (typeof global !== 'undefined') {
    global.GifBackground = GifBackground;
  }
  if (typeof wx !== 'undefined') {
    wx.GifBackground = GifBackground;
  }
}
