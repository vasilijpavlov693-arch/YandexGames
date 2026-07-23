// Main game controller
const Game = {
  state: 'menu', // menu, playing, dead, victory
  currentFloor: 0,
  crystalsEarned: 0,
  isMobile: false,

  async init() {
    // Init logger first
    Logger.init();
    Logger.log('=== Game Starting ===');

    // Init modules
    AudioManager.init();
    SceneManager.init();
    UI.init();
    await Storage.init();
    await Monetization.init();

    // Apply saved settings
    document.getElementById('toggle-sound').checked = Storage.getSetting('soundEnabled');
    document.getElementById('toggle-music').checked = Storage.getSetting('musicEnabled');
    AudioManager.enabled = Storage.getSetting('soundEnabled');
    AudioManager.musicEnabled = Storage.getSetting('musicEnabled');

    // Apply saved skin
    const activeSkin = Storage.getActiveSkin();
    const skinConfig = CONFIG.SKINS.find((s) => s.id === activeSkin);
    if (skinConfig && skinConfig.color) {
      Player.setSkin(skinConfig.color);
    }

    // Apply owned boosts
    if (Storage.ownsBoost('double_jump')) {
      Player.maxJumps = 2;
    }

    // Check mobile
    this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

    // Show menu
    UI.showScreen('mainMenu');
    UI.updateCrystalDisplay();

    // Start game loop
    this.gameLoop();

    Logger.log('Game initialized');
    Logger.log('Ctrl+L: export logs | Ctrl+Shift+L: debug panel');
    Logger.initPanel();
  },

  start() {
    Logger.log('=== Game.start() ===');
    this.state = 'playing';
    this.currentFloor = 1;
    this.crystalsEarned = 0;

    // Hide menu immediately
    const menu = document.getElementById('main-menu');
    if (menu) {
      menu.classList.add('hidden');
      Logger.log('Menu hidden');
    }

    // Init player
    Player.init(SceneManager.scene);
    Logger.log('Player created at:', Player.mesh.position.x, Player.mesh.position.y, Player.mesh.position.z);

    // Init camera
    CameraController.init();
    Logger.log('Camera inited, pos:', SceneManager.camera.position.x,
      SceneManager.camera.position.y, SceneManager.camera.position.z);

    // Generate tower
    Logger.log('Generating tower...');
    Tower.generate(SceneManager.scene, 0);
    Logger.log('Tower floors:', Tower.floors.length);
    Logger.log('First floor obstacles:', Tower.floors[0] ? Tower.floors[0].obstacles.length : 0);

    // Apply skin
    const activeSkin = Storage.getActiveSkin();
    const skinConfig = CONFIG.SKINS.find((s) => s.id === activeSkin);
    if (skinConfig && skinConfig.color) {
      Player.setSkin(skinConfig.color);
    }

    // Apply boosts
    Player.maxJumps = Storage.ownsBoost('double_jump') ? 2 : 1;

    // Head start boost
    const startOffset = Storage.ownsBoost('head_start') ? 2 : 0;
    this.currentFloor = 1 + startOffset;
    Player.mesh.position.set(0, 1.5 + startOffset * CONFIG.FLOOR_HEIGHT, 0);

    // Generate tower
    Tower.generate(SceneManager.scene, 0);

    // Show game UI
    UI.showScreen('game');
    UI.updateHUD(this.currentFloor, this.crystalsEarned);

    AudioManager.resume();
    AudioManager.play('click');
  },

  restart() {
    // Cleanup
    SceneManager.clearScene();
    this.start();
  },

  async continueWithAd() {
    const rewarded = await Monetization.showRewardedVideo();
    if (rewarded) {
      // Revive at current floor
      this.state = 'playing';
      Player.reset();
      Player.mesh.position.set(0, 1.5 + (this.currentFloor - 1) * CONFIG.FLOOR_HEIGHT, 0);
      Player.mesh.visible = true;
      Player.alive = true;
      CameraController.reset();
      UI.showScreen('game');
      AudioManager.play('click');
    } else {
      // Go home if ad didn't play
      this.goHome();
    }
  },

  goHome() {
    this.state = 'menu';
    SceneManager.clearScene();
    Player.mesh = null;
    CameraController.reset();
    UI.showScreen('mainMenu');
    UI.updateCrystalDisplay();
  },

  onPlayerDeath() {
    if (this.state !== 'playing') return;
    this.state = 'dead';

    // Award crystals
    Storage.addCrystals(this.crystalsEarned);
    Monetization.showFullscreenAd();

    UI.showDeath(this.currentFloor, this.crystalsEarned);
  },

  onFloorComplete(floor) {
    if (floor > this.currentFloor) {
      this.currentFloor = floor;
      this.crystalsEarned += CONFIG.CRYSTALS_PER_FLOOR;

      // Check record
      const isNewRecord = Storage.setBestFloor(floor);
      if (isNewRecord) {
        this.crystalsEarned += CONFIG.CRYSTALS_PER_RECORD;
        Monetization.setLeaderboardScore(floor);
      }

      AudioManager.play('floor');
      UI.updateHUD(this.currentFloor, this.crystalsEarned);

      // Victory condition (every 25 floors)
      if (floor % 25 === 0) {
        this.victory();
      }
    }
  },

  victory() {
    if (this.state !== 'playing') return;
    this.state = 'victory';

    Storage.addCrystals(this.crystalsEarned);
    AudioManager.play('win');
    UI.showVictory(this.crystalsEarned);
  },

  gameLoop() {
    requestAnimationFrame(() => this.gameLoop());

    const delta = Math.min(SceneManager.clock.getDelta(), 0.05);

    // Log player position occasionally
    if (this.state === 'playing' && Player.mesh && Math.random() < 0.02) {
      Logger.log('Player pos:', Player.mesh.position.y.toFixed(1),
        'Vel:', Player.velocity.y.toFixed(1),
        'Ground:', Player.onGround,
        'Alive:', Player.alive);
    }

    if (this.state === 'playing' && Player.mesh && Player.alive) {
      // Update player
      Player.update(delta);

      // Update tower
      Tower.update(delta, SceneManager.scene);

      // Collision detection
      this.checkCollisions();

      // Check floor progress
      const newFloor = Tower.getFloorAtHeight(Player.mesh.position.y);
      if (newFloor >= this.currentFloor) {
        this.onFloorComplete(newFloor + 1);
      }
    }

    // Camera always updates (even when dead or in menu)
    if (Player.mesh) {
      CameraController.update(delta);
    }

    // Update particles
    SceneManager.updateParticles(delta);

    // Update crystal animations
    for (const floor of Tower.floors) {
      for (const obstacle of floor.obstacles) {
        if (obstacle.type === 'crystal' && obstacle.update) {
          obstacle.update(delta);
        }
      }
    }

    // Render
    SceneManager.update(delta);
  },

  checkCollisions() {
    if (!Player.mesh || !Player.alive) return;
    const playerY = Player.mesh.position.y;
    const checkRange = CONFIG.FLOOR_HEIGHT * 2;

    for (const floor of Tower.floors) {
      if (Math.abs(floor.y - playerY) > checkRange) continue;

      for (const obstacle of floor.obstacles) {
        if (!obstacle.active) continue;

        // Check if on top (landing)
        if (Obstacles.checkOnTop(Player, obstacle)) {
          if (!Player.onGround) {
            AudioManager.play('land');
          }
          Player.onGround = true;
          Player.velocity.y = 0;
          Player.mesh.position.y =
            obstacle.mesh.position.y + 0.2 + CONFIG.PLAYER_SIZE * 0.5;

          // Disappearing platform trigger
          if (obstacle.type === Obstacles.types.DISAPPEARING && obstacle.onStep) {
            obstacle.onStep();
          }
        }

        // Check collision (death from side/bottom)
        if (
          Obstacles.checkCollision(Player, obstacle) &&
          !Obstacles.checkOnTop(Player, obstacle)
        ) {
          // Deadly obstacles
          if (obstacle.deadly) {
            Player.die();
            return;
          }

          // Push from pusher
          if (obstacle.type === Obstacles.types.PUSHER) {
            const pushDir = new THREE.Vector3()
              .subVectors(Player.mesh.position, obstacle.mesh.position)
              .normalize();
            Player.velocity.x += pushDir.x * 15;
            Player.velocity.z += pushDir.z * 15;
            Player.velocity.y = 8;
          }
        }

        // Crystal collection
        if (obstacle.type === 'crystal' && !obstacle.collected) {
          const dist = Player.mesh.position.distanceTo(obstacle.mesh.position);
          if (dist < 1.5) {
            obstacle.onCollect(SceneManager.scene);
            this.crystalsEarned++;
            AudioManager.play('crystal');
            UI.updateHUD(this.currentFloor, this.crystalsEarned);
          }
        }
      }
    }

    // Reset onGround if not on any platform
    if (Player.onGround) {
      let stillOnGround = false;
      for (const floor of Tower.floors) {
        if (Math.abs(floor.y - playerY) > checkRange) continue;
        for (const obstacle of floor.obstacles) {
          if (Obstacles.checkOnTop(Player, obstacle)) {
            stillOnGround = true;
            break;
          }
        }
        if (stillOnGround) break;
      }
      if (!stillOnGround) {
        Player.onGround = false;
      }
    }
  },

};

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
