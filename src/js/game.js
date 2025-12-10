// DOM HOOKS 
const gridElement = document.getElementById("grid");
const movesLabel = document.getElementById("movesLabel");
const levelLabel = document.getElementById("levelLabel");
const patternIndexLabel = document.getElementById("patternIndex");
const timerDisplay = document.getElementById("timerDisplay");
const difficultyLabel = document.getElementById("difficultyLabel");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const restartBtn = document.getElementById("restartBtn");

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const startBtn = document.getElementById("startBtn");
const gridWrapper = document.querySelector(".grid-wrapper");

const howToBtn = document.getElementById("howToBtn");
const settingsBtn = document.getElementById("settingsBtn");
const howToModal = document.getElementById("howToModal");
const settingsModal = document.getElementById("settingsModal");
const closeHowToBtn = document.getElementById("closeHowToBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");

// CONSTANTS
const GRID_SIZE = 5;
const BASE_TIME = 60;

// direction bits
const DIR = {
  UP: 1,
  RIGHT: 2,
  DOWN: 4,
  LEFT: 8
};

const ALL_DIRS = [
  { bit: DIR.UP,    dr: -1, dc:  0, opposite: DIR.DOWN },
  { bit: DIR.RIGHT, dr:  0, dc:  1, opposite: DIR.LEFT },
  { bit: DIR.DOWN,  dr:  1, dc:  0, opposite: DIR.UP },
  { bit: DIR.LEFT,  dr:  0, dc: -1, opposite: DIR.RIGHT }
];

let tiles = [];
let patternIndex = 0;
let moves = 0;
let timer = null;
let timeRemaining = BASE_TIME;
let hasStarted = false;
let isSolved = false;

// LEVEL DATA
const pattern = [
  {
    name: "01 · Linked Towers",
    difficulty: "easy",
    time: 60,
    start: 1,
    end: 23,

    tiles: {
      1:  DIR.DOWN,
      6:  DIR.UP | DIR.DOWN,
      11: DIR.UP | DIR.RIGHT,
      12: DIR.LEFT | DIR.RIGHT,
      13: DIR.LEFT | DIR.DOWN,
      18: DIR.UP | DIR.DOWN,
      23: DIR.UP
    },
    locked: [1, 23]
  },

  {
    name: "02 · Tall Zig",
    difficulty: "easy",
    time: 55,
    start: 0,
    end: 22,

    tiles: {
      0:  DIR.DOWN,
      5:  DIR.UP | DIR.DOWN,
      10: DIR.UP | DIR.RIGHT,
      11: DIR.LEFT | DIR.RIGHT,
      12: DIR.LEFT | DIR.DOWN,
      17: DIR.UP | DIR.DOWN,
      22: DIR.UP
    },
    locked: [0, 22]
  },

  {
    name: "03 · Diagonal Sweep",
    difficulty: "medium",
    time: 50,
    start: 0,
    end: 24,

    tiles: {
      0:  DIR.RIGHT,
      1:  DIR.LEFT | DIR.RIGHT,
      2:  DIR.LEFT | DIR.DOWN,
      7:  DIR.UP | DIR.DOWN,
      12: DIR.UP | DIR.DOWN,
      17: DIR.UP | DIR.DOWN,
      22: DIR.UP | DIR.RIGHT,
      23: DIR.LEFT | DIR.RIGHT,
      24: DIR.LEFT
    },
    locked: [0, 24]
  },

  {
    name: "04 · Frame Tail",
    difficulty: "hard",
    time: 55,
    start: 1,
    end: 6,

    tiles: {
      1:  DIR.RIGHT,
      2:  DIR.LEFT | DIR.RIGHT,
      3:  DIR.LEFT | DIR.RIGHT,
      4:  DIR.LEFT | DIR.DOWN,

      9:  DIR.UP | DIR.DOWN,
      14: DIR.UP | DIR.DOWN,
      19: DIR.UP | DIR.DOWN,

      24: DIR.UP | DIR.LEFT,
      23: DIR.RIGHT | DIR.LEFT,
      22: DIR.RIGHT | DIR.LEFT,
      21: DIR.RIGHT | DIR.UP,

      16: DIR.DOWN | DIR.UP,
      11: DIR.DOWN | DIR.UP,
      6:  DIR.DOWN
    },
    locked: [1, 6]
  }
];

