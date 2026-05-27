// 3D 场景管理器 - Three.js + Cannon.js
// 微信小游戏完整 3D 渲染方案

// 加载 threejs-miniprogram
let createScopedThreejs;
try {
  let threejsMiniprogram;
  try {
    threejsMiniprogram = require('../miniprogram_npm/threejs-miniprogram/dist/index.js');
  } catch (e1) {
    try {
      threejsMiniprogram = require('threejs-miniprogram');
    } catch (e2) {
      try {
        threejsMiniprogram = require('../miniprogram_npm/threejs-miniprogram');
      } catch (e3) {
        throw e1;
      }
    }
  }
  createScopedThreejs = threejsMiniprogram.createScopedThreejs;
} catch (e) {
  console.warn('threejs-miniprogram not found:', e);
}

// 加载 GLTFLoader
let GLTFLoaderClass;
try {
  GLTFLoaderClass = require('../libs/threejs/GLTFLoader.js');
} catch (e) {
  console.warn('GLTFLoader not found:', e);
}

// 加载物理世界
let PhysicsWorld;
try {
  PhysicsWorld = require('./physics-world.js');
} catch (e) {
  console.warn('physics-world not found:', e);
}

// 加载模型配置
let ModelConfig3D;
try {
  ModelConfig3D = require('./3d-models-config.js');
} catch (e) {
  console.warn('3d-models-config not found:', e);
}

class Scene3D {
  constructor() {
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.THREE = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;

    this.physics = null;
    this.items = new Map(); // itemId -> { mesh, body, data }
    this.models = new Map(); // 预加载的GLB模型

    this.isInitialized = false;
    this.clock = null;
  }

