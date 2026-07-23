// Camera controller with rotation
const CameraController = {
  angle: 0,
  targetAngle: 0,
  distance: 12,
  height: 5,
  lookAhead: 3,

  init() {
    this.angle = 0;
    this.targetAngle = 0;
  },

  _logCount: 0,

  update(delta) {
    if (!Player.mesh || !SceneManager.camera) {
      if (this._logCount < 3) {
        Logger.log('Camera skip: mesh=' + !!Player.mesh + ' cam=' + !!SceneManager.camera);
        this._logCount++;
      }
      return;
    }

    // Smooth rotation
    this.angle += (this.targetAngle - this.angle) * 5 * delta;

    // Keep angle in 0-2PI range
    this.targetAngle = this.targetAngle % (Math.PI * 2);

    // Calculate camera position around player
    const px = Player.mesh.position.x;
    const py = Player.mesh.position.y;
    const pz = Player.mesh.position.z;

    // Orbit around player
    const camX = px + Math.sin(this.angle) * this.distance;
    const camZ = pz + Math.cos(this.angle) * this.distance;
    const camY = py + this.height;

    // Smooth follow
    SceneManager.camera.position.x += (camX - SceneManager.camera.position.x) * 4 * delta;
    SceneManager.camera.position.y += (camY - SceneManager.camera.position.y) * 4 * delta;
    SceneManager.camera.position.z += (camZ - SceneManager.camera.position.z) * 4 * delta;

    // Look at player
    SceneManager.camera.lookAt(
      px,
      py + this.lookAhead,
      pz
    );

    // Log camera position occasionally
    if (Math.random() < 0.05) {
      Logger.log('Cam:', SceneManager.camera.position.x.toFixed(1),
        SceneManager.camera.position.y.toFixed(1),
        SceneManager.camera.position.z.toFixed(1),
        'angle:', this.angle.toFixed(2));
    }
  },

  reset() {
    this.angle = 0;
    this.targetAngle = 0;
  }
};
