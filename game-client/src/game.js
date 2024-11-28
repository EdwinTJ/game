// src/game.js
import { GridSystem } from "./logic/GridSystem";
import { Wall } from "./classes/Wall";

/**
 * Main Game class that handles the core game loop, rendering, and game state
 * @class Game
 */
class Game {
  /**
   * @param {string} canvasId - ID of the canvas element
   * @param {Object} gameClient - Client instance for multiplayer functionality
   */
  constructor(canvasId, gameClient) {
    // Core rendering properties
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // Game state
    this.players = [];
    this.projectiles = [];
    this.lastTime = 0;
    this.keys = {};
    this.localPlayerIndex = 0;
    this.gameClient = gameClient;

    // Game dimensions
    this.GAME_WIDTH = 1200;
    this.GAME_HEIGHT = 800;

    // Viewport properties
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // Grid System initialization
    this.leftGrid = new GridSystem(
      "left",
      8,
      6,
      this.GAME_WIDTH,
      this.GAME_HEIGHT
    );
    this.rightGrid = new GridSystem(
      "right",
      8,
      6,
      this.GAME_WIDTH,
      this.GAME_HEIGHT
    );

    // Wall generation properties
    this.wallTimer = 0;
    this.wallInterval = 15; // seconds
    this.isWallTimerActive = true;

    this.init();
  }

  /**
   * Updates the game client reference
   * @param {Object} client - New game client instance
   */
  setGameClient(client) {
    this.gameClient = client;
  }

  /**
   * Initializes the game, sets up event listeners and starts the game loop
   */
  init() {
    if (!this.canvas) {
      console.error("Canvas element not found!");
      return;
    }

    // Initialize canvas
    this.canvas.width = this.GAME_WIDTH;
    this.canvas.height = this.GAME_HEIGHT;
    this.resizeCanvas();

    // Event listeners
    window.addEventListener("resize", () => this.resizeCanvas());
    window.addEventListener("keydown", (e) => (this.keys[e.key] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));
    window.addEventListener("keydown", (e) => {
      if (e.key === " " && !e.repeat) {
        const localPlayer = this.players[this.localPlayerIndex];
        if (localPlayer && !localPlayer.isDead) {
          localPlayer.shoot(this.projectiles, this.gameClient);
        }
      }
    });

    // Start game loop
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  /**
   * Handles canvas resizing and scaling to maintain aspect ratio
   */
  resizeCanvas() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // Calculate scale to fit either width or height while maintaining aspect ratio
    const scaleX = containerWidth / this.GAME_WIDTH;
    const scaleY = containerHeight / this.GAME_HEIGHT;
    this.scale = Math.min(scaleX, scaleY) * 0.95;

    // Calculate the scaled dimensions
    const scaledWidth = this.GAME_WIDTH * this.scale;
    const scaledHeight = this.GAME_HEIGHT * this.scale;

    // Update canvas style for scaling
    this.canvas.style.width = `${scaledWidth}px`;
    this.canvas.style.height = `${scaledHeight}px`;
    this.canvas.width = this.GAME_WIDTH;
    this.canvas.height = this.GAME_HEIGHT;

    // Center canvas
    this.offsetX = (containerWidth - scaledWidth) / 2;
    this.offsetY = (containerHeight - scaledHeight) / 2;
    this.canvas.style.position = "absolute";
    this.canvas.style.left = `${this.offsetX}px`;
    this.canvas.style.top = `${this.offsetY}px`;
  }

