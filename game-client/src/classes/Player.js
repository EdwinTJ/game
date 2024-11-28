// src/classes/Player.js
import { Projectile } from "./Projectile";
class Player {
  constructor(x, y, color, side) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = 30;
    this.speed = 300;
    this.side = side;
    this.direction = this.side === "left" ? 0 : Math.PI;
    this.shootCooldown = 0;
    this.health = 100;
    this.isDead = false;
    this.respawnTimer = 0;
  }

  handleInput(keys, deltaTime) {
    if (this.isDead) return;

    // Store current position
    const newX = this.x;
    const newY = this.y;

    // Calculate potential new position
    if (keys["w"] || keys["ArrowUp"]) this.y -= this.speed * deltaTime;
    if (keys["s"] || keys["ArrowDown"]) this.y += this.speed * deltaTime;
    if (keys["a"] || keys["ArrowLeft"]) this.x -= this.speed * deltaTime;
    if (keys["d"] || keys["ArrowRight"]) this.x += this.speed * deltaTime;

    // Keep the direction fixed based on the side
    this.direction = this.side === "left" ? 0 : Math.PI;
  }

  update(deltaTime, canvasWidth, canvasHeight, leftGrid, rightGrid) {
    if (this.isDead) {
      this.respawnTimer -= deltaTime;
      if (this.respawnTimer <= 0) {
        this.respawn();
      }
      return;
    }

    const centerLine = canvasWidth / 2;
    const playerRadius = this.size / 2;

    // Store current position
    const oldX = this.x;
    const oldY = this.y;

    // Check wall collisions with the appropriate grid
    const grid = this.side === "left" ? leftGrid : rightGrid;
    const collision = grid.checkCollision(this.x, this.y, playerRadius);

    if (collision.collides) {
      // Revert to previous position if collision detected
      this.x = oldX;
      this.y = oldY;
    }

    // Center line boundary based on player's side
    if (this.side === "left") {
      if (this.x + playerRadius > centerLine) {
        this.x = centerLine - playerRadius;
      }
    } else {
      if (this.x - playerRadius < centerLine) {
        this.x = centerLine + playerRadius;
      }
    }

    // Keep player within screen bounds
    this.x = Math.max(
      playerRadius,
      Math.min(canvasWidth - playerRadius, this.x)
    );
    this.y = Math.max(
      playerRadius,
      Math.min(canvasHeight - playerRadius, this.y)
    );

    // Update shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
  }
  shoot(projectiles, gameClient = null) {
    if (this.isDead) return;

    if (this.shootCooldown <= 0) {
      const projectile = new Projectile(
        this.x + Math.cos(this.direction) * (this.size / 2), // Spawn projectile at edge of player
        this.y + Math.sin(this.direction) * (this.size / 2),
        this.direction,
        this.color
      );
      projectiles.push(projectile);
      this.shootCooldown = 0.25;
      if (gameClient) {
        gameClient.sendProjectile(projectile);
      }
    }
  }

  takeDamage(amount) {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.respawnTimer = 3; // 3 seconds respawn time
  }

  respawn() {
    this.isDead = false;
    this.health = 100;
    // Reset position based on side
    this.x = this.side === "left" ? 100 : window.innerWidth - 100;
    this.y = window.innerHeight / 2;
  }

  draw(ctx) {
    if (this.isDead) {
      // Draw respawn timer
      ctx.fillStyle = "#ff0000";
      ctx.font = "20px Arial";
      ctx.fillText(
        `Respawning in ${Math.ceil(this.respawnTimer)}...`,
        this.x - 50,
        this.y - 50
      );
      return;
    }

    // Draw player body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw direction indicator
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.direction) * this.size,
      this.y + Math.sin(this.direction) * this.size
    );
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw health bar
    this.drawHealthBar(ctx);
  }

  drawHealthBar(ctx) {
    const barWidth = 50;
    const barHeight = 5;
    const xPos = this.x - barWidth / 2;
    const yPos = this.y - this.size - 10;

    // Draw background (empty health bar)
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(xPos, yPos, barWidth, barHeight);

    // Draw current health
    ctx.fillStyle = "#00ff00";
    ctx.fillRect(xPos, yPos, barWidth * (this.health / 100), barHeight);
  }
}

export { Player };
