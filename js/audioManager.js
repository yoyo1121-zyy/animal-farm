// 抓大鹅小游戏 H5 版本 - 音频管理器
console.log('[audioManager.js] 文件开始执行...');

class AudioManager {
  constructor() {
    this.soundEnabled = true;

    // 背景音乐
    this.bgm = null;
    this.bgmPlaying = false;

    // 音效
    this.sounds = {};

    // 音效播放状态（防止重复播放）
    this.effectPlaying = {};

    // 用户交互状态（用于解决浏览器音频策略）
    this.hasUserInteracted = false;

    // 物品类型到音效的映射
    this.itemSoundMapping = {
      // 牧场主题
      1: 'cow',        // 奶牛
      2: 'sheep',      // 绵羊
      4: 'bucket',     // 奶桶
      5: 'dog',        // 牧羊犬
      7: 'chicken',    // 鸡
      // 魔法植物园主题
      46: 'magic_cute',     // 萤火虫 - 可爱魔法
      63: 'magic_bright',   // 精灵 - 光明魔法
      // 其他物品使用通用音效
      default: 'pop'    // 通用消除音效
    };

    // 初始化
    this.init();

    // 监听用户交互事件
    this.setupUserInteractionListener();
  }

  init() {
    // 检查音频设置
    try {
      const soundEnabled = localStorage.getItem('zhuadage_soundEnabled');
      this.soundEnabled = soundEnabled !== 'false';
    } catch (e) {
      console.error('Load sound setting error:', e);
    }

    // 创建音频
    this.createAudio();
  }