  /**
   * Checks for collisions between projectiles and players
   */
  checkCollisions() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      this.players.forEach((player, playerIndex) => {
        if (!player.isDead && this.detectCollision(projectile, player)) {
          const isProjectileFromLeft = projectile.direction === 0;
          const isPlayerOnRight = player.side === "right";

          if (
            projectile.color !== player.color &&
            ((isProjectileFromLeft && isPlayerOnRight) ||
              (!isProjectileFromLeft && !isPlayerOnRight))
          ) {
            this.projectiles.splice(i, 1);
            player.takeDamage(20);

            if (playerIndex === this.localPlayerIndex) {
              this.gameClient.sendHealthUpdate(player.health);
            }

            if (player.health <= 0) {
              player.die();
              if (playerIndex === this.localPlayerIndex) {
                this.gameClient.sendPlayerDeath();
              }
            }
          }
        }
      });
    }
  }
  /**
   * Detects collision between a projectile and a player
   */
  detectCollision(projectile, player) {
    if (!projectile.remove) {
      const dx = projectile.x - player.x;
      const dy = projectile.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < player.size / 2 + projectile.size;
    }
    return false;
  }

  //==============================================
  // WALL MANAGEMENT
  //==============================================

  startWallTimer() {
    this.isWallTimerActive = true;
    this.wallTimer = 0;
    console.log("Wall timer started");
  }

  placeRandomWall() {
    if (!this.gameClient || this.gameClient.position !== "left") return;

    const grid = Math.random() < 0.5 ? this.leftGrid : this.rightGrid;
    const randomRow = Math.floor(Math.random() * grid.rows);
    const randomCol = Math.floor(Math.random() * grid.columns);

    const worldPos = grid.getWorldPosition(randomRow, randomCol);
    const dimensions = {
      width: grid.cellWidth * 0.9,
      height: grid.cellHeight * 0.9,
    };

    const wall = new Wall(
      worldPos.x,
      worldPos.y,
      dimensions.width,
      dimensions.height
    );

    const success = grid.placeItem(wall, randomRow, randomCol);

    if (success) {
      this.gameClient.sendWallPlacement(
        grid.side,
        { row: randomRow, col: randomCol },
        dimensions
      );
    }
  }

  updateWallTimer(deltaTime) {
    if (
      !this.isWallTimerActive ||
      !this.gameClient ||
      this.gameClient.position !== "left"
    )
      return;

    this.wallTimer += deltaTime;

    if (this.wallTimer >= this.wallInterval) {
      this.placeRandomWall();
      this.wallTimer = 0;
    }
  }

  //==============================================
  // GAME LOOP & UPDATES
  //==============================================

  update(deltaTime) {
    const localPlayer = this.players[this.localPlayerIndex];
    if (localPlayer) {
      localPlayer.handleInput(this.keys, deltaTime);
    }

    this.players.forEach((player) => {
      player.update(
        deltaTime,
        this.GAME_WIDTH,
        this.GAME_HEIGHT,
        this.leftGrid,
        this.rightGrid
      );
    });

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(deltaTime, this.leftGrid, this.rightGrid);
      if (
        this.projectiles[i].remove ||
        this.projectiles[i].isOffScreen(this.GAME_WIDTH, this.GAME_HEIGHT)
      ) {
        this.projectiles.splice(i, 1);
      }
    }

    this.updateWallTimer(deltaTime);
    this.checkCollisions();
  }

  updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(deltaTime, this.leftGrid, this.rightGrid);

      if (
        projectile.remove ||
        projectile.isOffScreen(this.GAME_WIDTH, this.GAME_HEIGHT)
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      this.players.forEach((player, playerIndex) => {
        if (!player.isDead && this.detectCollision(projectile, player)) {
          const isProjectileFromLeft = projectile.direction === 0;
          const isPlayerOnRight = player.side === "right";

          if (
            projectile.color !== player.color &&
            ((isProjectileFromLeft && isPlayerOnRight) ||
              (!isProjectileFromLeft && !isPlayerOnRight))
          ) {
            this.projectiles.splice(i, 1);
            player.takeDamage(20);

            if (playerIndex === this.localPlayerIndex) {
              this.gameClient.sendHealthUpdate(player.health);
            }

            if (player.health <= 0) {
              player.die();
              if (playerIndex === this.localPlayerIndex) {
                this.gameClient.sendPlayerDeath();
              }
            }
          }
        }
      });
    }
  }

  /**
   * Renders the game state
   */
  draw() {
    // Background
    this.ctx.fillStyle = "#0a0a2a";
    this.ctx.fillRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);

    // Center line with glow
    this.ctx.beginPath();
    this.ctx.setLineDash([5, 15]);
    this.ctx.moveTo(this.GAME_WIDTH / 2, 0);
    this.ctx.lineTo(this.GAME_WIDTH / 2, this.GAME_HEIGHT);
    this.ctx.strokeStyle = "#4a9eff";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Glow effect
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = "#4a9eff";
    this.ctx.stroke();

    // Reset effects
    this.ctx.shadowBlur = 0;
    this.ctx.setLineDash([]);

    // Game objects
    this.leftGrid.draw(this.ctx);
    this.rightGrid.draw(this.ctx);
    this.projectiles.forEach((projectile) => projectile.draw(this.ctx));
    this.players.forEach((player) => player.draw(this.ctx));
  }

  /**
   * Main game loop
   */
  gameLoop(currentTime) {
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }
}

export { Game };
