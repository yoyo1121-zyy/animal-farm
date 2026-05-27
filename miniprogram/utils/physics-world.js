// 3D 物理世界管理器 - 简化版物理引擎
// 微信小游戏适配版本（不依赖外部 Cannon.js）

// 简化的物理类
class Vec3 {
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

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  add(v) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  sub(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s) {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }
}

class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  copy(q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
  }

  setFromAxisAngle(axis, angle) {
    const halfAngle = angle / 2;
    const sinHalf = Math.sin(halfAngle);
    this.x = axis.x * sinHalf;
    this.y = axis.y * sinHalf;
    this.z = axis.z * sinHalf;
    this.w = Math.cos(halfAngle);
    return this;
  }
}

class PhysicsBody {
  constructor(options = {}) {
    this.mass = options.mass !== undefined ? options.mass : 1;
    this.position = options.position || new Vec3(0, 0, 0);
    this.velocity = new Vec3(0, 0, 0);
    this.angularVelocity = new Vec3(0, 0, 0);
    this.quaternion = new Quaternion(0, 0, 0, 1);
    this.force = new Vec3(0, 0, 0);
    this.torque = new Vec3(0, 0, 0);
    this.linearDamping = options.linearDamping !== undefined ? options.linearDamping : 0.01;
    this.angularDamping = options.angularDamping !== undefined ? options.angularDamping : 0.01;
    this.radius = options.radius || 1;
    this.isStatic = this.mass === 0;
  }

  applyForce(force) {
    if (this.isStatic) return;
    this.force.x += force.x;
    this.force.y += force.y;
    this.force.z += force.z;
  }

  applyImpulse(impulse) {
    if (this.isStatic) return;
    this.velocity.x += impulse.x / this.mass;
    this.velocity.y += impulse.y / this.mass;
    this.velocity.z += impulse.z / this.mass;
  }

  integrate(dt, gravity) {
    if (this.isStatic) return;

    // 应用重力
    this.velocity.y += gravity * dt;

    // 应用力
    this.velocity.x += this.force.x / this.mass * dt;
    this.velocity.y += this.force.y / this.mass * dt;
    this.velocity.z += this.force.z / this.mass * dt;

    // 阻尼
    this.velocity.x *= (1 - this.linearDamping);
    this.velocity.y *= (1 - this.linearDamping);
    this.velocity.z *= (1 - this.linearDamping);

    // 更新位置
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 清空力
    this.force.x = 0;
    this.force.y = 0;
    this.force.z = 0;

    // 简单的地面碰撞
    if (this.position.y < -10 + this.radius) {
      this.position.y = -10 + this.radius;
      this.velocity.y *= -0.3; // 反弹
      this.velocity.x *= 0.8; // 摩擦
      this.velocity.z *= 0.8;
    }
  }
}

class PhysicsWorld {
  constructor() {
    this.bodies = new Map(); // itemId -> PhysicsBody
    this.meshes = new Map(); // itemId -> THREE.Mesh
    this.isInitialized = false;
    this.gravity = -20;
    this.timeStep = 1/60;
    this.accumulatedTime = 0;
  }

  /**
   * 初始化物理世界
   */
  init() {
    this.isInitialized = true;
    console.log('[PhysicsWorld] 物理世界初始化成功（简化版）');
    return true;
  }

  /**
   * 为物品创建物理刚体
   * @param {Object} item - 游戏物品
   * @param {THREE.Mesh} mesh - 对应的3D网格
   */
  createItemBody(item, mesh) {
    const body = new PhysicsBody({
      mass: 1,
      radius: 2,
      position: new Vec3(
        (item.x - 150) / 10,
        10 + (item.zIndex || 0) * 2,
        (item.y - 150) / 10
      ),
      linearDamping: 0.3,
      angularDamping: 0.3
    });

    this.bodies.set(item.id, body);
    this.meshes.set(item.id, mesh);

    console.log('[PhysicsWorld] 创建物品刚体:', item.id);
    return body;
  }

