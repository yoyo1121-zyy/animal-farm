// OBJLoader 微信小游戏适配版本
// 用于加载OBJ格式的3D模型

const THREE = require('./three.min.js');

THREE.OBJLoader = class {
  constructor(manager = new THREE.LoadingManager()) {
    this.manager = manager;
    this.materials = null;
  }

  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.path = this.path;
    loader.responseType = 'text';

    loader.load(url, (text) => {
      try {
        const object = this.parse(text);
        if (onLoad) onLoad(object);
      } catch (e) {
        if (onError) onError(e);
      }
    }, onProgress, onError);
  }

  setPath(value) {
    this.path = value;
    return this;
  }

  setMaterials(materials) {
    this.materials = materials;
    return this;
  }

  parse(text) {
    const objects = [];
    let object;
    const vertices = [];
    const normals = [];
    const uvs = [];

    // 按行解析
    const lines = text.split('\n');

    let faceVertexCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0 || line.charAt(0) === '#') continue;

      const lineFirstChar = line.charAt(0);
      const lineSubsequentChar = line.charAt(1);
      const lineSecondChar = line.charAt(1);

      // 几何体开始
      if (lineFirstChar === 'o' || lineFirstChar === 'g') {
        const name = line.slice(1).trim();
        if (object && object.geometry && object.geometry.attributes.position.count > 0) {
          objects.push(object);
        }
        object = {
          name: name,
          geometry: new THREE.BufferGeometry(),
          material: null
        };
        continue;
      }

      // 顶点
      if (lineFirstChar === 'v' && lineSubsequentChar === ' ') {
        const parts = line.slice(1).trim().split(/\s+/);
        vertices.push(
          parseFloat(parts[0]),
          parseFloat(parts[1]),
          parseFloat(parts[2])
        );
        continue;
      }

      // 法线
      if (lineFirstChar === 'v' && lineSubsequentChar === 'n') {
        const parts = line.slice(2).trim().split(/\s+/);
        normals.push(
          parseFloat(parts[0]),
          parseFloat(parts[1]),
          parseFloat(parts[2])
        );
        continue;
      }

      // UV坐标
      if (lineFirstChar === 'v' && lineSubsequentChar === 't') {
        const parts = line.slice(2).trim().split(/\s+/);
        uvs.push(
          parseFloat(parts[0]),
          parseFloat(parts[1])
        );
        continue;
      }

      // 面
      if (lineFirstChar === 'f') {
        const faceData = line.slice(1).trim().split(/\s+/);
        const faceVertices = [];
        const faceVertexUvs = [];
        const faceNormals = [];

        for (let j = 0; j < faceData.length; j++) {
          const vertexData = faceData[j].split('/');

          // 顶点索引
          const vertexIndex = parseInt(vertexData[0]) - 1;
          if (vertexIndex >= 0 && vertexIndex * 3 < vertices.length) {
            faceVertices.push(
              vertices[vertexIndex * 3],
              vertices[vertexIndex * 3 + 1],
              vertices[vertexIndex * 3 + 2]
            );
          }

          // UV索引
          if (vertexData.length > 1 && vertexData[1]) {
            const uvIndex = parseInt(vertexData[1]) - 1;
            if (uvIndex >= 0 && uvIndex * 2 < uvs.length) {
              faceVertexUvs.push(
                uvs[uvIndex * 2],
                uvs[uvIndex * 2 + 1]
              );
            }
          }

          // 法线索引
          if (vertexData.length > 2 && vertexData[2]) {
            const normalIndex = parseInt(vertexData[2]) - 1;
            if (normalIndex >= 0 && normalIndex * 3 < normals.length) {
              faceNormals.push(
                normals[normalIndex * 3],
                normals[normalIndex * 3 + 1],
                normals[normalIndex * 3 + 2]
              );
            }
          }
        }

        // 创建三角形（如果是四边形则分割）
        if (faceVertices.length >= 9) {
          // 第一个三角形
          if (!object) {
            object = {
              name: 'object',
              geometry: new THREE.BufferGeometry(),
              material: null
            };
          }

          if (!object.positionArray) {
            object.positionArray = [];
            object.uvArray = [];
            object.normalArray = [];
          }

          // 三角形1: 0, 1, 2
          object.positionArray.push(
            faceVertices[0], faceVertices[1], faceVertices[2],
            faceVertices[3], faceVertices[4], faceVertices[5],
            faceVertices[6], faceVertices[7], faceVertices[8]
          );

          if (faceVertexUvs.length >= 6) {
            object.uvArray.push(
              faceVertexUvs[0], faceVertexUvs[1],
              faceVertexUvs[2], faceVertexUvs[3],
              faceVertexUvs[4], faceVertexUvs[5]
            );
          }

          if (faceNormals.length >= 9) {
            object.normalArray.push(
              faceNormals[0], faceNormals[1], faceNormals[2],
              faceNormals[3], faceNormals[4], faceNormals[5],
              faceNormals[6], faceNormals[7], faceNormals[8]
            );
          }

          // 如果是四边形，创建第二个三角形
          if (faceVertices.length >= 12) {
            object.positionArray.push(
              faceVertices[0], faceVertices[1], faceVertices[2],
              faceVertices[6], faceVertices[7], faceVertices[8],
              faceVertices[9], faceVertices[10], faceVertices[11]
            );

            if (faceVertexUvs.length >= 8) {
              object.uvArray.push(
                faceVertexUvs[0], faceVertexUvs[1],
                faceVertexUvs[4], faceVertexUvs[5],
                faceVertexUvs[6], faceVertexUvs[7]
              );
            }

            if (faceNormals.length >= 12) {
              object.normalArray.push(
                faceNormals[0], faceNormals[1], faceNormals[2],
                faceNormals[6], faceNormals[7], faceNormals[8],
                faceNormals[9], faceNormals[10], faceNormals[11]
              );
            }
          }
        }
      }
    }

    // 如果有数据，添加到对象
    if (object && object.positionArray && object.positionArray.length > 0) {
      object.geometry.setAttribute('position',
        new THREE.BufferAttribute(new Float32Array(object.positionArray), 3));

      if (object.uvArray && object.uvArray.length > 0) {
        object.geometry.setAttribute('uv',
          new THREE.BufferAttribute(new Float32Array(object.uvArray), 2));
      }

      if (object.normalArray && object.normalArray.length > 0) {
        object.geometry.setAttribute('normal',
          new THREE.BufferAttribute(new Float32Array(object.normalArray), 3));
      } else {
        // 计算法线
        object.geometry.computeVertexNormals();
      }

      objects.push(object);
    }

    // 创建Three.js对象
    const group = new THREE.Group();

    for (let i = 0; i < objects.length; i++) {
      const objData = objects[i];
      const mesh = new THREE.Mesh(
        objData.geometry,
        objData.material || new THREE.MeshPhongMaterial({ color: 0xcccccc })
      );
      mesh.name = objData.name;
      group.add(mesh);
    }

    // 如果没有对象，创建一个空对象
    if (objects.length === 0 && vertices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position',
        new THREE.BufferAttribute(new Float32Array(vertices), 3));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0xcccccc }));
      group.add(mesh);
    }

    return group;
  }
};

