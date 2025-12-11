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

const endlessBtn = document.getElementById("endlessBtn");
const themeBtn = document.getElementById("themeBtn");

const modeClassic = document.getElementById("modeClassicBtn");
const modeTimed = document.getElementById("modeTimedBtn");
const modeMoves = document.getElementById("modeMovesBtn");

// CONSTANTS
const GRID_SIZE = 5;
const BASE_TIME = 60;

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

// GAME MODES
const MODES = {
  CLASSIC: "classic",
  TIMED: "timed",
  MOVES: "moves"
};

let currentMode = MODES.CLASSIC;

const MODE_SETTINGS = {
  [MODES.TIMED]: {
    baseTime: 60
  },
  [MODES.MOVES]: {
    moveLimit: 12
  }
};

// STORAGE KEYS
const STORAGE_KEYS = {
  PROGRESS: "hackGrid_progress_v1",
  ACHIEVEMENTS: "hackGrid_achievements_v1",
  SETTINGS: "hackGrid_settings_v1"
};

let progress = null;
let achievements = null;

// GAME THEMES
const THEMES = ["neon", "vapor", "matrix"];
let currentThemeIndex = 0;

let usedShuffleThisRun = false;

// GAME AUDIO
const SFX = {
  rotate: new Audio("sfx/rotate.wav"),
  solved: new Audio("sfx/solved.wav"),
  fail:   new Audio("sfx/fail.wav"),
  click:  new Audio("sfx/click.wav")
};

function playSfx(name) {
  const snd = SFX[name];
  if (!snd) return;
  snd.currentTime = 0;
  snd.play().catch(() => {});
}

function lerpColor(c1, c2, t) {
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const START_COLOR = { r: 34, g: 197, b: 94 };
const END_COLOR = { r: 236, g: 72,  b: 153 };

// LEVEL DATA
const patterns = [
  {
    name: "01 · Circuit Intro",
    difficulty: "easy",
    time: 60,
    start: 0,
    targets: [22],
    tiles: {
      0:  DIR.DOWN,                   
      5:  DIR.UP | DIR.DOWN,          
      10: DIR.UP | DIR.RIGHT,         
      11: DIR.LEFT | DIR.RIGHT,       
      12: DIR.LEFT | DIR.DOWN,        
      17: DIR.UP | DIR.DOWN,          
      22: DIR.UP                      
    },
    locked: [0, 22],
    maxMoves: 14
  },

  {
    name: "02 · Sweep Line",
    difficulty: "easy",
    time: 55,
    start: 0,
    targets: [24],
    tiles: {
      0:  DIR.RIGHT,                  
      1:  DIR.LEFT | DIR.RIGHT,       
      2:  DIR.LEFT | DIR.DOWN,       
      7:  DIR.UP | DIR.DOWN,          
      12: DIR.UP | DIR.DOWN,          
      17: DIR.UP | DIR.RIGHT,         
      18: DIR.LEFT | DIR.RIGHT,    
      19: DIR.LEFT | DIR.DOWN,        
      24: DIR.UP                      
    },
    locked: [0, 24],
    maxMoves: 16
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

function isCurve(mask) {
  return (
    mask === (DIR.UP | DIR.RIGHT)  ||
    mask === (DIR.RIGHT | DIR.DOWN)||
    mask === (DIR.DOWN | DIR.LEFT) ||
    mask === (DIR.LEFT | DIR.UP)
  );
}

function isStraight(mask) {
  return (
    mask === (DIR.UP | DIR.DOWN) ||
    mask === (DIR.LEFT | DIR.RIGHT)
  );
}

function randomInt(n) {
  return Math.floor(Math.random() * n);
}

// PROGRESS / ACHIEVEMENTS
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    if (!raw) {
      const base = { solved: {}, stars: {}, bestTime: {}, bestMoves: {} };
      patterns.forEach((_, idx) => {
        base.solved[idx] = false;
        base.stars[idx] = 0;
      });
      return base;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load progress", e);
    return { solved: {}, stars: {}, bestTime: {}, bestMoves: {} };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.warn("Failed to save progress", e);
  }
}

function loadAchievements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) {
      return {
        speedrunner1: false,
        speedrunner2: false,
        efficiency1: false,
        efficiency2: false,
        perfectPath: false,
        allCleared: false
      };
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load achievements", e);
    return {
      speedrunner1: false,
      speedrunner2: false,
      efficiency1: false,
      efficiency2: false,
      perfectPath: false,
      allCleared: false
    };
  }
}

