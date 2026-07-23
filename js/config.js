// Game constants
const CONFIG = {
  // Tower
  FLOOR_HEIGHT: 10,
  PLATFORM_SIZE: 6,
  PLATFORM_DEPTH: 3,
  TOWER_WIDTH: 12,

  // Player
  PLAYER_SIZE: 0.8,
  MOVE_SPEED: 8,
  JUMP_FORCE: 12,
  GRAVITY: 30,
  MAX_FALL_SPEED: -25,
  COYOTE_TIME: 0.15,
  JUMP_BUFFER: 0.1,

  // Obstacles
  ROTATING_SPEED_MIN: 1.5,
  ROTATING_SPEED_MAX: 4,
  MOVING_SPEED_MIN: 2,
  MOVING_SPEED_MAX: 5,
  DISAPPEAR_DELAY: 1.5,

  // Camera
  CAM_FOLLOW_SPEED: 8,
  CAM_OFFSET_Y: 5,
  CAM_OFFSET_Z: 12,
  CAM_LOOK_AHEAD: 3,
  CAM_ROTATION_SPEED: 2,

  // Colors
  COLORS: {
    bg: 0x111122,
    platform: 0x4455aa,
    platformEdge: 0x6677cc,
    player: 0xff0040,
    playerGlow: 0xff4060,
    obstacle: 0x00e5ff,
    spike: 0xff1744,
    movingPlatform: 0x9966ff,
    disappearingPlatform: 0xffcc00,
    crystal: 0x00ffff,
    neonPink: 0xff0040,
    neonBlue: 0x00e5ff,
    neonPurple: 0x7c4dff,
    neonGreen: 0x00c853,
  },

  // Monetization
  CRYSTALS_PER_FLOOR: 1,
  CRYSTALS_PER_RECORD: 5,
  CRYSTALS_PER_AD: 3,
  AD_CONTINUE_FLOOR: true,

  // Shop
  SKINS: [
    { id: 'default', name: 'Классик', price: 0, color: 0xff0040 },
    { id: 'blue', name: 'Неон', price: 50, color: 0x00e5ff },
    { id: 'green', name: 'Токсик', price: 75, color: 0x00c853 },
    { id: 'purple', name: 'Фиолет', price: 100, color: 0x7c4dff },
    { id: 'gold', name: 'Золотой', price: 200, color: 0xffd600 },
    { id: 'rainbow', name: 'Радуга', price: 500, color: null },
  ],

  BOOSTS: [
    { id: 'checkpoint', name: 'Чекпоинт', desc: 'Сохрани прогресс', price: 100 },
    { id: 'double_jump', name: 'Двойной прыжок', desc: '+1 прыжок в воздухе', price: 300 },
    { id: 'head_start', name: 'Старт с 3 этажа', desc: 'Пропусти первые 2', price: 150 },
  ],
};
