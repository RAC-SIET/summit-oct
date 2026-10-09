// player.js - Snowboarder physics, carving, airtime tricks, and Yeti monster chasing behind

class Snowboarder {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reset();
  }

  reset() {
    this.x = this.canvas.width / 2;
    this.y = 260; // Fixed vertical focal point on screen
    this.vx = 0;
    this.baseSpeed = 3.2; // Relaxed cruising downhill speed
    this.speed = this.baseSpeed;
    this.maxSpeed = 5.2; // Gentle ceiling so it never becomes too fast
    this.carveAngle = 0; // Steering tilt angle
    this.width = 24;
    this.height = 36;

    // Airtime / Tricks
    this.isAirborne = false;
    this.airTime = 0;
    this.airDuration = 0;
    this.trickRotation = 0;
    this.trickType = null;
    this.trickScore = 0;

    // Grinding state
    this.isGrinding = false;
    this.grindTimer = 0;

    // Wipeout / Crash state
    this.isCrashing = false;
    this.crashTimer = 0;

    // Yeti chase mechanics
    this.yetiDist = 340; // Starts far behind with a healthy head-start!
    this.yetiMaxDist = 420;
    this.yetiAnim = 0;
  }

  jump(boostAir = 45, trickName = 'BACKFLIP 360') {
    if (this.isAirborne || this.isCrashing) return;
    this.isAirborne = true;
    this.airTime = 0;
    this.airDuration = boostAir;
    this.trickRotation = 0;
    this.trickType = trickName;
    this.trickScore = 300 + Math.floor(Math.random() * 200);
    // Smooth, gentle power boost (doesn't rocket player out of control)
    this.speed = Math.min(this.maxSpeed, this.speed + 0.6);
    window.soundCtrl?.playJump();
  }

  startGrind() {
    this.isGrinding = true;
    this.grindTimer = 25;
    // Gentle grind boost
    this.speed = Math.min(this.maxSpeed, this.speed + 0.7);
    window.soundCtrl?.playGrind();
  }

  crash() {
    if (this.isCrashing) return;
    this.isCrashing = true;
    this.crashTimer = 45; // ~0.75s stun
    this.speed = 1.0;
    this.isAirborne = false;
    this.isGrinding = false;
    window.soundCtrl?.playCrash();
    if (window.particles) {
      window.particles.spawnPineShatter(this.x, this.y);
    }
  }

  update(targetX, terrainManager) {
    // 1. Steering & carving towards targetX (mouse / finger drag)
    if (!this.isCrashing) {
      const dx = targetX - this.x;
      this.vx = dx * 0.10;
      this.vx = Math.max(-4.2, Math.min(4.2, this.vx));
      this.x += this.vx;

      // Carve angle for boarder tilt
      this.carveAngle = (this.vx / 4.2) * 0.40;

      // Gradually ease back to base cruising speed after powerup surges
      if (this.speed > this.baseSpeed) {
        this.speed -= 0.02;
      } else if (this.speed < this.baseSpeed) {
        this.speed += 0.04;
      }

      // Spawn snow carving spray when carving hard on snow
      if (!this.isAirborne && !this.isGrinding && Math.abs(this.vx) > 1.0 && window.particles) {
        window.particles.spawnSnowSpray(this.x, this.y + 12, Math.sign(this.vx));
        if (Math.random() < 0.15) window.soundCtrl?.playCarveSnow();
      }
    } else {
      // Stunned in crash
      this.crashTimer--;
      this.vx = 0;
      if (this.crashTimer <= 0) {
        this.isCrashing = false;
        this.speed = this.baseSpeed;
      }
    }

    // Keep within slope bounds
    const margin = 26;
    if (this.x < margin) this.x = margin;
    if (this.x > this.canvas.width - margin) this.x = this.canvas.width - margin;

    // 2. Airtime & Trick execution
    if (this.isAirborne) {
      this.airTime++;
      // Complete full 360 spin during airtime
      this.trickRotation = (this.airTime / this.airDuration) * Math.PI * 2;

      if (this.airTime >= this.airDuration) {
        // Successful landing!
        this.isAirborne = false;
        this.trickRotation = 0;
        window.soundCtrl?.playTrick();
        if (window.game) {
          window.game.registerTrick(this.trickType, this.trickScore);
        }
        if (window.particles) {
          window.particles.spawnSnowSpray(this.x - 8, this.y + 12, -1);
          window.particles.spawnSnowSpray(this.x + 8, this.y + 12, 1);
        }
      }
    }

    // 3. Grind decay
    if (this.isGrinding) {
      this.grindTimer--;
      if (window.particles && Math.random() < 0.6) {
        window.particles.spawnGrindSparks(this.x, this.y + 14);
      }
      if (this.grindTimer <= 0) {
        this.isGrinding = false;
      }
    }

    // 4. Collision check with slope obstacles
    for (let it of terrainManager.items) {
      if (it.hit) continue;

      const distY = it.y - this.y;
      const distX = Math.abs(it.x - this.x);

      // Coins
      if (it.type === OBSTACLE_TYPES.COIN && !it.collected) {
        if (Math.hypot(it.x - this.x, it.y - this.y) < 24) {
          it.collected = true;
          window.soundCtrl?.playCoin();
          if (window.particles) window.particles.spawnCoinBurst(it.x, it.y);
          if (window.game) window.game.addCoins(1);
        }
        continue;
      }

      // Ramp interaction (Must hit near top to launch!)
      if (it.type === OBSTACLE_TYPES.RAMP) {
        if (distX < 24 && Math.abs(distY) < 16 && !this.isAirborne) {
          it.hit = true;
          const tricks = ['MEGA BACKFLIP 360', 'INDY AIR 540', 'RODEO FLIP', 'CLIFF VAULT'];
          const randomTrick = tricks[Math.floor(Math.random() * tricks.length)];
          this.jump(48, randomTrick);
        }
        continue;
      }

      // Grind Rail interaction
      if (it.type === OBSTACLE_TYPES.RAIL) {
        if (distX < 14 && distY >= -10 && distY <= it.height && !this.isCrashing) {
          this.startGrind();
        }
        continue;
      }

      // Pine Tree obstacle (Crash unless high in the air!)
      if (it.type === OBSTACLE_TYPES.PINE) {
        if (distX < 20 && Math.abs(distY) < 22) {
          if (!this.isAirborne) {
            it.hit = true;
            this.crash();
          }
        }
      }
    }

    // 5. Yeti Chase dynamics
    // Player easily holds ground during normal riding, and pulls away when hitting ramps or rails!
    this.yetiAnim += 0.15;
    const yetiBaseCatchSpeed = 0.3; // Catch rate tuned to 0.3
    const playerSpeedAdvantage = (this.speed - this.baseSpeed) * 2.2;

    if (this.isCrashing) {
      // Yeti only surges forward when you wipe out into a tree
      this.yetiDist -= 2.2;
    } else {
      // When riding clean, distance remains steady or widens
      this.yetiDist += playerSpeedAdvantage - yetiBaseCatchSpeed;
    }

    // Clamp Yeti distance
    this.yetiDist = Math.max(0, Math.min(this.yetiMaxDist, this.yetiDist));

    // Yeti Roar alert only when getting super close
    if (this.yetiDist < 70 && Math.random() < 0.02) {
      window.soundCtrl?.playYetiRoar();
    }
  }

  draw() {
    const ctx = this.ctx;

    // --- 1. Draw Yeti Chasing Behind ---
    // yetiDist maps to vertical position on screen behind player
    const yetiScreenY = this.y - this.yetiDist;
    if (yetiScreenY > -100 && yetiScreenY < this.canvas.height) {
      ctx.save();
      // Yeti follows player's X with slight lag
      const yetiX = this.x + Math.sin(this.yetiAnim * 0.8) * 25;
      ctx.translate(yetiX, yetiScreenY);

      // Huge Furry Snow Monster (Yeti)
      const bob = Math.sin(this.yetiAnim) * 4;

      // Yeti Shadow
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 32 + bob, 32, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Massive White Fur Body
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(-28, -25 + bob, 56, 52, 16);
      ctx.fill();

      // Fierce Blue Face Plate
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(-16, -18 + bob, 32, 22, 6);
      ctx.fill();

      // Glowing Red Menacing Eyes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-10, -12 + bob, 6, 4);
      ctx.fillRect(4, -12 + bob, 6, 4);

      // Sharp White Fangs
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-8, -4 + bob); ctx.lineTo(-5, 2 + bob); ctx.lineTo(-2, -4 + bob);
      ctx.moveTo(2, -4 + bob); ctx.lineTo(5, 2 + bob); ctx.lineTo(8, -4 + bob);
      ctx.fill();

      // Flailing Yeti Claws
      const clawSwing = Math.sin(this.yetiAnim * 1.5) * 12;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(-34, -4 + clawSwing + bob, 10, 0, Math.PI * 2);
      ctx.arc(34, -4 - clawSwing + bob, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // --- 2. Draw Snowboarder Player ---
    ctx.save();
    ctx.translate(this.x, this.y);

    // Apply rotation for tricks or carving
    if (this.isAirborne) {
      ctx.rotate(this.trickRotation);
      // Elevate boarder scale when airborne
      ctx.scale(1.2, 1.2);
    } else {
      ctx.rotate(this.carveAngle);
    }

    // Snowboard Shadow
    if (!this.isAirborne) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.beginPath();
      ctx.ellipse(2, 14, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Snowboard Deck
    ctx.fillStyle = this.isGrinding ? '#f59e0b' : '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-20, 8, 40, 8, 4);
    ctx.fill();
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-16, 10, 32, 4);

    // Rider Legs / Snow Pants (Navy Blue)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-8, -2, 6, 12);
    ctx.fillRect(2, -2, 6, 12);

    // Winter Down Parka Jacket (Bright Crimson Red)
    ctx.fillStyle = this.isCrashing ? '#ef4444' : '#f43f5e';
    ctx.beginPath();
    ctx.roundRect(-10, -18, 20, 18, 5);
    ctx.fill();

    // Helmet & Beanie (Orange)
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, -23, 7, 0, Math.PI * 2);
    ctx.fill();

    // Snow Goggles (Cyan mirror reflection)
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-5, -25, 10, 4);
    ctx.strokeStyle = '#0369a1';
    ctx.strokeRect(-5, -25, 10, 4);

    ctx.restore();
  }
}

window.Snowboarder = Snowboarder;
