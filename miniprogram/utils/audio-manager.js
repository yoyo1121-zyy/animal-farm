// 音效管理器 - 简化版（不依赖外部音频文件）
class AudioManager {
  constructor() {
    this.soundEnabled = true;
    this.bgmEnabled = false;
  }

  /**
   * 初始化音效系统
   */
  init() {
    try {
      const soundEnabled = wx.getStorageSync('soundEnabled');
      if (soundEnabled !== undefined) {
        this.soundEnabled = soundEnabled;
      }
    } catch (e) {
      // 忽略错误
    }
  }

  /**
   * 播放点击音效
   */
  playClick() {
    // 简化实现 - 实际项目中应该播放真实音效
    if (!this.soundEnabled) return;
  }

  /**
   * 播放消除音效
   */
  playEliminate() {
    if (!this.soundEnabled) return;
  }

  /**
   * 播放连击音效
   */
  playCombo(comboCount) {
    if (!this.soundEnabled) return;
  }

  /**
   * 播放胜利音效
   */
  playWin() {
    if (!this.soundEnabled) return;
  }

  /**
   * 播放失败音效
   */
  playLose() {
    if (!this.soundEnabled) return;
  }

  /**
   * 播放道具音效
   */
  playProp() {
    if (!this.soundEnabled) return;
  }

  /**
   * 播放背景音乐
   */
  playBGM() {
    if (!this.bgmEnabled) return;
  }

  /**
   * 停止背景音乐
   */
  stopBGM() {
    // 停止BGM
  }

  /**
   * 暂停背景音乐
   */
  pauseBGM() {
    // 暂停BGM
  }

  /**
   * 恢复背景音乐
   */
  resumeBGM() {
    if (this.bgmEnabled) {
      this.playBGM();
    }
  }

  /**
   * 切换音效开关
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    wx.setStorageSync('soundEnabled', this.soundEnabled);
    return this.soundEnabled;
  }

  /**
   * 切换背景音乐开关
   */
  toggleBGM() {
    this.bgmEnabled = !this.bgmEnabled;

    if (this.bgmEnabled) {
      this.playBGM();
    } else {
      this.stopBGM();
    }

    return this.bgmEnabled;
  }

  /**
   * 获取音效状态
   */
  getSoundStatus() {
    return {
      soundEnabled: this.soundEnabled,
      bgmEnabled: this.bgmEnabled
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    this.stopBGM();
  }
}

// 导出单例
const audioManager = new AudioManager();

module.exports = audioManager;