// GAME HELPERS 
function idxToRC(i) {
  return [Math.floor(i / GRID_SIZE), i % GRID_SIZE];
}

// rotate bitmask 90° clockwise "steps" times
function rotateMask(mask, steps) {
  steps = ((steps % 4) + 4) % 4;
  let m = mask;
  for (let s = 0; s < steps; s++) {
    const up    = (m & DIR.UP)    ? DIR.RIGHT : 0;
    const right = (m & DIR.RIGHT) ? DIR.DOWN  : 0;
    const down  = (m & DIR.DOWN)  ? DIR.LEFT  : 0;
    const left  = (m & DIR.LEFT)  ? DIR.UP    : 0;
    m = up | right | down | left;
  }
  return m;
}

// Is this mask a corner (curve) piece?
function isCurve(mask) {
  return (
    mask === (DIR.UP | DIR.RIGHT)  ||
    mask === (DIR.RIGHT | DIR.DOWN)||
    mask === (DIR.DOWN | DIR.LEFT) ||
    mask === (DIR.LEFT | DIR.UP)
  );
}

// Render straight vs curve for a tile based on its current mask
function renderTile(tile) {
  const m = tile.mask;

  // Hide both by default
  tile.straight.style.display = "none";
  tile.curve.style.display = "none";

  if (!m) return;

  if (isCurve(m)) {
    tile.curve.style.display = "block";

    if (m === (DIR.UP | DIR.RIGHT)) {
      tile.curve.style.transform = "translate(-50%, -50%) rotate(0deg)";
    } else if (m === (DIR.RIGHT | DIR.DOWN)) {
      tile.curve.style.transform = "translate(-50%, -50%) rotate(90deg)";
    } else if (m === (DIR.DOWN | DIR.LEFT)) {
      tile.curve.style.transform = "translate(-50%, -50%) rotate(180deg)";
    } else if (m === (DIR.LEFT | DIR.UP)) {
      tile.curve.style.transform = "translate(-50%, -50%) rotate(270deg)";
    }
  } else {
    // straight: vertical or horizontal
    tile.straight.style.display = "block";

    if (m === (DIR.UP | DIR.DOWN)) {
      tile.straight.style.transform = "translate(-50%, -50%) rotate(0deg)";
    } else if (m === (DIR.LEFT | DIR.RIGHT)) {
      tile.straight.style.transform = "translate(-50%, -50%) rotate(90deg)";
    } else {
      // any other weird mask – hide (safety)
      tile.straight.style.display = "none";
    }
  }
}

// GRID CREATION
function createGrid() {
  gridElement.innerHTML = "";
  tiles = [];

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const tileEl = document.createElement("button");
    tileEl.type = "button";
    tileEl.className = "tile inactive";

    const ring = document.createElement("div");
    ring.className = "tile-ring";

    const straight = document.createElement("div");
    straight.className = "pipe-straight";

    const curve = document.createElement("div");
    curve.className = "pipe-curve";

    tileEl.appendChild(ring);
    tileEl.appendChild(straight);
    tileEl.appendChild(curve);
    gridElement.appendChild(tileEl);

    const tile = {
      index: i,
      element: tileEl,
      ring,
      straight,
      curve,
      baseMask: 0,
      mask: 0,
      rotStep: 0,
      movable: false,
      isEndpoint: false
    };

    tileEl.addEventListener("click", () => onTileClick(tile));

    tiles.push(tile);
  }
}

// GAME THEME / HUD 
function applyTheme(pattern) {
  document.body.classList.remove("theme-easy", "theme-medium", "theme-hard");
  document.body.classList.add(`theme-${pattern.difficulty}`);

  difficultyLabel.textContent =
    pattern.difficulty.charAt(0).toUpperCase() + pattern.difficulty.slice(1);
}

