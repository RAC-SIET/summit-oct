// terrain.js - Downhill slope generator: pines, rocks, ramps, grind rails, and coins

const OBSTACLE_TYPES = {
  PINE: 'pine',         // Pine tree obstacle (crash!)
  ROCK: 'rock',         // Low rock (can crash or jump over)
  RAMP: 'ramp',         // Wooden snow jump ramp (launches airtime & tricks)
  RAIL: 'rail',         // Fallen log / grind rail (grinding gives huge speed & points)
  COIN: 'coin'          // Golden alpine coin
};

class DownhillManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.items = [];
    this.nextSpawnY = 200;
    this.init();
  }

  init() {
    this.items = [];
    this.nextSpawnY = 300;

    // Balanced initial obstacle distribution
    for (let y = 380; y < 1500; y += 150) {
      this.generateRowAt(y);
    }
  }

  generateRowAt(y) {
    const laneWidth = this.canvas.width;
    // Balanced: about half single, half paired with plenty of weave room
    const count = Math.random() < 0.5 ? 1 : 2;

    for (let i = 0; i < count; i++) {
      const x = count === 1 
        ? Math.random() * (laneWidth - 120) + 60 
        : (i === 0 ? Math.random() * 110 + 40 : laneWidth - Math.random() * 110 - 40);
      const rand = Math.random();

      if (rand < 0.45) {
        // Pine Tree
        this.items.push({
          type: OBSTACLE_TYPES.PINE,
          x: x,
          y: y + (Math.random() - 0.5) * 25,
          width: 32,
          height: 48,
          hit: false
        });
      } else if (rand < 0.68) {
        // Jump Ramp
        this.items.push({
          type: OBSTACLE_TYPES.RAMP,
          x: x,
          y: y,
          width: 44,
          height: 24,
          hit: false
        });
      } else if (rand < 0.84) {
        // Grind Rail / Fallen Timber Log
        this.items.push({
          type: OBSTACLE_TYPES.RAIL,
          x: x,
          y: y,
          width: 22,
          height: 80,
          hit: false
        });
      } else {
        // Alpine Gold Coin
        this.items.push({
          type: OBSTACLE_TYPES.COIN,
          x: x,
          y: y,
          radius: 10,
          pulse: Math.random() * Math.PI,
          collected: false
        });
      }
    }
  }

  update(worldSpeed, canvasHeight) {
    // Scroll all items upward relative to downhill movement
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y -= worldSpeed;

      // Clean items passed far behind
      if (it.y < -120) {
        this.items.splice(i, 1);
      }
    }

    // Balanced runtime row spacing: ~140-165px
    const lowestY = this.items.reduce((max, it) => Math.max(max, it.y), 0);
    if (lowestY < canvasHeight + 750) {
      this.generateRowAt(lowestY + Math.floor(Math.random() * 30 + 140));
    }
  }

  draw() {
    const ctx = this.ctx;

    for (let it of this.items) {
      if (it.y < -60 || it.y > this.canvas.height + 60) continue;

      ctx.save();
      if (it.type === OBSTACLE_TYPES.PINE) {
        // Snowy Pine Tree
        const px = it.x;
        const py = it.y;

        // Trunk
        ctx.fillStyle = '#78350f';
        ctx.fillRect(px - 4, py + 14, 8, 14);

        // Lower foliage
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.moveTo(px, py - 6);
        ctx.lineTo(px + 18, py + 16);
        ctx.lineTo(px - 18, py + 16);
        ctx.closePath();
        ctx.fill();

        // Upper foliage
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.moveTo(px, py - 24);
        ctx.lineTo(px + 14, py - 4);
        ctx.lineTo(px - 14, py - 4);
        ctx.closePath();
        ctx.fill();

        // Snow frosting cap
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(px, py - 25);
        ctx.lineTo(px + 7, py - 14);
        ctx.lineTo(px - 7, py - 14);
        ctx.closePath();
        ctx.fill();

      } else if (it.type === OBSTACLE_TYPES.RAMP) {
        // Wooden Jump Ramp with red-white caution stripes
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(it.x - 22, it.y + 12);
        ctx.lineTo(it.x + 22, it.y + 12);
        ctx.lineTo(it.x + 18, it.y - 12);
        ctx.lineTo(it.x - 18, it.y - 12);
        ctx.closePath();
        ctx.fill();

        // Snow kick ramp ridge
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(it.x - 18, it.y - 12, 36, 4);

        ctx.fillStyle = '#fef08a';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('▲', it.x, it.y + 8);

      } else if (it.type === OBSTACLE_TYPES.RAIL) {
        // Fallen Timber Log / Grind Rail
        ctx.fillStyle = '#451a03';
        ctx.fillRect(it.x - 7, it.y, 14, it.height);

        // Snow / Ice glide surface on top
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(it.x - 3, it.y, 6, it.height);

      } else if (it.type === OBSTACLE_TYPES.COIN && !it.collected) {
        it.pulse += 0.08;
        const scaleX = Math.cos(it.pulse);

        ctx.translate(it.x, it.y);
        ctx.scale(scaleX, 1);

        // Gold coin body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, it.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner rim
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      }
      ctx.restore();
    }
  }
}

window.DownhillManager = DownhillManager;
window.OBSTACLE_TYPES = OBSTACLE_TYPES;