// 添加computeVertexNormals方法
THREE.BufferGeometry.prototype.computeVertexNormals = function() {
  const index = this.index;
  const positions = this.attributes.position;
  const normals = this.attributes.normal;

  if (!positions) return;

  let n;
  if (index) {
    n = index.count;
  } else {
    n = positions.count;
  }

  const vertexNormals = new Float32Array(n * 3);

  for (let i = 0; i < n; i++) {
    vertexNormals[i * 3] = 0;
    vertexNormals[i * 3 + 1] = 0;
    vertexNormals[i * 3 + 2] = 0;
  }

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  let indexed = index !== null;

  if (indexed) {
    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i);
      const ib = index.getX(i + 1);
      const ic = index.getX(i + 2);

      pA.fromBufferAttribute(positions, ia);
      pB.fromBufferAttribute(positions, ib);
      pC.fromBufferAttribute(positions, ic);

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);

      vertexNormals[ia * 3] += cb.x;
      vertexNormals[ia * 3 + 1] += cb.y;
      vertexNormals[ia * 3 + 2] += cb.z;

      vertexNormals[ib * 3] += cb.x;
      vertexNormals[ib * 3 + 1] += cb.y;
      vertexNormals[ib * 3 + 2] += cb.z;

      vertexNormals[ic * 3] += cb.x;
      vertexNormals[ic * 3 + 1] += cb.y;
      vertexNormals[ic * 3 + 2] += cb.z;
    }
  } else {
    for (let i = 0; i < positions.count; i += 3) {
      pA.fromBufferAttribute(positions, i);
      pB.fromBufferAttribute(positions, i + 1);
      pC.fromBufferAttribute(positions, i + 2);

      cb.subVectors(pC, pB);
      ab.subVectors(pA, pB);
      cb.cross(ab);

      vertexNormals[i * 3] += cb.x;
      vertexNormals[i * 3 + 1] += cb.y;
      vertexNormals[i * 3 + 2] += cb.z;

      vertexNormals[(i + 1) * 3] += cb.x;
      vertexNormals[(i + 1) * 3 + 1] += cb.y;
      vertexNormals[(i + 1) * 3 + 2] += cb.z;

      vertexNormals[(i + 2) * 3] += cb.x;
      vertexNormals[(i + 2) * 3 + 1] += cb.y;
      vertexNormals[(i + 2) * 3 + 2] += cb.z;
    }
  }

  // 归一化
  for (let i = 0; i < n; i++) {
    const nx = vertexNormals[i * 3];
    const ny = vertexNormals[i * 3 + 1];
    const nz = vertexNormals[i * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    if (len > 0) {
      vertexNormals[i * 3] = nx / len;
      vertexNormals[i * 3 + 1] = ny / len;
      vertexNormals[i * 3 + 2] = nz / len;
    }
  }

  this.setAttribute('normal', new THREE.BufferAttribute(vertexNormals, 3));
};

THREE.Vector3.prototype.fromBufferAttribute = function(attribute, index) {
  this.x = attribute.getX(index);
  this.y = attribute.getY(index);
  this.z = attribute.getZ(index);
  return this;
};

THREE.BufferAttribute.prototype.getX = function(index) { return this.array[index * this.itemSize]; };
THREE.BufferAttribute.prototype.getY = function(index) { return this.array[index * this.itemSize + 1]; };
THREE.BufferAttribute.prototype.getZ = function(index) { return this.array[index * this.itemSize + 2]; };
THREE.BufferAttribute.prototype.setXYZ = function(index, x, y, z) {
  this.array[index * this.itemSize] = x;
  this.array[index * this.itemSize + 1] = y;
  this.array[index * this.itemSize + 2] = z;
  return this;
};

// 导出
module.exports = THREE.OBJLoader;
