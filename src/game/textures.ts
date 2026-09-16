import * as THREE from 'three';

// Procedural texture generator for dark horror subterranean environment
export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  public static getWallTexture(sectorName?: string): THREE.CanvasTexture {
    const key = `wall_${sectorName || 'default'}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base concrete background
    ctx.fillStyle = '#1e2226';
    ctx.fillRect(0, 0, 512, 512);

    // Grunge noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      imgData.data[i] = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i + 1] = Math.min(255, Math.max(0, imgData.data[i + 1] + noise));
      imgData.data[i + 2] = Math.min(255, Math.max(0, imgData.data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Horizontal concrete seam lines & panels
    ctx.strokeStyle = '#0f1214';
    ctx.lineWidth = 3;
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      // Highlight line
      ctx.strokeStyle = '#2d3339';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(512, y + 2);
      ctx.stroke();
      ctx.strokeStyle = '#0f1214';
      ctx.lineWidth = 3;
    }

    // Vertical panel seams
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // Damp water drip streaks from ceiling
    ctx.fillStyle = 'rgba(10, 15, 12, 0.45)';
    for (let s = 0; s < 6; s++) {
      const sx = 40 + Math.random() * 430;
      const sw = 8 + Math.random() * 20;
      const sh = 100 + Math.random() * 320;
      ctx.fillRect(sx, 0, sw, sh);
    }

    // Lower hazard stripe band
    ctx.fillStyle = '#111417';
    ctx.fillRect(0, 440, 512, 72);
    ctx.fillStyle = '#b38209';
    for (let h = -50; h < 550; h += 36) {
      ctx.beginPath();
      ctx.moveTo(h, 512);
      ctx.lineTo(h + 18, 512);
      ctx.lineTo(h + 40, 440);
      ctx.lineTo(h + 22, 440);
      ctx.closePath();
      ctx.fill();
    }

    // Stenciled Sector lettering
    if (sectorName) {
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = 'rgba(210, 225, 235, 0.7)';
      ctx.fillText(sectorName, 36, 90);

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = 'rgba(200, 60, 60, 0.85)';
      ctx.fillText('CRITICAL QUARANTINE', 36, 120);
    }

    // Blood smear decal on some walls
    if (Math.random() > 0.4) {
      ctx.fillStyle = 'rgba(110, 8, 8, 0.6)';
      const bx = 160 + Math.random() * 200;
      const by = 180 + Math.random() * 140;
      ctx.beginPath();
      ctx.arc(bx, by, 18 + Math.random() * 15, 0, Math.PI * 2);
      ctx.fill();
      // Drips
      for (let d = 0; d < 3; d++) {
        ctx.fillRect(bx - 6 + d * 5, by, 2 + Math.random() * 3, 30 + Math.random() * 60);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  public static getFloorTexture(): THREE.CanvasTexture {
    const key = 'floor_tile';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark grey concrete floor
    ctx.fillStyle = '#16191c';
    ctx.fillRect(0, 0, 512, 512);

    // Grid tiles
    const tileSize = 64;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const shade = 20 + Math.floor(Math.random() * 8);
        ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 4})`;
        ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

        // Grout line
        ctx.strokeStyle = '#090a0c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);
      }
    }

    // Wet puddles with soft reflections
    for (let p = 0; p < 4; p++) {
      const px = 60 + Math.random() * 380;
      const py = 60 + Math.random() * 380;
      const pr = 40 + Math.random() * 50;

      const grad = ctx.createRadialGradient(px, py, 5, px, py, pr);
      grad.addColorStop(0, 'rgba(8, 11, 14, 0.95)');
      grad.addColorStop(0.7, 'rgba(14, 18, 22, 0.6)');
      grad.addColorStop(1, 'rgba(22, 25, 28, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.cache.set(key, texture);
    return texture;
  }

  public static getCeilingTexture(): THREE.CanvasTexture {
    const key = 'ceiling_tile';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Heavy dark metal ceiling
    ctx.fillStyle = '#0d0f11';
    ctx.fillRect(0, 0, 256, 256);

    // Industrial air grating & conduits
    ctx.strokeStyle = '#181b1e';
    ctx.lineWidth = 4;
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
    }

    // Horizontal heavy pipe
    ctx.fillStyle = '#22272b';
    ctx.fillRect(0, 110, 256, 36);
    ctx.fillStyle = '#14171a';
    ctx.fillRect(0, 140, 256, 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    this.cache.set(key, texture);
    return texture;
  }

  public static getBlastDoorTexture(isOpen: boolean = false): THREE.CanvasTexture {
    const key = `blast_door_${isOpen ? 'open' : 'closed'}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark titanium vault gate
    ctx.fillStyle = '#1c2024';
    ctx.fillRect(0, 0, 512, 512);

    // Outer frame
    ctx.lineWidth = 16;
    ctx.strokeStyle = '#0e1012';
    ctx.strokeRect(8, 8, 496, 496);

    // Heavy cross reinforcement
    ctx.fillStyle = '#262c33';
    ctx.fillRect(32, 230, 448, 52);
    ctx.fillRect(230, 32, 52, 448);

    // Central Vault Locking Ring
    ctx.fillStyle = '#121417';
    ctx.beginPath();
    ctx.arc(256, 256, 110, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isOpen ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Text warning
    ctx.font = 'bold 26px monospace';
    ctx.fillStyle = isOpen ? '#22c55e' : '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText(isOpen ? 'BLAST GATE UNLOCKED' : 'SECTOR 0 ZERO VAULT', 256, 250);
    ctx.font = 'bold 16px monospace';
    ctx.fillText(isOpen ? 'EVACUATE IMMEDIATELY' : 'RESTRICTED CONTAINMENT', 256, 280);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  public static getMiasmaParticle(): THREE.CanvasTexture {
    const key = 'miasma_particle';
    if (this.cache.has(key)) return this.cache.get(key)!;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(240, 20, 20, 0.9)');
    grad.addColorStop(0.4, 'rgba(100, 10, 30, 0.5)');
    grad.addColorStop(0.8, 'rgba(30, 0, 10, 0.15)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }
}
