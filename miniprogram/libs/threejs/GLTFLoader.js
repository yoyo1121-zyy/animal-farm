// GLTFLoader for WeChat Mini Program
// 不依赖外部THREE模块，THREE由调用者传入

class GLTFLoader {
  constructor() {
    this.THREE = null; // THREE将由调用者设置
  }

  setTHREE(THREE) {
    this.THREE = THREE;
  }

  load(url, onLoad, onProgress, onError) {
    if (!this.THREE) {
      console.error('THREE not set. Call setTHREE() first.');
      if (onError) onError(new Error('THREE not set'));
      return;
    }

    const THREE = this.THREE;
    const scope = this;

    // 微信小游戏环境使用 wx.request 或 wx.getFileSystemManager 读取文件
    let resourcePath = url;

    // 使用微信小游戏文件系统读取
    const fs = wx.getFileSystemManager();

    fs.readFile({
      filePath: resourcePath.startsWith('/') ? resourcePath : '/' + resourcePath,
      success: (res) => {
        try {
          const arrayBuffer = res.data;
          const gltf = scope.parse(arrayBuffer, '', onLoad, onError);
        } catch (e) {
          if (onError) onError(e);
        }
      },
      fail: (err) => {
        console.error('Failed to load GLB file:', err);
        if (onError) onError(err);
      }
    });
  }

  parse(data, path, onLoad, onError) {
    const THREE = this.THREE;
    if (!THREE) {
      console.error('THREE not set');
      return null;
    }

    try {
      const arrayBuffer = data instanceof ArrayBuffer ? data : data.buffer;
      const dataView = new DataView(arrayBuffer);
      let byteOffset = 0;

      // 检查GLB魔数
      const magic = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      if (magic !== 0x46546C67) { // 'glTF'
        throw new Error('Invalid GLB file: magic number not found');
      }

      const version = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      const totalLength = dataView.getUint32(byteOffset, true);
      byteOffset += 4;

      // 解析chunk
      let gltfJSON = null;
      let binaryBuffer = null;

      while (byteOffset < totalLength) {
        const chunkLength = dataView.getUint32(byteOffset, true);
        byteOffset += 4;

        const chunkType = dataView.getUint32(byteOffset, true);
        byteOffset += 4;

        if (chunkType === 0x4E4F534A) { // JSON
          const jsonString = new TextDecoder().decode(
            arrayBuffer.slice(byteOffset, byteOffset + chunkLength)
          );
          gltfJSON = JSON.parse(jsonString);
        } else if (chunkType === 0x004E4942) { // BIN
          binaryBuffer = arrayBuffer.slice(byteOffset, byteOffset + chunkLength);
        }
        byteOffset += chunkLength;
      }

      if (!gltfJSON) {
        throw new Error('No JSON chunk found in GLB file');
      }

      // 创建Three.js对象
      const scene = this.parseGLTF(gltfJSON, binaryBuffer, path);

      if (onLoad) {
        onLoad({ scene: scene, scenes: [scene], asset: gltfJSON.asset || {} });
      }

      return { scene: scene, scenes: [scene], asset: gltfJSON.asset || {} };

    } catch (e) {
      console.error('GLB parse error:', e);
      if (onError) onError(e);
      return null;
    }
  }