  // 设置用户交互监听器
  setupUserInteractionListener() {
    // 监听用户的首次交互
    const events = ['click', 'touchstart', 'keydown', 'mousedown'];
    const unlockAudio = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        console.log('[AudioManager] 用户首次交互，解锁音频');
        this.unlockAudio();

        // 移除事件监听器
        events.forEach(event => {
          document.removeEventListener(event, unlockAudio);
        });
      }
    };

    // 添加事件监听器到整个文档
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });

    console.log('[AudioManager] 用户交互监听器已设置');
  }

  // 解锁音频（在用户交互后调用）
  async unlockAudio() {
    console.log('[AudioManager] 开始解锁音频...');
    try {
      // 解锁背景音乐
      if (this.bgm) {
        try {
          await this.bgm.play();
          this.bgm.pause();
          console.log('[AudioManager] 背景音乐已解锁');
        } catch (e) {
          console.warn('[AudioManager] 背景音乐解锁失败:', e);
        }
      }

      // 解锁所有音效（逐个解锁，避免同时播放太多音频）
      let unlockedCount = 0;
      for (const name in this.sounds) {
        const sound = this.sounds[name];
        if (sound) {
          try {
            await sound.play();
            sound.pause();
            sound.currentTime = 0;
            unlockedCount++;
          } catch (e) {
            console.warn(`[AudioManager] 音效 ${name} 解锁失败:`, e);
          }
        }
      }
      console.log(`[AudioManager] 音频解锁完成，成功解锁 ${unlockedCount}/${Object.keys(this.sounds).length} 个音效`);
    } catch (e) {
      console.warn('[AudioManager] 音频解锁失败:', e);
    }
  }

  createAudio() {
    try {
      // 创建背景音乐
      this.bgm = new Audio();
      this.bgm.src = 'miniprogram/images/audio/level1-2-bg.mp3';
      this.bgm.loop = true;
      this.bgm.volume = 0.15;

      this.bgm.addEventListener('error', (res) => {
        console.error('背景音乐加载失败:', res);
      });

      this.bgm.addEventListener('ended', () => {
        if (this.bgmPlaying) {
          this.bgm.currentTime = 0;
          this.bgm.play();
        }
      });

      // 创建音效
      this.createSound('win', 'miniprogram/images/audio/win.mp3');
      this.createSound('lose', 'miniprogram/images/audio/lose.mp3');
      // 牧场主题音效
      this.createSound('cow', 'miniprogram/images/audio/cow.mp3');
      this.createSound('sheep', 'miniprogram/images/audio/sheep.mp3');
      this.createSound('dog', 'miniprogram/images/audio/dog.mp3');
      this.createSound('bucket', 'miniprogram/images/audio/bucket.mp3');
      // 鸡的音效
      this.createSound('chicken', 'miniprogram/images/audio/chicken.mp3');
      // 魔法主题音效
      this.createSound('magic_cute', 'miniprogram/images/audio/magic_cute.mp3');  // 可爱魔法 - 萤火虫
      this.createSound('magic_bright', 'miniprogram/images/audio/magic_bright.mp3');  // 光明魔法 - 精灵
      // 通用消除音效
      this.createSound('pop', 'miniprogram/images/audio/pop.mp3');

    } catch (e) {
      console.error('音频初始化失败:', e);
    }
  }

  createSound(name, src) {
    try {
      const audio = new Audio();
      audio.src = src;
      audio.volume = 0.6;

      audio.addEventListener('error', (res) => {
        console.warn(`音效 ${name} 加载失败，将使用通用音效:`, res);
        // 标记音效加载失败
        audio.loadError = true;
      });

      audio.addEventListener('ended', () => {
        // 音效播放完自动重置
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
      this.switchBGM(level);
      this.bgmPlaying = true;
      this.bgm.pause();
      this.bgm.currentTime = 0;

      // 标记需要播放背景音乐（等待用户交互）
      this.needsPlayBGM = true;

      // 只有在用户交互后才播放
      if (this.hasUserInteracted) {
        this.bgm.play().catch(e => {
          console.warn('播放背景音乐失败:', e);
          // 如果播放失败，尝试重新解锁音频
          console.log('[AudioManager] 尝试重新解锁音频');
          this.unlockAudio().then(() => {
            if (this.bgmPlaying) {
              this.bgm.play().catch(err => console.warn('重新播放背景音乐失败:', err));
            }
          });
        });
        console.log('背景音乐开始播放，关卡:', level);
      } else {
        console.log('[AudioManager] 等待用户交互后播放背景音乐');
      }
    } catch (e) {
      console.error('播放背景音乐失败:', e);
    }
  }

  // 切换背景音乐（根据关卡）
  switchBGM(level) {
    if (!this.bgm) return;

    try {
      let bgmPath;
      if (level <= 2) {
        bgmPath = 'miniprogram/images/audio/level1-2-bg.mp3';
      } else if (level <= 4) {
        bgmPath = 'miniprogram/images/audio/level3-4-bg.mp3';
      } else {
        bgmPath = 'miniprogram/images/audio/level1-2-bg.mp3';
      }

      if (this.bgm.src !== bgmPath) {
        const wasPlaying = this.bgmPlaying;
        this.bgm.src = bgmPath;
        this.bgm.loop = true;
        this.bgm.volume = 0.15;
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
        this.bgm.pause();
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
      this.bgm.play().catch(e => console.warn('恢复背景音乐失败:', e));
      console.log('背景音乐恢复播放');
    } catch (e) {
      console.error('恢复背景音乐失败:', e);
    }
  }

  playClick() {
    // 点击音效暂不实现
  }

  playCombo(count) {
    // 连击音效暂不实现
  }

  playWin() {
    if (!this.soundEnabled) return;

    try {
      const winSound = this.sounds.win;
      if (winSound) {
        winSound.pause();
        winSound.currentTime = 0;
        winSound.play().catch(e => console.warn('播放胜利音效失败:', e));
        console.log('播放胜利音效');
      }
    } catch (e) {
      console.error('播放胜利音效失败:', e);
    }
  }

  playLose() {
    if (!this.soundEnabled) return;

    try {
      const loseSound = this.sounds.lose;
      if (loseSound) {
        loseSound.pause();
        loseSound.currentTime = 0;
        loseSound.play().catch(e => console.warn('播放失败音效失败:', e));
        console.log('播放失败音效');
      }
    } catch (e) {
      console.error('播放失败音效失败:', e);
    }
  }

  playProp() {
    // 道具音效暂不实现
  }

  playShake() {
    // 颠勺音效暂不实现
  }

  playCow() {
    if (!this.soundEnabled || this.effectPlaying.cow) return;

    try {
      this.effectPlaying.cow = true;

      const cowSound = new Audio();
      cowSound.src = 'miniprogram/images/audio/cow.mp3';
      cowSound.volume = 0.8;

      cowSound.addEventListener('ended', () => {
        this.effectPlaying.cow = false;
      });

      cowSound.addEventListener('error', () => {
        this.effectPlaying.cow = false;
      });

      cowSound.play().catch(e => {
        console.warn('播放牛叫音效失败:', e);
        this.effectPlaying.cow = false;
      });
      console.log('播放牛叫音效');
    } catch (e) {
      console.error('播放牛叫音效失败:', e);
      this.effectPlaying.cow = false;
    }
  }

  playSheep() {
    if (!this.soundEnabled || this.effectPlaying.sheep) return;

    try {
      this.effectPlaying.sheep = true;

      const sheepSound = new Audio();
      sheepSound.src = 'miniprogram/images/audio/sheep.mp3';
      sheepSound.volume = 0.8;

      sheepSound.addEventListener('ended', () => {
        this.effectPlaying.sheep = false;
      });

      sheepSound.addEventListener('error', () => {
        this.effectPlaying.sheep = false;
      });

      sheepSound.play().catch(e => {
        console.warn('播放羊叫音效失败:', e);
        this.effectPlaying.sheep = false;
      });
      console.log('播放羊叫音效');
    } catch (e) {
      console.error('播放羊叫音效失败:', e);
      this.effectPlaying.sheep = false;
    }
  }

  playDog() {
    if (!this.soundEnabled || this.effectPlaying.dog) return;

    try {
      this.effectPlaying.dog = true;

      const dogSound = new Audio();
      dogSound.src = 'miniprogram/images/audio/dog.mp3';
      dogSound.volume = 0.8;

      dogSound.addEventListener('ended', () => {
        this.effectPlaying.dog = false;
      });

      dogSound.addEventListener('error', () => {
        this.effectPlaying.dog = false;
      });

      dogSound.play().catch(e => {
        console.warn('播放犬吠音效失败:', e);
        this.effectPlaying.dog = false;
      });
      console.log('播放犬吠音效');
    } catch (e) {
      console.error('播放犬吠音效失败:', e);
      this.effectPlaying.dog = false;
    }
  }

  playBucket() {
    if (!this.soundEnabled || this.effectPlaying.bucket) return;

    try {
      this.effectPlaying.bucket = true;

      const bucketSound = new Audio();
      bucketSound.src = 'miniprogram/images/audio/bucket.mp3';
      bucketSound.volume = 0.8;

      bucketSound.addEventListener('ended', () => {
        this.effectPlaying.bucket = false;
      });

      bucketSound.addEventListener('error', () => {
        this.effectPlaying.bucket = false;
      });

      bucketSound.play().catch(e => {
        console.warn('播放水桶音效失败:', e);
        this.effectPlaying.bucket = false;
      });
      console.log('播放水桶音效');
    } catch (e) {
      console.error('播放水桶音效失败:', e);
      this.effectPlaying.bucket = false;
    }
  }

  playEliminateSound(itemType, itemName) {
    if (!this.soundEnabled) return;

    // 根据物品类型获取对应的音效名称
    let soundName = this.itemSoundMapping[itemType];

    // 如果该物品类型没有映射的音效，使用通用音效
    if (!soundName) {
      soundName = this.itemSoundMapping['default'];
    }

    // 如果通用音效也不存在，直接返回
    if (!soundName) {
      return;
    }

    this.playEffect(soundName);
  }

  // 通用音效播放函数
  playEffect(effectName) {
    console.log(`[AudioManager] 尝试播放音效: ${effectName}, soundEnabled: ${this.soundEnabled}, hasUserInteracted: ${this.hasUserInteracted}`);

    if (!this.soundEnabled) {
      console.log('[AudioManager] 音效已禁用');
      return;
    }

    // 只有在用户交互后才播放音效
    if (!this.hasUserInteracted) {
      console.log('[AudioManager] 等待用户交互后播放音效');
      return;
    }

    // 防止重复播放同一个音效
    if (this.effectPlaying[effectName]) {
      console.log(`[AudioManager] 音效 ${effectName} 正在播放中，跳过`);
      return;
    }

    try {
      this.effectPlaying[effectName] = true;

      // 确定要播放的音效
      let soundToPlay = null;
      let actualEffectName = effectName;

      // 检查音效是否存在且没有加载错误
      if (this.sounds[effectName] && !this.sounds[effectName].loadError) {
        soundToPlay = this.sounds[effectName];
        console.log(`[AudioManager] 找到音效: ${effectName}`);
      } else {
        // 音效不存在或加载失败，使用通用音效
        const defaultSound = this.itemSoundMapping['default'];
        if (this.sounds[defaultSound] && !this.sounds[defaultSound].loadError) {
          soundToPlay = this.sounds[defaultSound];
          actualEffectName = defaultSound;
          console.log(`音效 ${effectName} 不存在，使用通用音效: ${defaultSound}`);
        } else {
          // 连通用音效都不存在，直接返回
          console.warn(`[AudioManager] 音效 ${effectName} 和通用音效都不存在`);
          this.effectPlaying[effectName] = false;
          return;
        }
      }

      // 播放音效
      soundToPlay.pause();
      soundToPlay.currentTime = 0;
      soundToPlay.play().then(() => {
        console.log(`[AudioManager] 成功播放音效: ${actualEffectName}`);
      }).catch(e => {
        console.warn(`播放音效 ${actualEffectName} 失败:`, e);
        this.effectPlaying[effectName] = false;
      });

      // 设置音效播放结束后的回调
      const onEnded = () => {
        console.log(`[AudioManager] 音效 ${actualEffectName} 播放完成`);
        this.effectPlaying[effectName] = false;
        soundToPlay.removeEventListener('ended', onEnded);
      };
      soundToPlay.addEventListener('ended', onEnded);

    } catch (e) {
      console.error(`播放音效 ${effectName} 失败:`, e);
      this.effectPlaying[effectName] = false;
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;

    try {
      localStorage.setItem('zhuadage_soundEnabled', this.soundEnabled ? 'true' : 'false');

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

  getSoundStatus() {
    return {
      soundEnabled: this.soundEnabled,
      hasUserInteracted: this.hasUserInteracted
    };
  }

  // 手动解锁音频（供外部调用）
  async manualUnlock() {
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
      console.log('[AudioManager] 手动解锁音频');
      await this.unlockAudio();
    }
  }

  destroy() {
    this.stopBGM();
    this.bgm = null;
    this.sounds = {};
  }
}

// 导出类（支持多种环境）
console.log('[audioManager.js] 开始导出...');
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioManager;
} else {
  if (typeof window !== 'undefined') {
    window.AudioManager = AudioManager;
    console.log('[audioManager.js] 导出到 window.AudioManager');
  }
  if (typeof global !== 'undefined') {
    global.AudioManager = AudioManager;
  }
}
console.log('[audioManager.js] 导出完成');
