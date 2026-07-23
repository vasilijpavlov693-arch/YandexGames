// Monetization - Yandex SDK ads and payments
const Monetization = {
  ysdk: null,
  payments: null,
  ready: false,

  async init() {
    try {
      if (window.YaGames) {
        this.ysdk = await YaGames.init();
        this.ready = true;
        Logger.log('Yandex SDK initialized');
      } else {
        Logger.log('Yandex SDK not found (expected in local dev)');
      }
    } catch (e) {
      Logger.warn('Yandex SDK not available:', e.message);
    }
  },

  // Rewarded video for continue
  async showRewardedVideo() {
    if (!this.ready || !this.ysdk) {
      // Fallback: just continue
      return true;
    }

    return new Promise((resolve) => {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => {
            Logger.log('Rewarded video opened');
          },
          onRewarded: () => {
            Logger.log('Rewarded!');
            resolve(true);
          },
          onClose: () => {
            Logger.log('Rewarded video closed');
          },
          onError: (e) => {
            Logger.warn('Rewarded video error:', e);
            resolve(false);
          },
        },
      });
    });
  },

  // Rewarded video for bonus crystals
  async showBonusAd() {
    if (!this.ready || !this.ysdk) {
      return true;
    }

    return new Promise((resolve) => {
      this.ysdk.adv.showRewardedVideo({
        callbacks: {
          onRewarded: () => resolve(true),
          onClose: () => resolve(false),
          onError: () => resolve(false),
        },
      });
    });
  },

  // Fullscreen ad (interstitial) - on death
  async showFullscreenAd() {
    if (!this.ready || !this.ysdk) return;

    return new Promise((resolve) => {
      this.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onClose: (wasShown) => {
            Logger.log('Fullscreen ad closed, was shown:', wasShown);
            resolve(wasShown);
          },
          onError: (e) => {
            Logger.warn('Fullscreen ad error:', e);
            resolve(false);
          },
        },
      });
    });
  },

  // In-app purchases
  async getPayments() {
    if (!this.ready || !this.ysdk) return null;

    try {
      this.payments = await this.ysdk.getPayments();
      return this.payments;
    } catch (e) {
      Logger.warn('Payments not available');
      return null;
    }
  },

  async purchase(itemId) {
    if (!this.payments) {
      const payments = await this.getPayments();
      if (!payments) return false;
    }

    try {
      await this.payments.purchase({ id: itemId });
      return true;
    } catch (e) {
      Logger.warn('Purchase failed:', e);
      return false;
    }
  },

  async getPurchases() {
    if (!this.payments) return [];
    try {
      return await this.payments.getPurchases();
    } catch (e) {
      return [];
    }
  },

  // Leaderboard
  async setLeaderboardScore(score) {
    if (!this.ready || !this.ysdk) return;

    try {
      const lb = await this.ysdk.getLeaderboards();
      await lb.setLeaderboardScore('main', score);
    } catch (e) {
      Logger.warn('Leaderboard error:', e);
    }
  },
};
