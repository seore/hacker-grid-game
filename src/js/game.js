// --- BASIC PUZZLE STATE -------------------------------------------------

    const gridElement = document.getElementById("grid");
    const movesLabel = document.getElementById("movesLabel");
    const levelLabel = document.getElementById("levelLabel");
    const patternIndexLabel = document.getElementById("patternIndex");
    const timerDisplay = document.getElementById("timerDisplay");

    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const shuffleBtn = document.getElementById("shuffleBtn");
    const restartBtn = document.getElementById("restartBtn");

    const GRID_SIZE = 5;
    const MAX_ROTATION = 3; // 0, 1, 2, 3 -> 0°, 90°, 180°, 270°
    const BASE_TIME = 60; // seconds

    let tiles = [];
    let patternIndex = 0;
    let moves = 0;
    let timer = null;
    let timeRemaining = BASE_TIME;

    // Pre-baked patterns for which tiles are "active" and their target direction
    // Each pattern: { colorMap: { index: colorClass }, target: rotationIndex }
    const patterns = [
      {
        name: "01 · Initiate",
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
        name: "02 · Cascade",
        colorMap: {
          1: "active-blue",
          2: "active-blue",
          7: "active-green",
          8: "active-green",
          13: "active-pink",
          18: "active-pink"
        },
        target: 1
      },
      {
        name: "03 · Crosslink",
        colorMap: {
          0: "active-blue",
          4: "active-blue",
          10: "active-green",
          12: "active-green",
          20: "active-pink",
          24: "active-pink"
        },
        target: 2
      }
    ];

    // --- INITIALIZATION -----------------------------------------------------

    function createGrid() {
      gridElement.innerHTML = "";
      tiles = [];

      for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const tile = document.createElement("button");
        tile.type = "button";
        tile.className = "tile";

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
          rotation: 0 // discrete step of 90°
        });

        tile.addEventListener("click", () => {
          rotateTile(i);
        });
      }
    }

    // Apply current pattern styling and random starting rotations
    function applyPattern() {
      const pattern = patterns[patternIndex];
      patternIndexLabel.textContent = String(patternIndex + 1).padStart(2, "0");
      levelLabel.textContent = pattern.name;

      tiles.forEach((tile) => {
        tile.active = false;
        tile.rotation = 0;
        tile.element.classList.remove("active-blue", "active-green", "active-pink", "solved");
        tile.notch.style.transform = "rotate(0deg)";
      });

      Object.entries(pattern.colorMap).forEach(([idx, colorClass]) => {
        const tile = tiles[Number(idx)];
        if (!tile) return;

        tile.active = true;
        tile.element.classList.add(colorClass);

        // Start them in a random rotation so it's not already solved
        const randomRot = Math.floor(Math.random() * (MAX_ROTATION + 1));
        tile.rotation = randomRot;
        const deg = randomRot * 90;
        tile.notch.style.transform = `rotate(${deg}deg)`;
      });

      moves = 0;
      movesLabel.textContent = "0";
      timeRemaining = BASE_TIME;
      updateTimerLabel();
      restartTimer();
    }

    // --- GAME LOGIC ---------------------------------------------------------

    function rotateTile(index) {
      const tile = tiles[index];
      if (!tile) return;

      // Only active tiles affect win condition, but allow rotating others for feel
      tile.rotation = (tile.rotation + 1) % (MAX_ROTATION + 1);
      const deg = tile.rotation * 90;
      tile.notch.style.transform = `rotate(${deg}deg)`;

      if (tile.active) {
        moves++;
        movesLabel.textContent = moves;
        checkSolved();
      }
    }

    function checkSolved() {
      const target = patterns[patternIndex].target;

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

        // small visual feedback by briefly increasing timeRemaining (no negative)
        timeRemaining = Math.max(timeRemaining, 0);
        updateTimerLabel();
      }
    }

    // --- TIMER --------------------------------------------------------------

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
          // Optional: flash grid on timeout
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

    // --- CONTROLS -----------------------------------------------------------

    prevBtn.addEventListener("click", () => {
      patternIndex = (patternIndex - 1 + patterns.length) % patterns.length;
      applyPattern();
    });

    nextBtn.addEventListener("click", () => {
      patternIndex = (patternIndex + 1) % patterns.length;
      applyPattern();
    });

    shuffleBtn.addEventListener("click", () => {
      // Randomize only rotations of active tiles
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
      timeRemaining = BASE_TIME;
      updateTimerLabel();
      restartTimer();
    });

    restartBtn.addEventListener("click", () => {
      applyPattern();
    });

    // --- BOOTSTRAP ----------------------------------------------------------

    createGrid();
    applyPattern();