  /**
   * 初始化3D场景
   */
  async init(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    try {
      console.log('[Scene3D] 开始初始化...');

      // 1. 验证 canvas 是 WebGL 类型
      let gl;
      try {
        gl = canvas.getContext('webgl');
      } catch (e) {
        console.error('[Scene3D] 无法获取 WebGL 上下文:', e);
        return false;
      }

      if (!gl) {
        console.error('[Scene3D] WebGL 上下文为 null');
        return false;
      }

      console.log('[Scene3D] WebGL 上下文获取成功');

      // 2. 初始化 Three.js
      if (!createScopedThreejs) {
        console.error('[Scene3D] threejs-miniprogram 不可用');
        return false;
      }

      this.THREE = createScopedThreejs(canvas);
      if (!this.THREE) {
        console.error('[Scene3D] THREE.js 创建失败');
        return false;
      }

      const THREE = this.THREE;

      // 3. 创建场景
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x87CEEB); // 天蓝色背景

      // 4. 创建相机
      const aspect = this.width / this.height;
      this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
      this.camera.position.set(0, 50, 80);
      this.camera.lookAt(0, 0, 0);

      // 5. 创建渲染器
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 5. 添加灯光
      this.setupLights();

      // 6. 添加地面
      this.createGround();

      // 7. 初始化物理世界
      if (PhysicsWorld) {
        this.physics = new PhysicsWorld();
        this.physics.init();
        console.log('[Scene3D] 物理世界初始化成功');
      }

      // 8. 预加载模型
      await this.preloadModels();

      // 9. 创建时钟
      this.clock = new THREE.Clock();

      this.isInitialized = true;
      console.log('[Scene3D] ✓ 3D场景初始化成功');
      return true;

    } catch (e) {
      console.error('[Scene3D] ✗ 初始化失败:', e);
      return false;
    }
  }

  /**
   * 设置灯光
   */
  setupLights() {
    const THREE = this.THREE;

    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 主方向光（太阳）
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(50, 100, 50);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -100;
    mainLight.shadow.camera.right = 100;
    mainLight.shadow.camera.top = 100;
    mainLight.shadow.camera.bottom = -100;
    this.scene.add(mainLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.3);
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);
  }

  /**
   * 创建地面
   */
  createGround() {
    const THREE = this.THREE;

    // 地面网格
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7CBA3D,
      roughness: 0.8,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -10;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(200, 20, 0x000000, 0x000000);
    gridHelper.position.y = -9.9;
    gridHelper.material.opacity = 0.1;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  /**
   * 预加载GLB模型
   */
  async preloadModels() {
    if (!ModelConfig3D) return;

    const modelNames = ModelConfig3D.getAllAvailableModels();
    console.log('[Scene3D] 预加载', modelNames.length, '个GLB模型...');

    const THREE = this.THREE;

    // 创建 GLTFLoader 实例
    if (!GLTFLoaderClass) {
      console.warn('[Scene3D] GLTFLoader 不可用，无法加载 GLB 模型');
      return;
    }

    const loader = new GLTFLoaderClass();
    loader.setTHREE(THREE);

    for (const modelName of modelNames) {
      try {
        const modelPath = `models/animals/${modelName}.glb`;
        console.log('[Scene3D] 加载模型:', modelPath);

        const gltf = await new Promise((resolve, reject) => {
          loader.load(
            modelPath,
            (gltf) => resolve(gltf),
            undefined,
            (error) => reject(error)
          );
        });

        // 保存模型
        this.models.set(modelName, gltf.scene);
        console.log('[Scene3D] ✓ 模型加载成功:', modelName);
      } catch (e) {
        console.warn('[Scene3D] ✗ 模型加载失败:', modelName, e);
      }
    }

    console.log('[Scene3D] 模型预加载完成，成功加载', this.models.size, '个模型');
  }

  /**
   * 为物品创建3D表示
   */
  createItem(item) {
    const THREE = this.THREE;

    // 获取模型名称
    let modelName = 'animal-cat';
    if (ModelConfig3D) {
      modelName = ModelConfig3D.getModelNameForItemType(item.type) || 'animal-cat';
    }

    let mesh;

    // 尝试使用预加载的 GLB 模型
    if (this.models.has(modelName)) {
      const model = this.models.get(modelName);
      mesh = model.clone();

      // 设置缩放和位置
      mesh.scale.set(3, 3, 3); // 调整模型大小
    } else {
      // 回退到球体
      console.warn('[Scene3D] 模型未找到，使用球体代替:', modelName);
      const geometry = new THREE.SphereGeometry(2, 32, 32);
      const color = this.parseColor(item.color);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.1
      });
      mesh = new THREE.Mesh(geometry, material);
    }

    // 设置位置
    const x = (item.x - 150) / 10;
    const z = (item.y - 150) / 10;
    const y = 10 + (item.zIndex || 0) * 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 添加随机旋转
    mesh.rotation.y = Math.random() * Math.PI * 2;

    // 添加到场景
    this.scene.add(mesh);

    // 创建物理刚体
    let body = null;
    if (this.physics) {
      body = this.physics.createItemBody(item, mesh);
    }

    // 保存引用
    this.items.set(item.id, {
      mesh: mesh,
      body: body,
      data: item
    });

    console.log('[Scene3D] 创建物品:', item.id, modelName);
    return { mesh, body };
  }

  /**
   * 移除物品
   */
  removeItem(itemId) {
    const item = this.items.get(itemId);
    if (!item) return;

    // 从场景移除
    if (item.mesh) {
      this.scene.remove(item.mesh);
    }

    // 从物理世界移除
    if (this.physics) {
      this.physics.removeItemBody(itemId);
    }

    this.items.delete(itemId);
  }

  /**
   * 清空所有物品
   */
  clearItems() {
    this.items.forEach((item, itemId) => {
      if (item.mesh) {
        this.scene.remove(item.mesh);
      }
    });

    if (this.physics) {
      this.physics.clearItemBodies();
    }

    this.items.clear();
  }

  /**
   * 更新物品位置（用于拖拽）
   */
  updateItemPosition(itemId, x, y, z) {
    const item = this.items.get(itemId);
    if (!item) return;

    if (item.mesh) {
      item.mesh.position.set(x, y, z);
    }

    if (this.physics && item.body) {
      this.physics.updateItemPosition(itemId, x, y, z);
    }
  }

  /**
   * 应用冲量（用于颠勺效果）
   */
  applyImpulse(itemId, impulse) {
    if (this.physics) {
      this.physics.applyImpulse(itemId, impulse);
    }
  }

  /**
   * 渲染场景
   */
  render() {
    if (!this.isInitialized) return;

    const delta = this.clock.getDelta();

    // 更新物理
    if (this.physics) {
      this.physics.step(delta);
    }

    // 渲染
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 射线检测（屏幕坐标转3D射线）
   */
  getRayFromScreen(screenX, screenY) {
    const THREE = this.THREE;
    if (!THREE.Raycaster) return null;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 转换屏幕坐标
    mouse.x = (screenX / this.canvas.width) * 2 - 1;
    mouse.y = -(screenY / this.canvas.height) * 2 + 1;

    raycaster.setFromCamera(mouse, this.camera);
    return raycaster;
  }

  /**
   * 点击检测
   */
  raycast(screenX, screenY) {
    const THREE = this.THREE;
    if (!THREE.Raycaster) return null;

    const raycaster = this.getRayFromScreen(screenX, screenY);
    if (!raycaster) return null;

    // 收集所有可点击的网格
    const clickableMeshes = [];
    const meshToItem = new Map();

    this.items.forEach((item, itemId) => {
      if (item.data.clickable !== false && item.mesh) {
        clickableMeshes.push(item.mesh);
        meshToItem.set(item.mesh, item);
      }
    });

    // 射线检测
    const intersects = raycaster.intersectObjects(clickableMeshes);

    if (intersects.length > 0) {
      const hitItem = meshToItem.get(intersects[0].object);
      if (hitItem) {
        return hitItem.data;
      }
    }

    return null;
  }

  /**
   * 解析颜色
   */
  parseColor(color) {
    const THREE = this.THREE;

    if (typeof color === 'number') {
      return new THREE.Color(color);
    }

    if (typeof color === 'string') {
      return new THREE.Color(color);
    }

    return new THREE.Color(0xffffff);
  }

  /**
   * 调整画布大小
   */
  resize(width, height) {
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  /**
   * 销毁场景
   */
  dispose() {
    this.clearItems();

    if (this.physics) {
      this.physics.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
    }

    this.isInitialized = false;
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Scene3D;
} else {
  if (typeof global !== 'undefined') {
    global.Scene3D = Scene3D;
  }
  if (typeof wx !== 'undefined') {
    wx.Scene3D = Scene3D;
  }
}

export default Scene3D;
