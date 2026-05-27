// Three.js 微信小程序适配层
// 使用小程序的 Canvas WebGL 接口

const THREE = {};

// 向量类
THREE.Vector3 = class {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  clone() {
    return new THREE.Vector3(this.x, this.y, this.z);
  }
};

// 场景类
THREE.Scene = class {
  constructor() {
    this.children = [];
  }

  add(object) {
    this.children.push(object);
    object.parent = this;
  }

  remove(object) {
    const index = this.children.indexOf(object);
    if (index > -1) {
      this.children.splice(index, 1);
      object.parent = null;
    }
  }
};

// 正交相机类
THREE.OrthographicCamera = class {
  constructor(left, right, top, bottom, near, far) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
    this.position = new THREE.Vector3(0, 10, 0);
    this.up = { x: 0, y: 0, z: -1 };
  }

  lookAt(x, y, z) {
    // 简化实现
  }
};

// WebGL 渲染器类
THREE.WebGLRenderer = class {
  constructor({ antialias = true, alpha = true } = {}) {
    this.antialias = antialias;
    this.alpha = alpha;
    this.domElement = null;
    this.canvas = null;
    this.gl = null;
  }

  setSize(width, height) {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  setClearColor(color, alpha = 1) {
    this.clearColor = color;
    this.clearAlpha = alpha;
  }

  // 初始化 WebGL 上下文
  init(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      antialias: this.antialias,
      alpha: this.alpha
    });

    if (!this.gl) {
      console.error('WebGL not supported');
      return false;
    }

    // 启用深度测试
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);

    return true;
  }

  render(scene, camera) {
    if (!this.gl) return;

    const gl = this.gl;

    // 清空画布
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 渲染所有子对象
    scene.children.forEach(child => {
      if (child.render) {
        child.render(gl, camera);
      }
    });
  }
};

// 网格基础类
THREE.Mesh = class {
  constructor(geometry, material) {
    this.geometry = geometry;
    this.material = material;
    this.position = new THREE.Vector3();
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1 };
    this.visible = true;
    this.parent = null;
    this.children = [];
  }

  set position(value) {
    this._position = value;
  }

  get position() {
    return this._position || new THREE.Vector3();
  }

  render(gl, camera) {
    if (!this.visible || !this.geometry || !this.material) return;

    // 简化渲染 - 使用 emoji 纹理
    this.geometry.render(gl, this.material, this, camera);
  }
};

// 基础几何体
THREE.SphereGeometry = class {
  constructor(radius, widthSegments, heightSegments) {
    this.type = 'sphere';
    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
  }

  render(gl, material, mesh, camera) {
    // 创建简单的圆形/球体
    const x = mesh.position.x;
    const y = mesh.position.y;
    const z = mesh.position.z;
    const size = this.radius * 2;

    gl.saveMatrix();
    gl.translate(x, y, z);
    gl.rotate(mesh.rotation.x, 1, 0, 0);
    gl.rotate(mesh.rotation.y, 0, 1, 0);
    gl.rotate(mesh.rotation.z, 0, 0, 1);
    gl.scale(mesh.scale.x, mesh.scale.y, mesh.scale.z);

    // 绘制圆形
    if (material.drawCircle) {
      material.drawCircle(gl, 0, 0, size);
    }

    gl.restoreMatrix();
  }
};

// 圆柱几何体
THREE.CylinderGeometry = class {
  constructor(radiusTop, radiusBottom, height, radialSegments) {
    this.type = 'cylinder';
    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.height = height;
    this.radialSegments = radialSegments;
  }

  render(gl, material, mesh, camera) {
    const x = mesh.position.x;
    const y = mesh.position.y;
    const z = mesh.position.z;
    const size = this.radiusTop * 2;

    gl.saveMatrix();
    gl.translate(x, y, z);
    gl.rotate(mesh.rotation.x, 1, 0, 0);
    gl.rotate(mesh.rotation.y, 0, 1, 0);
    gl.rotate(mesh.rotation.z, 0, 0, 1);
    gl.scale(mesh.scale.x, mesh.scale.y, mesh.scale.z);

    if (material.drawCircle) {
      material.drawCircle(gl, 0, 0, size);
    }

    gl.restoreMatrix();
  }
};

// 材质基类
THREE.Material = class {
  constructor(params = {}) {
    this.color = params.color !== undefined ? params.color : 0xffffff;
    this.shininess = params.shininess || 30;
  }
};

THREE.MeshPhongMaterial = class extends THREE.Material {
  constructor(params = {}) {
    super(params);
    this.transparent = params.transparent || false;
    this.opacity = params.opacity !== undefined ? params.opacity : 1;
  }
};

THREE.MeshBasicMaterial = class extends THREE.Material {
  constructor(params = {}) {
    super(params);
    this.transparent = params.transparent || false;
    this.opacity = params.opacity !== undefined ? params.opacity : 1;
  }
};

// 颜色类
THREE.Color = class {
  constructor(color) {
    if (typeof color === 'number') {
      this.setHex(color);
    } else if (typeof color === 'string') {
      this.setStyle(color);
    }
  }

  setHex(hex) {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }

  setStyle(style) {
    const temp = document.createElement('div');
    temp.style.color = style;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const match = computed.match(/\d+/g);
    if (match) {
      this.r = parseInt(match[0]) / 255;
      this.g = parseInt(match[1]) / 255;
      this.b = parseInt(match[2]) / 255;
    }
    return this;
  }

  getHex() {
    return (Math.round(this.r * 255) << 16) |
           (Math.round(this.g * 255) << 8) |
           Math.round(this.b * 255);
  }

  getHexString() {
    return '#' + this.getHex().toString(16).padStart(6, '0');
  }
};

// 组对象
THREE.Group = class extends THREE.Mesh {
  constructor() {
    super(null, null);
    this.children = [];
  }

  add(object) {
    this.children.push(object);
    object.parent = this;
  }

  traverse(callback) {
    callback(this);
    this.children.forEach(child => {
      if (child.traverse) {
        child.traverse(callback);
      }
    });
  }
};

// 灯光类
THREE.AmbientLight = class {
  constructor(color, intensity) {
    this.color = color;
    this.intensity = intensity;
  }
};

THREE.DirectionalLight = class {
  constructor(color, intensity) {
    this.color = color;
    this.intensity = intensity;
    this.position = new THREE.Vector3();
  }
};

// 导出
export default THREE;
