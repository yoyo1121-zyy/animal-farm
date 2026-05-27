// Matter.js 微信小程序适配层 - 增强版
// 支持 2D 物理引擎，包括碗状容器、休眠唤醒等

const Matter = {};

// 向量工具
Matter.Vector = {
  create(x, y) {
    return { x: x || 0, y: y || 0 };
  },

  add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  sub(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  mult(v, n) {
    return { x: v.x * n, y: v.y * n };
  },

  mag(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  norm(v) {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    if (m === 0) return { x: 0, y: 0 };
    return { x: v.x / m, y: v.y / m };
  },

  dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  },

  cross(v1, v2) {
    return v1.x * v2.y - v1.y * v2.x;
  },

  rotate(v, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      x: v.x * cos - v.y * sin,
      y: v.x * sin + v.y * cos
    };
  }
};

// 物体类 - 增强版，支持休眠唤醒
Matter.Body = class {
  constructor(options) {
    this.position = { x: options.x || 0, y: options.y || 0 };
    this.velocity = { x: 0, y: 0 };
    this.force = { x: 0, y: 0 };
    this.mass = options.mass || 1;
    this.inverseMass = this.mass === 0 ? 0 : 1 / this.mass;
    this.angle = options.angle || 0;
    this.angularVelocity = 0;
    this.torque = 0;
    this.isStatic = options.isStatic || false;
    this.isSleeping = false;
    this.sleepThreshold = options.sleepThreshold || 0.3; // 速度低于此值进入休眠
    this.friction = options.friction || 0.1;
    this.frictionAir = options.frictionAir || 0.01;
    this.restitution = options.restitution || 0.5;
    this.label = options.label || '';
    this.plugin = {};
    this.render = options.render || {};
    this.circleRadius = options.circleRadius || null;
    this.width = options.width || null;
    this.height = options.height || null;
    this.type = options.type || 'circle';
    this.bounds = options.bounds || null;
  }

  static setVelocity(body, velocity) {
    body.velocity = velocity;
    body.wakeUp();
  }

  static setAngularVelocity(body, velocity) {
    body.angularVelocity = velocity;
    body.wakeUp();
  }

  static setPosition(body, position) {
    body.position = position;
    body.wakeUp();
  }

  static applyForce(body, position, force) {
    body.force.x += force.x;
    body.force.y += force.y;
    body.wakeUp();
  }

  static setStatic(body, isStatic) {
    body.isStatic = isStatic;
    if (isStatic) {
      body.velocity = { x: 0, y: 0 };
      body.angularVelocity = 0;
    }
  }

  wakeUp() {
    if (this.isSleeping) {
      this.isSleeping = false;
    }
  }

  sleep() {
    this.isSleeping = true;
    this.velocity = { x: 0, y: 0 };
    this.angularVelocity = 0;
  }

  updateBounds() {
    if (this.type === 'circle' && this.circleRadius) {
      this.bounds = {
        min: { x: this.position.x - this.circleRadius, y: this.position.y - this.circleRadius },
        max: { x: this.position.x + this.circleRadius, y: this.position.y + this.circleRadius }
      };
    } else if (this.type === 'rectangle' && this.width && this.height) {
      this.bounds = {
        min: { x: this.position.x - this.width / 2, y: this.position.y - this.height / 2 },
        max: { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 }
      };
    }
  }
};

