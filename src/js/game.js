// Directions: 0 = up, 1 = right, 2 = down, 3 = left
const DIR_UP = 0;
const DIR_RIGHT = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 3;

function rotateConnections(conns, times = 1) {
  return conns.map((c) => (c + times) % 4);
}

function charToTile(ch, row, col) {
  switch (ch) {
    case "S":
      return {
        type: "SOURCE",
        baseConnections: [DIR_UP, DIR_DOWN],
        rotation: 0,
        row,
        col,
      };
    case "T":
      return {
        type: "TARGET",
        baseConnections: [DIR_UP, DIR_DOWN],
        rotation: 0,
        row,
        col,
      };
    case "|":
      return {
        type: "STRAIGHT",
        baseConnections: [DIR_UP, DIR_DOWN],
        rotation: randomRotation(),
        row,
        col,
      };
    case "-":
      return {
        type: "STRAIGHT",
        baseConnections: [DIR_LEFT, DIR_RIGHT],
        rotation: randomRotation(),
        row,
        col,
      };
    case "L": // up-right
      return {
        type: "CORNER",
        baseConnections: [DIR_UP, DIR_RIGHT],
        rotation: randomRotation(),
        row,
        col,
      };
    case "R": // right-down
      return {
        type: "CORNER",
        baseConnections: [DIR_RIGHT, DIR_DOWN],
        rotation: randomRotation(),
        row,
        col,
      };
    case "J": // down-left
      return {
        type: "CORNER",
        baseConnections: [DIR_DOWN, DIR_LEFT],
        rotation: randomRotation(),
        row,
        col,
      };
    case "7": // left-up
      return {
        type: "CORNER",
        baseConnections: [DIR_LEFT, DIR_UP],
        rotation: randomRotation(),
        row,
        col,
      };
    default:
      return {
        type: "EMPTY",
        baseConnections: [],
        rotation: 0,
        row,
        col,
      };
  }
}

function randomRotation() {
  return Math.floor(Math.random() * 4);
}

function oppositeDir(dir) {
  return (dir + 2) % 4;
}

function neighborsOf(row, col) {
  return [
    { dir: DIR_UP, row: row - 1, col },
    { dir: DIR_RIGHT, row, col: col + 1 },
    { dir: DIR_DOWN, row: row + 1, col },
    { dir: DIR_LEFT, row, col: col - 1 },
  ];
}

/* ===== GAME STATE ===== */

const GameState = {
  currentLevelIndex: 0,
  grid: [],
  gridSize: 0,
  moves: 0,
  timeStartMs: 0,
  timerId: null,
  hasWon: false,
  dom: {},
};

/* ===== GAME INITIALISATION ===== */

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  bindEvents();
  loadLevel(0);
});

function cacheDom() {
  GameState.dom.grid = document.getElementById("grid");
  GameState.dom.levelName = document.getElementById("level");
  GameState.dom.statusText = document.getElementById("status");
  GameState.dom.movesValue = document.getElementById("moves");
  GameState.dom.timeValue = document.getElementById("time");
  GameState.dom.resetBtn = document.getElementById("resetBtn");
  GameState.dom.prevLevelBtn = document.getElementById("prevLevelBtn");
  GameState.dom.nextLevelBtn = document.getElementById("nextLevelBtn");
}

function bindEvents() {
  GameState.dom.resetBtn.addEventListener("click", () => {
    shuffleCurrentLevel();
  });

  GameState.dom.prevLevelBtn.addEventListener("click", () => {
    if (GameState.currentLevelIndex > 0) {
      loadLevel(GameState.currentLevelIndex - 1);
    }
  });

  GameState.dom.nextLevelBtn.addEventListener("click", () => {
    if (GameState.currentLevelIndex < LEVELS.length - 1) {
      loadLevel(GameState.currentLevelIndex + 1);
    }
  });
}

