// main.js
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

const container = document.getElementById("game-container");
const statusEl = document.getElementById("status");
const resetButton = document.getElementById("resetButton");

// Basic Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050712);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Orthographic camera for a flat, UI-like look
const aspect = container.clientWidth / container.clientHeight;
const frustumSize = 10;
const camera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100
);
camera.position.set(0, 0, 10);
camera.lookAt(0, 0, 0);

// Lights
const ambient = new THREE.AmbientLight(0x88aaff, 0.7);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.7);
dir.position.set(3, 5, 4);
scene.add(dir);

// Grid configuration
const GRID_SIZE = 5;
const TILE_SIZE = 1.4;
const tiles = []; // 2D array: tiles[row][col]

// Connection directions: 0=up,1=right,2=down,3=left
const DIRS = [
  { dx: 0, dy: 1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: -1 },
  { dx: -1, dy: 0 },
];

const TILE_TYPES = {
  STRAIGHT: "straight", // up-down
  CORNER: "corner", // up-right
  START: "start",
  GOAL: "goal",
};

// Utility: create material
function createTileMaterial(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    metalness: 0.4,
    roughness: 0.35,
  });
}

const baseMaterial = createTileMaterial(0x0d1028, 0x060813);
const pathMaterial = createTileMaterial(0x1a284f, 0x111841);
const startMaterial = createTileMaterial(0x00ff99, 0x00aa66);
const goalMaterial = createTileMaterial(0x33ccff, 0x1177aa);
const activeMaterial = createTileMaterial(0xffff88, 0xffcc33);

// Tile class (pure data + reference to mesh)
class Tile {
  constructor(row, col, type, rotation = 0) {
    this.row = row;
    this.col = col;
    this.type = type;
    this.rotation = rotation; // 0,1,2,3 * 90deg
    this.mesh = null;
  }

  getConnections() {
    // returns array of direction indices this tile connects to.
    switch (this.type) {
      case TILE_TYPES.STRAIGHT:
        // up & down by default; rotate rotates these dirs
        return [0, 2].map((d) => (d + this.rotation) % 4);
      case TILE_TYPES.CORNER:
        // up & right by default
        return [0, 1].map((d) => (d + this.rotation) % 4);
      case TILE_TYPES.START:
      case TILE_TYPES.GOAL:
        // treat as a straight by default so you can connect nicely
        return [0, 2].map((d) => (d + this.rotation) % 4);
      default:
        return [];
    }
  }

  rotate() {
    if (this.type === TILE_TYPES.START || this.type === TILE_TYPES.GOAL) return; // fixed
    this.rotation = (this.rotation + 1) % 4;
    if (this.mesh) {
      this.mesh.rotation.z = (Math.PI / 2) * this.rotation;
    }
  }

  setVisualState(state) {
    if (!this.mesh) return;
    switch (state) {
      case "normal":
        if (this.type === TILE_TYPES.START) this.mesh.material = startMaterial;
        else if (this.type === TILE_TYPES.GOAL) this.mesh.material = goalMaterial;
        else this.mesh.material = baseMaterial;
        break;
      case "path":
        if (this.type === TILE_TYPES.START) this.mesh.material = startMaterial;
        else if (this.type === TILE_TYPES.GOAL) this.mesh.material = goalMaterial;
        else this.mesh.material = pathMaterial;
        break;
      case "active":
        this.mesh.material = activeMaterial;
        break;
    }
  }
}

// --- Level setup ---

