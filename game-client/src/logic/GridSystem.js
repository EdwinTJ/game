// src/GridSystem.js

export class GridSystem {
  constructor(side, columns, rows, gameWidth, gameHeight) {
    this.side = side; // "left" or "right"
    this.columns = columns;
    this.rows = rows;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;

    // Calculate cell dimensions
    this.cellWidth = gameWidth / 2 / columns;
    this.cellHeight = gameHeight / rows;

    // Initialize empty grid
    this.grid = Array(rows)
      .fill()
      .map(() => Array(columns).fill(null));

    // Calculate offset based on side
    this.offsetX = side === "left" ? 0 : gameWidth / 2;
  }

  // Convert game coordinates to grid cell
  getGridPosition(x, y) {
    const relativeX = x - this.offsetX;
    const column = Math.floor(relativeX / this.cellWidth);
    const row = Math.floor(y / this.cellHeight);
    return { row, column };
  }

  // Convert grid cell to game coordinates (returns center of cell)
  getWorldPosition(row, column) {
    return {
      x: this.offsetX + column * this.cellWidth + this.cellWidth / 2,
      y: row * this.cellHeight + this.cellHeight / 2,
    };
  }

  // Place an item in the grid
  placeItem(item, row, column) {
    if (this.isValidPosition(row, column) && this.grid[row][column] === null) {
      this.grid[row][column] = item;
      const pos = this.getWorldPosition(row, column);
      item.x = pos.x;
      item.y = pos.y;
      return true;
    }
    return false;
  }

  // Remove an item from the grid
  removeItem(row, column) {
    if (this.isValidPosition(row, column)) {
      const item = this.grid[row][column];
      this.grid[row][column] = null;
      return item;
    }
    return null;
  }

  // Check if position is valid
  isValidPosition(row, column) {
    return row >= 0 && row < this.rows && column >= 0 && column < this.columns;
  }

  // Get item at position
  getItem(row, column) {
    if (this.isValidPosition(row, column)) {
      return this.grid[row][column];
    }
    return null;
  }

  // Draw the grid
  draw(ctx) {
    ctx.strokeStyle = "#4a9eff33"; // Semi-transparent blue
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let i = 0; i <= this.columns; i++) {
      ctx.beginPath();
      const x = this.offsetX + i * this.cellWidth;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.gameHeight);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let i = 0; i <= this.rows; i++) {
      ctx.beginPath();
      const y = i * this.cellHeight;
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + this.gameWidth / 2, y);
      ctx.stroke();
    }

    // Draw items
    this.grid.forEach((row, rowIndex) => {
      row.forEach((item, colIndex) => {
        if (item) {
          item.draw(ctx);
        }
      });
    });
  }

  // Serialize grid state for network transmission
  serializeGrid() {
    const gridState = [];
    this.grid.forEach((row, rowIndex) => {
      gridState[rowIndex] = [];
      row.forEach((item, colIndex) => {
        if (item) {
          gridState[rowIndex][colIndex] = {
            type: "wall",
            width: item.width,
            height: item.height,
          };
        } else {
          gridState[rowIndex][colIndex] = null;
        }
      });
    });
    return gridState;
  }

  // Apply received grid state
  applyGridState(gridState) {
    gridState.forEach((row, rowIndex) => {
      row.forEach((item, colIndex) => {
        if (item && item.type === "wall") {
          const wall = new Wall(0, 0, item.width, item.height);
          this.placeItem(wall, rowIndex, colIndex);
        }
      });
    });
  }

  checkCollision(x, y, radius) {
    const gridPos = this.getGridPosition(x, y);

    // Check surrounding cells for walls
    for (
      let row = Math.max(0, gridPos.row - 1);
      row <= Math.min(this.rows - 1, gridPos.row + 1);
      row++
    ) {
      for (
        let col = Math.max(0, gridPos.column - 1);
        col <= Math.min(this.columns - 1, gridPos.column + 1);
        col++
      ) {
        const wall = this.grid[row][col];
        if (wall) {
          // Check collision with wall
          const wallLeft = wall.x - wall.width / 2;
          const wallRight = wall.x + wall.width / 2;
          const wallTop = wall.y - wall.height / 2;
          const wallBottom = wall.y + wall.height / 2;

          // Circle-rectangle collision detection
          const closestX = Math.max(wallLeft, Math.min(x, wallRight));
          const closestY = Math.max(wallTop, Math.min(y, wallBottom));

          const distanceX = x - closestX;
          const distanceY = y - closestY;
          const distanceSquared = distanceX * distanceX + distanceY * distanceY;

          if (distanceSquared < radius * radius) {
            return { collides: true, wall: wall };
          }
        }
      }
    }
    return { collides: false, wall: null };
  }

  // Check if a line segment intersects with any wall (for projectiles)
  checkLineCollision(x1, y1, x2, y2) {
    const gridPos1 = this.getGridPosition(x1, y1);
    const gridPos2 = this.getGridPosition(x2, y2);

    const minRow = Math.max(0, Math.min(gridPos1.row, gridPos2.row) - 1);
    const maxRow = Math.min(
      this.rows - 1,
      Math.max(gridPos1.row, gridPos2.row) + 1
    );
    const minCol = Math.max(0, Math.min(gridPos1.column, gridPos2.column) - 1);
    const maxCol = Math.min(
      this.columns - 1,
      Math.max(gridPos1.column, gridPos2.column) + 1
    );

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const wall = this.grid[row][col];
        if (wall) {
          if (
            this.lineIntersectsRectangle(
              x1,
              y1,
              x2,
              y2,
              wall.x - wall.width / 2,
              wall.y - wall.height / 2,
              wall.width,
              wall.height
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Helper method to check line-rectangle intersection
  lineIntersectsRectangle(x1, y1, x2, y2, rectX, rectY, rectWidth, rectHeight) {
    // Check if line intersects with any of the rectangle's edges
    return (
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rectX,
        rectY,
        rectX + rectWidth,
        rectY
      ) ||
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rectX + rectWidth,
        rectY,
        rectX + rectWidth,
        rectY + rectHeight
      ) ||
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rectX + rectWidth,
        rectY + rectHeight,
        rectX,
        rectY + rectHeight
      ) ||
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rectX,
        rectY + rectHeight,
        rectX,
        rectY
      )
    );
  }

  // Helper method to check line-line intersection
  lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (denominator === 0) return false;

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}
