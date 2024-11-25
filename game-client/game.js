class Game {
  constructor(canvasId, gameClient) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.players = [];
    this.projectiles = [];
    this.lastTime = 0;
    this.keys = {};
    this.localPlayerIndex = 0;
    this.gameClient = gameClient;
    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Add keyboard event listeners
    window.addEventListener("keydown", (e) => (this.keys[e.key] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));

    // Space bar for shooting
    window.addEventListener("keydown", (e) => {
      if (e.key === " " && !e.repeat) {
        const localPlayer = this.players[this.localPlayerIndex];
        if (localPlayer) {
          localPlayer.shoot(this.projectiles, this.gameClient);
        }
      }
    });

    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  update(deltaTime) {
    // Update local player only
    const localPlayer = this.players[this.localPlayerIndex];
    if (localPlayer) {
      localPlayer.handleInput(this.keys, deltaTime);
      localPlayer.update(deltaTime, this.canvas.width);
    }
    // Update other players without input
    this.players.forEach((player, index) => {
      if (index !== this.localPlayerIndex) {
        player.update(deltaTime, this.canvas.width);
      }
    });

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(deltaTime);

      if (
        this.projectiles[i].isOffScreen(this.canvas.width, this.canvas.height)
      ) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw center line
    this.ctx.beginPath();
    this.ctx.setLineDash([5, 15]);
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw projectiles
    this.projectiles.forEach((projectile) => projectile.draw(this.ctx));

    // Draw players
    this.players.forEach((player) => player.draw(this.ctx));
  }

  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
}

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
  }

  handleInput(keys, deltaTime) {
    // Movement
    if (keys["w"] || keys["ArrowUp"]) this.y -= this.speed * deltaTime;
    if (keys["s"] || keys["ArrowDown"]) this.y += this.speed * deltaTime;
    if (keys["a"] || keys["ArrowLeft"]) this.x -= this.speed * deltaTime;
    if (keys["d"] || keys["ArrowRight"]) this.x += this.speed * deltaTime;

    // Keep the direction fixed based on the side
    this.direction = this.side === "left" ? 0 : Math.PI;
  }

  update(deltaTime, canvasWidth) {
    const centerLine = canvasWidth / 2;
    const playerRadius = this.size / 2;

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
      Math.min(window.innerHeight - playerRadius, this.y)
    );

    // Update shooting cooldown
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime;
    }
  }

  shoot(projectiles, gameClient = null) {
    if (this.shootCooldown <= 0) {
      const projectile = new Projectile(
        this.x,
        this.y,
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

  draw(ctx) {
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
  }
}

class Projectile {
  constructor(x, y, direction, color) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.color = color;
    this.speed = 500;
    this.size = 5;
  }

  update(deltaTime) {
    this.x += Math.cos(this.direction) * this.speed * deltaTime;
    this.y += Math.sin(this.direction) * this.speed * deltaTime;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isOffScreen(width, height) {
    return this.x < 0 || this.x > width || this.y < 0 || this.y > height;
  }
}