  parseGLTF(gltf, binaryBuffer, path) {
    const THREE = this.THREE;
    const scene = new THREE.Group();
    scene.name = gltf.scenes && gltf.scenes[gltf.scene || 0] ? gltf.scenes[gltf.scene || 0].name || 'Scene' : 'Scene';

    // 处理访问器
    const accessors = gltf.accessors || [];
    const bufferViews = gltf.bufferViews || [];
    const buffers = gltf.buffers || [];
    const meshes = gltf.meshes || [];
    const nodes = gltf.nodes || [];
    const skins = gltf.skins || [];

    // 创建缓冲区数据
    const bufferData = new Map();
    if (binaryBuffer) {
      bufferData.set(0, binaryBuffer);
    }

    // 处理网格
    const meshMap = new Map();

    meshes.forEach((gltfMesh, meshIndex) => {
      const mesh = new THREE.Group();
      mesh.name = gltfMesh.name || 'Mesh_' + meshIndex;

      gltfMesh.primitives.forEach((primitive, primitiveIndex) => {
        const geometry = new THREE.BufferGeometry();
        const attributes = primitive.attributes || {};

        // 兼容性检查：使用正确的属性设置方法
        const setAttribute = geometry.setAttribute || geometry.addAttribute;

        // 处理位置属性
        if (attributes.POSITION !== undefined) {
          const accessor = accessors[attributes.POSITION];
          const data = this.getAccessorData(accessor, bufferViews, bufferData);
          setAttribute.call(geometry, 'position', new THREE.Float32BufferAttribute(data, 3));
          geometry.computeBoundingSphere();
        }

        // 处理法线属性
        if (attributes.NORMAL !== undefined) {
          const accessor = accessors[attributes.NORMAL];
          const data = this.getAccessorData(accessor, bufferViews, bufferData);
          setAttribute.call(geometry, 'normal', new THREE.Float32BufferAttribute(data, 3));
        }

        // 处理UV属性
        if (attributes.TEXCOORD_0 !== undefined) {
          const accessor = accessors[attributes.TEXCOORD_0];
          const data = this.getAccessorData(accessor, bufferViews, bufferData);
          setAttribute.call(geometry, 'uv', new THREE.Float32BufferAttribute(data, 2));
        }

        // 处理颜色属性
        if (attributes.COLOR_0 !== undefined) {
          const accessor = accessors[attributes.COLOR_0];
          const data = this.getAccessorData(accessor, bufferViews, bufferData);
          setAttribute.call(geometry, 'color', new THREE.Float32BufferAttribute(data, 4));
        }

        // 处理索引
        if (primitive.indices !== undefined) {
          const accessor = accessors[primitive.indices];
          const data = this.getAccessorData(accessor, bufferViews, bufferData);
          geometry.setIndex(new THREE.Uint16BufferAttribute(data, 1));
        }

        // 创建材质
        const materialIndex = primitive.material;
        let material = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          shininess: 30,
          side: THREE.DoubleSide
        });

        if (materialIndex !== undefined && gltf.materials) {
          material = this.createMaterial(gltf.materials[materialIndex], gltf.textures || [], gltf.images || [], bufferViews, bufferData);
        }

        const threeMesh = new THREE.Mesh(geometry, material);
        threeMesh.name = (gltfMesh.name || 'Mesh') + '_' + primitiveIndex;
        mesh.add(threeMesh);
      });

      meshMap.set(meshIndex, mesh);
    });

    // 处理节点层次结构
    const nodeMap = new Map();
    nodes.forEach((node, nodeIndex) => {
      const threeNode = new THREE.Group();
      threeNode.name = node.name || 'Node_' + nodeIndex;

      // 变换
      if (node.translation) {
        threeNode.position.set(node.translation[0], node.translation[1], node.translation[2]);
      }
      if (node.rotation) {
        threeNode.quaternion.set(node.rotation[0], node.rotation[1], node.rotation[2], node.rotation[3]);
      }
      if (node.scale) {
        threeNode.scale.set(node.scale[0], node.scale[1], node.scale[2]);
      }
      if (node.matrix) {
        const matrix = new THREE.Matrix4();
        matrix.fromArray(node.matrix);
        matrix.decompose(threeNode.position, threeNode.quaternion, threeNode.scale);
      }

      // 网格引用
      if (node.mesh !== undefined) {
        const mesh = meshMap.get(node.mesh);
        if (mesh) {
          const clonedMesh = mesh.clone();
          threeNode.add(clonedMesh);
        }
      }

      nodeMap.set(nodeIndex, threeNode);
    });

    // 构建节点层次
    nodes.forEach((node, nodeIndex) => {
      const threeNode = nodeMap.get(nodeIndex);
      if (node.children) {
        node.children.forEach(childIndex => {
          const childNode = nodeMap.get(childIndex);
          if (childNode) {
            threeNode.add(childNode);
          }
        });
      }
    });

    // 添加根节点到场景
    const sceneNodes = gltf.scenes ? gltf.scenes[gltf.scene || 0].nodes : [];
    sceneNodes.forEach(nodeIndex => {
      const node = nodeMap.get(nodeIndex);
      if (node) {
        scene.add(node);
      }
    });

    // 如果没有场景定义，添加所有根节点
    if (sceneNodes.length === 0 && nodes.length > 0) {
      const childIndices = new Set();
      nodes.forEach((node, i) => {
        if (node.children) {
          node.children.forEach(c => childIndices.add(c));
        }
      });

      nodes.forEach((node, i) => {
        if (!childIndices.has(i)) {
          const threeNode = nodeMap.get(i);
          if (threeNode) {
            scene.add(threeNode);
          }
        }
      });
    }

    return scene;
  }

  getAccessorData(accessor, bufferViews, bufferData) {
    const bufferViewIndex = accessor.bufferView;
    const bufferView = bufferViews[bufferViewIndex];

    const buffer = bufferData.get(bufferView.buffer || 0);
    if (!buffer) {
      console.warn('Buffer not found:', bufferView.buffer);
      return new Float32Array(0);
    }

    const byteOffset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
    const count = accessor.count;
    const componentType = accessor.componentType;
    const type = accessor.type;

    // 计算每个元素的字节数
    const componentSizes = {
      5120: 1,  // BYTE
      5121: 1,  // UNSIGNED_BYTE
      5122: 2,  // SHORT
      5123: 2,  // UNSIGNED_SHORT
      5125: 4,  // UNSIGNED_INT
      5126: 4   // FLOAT
    };

    const componentSize = componentSizes[componentType] || 4;
    const typeComponents = {
      SCALAR: 1,
      VEC2: 2,
      VEC3: 3,
      VEC4: 4,
      MAT2: 4,
      MAT3: 9,
      MAT4: 16
    };

    const numComponents = typeComponents[type] || 3;
    const elementSize = componentSize * numComponents;

    const data = buffer.slice(byteOffset, byteOffset + count * elementSize);

    // 转换为Float32Array
    const result = new Float32Array(count * numComponents);

    if (componentType === 5126) { // FLOAT
      result.set(new Float32Array(data));
    } else if (componentType === 5123) { // UNSIGNED_SHORT
      const view = new Uint16Array(data);
      for (let i = 0; i < view.length; i++) {
        result[i] = view[i];
      }
    } else if (componentType === 5121) { // UNSIGNED_BYTE
      const view = new Uint8Array(data);
      for (let i = 0; i < view.length; i++) {
        result[i] = view[i] / 255;
      }
    } else {
      const view = new Int16Array(data);
      for (let i = 0; i < view.length; i++) {
        result[i] = view[i];
      }
    }

    return result;
  }

  createMaterial(gltfMaterial, textures, images, bufferViews, bufferData) {
    const THREE = this.THREE;
    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 30,
      side: THREE.DoubleSide
    });

    if (gltfMaterial.pbrMetallicRoughness) {
      const pbr = gltfMaterial.pbrMetallicRoughness;

      if (pbr.baseColorFactor) {
        material.color.fromArray(pbr.baseColorFactor);
      }

      if (pbr.roughnessFactor !== undefined) {
        material.roughness = pbr.roughnessFactor;
      }

      if (pbr.metallicFactor !== undefined) {
        material.metalness = pbr.metallicFactor;
      }
    }

    if (gltfMaterial.normalTexture) {
      // 处理法线贴图（简化）
    }

    if (gltfMaterial.emissiveFactor) {
      material.emissive = new THREE.Color();
      material.emissive.fromArray(gltfMaterial.emissiveFactor);
    }

    if (gltfMaterial.doubleSided) {
      material.side = THREE.DoubleSide;
    }

    if (gltfMaterial.alphaMode === 'BLEND') {
      material.transparent = true;
    }

    return material;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GLTFLoader;
} else {
  if (typeof global !== 'undefined') {
    global.GLTFLoader = GLTFLoader;
  }
  if (typeof wx !== 'undefined') {
    wx.GLTFLoader = GLTFLoader;
  }
}