// 碰撞体 - 增强版
Matter.Bodies = {
  circle(x, y, radius, options) {
    const body = new Matter.Body({ x, y, circleRadius: radius, type: 'circle', ...options });
    body.updateBounds();
    return body;
  },

  rectangle(x, y, width, height, options) {
    const body = new Matter.Body({ x, y, width, height, type: 'rectangle', ...options });
    body.updateBounds();
    return body;
  },

  // 创建碗状容器边界
  createBowlContainer(centerX, centerY, radius, options = {}) {
    const bodies = [];
    const segments = 24; // 碗边分段数
    const bowlDepth = options.depth || 0.3; // 碗的深度（0-1）
    const wallHeight = options.wallHeight || 30;
    const wallThickness = options.wallThickness || 10;

    // 创建碗底（圆形平面）
    const bottom = Matter.Bodies.circle(centerX, centerY, radius * 0.2, {
      isStatic: true,
      label: 'bowl-bottom',
      friction: 0.8,
      restitution: 0.2,
      render: { fillStyle: '#8B4513' }
    });
    bodies.push(bottom);

    // 创建碗壁（分段直线组成圆形边界）
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;

      // 外壁
      const x1 = centerX + Math.cos(angle1) * radius;
      const y1 = centerY + Math.sin(angle1) * radius * bowlDepth;
      const x2 = centerX + Math.cos(angle2) * radius;
      const y2 = centerY + Math.sin(angle2) * radius * bowlDepth;

      // 计算墙壁位置和角度
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const wallAngle = Math.atan2(y2 - y1, x2 - x1);
      const wallLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

      const wall = Matter.Bodies.rectangle(midX, midY, wallLength + 2, wallThickness, {
        isStatic: true,
        angle: wallAngle,
        label: 'bowl-wall',
        friction: 0.5,
        restitution: 0.3,
        render: { fillStyle: '#A0522D' }
      });
      bodies.push(wall);
    }

    return bodies;
  }
};

