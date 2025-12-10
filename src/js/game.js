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

const GRID_SIZE = 5;
const ROTATIONS = [0, 90, 180, 270];
const BASE_TIME = 60;

let tiles = [];
let patternIndex = 0;
let moves = 0;
let timer = null;
let timeRemaining = BASE_TIME;
let hasStarted = false;

/*  PATTERNS
   - endpoints: green & pink, NON-movable
   - path: full path indices, can include endpoints
   - targets: per-tile correct rotation in degrees
*/

const patterns = [
  {
    name: "01 · Initiate",
    difficulty: "easy",
    time: 70,

    endpoints: {
      6: "active-green",
      18: "active-pink"
    },

    path: [6, 7, 12, 17, 18],

    targets:{
      6: 0,
      7: 90,
      12: 0,
      17: 90,
      18: 180
    }
  },
  {
    name: "02 · Splitstream",
    difficulty: "easy",
    time: 60,

    endpoints:{ 3:"active-green", 21:"active-pink" },

    path:[3,4,9,14,19,20,21],

    targets:{
      3:90, 4:90, 9:0, 14:0, 19:90, 20:270, 21:180
    }
  },
  {
    name:"03 · Snakeshift",
    difficulty:"medium",
    time:55,

    endpoints:{ 1:"active-green", 23:"active-pink" },

    path:[1,2,7,12,13,18,23],

    targets:{
      1:0, 2:90, 7:0, 12:90, 13:180, 18:90, 23:180
    }
  },
  {
    // Column 1: [1, 6, 11, 16, 21]
    name: "04 · Circuit Gate",
    difficulty: "medium",
    time: 50,

    endpoints: {
      1: "active-green",
      21: "active-pink"
    },
    path:[1, 6, 11, 16, 21],
    targets:{
      1: 0, 6: 0, 11: 0, 16: 0, 21: 180
    }
  },
  {
    // Row 0: [0, 1, 2, 3, 4]
    name: "05 · Crosslink",
    difficulty: "hard",
    time: 45,

    endpoints: {
      0: "active-green",
      4: "active-pink"
    },
    path:[0,1,2,3,4],
    targets:{
      0:90, 1:90, 2:90, 3:90, 4:90
    }
  },
  {
    // Column 3: [3, 8, 13, 18, 23]
    name: "06 · Overload",
    difficulty: "hard",
    time: 40,

    endpoints: {
      3: "active-green",
      23: "active-pink"
    },
    path:[3,8,13,18,23],
    targets:{
      3:0, 8:0, 13:0, 18:0, 23:180
    }
  }
];

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
      correctRotation: 0
    });

    tile.addEventListener("click", () => {
      rotateTile(i);
    });
  }
}

function applyTheme(pattern) {
  document.body.classList.remove("theme-easy", "theme-medium", "theme-hard");
  const themeClass = `theme-${pattern.difficulty}`;
  document.body.classList.add(themeClass);

  difficultyLabel.textContent =
    pattern.difficulty.charAt(0).toUpperCase() + pattern.difficulty.slice(1);
}

function applyPattern(startTimer = true) {
  const pattern = patterns[patternIndex];
  patternIndexLabel.textContent = String(patternIndex + 1).padStart(2, "0");
  levelLabel.textContent = pattern.name;
  applyTheme(pattern);

  // reset all tiles
  tiles.forEach((tile) => {
    tile.movable = false;
    tile.rotation = 0;
    tile.correctRotation = 0;
    tile.element.className = "tile inactive";
    tile.notch.style.transform = "rotate(0deg)";
  });

  // endpoints: static, non-movable, but we still give them a target rotation
  Object.entries(pattern.endpoints).forEach(([idxStr, colorClass]) => {
    const idx = Number(idxStr);
    const tile = tiles[idx];
    if (!tile) return;

    tile.movable = false; // IMPORTANT: never movable
    tile.element.classList.remove("inactive");
    tile.element.classList.add(colorClass);

    tile.correctRotation = pattern.targets[idx] ?? 0;
    tile.rotation = tile.correctRotation;
    tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;
  });

  // path tiles: cyan, movable – but SKIP endpoints so they stay green/pink
  pattern.path.forEach((idx) => {
    if (pattern.endpoints[idx] !== undefined) return; // don't override endpoints

    const tile = tiles[idx];
    if (!tile) return;

    tile.movable = true;
    tile.element.classList.remove("inactive");
    tile.element.classList.add("active-blue", "movable");

    tile.correctRotation = pattern.targets[idx] ?? 0;
    tile.rotation = tile.correctRotation;
    tile.notch.style.transform = `rotate(${tile.rotation + 90}deg)`;
  });

  // scramble only movable (cyan) tiles
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

// scramble movable tiles by giving each a random rotation (endpoints stay correct)
function scrambleMovable(pattern) {
  pattern.path.forEach((idx) => {
    if (pattern.endpoints[idx] !== undefined) return; // skip green/pink

    const tile = tiles[idx];
    if (!tile) return;

    const randomIndex = Math.floor(Math.random() * ROTATIONS.length);
    tile.rotation = ROTATIONS[randomIndex];
    tile.notch.style.transform = `rotate(${tile.rotation}deg)`;
  });

  // also clear solved state
  tiles.forEach((t) => t.element.classList.remove("solved"));
}

function rotateTile(index) {
  const tile = tiles[index];
  if (!tile || !tile.movable || !hasStarted) return;

  // cycle through [0,90,180,270]
  let next = ROTATIONS.indexOf(tile.rotation) + 1;
  if (next >= ROTATIONS.length) next = 0;
  tile.rotation = ROTATIONS[next];

  const deg = tile.rotation;
  tile.notch.style.transform = `rotate(${deg}deg)`;

  moves++;
  movesLabel.textContent = moves;
  checkSolved();
}

function checkSolved() {
  const pattern = patterns[patternIndex];

  // solved when every tile on the path (including endpoints)
  // matches its target rotation.
  const allAligned = pattern.path.every((idx) => {
    const tile = tiles[idx];
    const correct = pattern.targets[idx] ?? 0;
    return tile && tile.rotation === correct;
  });

  if (allAligned) {
    // highlight only movable path tiles (cyan)
    pattern.path.forEach((idx) => {
      if (pattern.endpoints[idx] !== undefined) return;
      const tile = tiles[idx];
      if (tile) tile.element.classList.add("solved");
    });

    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    timeRemaining = Math.max(timeRemaining, 0);
    updateTimerLabel();
  }
}

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

// Smooth transition between patterns
function transitionToPattern(nextIndex) {
  gridWrapper.classList.add("fade-out");

  setTimeout(() => {
    patternIndex = nextIndex;
    applyPattern(true);
    gridWrapper.classList.remove("fade-out");
  }, 220);
}

// controls
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

// Start screen → game screen
startBtn.addEventListener("click", () => {
  hasStarted = true;

  // fade out home, fade in game
  homeScreen.classList.remove("screen-active");
  homeScreen.classList.add("screen-hidden");

  gameScreen.classList.remove("screen-hidden");
  gameScreen.classList.add("screen-active");

  restartTimer();
});

// boot
createGrid();
// load first pattern but don't run timer until the player starts
applyPattern(false);
