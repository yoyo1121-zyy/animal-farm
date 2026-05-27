// 抓大鹅小游戏 - 音频管理器

class AudioManager {
  constructor() {
    this.soundEnabled = true;

    // 背景音乐
    this.bgm = null;
    this.bgmPlaying = false;

    // 音效
    this.sounds = {};

    // 音效播放状态（防止重复播放）
    this.effectPlaying = {
      cow: false,
      sheep: false
    };

    // 初始化
    this.init();
  }

  init() {
    // 检查音频设置
    try {
      const soundEnabled = wx.getStorageSync('soundEnabled');
      this.soundEnabled = soundEnabled !== false;
    } catch (e) {
      console.error('Load sound setting error:', e);
    }

    // 创建 InnerAudioContext
    this.createAudio();
  }

  createAudio() {
    try {
      // 创建背景音乐（默认）
      this.bgm = wx.createInnerAudioContext();
      this.bgm.src = 'images/audio/level1-2-bg.mp3';
      this.bgm.loop = true;
      this.bgm.volume = 0.15;

      this.bgm.onError((res) => {
        console.error('背景音乐加载失败:', res);
      });

      this.bgm.onEnded(() => {
        // 循环播放
        if (this.bgmPlaying) {
          this.bgm.seek(0);
          this.bgm.play();
        }
      });

      // 创建音效
      this.createSound('win', 'images/audio/win.mp3');
      this.createSound('lose', 'images/audio/lose.mp3');
      // 创建牛羊音效
      this.createSound('cow', 'images/audio/cow.mp3');
      this.createSound('sheep', 'images/audio/sheep.mp3');

    } catch (e) {
      console.error('音频初始化失败:', e);
    }
  }

  createSound(name, src) {
    try {
      const audio = wx.createInnerAudioContext();
      audio.src = src;
      audio.volume = 0.6;

      audio.onError((res) => {
        console.error(`音效 ${name} 加载失败:`, res);
      });

      audio.onEnded(() => {
        // 音效播放完自动销毁
      });

      this.sounds[name] = audio;
    } catch (e) {
      console.error(`创建音效 ${name} 失败:`, e);
    }
  }

  // 播放背景音乐
  playBGM(level = 1) {
    if (!this.soundEnabled || !this.bgm) return;

    try {
      // 根据关卡切换背景音乐
      this.switchBGM(level);
      this.bgmPlaying = true;
      this.bgm.stop();
      this.bgm.seek(0);
      this.bgm.play();
      console.log('背景音乐开始播放，关卡:', level);
    } catch (e) {
      console.error('播放背景音乐失败:', e);
    }
  }

  // 切换背景音乐（根据关卡）
  switchBGM(level) {
    if (!this.bgm) return;

    try {
      let bgmPath;
      // 关卡1-2使用牧场背景音乐
      if (level <= 2) {
        bgmPath = 'images/audio/level1-2-bg.mp3';
      }
      // 关卡3-4使用魔法密林背景音乐
      else if (level <= 4) {
        bgmPath = 'images/audio/level3-4-bg.mp3';
      }
      // 其他关卡使用牧场背景音乐
      else {
        bgmPath = 'images/audio/level1-2-bg.mp3';
      }

      // 如果音乐路径不同，需要重新创建
      if (this.bgm.src !== bgmPath) {
        const wasPlaying = this.bgmPlaying;
        this.bgm.destroy();
        this.bgm = wx.createInnerAudioContext();
        this.bgm.src = bgmPath;
        this.bgm.loop = true;
        this.bgm.volume = 0.15;

        this.bgm.onError((res) => {
          console.error('背景音乐加载失败:', res);
        });

        this.bgm.onEnded(() => {
          if (this.bgmPlaying) {
            this.bgm.seek(0);
            this.bgm.play();
          }
        });

        this.bgmPlaying = wasPlaying;
      }
    } catch (e) {
      console.error('切换背景音乐失败:', e);
    }
  }

  // 停止背景音乐
  stopBGM() {
    if (this.bgm) {
      try {
        this.bgmPlaying = false;
        this.bgm.stop();
        console.log('背景音乐停止');
      } catch (e) {
        console.error('停止背景音乐失败:', e);
      }
    }
  }

  // 暂停背景音乐
  pauseBGM() {
    if (this.bgm) {
      try {
        this.bgm.pause();
        console.log('背景音乐暂停');
      } catch (e) {
        console.error('暂停背景音乐失败:', e);
      }
    }
  }