// 引擎 - 增强版，支持休眠和更好的碰撞
Matter.Engine = {
  create(options = {}) {
    return {
      world: {
        bodies: [],
        gravity: { x: 0, y: 0.5 },
        bounds: {
          min: { x: -Infinity, y: -Infinity },
          max: { x: Infinity, y: Infinity }
        }
      },
      timing: {
        timestamp: 0,
        timeScale: 1
      },
      enableSleeping: options.enableSleeping !== false,
      gravityScale: options.gravityScale || 0.001,
      eventListeners: {}
    };
  },

  update(engine, delta) {
    const { world, timing } = engine;
    const dt = delta * timing.timeScale;
    const gravityScale = engine.gravityScale || 0.001;

    // 更新每个物体
    world.bodies.forEach(body => {
      if (body.isStatic) return;

      // 检查休眠
      if (engine.enableSleeping && !body.isSleeping) {
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        if (speed < body.sleepThreshold) {
          body.sleep();
        }
      }

      if (body.isSleeping) return;

      // 应用重力
      body.velocity.x += world.gravity.x * gravityScale * dt;
      body.velocity.y += world.gravity.y * gravityScale * dt;

      // 应用力
      body.velocity.x += body.force.x * body.inverseMass * dt;
      body.velocity.y += body.force.y * body.inverseMass * dt;

      // 空气阻力
      body.velocity.x *= (1 - body.frictionAir);
      body.velocity.y *= (1 - body.frictionAir);

      // 应用速度
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;

      // 更新角度
      body.angle += body.angularVelocity * dt;

      // 角度阻尼
      body.angularVelocity *= 0.98;

      // 清空力
      body.force = { x: 0, y: 0 };

      // 更新边界
      body.updateBounds();
    });

    // 碰撞检测和响应
    Matter.Engine.detectCollisions(world, engine);
  },

  detectCollisions(world, engine) {
    // 物体间碰撞
    const dynamicBodies = world.bodies.filter(b => !b.isStatic);
    const staticBodies = world.bodies.filter(b => b.isStatic);

    // 动态物体之间的碰撞
    for (let i = 0; i < dynamicBodies.length; i++) {
      for (let j = i + 1; j < dynamicBodies.length; j++) {
        const bodyA = dynamicBodies[i];
        const bodyB = dynamicBodies[j];

        if (bodyA.isSleeping && bodyB.isSleeping) continue;

        const collision = Matter.Engine.checkCollision(bodyA, bodyB);
        if (collision) {
          Matter.Engine.resolveCollision(bodyA, bodyB, collision);
          // 唤醒碰撞的物体
          bodyA.wakeUp();
          bodyB.wakeUp();
        }
      }
    }

    // 动态物体与静态物体的碰撞
    for (const dynamic of dynamicBodies) {
      if (dynamic.isSleeping) continue;

      for (const staticBody of staticBodies) {
        const collision = Matter.Engine.checkCollision(dynamic, staticBody);
        if (collision) {
          Matter.Engine.resolveCollision(dynamic, staticBody, collision);
          dynamic.wakeUp();
        }
      }
    }
  },

  checkCollision(bodyA, bodyB) {
    // 圆形与圆形碰撞
    if (bodyA.type === 'circle' && bodyB.type === 'circle') {
      return Matter.Engine.circleCircleCollision(bodyA, bodyB);
    }
    // 圆形与矩形碰撞
    else if (bodyA.type === 'circle' && bodyB.type === 'rectangle') {
      return Matter.Engine.circleRectCollision(bodyA, bodyB);
    }
    else if (bodyA.type === 'rectangle' && bodyB.type === 'circle') {
      const collision = Matter.Engine.circleRectCollision(bodyB, bodyA);
      if (collision) {
        // 反转法线方向
        collision.normal.x *= -1;
        collision.normal.y *= -1;
      }
      return collision;
    }
    // 矩形与矩形碰撞
    else if (bodyA.type === 'rectangle' && bodyB.type === 'rectangle') {
      return Matter.Engine.rectRectCollision(bodyA, bodyB);
    }
    return null;
  },

  circleCircleCollision(bodyA, bodyB) {
    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = bodyA.circleRadius + bodyB.circleRadius;

    if (dist < minDist && dist > 0) {
      return {
        normal: { x: dx / dist, y: dy / dist },
        depth: minDist - dist
      };
    }
    return null;
  },

  circleRectCollision(circle, rect) {
    // 旋转矩形的碰撞检测
    const cos = Math.cos(-rect.angle);
    const sin = Math.sin(-rect.angle);

    // 将圆心转换到矩形的局部坐标系
    const dx = circle.position.x - rect.position.x;
    const dy = circle.position.y - rect.position.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // 找到矩形上距离圆心最近的点
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const closestX = Math.max(-halfW, Math.min(halfW, localX));
    const closestY = Math.max(-halfH, Math.min(halfH, localY));

    // 计算距离
    const distX = localX - closestX;
    const distY = localY - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < circle.circleRadius) {
      // 转换法线回世界坐标系
      const worldCos = Math.cos(rect.angle);
      const worldSin = Math.sin(rect.angle);

      let normalX, normalY;
      if (dist === 0) {
        // 圆心在矩形内部
        normalX = 0;
        normalY = -1;
      } else {
        normalX = distX / dist;
        normalY = distY / dist;
      }

      return {
        normal: {
          x: normalX * worldCos - normalY * worldSin,
          y: normalX * worldSin + normalY * worldCos
        },
        depth: circle.circleRadius - dist
      };
    }
    return null;
  },

  rectRectCollision(bodyA, bodyB) {
    // 简化的矩形碰撞（不处理旋转）
    const dx = Math.abs(bodyA.position.x - bodyB.position.x);
    const dy = Math.abs(bodyA.position.y - bodyB.position.y);
    const combinedHalfW = bodyA.width / 2 + bodyB.width / 2;
    const combinedHalfH = bodyA.height / 2 + bodyB.height / 2;

    if (dx < combinedHalfW && dy < combinedHalfH) {
      const overlapX = combinedHalfW - dx;
      const overlapY = combinedHalfH - dy;

      if (overlapX < overlapY) {
        return {
          normal: { x: bodyA.position.x < bodyB.position.x ? -1 : 1, y: 0 },
          depth: overlapX
        };
      } else {
        return {
          normal: { x: 0, y: bodyA.position.y < bodyB.position.y ? -1 : 1 },
          depth: overlapY
        };
      }
    }
    return null;
  },

  resolveCollision(bodyA, bodyB, collision) {
    const { normal, depth } = collision;
    const nx = normal.x;
    const ny = normal.y;

    // 位置修正（防止穿透）
    const percent = 0.8; // 修正百分比
    const slop = 0.01; // 允许的穿透量
    const correction = Math.max(depth - slop, 0) / (bodyA.inverseMass + bodyB.inverseMass) * percent;

    if (!bodyA.isStatic) {
      bodyA.position.x -= correction * bodyA.inverseMass * nx;
      bodyA.position.y -= correction * bodyA.inverseMass * ny;
    }
    if (!bodyB.isStatic) {
      bodyB.position.x += correction * bodyB.inverseMass * nx;
      bodyB.position.y += correction * bodyB.inverseMass * ny;
    }

    // 相对速度
    const dvx = bodyB.velocity.x - bodyA.velocity.x;
    const dvy = bodyB.velocity.y - bodyA.velocity.y;
    const dvn = dvx * nx + dvy * ny;

    if (dvn > 0) return; // 已经在分离

    const restitution = Math.min(bodyA.restitution, bodyB.restitution);
    const j = -(1 + restitution) * dvn / (bodyA.inverseMass + bodyB.inverseMass);

    const impulseX = j * nx;
    const impulseY = j * ny;

    if (!bodyA.isStatic) {
      bodyA.velocity.x -= impulseX * bodyA.inverseMass;
      bodyA.velocity.y -= impulseY * bodyA.inverseMass;
    }
    if (!bodyB.isStatic) {
      bodyB.velocity.x += impulseX * bodyB.inverseMass;
      bodyB.velocity.y += impulseY * bodyB.inverseMass;
    }
  },

  // 唤醒指定区域内的所有物体
  wakeUpInRadius(engine, x, y, radius) {
    engine.world.bodies.forEach(body => {
      if (body.isStatic || body.isSleeping) return;

      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        body.wakeUp();
      }
    });
  },

  clear(engine) {
    engine.world.bodies = [];
  }
};

