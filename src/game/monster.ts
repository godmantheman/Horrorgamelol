import * as THREE from 'three';
import { MonsterData, MonsterState } from '../types';
import { soundEngine } from './audio';
import { CELL_SIZE } from './maze';

export class MonsterController {
  public data: MonsterData;
  public group: THREE.Group;
  private headMesh: THREE.Mesh;
  private eyesLight: THREE.PointLight;
  private miasmaParticles: THREE.Points;
  private leftArm: THREE.Group;
  private rightArm: THREE.Group;
  private spineBones: THREE.Mesh[] = [];

  private lastStateChangeTime: number = 0;
  private twitchTimer: number = 0;
  private groanTimer: number = 5;
  private walkCycle: number = 0;
  private losCheckTimer: number = 0;
  private cachedLOS: boolean = false;
  private particlesEnabled: boolean = true;
  private fleeTimer: number = 0;

  constructor(startX: number, startZ: number) {
    this.data = {
      x: startX,
      y: 0,
      z: startZ,
      rotationY: 0,
      state: 'PATROL',
      speed: 3.2,
      alertLevel: 0,
      targetX: startX,
      targetZ: startZ,
      detectedPlayer: false,
      distanceToPlayer: 999,
    };

    this.group = new THREE.Group();
    this.group.position.set(startX, 0, startZ);

    // Build Creepy Monster 3D Geometry
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0c0e,
      roughness: 0.9,
      metalness: 0.1,
    });

    const fleshMaterial = new THREE.MeshStandardMaterial({
      color: 0x221115,
      roughness: 0.6,
      bumpScale: 0.05,
    });

    // 1. Torso & Ribcage
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.22, 1.4, 8);
    const torso = new THREE.Mesh(torsoGeo, darkMaterial);
    torso.position.y = 1.6;
    torso.castShadow = true;
    this.group.add(torso);

    // Rib cage protruding spines
    for (let i = 0; i < 5; i++) {
      const ribGeo = new THREE.TorusGeometry(0.38 - i * 0.03, 0.04, 6, 12, Math.PI);
      const rib = new THREE.Mesh(ribGeo, fleshMaterial);
      rib.position.y = 1.3 + i * 0.18;
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = Math.PI;
      this.group.add(rib);
      this.spineBones.push(rib);
    }

    // 2. Head (Distorted, elongated, twitchy skull)
    const headGeo = new THREE.ConeGeometry(0.24, 0.65, 7);
    this.headMesh = new THREE.Mesh(headGeo, darkMaterial);
    this.headMesh.position.y = 2.45;
    this.headMesh.rotation.x = -Math.PI / 1.6;
    this.group.add(this.headMesh);

    // Glowing Crimson Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });

    const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
    eyeLeft.position.set(-0.09, 0.12, 0.18);
    this.headMesh.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
    eyeRight.position.set(0.09, 0.12, 0.18);
    this.headMesh.add(eyeRight);

    // Menacing Red Point Light from the Face
    this.eyesLight = new THREE.PointLight(0xff1122, 1.5, 9);
    this.eyesLight.position.set(0, 2.45, 0.4);
    this.group.add(this.eyesLight);

    // 3. Elongated Left and Right Arms with Spindly Claws
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.45, 2.1, 0);
    const armGeo = new THREE.CylinderGeometry(0.07, 0.04, 1.6, 6);
    armGeo.translate(0, -0.8, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, darkMaterial);
    this.leftArm.add(leftArmMesh);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.45, 2.1, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, darkMaterial);
    this.rightArm.add(rightArmMesh);
    this.group.add(this.rightArm);

    // 4. Legs
    const legGeo = new THREE.CylinderGeometry(0.09, 0.05, 1.5, 6);
    const legL = new THREE.Mesh(legGeo, darkMaterial);
    legL.position.set(-0.22, 0.75, 0);
    this.group.add(legL);

    const legR = new THREE.Mesh(legGeo, darkMaterial);
    legR.position.set(0.22, 0.75, 0);
    this.group.add(legR);

    // 5. Dark Miasma Particles
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPositions[i] = (Math.random() - 0.5) * 1.6;
      pPositions[i + 1] = Math.random() * 2.8;
      pPositions[i + 2] = (Math.random() - 0.5) * 1.6;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x880000,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.miasmaParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.miasmaParticles);
  }

  public update(
    dt: number,
    playerPos: { x: number; y: number; z: number },
    playerSprinting: boolean,
    playerCrouching: boolean,
    flashlightOn: boolean,
    flareEntities: { x: number; z: number; life: number }[],
    checkWallCollision: (x: number, z: number, r: number) => boolean,
    lineOfSightClear: (x1: number, z1: number, x2: number, z2: number) => boolean,
    isPlayerHiding: boolean = false
  ) {
    const dx = playerPos.x - this.data.x;
    const dz = playerPos.z - this.data.z;
    const dist = Math.hypot(dx, dz);
    this.data.distanceToPlayer = dist;

    this.walkCycle += dt * (this.data.state === 'CHASE' || this.data.state === 'FLEEING' ? 15 : 7);

    // Miasma animation (skip when particles disabled or monster far away)
    if (this.particlesEnabled && dist < 35) {
      const posAttr = this.miasmaParticles.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let py = posAttr.getY(i) + dt * 0.8;
        if (py > 2.8) py = 0;
        posAttr.setY(i, py);
      }
      posAttr.needsUpdate = true;
    }

    // Head twitch & jitter
    this.twitchTimer -= dt;
    if (this.twitchTimer <= 0) {
      this.twitchTimer = 0.12 + Math.random() * 0.4;
      this.headMesh.rotation.z = (Math.random() - 0.5) * 0.6;
      this.headMesh.rotation.y = (Math.random() - 0.5) * 0.5;
    }

    // Periodic groans / breathing
    this.groanTimer -= dt;
    if (this.groanTimer <= 0) {
      this.groanTimer = 6 + Math.random() * 8;
      if (dist < 32 && this.data.state !== 'CHASE' && this.data.state !== 'FLEEING') {
        soundEngine.playMonsterRoarNear();
      }
    }

    // Arm swing
    const swing = Math.sin(this.walkCycle) * 0.45;
    this.leftArm.rotation.x = swing;
    this.rightArm.rotation.x = -swing;

    // 1. Flare Deterrence: Scares monster and forces it to FLEE!
    let nearestFlare: { x: number; z: number } | null = null;
    let minFlareDist = 22; // 22-meter chemical flare intimidation radius
    for (const fl of flareEntities) {
      if (fl.life > 0) {
        const dfl = Math.hypot(fl.x - this.data.x, fl.z - this.data.z);
        if (dfl < minFlareDist) {
          nearestFlare = fl;
          minFlareDist = dfl;
        }
      }
    }

    if (nearestFlare && (this.data.state !== 'FLEEING' || this.fleeTimer <= 1.5)) {
      this.triggerFleeFrom(nearestFlare.x, nearestFlare.z);
    }

    // Throttled line of sight check (saves hundreds of collision tests per frame)
    let hasLOS = false;
    if (!isPlayerHiding) {
      this.losCheckTimer -= dt;
      if (this.losCheckTimer <= 0) {
        this.losCheckTimer = 0.12; // Check ~8 times/sec
        this.cachedLOS = dist < 36 && lineOfSightClear(this.data.x, this.data.z, playerPos.x, playerPos.z);
      }
      hasLOS = this.cachedLOS;
    } else {
      // Player is sheltered in wardrobe: completely hidden!
      hasLOS = false;
    }

    // Alert calculation (only if not fleeing and player not hiding)
    if (this.data.state !== 'FLEEING') {
      let alertIncrease = 0;

      if (!isPlayerHiding) {
        // Proximity hearing: sprinting makes loud sound!
        if (playerSprinting && dist < 26) {
          alertIncrease += (26 - dist) * 1.8 * dt;
        }
        // Flashlight beam detection
        if (flashlightOn && hasLOS && dist < 32) {
          alertIncrease += 45 * dt;
        } else if (flashlightOn && dist < 12) {
          alertIncrease += 25 * dt;
        }
        // Direct sight line
        if (hasLOS) {
          const sightThreshold = playerCrouching ? 8 : 18;
          if (dist < sightThreshold) {
            alertIncrease += 50 * dt;
          }
        }
      }

      if (alertIncrease > 0) {
        this.data.alertLevel = Math.min(100, this.data.alertLevel + alertIncrease);
        if (this.data.alertLevel > 40 && this.data.state === 'PATROL') {
          this.data.state = 'INVESTIGATE';
          this.data.targetX = playerPos.x;
          this.data.targetZ = playerPos.z;
        }
        if (this.data.alertLevel >= 85 && this.data.state !== 'CHASE') {
          this.data.state = 'CHASE';
          soundEngine.playMonsterScreech();
        }
      } else {
        // Calm down faster if player is safely hiding
        const decayRate = isPlayerHiding ? 25 : 8;
        this.data.alertLevel = Math.max(0, this.data.alertLevel - decayRate * dt);
      }
    }

    // State Machine transitions
    if (this.data.state === 'FLEEING') {
      this.fleeTimer -= dt;
      this.data.speed = 7.4;
      this.data.alertLevel = 0;

      // Panicked glowing violet/cyan eyes
      this.eyesLight.color.setHex(Math.sin(Date.now() * 0.03) > 0 ? 0xa855f7 : 0x06b6d4);
      this.eyesLight.intensity = 3.2;

      const targetDist = Math.hypot(this.data.targetX - this.data.x, this.data.targetZ - this.data.z);
      if (this.fleeTimer <= 0 || targetDist < 3.5) {
        // Fled far enough: transition to searching then patrol
        this.data.state = 'SEARCHING';
        this.lastStateChangeTime = 0;
        this.pickNewPatrolTarget();
      }
    } else if (this.data.state === 'CHASE') {
      if (isPlayerHiding) {
        // Player disappeared inside a wardrobe! Monster lost visual!
        this.data.state = 'SEARCHING';
        this.lastStateChangeTime = 0;
        this.data.alertLevel = 25;
      } else {
        this.data.speed = 6.4;
        this.data.targetX = playerPos.x;
        this.data.targetZ = playerPos.z;
        this.data.lastKnownPlayerPos = { x: playerPos.x, z: playerPos.z };
        this.eyesLight.color.setHex(0xff0000);
        this.eyesLight.intensity = 3.0;

        // Lose player if far and blocked by walls
        if (dist > 36 || (!hasLOS && dist > 18 && this.data.alertLevel < 20)) {
          this.data.state = 'SEARCHING';
          this.lastStateChangeTime = 0;
        }
      }
    } else if (this.data.state === 'INVESTIGATE') {
      this.data.speed = 4.2;
      this.eyesLight.color.setHex(0xff7700);
      this.eyesLight.intensity = 1.8;
      const targetDist = Math.hypot(this.data.targetX - this.data.x, this.data.targetZ - this.data.z);
      if (targetDist < 2.5) {
        this.data.state = 'SEARCHING';
        this.lastStateChangeTime = 0;
      }
    } else if (this.data.state === 'SEARCHING') {
      this.data.speed = 2.4;
      this.eyesLight.color.setHex(0xbb5500);
      this.eyesLight.intensity = 1.2;
      this.lastStateChangeTime += dt;

      // When searching while player is hiding, search for ~5s then leave area completely
      const searchDuration = isPlayerHiding ? 5.5 : 4.5;
      if (this.lastStateChangeTime > searchDuration) {
        // Monster gives up and leaves far away!
        this.pickFarPatrolTarget();
        this.data.state = 'PATROL';
        this.data.alertLevel = 0;
      }
    } else {
      // PATROL
      this.data.speed = 3.0;
      this.eyesLight.color.setHex(0xff1122);
      this.eyesLight.intensity = 1.4;
      const targetDist = Math.hypot(this.data.targetX - this.data.x, this.data.targetZ - this.data.z);
      if (targetDist < 3.0) {
        this.pickNewPatrolTarget();
      }
    }

    // Move toward target position with basic corridor steering
    this.moveTowardsTarget(dt, checkWallCollision);

    // Update 3D Group Transform
    this.group.position.x = this.data.x;
    this.group.position.z = this.data.z;
    this.group.position.y = Math.sin(this.walkCycle * 2) * 0.08; // Creepy bobbing
    this.group.rotation.y = this.data.rotationY;
  }

  public triggerFleeFrom(fromX: number, fromZ: number) {
    if (this.data.state !== 'FLEEING') {
      soundEngine.playMonsterFlee();
    }
    this.data.state = 'FLEEING';
    this.fleeTimer = 8.5; // Flee for 8.5 seconds
    this.data.alertLevel = 0;
    this.data.speed = 7.4;

    // Opposite vector away from the flare
    let dirX = this.data.x - fromX;
    let dirZ = this.data.z - fromZ;
    const len = Math.hypot(dirX, dirZ);
    if (len > 0.05) {
      dirX /= len;
      dirZ /= len;
    } else {
      const rnd = Math.random() * Math.PI * 2;
      dirX = Math.cos(rnd);
      dirZ = Math.sin(rnd);
    }

    // Target position 45 meters away in opposite direction
    this.data.targetX = this.data.x + dirX * 45;
    this.data.targetZ = this.data.z + dirZ * 45;
  }

  private pickFarPatrolTarget() {
    // Pick distant corridor node (40-60 meters away) so monster leaves the hiding spot
    const randomAngle = Math.random() * Math.PI * 2;
    const wanderDist = 40 + Math.random() * 25;
    this.data.targetX = this.data.x + Math.cos(randomAngle) * wanderDist;
    this.data.targetZ = this.data.z + Math.sin(randomAngle) * wanderDist;
  }

  private pickNewPatrolTarget() {
    // Wander towards random corridor node
    const randomAngle = Math.random() * Math.PI * 2;
    const wanderDist = 12 + Math.random() * 25;
    this.data.targetX = this.data.x + Math.cos(randomAngle) * wanderDist;
    this.data.targetZ = this.data.z + Math.sin(randomAngle) * wanderDist;
  }

  private moveTowardsTarget(dt: number, checkWallCollision: (x: number, z: number, r: number) => boolean) {
    const tdx = this.data.targetX - this.data.x;
    const tdz = this.data.targetZ - this.data.z;
    const len = Math.hypot(tdx, tdz);
    if (len < 0.2) return;

    let dirX = tdx / len;
    let dirZ = tdz / len;

    // Smooth rotation towards direction
    const targetAngle = Math.atan2(dirX, dirZ);
    this.data.rotationY = targetAngle;

    const moveStep = this.data.speed * dt;
    const newX = this.data.x + dirX * moveStep;
    const newZ = this.data.z + dirZ * moveStep;

    // Collision check with walls (slight slide)
    const canMoveX = !checkWallCollision(newX, this.data.z, 0.7);
    const canMoveZ = !checkWallCollision(this.data.x, newZ, 0.7);

    if (canMoveX) {
      this.data.x = newX;
    } else {
      // Hit wall horizontally, try sliding
      this.data.targetX += (Math.random() - 0.5) * 8;
    }

    if (canMoveZ) {
      this.data.z = newZ;
    } else {
      // Hit wall vertically, try sliding
      this.data.targetZ += (Math.random() - 0.5) * 8;
    }
  }

  public setPosition(x: number, z: number) {
    this.data.x = x;
    this.data.z = z;
    this.group.position.set(x, 0, z);
    this.data.targetX = x;
    this.data.targetZ = z;
  }

  public setParticlesVisible(visible: boolean) {
    this.particlesEnabled = visible;
    this.miasmaParticles.visible = visible;
  }
}
