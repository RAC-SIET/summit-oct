// particles.js - Snow trails, ski spray, spark bursts, and pine needle debris

class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.snowflakes = [];
    this.initWeather();
  }

  initWeather() {
    this.snowflakes = [];
    const count = 65;
    for (let i = 0; i < count; i++) {
      this.snowflakes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 1,
        speedY: Math.random() * 2.5 + 1.5,
        speedX: (Math.random() - 0.5) * 1.5,
        opacity: Math.random() * 0.7 + 0.3
      });
    }
  }

  updateWeather(speedMult = 1.0) {
    for (let s of this.snowflakes) {
      s.y += s.speedY * (1 + speedMult * 0.4);
      s.x += s.speedX;

      if (s.y > this.canvas.height) {
        s.y = -5;
        s.x = Math.random() * this.canvas.width;
      }
      if (s.x > this.canvas.width) s.x = 0;
      if (s.x < 0) s.x = this.canvas.width;
    }
  }

  drawWeather() {
    this.ctx.save();
    for (let s of this.snowflakes) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // Snow spray carving behind snowboard
  spawnSnowSpray(x, y, dir = 1) {
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + 4,
        vx: -dir * (Math.random() * 2.5 + 1),
        vy: -(Math.random() * 2 + 1),
        size: Math.random() * 4 + 2,
        color: '#ffffff',
        life: 0.7,
        decay: 0.05,
        gravity: 0.15
      });
    }
  }

  // Grind spark shower
  spawnGrindSparks(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 3 + 1),
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.5 ? '#f59e0b' : '#38bdf8',
        life: 0.8,
        decay: 0.06,
        gravity: 0.2
      });
    }
  }

  // Pine tree shatter
  spawnPineShatter(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: Math.random() > 0.4 ? '#166534' : '#78350f',
        life: 1.0,
        decay: 0.04,
        gravity: 0.18
      });
    }
  }

  // Coin burst
  spawnCoinBurst(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = Math.random() * 3 + 2;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: '#f59e0b',
        life: 0.9,
        decay: 0.04,
        gravity: 0.08
      });
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.save();
    for (let p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    this.ctx.restore();
  }
}

window.ParticleSystem = ParticleSystem;
