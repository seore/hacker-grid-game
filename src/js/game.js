// DOM references
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

const GRID_SIZE = 5;
const ROTATIONS = [0, 90, 180, 270]; 
const BASE_TIME = 60;

let tiles = [];
let patternIndex = 0;
let moves = 0;
let timer = null;
let timeRemaining = BASE_TIME;
let hasStarted = false;

/*
  LEVELS (no decoys)

  endpoints: { index: "active-green" | "active-pink" }
  path: continuous line (indices) from green → pink
*/

const patterns = [
  {
    name: "01 · Initiate",
    difficulty: "easy",
    time: 70,
    endpoints: { 6: "active-green", 18: "active-pink" },
    path: [6, 7, 12, 17, 18]
  },
  {
    name: "02 · Splitstream",
    difficulty: "easy",
    time: 60,
    endpoints: { 3: "active-green", 21: "active-pink" },
    path: [3, 4, 9, 14, 19, 24, 23, 22, 21]
  },
  {
    name: "03 · Snakeshift",
    difficulty: "medium",
    time: 55,
    endpoints: { 1: "active-green", 23: "active-pink" },
    path: [1, 2, 7, 12, 13, 18, 23]
  },
  {
    name: "04 · Circuit Gate",
    difficulty: "medium",
    time: 50,
    endpoints: { 1: "active-green", 21: "active-pink" },
    path: [1, 6, 11, 16, 21]
  },
  {
    name: "05 · Crosslink",
    difficulty: "hard",
    time: 45,
    endpoints: { 0: "active-green", 14: "active-pink" },
    path: [0, 1, 2, 7, 12, 13, 14]
  },
  {
    name: "06 · Overload",
    difficulty: "hard",
    time: 40,
    endpoints: { 2: "active-green", 24: "active-pink" },
    path: [2, 7, 12, 17, 22, 23, 24]
  },
  {
    name: "07 · Driftline",
    difficulty: "medium",
    time: 55,
    endpoints: { 5: "active-green", 19: "active-pink" },
    path: [5, 10, 15, 16, 17, 18, 19]
  },
  {
    name: "08 · Crossweave",
    difficulty: "hard",
    time: 45,
    endpoints: { 9: "active-green", 20: "active-pink" },
    path: [9, 8, 7, 12, 17, 22, 21, 20]
  },
  {
    name: "09 · Spiral Gate",
    difficulty: "expert",
    time: 50,
    endpoints: { 0: "active-green", 18: "active-pink" },
    path: [
      0, 1, 2, 3, 4,
      9, 14, 19, 24,
      23, 22, 21, 20,
      15, 10, 5, 6, 7, 8, 13, 18
    ]
  },
  {
    name: "10 · Overpass",
    difficulty: "easy",
    time: 65,
    endpoints: { 11: "active-green", 9: "active-pink" },
    path: [11, 6, 7, 8, 9]
  }
];


/* ---------- Helpers ---------- */

function idxToRC(i) {
  return [Math.floor(i / GRID_SIZE), i % GRID_SIZE];
}

function computeTargets(pattern) {
  const path = pattern.path;
  const targets = {};

  for (let k = 0; k < path.length; k++) {
    const i = path[k];
    const prev = k > 0 ? path[k - 1] : null;
    const next = k < path.length - 1 ? path[k + 1] : null;

    const [row, col] = idxToRC(i);
    const [prevRow, prevCol] = prev != null ? idxToRC(prev) : [null, null];
    const [nextRow, nextCol] = next != null ? idxToRC(next) : [null, null];

    let horizontal;

    if (prev == null && next != null) {
      horizontal = nextRow === row;
    } else if (next == null && prev != null) {
      horizontal = prevRow === row;
    } else if (prev != null && next != null) {
      if (prevRow === row && nextRow === row) {
        horizontal = true;
      } else if (prevCol === col && nextCol === col) {
        horizontal = false;
      } else {
        horizontal = prevRow === row;
      }
    } else {
      horizontal = true;
    }

    targets[i] = horizontal ? 0 : 90;
  }

  pattern.targets = targets;
}

/* ---------- Grid creation ---------- */

function createGrid() {
  gridElement.innerHTML = "";
  tiles = [];

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "tile inactive";

    const ring = document.createElement("div");
    ring.className = "tile-ring";

    const notch = document.createElement("div");
    notch.className = "tile-notch";

    ring.appendChild(notch);
    tile.appendChild(ring);
    gridElement.appendChild(tile);

    tiles.push({
      index: i,
      element: tile,
      notch,
      movable: false,
      rotation: 0,
      correctRotation: 0,
      isPath: false
    });

    tile.addEventListener("click", () => rotateTile(i));
  }
}

/* ---------- Theme / HUD ---------- */

function applyTheme(pattern) {
  document.body.classList.remove("theme-easy", "theme-medium", "theme-hard");
  document.body.classList.add(`theme-${pattern.difficulty}`);

  difficultyLabel.textContent =
    pattern.difficulty.charAt(0).toUpperCase() + pattern.difficulty.slice(1);
}

