// Storage - local + Yandex SDK cloud
const Storage = {
  data: {
    bestFloor: 0,
    crystals: 0,
    totalCrystals: 0,
    ownedSkins: ['default'],
    ownedBoosts: [],
    activeSkin: 'default',
    soundEnabled: true,
    musicEnabled: true,
  },
  ysdk: null,
  player: null,

  async init() {
    // Load local data
    const saved = localStorage.getItem('tower_of_hell_data');
    if (saved) {
      try {
        Object.assign(this.data, JSON.parse(saved));
        Logger.log('Loaded save data:', this.data);
      } catch (e) {
        Logger.warn('Failed to load save data');
      }
    } else {
      Logger.log('No save data found, using defaults');
    }

    // Try to load from Yandex SDK
    try {
      if (window.YaGames) {
        this.ysdk = await YaGames.init();
        this.player = await this.ysdk.getPlayer({ scopes: false });
        const clouds = await this.player.getData();
        if (clouds && Object.keys(clouds).length > 0) {
          Object.assign(this.data, clouds);
          Logger.log('Loaded cloud data:', clouds);
        }
      }
    } catch (e) {
      Logger.warn('Yandex SDK not available, using local storage');
    }
  },

  save() {
    // Save locally
    localStorage.setItem('tower_of_hell_data', JSON.stringify(this.data));
    Logger.log('Data saved:', this.data);

    // Save to cloud
    if (this.player) {
      this.player.setData(this.data).catch(() => {});
    }
  },

  getBestFloor() {
    return this.data.bestFloor;
  },

  setBestFloor(floor) {
    if (floor > this.data.bestFloor) {
      this.data.bestFloor = floor;
      this.save();
      return true; // New record
    }
    return false;
  },

  getCrystals() {
    return this.data.crystals;
  },

  addCrystals(amount) {
    this.data.crystals += amount;
    this.data.totalCrystals += amount;
    Logger.log('Crystals earned:', amount, 'Total:', this.data.crystals);
    this.save();
  },

  spendCrystals(amount) {
    if (this.data.crystals >= amount) {
      this.data.crystals -= amount;
      this.save();
      return true;
    }
    return false;
  },

  ownsSkin(skinId) {
    return this.data.ownedSkins.includes(skinId);
  },

  buySkin(skinId) {
    if (!this.ownsSkin(skinId)) {
      this.data.ownedSkins.push(skinId);
      this.save();
    }
  },

  getActiveSkin() {
    return this.data.activeSkin;
  },

  setActiveSkin(skinId) {
    this.data.activeSkin = skinId;
    this.save();
  },

  ownsBoost(boostId) {
    return this.data.ownedBoosts.includes(boostId);
  },

  buyBoost(boostId) {
    if (!this.ownsBoost(boostId)) {
      this.data.ownedBoosts.push(boostId);
      this.save();
    }
  },

  getSetting(key) {
    return this.data[key];
  },

  setSetting(key, value) {
    this.data[key] = value;
    this.save();
  },
};