// APPLY PATTERN
function applyPattern(startTimer = true) {
  const pattern = patterns[patternIndex];

  patternIndexLabel.textContent = String(patternIndex + 1).padStart(2, "0");
  levelLabel.textContent = pattern.name;
  applyTheme(pattern);

  const lockedSet = new Set(pattern.locked || []);

  isSolved = false;
  nextBtn.disabled = true;

  // reset tiles
  tiles.forEach((tile) => {
    tile.baseMask = 0;
    tile.mask = 0;
    tile.rotStep = 0;
    tile.movable = false;
    tile.isEndpoint = false;
    tile.element.className = "tile inactive";
    tile.straight.style.display = "none";
    tile.curve.style.display = "none";
  });

  // apply solved pattern
  Object.entries(pattern.tiles).forEach(([idxStr, mask]) => {
    const idx = Number(idxStr);
    const tile = tiles[idx];
    if (!tile) return;

    tile.baseMask = mask;
    tile.rotStep = 0;
    tile.mask = rotateMask(tile.baseMask, tile.rotStep);

    tile.element.classList.remove("inactive");
    tile.element.classList.add("active-blue");

    if (idx === pattern.start) {
      tile.element.classList.remove("active-blue");
      tile.element.classList.add("active-green");
      tile.isEndpoint = true;
    } else if (idx === pattern.end) {
      tile.element.classList.remove("active-blue");
      tile.element.classList.add("active-pink");
      tile.isEndpoint = true;
    }

    tile.movable = !lockedSet.has(idx);

    renderTile(tile);
  });

  // scramble movable pieces
  scrambleMovable(pattern);

  moves = 0;
  movesLabel.textContent = "0";
  timeRemaining = pattern.time || BASE_TIME;
  updateTimerLabel();

  if (startTimer && hasStarted) {
    restartTimer();
  } else if (!startTimer && timer) {
    clearInterval(timer);
    timer = null;
  }
}

// SCRAMBLE / ROTATION 
function scrambleMovable(pattern) {
  tiles.forEach((tile) => {
    if (!tile.movable || tile.baseMask === 0) return;

    const steps = Math.floor(Math.random() * 4); 
    tile.rotStep = steps;
    tile.mask = rotateMask(tile.baseMask, tile.rotStep);
    tile.element.classList.remove("solved", "path-glow");

    renderTile(tile);
  });
}

function onTileClick(tile) {
  if (!hasStarted || !tile.movable || tile.baseMask === 0) return;
  if (isSolved) return; // lock after solved

  tile.rotStep = (tile.rotStep + 1) % 4;
  tile.mask = rotateMask(tile.baseMask, tile.rotStep);

  renderTile(tile);

  moves++;
  movesLabel.textContent = moves;

  checkSolved();
}

// SOLUTION CHECK 
function checkSolved() {
  const pattern = patterns[patternIndex];
  const masks = tiles.map((t) => t.mask);

  // every active port must have a matching neighbour
  for (let i = 0; i < masks.length; i++) {
    const m = masks[i];
    if (!m) continue;
    const [r, c] = idxToRC(i);

    for (const d of ALL_DIRS) {
      if (!(m & d.bit)) continue;

      const nr = r + d.dr;
      const nc = c + d.dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) {
        return; // open to outside
      }

      const ni = nr * GRID_SIZE + nc;
      const nm = masks[ni];

      if (!nm || !(nm & d.opposite)) {
        return; // neighbour not connected back
      }
    }
  }

  // BFS from start must reach end
  const visited = new Array(masks.length).fill(false);
  const startIdx = pattern.start;
  const endIdx = pattern.end;

  if (!masks[startIdx] || !masks[endIdx]) return;

  const queue = [startIdx];
  visited[startIdx] = true;

  while (queue.length > 0) {
    const i = queue.shift();
    const m = masks[i];
    if (!m) continue;
    const [r, c] = idxToRC(i);

    for (const d of ALL_DIRS) {
      if (!(m & d.bit)) continue;

      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;

      const ni = nr * GRID_SIZE + nc;
      if (!masks[ni] || !(masks[ni] & d.opposite)) continue;

      if (!visited[ni]) {
        visited[ni] = true;
        queue.push(ni);
      }
    }
  }

  if (!visited[endIdx]) return;

  // no isolated islands
  for (let i = 0; i < masks.length; i++) {
    if (masks[i] && !visited[i]) return;
  }

  // Solved
  isSolved = true;
  nextBtn.disabled = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeRemaining = Math.max(timeRemaining, 0);
  updateTimerLabel();
  playSolveAnimation();
}