  /**
   * 更新物品刚体位置（用于拖拽等操作）
   */
  updateItemPosition(itemId, x, y, z) {
    const body = this.bodies.get(itemId);
    if (body) {
      body.position.set(x, y, z);
      body.velocity.set(0, 0, 0);
    }
  }

  /**
   * 施加力到刚体（用于颠勺等效果）
   */
  applyForce(itemId, force) {
    const body = this.bodies.get(itemId);
    if (body) {
      body.applyForce(force);
    }
  }

  /**
   * 施加冲量到刚体
   */
  applyImpulse(itemId, impulse) {
    const body = this.bodies.get(itemId);
    if (body) {
      body.applyImpulse(impulse);
    }
  }

  /**
   * 设置刚体速度
   */
  setVelocity(itemId, velocity) {
    const body = this.bodies.get(itemId);
    if (body) {
      body.velocity.set(velocity.x, velocity.y, velocity.z);
    }
  }

  /**
   * 移除物品刚体
   */
  removeItemBody(itemId) {
    this.bodies.delete(itemId);
    this.meshes.delete(itemId);
  }

  /**
   * 清空所有物品刚体
   */
  clearItemBodies() {
    this.bodies.clear();
    this.meshes.clear();
  }

  /**
   * 同步物理世界到渲染网格
   */
  syncMeshes() {
    const THREE = typeof THREE !== 'undefined' ? THREE : null;
    if (!THREE) return;

    this.bodies.forEach((body, itemId) => {
      const mesh = this.meshes.get(itemId);
      if (mesh && mesh.position) {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        if (mesh.quaternion) {
          mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
        }
      }
    });
  }

  /**
   * 步进物理模拟
   */
  step(dt) {
    if (!this.isInitialized) return;

    // 固定时间步长
    this.accumulatedTime += dt;
    while (this.accumulatedTime >= this.timeStep) {
      this.bodies.forEach((body) => {
        body.integrate(this.timeStep, this.gravity);
      });
      this.accumulatedTime -= this.timeStep;
    }

    this.syncMeshes();
  }

  /**
   * 射线检测（简化版 - 球体检测）
   */
  raycast(from, to) {
    const direction = to.sub(from);
    const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);

    // 归一化方向
    const dir = new Vec3(
      direction.x / distance,
      direction.y / distance,
      direction.z / distance
    );

    let closestHit = null;
    let closestDist = Infinity;

    this.bodies.forEach((body, itemId) => {
      const toBody = body.position.sub(from);
      const projection = toBody.x * dir.x + toBody.y * dir.y + toBody.z * dir.z;

      if (projection > 0 && projection < distance) {
        const closestPoint = new Vec3(
          from.x + dir.x * projection,
          from.y + dir.y * projection,
          from.z + dir.z * projection
        );

        const distToCenter = Math.sqrt(
          Math.pow(closestPoint.x - body.position.x, 2) +
          Math.pow(closestPoint.y - body.position.y, 2) +
          Math.pow(closestPoint.z - body.position.z, 2)
        );

        if (distToCenter < body.radius && projection < closestDist) {
          closestDist = projection;
          closestHit = {
            itemId: itemId,
            point: closestPoint,
            normal: new Vec3(
              closestPoint.x - body.position.x,
              closestPoint.y - body.position.y,
              closestPoint.z - body.position.z
            )
          };
        }
      }
    });

    return closestHit;
  }

  /**
   * 销毁物理世界
   */
  dispose() {
    this.clearItemBodies();
    this.isInitialized = false;
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhysicsWorld;
} else {
  if (typeof global !== 'undefined') {
    global.PhysicsWorld = PhysicsWorld;
  }
  if (typeof wx !== 'undefined') {
    wx.PhysicsWorld = PhysicsWorld;
  }
}

export default PhysicsWorld;
