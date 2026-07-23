// Three.js scene setup
const SceneManager = {
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  particles: [],

  init() {
    const canvas = document.getElementById('game-canvas');
    Logger.log('Canvas:', canvas ? 'found' : 'NOT FOUND');

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(CONFIG.COLORS.bg);
    this.scene.fog = new THREE.FogExp2(CONFIG.COLORS.bg, 0.005);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.camera.position.set(0, 5, CONFIG.CAM_OFFSET_Z);
    this.camera.lookAt(0, 5, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    Logger.log('Renderer initialized');

    // Lights
    const ambientLight = new THREE.AmbientLight(0x444466, 1.0);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    this.scene.add(dirLight);

    // Neon point lights
    const pinkLight = new THREE.PointLight(CONFIG.COLORS.neonPink, 2.0, 50);
    pinkLight.position.set(-5, 10, 5);
    this.scene.add(pinkLight);

    const blueLight = new THREE.PointLight(CONFIG.COLORS.neonBlue, 2.0, 50);
    blueLight.position.set(5, 15, -5);
    this.scene.add(blueLight);

    // Additional fill lights
    const fillLight1 = new THREE.PointLight(0xffffff, 1.5, 40);
    fillLight1.position.set(0, 20, 0);
    this.scene.add(fillLight1);

    // Clock
    this.clock = new THREE.Clock();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  },

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  },

  _renderCount: 0,

  update(delta) {
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
        this._renderCount++;
        if (this._renderCount === 1) {
          Logger.log('First render call successful');
        }
      } catch (e) {
        // Log only once
        if (!this._renderErrorLogged) {
          Logger.error('Render error:', e.message);
          this._renderErrorLogged = true;
        }
      }
    }
  },

  // Particle effects
  spawnParticles(position, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 2,
        (Math.random() - 0.5) * 8
      );

      this.scene.add(mesh);
      this.particles.push({ mesh, vel, life: 1.0 });
    }
  },

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vel.y -= 15 * delta;
      p.mesh.position.addScaledVector(p.vel, delta);
      p.life -= delta * 2;
      p.mesh.material.opacity = p.life;
      p.mesh.material.transparent = true;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  },

  clearScene() {
    // Remove all meshes except lights
    const toRemove = [];
    this.scene.traverse((child) => {
      if (child.isMesh) toRemove.push(child);
    });
    toRemove.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.particles = [];
  },
};
