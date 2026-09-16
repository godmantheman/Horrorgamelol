import * as THREE from 'three';
import {
  GameState,
  PlayerStats,
  ItemEntity,
  FlareEntity,
  SectorInfo,
  GameLog,
  Difficulty,
  GraphicsSettings,
} from '../types';
import { TextureGenerator } from './textures';
import { generateMaze, GeneratedMaze, CELL_SIZE, WALL_HEIGHT, MAZE_DIM } from './maze';
import { MonsterController } from './monster';
import { soundEngine } from './audio';

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'PERFORMANCE',
  renderScale: 0.75,
  shadows: false,
  maxLights: 2,
  viewDistance: 55,
  showFps: true,
  particles: true,
};

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onStateChange: (state: GameState) => void;
  onItemPrompt: (prompt: string | null) => void;
  onMonsterWarning: (intensity: number) => void;
  onLogFound: (log: GameLog) => void;
  onSectorVisited: (sector: SectorInfo) => void;
  onEscapeCountdown: (seconds: number | null) => void;
  onFpsUpdate?: (fps: number) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: GameEngineCallbacks;

  // Optimization & Graphics
  public graphicsSettings: GraphicsSettings = { ...DEFAULT_GRAPHICS_SETTINGS };
  private corridorLightPositions: Array<{ x: number; z: number }> = [];
  private pooledPointLights: THREE.PointLight[] = [];
  private fixedLights: Array<{ light: THREE.PointLight; x: number; z: number; range: number }> = [];
  private lightCullTimer: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  public currentFps: number = 60;

  // Three.js Core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private isRunning: boolean = false;

  // Player & Controls (FPS YXZ Convention)
  private playerPos: THREE.Vector3 = new THREE.Vector3();
  private playerVelocity: THREE.Vector3 = new THREE.Vector3();
  private pitch: number = 0; // Vertical look angle (radians, clamped to ~79°)
  private yaw: number = 0;   // Horizontal look angle (radians)
  private roll: number = 0;  // Subtle head bob roll (radians)
  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  public isPointerLocked: boolean = false;
  public isMobile: boolean = false;
  public touchMoveVector = { x: 0, y: 0 };
  public touchSprint: boolean = false;
  public touchCrouch: boolean = false;
  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private justLocked: boolean = false;
  private keys: { [key: string]: boolean } = {};

  // Stats
  public stats: PlayerStats = {
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isCrouching: false,
    battery: 100,
    flashlightOn: true,
    heartRate: 72,
    sanity: 100,
    flares: 2,
    batteries: 1,
    syringes: 1,
    adrenalineActive: false,
    adrenalineTimeLeft: 0,
  };

  // Lighting & Flashlight
  private flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;
  private ambientLight: THREE.AmbientLight;
  private flashlightFlickerTimer: number = 0;

  // Game World
  private mazeData: GeneratedMaze;
  private monster: MonsterController;
  private items: ItemEntity[] = [];
  private itemMeshes: Map<string, THREE.Object3D> = new Map();
  private flares: FlareEntity[] = [];
  private flareLightGroup: THREE.Group = new THREE.Group();
  private exitDoorMesh: THREE.Mesh | null = null;

  // Extraction Sequence
  private isEscapeActive: boolean = false;
  private escapeTimer: number = 25;
  private escapeAlarmTimer: number = 0;

  // Camera Bobbing & Head Movement
  private bobTimer: number = 0;
  private footstepTimer: number = 0;

  // Jumpscare Animation
  private isJumpscare: boolean = false;
  private jumpscareProgress: number = 0;

  // Options
  public mouseSensitivity: number = 0.0022;
  public difficulty: Difficulty = 'NORMAL';

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks, initialGraphics?: GraphicsSettings) {
    this.container = container;
    this.callbacks = callbacks;
    if (initialGraphics) {
      this.graphicsSettings = { ...initialGraphics };
    }

    // Auto-detect mobile / touch capabilities
    this.isMobile = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    );

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040507);
    this.scene.fog = new THREE.FogExp2(0x040507, 0.048);

    // 2. Camera with adaptive far plane and standard FPS YXZ rotation order
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(74, aspect, 0.1, this.graphicsSettings.viewDistance);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // 3. Renderer with optimized pixel ratio & power configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Disabling MSAA gives a substantial 30-40% boost on laptops
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio, 1.2) * this.graphicsSettings.renderScale;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = this.graphicsSettings.shadows;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Much faster than PCFSoft
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    // 4. Lighting Setup
    this.ambientLight = new THREE.AmbientLight(0x14181e, 0.38);
    this.scene.add(this.ambientLight);

    // Dynamic Player Flashlight
    this.flashlight = new THREE.SpotLight(0xfff4e0, 5.0, 36, Math.PI / 5.2, 0.45, 1.2);
    this.flashlight.castShadow = this.graphicsSettings.shadows;
    this.flashlight.shadow.mapSize.width = 512; // 512 is 4x lighter than 1024
    this.flashlight.shadow.mapSize.height = 512;
    this.flashlight.shadow.camera.near = 0.2;
    this.flashlight.shadow.camera.far = 38;

    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.camera.add(this.flashlight);
    this.scene.add(this.flareLightGroup);

    // 5. Build Maze & World
    this.mazeData = generateMaze();
    this.items = [...this.mazeData.items];
    this.buildMazeWorld();

    // Set player spawn
    this.playerPos.set(this.mazeData.spawnPoint.x, 1.7, this.mazeData.spawnPoint.z);
    this.camera.position.copy(this.playerPos);

    // 6. Spawn Monster
    const monsterStart = this.mazeData.sectors.find((s) => s.id === 'SECTOR_D') || this.mazeData.sectors[0];
    this.monster = new MonsterController(monsterStart.x, monsterStart.z);
    this.monster.setParticlesVisible(this.graphicsSettings.particles);
    this.scene.add(this.monster.group);

    // 7. Event Listeners
    this.setupInputs();
    window.addEventListener('resize', this.onResize);
  }

  private buildMazeWorld() {
    const size = MAZE_DIM;
    const grid = this.mazeData.grid;

    // Textures
    const wallTex = TextureGenerator.getWallTexture();
    const floorTex = TextureGenerator.getFloorTexture();
    const ceilTex = TextureGenerator.getCeilingTexture();

    // Floor & Ceiling
    const totalSize = size * CELL_SIZE;
    const floorGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.55,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalSize / 2, 0, totalSize / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ceilGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    const ceilMat = new THREE.MeshStandardMaterial({
      map: ceilTex,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(totalSize / 2, WALL_HEIGHT, totalSize / 2);
    this.scene.add(ceiling);

    // Wall Geometry - InstancedMesh for extreme speed across massive maze
    // Each wall is a box
    const wallThickness = 0.5;
    const wallGeo = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, wallThickness);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.85,
      metalness: 0.15,
    });

    // Estimate wall segment count
    const matrices: THREE.Matrix4[] = [];
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempRot = new THREE.Euler();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);

    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        const cell = grid[x][z];
        const cx = x * CELL_SIZE;
        const cz = z * CELL_SIZE;

        // North wall
        if (cell.walls.north) {
          tempPos.set(cx, WALL_HEIGHT / 2, cz - CELL_SIZE / 2);
          tempRot.set(0, 0, 0);
          tempQuat.setFromEuler(tempRot);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
          matrices.push(tempMatrix.clone());
        }
        // South wall (only on edge to avoid doubles)
        if (z === size - 1 && cell.walls.south) {
          tempPos.set(cx, WALL_HEIGHT / 2, cz + CELL_SIZE / 2);
          tempRot.set(0, 0, 0);
          tempQuat.setFromEuler(tempRot);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
          matrices.push(tempMatrix.clone());
        }
        // West wall
        if (cell.walls.west) {
          tempPos.set(cx - CELL_SIZE / 2, WALL_HEIGHT / 2, cz);
          tempRot.set(0, Math.PI / 2, 0);
          tempQuat.setFromEuler(tempRot);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
          matrices.push(tempMatrix.clone());
        }
        // East wall (only on edge)
        if (x === size - 1 && cell.walls.east) {
          tempPos.set(cx + CELL_SIZE / 2, WALL_HEIGHT / 2, cz);
          tempRot.set(0, Math.PI / 2, 0);
          tempQuat.setFromEuler(tempRot);
          tempMatrix.compose(tempPos, tempQuat, tempScale);
          matrices.push(tempMatrix.clone());
        }

        // Corridor Overhead Cage Light
        if (cell.hasLight) {
          this.corridorLightPositions.push({ x: cx, z: cz });
          this.createCorridorLightFixture(cx, cz);
        }
      }
    }

    const instancedWalls = new THREE.InstancedMesh(wallGeo, wallMat, matrices.length);
    instancedWalls.castShadow = this.graphicsSettings.shadows;
    instancedWalls.receiveShadow = this.graphicsSettings.shadows;
    for (let i = 0; i < matrices.length; i++) {
      instancedWalls.setMatrixAt(i, matrices[i]);
    }
    instancedWalls.instanceMatrix.needsUpdate = true;
    this.scene.add(instancedWalls);

    // Initialize small pool of corridor lights (max 4 lights in memory!)
    for (let i = 0; i < 4; i++) {
      const pLight = new THREE.PointLight(0xffd59e, 0.9, 13, 1.8);
      pLight.visible = false;
      this.scene.add(pLight);
      this.pooledPointLights.push(pLight);
    }

    // Build Sector Landmarks & Beacons
    for (const sector of this.mazeData.sectors) {
      this.createSectorChamber(sector);
    }

    // Build Spawn Safe Room details
    this.createSpawnHub();

    // Build North Blast Exit Gate
    this.createExitBlastGate();

    // Build Item Meshes
    this.buildItemMeshes();
  }

  private createCorridorLightFixture(x: number, z: number) {
    const fixtureGeo = new THREE.BoxGeometry(0.5, 0.15, 0.5);
    const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffe8ba });
    const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixture.position.set(x, WALL_HEIGHT - 0.08, z);
    this.scene.add(fixture);
  }

  private createSectorChamber(sector: SectorInfo) {
    // Pedestal for Anomaly Core
    const pedestalGeo = new THREE.CylinderGeometry(0.7, 0.9, 0.8, 8);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      roughness: 0.5,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(sector.x, 0.4, sector.z);
    this.scene.add(pedestal);

    // Sector Ceiling Lamp (Distance-culled, no shadow pass)
    const beaconLight = new THREE.PointLight(sector.lightColor, 2.5, 24, 1.2);
    beaconLight.position.set(sector.x, WALL_HEIGHT - 0.6, sector.z);
    beaconLight.visible = false;
    this.scene.add(beaconLight);
    this.fixedLights.push({ light: beaconLight, x: sector.x, z: sector.z, range: 35 });

    // Pillar rings around chamber
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
      const px = sector.x + Math.cos(angle) * 4.5;
      const pz = sector.z + Math.sin(angle) * 4.5;
      const colGeo = new THREE.CylinderGeometry(0.35, 0.35, WALL_HEIGHT, 8);
      const col = new THREE.Mesh(colGeo, pedestalMat);
      col.position.set(px, WALL_HEIGHT / 2, pz);
      this.scene.add(col);
    }
  }

  private createSpawnHub() {
    const hub = this.mazeData.spawnPoint;

    // Terminal desk
    const deskGeo = new THREE.BoxGeometry(2.4, 0.9, 1.2);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1f242b });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(hub.x, 0.45, hub.z - 4);
    this.scene.add(desk);

    // Monitor screen with green scanlines
    const screenGeo = new THREE.BoxGeometry(1.2, 0.8, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(hub.x, 1.3, hub.z - 4);
    this.scene.add(screen);

    const screenLight = new THREE.PointLight(0x22c55e, 1.4, 8);
    screenLight.position.set(hub.x, 1.4, hub.z - 3.6);
    this.scene.add(screenLight);
    this.fixedLights.push({ light: screenLight, x: hub.x, z: hub.z, range: 25 });
  }

  private createExitBlastGate() {
    const exit = this.mazeData.exitPoint;
    const doorGeo = new THREE.BoxGeometry(5.0, WALL_HEIGHT, 0.6);
    const doorMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.getBlastDoorTexture(false),
      roughness: 0.5,
      metalness: 0.7,
    });
    this.exitDoorMesh = new THREE.Mesh(doorGeo, doorMat);
    this.exitDoorMesh.position.set(exit.x, WALL_HEIGHT / 2, exit.z);
    this.scene.add(this.exitDoorMesh);

    // Warning Beacon on door
    const exitBeacon = new THREE.PointLight(0xef4444, 2.0, 16);
    exitBeacon.position.set(exit.x, WALL_HEIGHT - 0.5, exit.z + 1.2);
    this.scene.add(exitBeacon);
    this.fixedLights.push({ light: exitBeacon, x: exit.x, z: exit.z, range: 30 });
  }

  private buildItemMeshes() {
    for (const item of this.items) {
      if (item.type === 'CORE') {
        // Floating Anomaly Core Relic
        const coreGroup = new THREE.Group();
        coreGroup.position.set(item.x, item.y, item.z);

        const coreGeo = new THREE.OctahedronGeometry(0.38, 0);
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x0099cc,
          emissiveIntensity: 0.9,
          roughness: 0.1,
          metalness: 0.9,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreGroup.add(coreMesh);

        // Orbital Ring
        const ringGeo = new THREE.TorusGeometry(0.6, 0.03, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        coreGroup.add(ring);

        const glowLight = new THREE.PointLight(0x38bdf8, 1.8, 6);
        coreGroup.add(glowLight);

        this.scene.add(coreGroup);
        this.itemMeshes.set(item.id, coreGroup);
      } else if (item.type === 'BATTERY') {
        const batGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.35, 8);
        const batMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8 });
        const batMesh = new THREE.Mesh(batGeo, batMat);
        batMesh.position.set(item.x, item.y, item.z);
        batMesh.rotation.z = Math.PI / 2;
        this.scene.add(batMesh);
        this.itemMeshes.set(item.id, batMesh);
      } else if (item.type === 'FLARE') {
        const flareGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 6);
        const flareMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 });
        const flareMesh = new THREE.Mesh(flareGeo, flareMat);
        flareMesh.position.set(item.x, item.y, item.z);
        this.scene.add(flareMesh);
        this.itemMeshes.set(item.id, flareMesh);
      } else if (item.type === 'SYRINGE') {
        const syrGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6);
        const syrMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2 });
        const syrMesh = new THREE.Mesh(syrGeo, syrMat);
        syrMesh.position.set(item.x, item.y, item.z);
        this.scene.add(syrMesh);
        this.itemMeshes.set(item.id, syrMesh);
      }
    }
  }

  private applyLookDelta(dx: number, dy: number) {
    if (this.isJumpscare) return;

    // Filter out huge browser mouse centering glitch spikes (e.g., when pointer lock initiates)
    if (Math.abs(dx) > 160 || Math.abs(dy) > 160) return;

    // Clamp single frame delta for silky smooth turning
    const clampedDx = Math.max(-80, Math.min(80, dx));
    const clampedDy = Math.max(-80, Math.min(80, dy));

    this.yaw -= clampedDx * this.mouseSensitivity;
    this.pitch -= clampedDy * this.mouseSensitivity;

    // Strict vertical clamping: ~-79° to +79° (strictly prevents neck breaking, flips, or gimbal lock)
    const maxPitch = Math.PI * 0.44;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    // Normalize yaw to stay within [-PI, PI] to prevent floating point drift
    while (this.yaw > Math.PI) this.yaw -= Math.PI * 2;
    while (this.yaw < -Math.PI) this.yaw += Math.PI * 2;

    this.updateCameraRotation();
  }

  private updateCameraRotation() {
    if (this.isJumpscare) return;
    this.euler.set(this.pitch, this.yaw, this.roll, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    // Toggle Flashlight (F)
    if (e.code === 'KeyF') {
      this.toggleFlashlight();
    }

    // Throw Flare (G)
    if (e.code === 'KeyG') {
      this.throwFlare();
    }

    // Use Syringe (V or H)
    if (e.code === 'KeyV' || e.code === 'KeyH') {
      this.useSyringe();
    }

    // Reload Flashlight Battery (R)
    if (e.code === 'KeyR') {
      this.reloadBattery();
    }

    // Interact (E)
    if (e.code === 'KeyE') {
      this.tryInteract();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  public setTouchMovement(x: number, y: number, sprint?: boolean, crouch?: boolean) {
    this.touchMoveVector.x = x;
    this.touchMoveVector.y = y;
    if (sprint !== undefined) this.touchSprint = sprint;
    if (crouch !== undefined) this.touchCrouch = crouch;
  }

  public rotateCamera(dx: number, dy: number) {
    // Highly responsive touch look delta
    this.applyLookDelta(dx * 1.35, dy * 1.35);
  }

  public toggleSprint(force?: boolean) {
    this.touchSprint = force !== undefined ? force : !this.touchSprint;
  }

  public toggleCrouch(force?: boolean) {
    this.touchCrouch = force !== undefined ? force : !this.touchCrouch;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (this.isJumpscare) return;
    soundEngine.resume();

    // Only mouse devices trigger pointer lock & mouse drag to avoid interfering with touch controls
    if (e.pointerType === 'mouse') {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;

      if (!this.isPointerLocked) {
        try {
          this.container.requestPointerLock?.();
        } catch {
          // Silently continue with drag fallback
        }
      }
    }
  };

  private onPointerUp = () => {
    this.isDragging = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isJumpscare) return;

    if (this.isPointerLocked) {
      if (this.justLocked) {
        this.justLocked = false;
        return; // Ignore first-frame cursor recentering jump
      }
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      this.applyLookDelta(dx, dy);
    } else if (this.isDragging) {
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.applyLookDelta(dx, dy);
    }
  };

  private onPointerLockChange = () => {
    const isLocked = document.pointerLockElement === this.container;
    this.isPointerLocked = isLocked;
    if (isLocked) {
      this.justLocked = true;
      this.callbacks.onStateChange('PLAYING');
    } else {
      // Do not auto-pause on mobile touch devices when pointer lock is released or unsupported
      if (!this.isMobile) {
        this.callbacks.onStateChange('PAUSED');
      }
    }
  };

  private onPointerLockError = () => {
    console.warn('Pointer lock not supported or blocked; using smooth drag-to-look fallback');
    this.isPointerLocked = false;
  };

  private setupInputs() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    window.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('pointerlockerror', this.onPointerLockError);
  }

  public start() {
    this.isRunning = true;
    this.clock.start();
    soundEngine.init();
    soundEngine.resume();
    this.animate();
  }

  public stop() {
    this.isRunning = false;
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('pointerlockerror', this.onPointerLockError);

    soundEngine.stopAll();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public toggleFlashlight() {
    if (this.stats.battery <= 0) return;
    this.stats.flashlightOn = !this.stats.flashlightOn;
    this.flashlight.visible = this.stats.flashlightOn;
    soundEngine.playFlashlightClick();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public reloadBattery() {
    if (this.stats.batteries > 0 && this.stats.battery < 95) {
      this.stats.batteries--;
      this.stats.battery = Math.min(100, this.stats.battery + 45);
      soundEngine.playItemPickup();
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  public useSyringe() {
    if (this.stats.syringes > 0 && !this.stats.adrenalineActive) {
      this.stats.syringes--;
      this.stats.adrenalineActive = true;
      this.stats.adrenalineTimeLeft = 14;
      this.stats.stamina = this.stats.maxStamina;
      soundEngine.playItemPickup();
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  public throwFlare() {
    if (this.stats.flares <= 0) return;
    this.stats.flares--;
    soundEngine.playFlareThrow();

    // Throw along camera forward vector
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    const flareMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.4, 6),
      new THREE.MeshBasicMaterial({ color: 0xff3333 })
    );
    flareMesh.position.copy(this.playerPos);
    this.flareLightGroup.add(flareMesh);

    const flareLight = new THREE.PointLight(0xff2222, 3.2, 16, 1.4);
    flareLight.position.copy(this.playerPos);
    this.flareLightGroup.add(flareLight);

    this.flares.push({
      id: `active_flare_${Date.now()}`,
      x: this.playerPos.x,
      y: this.playerPos.y,
      z: this.playerPos.z,
      vx: dir.x * 12,
      vy: 3.5,
      vz: dir.z * 12,
      life: 35, // 35 seconds
      light: flareLight,
      mesh: flareMesh,
    });

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public tryInteract() {
    // Check closest item within 2.5m
    let closestItem: ItemEntity | null = null;
    let minDist = 2.8;

    for (const item of this.items) {
      if (item.collected) continue;
      const d = Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z);
      if (d < minDist) {
        closestItem = item;
        minDist = d;
      }
    }

    if (closestItem) {
      closestItem.collected = true;
      const mesh = this.itemMeshes.get(closestItem.id);
      if (mesh) {
        this.scene.remove(mesh);
      }
      soundEngine.playItemPickup();

      if (closestItem.type === 'CORE') {
        const sector = this.mazeData.sectors.find((s) => s.id === closestItem!.sectorId);
        if (sector) {
          sector.coreCollected = true;
          this.callbacks.onSectorVisited(sector);
        }
      } else if (closestItem.type === 'BATTERY') {
        this.stats.batteries++;
      } else if (closestItem.type === 'FLARE') {
        this.stats.flares += 2;
      } else if (closestItem.type === 'SYRINGE') {
        this.stats.syringes++;
      }

      this.callbacks.onStatsUpdate({ ...this.stats });
      return;
    }

    // Check North Blast Exit Door Console
    const exitDist = Math.hypot(this.mazeData.exitPoint.x - this.playerPos.x, this.mazeData.exitPoint.z - this.playerPos.z);
    if (exitDist < 4.5 && !this.isEscapeActive) {
      const allCoresCollected = this.mazeData.sectors.every((s) => s.coreCollected);
      if (allCoresCollected) {
        this.startEscapeCountdown();
      }
    }
  }

  private startEscapeCountdown() {
    this.isEscapeActive = true;
    this.escapeTimer = 25;
    soundEngine.playAlarmLoop();

    // Enrage monster - immediately enters relentless chase towards player!
    this.monster.data.state = 'CHASE';
    this.monster.data.speed = 7.0;
    soundEngine.playMonsterScreech();

    // Change ambient lighting to pulsing emergency red
    this.ambientLight.color.setHex(0x3a0d0d);
  }

  private animate = () => {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // Track real-time FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 400) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      this.callbacks.onFpsUpdate?.(this.currentFps);
    }

    if (this.isJumpscare) {
      this.updateJumpscare(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.updatePlayerMovement(dt);
    this.updateFlashlightAndFlares(dt);
    this.updateMonsterAI(dt);
    this.updateDynamicLighting(dt);
    this.updateInteractionPrompts();
    this.updateExtractionProtocol(dt);
    this.animateItemRelics(dt);

    this.renderer.render(this.scene, this.camera);
  };

  private updateDynamicLighting(dt: number) {
    this.lightCullTimer -= dt;
    if (this.lightCullTimer > 0) return;
    this.lightCullTimer = 0.25; // 4 times/sec is plenty for lighting

    const px = this.playerPos.x;
    const pz = this.playerPos.z;

    // 1. Cull fixed lights by distance (only visible if within range)
    for (const fl of this.fixedLights) {
      const dSq = (fl.x - px) ** 2 + (fl.z - pz) ** 2;
      fl.light.visible = dSq < fl.range * fl.range;
    }

    // 2. Manage pooled corridor lights
    const maxL = this.graphicsSettings.maxLights;
    if (maxL <= 0) {
      for (const pl of this.pooledPointLights) pl.visible = false;
      return;
    }

    // Find nearest corridor fixtures to player
    const candidates: Array<{ x: number; z: number; dSq: number }> = [];
    const maxDistSq = 22 * 22;

    for (const pos of this.corridorLightPositions) {
      const dSq = (pos.x - px) ** 2 + (pos.z - pz) ** 2;
      if (dSq < maxDistSq) {
        candidates.push({ x: pos.x, z: pos.z, dSq });
      }
    }

    candidates.sort((a, b) => a.dSq - b.dSq);

    for (let i = 0; i < this.pooledPointLights.length; i++) {
      const pl = this.pooledPointLights[i];
      if (i < maxL && i < candidates.length) {
        const c = candidates[i];
        pl.position.set(c.x, WALL_HEIGHT - 0.35, c.z);
        pl.visible = true;
      } else {
        pl.visible = false;
      }
    }
  }

  public applyGraphicsSettings(newSettings: GraphicsSettings) {
    this.graphicsSettings = { ...newSettings };

    // 1. Resolution Scale
    const pixelRatio = Math.min(window.devicePixelRatio, 1.25) * newSettings.renderScale;
    this.renderer.setPixelRatio(pixelRatio);

    // 2. Shadows
    this.renderer.shadowMap.enabled = newSettings.shadows;
    this.flashlight.castShadow = newSettings.shadows;

    // 3. View Distance (Frustum clipping)
    this.camera.far = newSettings.viewDistance;
    this.camera.updateProjectionMatrix();

    // 4. Monster Particles
    if (this.monster) {
      this.monster.setParticlesVisible(newSettings.particles);
    }

    // 5. Lighting adjustment
    this.lightCullTimer = 0;
    if (newSettings.preset === 'POTATO') {
      // In potato mode, slight ambient boost to keep atmosphere visible without lights
      this.ambientLight.color.setHex(0x242934);
    } else {
      this.ambientLight.color.setHex(0x14181e);
    }
  }

  private updatePlayerMovement(dt: number) {
    if (!this.isRunning) return;

    // Movement speeds
    const isSprintWanted = this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint;
    const isCrouchWanted = this.keys['KeyC'] || this.keys['ControlLeft'] || this.touchCrouch;

    // Stamina drain or recharge
    if (this.stats.adrenalineActive) {
      this.stats.adrenalineTimeLeft -= dt;
      if (this.stats.adrenalineTimeLeft <= 0) {
        this.stats.adrenalineActive = false;
      }
    }

    let isMoving = false;
    let baseSpeed = 4.2;

    if (isCrouchWanted) {
      this.stats.isCrouching = true;
      this.stats.isSprinting = false;
      baseSpeed = 2.2;
    } else if (isSprintWanted && (this.stats.stamina > 0 || this.stats.adrenalineActive)) {
      this.stats.isSprinting = true;
      this.stats.isCrouching = false;
      baseSpeed = this.stats.adrenalineActive ? 8.2 : 6.8;
      if (!this.stats.adrenalineActive) {
        this.stats.stamina = Math.max(0, this.stats.stamina - 28 * dt);
      }
    } else {
      this.stats.isSprinting = false;
      this.stats.isCrouching = false;
      if (this.stats.stamina < this.stats.maxStamina) {
        this.stats.stamina = Math.min(this.stats.maxStamina, this.stats.stamina + 14 * dt);
      }
    }

    // Direction input vector (Keyboard WASD + Mobile Touch Joystick)
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.x += 1;

    // Add touch joystick input (-1..1)
    if (Math.abs(this.touchMoveVector.x) > 0.04 || Math.abs(this.touchMoveVector.y) > 0.04) {
      moveDir.x += this.touchMoveVector.x;
      moveDir.z += this.touchMoveVector.y;
    }

    const inputMag = moveDir.length();
    if (inputMag > 0.04) {
      isMoving = true;
      const speedFactor = Math.min(1, inputMag);
      moveDir.normalize();

      // Transform direction relative to camera yaw
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const targetVel = forward.multiplyScalar(-moveDir.z).add(right.multiplyScalar(moveDir.x)).multiplyScalar(baseSpeed * speedFactor);
      this.playerVelocity.lerp(targetVel, 12 * dt);

      // Footstep audio
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = this.stats.isSprinting ? 0.32 : this.stats.isCrouching ? 0.65 : 0.46;
        soundEngine.playFootstep(this.stats.isSprinting, this.stats.isCrouching);
      }
    } else {
      this.playerVelocity.lerp(new THREE.Vector3(), 14 * dt);
    }

    // Player position with collision
    const newX = this.playerPos.x + this.playerVelocity.x * dt;
    const newZ = this.playerPos.z + this.playerVelocity.z * dt;

    if (!this.checkWallCollision(newX, this.playerPos.z, 0.45)) {
      this.playerPos.x = newX;
    }
    if (!this.checkWallCollision(this.playerPos.x, newZ, 0.45)) {
      this.playerPos.z = newZ;
    }

    // Head bobbing calculation with smooth roll & height
    const targetHeight = this.stats.isCrouching ? 1.05 : 1.7;
    if (isMoving) {
      this.bobTimer += dt * (this.stats.isSprinting ? 14 : 9);
      const bobY = Math.sin(this.bobTimer) * (this.stats.isSprinting ? 0.05 : 0.025);
      const bobRoll = Math.cos(this.bobTimer * 0.5) * (this.stats.isSprinting ? 0.012 : 0.005);
      this.camera.position.set(this.playerPos.x, targetHeight + bobY, this.playerPos.z);
      this.roll = THREE.MathUtils.lerp(this.roll, bobRoll, 10 * dt);
    } else {
      this.camera.position.set(this.playerPos.x, targetHeight, this.playerPos.z);
      this.roll = THREE.MathUtils.lerp(this.roll, 0, 10 * dt);
    }

    // Refresh camera rotation cleanly using YXZ Euler convention
    this.updateCameraRotation();
  }

  private updateFlashlightAndFlares(dt: number) {
    // Battery drain when flashlight is ON
    if (this.stats.flashlightOn) {
      this.stats.battery = Math.max(0, this.stats.battery - 0.7 * dt);
      if (this.stats.battery <= 0) {
        this.stats.flashlightOn = false;
        this.flashlight.visible = false;
      }
    }

    // Flashlight target follows camera forward
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.flashlightTarget.position.copy(this.camera.position).add(forward.multiplyScalar(10));

    // Dynamic flickering when battery is low or monster is close
    const monsterDist = this.monster.data.distanceToPlayer;
    if (this.stats.flashlightOn) {
      if (monsterDist < 16 || this.stats.battery < 20) {
        this.flashlightFlickerTimer -= dt;
        if (this.flashlightFlickerTimer <= 0) {
          this.flashlightFlickerTimer = 0.05 + Math.random() * 0.15;
          this.flashlight.intensity = Math.random() > 0.4 ? 4.8 : 0.4;
        }
      } else {
        this.flashlight.intensity = 5.0;
      }
    }

    // Flares physics & countdown
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.flareLightGroup.remove(f.mesh);
        this.flareLightGroup.remove(f.light);
        this.flares.splice(i, 1);
        continue;
      }

      // Physics
      f.vy -= 15 * dt; // gravity
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.z += f.vz * dt;

      // Floor bounce
      if (f.y < 0.15) {
        f.y = 0.15;
        f.vy = -f.vy * 0.4;
        f.vx *= 0.8;
        f.vz *= 0.8;
      }

      f.mesh.position.set(f.x, f.y, f.z);
      f.light.position.set(f.x, f.y + 0.2, f.z);
      // Flickering flare light
      f.light.intensity = 2.5 + Math.sin(Date.now() * 0.03) * 0.8;
    }
  }

  private updateMonsterAI(dt: number) {
    const flareCoords = this.flares.map((f) => ({ x: f.x, z: f.z, life: f.life }));

    this.monster.update(
      dt,
      this.playerPos,
      this.stats.isSprinting,
      this.stats.isCrouching,
      this.stats.flashlightOn,
      flareCoords,
      (x, z, r) => this.checkWallCollision(x, z, r),
      (x1, z1, x2, z2) => this.hasLineOfSight(x1, z1, x2, z2)
    );

    const dist = this.monster.data.distanceToPlayer;

    // Dynamic heart rate calculation
    let targetBpm = 72;
    if (dist < 35) {
      targetBpm = Math.round(72 + (1 - dist / 35) * 95);
    }
    if (this.stats.isSprinting) targetBpm += 20;
    this.stats.heartRate = Math.round(THREE.MathUtils.lerp(this.stats.heartRate, targetBpm, 0.08));

    // Audio & UI heartbeat and monster proximity static
    soundEngine.updateHeartbeat(this.stats.heartRate, dist);
    const warningIntensity = Math.max(0, 1 - dist / 28);
    this.callbacks.onMonsterWarning(warningIntensity);
    this.callbacks.onStatsUpdate({ ...this.stats });

    // Jumpscare death trigger!
    if (dist < 1.65 && !this.isJumpscare) {
      this.triggerJumpscare();
    }
  }

  private triggerJumpscare() {
    this.isJumpscare = true;
    this.jumpscareProgress = 0;
    soundEngine.playJumpscare();

    // Lock monster in front of camera
    const lookDir = new THREE.Vector3().subVectors(this.monster.group.position, this.camera.position).normalize();
    this.camera.lookAt(this.monster.group.position.x, 2.4, this.monster.group.position.z);
  }

  private updateJumpscare(dt: number) {
    this.jumpscareProgress += dt;

    // Violent camera shake
    this.camera.position.x = this.playerPos.x + (Math.random() - 0.5) * 0.35;
    this.camera.position.y = 1.7 + (Math.random() - 0.5) * 0.35;
    this.camera.position.z = this.playerPos.z + (Math.random() - 0.5) * 0.35;

    // Force camera view right into monster glowing eyes
    this.camera.lookAt(
      this.monster.group.position.x + (Math.random() - 0.5) * 0.1,
      2.4 + (Math.random() - 0.5) * 0.1,
      this.monster.group.position.z + (Math.random() - 0.5) * 0.1
    );

    if (this.jumpscareProgress > 1.8) {
      document.exitPointerLock?.();
      this.callbacks.onStateChange('GAMEOVER');
    }
  }

  private updateInteractionPrompts() {
    // Check items
    let prompt: string | null = null;
    let minDist = 2.8;

    for (const item of this.items) {
      if (item.collected) continue;
      const d = Math.hypot(item.x - this.playerPos.x, item.z - this.playerPos.z);
      if (d < minDist) {
        minDist = d;
        prompt = `[E] ${item.name} 획득`;
      }
    }

    // Check Exit Gate
    const exitDist = Math.hypot(this.mazeData.exitPoint.x - this.playerPos.x, this.mazeData.exitPoint.z - this.playerPos.z);
    if (exitDist < 4.5) {
      const allCores = this.mazeData.sectors.every((s) => s.coreCollected);
      if (!this.isEscapeActive) {
        if (allCores) {
          prompt = '[E] 비상 탈출 시퀀스 가동 (전력 100%)';
        } else {
          const count = this.mazeData.sectors.filter((s) => s.coreCollected).length;
          prompt = `탈출 격벽 잠김 (에너지 코어 필요: ${count}/4)`;
        }
      } else {
        if (this.escapeTimer <= 0) {
          prompt = '[탈출 성공] 격벽 통과 중...';
        } else {
          prompt = `격벽 개방 중... 버텨라! (${Math.ceil(this.escapeTimer)}초)`;
        }
      }
    }

    this.callbacks.onItemPrompt(prompt);
  }

  private updateExtractionProtocol(dt: number) {
    if (!this.isEscapeActive) return;

    this.escapeTimer -= dt;
    this.callbacks.onEscapeCountdown(Math.max(0, Math.ceil(this.escapeTimer)));

    // Alarm pulsing sound every 2.5s
    this.escapeAlarmTimer -= dt;
    if (this.escapeAlarmTimer <= 0) {
      this.escapeAlarmTimer = 2.2;
      soundEngine.playAlarmLoop();
    }

    // Open Door when timer finishes
    if (this.escapeTimer <= 0 && this.exitDoorMesh) {
      if (this.exitDoorMesh.position.y < WALL_HEIGHT * 1.5) {
        this.exitDoorMesh.position.y += dt * 3.5; // Slide up
      }

      // Check player reached exit passage!
      const distToExit = Math.hypot(this.mazeData.exitPoint.x - this.playerPos.x, this.mazeData.exitPoint.z - this.playerPos.z);
      if (distToExit < 3.2 && this.playerPos.z < this.mazeData.exitPoint.z + 1.0) {
        document.exitPointerLock?.();
        this.callbacks.onStateChange('VICTORY');
      }
    }
  }

  private animateItemRelics(dt: number) {
    // Rotate and float cores
    for (const [id, mesh] of this.itemMeshes.entries()) {
      if (id.startsWith('core_')) {
        mesh.rotation.y += dt * 1.4;
        mesh.position.y = 1.1 + Math.sin(Date.now() * 0.003) * 0.14;
      }
    }
  }

  // Fast Circle-AABB Wall Collision
  public checkWallCollision(px: number, pz: number, radius: number): boolean {
    const size = MAZE_DIM;
    const grid = this.mazeData.grid;

    // Cell indices
    const cellX = Math.round(px / CELL_SIZE);
    const cellZ = Math.round(pz / CELL_SIZE);

    // Boundary checks
    if (cellX < 0 || cellX >= size || cellZ < 0 || cellZ >= size) return true;

    const minCx = Math.max(0, cellX - 1);
    const maxCx = Math.min(size - 1, cellX + 1);
    const minCz = Math.max(0, cellZ - 1);
    const maxCz = Math.min(size - 1, cellZ + 1);

    const half = CELL_SIZE / 2;
    const wallThick = 0.25;

    // Check neighboring cells
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const cell = grid[cx][cz];
        const cellCenterX = cx * CELL_SIZE;
        const cellCenterZ = cz * CELL_SIZE;

        // North wall box
        if (cell.walls.north) {
          if (this.circleBoxOverlap(px, pz, radius, cellCenterX - half, cellCenterZ - half - wallThick, cellCenterX + half, cellCenterZ - half + wallThick)) {
            return true;
          }
        }
        // South wall box
        if (cell.walls.south) {
          if (this.circleBoxOverlap(px, pz, radius, cellCenterX - half, cellCenterZ + half - wallThick, cellCenterX + half, cellCenterZ + half + wallThick)) {
            return true;
          }
        }
        // West wall box
        if (cell.walls.west) {
          if (this.circleBoxOverlap(px, pz, radius, cellCenterX - half - wallThick, cellCenterZ - half, cellCenterX - half + wallThick, cellCenterZ + half)) {
            return true;
          }
        }
        // East wall box
        if (cell.walls.east) {
          if (this.circleBoxOverlap(px, pz, radius, cellCenterX + half - wallThick, cellCenterZ - half, cellCenterX + half + wallThick, cellCenterZ + half)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private circleBoxOverlap(cx: number, cz: number, r: number, minX: number, minZ: number, maxX: number, maxZ: number): boolean {
    const closestX = Math.max(minX, Math.min(cx, maxX));
    const closestZ = Math.max(minZ, Math.min(cz, maxZ));
    const distX = cx - closestX;
    const distZ = cz - closestZ;
    return distX * distX + distZ * distZ < r * r;
  }

  // Fast Line of sight check across grid cells
  public hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
    const dSq = (x2 - x1) ** 2 + (z2 - z1) ** 2;
    // Beyond 32m, facility fog completely obscures line of sight
    if (dSq > 32 * 32) return false;

    const dist = Math.sqrt(dSq);
    const steps = Math.max(4, Math.min(10, Math.ceil(dist / 1.6)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const testX = x1 + (x2 - x1) * t;
      const testZ = z1 + (z2 - z1) * t;
      if (this.checkWallCollision(testX, testZ, 0.2)) {
        return false;
      }
    }
    return true;
  }

  public getPlayerPosition() {
    return { x: this.playerPos.x, z: this.playerPos.z, yaw: this.yaw };
  }

  public getMonsterData() {
    return this.monster.data;
  }

  public getSectors() {
    return this.mazeData.sectors;
  }

  public getMazeGrid() {
    return this.mazeData.grid;
  }

  public getLogs() {
    return this.mazeData.logs;
  }
}
