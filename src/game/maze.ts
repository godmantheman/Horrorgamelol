import { MazeCell, SectorInfo, ItemEntity, GameLog, WardrobeEntity } from '../types';

export const CELL_SIZE = 5; // 5 meters per cell
export const WALL_HEIGHT = 4.2; // 4.2 meters high walls
export const MAZE_DIM = 35; // 35x35 grid = 175m x 175m massive complex

export interface GeneratedMaze {
  grid: MazeCell[][];
  sectors: SectorInfo[];
  items: ItemEntity[];
  wardrobes: WardrobeEntity[];
  spawnPoint: { x: number; z: number };
  exitPoint: { x: number; z: number };
  logs: GameLog[];
}

export function generateMaze(): GeneratedMaze {
  const size = MAZE_DIM;
  const grid: MazeCell[][] = [];

  // 1. Initialize grid
  for (let x = 0; x < size; x++) {
    grid[x] = [];
    for (let z = 0; z < size; z++) {
      grid[x][z] = {
        x,
        z,
        visited: false,
        walls: { north: true, south: true, east: true, west: true },
        isRoom: false,
        hasLight: false,
      };
    }
  }

  // 2. Define Major Sector Chambers
  const center = Math.floor(size / 2);
  const offset = Math.floor(size / 3);

  const roomDefs = [
    // Safe Spawn Hub
    {
      id: 'HUB',
      name: 'Safe Haven Hub',
      koreanName: '중앙 통제실 (안전 지대)',
      cx: center,
      cz: center,
      radius: 2,
      color: '#3b82f6',
      lightColor: 0x60a5fa,
      isSpawn: true,
    },
    // Sector A: Water Treatment
    {
      id: 'SECTOR_A',
      name: 'Sector Alpha: Drainage Basin',
      koreanName: '알파 구역: 정수 폐기 시설',
      cx: center - offset,
      cz: center - offset,
      radius: 2,
      color: '#10b981',
      lightColor: 0x34d399,
      coreName: '에너지 코어 α (Alpha)',
    },
    // Sector B: Cryo Storage
    {
      id: 'SECTOR_B',
      name: 'Sector Beta: Cryo Vault',
      koreanName: '베타 구역: 극저온 보관소',
      cx: center + offset,
      cz: center - offset,
      radius: 2,
      color: '#06b6d4',
      lightColor: 0x67e8f9,
      coreName: '에너지 코어 β (Beta)',
    },
    // Sector C: Power Plant
    {
      id: 'SECTOR_C',
      name: 'Sector Gamma: Substation',
      koreanName: '감마 구역: 고압 발전 설비',
      cx: center - offset,
      cz: center + offset,
      radius: 2,
      color: '#f59e0b',
      lightColor: 0xfcd34d,
      coreName: '에너지 코어 γ (Gamma)',
    },
    // Sector D: Containment Facility
    {
      id: 'SECTOR_D',
      name: 'Sector Delta: Red Bio-Chamber',
      koreanName: '델타 구역: 위험 생체 격리실',
      cx: center + offset,
      cz: center + offset,
      radius: 2,
      color: '#ef4444',
      lightColor: 0xf87171,
      coreName: '에너지 코어 δ (Delta)',
    },
    // Exit Vault Gate (North boundary)
    {
      id: 'EXIT',
      name: 'Deep Vault: Blast Exit Door',
      koreanName: '최심부 격벽 탈출구',
      cx: center,
      cz: 2,
      radius: 2,
      color: '#a855f7',
      lightColor: 0xc084fc,
      isExit: true,
    },
  ];

  // Carve out the rooms first
  for (const r of roomDefs) {
    for (let rx = r.cx - r.radius; rx <= r.cx + r.radius; rx++) {
      for (let rz = r.cz - r.radius; rz <= r.cz + r.radius; rz++) {
        if (rx >= 1 && rx < size - 1 && rz >= 1 && rz < size - 1) {
          const cell = grid[rx][rz];
          cell.isRoom = true;
          cell.roomId = r.id;
          cell.sector = r.id;
          // knock down interior walls inside room
          if (rx > r.cx - r.radius) {
            cell.walls.west = false;
            grid[rx - 1][rz].walls.east = false;
          }
          if (rx < r.cx + r.radius) {
            cell.walls.east = false;
            grid[rx + 1][rz].walls.west = false;
          }
          if (rz > r.cz - r.radius) {
            cell.walls.north = false;
            grid[rx][rz - 1].walls.south = false;
          }
          if (rz < r.cz + r.radius) {
            cell.walls.south = false;
            grid[rx][rz + 1].walls.north = false;
          }
        }
      }
    }
  }

  // 3. DFS Maze generation with backtrack stack
  const stack: [number, number][] = [];
  const startX = 1;
  const startZ = 1;
  grid[startX][startZ].visited = true;
  stack.push([startX, startZ]);

  const directions = [
    { dx: 0, dz: -1, wall: 'north', opp: 'south' },
    { dx: 0, dz: 1, wall: 'south', opp: 'north' },
    { dx: 1, dz: 0, wall: 'east', opp: 'west' },
    { dx: -1, dz: 0, wall: 'west', opp: 'east' },
  ];

  while (stack.length > 0) {
    const [cx, cz] = stack[stack.length - 1];
    // Find unvisited neighbors
    const neighbors: { x: number; z: number; dir: (typeof directions)[0] }[] = [];

    for (const dir of directions) {
      const nx = cx + dir.dx;
      const nz = cz + dir.dz;
      if (nx >= 0 && nx < size && nz >= 0 && nz < size) {
        if (!grid[nx][nz].visited) {
          neighbors.push({ x: nx, z: nz, dir });
        }
      }
    }

    if (neighbors.length > 0) {
      // Pick random neighbor
      const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
      (grid[cx][cz].walls as any)[chosen.dir.wall] = false;
      (grid[chosen.x][chosen.z].walls as any)[chosen.dir.opp] = false;
      grid[chosen.x][chosen.z].visited = true;
      stack.push([chosen.x, chosen.z]);
    } else {
      stack.pop();
    }
  }

  // 4. Punch loop holes (remove ~14% of inner walls) to allow loops & flanking
  for (let x = 1; x < size - 1; x++) {
    for (let z = 1; z < size - 1; z++) {
      if (Math.random() < 0.14) {
        if (Math.random() < 0.5 && grid[x][z].walls.east) {
          grid[x][z].walls.east = false;
          grid[x + 1][z].walls.west = false;
        } else if (grid[x][z].walls.south) {
          grid[x][z].walls.south = false;
          grid[x][z + 1].walls.north = false;
        }
      }
    }
  }

  // Ensure rooms are opened into neighboring corridors on all 4 card directions
  for (const r of roomDefs) {
    const doorways = [
      { x: r.cx, z: r.cz - r.radius, dir: 'north', opp: 'south', nx: r.cx, nz: r.cz - r.radius - 1 },
      { x: r.cx, z: r.cz + r.radius, dir: 'south', opp: 'north', nx: r.cx, nz: r.cz + r.radius + 1 },
      { x: r.cx + r.radius, z: r.cz, dir: 'east', opp: 'west', nx: r.cx + r.radius + 1, nz: r.cz },
      { x: r.cx - r.radius, z: r.cz, dir: 'west', opp: 'east', nx: r.cx - r.radius - 1, nz: r.cz },
    ];
    for (const d of doorways) {
      if (d.nx >= 0 && d.nx < size && d.nz >= 0 && d.nz < size) {
        (grid[d.x][d.z].walls as any)[d.dir] = false;
        (grid[d.nx][d.nz].walls as any)[d.opp] = false;
      }
    }
  }

  // 5. Add corridor lights sporadically
  for (let x = 2; x < size - 2; x += 3) {
    for (let z = 2; z < size - 2; z += 3) {
      if (!grid[x][z].isRoom && Math.random() < 0.65) {
        grid[x][z].hasLight = true;
      }
    }
  }

  // 6. Spawn Items
  const items: ItemEntity[] = [];
  const sectors: SectorInfo[] = [];

  // Add Sector Cores
  for (const r of roomDefs) {
    if (!r.isSpawn && !r.isExit && r.coreName) {
      sectors.push({
        id: r.id,
        name: r.name,
        koreanName: r.koreanName,
        color: r.color,
        lightColor: r.lightColor,
        coreCollected: false,
        x: r.cx * CELL_SIZE,
        z: r.cz * CELL_SIZE,
      });

      items.push({
        id: `core_${r.id}`,
        type: 'CORE',
        name: r.coreName,
        sectorId: r.id,
        x: r.cx * CELL_SIZE,
        y: 1.1,
        z: r.cz * CELL_SIZE,
        collected: false,
      });
    }
  }

  // Initial supplies in Spawn Hub
  items.push({
    id: 'hub_battery',
    type: 'BATTERY',
    name: '고성능 전지 (+40%)',
    x: center * CELL_SIZE + 3,
    y: 0.8,
    z: center * CELL_SIZE,
    collected: false,
  });
  items.push({
    id: 'hub_flare',
    type: 'FLARE',
    name: '비상용 조명탄 x2',
    x: center * CELL_SIZE - 3,
    y: 0.8,
    z: center * CELL_SIZE,
    collected: false,
  });

  // Scatter Batteries, Flares, Syringes throughout the large corridors
  let batteryCount = 0;
  let flareCount = 0;
  let syringeCount = 0;

  for (let x = 2; x < size - 2; x++) {
    for (let z = 2; z < size - 2; z++) {
      if (grid[x][z].isRoom) continue;

      const roll = Math.random();
      if (roll < 0.055 && batteryCount < 14) {
        items.push({
          id: `item_bat_${x}_${z}`,
          type: 'BATTERY',
          name: '손전등 충전 배터리',
          x: x * CELL_SIZE,
          y: 0.6,
          z: z * CELL_SIZE,
          collected: false,
        });
        batteryCount++;
      } else if (roll < 0.095 && flareCount < 10) {
        items.push({
          id: `item_flare_${x}_${z}`,
          type: 'FLARE',
          name: '비상용 섬광탄',
          x: x * CELL_SIZE,
          y: 0.6,
          z: z * CELL_SIZE,
          collected: false,
        });
        flareCount++;
      } else if (roll < 0.125 && syringeCount < 6) {
        items.push({
          id: `item_syr_${x}_${z}`,
          type: 'SYRINGE',
          name: '아드레날린 주사기',
          x: x * CELL_SIZE,
          y: 0.6,
          z: z * CELL_SIZE,
          collected: false,
        });
        syringeCount++;
      }
    }
  }

  // 7. Wardrobes / Lockers (옷장 / 캐비닛)
  const wardrobes: WardrobeEntity[] = [];

  // Spawn Hub Lockers
  wardrobes.push({
    id: 'wardrobe_hub_1',
    x: center * CELL_SIZE - 4,
    y: 0,
    z: center * CELL_SIZE + 3.8,
    rotationY: 0,
  });
  wardrobes.push({
    id: 'wardrobe_hub_2',
    x: center * CELL_SIZE + 4,
    y: 0,
    z: center * CELL_SIZE + 3.8,
    rotationY: 0,
  });

  // Sector Chambers Lockers (1 in each sector)
  for (const s of sectors) {
    wardrobes.push({
      id: `wardrobe_${s.id}`,
      x: s.x + 3.5,
      y: 0,
      z: s.z + 3.5,
      rotationY: Math.PI / 4,
    });
  }

  // Corridors Lockers (scattered neatly against walls)
  for (let x = 3; x < size - 3; x += 2) {
    for (let z = 3; z < size - 3; z += 2) {
      if (grid[x][z].isRoom) continue;

      // Check distance to already placed wardrobes
      const cx = x * CELL_SIZE;
      const cz = z * CELL_SIZE;
      const tooClose = wardrobes.some((w) => Math.hypot(w.x - cx, w.z - cz) < 22);
      if (tooClose) continue;

      const cell = grid[x][z];
      if (cell.walls.north) {
        wardrobes.push({
          id: `wardrobe_${x}_${z}`,
          x: cx,
          y: 0,
          z: cz - CELL_SIZE / 2 + 0.65,
          rotationY: 0,
        });
      } else if (cell.walls.south) {
        wardrobes.push({
          id: `wardrobe_${x}_${z}`,
          x: cx,
          y: 0,
          z: cz + CELL_SIZE / 2 - 0.65,
          rotationY: Math.PI,
        });
      } else if (cell.walls.west) {
        wardrobes.push({
          id: `wardrobe_${x}_${z}`,
          x: cx - CELL_SIZE / 2 + 0.65,
          y: 0,
          z: cz,
          rotationY: Math.PI / 2,
        });
      } else if (cell.walls.east) {
        wardrobes.push({
          id: `wardrobe_${x}_${z}`,
          x: cx + CELL_SIZE / 2 - 0.65,
          y: 0,
          z: cz,
          rotationY: -Math.PI / 2,
        });
      }

      if (wardrobes.length >= 18) break;
    }
    if (wardrobes.length >= 18) break;
  }

  // 8. Lore Documents
  const logs: GameLog[] = [
    {
      id: 'log_1',
      title: '연구원 김선우의 기록 (01)',
      author: '선임연구원 김선우',
      date: '격리 실패 3시간 전',
      text: '지하 제로 섹터의 심층 생체 샘플이 변이를 시작했다. 소리와 빛에 비정상적인 공격성을 보인다. 손전등을 켜고 뛰면 복도 끝에서도 냄새를 맡고 달려온다.',
    },
    {
      id: 'log_2',
      title: '긴급 대피 지침서 (02)',
      author: '보안 통제실',
      date: '오염 등급 4 발령',
      text: '북쪽 탈출구 격벽은 4개 구역(알파, 베타, 감마, 델타)의 보조 코어가 모두 정렬되어야 전력이 공급된다. 코어 장착 후 해제 시퀀스 동안 격벽 경보가 울려 놈이 미쳐 날뛸 것이다.',
    },
    {
      id: 'log_3',
      title: '생존 팁: 조명탄 격퇴 & 옷장 은신',
      author: '수색대 생존자',
      date: '핏자국으로 얼룩짐',
      text: '초고열 마그네슘 조명탄(G키)을 던지면 놈이 비명을 지르며 공포에 질려 도망친다! 만약 코앞까지 쫓아왔다면 복도와 구역 곳곳의 대형 옷장/캐비닛[E]에 숨어라. 문을 닫고 숨죽이고 있으면 놈이 냄새를 맡다 포기하고 멀리 떠나간다.',
    },
    {
      id: 'log_4',
      title: '찢겨진 유서',
      author: '의료반 박지은',
      date: '마지막 전언',
      text: '심장 박동이 빨라지면 이미 놈이 근처에 있다는 뜻이다. 전등 깜빡임이 멈추지 않는다면... 뒤돌아보지 말고 달려라.',
    },
  ];

  return {
    grid,
    sectors,
    items,
    wardrobes,
    spawnPoint: { x: center * CELL_SIZE, z: center * CELL_SIZE },
    exitPoint: { x: center * CELL_SIZE, z: 2 * CELL_SIZE },
    logs,
  };
}