// 世界管理
Matter.World = {
  add(world, body) {
    if (Array.isArray(body)) {
      body.forEach(b => world.bodies.push(b));
    } else {
      world.bodies.push(body);
    }
  },

  remove(world, body) {
    if (Array.isArray(body)) {
      body.forEach(b => {
        const index = world.bodies.indexOf(b);
        if (index > -1) world.bodies.splice(index, 1);
      });
    } else {
      const index = world.bodies.indexOf(body);
      if (index > -1) {
        world.bodies.splice(index, 1);
      }
    }
  },

  clear(world) {
    world.bodies = [];
  }
};

// 事件管理
Matter.Events = {
  on(engine, event, handler) {
    if (!engine.eventListeners) {
      engine.eventListeners = {};
    }
    if (!engine.eventListeners[event]) {
      engine.eventListeners[event] = [];
    }
    engine.eventListeners[event].push(handler);
  },

  trigger(engine, event, data) {
    if (engine.eventListeners && engine.eventListeners[event]) {
      engine.eventListeners[event].forEach(handler => handler(data));
    }
  }
};

// 复合体
Matter.Composite = {
  allParts(composite) {
    const bodies = [];
    const stack = [composite];

    while (stack.length > 0) {
      const current = stack.pop();
      if (current.bodies) {
        current.bodies.forEach(body => {
          bodies.push(body);
        });
      }
      if (current.composites) {
        stack.push(...current.composites);
      }
    }

    return bodies;
  }
};

// 查询工具
Matter.Query = {
  // 查找区域内的物体
  region(bodies, bounds) {
    const results = [];
    bodies.forEach(body => {
      if (body.bounds && this.boundsOverlaps(body.bounds, bounds)) {
        results.push(body);
      }
    });
    return results;
  },

  boundsOverlaps(boundsA, boundsB) {
    return boundsA.min.x <= boundsB.max.x &&
           boundsA.max.x >= boundsB.min.x &&
           boundsA.min.y <= boundsB.max.y &&
           boundsA.max.y >= boundsB.min.y;
  },

  // 查找点附近的物体
  point(bodies, point) {
    const results = [];
    bodies.forEach(body => {
      if (this.pointInBody(point, body)) {
        results.push(body);
      }
    });
    return results;
  },

  pointInBody(point, body) {
    if (body.type === 'circle') {
      const dx = point.x - body.position.x;
      const dy = point.y - body.position.y;
      return (dx * dx + dy * dy) <= body.circleRadius * body.circleRadius;
    } else if (body.type === 'rectangle') {
      const halfW = body.width / 2;
      const halfH = body.height / 2;
      return point.x >= body.position.x - halfW &&
             point.x <= body.position.x + halfW &&
             point.y >= body.position.y - halfH &&
             point.y <= body.position.y + halfH;
    }
    return false;
  }
};

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Matter;
} else {
  // 直接挂载到全局（微信小游戏方式）
  if (typeof global !== 'undefined') {
    global.Matter = Matter;
  }
  if (typeof wx !== 'undefined') {
    wx.Matter = Matter;
  }
}
