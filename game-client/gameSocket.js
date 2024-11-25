class GameClient {
  constructor(game) {
    this.socket = null;
    this.connected = false;
    this.game = game;
    this.roomId = null;
    this.playerId = null;
    this.position = null;
    this.init();
  }

  init() {
    this.createUI();
    this.connect();
  }

  createUI() {
    const ui = document.createElement("div");
    ui.style.position = "fixed";
    ui.style.top = "20px";
    ui.style.left = "20px";
    ui.style.zIndex = "1000";
    ui.style.color = "white";
    ui.style.fontFamily = "Arial, sans-serif";
    ui.style.padding = "20px";
    ui.style.background = "rgba(0, 0, 0, 0.7)";
    ui.style.borderRadius = "5px";

    const createButton = document.createElement("button");
    createButton.textContent = "Create Room";
    createButton.onclick = () => this.createRoom();

    const joinDiv = document.createElement("div");
    joinDiv.style.marginTop = "10px";

    const roomInput = document.createElement("input");
    roomInput.placeholder = "Room ID";
    roomInput.style.marginRight = "10px";

    const joinButton = document.createElement("button");
    joinButton.textContent = "Join Room";
    joinButton.onclick = () => this.joinRoom(roomInput.value);

    this.roomInfo = document.createElement("div");
    this.roomInfo.style.marginTop = "10px";

    joinDiv.appendChild(roomInput);
    joinDiv.appendChild(joinButton);
    ui.appendChild(createButton);
    ui.appendChild(joinDiv);
    ui.appendChild(this.roomInfo);

    document.body.appendChild(ui);
  }

  connect() {
    this.socket = new WebSocket("ws://localhost:8080");

    this.socket.onopen = () => {
      console.log("Connected to game server");
      this.connected = true;
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.socket.onclose = () => {
      console.log("Disconnected from server");
      this.connected = false;
      this.roomInfo.textContent = "Disconnected from server";
    };
  }

  handleMessage(data) {
    switch (data.type) {
      case "room_created":
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.position = data.position;
        this.roomInfo.textContent = `Room created! ID: ${this.roomId}`;
        // Create only left player, waiting for opponent
        this.game.players = [];
        this.game.players.push(
          new Player(100, window.innerHeight / 2, "red", "left")
        );
        this.game.localPlayerIndex = 0;
        break;

      case "room_joined":
        this.roomId = data.roomId;
        this.playerId = data.playerId;
        this.position = data.position;
        this.roomInfo.textContent = `Joined room: ${this.roomId}`;
        // Create only right player, left player exists
        this.game.players = [];
        this.game.players.push(
          new Player(
            window.innerWidth - 100,
            window.innerHeight / 2,
            "blue",
            "right"
          )
        );
        this.game.localPlayerIndex = 0;
        break;

      case "game_start":
        this.roomInfo.textContent += " - Game Started!";
        if (this.position === "left") {
          // Left player adds right player
          this.game.players.push(
            new Player(
              window.innerWidth - 100,
              window.innerHeight / 2,
              "blue",
              "right"
            )
          );
        } else {
          // Right player adds left player
          this.game.players.unshift(
            new Player(100, window.innerHeight / 2, "red", "left")
          );
        }
        break;

      case "game_update":
        if (data.playerId !== this.playerId) {
          this.updateOpponentState(data);
        }
        break;

      case "player_disconnected":
        this.roomInfo.textContent = "Other player disconnected";
        // Remove opponent's player object
        if (this.position === "left") {
          this.game.players.pop();
        } else {
          this.game.players.shift();
        }
        break;

      case "error":
        alert(data.message);
        break;
    }
  }

  createRoom() {
    if (this.connected) {
      this.send({ type: "create_room" });
    }
  }

  joinRoom(roomId) {
    if (this.connected && roomId) {
      this.send({ type: "join_room", roomId });
    }
  }

  updateOpponentState(data) {
    const opponentIndex = this.position === "left" ? 1 : 0;
    const opponent = this.game.players[opponentIndex];
    if (opponent) {
      // Only update position, keep direction fixed based on side
      opponent.x = data.gameState.x;
      opponent.y = data.gameState.y;
    }
  }

  send(message) {
    if (this.connected) {
      this.socket.send(JSON.stringify(message));
    }
  }

  sendGameState() {
    if (this.connected && this.roomId) {
      const playerIndex = this.position === "left" ? 0 : 0;
      const player = this.game.players[playerIndex];
      if (player) {
        this.send({
          type: "game_update",
          roomId: this.roomId,
          gameState: {
            x: player.x,
            y: player.y,
            direction: player.direction,
          },
        });
      }
    }
  }
}
