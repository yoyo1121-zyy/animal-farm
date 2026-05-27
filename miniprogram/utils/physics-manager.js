// 物理管理器 - 集成 Matter.js 到抓大鹅游戏
// 包含黑洞引力和动态填充机制

// 简化的 Matter.js 物理引擎（内联版本，避免模块加载问题）
const Matter = {
  Vector: {
    create(x, y) { return { x: x || 0, y: y || 0 }; },
    add(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; },
    sub(v1, v2) { return { x: v1.x - v2.x, y: v1.y - v2.y }; },
    mult(v, n) { return { x: v.x * n, y: v.y * n }; },
    mag(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
  },

  // 使用函数构造器代替 class（微信小游戏兼容）
  Body: (function() {
    function Body(options) {
      this.position = { x: options.x || 0, y: options.y || 0 };
      this.velocity = { x: 0, y: 0 };
      this.force = { x: 0, y: 0 };
      this.mass = options.mass || 1;
      this.inverseMass = this.mass === 0 ? 0 : 1 / this.mass;
      this.angle = options.angle || 0;
      this.angularVelocity = 0;
      this.isStatic = options.isStatic || false;
      this.isSleeping = false;
      this.sleepThreshold = options.sleepThreshold || 0.3;
      this.friction = options.friction || 0.1;
      this.frictionAir = options.frictionAir || 0.03; // 增加空气阻力，降低移动速度
      this.restitution = options.restitution || 0.2; // 降低弹性，防止过度弹跳
      this.label = options.label || '';
      this.circleRadius = options.circleRadius || null;
      this.width = options.width || null;
      this.height = options.height || null;
      this.type = options.type || 'circle';
    }

    Body.prototype.wakeUp = function() {
      this.isSleeping = false;
    };

    Body.prototype.sleep = function() {
      this.isSleeping = true;
      this.velocity = { x: 0, y: 0 };
      this.angularVelocity = 0;
    };

    Body.prototype.updateBounds = function() {
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
    };

    Body.setVelocity = function(body, velocity) {
      body.velocity = velocity;
      body.wakeUp();
    };

    Body.setAngularVelocity = function(body, velocity) {
      body.angularVelocity = velocity;
      body.wakeUp();
    };

    return Body;
  })(),

  Bodies: {
    circle(x, y, radius, options) {
      const opts = options || {};
      opts.x = x;
      opts.y = y;
      opts.circleRadius = radius;
      opts.type = 'circle';
      const body = new Matter.Body(opts);
      body.updateBounds();
      return body;
    },

    rectangle(x, y, width, height, options) {
      const opts = options || {};
      opts.x = x;
      opts.y = y;
      opts.width = width;
      opts.height = height;
      opts.type = 'rectangle';
      const body = new Matter.Body(opts);
      body.updateBounds();
      return body;
    },

    createBowlContainer(centerX, centerY, radius, options = {}) {
      const bodies = [];
      const segments = 24;
      const bowlDepth = options.depth || 0.3;
      const wallThickness = options.wallThickness || 10;

      // 底部圆形
      const bottom = Matter.Bodies.circle(centerX, centerY, radius * 0.2, {
        isStatic: true,
        label: 'bowl-bottom',
        friction: 0.8,
        restitution: 0.2
      });
      bodies.push(bottom);

      // 侧壁
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;

        const x1 = centerX + Math.cos(angle1) * radius;
        const y1 = centerY + Math.sin(angle1) * radius * bowlDepth;
        const x2 = centerX + Math.cos(angle2) * radius;
        const y2 = centerY + Math.sin(angle2) * radius * bowlDepth;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const wallAngle = Math.atan2(y2 - y1, x2 - x1);
        const wallLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        const wall = Matter.Bodies.rectangle(midX, midY, wallLength + 2, wallThickness, {
          isStatic: true,
          angle: wallAngle,
          label: 'bowl-wall',
          friction: 0.5,
          restitution: 0.3
        });
        bodies.push(wall);
      }

      return bodies;
    }
  },

  // 使用函数构造器代替 class（微信小游戏兼容）
  Engine: (function() {
    // 创建引擎
    function create(options) {
      return {
        world: {
          bodies: [],
          gravity: { x: 0, y: 0.5 }
        },
        timing: {
          timestamp: 0,
          timeScale: 1
        },
        enableSleeping: options.enableSleeping !== false,
        gravityScale: options.gravityScale || 0.001,
        eventListeners: {}
      };
    }

    // 更新引擎
    function update(engine, delta) {
      const world = engine.world;
      const timing = engine.timing;
      const dt = delta * timing.timeScale;
      const gravityScale = engine.gravityScale || 0.001;

      world.bodies.forEach(body => {
        if (body.isStatic || body.isSleeping) return;

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

        // 应用速度
        body.position.x += body.velocity.x * dt;
        body.position.y += body.velocity.y * dt;

        // 阻尼
        body.velocity.x *= (1 - body.frictionAir);
        body.velocity.y *= (1 - body.frictionAir);
        body.angularVelocity *= 0.98;

        body.updateBounds();
      });

      // 简化碰撞检测
      detectCollisions(world, engine);
    }

    // 碰撞检测
    function detectCollisions(world, engine) {
      const dynamicBodies = world.bodies.filter(b => !b.isStatic);
      const staticBodies = world.bodies.filter(b => b.isStatic);

      // 动态物体之间的碰撞
      for (let i = 0; i < dynamicBodies.length; i++) {
        for (let j = i + 1; j < dynamicBodies.length; j++) {
          const bodyA = dynamicBodies[i];
          const bodyB = dynamicBodies[j];

          if (bodyA.isSleeping && bodyB.isSleeping) continue;

          const collision = checkCollision(bodyA, bodyB);
          if (collision) {
            resolveCollision(bodyA, bodyB, collision);
            bodyA.wakeUp();
            bodyB.wakeUp();
          }
        }
      }

      // 动态物体与静态物体的碰撞
      for (let k = 0; k < dynamicBodies.length; k++) {
        const dynamic = dynamicBodies[k];
        if (dynamic.isSleeping) continue;

        for (let m = 0; m < staticBodies.length; m++) {
          const staticBody = staticBodies[m];
          const collision = checkCollision(dynamic, staticBody);
          if (collision) {
            resolveCollision(dynamic, staticBody, collision);
            dynamic.wakeUp();
          }
        }
      }
    }

    // 检查碰撞
    function checkCollision(bodyA, bodyB) {
      if (bodyA.type === 'circle' && bodyB.type === 'circle') {
        return circleCircleCollision(bodyA, bodyB);
      }
      return null;
    }

    // 圆形碰撞
    function circleCircleCollision(bodyA, bodyB) {
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
    }

    // 解决碰撞
    function resolveCollision(bodyA, bodyB, collision) {
      const normal = collision.normal;
      const depth = collision.depth;

      // 位置修正
      const correction = depth / (bodyA.inverseMass + bodyB.inverseMass) * 0.8;

      if (!bodyA.isStatic) {
        bodyA.position.x -= correction * bodyA.inverseMass * normal.x;
        bodyA.position.y -= correction * bodyA.inverseMass * normal.y;
      }
      if (!bodyB.isStatic) {
        bodyB.position.x += correction * bodyB.inverseMass * normal.x;
        bodyB.position.y += correction * bodyB.inverseMass * normal.y;
      }

      // 速度响应
      const dvx = bodyB.velocity.x - bodyA.velocity.x;
      const dvy = bodyB.velocity.y - bodyA.velocity.y;
      const dvn = dvx * normal.x + dvy * normal.y;

      if (dvn > 0) return;

      const restitution = Math.min(bodyA.restitution, bodyB.restitution);
      const j = -(1 + restitution) * dvn / (bodyA.inverseMass + bodyB.inverseMass);

      if (!bodyA.isStatic) {
        bodyA.velocity.x -= j * bodyA.inverseMass * normal.x;
        bodyA.velocity.y -= j * bodyA.inverseMass * normal.y;
      }
      if (!bodyB.isStatic) {
        bodyB.velocity.x += j * bodyB.inverseMass * normal.x;
        bodyB.velocity.y += j * bodyB.inverseMass * normal.y;
      }
    }

    // 清空引擎
    function clear(engine) {
      engine.world.bodies = [];
    }

    // 返回 Engine 对象
    return {
      create: create,
      update: update,
      clear: clear
    };
  })(),

  World: {
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
        if (index > -1) world.bodies.splice(index, 1);
      }
    },

    clear(world) {
      world.bodies = [];
    }
  },

  Query: {
    point(bodies, point) {
      const results = [];
      bodies.forEach(body => {
        if (body.type === 'circle') {
          const dx = point.x - body.position.x;
          const dy = point.y - body.position.y;
          if (dx * dx + dy * dy <= body.circleRadius * body.circleRadius) {
            results.push(body);
          }
        }
      });
      return results;
    }
  }
};

