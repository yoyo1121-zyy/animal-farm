// 3D 模型预渲染管理器 - 使用微信小游戏适配版 Three.js
// 预渲染 3D 模型为图片，在 2D Canvas 上绘制

// 使用 CommonJS 导入（微信小游戏兼容）
let createScopedThreejs;
try {
  // 尝试多种路径方式加载 threejs-miniprogram
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

// 加载模型配置
let ModelConfig3D;
try {
  ModelConfig3D = require('./3d-models-config.js');
} catch (e) {
  console.warn('3d-models-config not found:', e);
}

let THREE = null;
let cachedCanvas = null;
let loadedModels = new Map(); // 缓存已加载的 GLB 模型

class ThreeScene {
  constructor() {
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.renderedItems = new Map(); // "typeId_color" -> canvas (预渲染的图片)
    this.isInitialized = false;
    this.isLoading = false;
  }

  /**
   * 初始化 Three.js 场景
   */
  async init() {
    try {
      console.log('[ThreeScene] 开始初始化...');

      // 检查是否支持 threejs-miniprogram
      if (!createScopedThreejs) {
        console.warn('[ThreeScene] threejs-miniprogram not available');
        return false;
      }
      console.log('[ThreeScene] createScopedThreejs 可用');

      // 创建临时 Canvas 用于预渲染
      let tempCanvas;
      if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        tempCanvas = wx.createOffscreenCanvas({
          type: 'webgl',
          width: 128,
          height: 128
        });
        console.log('[ThreeScene] 创建 WebGL Canvas 成功');
      } else if (typeof document !== 'undefined') {
        tempCanvas = document.createElement('canvas');
        tempCanvas.width = 128;
        tempCanvas.height = 128;
        console.log('[ThreeScene] 创建 DOM Canvas 成功');
      } else {
        console.error('[ThreeScene] 无法创建 Canvas');
        return false;
      }

      // 使用 threejs-miniprogram 适配器获取 THREE
      if (!THREE) {
        THREE = createScopedThreejs(tempCanvas);
        console.log('[ThreeScene] THREE 对象创建成功');
      }

      if (!THREE) {
        console.error('[ThreeScene] THREE.js 加载失败');
        return false;
      }

      // 检查THREE对象的关键属性
      console.log('[ThreeScene] THREE.Scene:', typeof THREE.Scene);
      console.log('[ThreeScene] THREE.PerspectiveCamera:', typeof THREE.PerspectiveCamera);
      console.log('[ThreeScene] THREE.WebGLRenderer:', typeof THREE.WebGLRenderer);

      cachedCanvas = tempCanvas;

      // 创建场景
      this.scene = new THREE.Scene();
      this.scene.background = null; // 透明背景
      console.log('[ThreeScene] 场景创建成功');

      // 创建相机
      this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      this.camera.position.set(0, 0, 3.5);
      console.log('[ThreeScene] 相机创建成功');

      // 创建渲染器 - 微信小游戏兼容配置
      this.renderer = new THREE.WebGLRenderer({
        canvas: tempCanvas,
        antialias: false,
        alpha: true,
        preserveDrawingBuffer: true,
        precision: 'mediump',
        powerPreference: 'default'
      });
      this.renderer.setSize(128, 128);
      this.renderer.setPixelRatio(1);
      if (THREE.SRGBColorSpace) {
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      }
      console.log('[ThreeScene] 渲染器创建成功');

      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
      mainLight.position.set(2, 3, 2);
      this.scene.add(mainLight);

      const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-2, 1, -2);
      this.scene.add(backLight);
      console.log('[ThreeScene] 光源添加成功');

      this.isInitialized = true;
      console.log('[ThreeScene] ✓ Three.js 预渲染器初始化成功');
      return true;

    } catch (e) {
      console.error('[ThreeScene] ✗ Three.js 初始化失败:', e);
      return false;
    }
  }

  /**
   * 加载 GLB 模型（使用微信小游戏文件系统直接读取）
   * @param {string} modelPath - GLB 模型路径
   * @returns {Promise<THREE.Group>} 加载的模型
   */
  async loadGLBModel(modelPath) {
    if (loadedModels.has(modelPath)) {
      return loadedModels.get(modelPath);
    }

    console.log('[ThreeScene] 开始加载GLB模型:', modelPath);

    // 使用微信小游戏文件系统直接读取GLB文件
    if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
      console.warn('[ThreeScene] 微信小游戏环境不可用，使用后备模型');
      return this.createFallbackModel();
    }

    return new Promise((resolve, reject) => {
      const fs = wx.getFileSystemManager();

      // 尝试多种可能的路径格式
      const possiblePaths = [
        modelPath,
        'miniprogram/' + modelPath,
        './' + modelPath,
        '../' + modelPath,
        '/miniprogram/' + modelPath,
        modelPath.startsWith('miniprogram/') ? modelPath.substring(12) : modelPath
      ];

      console.log('[ThreeScene] 尝试路径:', possiblePaths);

      // 递归尝试每个路径
      let pathIndex = 0;

      const tryReadFile = () => {
        if (pathIndex >= possiblePaths.length) {
          console.error('[ThreeScene] 所有路径都失败，使用后备模型');
          resolve(this.createFallbackModel());
          return;
        }

        const currentPath = possiblePaths[pathIndex];
        console.log(`[ThreeScene] 尝试路径 ${pathIndex + 1}/${possiblePaths.length}:`, currentPath);

        fs.readFile({
          filePath: currentPath,
          success: (res) => {
            try {
              console.log('[ThreeScene] 文件读取成功！大小:', res.data.byteLength, '字节');
              // 解析GLB文件并创建模型
              const model = this.parseGLBData(res.data);
              if (model) {
                loadedModels.set(modelPath, model);
                console.log('[ThreeScene] GLB模型加载成功:', modelPath);
                resolve(model);
              } else {
                console.warn('[ThreeScene] GLB解析失败，使用后备模型');
                resolve(this.createFallbackModel());
              }
            } catch (e) {
              console.error('[ThreeScene] GLB解析错误:', e);
              resolve(this.createFallbackModel());
            }
          },
          fail: (err) => {
            console.log(`[ThreeScene] 路径 ${pathIndex + 1} 失败:`, err);
            pathIndex++;
            tryReadFile(); // 尝试下一个路径
          }
        });
      };

      tryReadFile();
    });
  }

  /**
   * 创建后备模型（彩色立方体）
   */
  createFallbackModel(color = 0xffffff) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  /**
   * 解析GLB数据（简化版本，只支持基本的网格和材质）
   */
  parseGLBData(arrayBuffer) {
    try {
      const dataView = new DataView(arrayBuffer);
      let byteOffset = 0;

      // 检查GLB魔数
      const magic = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      if (magic !== 0x46546C67) { // 'glTF'
        console.error('[ThreeScene] 无效的GLB文件');
        return null;
      }

      const version = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      const totalLength = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      console.log('[ThreeScene] GLB版本:', version, '总长度:', totalLength);

      // 读取所有chunk
      const chunks = [];
      while (byteOffset < totalLength) {
        const chunkLength = dataView.getUint32(byteOffset, true);
        byteOffset += 4;

        const chunkType = dataView.getUint32(byteOffset, true);
        byteOffset += 4;

        const chunkData = arrayBuffer.slice(byteOffset, byteOffset + chunkLength);
        chunks.push({ type: chunkType, data: chunkData });
        byteOffset += chunkLength;
      }

      console.log('[ThreeScene] 找到', chunks.length, '个chunk');

      // JSON chunk (type = 0x4E4F534A = "JSON")
      const jsonChunk = chunks.find(c => c.type === 0x4E4F534A);
      if (!jsonChunk) {
        console.error('[ThreeScene] 未找到JSON chunk');
        return null;
      }

      // 解析JSON
      const jsonText = new TextDecoder().decode(jsonChunk.data);
      const gltf = JSON.parse(jsonText);
      console.log('[ThreeScene] GLTF JSON:', gltf);

      // Binary chunk (type = 0x004E4942 = "BIN")
      const binaryChunk = chunks.find(c => c.type === 0x004E4942);
      const binaryData = binaryChunk ? binaryChunk.data : null;

      // 创建Three.js对象
      const group = new THREE.Group();

      // 处理场景
      const sceneDef = gltf.scenes || [{}];
      const scene = sceneDef[gltf.scene || 0] || {};

      // 处理节点
      if (gltf.nodes) {
        const rootNodes = scene.nodes || [];
        rootNodes.forEach(nodeIndex => {
          const node = this.processNode(gltf, nodeIndex, binaryData);
          if (node) {
            group.add(node);
          }
        });
      }

      // 如果没有节点，直接处理mesh
      if (group.children.length === 0 && gltf.meshes) {
        const mesh = this.processMesh(gltf, 0, binaryData);
        if (mesh) {
          group.add(mesh);
        }
      }

      if (group.children.length > 0) {
        console.log('[ThreeScene] 成功创建模型，包含', group.children.length, '个对象');
      } else {
        console.warn('[ThreeScene] 模型创建后没有子对象');
      }

      return group;

    } catch (e) {
      console.error('[ThreeScene] GLB解析失败:', e);
      return null;
    }
  }

  /**
   * 处理节点
   */
  processNode(gltf, nodeIndex, binaryData) {
    const nodeDef = gltf.nodes[nodeIndex];
    if (!nodeDef) return null;

    let object;

    // 处理mesh
    if (nodeDef.mesh !== undefined) {
      const mesh = this.processMesh(gltf, nodeDef.mesh, binaryData);
      object = mesh;
    } else {
      object = new THREE.Group();
    }

    // 处理变换
    if (nodeDef.translation) {
      object.position.set(nodeDef.translation[0], nodeDef.translation[1], nodeDef.translation[2]);
    }
    if (nodeDef.rotation) {
      object.quaternion.set(nodeDef.rotation[0], nodeDef.rotation[1], nodeDef.rotation[2], nodeDef.rotation[3]);
    }
    if (nodeDef.scale) {
      object.scale.set(nodeDef.scale[0], nodeDef.scale[1], nodeDef.scale[2]);
    }

    // 处理子节点
    if (nodeDef.children) {
      nodeDef.children.forEach(childIndex => {
        const child = this.processNode(gltf, childIndex, binaryData);
        if (child) {
          object.add(child);
        }
      });
    }

    return object;
  }

  /**
   * 处理mesh
   */
  processMesh(gltf, meshIndex, binaryData) {
    const meshDef = gltf.meshes[meshIndex];
    if (!meshDef) return null;

    const group = new THREE.Group();

    meshDef.primitives.forEach((primitive, primitiveIndex) => {
      const geometry = this.processGeometry(gltf, primitive, binaryData);
      const material = this.processMaterial(gltf, primitive.material, binaryData);

      if (geometry && material) {
        const mesh = new THREE.Mesh(geometry, material);
        group.add(mesh);
      }
    });

    return group;
  }

  /**
   * 处理几何体
   */
  processGeometry(gltf, primitive, binaryData) {
    if (primitive.attributes === undefined) return null;

    const geometry = new THREE.BufferGeometry();

    // 收集所有属性数据
    const attributes = {};
    let indices = null;

    // 处理position属性
    if (primitive.attributes.POSITION !== undefined) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      const data = this.getAccessorData(gltf, accessor, binaryData);

      if (data) {
        attributes.position = {
          itemSize: 3,
          array: new Float32Array(data),
          count: accessor.count
        };
      }
    }

    // 处理normal属性
    if (primitive.attributes.NORMAL !== undefined) {
      const accessor = gltf.accessors[primitive.attributes.NORMAL];
      const data = this.getAccessorData(gltf, accessor, binaryData);

      if (data) {
        attributes.normal = {
          itemSize: 3,
          array: new Float32Array(data),
          count: accessor.count
        };
      }
    }

    // 处理uv属性
    if (primitive.attributes.TEXCOORD_0 !== undefined) {
      const accessor = gltf.accessors[primitive.attributes.TEXCOORD_0];
      const data = this.getAccessorData(gltf, accessor, binaryData);

      if (data) {
        attributes.uv = {
          itemSize: 2,
          array: new Float32Array(data),
          count: accessor.count
        };
      }
    }

    // 处理indices
    if (primitive.indices !== undefined) {
      const accessor = gltf.accessors[primitive.indices];
      const data = this.getAccessorData(gltf, accessor, binaryData);

      if (data) {
        indices = new Uint16Array(data);
      }
    }

    // 尝试多种方式设置属性
    try {
      // 方法1: 使用 setAttribute (新版 Three.js)
      if (geometry.setAttribute && typeof geometry.setAttribute === 'function') {
        for (const [name, attr] of Object.entries(attributes)) {
          geometry.setAttribute(name, new THREE.BufferAttribute(attr.array, attr.itemSize));
        }
        if (indices) {
          geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }
      }
      // 方法2: 使用 addAttribute (旧版 Three.js)
      else if (geometry.addAttribute && typeof geometry.addAttribute === 'function') {
        for (const [name, attr] of Object.entries(attributes)) {
          geometry.addAttribute(name, new THREE.BufferAttribute(attr.array, attr.itemSize));
        }
        if (indices && geometry.setIndex) {
          geometry.setIndex(indices);
        }
      }
      // 方法3: 直接设置 attributes 属性
      else {
        geometry.attributes = attributes;
        geometry.index = indices ? { array: indices } : null;
      }
    } catch (e) {
      console.warn('[ThreeScene] 设置几何体属性失败，使用备用方案:', e);
      // 备用方案：直接设置
      geometry.attributes = attributes;
      geometry.index = indices ? { array: indices } : null;
    }

    return geometry;
  }

  /**
   * 获取accessor数据
   */
  getAccessorData(gltf, accessor, binaryData) {
    if (!accessor) return null;
    if (!binaryData && !gltf.bufferViews) return null;

    const bufferViewIndex = accessor.bufferView;
    if (bufferViewIndex === undefined) return null;

    const bufferView = gltf.bufferViews[bufferViewIndex];
    if (!bufferView) return null;

    // 检查是否有buffer引用
    const bufferIndex = bufferView.buffer;
    if (bufferIndex === undefined) return null;

    // 数据在binary chunk中（bufferIndex为0且没有buffer定义）
    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);

    // 计算正确的字节长度
    const componentSize = this.getComponentSizeForType(accessor.componentType);
    const numComponents = this.getNumComponentsForType(accessor.type);
    const byteLength = accessor.count * componentSize * numComponents;

    if (binaryData) {
      return binaryData.slice(byteOffset, byteOffset + byteLength);
    }

    return null;
  }

  /**
   * 获取组件类型对应的字节大小
   */
  getComponentSizeForType(componentType) {
    const sizes = {
      5120: 1,  // BYTE
      5121: 1,  // UNSIGNED_BYTE
      5122: 2,  // SHORT
      5123: 2,  // UNSIGNED_SHORT
      5125: 4,  // UNSIGNED_INT
      5126: 4   // FLOAT
    };
    return sizes[componentType] || 4;
  }

  /**
   * 获取数据类型的组件数量
   */
  getNumComponentsForType(type) {
    const sizes = {
      'SCALAR': 1,
      'VEC2': 2,
      'VEC3': 3,
      'VEC4': 4,
      'MAT2': 4,
      'MAT3': 9,
      'MAT4': 16
    };
    return sizes[type] || 1;
  }

  /**
   * 处理材质
   */
  processMaterial(gltf, materialIndex, binaryData) {
    if (materialIndex === undefined) {
      // 默认材质
      return new THREE.MeshBasicMaterial({ color: 0xffffff });
    }

    const materialDef = gltf.materials[materialIndex];
    if (!materialDef) {
      return new THREE.MeshBasicMaterial({ color: 0xffffff });
    }

    // 简化版：只处理基础颜色
    let color = 0xffffff;
    if (materialDef.pbrMetallicRoughness && materialDef.pbrMetallicRoughness.baseColorFactor) {
      const c = materialDef.pbrMetallicRoughness.baseColorFactor;
      color = (c[0] * 255) << 16 | (c[1] * 255) << 8 | (c[2] * 255);
    }

    return new THREE.MeshBasicMaterial({ color: color });
  }

  /**
   * 预渲染物品为图片
   * @param {Object} itemData - {type, color, emoji}
   * @returns {Promise<Object>} {canvas, rotation} 预渲染的 Canvas 和旋转角度
   */
  async renderItemToCanvas(itemData) {
    if (!this.isInitialized) {
      console.warn('[ThreeScene] 未初始化，无法渲染物品');
      return null;
    }

    const key = `${itemData.type}_${itemData.color}`;
    let cached = this.renderedItems.get(key);

    if (cached) {
      console.log('[ThreeScene] 使用缓存的渲染结果:', key);
      return cached;
    }

    console.log('[ThreeScene] 开始预渲染物品:', key);

    // 清空场景中的模型
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.isMesh || child.isGroup) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(obj => this.scene.remove(obj));

    // 创建模型
    const model = await this.createModelForItem(itemData);

    if (!model) {
      console.error('[ThreeScene] 模型创建失败');
      return null;
    }

    // ========== 随机旋转角度 0-360 度 ==========
    const rotX = (Math.random() - 0.5) * Math.PI * 0.3; // X轴轻微旋转
    const rotY = Math.random() * Math.PI * 2;           // Y轴360度旋转
    const rotZ = (Math.random() - 0.5) * Math.PI * 0.3; // Z轴轻微旋转

    model.rotation.set(rotX, rotY, rotZ);

    // 添加到场景
    this.scene.add(model);

    // 渲染
    try {
      this.renderer.render(this.scene, this.camera);
      console.log('[ThreeScene] WebGL渲染完成');
    } catch (e) {
      console.error('[ThreeScene] WebGL渲染失败:', e);
      return null;
    }

    // ========== 微信小游戏：创建 2D Canvas 用于绘制 ==========
    let drawCanvas;
    if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
      drawCanvas = wx.createOffscreenCanvas({
        type: '2d',
        width: 128,
        height: 128
      });
    } else if (typeof document !== 'undefined') {
      drawCanvas = document.createElement('canvas');
      drawCanvas.width = 128;
      drawCanvas.height = 128;
    } else {
      console.error('[ThreeScene] 无法创建2D Canvas');
      return null;
    }

    const ctx2d = drawCanvas.getContext('2d');
    if (!ctx2d) {
      console.error('[ThreeScene] 无法获取2D上下文');
      return null;
    }

    // ========== 关键修复：确保WebGL Canvas内容正确转移到2D Canvas ==========
    try {
      // 方法1：直接绘制（在微信小游戏中可能不工作）
      ctx2d.drawImage(cachedCanvas, 0, 0, 128, 128);
      console.log('[ThreeScene] 方法1成功：直接绘制WebGL Canvas');
    } catch (e) {
      console.warn('[ThreeScene] 方法1失败，尝试方法2:', e);
      try {
        // 方法2：使用toDataURL转换
        if (typeof wx !== 'undefined' && wx.createImage) {
          const dataURL = cachedCanvas.toDataURL('image/png');
          const img = wx.createImage();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = dataURL;
          });
          ctx2d.drawImage(img, 0, 0, 128, 128);
          console.log('[ThreeScene] 方法2成功：使用toDataURL转换');
        } else {
          throw new Error('wx.createImage不可用');
        }
      } catch (e2) {
        console.error('[ThreeScene] 方法2也失败，使用后备方案:', e2);
        // 后备方案：绘制简单的圆圈和emoji
        ctx2d.fillStyle = '#FFFFFF';
        ctx2d.beginPath();
        ctx2d.arc(64, 64, 60, 0, Math.PI * 2);
        ctx2d.fill();

        ctx2d.fillStyle = '#000000';
        ctx2d.font = 'bold 70px sans-serif';
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(itemData.emoji || '?', 64, 64);
      }
    }

    // 获取渲染结果
    const result = {
      canvas: drawCanvas,
      rotation: { x: rotX, y: rotY, z: rotZ }
    };

    // 缓存结果
    this.renderedItems.set(key, result);
    console.log('[ThreeScene] 预渲染完成并缓存:', key);

    return result;
  }

  /**
   * 为物品创建模型（加载GLB或创建基础模型）
   * @param {Object} itemData - {type, color, emoji}
   * @returns {Promise<THREE.Object3D>} 3D 模型
   */
  async createModelForItem(itemData) {
    try {
      // 获取模型路径
      const modelPath = ModelConfig3D ? ModelConfig3D.getModelPathForItemType(itemData.type) : null;

      if (modelPath) {
        // 加载 GLB 模型
        const glbModel = await this.loadGLBModel(modelPath);

        // 克隆模型以避免共享
        const model = glbModel.clone();

        // 应用颜色（如果有颜色材质）
        model.traverse((child) => {
          if (child.isMesh) {
            // 保留原有材质，但可以调整颜色
            if (child.material) {
              // 如果材质有颜色属性，可以根据物品颜色调整
              // 这里我们保持原模型颜色，因为cube-pets模型已经有颜色
            }
          }
        });

        return model;
      }
    } catch (e) {
      console.warn('加载GLB模型失败，使用基础模型:', e);
    }

    // 后备方案：创建彩色球体
    const geometry = new THREE.SphereGeometry(0.8, 16, 12);
    const color = itemData.color || '#ffffff';
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  /**
   * 获取物品的预渲染图片（异步版本）
   */
  async getItemImage(itemData) {
    console.log('[ThreeScene] getItemImage 被调用:', itemData.type, itemData.color);

    if (!this.isInitialized) {
      console.warn('[ThreeScene] ThreeScene 未初始化，返回 null');
      return null;
    }

    try {
      const result = await this.renderItemToCanvas(itemData);
      if (result) {
        console.log('[ThreeScene] getItemImage 成功返回结果');
      } else {
        console.warn('[ThreeScene] getItemImage 返回 null');
      }
      return result;
    } catch (e) {
      console.error('[ThreeScene] getItemImage 出错:', e);
      return null;
    }
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.renderedItems.clear();
    loadedModels.clear();
  }

  /**
   * 销毁
   */
  dispose() {
    this.renderedItems.clear();
    loadedModels.clear();
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.isInitialized = false;
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThreeScene;
} else {
  if (typeof global !== 'undefined') {
    global.ThreeScene = ThreeScene;
  }
  if (typeof wx !== 'undefined') {
    wx.ThreeScene = ThreeScene;
  }
}
