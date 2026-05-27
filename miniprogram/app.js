// 微信小程序主入口 - 抓大鹅
App({
  globalData: {
    // 游戏数据
    maxLevel: 1,
    highScore: 0,
    currentLevel: 1,

    // 音效状态
    soundEnabled: true,
    bgmEnabled: false
  },

  onLaunch() {
    // 小程序启动时加载数据
    this.loadGameData();
  },

  // 加载游戏数据
  loadGameData() {
    try {
      const maxLevel = wx.getStorageSync('maxLevel');
      const highScore = wx.getStorageSync('highScore');
      const soundEnabled = wx.getStorageSync('soundEnabled');

      this.globalData.maxLevel = maxLevel ? Math.min(maxLevel, 10) : 1;
      this.globalData.highScore = highScore || 0;
      this.globalData.currentLevel = this.globalData.maxLevel;
      this.globalData.soundEnabled = soundEnabled !== false;
    } catch (e) {
      console.error('加载数据失败:', e);
    }
  },

  // 保存游戏数据
  saveGameData() {
    try {
      wx.setStorageSync('maxLevel', this.globalData.maxLevel);
      wx.setStorageSync('highScore', this.globalData.highScore);
    } catch (e) {
      console.error('保存数据失败:', e);
    }
  }
});