console.log('Matter loaded successfully');


// PhysicsManager 类（使用函数构造器代替 class，微信小游戏兼容）
function PhysicsManager(canvasWidth, canvasHeight) {
  this.width = canvasWidth;
  this.height = canvasHeight;

  // 创建物理引擎
  this.engine = Matter.Engine.create({
    enableSleeping: true,
    gravityScale: 0.002   // 启用适度的重力，让物品能自然下落
  });

  // 游戏区域配置
  this.gameArea = {
    x: canvasWidth * 0.05,
    y: canvasHeight * 0.18,
    width: canvasWidth * 0.9,
    height: canvasWidth * 0.9
  };

  // 物理世界中心（锅的中心）
  this.bowlCenter = {
    x: this.gameArea.x + this.gameArea.width / 2,
    y: this.gameArea.y + this.gameArea.height / 2
  };

  // 锅的半径
  this.bowlRadius = Math.min(this.gameArea.width, this.gameArea.height) / 2 - 20;

  // 物品刚体映射
  this.itemBodies = new Map(); // itemId -> body

  // 上次更新时间
  this.lastUpdateTime = Date.now();

  // ========== 黑洞引力配置 ==========
  this.blackHoleConfig = {
    enabled: false,             // 禁用黑洞引力（可能导致物品过度聚集）
    attractForce: 0.02,         // 大幅降低中心引力强度
    minDistance: 50,            // 增大最小距离
    maxDistance: this.bowlRadius * 0.6, // 缩小最大影响范围
    distanceCurve: 0.5,         // 降低距离曲线指数
    wakeUpRadius: 60            // 引力影响时唤醒范围
  };

  // ========== 动态填充配置 ==========
  this.refillConfig = {
    enabled: false,             // 禁用动态填充（避免干扰游戏逻辑）
    checkInterval: 2000,        // 检查间隔（毫秒）
    lastCheckTime: 0,
    minItemsInCenter: 5,        // 中心区域最少物品数
    centerRadius: 60,           // 中心区域半径
    refillAmount: 3,            // 每次补充数量
    maxTotalItems: 100          // 最大总物品数
  };

  // 物品类型池（用于补货）
  this.itemTypePool = [
    { id: 100, name: '补货蔬菜', emoji: '🥬', color: '#90EE90' },
    { id: 101, name: '补货萝卜', emoji: '🥕', color: '#FF6347' },
    { id: 102, name: '补货玉米', emoji: '🌽', color: '#FFD700' },
    { id: 103, name: '补货番茄', emoji: '🍅', color: '#FF4500' },
    { id: 104, name: '补货蘑菇', emoji: '🍄', color: '#DEB887' }
  ];

  // 补货回调函数
  this.refillCallback = null;

  // 初始化容器边界
  this.initContainerBounds();
}

