export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY';

export type Difficulty = 'NORMAL' | 'NIGHTMARE' | 'STORY';

export interface PlayerStats {
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isHiding: boolean; // True when sheltered inside a wardrobe/locker
  battery: number; // 0 - 100
  flashlightOn: boolean;
  heartRate: number; // 60 - 180
  sanity: number; // 0 - 100
  flares: number;
  batteries: number;
  syringes: number;
  adrenalineActive: boolean;
  adrenalineTimeLeft: number;
}

export interface WardrobeEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number; // facing angle out into corridor
  mesh?: any;
}

export interface SectorInfo {
  id: string;
  name: string;
  koreanName: string;
  color: string;
  lightColor: number;
  coreCollected: boolean;
  x: number;
  z: number;
}

export interface ItemEntity {
  id: string;
  type: 'BATTERY' | 'FLARE' | 'SYRINGE' | 'CORE' | 'DOCUMENT';
  name: string;
  sectorId?: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh?: any;
}

export interface FlareEntity {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number; // seconds
  light?: any;
  mesh?: any;
}

export type MonsterState = 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'SEARCHING' | 'ATTACK' | 'FLEEING';

export interface MonsterData {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: MonsterState;
  speed: number;
  alertLevel: number; // 0 - 100
  targetX: number;
  targetZ: number;
  lastKnownPlayerPos?: { x: number; z: number };
  detectedPlayer: boolean;
  distanceToPlayer: number;
}

export type GraphicsPreset = 'POTATO' | 'PERFORMANCE' | 'BALANCED' | 'QUALITY';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  renderScale: number; // 0.5, 0.75, 1.0
  shadows: boolean;
  maxLights: number; // 0, 2, 4
  viewDistance: number; // 35, 55, 80
  showFps: boolean;
  particles: boolean;
}

export interface GameSettings {
  mouseSensitivity: number;
  masterVolume: number;
  difficulty: Difficulty;
  retroVhsEffect: boolean;
  headBobbing: boolean;
  graphics: GraphicsSettings;
}

export interface MazeCell {
  x: number;
  z: number;
  visited: boolean;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  isRoom: boolean;
  roomId?: string;
  sector?: string;
  hasLight: boolean;
}

export interface GameLog {
  id: string;
  title: string;
  author: string;
  text: string;
  date: string;
}