function loadLevel(index) {
  clearTimer();

  const level = LEVELS[index];
  GameState.currentLevelIndex = index;
  GameState.gridSize = level.size;
  GameState.moves = 0;
  GameState.hasWon = false;

  GameState.dom.grid.classList.remove("win");
  GameState.dom.levelName.textContent = `Level ${level.id}: ${level.name}`;
  GameState.dom.movesValue.textContent = "0";
  GameState.dom.statusText.innerHTML =
    "Connect <strong>GREEN</strong> to <strong>PINK</strong>.";
  GameState.dom.timeValue.textContent = "0.0s";

  GameState.dom.prevLevelBtn.disabled = index === 0;
  GameState.dom.nextLevelBtn.disabled = index === LEVELS.length - 1;

  buildGridFromLayout(level.layout, level.size);
  renderGrid();
  highlightPath();

  startTimer();
}

function buildGridFromLayout(layout, size) {
  const grid = [];
  for (let row = 0; row < size; row++) {
    const rowArr = [];
    const line = layout[row] || "";
    for (let col = 0; col < size; col++) {
      const ch = line[col] || ".";
      const tile = charToTile(ch, row, col);
      rowArr.push(tile);
    }
    grid.push(rowArr);
  }
  GameState.grid = grid;
}

/* ===== GAME RENDER ===== */

function renderGrid() {
  const gridEl = GameState.dom.grid;
  const size = GameState.gridSize;

  gridEl.innerHTML = "";
  gridEl.style.gridTemplateColumns = `repeat(${size}, 64px)`;
  gridEl.style.gridTemplateRows = `repeat(${size}, 64px)`;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const tile = GameState.grid[row][col];
      const tileEl = document.createElement("div");

      tileEl.classList.add("tile");
      tileEl.dataset.row = row;
      tileEl.dataset.col = col;

      if (tile.type === "EMPTY") {
        tileEl.classList.add("empty");
      }

      const inner = document.createElement("div");
      inner.classList.add("tile-inner");

      if (tile.type === "SOURCE") {
        tileEl.classList.add("tile-source");
      } else if (tile.type === "TARGET") {
        tileEl.classList.add("tile-target");
      }

      const effectiveConns = getEffectiveConnections(tile);
      effectiveConns.forEach((dir) => {
        const conn = document.createElement("div");
        conn.classList.add("conn");
        if (dir === DIR_UP) conn.classList.add("up");
        if (dir === DIR_RIGHT) conn.classList.add("right");
        if (dir === DIR_DOWN) conn.classList.add("down");
        if (dir === DIR_LEFT) conn.classList.add("left");
        inner.appendChild(conn);
      });

      tileEl.appendChild(inner);
      gridEl.appendChild(tileEl);

      tileEl.addEventListener("click", () => onTileClick(tile));
    }
  }
}

function getEffectiveConnections(tile) {
  return rotateConnections(tile.baseConnections, tile.rotation);
}

/* ===== GAME INTERACTION ===== */

function onTileClick(tile) {
  if (GameState.hasWon) return;
  if (tile.type === "EMPTY" || tile.type === "SOURCE" || tile.type === "TARGET")
    return;

  tile.rotation = (tile.rotation + 1) % 4;
  GameState.moves++;
  GameState.dom.movesValue.textContent = String(GameState.moves);

  renderGrid();
  const hasPath = highlightPath();

  if (hasPath) {
    onWin();
  } else {
    GameState.dom.statusText.innerHTML =
      "Connect <strong>GREEN</strong> to <strong>PINK</strong>.";
  }
}

/* ===== PATH CHECKING ===== */

function findSourceAndTarget() {
  let source = null;
  let target = null;

  for (let row = 0; row < GameState.gridSize; row++) {
    for (let col = 0; col < GameState.gridSize; col++) {
      const tile = GameState.grid[row][col];
      if (tile.type === "SOURCE") source = tile;
      if (tile.type === "TARGET") target = tile;
    }
  }
  return { source, target };
}

