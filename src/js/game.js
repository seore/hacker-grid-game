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

const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const gridWrapper = document.querySelector(".grid-wrapper");

const GRID_SIZE = 5;
const MAX_ROTATION = 3; 
const BASE_TIME = 60;

let tiles = [];
let patternIndex = 0;
let moves = 0;
let timer = null;
let timeRemaining = BASE_TIME;
let hasStarted = false;

// patterns with difficulty + time + target direction
const patterns = [
  {
    name: "01 · Initiate",
    difficulty: "easy",
    time: 70,
    colorMap: {
      6: "active-green",
      7: "active-blue",
      11: "active-blue",
      12: "active-blue",
      17: "active-pink"
    },
    target: 0
  },
  {
    name: "02 · Splitstream",
    difficulty: "easy",
    time: 65,
    colorMap: {
      1: "active-blue",
      5: "active-blue",
      7: "active-green",
      13: "active-green",
      18: "active-pink"
    },
    target: 1
  },
  {
    name: "03 · Cascade",
    difficulty: "medium",
    time: 55,
    colorMap: {
      2: "active-blue",
      7: "active-blue",
      8: "active-green",
      12: "active-green",
      16: "active-pink",
      21: "active-pink"
    },
    target: 2
  },
  {
    name: "04 · Circuit Gate",
    difficulty: "medium",
    time: 50,
    colorMap: {
      0: "active-blue",
      4: "active-blue",
      10: "active-green",
      14: "active-green",
      20: "active-pink",
      24: "active-pink"
    },
    target: 3
  },
  {
    name: "05 · Crosslink",
    difficulty: "hard",
    time: 45,
    colorMap: {
      6: "active-blue",
      7: "active-blue",
      8: "active-blue",
      11: "active-green",
      12: "active-green",
      13: "active-green",
      17: "active-pink"
    },
    target: 1
  },
  {
    name: "06 · Overload",
    difficulty: "hard",
    time: 40,
    colorMap: {
      1: "active-blue",
      2: "active-blue",
      3: "active-blue",
      5: "active-green",
      7: "active-green",
      9: "active-green",
      15: "active-pink",
      17: "active-pink",
      19: "active-pink"
    },
    target: 2
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
      active: false,
      rotation: 0
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

  tiles.forEach((tile) => {
    tile.active = false;
    tile.rotation = 0;
    tile.element.className = "tile inactive";
    tile.notch.style.transform = "rotate(0deg)";
  });

  Object.entries(pattern.colorMap).forEach(([idx, colorClass]) => {
    const tile = tiles[Number(idx)];
    if (!tile) return;

    tile.active = true;
    tile.element.classList.remove("inactive");
    tile.element.classList.add(colorClass);

    const randomRot = Math.floor(Math.random() * (MAX_ROTATION + 1));
    tile.rotation = randomRot;
    tile.notch.style.transform = `rotate(${randomRot * 90}deg)`;
  });

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

function rotateTile(index) {
  const tile = tiles[index];
  if (!tile || !tile.active || !hasStarted) return;

  tile.rotation = (tile.rotation + 1) % (MAX_ROTATION + 1);
  const deg = tile.rotation * 90;
  tile.notch.style.transform = `rotate(${deg}deg)`;

  moves++;
  movesLabel.textContent = moves;
  checkSolved();
}

function checkSolved() {
  const pattern = patterns[patternIndex];
  const target = pattern.target;

  const allAligned = tiles
    .filter((t) => t.active)
    .every((t) => t.rotation === target);

  if (allAligned) {
    tiles
      .filter((t) => t.active)
      .forEach((t) => t.element.classList.add("solved"));

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

// UI controls
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

  tiles
    .filter((t) => t.active)
    .forEach((t) => {
      t.element.classList.remove("solved");
      const randomRot = Math.floor(Math.random() * (MAX_ROTATION + 1));
      t.rotation = randomRot;
      t.notch.style.transform = `rotate(${randomRot * 90}deg)`;
    });

  moves = 0;
  movesLabel.textContent = "0";
  timeRemaining = pattern.time || BASE_TIME;
  updateTimerLabel();
  if (hasStarted) restartTimer();
});

restartBtn.addEventListener("click", () => {
  applyPattern(true);
});

// Start menu
startBtn.addEventListener("click", () => {
  startOverlay.classList.add("overlay-hidden");
  hasStarted = true;
  restartTimer();
});

// boot
createGrid();
// load first pattern but don't start timer until player presses Start
applyPattern(false);
