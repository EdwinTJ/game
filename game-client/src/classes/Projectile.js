// src/classes/Projectile.js
export { Projectile };

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
