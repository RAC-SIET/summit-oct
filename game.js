// game.js - Master Game Loop for Yeti Escape Alpine Rush

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 480;
    this.canvas.height = 854;

    this.particles = new ParticleSystem(this.canvas);
    window.particles = this.particles;

    this.terrain = new DownhillManager(this.canvas);
    this.player = new Snowboarder(this.canvas);

    // Target X for steering
    this.targetX = this.canvas.width / 2;

    // Game stats
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.highScore = parseInt(localStorage.getItem('yeti_escape_highscore') || '0', 10);

    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'

    // UI Cache
    this.ui = {
      distDisplay: document.getElementById('dist-display'),
      scoreDisplay: document.getElementById('score-display'),
      coinsDisplay: document.getElementById('coins-display'),
      yetiProgress: document.getElementById('yeti-progress'),
      yetiWarning: document.getElementById('yeti-warning-text'),
      comboPopup: document.getElementById('combo-popup'),
      comboName: document.getElementById('combo-name'),
      comboPoints: document.getElementById('combo-points'),
      startScreen: document.getElementById('start-screen'),
      pauseScreen: document.getElementById('pause-screen'),
      gameOverScreen: document.getElementById('game-over-screen'),
      titleHighScore: document.getElementById('title-high-score'),
      finalDist: document.getElementById('final-dist'),
      finalScore: document.getElementById('final-score'),
      finalCoins: document.getElementById('final-coins'),
      finalRecord: document.getElementById('final-record'),
      newRecordAlert: document.getElementById('new-record-alert'),
      startBtn: document.getElementById('start-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      restartPauseBtn: document.getElementById('restart-pause-btn'),
      retryBtn: document.getElementById('retry-btn'),
      muteBtn: document.getElementById('mute-btn'),
      pauseBtn: document.getElementById('pause-btn')
    };

    this.bindControls();
    this.updateHUD();

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  bindControls() {
    const wrapper = document.getElementById('game-wrapper');

    // Buttonless Drag / Carve Controls
    let isTouching = false;
    let startY = 0;

    const onPointerDown = (e) => {
      window.soundCtrl?.ensureContext();
      if (this.state !== 'PLAYING') return;
      isTouching = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = this.canvas.getBoundingClientRect();
      this.targetX = ((clientX - rect.left) / rect.width) * this.canvas.width;
      startY = clientY;
    };

    const onPointerMove = (e) => {
      if (!isTouching || this.state !== 'PLAYING') return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const rect = this.canvas.getBoundingClientRect();
      this.targetX = ((clientX - rect.left) / rect.width) * this.canvas.width;
    };

    const onPointerUp = (e) => {
      if (this.state !== 'PLAYING') return;
      const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
      // Quick Swipe Up to jump / boost off natural bumps
      if (startY - endY > 40) {
        this.player.jump(40, 'SWIPE OLLIE');
      }
      isTouching = false;
    };

    wrapper.addEventListener('touchstart', onPointerDown, { passive: true });
    wrapper.addEventListener('touchmove', onPointerMove, { passive: true });
    wrapper.addEventListener('touchend', onPointerUp, { passive: true });

    wrapper.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'PLAYING') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.targetX = Math.max(26, this.targetX - 45);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.targetX = Math.min(this.canvas.width - 26, this.targetX + 45);
      } else if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        this.player.jump(40, 'AIR OLLIE 180');
      } else if (e.key === 'Escape' || e.key === 'p') {
        this.togglePause();
      }
    });

    // Device Tilt Steering
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (this.state !== 'PLAYING' || e.gamma === null) return;
        // Map tilt (-30 to +30 deg) across screen width
        const tiltRatio = Math.max(-1, Math.min(1, e.gamma / 25));
        this.targetX = (this.canvas.width / 2) + tiltRatio * (this.canvas.width * 0.45);
      }, true);
    }

    // Buttons
    this.ui.startBtn.addEventListener('click', () => this.startGame());
    this.ui.retryBtn.addEventListener('click', () => this.startGame());
    this.ui.resumeBtn.addEventListener('click', () => this.togglePause());
    this.ui.restartPauseBtn.addEventListener('click', () => this.startGame());

    this.ui.muteBtn.addEventListener('click', () => {
      const isMuted = window.soundCtrl.toggleMute();
      this.ui.muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    this.ui.pauseBtn.addEventListener('click', () => this.togglePause());
  }

  startGame() {
    window.soundCtrl?.ensureContext();
    this.state = 'PLAYING';
    this.distance = 0;
    this.score = 0;
    this.coins = 0;
    this.targetX = this.canvas.width / 2;

    this.player.reset();
    this.terrain.init();
    this.particles.initWeather();

    this.ui.startScreen.classList.add('hidden');
    this.ui.startScreen.classList.remove('active');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.pauseScreen.classList.add('hidden');

    this.updateHUD();
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.ui.pauseScreen.classList.remove('hidden');
      this.ui.pauseScreen.classList.add('active');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.ui.pauseScreen.classList.add('hidden');
      this.ui.pauseScreen.classList.remove('active');
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    window.soundCtrl?.playYetiRoar();

    const isNew = this.distance > this.highScore;
    if (isNew) {
      this.highScore = this.distance;
      localStorage.setItem('yeti_escape_highscore', this.highScore.toString());
      this.ui.newRecordAlert.classList.remove('hidden');
    } else {
      this.ui.newRecordAlert.classList.add('hidden');
    }

    this.ui.finalDist.textContent = `${this.distance}m`;
    this.ui.finalScore.textContent = this.score.toString();
    this.ui.finalCoins.textContent = this.coins.toString();
    this.ui.finalRecord.textContent = `${this.highScore}m`;

    this.ui.gameOverScreen.classList.remove('hidden');
    this.ui.gameOverScreen.classList.add('active');
  }

  registerTrick(name, points) {
    this.score += points;
    this.ui.comboName.textContent = name;
    this.ui.comboPoints.textContent = `+${points} PTS!`;
    this.ui.comboPopup.classList.remove('hidden');

    // Trigger CSS animation restart
    this.ui.comboPopup.style.animation = 'none';
    void this.ui.comboPopup.offsetWidth;
    this.ui.comboPopup.style.animation = 'popTrick 0.9s ease-out forwards';
  }

  addCoins(count = 1) {
    this.coins += count;
    this.score += 150;
    this.updateHUD();
  }

  updateHUD() {
    this.ui.distDisplay.innerHTML = `${this.distance}<span class="hud-unit">m</span>`;
    this.ui.scoreDisplay.textContent = this.score.toString().padStart(5, '0');
    this.ui.coinsDisplay.textContent = `🪙 ${this.coins}`;
    this.ui.titleHighScore.textContent = this.highScore.toString();

    // Yeti proximity bar
    const yetiPct = Math.max(0, Math.min(100, (this.player.yetiDist / this.player.yetiMaxDist) * 100));
    this.ui.yetiProgress.style.width = `${yetiPct}%`;

    if (this.player.yetiDist < 90 && this.state === 'PLAYING') {
      this.ui.yetiWarning.classList.remove('hidden');
    } else {
      this.ui.yetiWarning.classList.add('hidden');
    }
  }

  drawSlopeBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Pristine powder snow gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f0f9ff');
    grad.addColorStop(0.5, '#e0f2fe');
    grad.addColorStop(1, '#bae6fd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Fast downhill speed lines (wind streaks)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const lineX = ((i * 85 + (this.distance * 8)) % (w - 40)) + 20;
      const lineY = ((this.distance * 12 + i * 140) % h);
      ctx.beginPath();
      ctx.moveTo(lineX, lineY);
      ctx.lineTo(lineX, lineY + 45);
      ctx.stroke();
    }
  }

  loop(timestamp) {
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      // 1. Update Player & Yeti
      this.player.update(this.targetX, this.terrain);

      // 2. Advance downhill slope
      const speed = this.player.speed;
      this.terrain.update(speed, this.canvas.height);

      // 3. Distance & Score accumulation
      this.distance += Math.round(speed * 0.1);
      this.score += Math.round(speed * 0.5);

      // 4. Update weather particles
      this.particles.update();
      this.particles.updateWeather(speed);

      // 5. Yeti catch condition!
      if (this.player.yetiDist <= 8) {
        this.gameOver();
      }

      this.updateHUD();
    }

    // Render pass
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawSlopeBackground();

    // Terrain obstacles (underneath player)
    this.terrain.draw();

    // Snow particles
    this.particles.draw();

    // Player and Yeti
    if (this.state !== 'MENU') {
      this.player.draw();
    }

    // Foreground snow weather
    this.particles.drawWeather();

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
