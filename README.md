# 抓大鹅小游戏 - HTML5 版本

这是从微信小游戏转换而来的 HTML5 网页版本。

## 目录结构

```
zhuadage-h5-web/
├── index.html              # 游戏入口文件
├── js/
│   ├── wx-adapter.js      # 微信API适配层（将微信API转换为Web API）
│   ├── audioManager.js    # 音频管理器
│   ├── gameLogic.js      # 游戏核心逻辑
│   ├── physics-manager.js # 物理引擎
│   ├── frame-animation.js # 帧序列动画
│   ├── scene-3d.js       # 3D场景渲染
│   └── game.js           # 主游戏类
└── miniprogram/           # 资源文件夹（图片、音频等）
```

## 如何运行

### 方法1：使用本地服务器

由于浏览器安全限制，需要通过HTTP服务器运行游戏。

**使用 Python:**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**使用 Node.js:**
```bash
npx http-server -p 8000
```

**使用 VSCode Live Server 扩展:**
1. 安装 Live Server 扩展
2. 右键点击 index.html
3. 选择 "Open with Live Server"

然后访问: http://localhost:8000

### 方法2：直接部署到服务器

将整个文件夹上传到任何支持静态网站托管的服务器，如：
- GitHub Pages
- Netlify
- Vercel
- 自己的 Web 服务器

## 资源文件

游戏需要 `miniprogram/` 文件夹中的资源文件，包括：
- 图片资源 (`images/`)
- 音频资源 (`images/audio/`)
- 3D模型资源（如果有）

请确保将原微信小游戏项目中的 `miniprogram` 文件夹完整复制过来。

## 浏览器兼容性

- Chrome/Edge: ✅ 完全支持
- Firefox: ✅ 完全支持
- Safari: ✅ 完全支持
- 微信内置浏览器: ✅ 完全支持

## 功能说明

- ✅ 关卡选择（目前开放第1-4关）
- ✅ 道具系统（移除、重排、凑齐）
- ✅ 物理引擎模拟
- ✅ 3D场景渲染
- ✅ 音效和背景音乐
- ⚠️ 陀螺仪功能（部分移动设备支持）

## 技术栈

- **Canvas API**: 2D渲染
- **Three.js**: 3D场景渲染
- **Cannon-es**: 物理引擎
- **Web Audio API**: 音频播放

## 注意事项

1. 游戏首次加载可能需要几秒钟，请耐心等待
2. 音频需要用户交互后才能播放（浏览器策略）
3. 移动设备建议横屏游玩以获得最佳体验
4. 陀螺仪功能在某些设备上可能需要手动授权

## 开发说明

### 微信API适配

所有微信小游戏的API调用都已通过 `wx-adapter.js` 适配层转换为Web标准API：

| 微信API | Web API |
|---------|---------|
| `wx.createCanvas()` | `document.createElement('canvas')` |
| `wx.createImage()` | `new Image()` |
| `wx.getStorageSync()` | `localStorage.getItem()` |
| `wx.setStorageSync()` | `localStorage.setItem()` |
| `wx.startDeviceMotionListening()` | `window.addEventListener('devicemotion')` |

### 关卡配置

当前只开放到第4关，可在 `js/game.js` 中修改：
- 第2743行: `this.maxLevel = 4;`
- 第4288行: `this.currentLevel < 4`

### 道具配置

移除了"摇晃"道具，只保留3个道具：
- 移除 (remove)
- 重排 (shuffle)
- 凑齐 (complete)