function highlightPath() {
  const gridEl = GameState.dom.grid;
  gridEl.classList.remove("win");

  const tileEls = gridEl.querySelectorAll(".tile");
  tileEls.forEach((el) => el.classList.remove("path"));

  const { source, target } = findSourceAndTarget();
  if (!source || !target) return false;

  const visited = new Set();
  const parent = new Map();
  const queue = [];

  const key = (t) => `${t.row},${t.col}`;

  queue.push(source);
  visited.add(key(source));

  let found = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === target) {
      found = true;
      break;
    }

    const conns = getEffectiveConnections(current);
    const neighs = neighborsOf(current.row, current.col);

    for (const n of neighs) {
      if (!conns.includes(n.dir)) continue;

      if (
        n.row < 0 ||
        n.row >= GameState.gridSize ||
        n.col < 0 ||
        n.col >= GameState.gridSize
      ) {
        continue;
      }

      const neighborTile = GameState.grid[n.row][n.col];
      const neighborConns = getEffectiveConnections(neighborTile);

      if (!neighborConns.includes(oppositeDir(n.dir))) continue;

      const neighborKey = key(neighborTile);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        parent.set(neighborKey, key(current));
        queue.push(neighborTile);
      }
    }
  }

  if (!found) return false;

  // Reconstruct path from target back to source
  let currentKey = key(target);
  while (currentKey) {
    const [r, c] = currentKey.split(",").map(Number);
    const tileEl = GameState.dom.grid.querySelector(
      `.tile[data-row="${r}"][data-col="${c}"]`
    );
    if (tileEl) tileEl.classList.add("path");
    currentKey = parent.get(currentKey);
  }

  return true;
}

/* ===== WIN / RESET / TIMER ===== */

function onWin() {
  GameState.hasWon = true;
  clearTimer();

  GameState.dom.grid.classList.add("win");
  GameState.dom.statusText.innerHTML = "<strong>ACCESS GRANTED</strong>.";

  const level = LEVELS[GameState.currentLevelIndex];
  if (level.parMoves && GameState.moves <= level.parMoves) {
    GameState.dom.statusText.innerHTML +=
      " <span style='color:#5cff6a'>Par cleared!</span>";
  } else if (level.parMoves) {
    GameState.dom.statusText.innerHTML += ` <span style='color:#9fb7d4'>(Par: ${level.parMoves})</span>`;
  }
}

function shuffleCurrentLevel() {
  const level = LEVELS[GameState.currentLevelIndex];
  buildGridFromLayout(level.layout, level.size);

  // Randomize rotations only for non-empty, non-source/target tiles
  for (let row = 0; row < GameState.gridSize; row++) {
    for (let col = 0; col < GameState.gridSize; col++) {
      const tile = GameState.grid[row][col];
      if (
        tile.type !== "EMPTY" &&
        tile.type !== "SOURCE" &&
        tile.type !== "TARGET"
      ) {
        tile.rotation = randomRotation();
      }
    }
  }

  GameState.moves = 0;
  GameState.dom.movesValue.textContent = "0";
  GameState.hasWon = false;
  GameState.dom.grid.classList.remove("win");
  GameState.dom.statusText.innerHTML =
    "Connect <strong>GREEN</strong> to <strong>PINK</strong>.";

  clearTimer();
  GameState.dom.timeValue.textContent = "0.0s";
  startTimer();

  renderGrid();
  highlightPath();
}

function startTimer() {
  GameState.timeStartMs = performance.now();
  GameState.timerId = requestAnimationFrame(updateTimer);
}

function updateTimer() {
  if (GameState.hasWon) return;

  const now = performance.now();
  const elapsed = (now - GameState.timeStartMs) / 1000;
  GameState.dom.timeValue.textContent = `${elapsed.toFixed(1)}s`;
  GameState.timerId = requestAnimationFrame(updateTimer);
}

function clearTimer() {
  if (GameState.timerId !== null) {
    cancelAnimationFrame(GameState.timerId);
    GameState.timerId = null;
  }
}
