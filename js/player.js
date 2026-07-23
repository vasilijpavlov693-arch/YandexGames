// Player controller
const Player = {
  mesh: null,
  velocity: new THREE.Vector3(),
  onGround: false,
  coyoteTimer: 0,
  jumpBufferTimer: 0,
  jumpsLeft: 1,
  maxJumps: 1,
  alive: true,
  input: { x: 0, z: 0, jump: false },
  jumpPressed: false,

  init(scene) {
    // Clean up old mesh
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }

    // Player body — capsule-like shape
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(
      CONFIG.PLAYER_SIZE * 0.5,
      CONFIG.PLAYER_SIZE * 0.5,
      CONFIG.PLAYER_SIZE,
      8
    );
    const bodyMat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.player,
      emissive: CONFIG.COLORS.playerGlow,
      emissiveIntensity: 0.8,
      shininess: 80,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    body.position.y = CONFIG.PLAYER_SIZE * 0.5;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(CONFIG.PLAYER_SIZE * 0.3, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLORS.player,
      emissive: CONFIG.COLORS.playerGlow,
      emissiveIntensity: 0.8,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.castShadow = true;
    head.position.y = CONFIG.PLAYER_SIZE + CONFIG.PLAYER_SIZE * 0.2;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, CONFIG.PLAYER_SIZE + 0.25, 0.22);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, CONFIG.PLAYER_SIZE + 0.25, 0.22);
    group.add(rightEye);

    // Player glow light
    const playerLight = new THREE.PointLight(CONFIG.COLORS.player, 1.0, 8);
    playerLight.position.set(0, CONFIG.PLAYER_SIZE, 0);
    group.add(playerLight);

    this.mesh = group;
    this.mesh.position.set(0, 2, 0);
    scene.add(this.mesh);
  },

  reset() {
    this.mesh.position.set(0, 2, 0);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.jumpsLeft = this.maxJumps;
    this.alive = true;
  },

  setSkin(color) {
    if (!this.mesh) return;
    this.mesh.children.forEach((child) => {
      if (child.material) {
        child.material.color.setHex(color);
        if (child.material.emissive) {
          child.material.emissive.setHex(color);
        }
      }
    });
  },

  handleInput() {
    // Keyboard - WASD/Arrows for movement, Space for jump only
    let rawX = 0;
    let rawZ = 0;

    if (KeyState['KeyA'] || KeyState['ArrowLeft']) rawX = -1;
    if (KeyState['KeyD'] || KeyState['ArrowRight']) rawX = 1;
    if (KeyState['KeyW'] || KeyState['ArrowUp']) rawZ = -1;
    if (KeyState['KeyS'] || KeyState['ArrowDown']) rawZ = 1;

    // Mobile joystick
    if (JoystickInput.active) {
      rawX = JoystickInput.x;
      rawZ = JoystickInput.y;
    }

    // Rotate input by camera angle so movement is relative to camera
    const angle = CameraController.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.input.x = rawX * cos + rawZ * sin;
    this.input.z = -rawX * sin + rawZ * cos;

    // Normalize diagonal
    const len = Math.sqrt(this.input.x * this.input.x + this.input.z * this.input.z);
    if (len > 1) {
      this.input.x /= len;
      this.input.z /= len;
    }

    // Jump - ONLY Space or mobile button
    if (KeyState['Space'] || MobileInput.jump) {
      if (!this.jumpPressed) {
        this.jumpBufferTimer = CONFIG.JUMP_BUFFER;
      }
      this.jumpPressed = true;
    } else {
      this.jumpPressed = false;
    }

    // Camera rotation - Q/E keys
    if (KeyState['KeyQ']) {
      CameraController.targetAngle += CONFIG.CAM_ROTATION_SPEED * 0.016;
    }
    if (KeyState['KeyE']) {
      CameraController.targetAngle -= CONFIG.CAM_ROTATION_SPEED * 0.016;
    }
  },

  update(delta) {
    if (!this.alive) return;

    this.handleInput();

    // Horizontal movement
    this.velocity.x = this.input.x * CONFIG.MOVE_SPEED;
    this.velocity.z = this.input.z * CONFIG.MOVE_SPEED;

    // Gravity
    this.velocity.y -= CONFIG.GRAVITY * delta;
    if (this.velocity.y < CONFIG.MAX_FALL_SPEED) {
      this.velocity.y = CONFIG.MAX_FALL_SPEED;
    }

    // Coyote time
    if (this.onGround) {
      this.coyoteTimer = CONFIG.COYOTE_TIME;
      this.jumpsLeft = this.maxJumps;
    } else {
      this.coyoteTimer -= delta;
    }

    // Jump buffer
    this.jumpBufferTimer -= delta;

    // Jump
    if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || this.jumpsLeft > 0)) {
      this.velocity.y = CONFIG.JUMP_FORCE;
      if (!this.onGround) {
        this.jumpsLeft--;
      }
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      AudioManager.play('jump');
    }

    // Apply velocity
    this.mesh.position.x += this.velocity.x * delta;
    this.mesh.position.y += this.velocity.y * delta;
    this.mesh.position.z += this.velocity.z * delta;

    // Tilt based on movement
    const targetTilt = -this.input.x * 0.15;
    this.mesh.rotation.z += (targetTilt - this.mesh.rotation.z) * 8 * delta;

    // Squash and stretch
    const squash = this.onGround ? 1.0 : (this.velocity.y > 0 ? 0.85 : 1.1);
    this.mesh.scale.y += (squash - this.mesh.scale.y) * 10 * delta;
    this.mesh.scale.x += (1.0 - this.mesh.scale.x) * 10 * delta;
    this.mesh.scale.z = this.mesh.scale.x;

    // Fall death
    if (this.mesh.position.y < -20) {
      this.die();
    }

    // Safety respawn - if falling too far below current floor
    if (this.mesh.position.y < -5 && Game.state === 'playing') {
      this.respawnOnPlatform();
    }
  },

  die() {
    if (!this.alive) return;
    this.alive = false;
    AudioManager.play('death');
    SceneManager.spawnParticles(
      this.mesh.position,
      CONFIG.COLORS.player,
      20
    );
    this.mesh.visible = false;
    Game.onPlayerDeath();
  },

  respawnOnPlatform() {
    // Find the highest platform below the player
    let bestY = 2;
    let bestX = 0;
    let bestZ = 0;

    for (const floor of Tower.floors) {
      for (const obstacle of floor.obstacles) {
        if (
          obstacle.type === Obstacles.types.PLATFORM ||
          obstacle.type === Obstacles.types.MOVING_PLATFORM
        ) {
          const oy = obstacle.mesh.position.y;
          if (oy > bestY && oy < this.mesh.position.y + 5) {
            bestY = oy;
            bestX = obstacle.mesh.position.x;
            bestZ = obstacle.mesh.position.z;
          }
        }
      }
    }

    this.mesh.position.set(bestX, bestY + 2, bestZ);
    this.velocity.set(0, 0, 0);
    this.onGround = false;
  },
};

// Key state tracking
const KeyState = {};
window.addEventListener('keydown', (e) => {
  KeyState[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener('keyup', (e) => {
  KeyState[e.code] = false;
});

// Mobile input
const MobileInput = { jump: false };
const JoystickInput = { active: false, x: 0, y: 0 };