function playSolveAnimation() {
  const pattern = patterns[patternIndex];
  const masks = tiles.map((t) => t.mask);
  const distances = new Array(masks.length).fill(Infinity);
  const start = pattern.start;

  distances[start] = 0;
  const q = [start];

  while (q.length > 0) {
    const i = q.shift();
    const m = masks[i];
    if (!m) continue;
    const [r, c] = idxToRC(i);

    for (const d of ALL_DIRS) {
      if (!(m & d.bit)) continue;

      const nr = r + d.dr;
      const nc = c + d.dc;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;

      const ni = nr * GRID_SIZE + nc;
      if (!masks[ni] || !(masks[ni] & d.opposite)) continue;

      if (distances[ni] > distances[i] + 1) {
        distances[ni] = distances[i] + 1;
        q.push(ni);
      }
    }
  }

  const stepMs = 80;

  tiles.forEach((tile, idx) => {
    if (!tile.mask) return;
    const dist = distances[idx];
    if (!isFinite(dist)) return;
    const delay = dist * stepMs;

    setTimeout(() => {
      tile.element.classList.add("path-glow", "solved");
    }, delay);

    setTimeout(() => {
      tile.element.classList.remove("path-glow");
    }, delay + 400);
  });
}

// GAME TIMER 
function updateTimerLabel() {
  timerDisplay.textContent = timeRemaining.toFixed(1) + "s";
}

function restartTimer() {
  if (timer) clearInterval(timer);

  const start = performance.now();
  let last = start;

  timer = setInterval(() => {
    const now = performance.now();
    const delta = (now - last) / 1000;
    last = now;

    timeRemaining -= delta;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      updateTimerLabel();
      clearInterval(timer);
      timer = null;
      flashTimeout();
      return;
    }
    updateTimerLabel();
  }, 100);
}

function flashTimeout() {
  gridElement.style.filter = "brightness(0.4)";
  setTimeout(() => {
    gridElement.style.filter = "none";
  }, 350);
}

// LEVEL NAVIGATION
function transitionToPattern(nextIndex) {
  gridWrapper.classList.add("fade-out");
  setTimeout(() => {
    patternIndex = nextIndex;
    applyPattern(true);
    gridWrapper.classList.remove("fade-out");
  }, 220);
}

prevBtn.addEventListener("click", () => {
  const nextIndex = (patternIndex - 1 + patterns.length) % patterns.length;
  transitionToPattern(nextIndex);
});

nextBtn.addEventListener("click", () => {
  if (!isSolved) return; 
  const nextIndex = (patternIndex + 1) % patterns.length;
  transitionToPattern(nextIndex);
});

shuffleBtn.addEventListener("click", () => {
  const pattern = patterns[patternIndex];
  scrambleMovable(pattern);

  moves = 0;
  movesLabel.textContent = "0";
  timeRemaining = pattern.time || BASE_TIME;
  updateTimerLabel();
  if (hasStarted) restartTimer();

  isSolved = false;
  nextBtn.disabled = true;
});

restartBtn.addEventListener("click", () => {
  applyPattern(true);
});

// HOME SCREEN & MODALS 
function openModal(modal) {
  if (!modal) return;
  modal.classList.add("home-modal-open");
}
function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("home-modal-open");
}

if (howToBtn && howToModal) {
  howToBtn.addEventListener("click", () => openModal(howToModal));
}
if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener("click", () => openModal(settingsModal));
}
if (closeHowToBtn && howToModal) {
  closeHowToBtn.addEventListener("click", () => closeModal(howToModal));
}
if (closeSettingsBtn && settingsModal) {
  closeSettingsBtn.addEventListener("click", () => closeModal(settingsModal));
}
[howToModal, settingsModal].forEach((modal) => {
  if (!modal) return;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal(modal);
  });
});

// Start screen → game screen
startBtn.addEventListener("click", () => {
  hasStarted = true;

  homeScreen.classList.remove("screen-active");
  homeScreen.classList.add("screen-hidden");

  gameScreen.classList.remove("screen-hidden");
  gameScreen.classList.add("screen-active");

  restartTimer();
});

// BOOT 
createGrid();
applyPattern(false);