/* ---------- Apply pattern ---------- */

function applyPattern(startTimer = true) {
  const pattern = patterns[patternIndex];
  computeTargets(pattern);

  patternIndexLabel.textContent = String(patternIndex + 1).padStart(2, "0");
  levelLabel.textContent = pattern.name;
  applyTheme(pattern);

  const endpointSet = new Set(Object.keys(pattern.endpoints).map(Number));

  tiles.forEach((tile) => {
    tile.movable = false;
    tile.rotation = 0;
    tile.correctRotation = 0;
    tile.isPath = false;
    tile.element.className = "tile inactive";
    tile.notch.style.transform = "rotate(90deg)";
  });

  // node endpoints
  Object.entries(pattern.endpoints).forEach(([idxStr, colorClass]) => {
    const idx = Number(idxStr);
    const tile = tiles[idx];
    if (!tile) return;

    tile.movable = false;
    tile.isPath = true;
    tile.element.classList.remove("inactive");
    tile.element.classList.add(colorClass);

    const targetRot = pattern.targets[idx];
    tile.correctRotation = targetRot;
    tile.rotation = targetRot;
    tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;
  });

  // main path cyan (movable except endpoints)
  pattern.path.forEach((idx) => {
    if (endpointSet.has(idx)) return;

    const tile = tiles[idx];
    if (!tile) return;

    tile.movable = true;
    tile.isPath = true;
    tile.element.classList.remove("inactive");
    tile.element.classList.add("active-blue", "movable");

    const targetRot = pattern.targets[idx];
    tile.correctRotation = targetRot;
    tile.rotation = targetRot;
    tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;
  });

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

/* ---------- Scramble ---------- */

function scrambleMovable(pattern) {
  tiles
    .filter((t) => t.movable)
    .forEach((tile) => {
      const rand = Math.floor(Math.random() * ROTATIONS.length);
      tile.rotation = ROTATIONS[rand];
      tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;
      tile.element.classList.remove("solved", "path-glow", "dead-end");
    });

  updateHintState(pattern);
}

/* ---------- Rotate tile ---------- */

function rotateTile(index) {
  const tile = tiles[index];
  if (!tile || !tile.movable || !hasStarted) return;

  let next = ROTATIONS.indexOf(tile.rotation) + 1;
  if (next >= ROTATIONS.length) next = 0;
  tile.rotation = ROTATIONS[next];

  tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;

  moves++;
  movesLabel.textContent = moves;

  const pattern = patterns[patternIndex];
  updateHintState(pattern);
  checkSolved();
}

/* ---------- Hint: misaligned path tiles ---------- */

function updateHintState(pattern) {
  const targetMap = pattern.targets || {};
  pattern.path.forEach((idx) => {
    const tile = tiles[idx];
    if (!tile || !tile.isPath || !tile.movable) return;

    if (tile.rotation !== targetMap[idx]) {
      tile.element.classList.add("dead-end");
    } else {
      tile.element.classList.remove("dead-end");
    }
  });
}

/* ---------- Solve animation ---------- */

function animatePathFlow(pattern) {
  const STEP = 90;
  pattern.path.forEach((idx, i) => {
    const tile = tiles[idx];
    if (!tile) return;

    setTimeout(() => {
      tile.element.classList.add("path-glow");
      if (tile.movable && tile.isPath) {
        tile.element.classList.add("solved");
      }
    }, i * STEP);

    setTimeout(() => {
      tile.element.classList.remove("path-glow");
    }, i * STEP + 450);
  });
}

/* ---------- Check solved ---------- */

function checkSolved() {
  const pattern = patterns[patternIndex];
  const targets = pattern.targets || {};

  const allAligned = pattern.path.every((idx) => {
    const tile = tiles[idx];
    const correct = targets[idx];
    return tile && tile.rotation === correct;
  });

  if (!allAligned) return;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeRemaining = Math.max(timeRemaining, 0);
  updateTimerLabel();

  animatePathFlow(pattern);
}

/* ---------- Timer ---------- */

function updateTimerLabel() {
  timerDisplay.textContent = timeRemaining.toFixed(1) + "s";
}

function restartTimer() {
  if (timer) {
    clearInterval(timer);
  }

  const start = performance.now();
  let lastTimestamp = start;

  timer = setInterval(() => {
    const now = performance.now();
    const delta = (now - lastTimestamp) / 1000;
    lastTimestamp = now;

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

/* ---------- Level navigation ---------- */

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
});

restartBtn.addEventListener("click", () => {
  applyPattern(true);
});

/* ---------- Home screen & modals ---------- */

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

/* ---------- Start screen ---------- */

startBtn.addEventListener("click", () => {
  hasStarted = true;

  homeScreen.classList.remove("screen-active");
  homeScreen.classList.add("screen-hidden");

  gameScreen.classList.remove("screen-hidden");
  gameScreen.classList.add("screen-active");

  restartTimer();
});

/* ---------- Boot ---------- */

createGrid();
applyPattern(false);