function saveAchievements() {
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (e) {
    console.warn("Failed to save achievements", e);
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

function renderTile(tile) {
  const m = tile.mask;

  tile.straight.style.display = "none";
  tile.curve.style.display = "none";

  if (!m) return;

  // Straight
  if (isStraight(m)) {
    tile.straight.style.display = "block";

    if (m === (DIR.UP | DIR.DOWN)) {
      tile.straight.style.transform =
        "translate(-50%, -50%) rotate(0deg)";
    } else {
      tile.straight.style.transform =
        "translate(-50%, -50%) rotate(90deg)";
    }
    return;
  }

  // L-curve
  if (isCurve(m)) {
    tile.curve.style.display = "block";

    let rotation = 0;
    if (m === (DIR.UP | DIR.RIGHT)) {
      rotation = 0;
    } else if (m === (DIR.RIGHT | DIR.DOWN)) {
      rotation = 90;
    } else if (m === (DIR.DOWN | DIR.LEFT)) {
      rotation = 180;
    } else if (m === (DIR.LEFT | DIR.UP)) {
      rotation = 270;
    }

    tile.curve.style.transform =
      `translate(-50%, -50%) rotate(${rotation}deg)`;
    return;
  }
}

// THEME / HUD
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
  const targetSet = new Set(pattern.targets || []);

  isSolved = false;
  nextBtn.disabled = true;

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

  // place pattern tiles
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
    } else if (targetSet.has(idx)) {
      tile.element.classList.remove("active-blue");
      tile.element.classList.add("active-pink");
      tile.isEndpoint = true;
    }

    tile.movable = !lockedSet.has(idx);

    renderTile(tile);
  });

  // scramble movable tiles
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
  if (isSolved) return;

  tile.rotStep = (tile.rotStep + 1) % 4;
  tile.mask = rotateMask(tile.baseMask, tile.rotStep);

  renderTile(tile);

  moves++;
  movesLabel.textContent = moves;

  checkSolved();
}

// BUILD ADJACENCY (local validity)
function buildAdjacency(masks, activeSet) {
  const adjacency = new Map();
  activeSet.forEach((idx) => adjacency.set(idx, []));

  for (const idx of activeSet) {
    const mask = masks[idx];
    if (!mask) return null;

    const [r, c] = idxToRC(idx);

    for (const d of ALL_DIRS) {
      if (!(mask & d.bit)) continue;

      const nr = r + d.dr;
      const nc = c + d.dc;

      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) {
        return null; // open end off-board
      }

      const ni = nr * GRID_SIZE + nc;
      const neighbourMask = masks[ni];

      if (!activeSet.has(ni)) {
        return null; // connects into non-wire
      }

      if (!neighbourMask || !(neighbourMask & d.opposite)) {
        return null; // neighbour doesn't connect back
      }

      adjacency.get(idx).push(ni);
    }
  }

  return adjacency;
}

// SOLUTION CHECK
function checkSolved() {
  const pattern = patterns[patternIndex];
  const masks = tiles.map((t) => t.mask);

  const startIdx = pattern.start;
  const targets = pattern.targets || [];

  const activeIndices = Object.keys(pattern.tiles).map(Number);
  const activeSet = new Set(activeIndices);

  if (!activeSet.has(startIdx)) return;
  for (const t of targets) {
    if (!activeSet.has(t)) return;
  }

  if (!masks[startIdx]) return;

  const adjacency = buildAdjacency(masks, activeSet);
  if (!adjacency) return;

  const visited = new Map();
  activeSet.forEach((idx) => visited.set(idx, false));

  const queue = [startIdx];
  visited.set(startIdx, true);

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbours = adjacency.get(current) || [];

    for (const nb of neighbours) {
      if (!visited.get(nb)) {
        visited.set(nb, true);
        queue.push(nb);
      }
    }
  }

  // all targets reachable
  for (const t of targets) {
    if (!visited.get(t)) return;
  }

  // all wire tiles visited
  for (const idx of activeSet) {
    if (!visited.get(idx)) return;
  }

  isSolved = true;
  nextBtn.disabled = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  timeRemaining = Math.max(timeRemaining, 0);
  updateTimerLabel();

  playSolveAnimation(visited);
}

// SOLUTION ANIMATION
function playSolveAnimation(visitedMap) {
  const pattern = patterns[patternIndex];
  const masks = tiles.map((t) => t.mask);
  const start = pattern.start;

  const activeIndices = Object.keys(pattern.tiles).map(Number);
  const activeSet = new Set(activeIndices);

  const adjacency = buildAdjacency(masks, activeSet);
  if (!adjacency) return;

  // BFS to get distances from start
  const distances = new Map();
  activeSet.forEach((idx) => distances.set(idx, Infinity));
  distances.set(start, 0);

  const q = [start];

  while (q.length > 0) {
    const current = q.shift();
    const currentDist = distances.get(current);
    const neighbours = adjacency.get(current) || [];

    for (const nb of neighbours) {
      if (!visitedMap.get(nb)) continue;

      if (distances.get(nb) > currentDist + 1) {
        distances.set(nb, currentDist + 1);
        q.push(nb);
      }
    }
  }

  // find the maximum distance among powered tiles
  let maxDist = 0;
  activeSet.forEach((idx) => {
    if (!visitedMap.get(idx)) return;
    const d = distances.get(idx);
    if (isFinite(d) && d > maxDist) {
      maxDist = d;
    }
  });

  const stepMs = 80;

  // animate with colour gradient based on distance
  tiles.forEach((tile, idx) => {
    if (!visitedMap.get(idx)) return;

    const dist = distances.get(idx);
    if (!isFinite(dist)) return;

    const delay = dist * stepMs;
    const t = maxDist === 0 ? 0 : dist / maxDist; 
    const blended = lerpColor(START_COLOR, END_COLOR, t);

    setTimeout(() => {
      tile.element.classList.add("solved", "path-glow");
      tile.element.style.setProperty("--solved-color", blended);
    }, delay);

    setTimeout(() => {
      tile.element.classList.remove("path-glow");
    }, delay + 400);
  });
}


// TIMER
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
  timeRemaining =
    pattern.time || BASE_TIME;
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

// START SCREEN → GAME
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
