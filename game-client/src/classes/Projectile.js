// src/classes/Projectile.js

class Projectile {
  constructor(x, y, direction, color) {
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.color = color;
    this.speed = 500;
    this.size = 5;
    this.remove = false;
  }

  update(deltaTime, leftGrid, rightGrid) {
    const nextX = this.x + Math.cos(this.direction) * this.speed * deltaTime;
    const nextY = this.y + Math.sin(this.direction) * this.speed * deltaTime;

    // Check collision with both grids
    const leftCollision = leftGrid.checkCollision(nextX, nextY, this.size);
    const rightCollision = rightGrid.checkCollision(nextX, nextY, this.size);

    if (leftCollision.collides || rightCollision.collides) {
      this.remove = true;
      return;
    }

    this.x = nextX;
    this.y = nextY;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Add a glowing effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  isOffScreen(width, height) {
    return this.x < 0 || this.x > width || this.y < 0 || this.y > height;
  }
}

export { Projectile };
