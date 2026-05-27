/**
 * 视频背景管理器
 * 在微信小游戏中创建视频背景层
 */
class VideoBackground {
  constructor() {
    this.video = null;
    this.isLoaded = false;
    this.isPlaying = false;
  }

  /**
   * 初始化视频背景
   * @param {string} videoPath - 视频文件路径（相对路径）
   * @param {boolean} loop - 是否循环播放
   * @param {boolean} muted - 是否静音
   */
  init(videoPath, loop = true, muted = true) {
    try {
      // 创建视频播放器
      this.video = wx.createVideo({
        x: 0,
        y: 0,
        width: wx.getSystemInfoSync().windowWidth,
        height: wx.getSystemInfoSync().windowHeight,
        src: videoPath,
        loop: loop,
        muted: muted,
        autoplay: false,
        objectFit: 'cover',
        showCenterPlayBtn: false,
        showPlayBtn: false,
        showFullscreenBtn: false,
        controls: false,
        enableProgressGesture: false,
        showProgress: false,
        poster: ''
      });

      // 监听视频加载完成
      this.video.onCanplay(() => {
        console.log('视频背景加载完成');
        this.isLoaded = true;
        this.play();
      });

      // 监听播放错误
      this.video.onError((err) => {
        console.error('视频背景加载失败:', err);
        this.isLoaded = false;
      });

      return true;
    } catch (e) {
      console.error('创建视频背景失败:', e);
      return false;
    }
  }

  /**
   * 播放视频
   */
  play() {
    if (this.video && this.isLoaded) {
      this.video.play();
      this.isPlaying = true;
    }
  }

  /**
   * 暂停视频
   */
  pause() {
    if (this.video && this.isPlaying) {
      this.video.pause();
      this.isPlaying = false;
    }
  }

  /**
   * 销毁视频
   */
  destroy() {
    if (this.video) {
      this.video.stop();
      this.video = null;
      this.isLoaded = false;
      this.isPlaying = false;
    }
  }

  /**
   * 设置视频音量
   * @param {number} volume - 音量 0-1
   */
  setVolume(volume) {
    if (this.video) {
      this.video.setVolume(volume);
    }
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoBackground;
} else {
  if (typeof global !== 'undefined') {
    global.VideoBackground = VideoBackground;
  }
  if (typeof wx !== 'undefined') {
    wx.VideoBackground = VideoBackground;
  }
}
