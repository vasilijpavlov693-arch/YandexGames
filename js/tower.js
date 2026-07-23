// Tower generation and management
const Tower = {
  floors: [],
  currentFloor: 0,
  crystalPositions: [],

  generate(scene, startY = 0) {
    this.clear(scene);
    this.currentFloor = 0;
    this.crystalPositions = [];

    Logger.log('Tower.generate() - startY:', startY);

    // Add ground reference plane with grid
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x222244,
      side: THREE.DoubleSide,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = startY - 0.5;
    scene.add(ground);

    // Add neon grid lines
    const gridHelper = new THREE.GridHelper(30, 15, 0x00e5ff, 0x005566);
    gridHelper.position.y = startY - 0.49;
    scene.add(gridHelper);

    // Generate initial floors
    for (let i = 0; i < 50; i++) {
      this.addFloor(scene, startY + i * CONFIG.FLOOR_HEIGHT, i);
    }

    Logger.log('Tower generated:', this.floors.length, 'floors');
    Logger.log('Scene children:', scene.children.length);
  },

  addFloor(scene, y, floorIndex) {
    const obstacles = [];
    const difficulty = Math.min(floorIndex / 10, 1); // 0 to 1 over 10 floors

    // Starting platform (always present)
    const startPlatform = Obstacles.create(
      Obstacles.types.PLATFORM,
      scene,
      new THREE.Vector3(0, y, 0),
      { size: 4, depth: 3 }
    );
    obstacles.push(startPlatform);

    if (floorIndex === 0) {
      Logger.log('Floor 0 created at y=0, platform count:', 1);
    }

    // Generate obstacles based on difficulty
    const numObstacles = 2 + Math.floor(difficulty * 3);

    for (let i = 0; i < numObstacles; i++) {
      const obstacleType = this.pickObstacleType(difficulty);
      const position = this.generatePosition(y, i, numObstacles, floorIndex);

      const obstacle = Obstacles.create(obstacleType, scene, position, {
        size: 3 + Math.random() * 3,
        length: 3 + Math.random() * 4,
        speed: CONFIG.MOVING_SPEED_MIN + Math.random() * (CONFIG.MOVING_SPEED_MAX - CONFIG.MOVING_SPEED_MIN),
        moveRange: 2 + Math.random() * 3,
        count: 2 + Math.floor(Math.random() * 4),
      });

      obstacles.push(obstacle);
    }

    // Add crystal on some floors
    if (floorIndex > 0 && Math.random() > 0.4) {
      const crystalPos = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        y + CONFIG.FLOOR_HEIGHT * 0.6,
        (Math.random() - 0.5) * 4
      );
      const crystal = this.createCrystal(scene, crystalPos);
      obstacles.push(crystal);
    }

    // Boss floor every 5 floors
    if (floorIndex > 0 && floorIndex % 5 === 0) {
      this.addBossFloor(scene, y, floorIndex, obstacles);
    }

    this.floors.push({ y, index: floorIndex, obstacles });
  },

  pickObstacleType(difficulty) {
    const types = [Obstacles.types.PLATFORM];

    if (difficulty > 0.1) types.push(Obstacles.types.ROTATING_BEAM);
    if (difficulty > 0.2) types.push(Obstacles.types.MOVING_PLATFORM);
    if (difficulty > 0.3) types.push(Obstacles.types.DISAPPEARING);
    if (difficulty > 0.4) types.push(Obstacles.types.SPIKE);
    if (difficulty > 0.5) types.push(Obstacles.types.PUSHER);

    return types[Math.floor(Math.random() * types.length)];
  },

  generatePosition(y, index, total, floorIndex) {
    // Spiral pattern around the center
    const spiralAngle = (index / total) * Math.PI * 2 + floorIndex * 0.5;
    const radius = 2 + (index % 3) * 1.5;

    // Vertical spacing - keep platforms close enough to jump
    const verticalStep = CONFIG.FLOOR_HEIGHT / (total + 1);
    const heightOffset = (index + 1) * verticalStep;

    return new THREE.Vector3(
      Math.cos(spiralAngle) * radius,
      y + heightOffset,
      Math.sin(spiralAngle) * radius
    );
  },

  createCrystal(scene, position) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Crystal shape
    const geo = new THREE.OctahedronGeometry(0.4, 0);
    const mat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.crystal,
      emissive: CONFIG.COLORS.neonBlue,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const crystal = new THREE.Mesh(geo, mat);
    crystal.castShadow = true;
    group.add(crystal);

    // Glow
    const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.neonBlue,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    scene.add(group);

    return {
      type: 'crystal',
      mesh: group,
      active: true,
      collected: false,
      update(delta) {
        if (this.collected) return;
        crystal.rotation.y += delta * 2;
        crystal.position.y = Math.sin(Date.now() * 0.003) * 0.1;
      },
      onCollect(scene) {
        if (this.collected) return;
        this.collected = true;
        this.active = false;
        SceneManager.spawnParticles(
          this.mesh.position,
          CONFIG.COLORS.neonBlue,
          8
        );
        scene.remove(this.mesh);
      },
    };
  },

  addBossFloor(scene, y, floorIndex, obstacles) {
    // Add extra obstacles for boss floor
    for (let i = 0; i < 3; i++) {
      const pos = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        y + 5 + i * 5,
        (Math.random() - 0.5) * 3
      );
      const obstacle = Obstacles.create(
        Obstacles.types.ROTATING_BEAM,
        scene,
        pos,
        { length: 6, speed: 3 + floorIndex * 0.1 }
      );
      obstacles.push(obstacle);
    }

    // Boss indicator
    const indicatorGeo = new THREE.RingGeometry(1, 1.3, 16);
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLORS.neonPink,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
    indicator.position.set(0, y + CONFIG.FLOOR_HEIGHT - 1, 0);
    indicator.rotation.x = Math.PI / 2;
    scene.add(indicator);
  },

  getFloorAtHeight(y) {
    for (let i = this.floors.length - 1; i >= 0; i--) {
      if (y >= this.floors[i].y - 1) {
        return this.floors[i].index;
      }
    }
    return 0;
  },

  update(delta, scene) {
    // Update all obstacles
    for (const floor of this.floors) {
      for (const obstacle of floor.obstacles) {
        if (obstacle.update) {
          obstacle.update(delta);
        }
      }
    }

    // Generate new floors if player is near the top
    const topFloor = this.floors[this.floors.length - 1];
    if (topFloor && Player.mesh.position.y > topFloor.y - CONFIG.FLOOR_HEIGHT * 3) {
      const newIndex = topFloor.index + 1;
      this.addFloor(scene, topFloor.y + CONFIG.FLOOR_HEIGHT, newIndex);
    }

    // Remove floors far below player to keep scene manageable
    const playerY = Player.mesh.position.y;
    while (this.floors.length > 10 && this.floors[0].y < playerY - CONFIG.FLOOR_HEIGHT * 15) {
      const oldFloor = this.floors.shift();
      for (const obstacle of oldFloor.obstacles) {
        if (obstacle.mesh) {
          scene.remove(obstacle.mesh);
          if (obstacle.mesh.geometry) obstacle.mesh.geometry.dispose();
          if (obstacle.mesh.material) obstacle.mesh.material.dispose();
        }
      }
    }
  },

  clear(scene) {
    for (const floor of this.floors) {
      for (const obstacle of floor.obstacles) {
        if (obstacle.mesh) {
          scene.remove(obstacle.mesh);
        }
      }
    }
    this.floors = [];
  },
};
