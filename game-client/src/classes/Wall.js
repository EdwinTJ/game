// src/classes/Wall.js

export class Wall {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = "#4a9eff";
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "#ffffff33";
    ctx.lineWidth = 2;

    // Add glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    ctx.fillRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );
    ctx.strokeRect(
      this.x - this.width / 2,
      this.y - this.height / 2,
      this.width,
      this.height
    );

    // Reset shadow
    ctx.shadowBlur = 0;
  }
}
