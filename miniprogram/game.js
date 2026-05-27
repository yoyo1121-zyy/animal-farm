// 抓大鹅小游戏主入口

// 微信小游戏模块加载兼容处理
let Game;
try {
  // 尝试使用 require 加载
  Game = require('./js/game.js');
  // 如果 require 返回空，尝试从全局获取
  if (!Game && typeof wx !== 'undefined' && wx.Game) {
    Game = wx.Game;
  }
} catch (e) {
  // 如果 require 失败，从全局获取
  if (typeof wx !== 'undefined' && wx.Game) {
    Game = wx.Game;
  } else {
    console.error('无法加载 Game 类:', e);
  }
}

if (!Game) {
  console.error('Game 类未定义！');
}

// 初始化游戏
const game = new Game();

// 适配触摸事件
wx.onTouchStart((e) => {
  const touch = e.touches[0];
  // 触摸坐标不需要考虑 DPR，因为使用的是逻辑像素
  game.onTouchStart(touch.clientX, touch.clientY);
});

wx.onTouchMove((e) => {
  if (e.touches && e.touches.length > 0) {
    const touch = e.touches[0];
    game.onTouchMove(touch.clientX, touch.clientY);
  }
});

wx.onTouchEnd((e) => {
  const touch = e.changedTouches[0];
  game.onTouchEnd(touch.clientX, touch.clientY);
});

// 监听音频中断
wx.onAudioInterruptionBegin(() => {
  if (game.audioManager) {
    game.audioManager.pauseAll();
  }
});

wx.onAudioInterruptionEnd(() => {
  if (game.audioManager) {
    game.audioManager.resumeAll();
  }
});

console.log('抓大鹅小游戏已启动');