function createGrid() {
  // Clear old tiles if any
  tiles.length = 0;

  // layout: simple start on left, goal on right
  // You can make this data-driven later.
  const mid = Math.floor(GRID_SIZE / 2);

  for (let r = 0; r < GRID_SIZE; r++) {
    tiles[r] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      let type = TILE_TYPES.STRAIGHT;
      if (r === mid && c === 0) type = TILE_TYPES.START;
      else if (r === mid && c === GRID_SIZE - 1) type = TILE_TYPES.GOAL;
      else if (Math.random() < 0.5) type = TILE_TYPES.CORNER; // random mix

      const tile = new Tile(r, c, type, Math.floor(Math.random() * 4));
      tiles[r][c] = tile;

      // Create mesh
      const geom = new THREE.PlaneGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.9, 1, 1);
      const mesh = new THREE.Mesh(geom, baseMaterial);
      const x = (c - (GRID_SIZE - 1) / 2) * TILE_SIZE;
      const y = (r - (GRID_SIZE - 1) / 2) * TILE_SIZE;
      mesh.position.set(x, y, 0);
      mesh.rotation.z = (Math.PI / 2) * tile.rotation;

      // slight elevation for nicer lighting
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);
      tile.mesh = mesh;

      // For picking
      mesh.userData.tile = tile;
    }
  }

  // Apply visual state for start/goal
  tiles[mid][0].setVisualState("normal");
  tiles[mid][GRID_SIZE - 1].setVisualState("normal");

  updatePathHighlight();
}

// --- Pathfinding / connection logic ---

function inBounds(r, c) {
  return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE;
}

function findStartAndGoal() {
  let start = null;
  let goal = null;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const t = tiles[r][c];
      if (t.type === TILE_TYPES.START) start = t;
      if (t.type === TILE_TYPES.GOAL) goal = t;
    }
  }
  return { start, goal };
}

// Flood fill along connected tiles
function computePath() {
  const { start, goal } = findStartAndGoal();
  if (!start || !goal) return { connected: false, visited: [] };

  const queue = [];
  const visited = new Set();
  const parent = new Map();

  const key = (r, c) => `${r},${c}`;

  queue.push(start);
  visited.add(key(start.row, start.col));

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === goal) break;

    const conns = current.getConnections();
    for (const dirIndex of conns) {
      const { dx, dy } = DIRS[dirIndex];
      const nr = current.row + dy;
      const nc = current.col + dx;
      if (!inBounds(nr, nc)) continue;

      const neighbor = tiles[nr][nc];
      if (!neighbor) continue;

      // Check that neighbor connects back
      const opposite = (dirIndex + 2) % 4;
      const neighborConns = neighbor.getConnections();
      if (!neighborConns.includes(opposite)) continue;

      const k = key(nr, nc);
      if (!visited.has(k)) {
        visited.add(k);
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  const connected = visited.has(key(goal.row, goal.col));

  let pathTiles = [];
  if (connected) {
    // Reconstruct path from goal -> start
    let cur = goal;
    while (cur) {
      pathTiles.push(cur);
      cur = parent.get(cur) || (cur === start ? null : null);
      if (cur === start) {
        pathTiles.push(start);
        break;
      }
    }
  }

  return { connected, visited: Array.from(visited), pathTiles };
}

function updatePathHighlight() {
  // reset visuals
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      tiles[r][c].setVisualState("normal");
    }
  }

  const { connected, pathTiles } = computePath();
  if (connected) {
    pathTiles.forEach((tile) => tile.setVisualState("path"));
    statusEl.textContent = "✅ Access Granted!";
  } else {
    statusEl.textContent = "";
  }
}

// --- Interaction (raycasting) ---

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  mouse.set(x, y);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children, false);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const tile = mesh.userData.tile;
    if (tile) {
      tile.rotate();
      updatePathHighlight();
    }
  }
}

// --- Resize handling ---

function onResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;

  renderer.setSize(width, height);

  const aspect = width / height;
  camera.left = (frustumSize * aspect) / -2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", onResize);
renderer.domElement.addEventListener("pointerdown", onPointerDown);

resetButton.addEventListener("click", () => {
  // remove all meshes from scene except lights
  const toRemove = [];
  scene.traverse((obj) => {
    if (obj.isMesh && obj.userData.tile) {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((m) => scene.remove(m));

  createGrid();
});

// --- Animation loop ---

function animate() {
  requestAnimationFrame(animate);

  // subtle pulsing effect
  const t = performance.now() * 0.001;
  scene.traverse((obj) => {
    if (obj.isMesh && obj.userData.tile) {
      obj.position.z = Math.sin(t * 2 + obj.position.x * 0.5 + obj.position.y * 0.5) * 0.03;
    }
  });

  renderer.render(scene, camera);
}

// Init
onResize();
createGrid();
animate();
