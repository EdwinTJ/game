const WebSocket = require("ws");
const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: 8080 });

app.use(express.static(path.join(__dirname, "../../game-client")));
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
// Store for active games/rooms
const rooms = new Map();

class GameRoom {
  constructor(id, creator) {
    this.id = id;
    this.players = new Map();
    creator.position = "left";
    this.players.set(creator.id, creator);
    this.maxPlayers = 2;
  }

  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }
    player.position = "right";
    this.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  broadcastTo(message) {
    this.players.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  getPlayerPositions() {
    const positions = {};
    this.players.forEach((player) => {
      positions[player.id] = player.position;
    });
    return positions;
  }
}

wss.on("connection", (ws) => {
  const playerId = uuidv4();

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "create_room":
        const roomId = uuidv4();
        const player = { id: playerId, ws };
        const room = new GameRoom(roomId, player);
        rooms.set(roomId, room);

        ws.send(
          JSON.stringify({
            type: "room_created",
            roomId,
            playerId,
            position: "left",
            isHost: true,
          })
        );
        break;

      case "join_room":
        const targetRoom = rooms.get(data.roomId);
        if (!targetRoom) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room not found",
            })
          );
          return;
        }

        if (targetRoom.isFull()) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Room is full",
            })
          );
          return;
        }

        const joiningPlayer = { id: playerId, ws };
        targetRoom.addPlayer(joiningPlayer);

        // Send join confirmation to the joining player
        ws.send(
          JSON.stringify({
            type: "room_joined",
            roomId: data.roomId,
            playerId,
            position: "right",
            isHost: false,
          })
        );

        // Notify both players that game can start and send positions
        targetRoom.broadcastTo({
          type: "game_start",
          positions: targetRoom.getPlayerPositions(),
          message: "Both players connected",
        });
        break;

      // Broadcast game state to other player
      case "game_update":
        const gameRoom = rooms.get(data.roomId);
        if (gameRoom) {
          gameRoom.broadcastTo({
            type: "game_update",
            playerId,
            position: gameRoom.players.get(playerId).position,
            gameState: data.gameState,
          });
        }
        break;

      case "projectile_created":
        const projectileRoom = rooms.get(data.roomId);
        if (projectileRoom) {
          // Broadcast projectile to all players in the room
          projectileRoom.broadcastTo({
            type: "projectile_created",
            playerId: playerId,
            projectile: data.projectile,
          });
        }
        break;

      case "player_death":
        const deathRoom = rooms.get(data.roomId);
        if (deathRoom) {
          deathRoom.broadcastTo({
            type: "player_death",
            playerId: playerId,
          });
        }
        break;

      case "health_update":
        const healthRoom = rooms.get(data.roomId);
        if (healthRoom) {
          healthRoom.broadcastTo({
            type: "health_update",
            playerId: playerId,
            health: data.health,
          });
        }
        break;
    }
  });

  ws.on("close", () => {
    rooms.forEach((room, roomId) => {
      if (room.players.has(playerId)) {
        room.removePlayer(playerId);
        if (room.players.size === 0) {
          rooms.delete(roomId);
        } else {
          room.broadcastTo({
            type: "player_disconnected",
            playerId,
            message: "Other player disconnected",
          });
        }
      }
    });
  });
});
