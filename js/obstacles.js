// Obstacle types and behaviors
const Obstacles = {
  types: {
    PLATFORM: 'platform',
    ROTATING_BEAM: 'rotating_beam',
    MOVING_PLATFORM: 'moving_platform',
    DISAPPEARING: 'disappearing',
    SPIKE: 'spike',
    PUSHER: 'pusher',
  },

  create(type, scene, position, config = {}) {
    switch (type) {
      case this.types.PLATFORM:
        return this.createPlatform(scene, position, config);
      case this.types.ROTATING_BEAM:
        return this.createRotatingBeam(scene, position, config);
      case this.types.MOVING_PLATFORM:
        return this.createMovingPlatform(scene, position, config);
      case this.types.DISAPPEARING:
        return this.createDisappearing(scene, position, config);
      case this.types.SPIKE:
        return this.createSpike(scene, position, config);
      case this.types.PUSHER:
        return this.createPusher(scene, position, config);
      default:
        return this.createPlatform(scene, position, config);
    }
  },

  createPlatform(scene, position, config) {
    const size = config.size || CONFIG.PLATFORM_SIZE;
    const depth = config.depth || CONFIG.PLATFORM_DEPTH;

    const geo = new THREE.BoxGeometry(size, 0.4, depth);
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.platform,
      emissive: CONFIG.COLORS.platformEdge,
      emissiveIntensity: 0.6,
      shininess: 60,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (position.y < 5) {
      Logger.log('Platform at y=' + position.y.toFixed(1) + ' added to scene');
    }

    // Edge glow
    const edgeGeo = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: CONFIG.COLORS.neonBlue,
      transparent: true,
      opacity: 0.8,
    });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    mesh.add(edges);

    scene.add(mesh);

    if (position.y < 5) {
      Logger.log('Platform added at y=' + position.y.toFixed(1) + ', scene children: ' + scene.children.length);
    }

    return {
      type: this.types.PLATFORM,
      mesh,
      collider: { min: -size / 2, max: size / 2, depth: depth / 2 },
      active: true,
    };
  },

  createRotatingBeam(scene, position, config) {
    const length = config.length || 5;
    const speed = config.speed ||
      (CONFIG.ROTATING_SPEED_MIN +
        Math.random() * (CONFIG.ROTATING_SPEED_MAX - CONFIG.ROTATING_SPEED_MIN));

    const group = new THREE.Group();
    group.position.copy(position);

    // Beam
    const geo = new THREE.BoxGeometry(length, 0.3, 0.6);
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.obstacle,
      emissive: CONFIG.COLORS.neonBlue,
      emissiveIntensity: 0.5,
      shininess: 80,
    });
    const beam = new THREE.Mesh(geo, mat);
    beam.castShadow = true;
    group.add(beam);

    // Center pivot sphere
    const pivotGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const pivotMat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.neonPink,
      emissive: CONFIG.COLORS.neonPink,
      emissiveIntensity: 0.6,
    });
    const pivot = new THREE.Mesh(pivotGeo, pivotMat);
    group.add(pivot);

    scene.add(group);

    return {
      type: this.types.ROTATING_BEAM,
      mesh: group,
      pivot: beam,
      speed,
      direction: Math.random() > 0.5 ? 1 : -1,
      collider: { length },
      active: true,
      update(delta) {
        this.pivot.rotation.y += this.speed * this.direction * delta;
      },
    };
  },

  createMovingPlatform(scene, position, config) {
    const size = config.size || CONFIG.PLATFORM_SIZE;
    const moveRange = config.moveRange || 4;
    const speed = config.speed ||
      (CONFIG.MOVING_SPEED_MIN +
        Math.random() * (CONFIG.MOVING_SPEED_MAX - CONFIG.MOVING_SPEED_MIN));
    const axis = config.axis || (Math.random() > 0.5 ? 'x' : 'z');

    const geo = new THREE.BoxGeometry(size, 0.4, CONFIG.PLATFORM_DEPTH);
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.movingPlatform,
      emissive: CONFIG.COLORS.neonPurple,
      emissiveIntensity: 0.4,
      shininess: 60,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Trail indicator
    const trailGeo = new THREE.BoxGeometry(
      axis === 'x' ? moveRange * 2 : 0.1,
      0.1,
      axis === 'z' ? moveRange * 2 : 0.1
    );
    const trailMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.neonPurple,
      transparent: true,
      opacity: 0.15,
    });
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.copy(position);
    scene.add(trail);

    scene.add(mesh);

    const startPos = position.clone();

    return {
      type: this.types.MOVING_PLATFORM,
      mesh,
      startPos,
      moveRange,
      speed,
      axis,
      time: Math.random() * Math.PI * 2,
      collider: { min: -size / 2, max: size / 2, depth: CONFIG.PLATFORM_DEPTH / 2 },
      active: true,
      update(delta) {
        this.time += delta * this.speed;
        const offset = Math.sin(this.time) * this.moveRange;
        this.mesh.position[this.axis] = this.startPos[this.axis] + offset;
      },
    };
  },

  createDisappearing(scene, position, config) {
    const size = config.size || CONFIG.PLATFORM_SIZE;
    const delay = config.delay || CONFIG.DISAPPEAR_DELAY;

    const geo = new THREE.BoxGeometry(size, 0.4, CONFIG.PLATFORM_DEPTH);
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.disappearingPlatform,
      emissive: CONFIG.COLORS.disappearingPlatform,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 1.0,
      shininess: 40,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh);

    return {
      type: this.types.DISAPPEARING,
      mesh,
      collider: { min: -size / 2, max: size / 2, depth: CONFIG.PLATFORM_DEPTH / 2 },
      active: true,
      visible: true,
      timer: 0,
      stepping: false,
      update(delta) {
        if (this.stepping) {
          this.timer += delta;
          // Flash before disappearing
          this.mesh.material.opacity = 1.0 - (this.timer / (delay + 0.5));
          if (this.timer > delay) {
            this.visible = false;
            this.mesh.visible = false;
            // Reset after a bit
            setTimeout(() => {
              this.visible = true;
              this.mesh.visible = true;
              this.mesh.material.opacity = 1.0;
              this.stepping = false;
              this.timer = 0;
            }, 1500);
          }
        }
      },
      onStep() {
        if (!this.stepping) {
          this.stepping = true;
          this.timer = 0;
        }
      },
    };
  },

  createSpike(scene, position, config) {
    const group = new THREE.Group();
    group.position.copy(position);

    const count = config.count || 3;
    const spacing = config.spacing || 0.5;

    for (let i = 0; i < count; i++) {
      const geo = new THREE.ConeGeometry(0.2, 0.6, 4);
      const mat = new THREE.MeshPhongMaterial({
        color: CONFIG.COLORS.spike,
        emissive: CONFIG.COLORS.spike,
        emissiveIntensity: 0.5,
      });
      const spike = new THREE.Mesh(geo, mat);
      spike.position.set((i - (count - 1) / 2) * spacing, 0.3, 0);
      spike.rotation.x = Math.PI;
      group.add(spike);
    }

    scene.add(group);

    return {
      type: this.types.SPIKE,
      mesh: group,
      collider: { radius: 0.3, height: 0.6 },
      active: true,
      deadly: true,
    };
  },

  createPusher(scene, position, config) {
    const width = config.width || 8;
    const height = config.height || 3;
    const speed = config.speed || 3;
    const axis = config.axis || 'x';

    const geo = new THREE.BoxGeometry(
      axis === 'x' ? 0.5 : width,
      height,
      axis === 'z' ? 0.5 : width
    );
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.neonPink,
      emissive: CONFIG.COLORS.neonPink,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;

    scene.add(mesh);

    const startPos = position.clone();

    return {
      type: this.types.PUSHER,
      mesh,
      startPos,
      speed,
      axis,
      moveRange: 6,
      time: 0,
      collider: { width, height },
      active: true,
      update(delta) {
        this.time += delta * this.speed;
        const offset = Math.sin(this.time) * this.moveRange;
        this.mesh.position[this.axis] = this.startPos[this.axis] + offset;
      },
    };
  },

  // Collision detection
  checkCollision(player, obstacle) {
    if (!obstacle.active) return false;

    const px = player.mesh.position.x;
    const py = player.mesh.position.y;
    const pz = player.mesh.position.z;
    const pr = CONFIG.PLAYER_SIZE * 0.4;

    switch (obstacle.type) {
      case this.types.PLATFORM:
      case this.types.MOVING_PLATFORM:
      case this.types.DISAPPEARING: {
        if (obstacle.type === this.types.DISAPPEARING && !obstacle.visible) return false;
        const ox = obstacle.mesh.position.x;
        const oy = obstacle.mesh.position.y;
        const oz = obstacle.mesh.position.z;
        const hw = obstacle.collider.max;
        const hd = obstacle.collider.depth;
        const halfH = 0.2;

        return (
          px + pr > ox - hw &&
          px - pr < ox + hw &&
          py - pr < oy + halfH &&
          py + pr > oy - halfH &&
          pz + pr > oz - hd &&
          pz - pr < oz + hd
        );
      }

      case this.types.ROTATING_BEAM: {
        const beam = obstacle.pivot;
        const cos = Math.cos(-beam.rotation.y);
        const sin = Math.sin(-beam.rotation.y);
        const dx = px - obstacle.mesh.position.x;
        const dz = pz - obstacle.mesh.position.z;
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        const halfLen = obstacle.collider.length / 2;

        return (
          Math.abs(localX) < halfLen + pr &&
          Math.abs(localZ) < 0.3 + pr &&
          Math.abs(py - obstacle.mesh.position.y) < 0.5
        );
      }

      case this.types.SPIKE: {
        const sx = obstacle.mesh.position.x;
        const sy = obstacle.mesh.position.y;
        const sz = obstacle.mesh.position.z;
        const dist = Math.sqrt(
          (px - sx) ** 2 + (py - sy - 0.3) ** 2 + (pz - sz) ** 2
        );
        return dist < obstacle.collider.radius + pr;
      }

      case this.types.PUSHER: {
        const px2 = obstacle.mesh.position.x;
        const py2 = obstacle.mesh.position.y;
        const pz2 = obstacle.mesh.position.z;
        const hw = obstacle.collider.width / 2;
        const hh = obstacle.collider.height / 2;

        return (
          px + pr > px2 - hw &&
          px - pr < px2 + hw &&
          py + pr > py2 - hh &&
          py - pr < py2 + hh &&
          pz + pr > pz2 - 0.25 &&
          pz - pr < pz2 + 0.25
        );
      }
    }

    return false;
  },

  // Check if player is on top of obstacle
  checkOnTop(player, obstacle) {
    if (!obstacle.active) return false;
    if (obstacle.type === this.types.SPIKE || obstacle.type === this.types.PUSHER) return false;
    if (obstacle.type === this.types.DISAPPEARING && !obstacle.visible) return false;

    const px = player.mesh.position.x;
    const py = player.mesh.position.y;
    const pz = player.mesh.position.z;
    const pr = CONFIG.PLAYER_SIZE * 0.4;
    const playerBottom = py - CONFIG.PLAYER_SIZE * 0.5;

    const ox = obstacle.mesh.position.x;
    const oy = obstacle.mesh.position.y;
    const oz = obstacle.mesh.position.z;
    const topY = oy + 0.2;

    // Vertical tolerance - generous to catch fast falling players
    const verticalTolerance = 1.0;
    const verticalOk = playerBottom <= topY + 0.1 && playerBottom >= topY - verticalTolerance;

    if (obstacle.type === this.types.ROTATING_BEAM) {
      const beam = obstacle.pivot;
      const cos = Math.cos(-beam.rotation.y);
      const sin = Math.sin(-beam.rotation.y);
      const dx = px - ox;
      const dz = pz - oz;
      const localX = dx * cos - dz * sin;
      const halfLen = obstacle.collider.length / 2;

      return (
        Math.abs(localX) < halfLen + 0.3 &&
        Math.abs(pz - oz) < 0.8 &&
        player.velocity.y <= 1 &&
        verticalOk
      );
    }

    const hw = (obstacle.collider.max || obstacle.collider.width / 2 || CONFIG.PLATFORM_SIZE / 2) + 0.3;
    const hd = (obstacle.collider.depth || CONFIG.PLATFORM_DEPTH / 2) + 0.3;

    return (
      px + pr > ox - hw &&
      px - pr < ox + hw &&
      pz + pr > oz - hd &&
      pz - pr < oz + hd &&
      player.velocity.y <= 1 &&
      verticalOk
    );
  },
};