// PhysicsManager 方法
PhysicsManager.prototype = {
  // 初始化容器边界（碗状）
  initContainerBounds: function() {
    // 使用 Matter.js 创建碗状容器
    const bowlBodies = Matter.Bodies.createBowlContainer(
      this.bowlCenter.x,
      this.bowlCenter.y,
      this.bowlRadius,
      {
        depth: 0.5,          // 增加碗的深度（0.4 -> 0.5）
        wallHeight: 50,      // 增加墙壁高度（30 -> 50）
        wallThickness: 10    // 增加墙壁厚度（8 -> 10）
      }
    );

    // 添加到物理世界
    Matter.World.add(this.engine.world, bowlBodies);

    // 保存边界刚体
    this.containerBodies = bowlBodies;

    console.log('Physics container initialized with', bowlBodies.length, 'bodies');
  },

  // 为物品创建刚体
  createItemBody: function(item) {
    // 将物品的逻辑坐标转换为物理坐标
    const physX = this.gameArea.x + (item.x / 300) * this.gameArea.width;
    const physY = this.gameArea.y + (item.y / 300) * this.gameArea.height;

    // 获取物品大小配置
    const sizeConfig = item.sizeConfig || {
      radius: 20,
      density: 0.001,
      restitution: 0.4,
      friction: 0.3
    };

    // 创建圆形刚体（使用物品大小）
    const body = Matter.Bodies.circle(physX, physY, sizeConfig.radius, {
      mass: 1,
      friction: sizeConfig.friction,
      restitution: sizeConfig.restitution,
      density: sizeConfig.density,
      label: `item-${item.id}`,
      sleepThreshold: 0.2,
      circleRadius: sizeConfig.radius, // 保存半径供后续使用
      render: {
        fillStyle: item.color
      }
    });

    // 添加物品数据到刚体
    body.itemId = item.id;
    body.itemData = item;

    // 如果有初始力，应用初始速度
    if (item.initialForce) {
      Matter.Body.setVelocity(body, {
        x: item.initialForce.x,
        y: -item.initialForce.y // 向上抛
      });
    }

    // 如果有初始角速度
    if (item.initialAngularVel !== undefined) {
      Matter.Body.setAngularVelocity(body, item.initialAngularVel);
    }

    // 添加到物理世界
    Matter.World.add(this.engine.world, body);

    // 保存映射
    this.itemBodies.set(item.id, body);

    return body;
  },

  // 批量创建物品刚体
  createItemBodies: function(items) {
    const bodies = [];
    items.forEach(item => {
      const body = this.createItemBody(item);
      bodies.push(body);
    });
    return bodies;
  },

  // 移除物品刚体
  removeItemBody: function(itemId) {
    const body = this.itemBodies.get(itemId);
    if (body) {
      Matter.World.remove(this.engine.world, body);
      this.itemBodies.delete(itemId);
    }
  },

  // 批量移除物品刚体
  removeItemBodies: function(itemIds) {
    itemIds.forEach(id => this.removeItemBody(id));
  },

  // 清空所有物品刚体
  clearItemBodies: function() {
    const bodiesToRemove = [];
    this.itemBodies.forEach((body, itemId) => {
      bodiesToRemove.push(body);
    });
    Matter.World.remove(this.engine.world, bodiesToRemove);
    this.itemBodies.clear();
  },

  // 获取物品刚体
  getItemBody: function(itemId) {
    return this.itemBodies.get(itemId);
  },

  // 更新物理引擎
  update: function(deltaTime) {
    const now = Date.now();
    const dt = Math.min(deltaTime || (now - this.lastUpdateTime), 50); // 限制最大 dt
    this.lastUpdateTime = now;

    // ========== 应用黑洞引力 ==========
    if (this.blackHoleConfig.enabled) {
      this.applyBlackHoleGravity();
    }

    // 更新物理引擎
    Matter.Engine.update(this.engine, dt);

    // 同步刚体位置到物品数据
    this.syncBodyPositions();

    // ========== 检查底层补货 ==========
    if (this.refillConfig.enabled) {
      this.checkAndRefill(now);
    }
  },

  // ========== 黑洞引力效果 ==========
  applyBlackHoleGravity: function() {
    const config = this.blackHoleConfig;
    const centerX = this.bowlCenter.x;
    const centerY = this.bowlCenter.y;

    this.itemBodies.forEach(body => {
      if (body.isStatic || body.isSleeping) return;

      // 计算到中心的距离
      const dx = centerX - body.position.x;
      const dy = centerY - body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 只对在影响范围内的物品施加引力
      if (distance > config.minDistance && distance < config.maxDistance) {
        // 计算引力强度：距离越远，引力越大（模拟黑洞吸入感）
        const distanceFactor = 1 / Math.pow(distance / 100, config.distanceCurve);
        const forceMagnitude = config.attractForce * distanceFactor;

        // 计算方向向量（归一化）
        const dirX = dx / distance;
        const dirY = dy / distance;

        // 施加引力
        body.velocity.x += dirX * forceMagnitude;
        body.velocity.y += dirY * forceMagnitude;

        // 唤醒附近的物品
        if (distance < config.wakeUpRadius) {
          body.wakeUp();
        }
      }
    });
  },

  // ========== 动态填充机制 ==========
  checkAndRefill: function(now) {
    const config = this.refillConfig;

    // 检查时间间隔
    if (now - config.lastCheckTime < config.checkInterval) {
      return;
    }
    config.lastCheckTime = now;

    // 检查当前物品数量
    const currentCount = this.itemBodies.size;
    if (currentCount >= config.maxTotalItems) {
      return; // 已达到最大数量
    }

    // 检查中心区域的物品数量
    const centerItemCount = this.countItemsInRadius(config.centerRadius);

    // 如果中心区域物品太少，触发补货
    if (centerItemCount < config.minItemsInCenter) {
      this.triggerRefill();
    }
  },

  // 计算指定半径内的物品数量
  countItemsInRadius: function(radius) {
    let count = 0;
    const centerX = this.bowlCenter.x;
    const centerY = this.bowlCenter.y;
    const radiusSq = radius * radius;

    this.itemBodies.forEach(body => {
      const dx = body.position.x - centerX;
      const dy = body.position.y - centerY;
      if (dx * dx + dy * dy < radiusSq) {
        count++;
      }
    });

    return count;
  },

  // 触发补货
  triggerRefill: function() {
    const config = this.refillConfig;
    const refillCount = Math.min(
      config.refillAmount,
      config.maxTotalItems - this.itemBodies.size
    );

    if (refillCount <= 0) return;

    console.log('Triggering refill:', refillCount, 'items');

    // 生成新物品
    const newItems = [];
    for (let i = 0; i < refillCount; i++) {
      const itemType = this.itemTypePool[Math.floor(Math.random() * this.itemTypePool.length)];

      // 在中心附近随机位置生成
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 30; // 中心附近30像素范围内
      const spawnX = this.bowlCenter.x + Math.cos(angle) * distance;
      const spawnY = this.bowlCenter.y - 40 + Math.sin(angle) * distance; // 稍微在上方生成

      const newItem = {
        id: `refill_${Date.now()}_${i}`,
        type: itemType.id,
        name: itemType.name,
        emoji: itemType.emoji,
        color: itemType.color,
        x: (spawnX - this.gameArea.x) / this.gameArea.width * 300,
        y: (spawnY - this.gameArea.y) / this.gameArea.height * 300,
        zIndex: 0,
        clickable: true,
        isRefill: true // 标记为补货物品
      };

      newItems.push(newItem);
    }

    // 调用补货回调
    if (this.refillCallback) {
      this.refillCallback(newItems);
    }
  },

  // 设置补货回调
  setRefillCallback: function(callback) {
    this.refillCallback = callback;
  },

  // 添加物品到物理世界（用于补货）
  addItems: function(items) {
    items.forEach(item => {
      this.createItemBody(item);
    });
  },

  // 同步刚体位置到物品数据
  syncBodyPositions: function() {
    this.itemBodies.forEach((body, itemId) => {
      if (body.itemData) {
        // 将物理坐标转换回逻辑坐标
        let relativeX = (body.position.x - this.gameArea.x) / this.gameArea.width * 300;
        let relativeY = (body.position.y - this.gameArea.y) / this.gameArea.height * 300;

        // ========== 边界限制：确保逻辑坐标在有效范围内 ==========
        // 物品半径约 25px，留出边距
        const margin = 25;
        relativeX = Math.max(margin, Math.min(300 - margin, relativeX));
        relativeY = Math.max(margin, Math.min(300 - margin, relativeY));

        body.itemData.x = relativeX;
        body.itemData.y = relativeY;
        body.itemData.angle = body.angle;
      }
    });
  },

  // 点击物品 - 消除并触发重力下落
  clickItem: function(itemId) {
    const body = this.getItemBody(itemId);
    if (!body) return;

    const position = { ...body.position };

    // 移除刚体
    this.removeItemBody(itemId);

    // 唤醒附近的物品（模拟 Unity 的 WakeUp 效果）
    this.wakeUpNearbyItems(position.x, position.y, 80);

    return {
      itemId: itemId,
      position: position
    };
  },

  // 唤醒附近的物品
  wakeUpNearbyItems: function(x, y, radius) {
    this.itemBodies.forEach(body => {
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        body.wakeUp();

        // 给物品一个小的随机扰动，让它们更容易滚动
        const randomForce = 0.05;
        body.velocity.x += (Math.random() - 0.5) * randomForce;
        body.velocity.y += (Math.random() - 0.5) * randomForce;
      }
    });
  },

  // 颠勺效果 - 根据陀螺仪旋转速度打乱所有物品
  // forceMultiplier: 力度系数，来自陀螺仪旋转速度（弧度/秒）
  tumble: function(forceMultiplier = 2.0) {
    this.itemBodies.forEach(body => {
      body.wakeUp();

      // 计算物品相对于中心的位置
      const dx = body.position.x - this.bowlCenter.x;
      const dy = body.position.y - this.bowlCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // 根据旋转速度计算力度（模拟颠勺的物理效果）
      // 向外的力 - 模拟物品被"甩"出去
      const outwardForce = 0.15 * forceMultiplier;
      body.velocity.x += (dx / dist) * outwardForce;
      body.velocity.y += (dy / dist) * outwardForce;

      // 向上的力 - 模拟颠勺时物品向上弹起
      const upwardForce = 0.1 * forceMultiplier;
      body.velocity.y -= upwardForce;

      // 随机旋转 - 模拟物品在空中翻滚
      body.angularVelocity += (Math.random() - 0.5) * 0.05 * forceMultiplier;
    });
  },

  // 检测点击的物品
  queryPoint: function(x, y) {
    const point = { x, y };
    const clickedBody = Matter.Query.point(
      Array.from(this.itemBodies.values()),
      point
    )[0];

    if (clickedBody) {
      return clickedBody.itemId;
    }
    return null;
  },

  // 获取可点击的物品（最上层的物品）
  getClickableItems: function() {
    const clickableItems = [];
    const processedBodies = new Set();

    // 按位置从下到上排序（y 坐标大的在下面）
    const sortedBodies = Array.from(this.itemBodies.values())
      .sort((a, b) => a.position.y - b.position.y);

    sortedBodies.forEach(body => {
      if (processedBodies.has(body.id)) return;

      // 检查是否有其他物品遮挡这个物品
      let isBlocked = false;
      for (const otherBody of sortedBodies) {
        if (otherBody === body || processedBodies.has(otherBody.id)) continue;

        // 检查遮挡
        const dx = otherBody.position.x - body.position.x;
        const dy = otherBody.position.y - body.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 30) { // 物品直径
          isBlocked = true;
          break;
        }
      }

      if (!isBlocked && body.itemData) {
        clickableItems.push(body.itemData);
        processedBodies.add(body.id);
      }
    });

    return clickableItems;
  },

  // 渲染物理调试信息
  renderDebug: function(ctx) {
    ctx.save();

    // 绘制容器边界
    this.containerBodies.forEach(body => {
      ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
      ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
      ctx.lineWidth = 2;

      if (body.type === 'circle') {
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (body.type === 'rectangle') {
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.fillRect(-body.width / 2, -body.height / 2, body.width, body.height);
        ctx.strokeRect(-body.width / 2, -body.height / 2, body.width, body.height);
        ctx.restore();
      }
    });

    // 绘制物品刚体
    this.itemBodies.forEach(body => {
      ctx.strokeStyle = body.isSleeping ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 绘制速度向量
      if (!body.isSleeping) {
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        if (speed > 0.1) {
          ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(body.position.x, body.position.y);
          ctx.lineTo(
            body.position.x + body.velocity.x * 10,
            body.position.y + body.velocity.y * 10
          );
          ctx.stroke();
        }
      }
    });

    ctx.restore();
  },

  // 销毁物理引擎
  destroy: function() {
    this.clearItemBodies();
    this.containerBodies = [];
    this.engine = null;
  }
}

// 微信小游戏兼容导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhysicsManager;
} else {
  // 直接挂载到全局（微信小游戏方式）
  if (typeof global !== 'undefined') {
    global.PhysicsManager = PhysicsManager;
  }
  if (typeof wx !== 'undefined') {
    wx.PhysicsManager = PhysicsManager;
  }
}
