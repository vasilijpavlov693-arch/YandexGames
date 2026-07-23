// UI manager
const UI = {
  screens: {},

  init() {
    this.screens = {
      mainMenu: document.getElementById('main-menu'),
      death: document.getElementById('death-screen'),
      victory: document.getElementById('victory-screen'),
      shop: document.getElementById('shop-screen'),
      settings: document.getElementById('settings-screen'),
      hud: document.getElementById('hud'),
      mobileControls: document.getElementById('mobile-controls'),
    };

    this.setupButtons();
    this.setupMobileControls();
    this.populateShop();
  },

  setupButtons() {
    // Main menu
    document.getElementById('btn-play').addEventListener('click', () => {
      AudioManager.play('click');
      Game.start();
    });
    document.getElementById('btn-shop').addEventListener('click', () => {
      AudioManager.play('click');
      this.showScreen('shop');
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      AudioManager.play('click');
      this.showScreen('settings');
    });

    // Death screen
    document.getElementById('btn-restart').addEventListener('click', () => {
      AudioManager.play('click');
      Game.restart();
    });
    document.getElementById('btn-continue').addEventListener('click', () => {
      AudioManager.play('click');
      Game.continueWithAd();
    });
    document.getElementById('btn-home').addEventListener('click', () => {
      AudioManager.play('click');
      Game.goHome();
    });

    // Victory screen
    document.getElementById('btn-victory-home').addEventListener('click', () => {
      AudioManager.play('click');
      Game.goHome();
    });

    // Shop
    document.getElementById('btn-shop-close').addEventListener('click', () => {
      AudioManager.play('click');
      this.showScreen('mainMenu');
    });

    // Settings
    document.getElementById('btn-settings-close').addEventListener('click', () => {
      AudioManager.play('click');
      this.showScreen('mainMenu');
    });

    document.getElementById('toggle-sound').addEventListener('change', (e) => {
      AudioManager.toggleSound();
      Storage.setSetting('soundEnabled', e.target.checked);
    });

    document.getElementById('toggle-music').addEventListener('change', (e) => {
      AudioManager.toggleMusic();
      Storage.setSetting('musicEnabled', e.target.checked);
    });
  },

  setupMobileControls() {
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );

    if (isMobile) {
      this.screens.mobileControls.classList.remove('hidden');
    }

    // Joystick
    const joystickBase = document.getElementById('joystick-base');
    const joystickStick = document.getElementById('joystick-stick');
    let joystickActive = false;
    let joystickRect = null;

    const handleJoystick = (clientX, clientY) => {
      if (!joystickRect) return;
      const centerX = joystickRect.left + joystickRect.width / 2;
      const centerY = joystickRect.top + joystickRect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const maxDist = joystickRect.width / 2 - 25;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
      JoystickInput.x = dx / maxDist;
      JoystickInput.y = dy / maxDist;
      JoystickInput.active = true;
    };

    joystickBase.addEventListener('touchstart', (e) => {
      e.preventDefault();
      joystickActive = true;
      joystickRect = joystickBase.getBoundingClientRect();
      handleJoystick(e.touches[0].clientX, e.touches[0].clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (joystickActive) {
        handleJoystick(e.touches[0].clientX, e.touches[0].clientY);
      }
    });

    window.addEventListener('touchend', () => {
      joystickActive = false;
      joystickStick.style.transform = 'translate(0, 0)';
      JoystickInput.x = 0;
      JoystickInput.y = 0;
      JoystickInput.active = false;
    });

    // Jump button
    const jumpBtn = document.getElementById('btn-jump');
    jumpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      MobileInput.jump = true;
    });
    jumpBtn.addEventListener('touchend', () => {
      MobileInput.jump = false;
    });
  },

  populateShop() {
    const container = document.getElementById('shop-items');
    container.innerHTML = '';

    // Skins
    CONFIG.SKINS.forEach((skin) => {
      const item = document.createElement('div');
      item.className = 'shop-item' + (Storage.ownsSkin(skin.id) ? ' owned' : '');
      item.innerHTML = `
        <div class="item-icon" style="color: #${skin.color ? skin.color.toString(16).padStart(6, '0') : 'ffffff'}">■</div>
        <div class="item-name">${skin.name}</div>
        <div class="item-price">${skin.price === 0 ? 'Бесплатно' : '💎 ' + skin.price}</div>
      `;
      item.addEventListener('click', () => this.handleShopItem(skin, 'skin'));
      container.appendChild(item);
    });

    // Boosts
    CONFIG.BOOSTS.forEach((boost) => {
      const item = document.createElement('div');
      item.className = 'shop-item' + (Storage.ownsBoost(boost.id) ? ' owned' : '');
      item.innerHTML = `
        <div class="item-icon">⚡</div>
        <div class="item-name">${boost.name}</div>
        <div class="item-price">${Storage.ownsBoost(boost.id) ? 'Куплено' : '💎 ' + boost.price}</div>
      `;
      item.addEventListener('click', () => this.handleShopItem(boost, 'boost'));
      container.appendChild(item);
    });
  },

  handleShopItem(item, type) {
    if (type === 'skin') {
      if (Storage.ownsSkin(item.id)) {
        Storage.setActiveSkin(item.id);
        const skinConfig = CONFIG.SKINS.find((s) => s.id === item.id);
        if (skinConfig && skinConfig.color) {
          Player.setSkin(skinConfig.color);
        }
        AudioManager.play('click');
      } else if (Storage.spendCrystals(item.price)) {
        Storage.buySkin(item.id);
        Storage.setActiveSkin(item.id);
        AudioManager.play('purchase');
      }
    } else if (type === 'boost') {
      if (!Storage.ownsBoost(item.id) && Storage.spendCrystals(item.price)) {
        Storage.buyBoost(item.id);
        AudioManager.play('purchase');

        // Apply immediate effects
        if (item.id === 'double_jump') {
          Player.maxJumps = 2;
        }
      }
    }

    this.updateCrystalDisplay();
    this.populateShop();
  },

  showScreen(name) {
    // Hide all overlays
    document.querySelectorAll('.overlay').forEach((el) => {
      el.classList.add('hidden');
    });

    // Show requested
    if (name === 'game') {
      this.screens.hud.classList.remove('hidden');
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        this.screens.mobileControls.classList.remove('hidden');
      }
    } else if (this.screens[name]) {
      this.screens[name].classList.remove('hidden');
    }
  },

  updateHUD(floor, crystals) {
    document.getElementById('floor-num').textContent = floor;
    document.getElementById('crystal-num').textContent = crystals;
    document.getElementById('best-num').textContent = Storage.getBestFloor();
  },

  updateCrystalDisplay() {
    document.getElementById('crystal-num').textContent = Storage.getCrystals();
  },

  showDeath(floor, crystalsEarned) {
    document.getElementById('death-floor').textContent = floor;
    document.getElementById('death-crystals').textContent = crystalsEarned;
    this.showScreen('death');
  },

  showVictory(crystalsEarned) {
    document.getElementById('victory-crystals').textContent = crystalsEarned;
    this.showScreen('victory');
  },
};