  // 恢复背景音乐
  resumeBGM() {
    if (!this.soundEnabled || !this.bgm || !this.bgmPlaying) return;

    try {
      this.bgm.play();
      console.log('背景音乐恢复播放');
    } catch (e) {
      console.error('恢复背景音乐失败:', e);
    }
  }

  // 播放点击音效
  playClick() {
    // 点击音效暂不实现
  }

  // 播放连击音效
  playCombo(count) {
    // 连击音效暂不实现
  }

  // 播放胜利音效
  playWin() {
    if (!this.soundEnabled) return;

    try {
      const winSound = this.sounds.win;
      if (winSound) {
        winSound.stop();
        winSound.seek(0);
        winSound.play();
        console.log('播放胜利音效');
      }
    } catch (e) {
      console.error('播放胜利音效失败:', e);
    }
  }

  // 播放失败音效
  playLose() {
    if (!this.soundEnabled) return;

    try {
      const loseSound = this.sounds.lose;
      if (loseSound) {
        loseSound.stop();
        loseSound.seek(0);
        loseSound.play();
        console.log('播放失败音效');
      }
    } catch (e) {
      console.error('播放失败音效失败:', e);
    }
  }

  // 播放道具音效
  playProp() {
    // 道具音效暂不实现
  }

  // 播放颠勺音效
  playShake() {
    // 颠勺音效暂不实现
  }

  // 播放牛叫音效（消除奶牛时）
  playCow() {
    if (!this.soundEnabled || this.effectPlaying.cow) return;

    try {
      this.effectPlaying.cow = true;

      // 重新创建音频实例，确保完整播放
      const cowSound = wx.createInnerAudioContext();
      cowSound.src = 'images/audio/cow.mp3';
      cowSound.volume = 0.8;

      cowSound.onEnded(() => {
        this.effectPlaying.cow = false;
        cowSound.destroy();
      });

      cowSound.onError((res) => {
        console.error('牛叫音效播放失败:', res);
        this.effectPlaying.cow = false;
        cowSound.destroy();
      });

      cowSound.play();
      console.log('播放牛叫音效');
    } catch (e) {
      console.error('播放牛叫音效失败:', e);
      this.effectPlaying.cow = false;
    }
  }

  // 播放羊叫音效（消除绵羊时）
  playSheep() {
    if (!this.soundEnabled || this.effectPlaying.sheep) return;

    try {
      this.effectPlaying.sheep = true;

      // 重新创建音频实例，确保完整播放
      const sheepSound = wx.createInnerAudioContext();
      sheepSound.src = 'images/audio/sheep.mp3';
      sheepSound.volume = 0.8;

      sheepSound.onEnded(() => {
        this.effectPlaying.sheep = false;
        sheepSound.destroy();
      });

      sheepSound.onError((res) => {
        console.error('羊叫音效播放失败:', res);
        this.effectPlaying.sheep = false;
        sheepSound.destroy();
      });

      sheepSound.play();
      console.log('播放羊叫音效');
    } catch (e) {
      console.error('播放羊叫音效失败:', e);
      this.effectPlaying.sheep = false;
    }
  }

  // 根据物品类型播放消除音效
  playEliminateSound(itemType, itemName) {
    if (!this.soundEnabled) return;

    // 奶牛（id=1 或 name包含'奶牛'）
    if (itemType === 1 || itemName === '奶牛') {
      this.playCow();
    }
    // 绵羊（id=2 或 name包含'绵羊'）
    else if (itemType === 2 || itemName === '绵羊') {
      this.playSheep();
    }
  }

  // 切换音效
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;

    try {
      wx.setStorageSync('soundEnabled', this.soundEnabled);

      // 如果关闭音效，也停止背景音乐
      if (!this.soundEnabled) {
        this.stopBGM();
      } else {
        this.playBGM();
      }
    } catch (e) {
      console.error('Save sound setting error:', e);
    }

    return this.soundEnabled;
  }

  // 获取音效状态
  getSoundStatus() {
    return {
      soundEnabled: this.soundEnabled
    };
  }

  // 销毁音频资源
  destroy() {
    this.stopBGM();

    if (this.bgm) {
      this.bgm.destroy();
      this.bgm = null;
    }

    for (const name in this.sounds) {
      if (this.sounds[name]) {
        this.sounds[name].destroy();
      }
    }
    this.sounds = {};
  }
}

// 导出类（支持 new 创建实例）
module.exports = AudioManager;
