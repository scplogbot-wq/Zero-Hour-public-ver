import * as THREE from 'three';
import {
  EnemyArchetype,
  WeaponId,
  AttachmentId,
  WEAPONS,
  sanitizeWeaponAttachments,
  solveTwoBoneIK,
  calculateMultiBoneAimAngles,
  AIAnimationBlendWeights,
  EnemyRagdoll,
  RagdollBoneId,
  OPTIC_LOCAL_OFFSETS,
} from './tacticalLogic';

/**
 * Generate procedural high-sharpness CanvasTextures for CQB surfaces & blood decals
 * Supports dynamic switching between Low (256x256) and High-Res PBR (1024x1024)
 */
export function createCQBTextures(maxAnisotropy: number, resolution: 256 | 1024 = 256) {
  const size = resolution;
  const s = size / 256;

  // 1. Concrete Wall Albedo + Bump Texture
  const wallCanvas = document.createElement('canvas');
  wallCanvas.width = size;
  wallCanvas.height = size;
  const wCtx = wallCanvas.getContext('2d')!;
  wCtx.fillStyle = '#333942';
  wCtx.fillRect(0, 0, size, size);

  // Subtle architectural form lines & tactical wainscot stripe
  wCtx.fillStyle = '#282d35';
  wCtx.fillRect(0, 175 * s, size, 81 * s);
  wCtx.fillStyle = '#d97706';
  wCtx.fillRect(0, 171 * s, size, 4 * s);

  // Micro-relief concrete noise
  const noiseCount = Math.floor(2400 * s * s);
  for (let i = 0; i < noiseCount; i++) {
    const hx = Math.abs(Math.sin(i * 12.9898 + 1.23) * 43758.5453) % 1;
    const hy = Math.abs(Math.sin(i * 78.233 + 4.56) * 29384.1234) % 1;
    const x = Math.floor(hx * size);
    const y = Math.floor(hy * size);
    wCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    wCtx.fillRect(x, y, Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2 * s)));
  }

  // Vertical panel seam & bevel rivet points for high-res
  wCtx.strokeStyle = 'rgba(15, 20, 28, 0.65)';
  wCtx.lineWidth = Math.max(2, 2 * s);
  wCtx.beginPath();
  wCtx.moveTo(128 * s, 0);
  wCtx.lineTo(128 * s, size);
  wCtx.stroke();

  if (size >= 512) {
    // Bolt/rivet details along seams in high-res mode
    for (let b = 0; b < 8; b++) {
      const by = (24 + b * 28) * s;
      wCtx.fillStyle = '#1e232a';
      wCtx.beginPath();
      wCtx.arc(128 * s, by, 3 * s, 0, Math.PI * 2);
      wCtx.fill();
    }
  }

  const wallTexture = new THREE.CanvasTexture(wallCanvas);
  wallTexture.colorSpace = THREE.SRGBColorSpace;
  wallTexture.wrapS = THREE.RepeatWrapping;
  wallTexture.wrapT = THREE.RepeatWrapping;
  wallTexture.anisotropy = maxAnisotropy;

  // 2. Tactical Floor Grid Texture
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = size;
  floorCanvas.height = size;
  const fCtx = floorCanvas.getContext('2d')!;
  fCtx.fillStyle = '#1e232a';
  fCtx.fillRect(0, 0, size, size);

  fCtx.strokeStyle = '#2a313c';
  fCtx.lineWidth = Math.max(2, 3 * s);
  fCtx.strokeRect(2 * s, 2 * s, size - 4 * s, size - 4 * s);

  fCtx.strokeStyle = 'rgba(255,255,255,0.05)';
  fCtx.lineWidth = Math.max(1, 1 * s);
  fCtx.beginPath();
  fCtx.moveTo(128 * s, 0);
  fCtx.lineTo(128 * s, size);
  fCtx.moveTo(0, 128 * s);
  fCtx.lineTo(size, 128 * s);
  fCtx.stroke();

  const floorTexture = new THREE.CanvasTexture(floorCanvas);
  floorTexture.colorSpace = THREE.SRGBColorSpace;
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(12, 12);
  floorTexture.anisotropy = maxAnisotropy;

  // 3. Blood Splatter Decal Texture
  const bloodCanvas = document.createElement('canvas');
  bloodCanvas.width = size;
  bloodCanvas.height = size;
  const bCtx = bloodCanvas.getContext('2d')!;
  bCtx.clearRect(0, 0, size, size);

  const grad = bCtx.createRadialGradient(128 * s, 112 * s, 8 * s, 128 * s, 112 * s, 92 * s);
  grad.addColorStop(0, 'rgba(95, 6, 10, 0.96)');
  grad.addColorStop(0.55, 'rgba(120, 10, 14, 0.85)');
  grad.addColorStop(0.85, 'rgba(75, 4, 8, 0.35)');
  grad.addColorStop(1, 'rgba(55, 2, 5, 0)');
  bCtx.fillStyle = grad;
  bCtx.beginPath();
  bCtx.arc(128 * s, 112 * s, 92 * s, 0, Math.PI * 2);
  bCtx.fill();

  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.13;
    const dist = (36 + ((i * 29) % 64)) * s;
    const r = (3 + (i % 7)) * s;
    const sx = 128 * s + Math.cos(angle) * dist;
    const sy = 112 * s + Math.sin(angle) * dist;
    bCtx.fillStyle = i % 2 === 0 ? 'rgba(105, 8, 12, 0.9)' : 'rgba(68, 4, 7, 0.85)';
    bCtx.beginPath();
    bCtx.arc(sx, sy, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  for (let d = 0; d < 4; d++) {
    const dx = (98 + d * 19) * s;
    const dripLen = (55 + (d % 2) * 32) * s;
    const dGrad = bCtx.createLinearGradient(dx, 112 * s, dx, (112 + dripLen) * s);
    dGrad.addColorStop(0, 'rgba(110, 8, 12, 0.92)');
    dGrad.addColorStop(1, 'rgba(70, 3, 6, 0.0)');
    bCtx.fillStyle = dGrad;
    bCtx.beginPath();
    bCtx.roundRect(dx - 3 * s, 112 * s, 6 * s, dripLen, 3 * s);
    bCtx.fill();
  }

  const bloodTexture = new THREE.CanvasTexture(bloodCanvas);
  bloodTexture.colorSpace = THREE.SRGBColorSpace;
  bloodTexture.anisotropy = maxAnisotropy;

  // 4. Timber Wood Plank Texture
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = size;
  woodCanvas.height = size;
  const wdCtx = woodCanvas.getContext('2d')!;
  wdCtx.fillStyle = '#8b6239';
  wdCtx.fillRect(0, 0, size, size);

  const stepY = Math.max(1, Math.round(2 * s));
  for (let y = 0; y < size; y += stepY) {
    const shade = Math.sin((y / s) * 0.28) * 14 + (((y / s) * 17) % 9) - 4;
    const r = Math.min(255, Math.max(0, 139 + shade));
    const g = Math.min(255, Math.max(0, 98 + shade * 0.75));
    const b = Math.min(255, Math.max(0, 57 + shade * 0.5));
    wdCtx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    wdCtx.fillRect(0, y, size, stepY);
  }

  for (let i = 0; i < 40; i++) {
    const kx = (((i * 67) % 240) + 8) * s;
    const ky = (((i * 113) % 240) + 8) * s;
    wdCtx.fillStyle = 'rgba(58, 36, 16, 0.28)';
    wdCtx.fillRect(kx, ky, 14 * s, 3 * s);
  }

  wdCtx.strokeStyle = 'rgba(42, 24, 10, 0.65)';
  wdCtx.lineWidth = Math.max(2, 3 * s);
  wdCtx.strokeRect(1 * s, 1 * s, size - 2 * s, size - 2 * s);

  const woodTexture = new THREE.CanvasTexture(woodCanvas);
  woodTexture.colorSpace = THREE.SRGBColorSpace;
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.anisotropy = maxAnisotropy;

  // 5. Drywall / Gypsum Partition Texture
  const drywallCanvas = document.createElement('canvas');
  drywallCanvas.width = size;
  drywallCanvas.height = size;
  const dwCtx = drywallCanvas.getContext('2d')!;
  dwCtx.fillStyle = '#474f5c';
  dwCtx.fillRect(0, 0, size, size);

  dwCtx.fillStyle = '#2e3540';
  dwCtx.fillRect(0, 182 * s, size, 74 * s);
  dwCtx.fillStyle = '#38bdf8';
  dwCtx.fillRect(0, 179 * s, size, 3 * s);

  const dwNoiseCount = Math.floor(1800 * s * s);
  for (let i = 0; i < dwNoiseCount; i++) {
    const hx = Math.abs(Math.sin(i * 19.19 + 2.1) * 43758.5453) % 1;
    const hy = Math.abs(Math.sin(i * 63.71 + 5.4) * 29384.1234) % 1;
    const x = Math.floor(hx * size);
    const y = Math.floor(hy * size);
    dwCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)';
    dwCtx.fillRect(x, y, Math.max(1, Math.round(2 * s)), Math.max(1, Math.round(2 * s)));
  }

  dwCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  dwCtx.lineWidth = Math.max(1, 1.5 * s);
  dwCtx.beginPath();
  dwCtx.moveTo(128 * s, 0);
  dwCtx.lineTo(128 * s, size);
  dwCtx.stroke();

  const drywallTexture = new THREE.CanvasTexture(drywallCanvas);
  drywallTexture.colorSpace = THREE.SRGBColorSpace;
  drywallTexture.wrapS = THREE.RepeatWrapping;
  drywallTexture.wrapT = THREE.RepeatWrapping;
  drywallTexture.anisotropy = maxAnisotropy;

  return { wallTexture, floorTexture, bloodTexture, woodTexture, drywallTexture };
}

/**
 * Create a BoxGeometry for an individual barricade plank or sub-chunk with distinct UV coordinates
 * so every plank/chunk displays unique wood grain mapping.
 */
export function createUVMappedWoodGeometry(
  sx: number,
  sy: number,
  sz: number,
  uvOffset: { x: number; y: number },
  uvRepeat: { x: number; y: number }
): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  const uvAttr = geo.attributes.uv;
  if (uvAttr) {
    for (let i = 0; i < uvAttr.count; i++) {
      const u = uvAttr.getX(i);
      const v = uvAttr.getY(i);
      uvAttr.setXY(
        i,
        uvOffset.x + u * uvRepeat.x,
        uvOffset.y + v * uvRepeat.y
      );
    }
    uvAttr.needsUpdate = true;
  }
  return geo;
}


/**
 * Build a multi-part HK416 D10RS Assault Rifle with EOTech Holographic Optical Sight
 * (10 distinct parts across Primary Silhouette, Secondary Read, and Accent Detail)
 */
export function buildHK416ViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.35,
    metalness: 0.82,
  });
  const mattePolymerMat = new THREE.MeshStandardMaterial({
    color: 0x14171c,
    roughness: 0.78,
    metalness: 0.15,
  });
  const tanAccentMat = new THREE.MeshStandardMaterial({
    color: 0x6e5a44,
    roughness: 0.62,
    metalness: 0.25,
  });
  const steelBarrelMat = new THREE.MeshStandardMaterial({
    color: 0x3a404a,
    roughness: 0.22,
    metalness: 0.92,
  });

  // 1. Upper & Lower Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.085, 0.28), gunmetalMat);
  receiver.position.set(0, 0, 0);
  root.add(receiver);

  // 2. Quad Picatinny Handguard
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.068, 0.26), tanAccentMat);
  handguard.position.set(0, 0.006, -0.25);
  root.add(handguard);

  // 3. Precision Barrel + Suppressor / Flash Hider
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 0.22, 12),
    steelBarrelMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.012, -0.44);
  root.add(barrel);

  const muzzleBrake = new THREE.Mesh(
    new THREE.CylinderGeometry(0.017, 0.017, 0.08, 12),
    mattePolymerMat
  );
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.012, -0.56);
  root.add(muzzleBrake);

  // 4. STANAG 30-Round Curved Magazine
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.155, 0.068), gunmetalMat);
  magazine.position.set(0, -0.105, -0.06);
  magazine.rotation.x = 0.18;
  root.add(magazine);

  // 5. Ergonomic Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.105, 0.048), mattePolymerMat);
  grip.position.set(0, -0.085, 0.085);
  grip.rotation.x = -0.26;
  root.add(grip);

  // 6. Collapsible Crane Buttstock + Buffer Tube
  const bufferTube = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.045, 0.19), mattePolymerMat);
  bufferTube.position.set(0, 0.008, 0.22);
  root.add(bufferTube);

  const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.115, 0.04), tanAccentMat);
  buttpad.position.set(0, -0.015, 0.31);
  root.add(buttpad);

  // 7. EOTech Holographic Optical Scope Hood & Base
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0, 0.065, -0.02);

  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.085), gunmetalMat);
  opticGroup.add(opticBase);

  const hoodLeft = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.046, 0.075), mattePolymerMat);
  hoodLeft.position.set(-0.022, 0.03, 0);
  opticGroup.add(hoodLeft);

  const hoodRight = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.046, 0.075), mattePolymerMat);
  hoodRight.position.set(0.022, 0.03, 0);
  opticGroup.add(hoodRight);

  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.051, 0.007, 0.075), mattePolymerMat);
  hoodTop.position.set(0, 0.052, 0);
  opticGroup.add(hoodTop);

  // 8. Holographic Reticle Ring + Center Dot inside the Optic Window (aligned at y = 0.088)
  const reticleGroup = new THREE.Group();
  reticleGroup.position.set(0, 0.023, 0.01);
  const reticleMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const holoRing = new THREE.Mesh(new THREE.RingGeometry(0.009, 0.011, 24), reticleMat);
  const holoDot = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 12), reticleMat);
  reticleGroup.add(holoRing, holoDot);
  opticGroup.add(reticleGroup);

  root.add(opticGroup);

  // 9. PEQ-15 Tactical Laser Module on Top Front Rail
  const peqBox = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.075), tanAccentMat);
  peqBox.position.set(0, 0.05, -0.29);
  root.add(peqBox);

  // 10. Dynamic Muzzle Flash Mesh
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb732,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.012, -0.66);
  root.add(muzzleFlash);

  return { root, muzzleFlash, reticleGroup };
}

/**
 * Build a multi-part Glock 17 Gen5 Tactical Sidearm
 */
export function buildGlock17ViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  slideMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const slideMat = new THREE.MeshStandardMaterial({
    color: 0x222730,
    roughness: 0.28,
    metalness: 0.86,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x13161b,
    roughness: 0.76,
    metalness: 0.14,
  });
  const tritiumMat = new THREE.MeshBasicMaterial({ color: 0x22ff66 });

  // 1. Polymer Lower Frame & Accessory Rail
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.028, 0.195), frameMat);
  frame.position.set(0, 0, -0.02);
  root.add(frame);

  // 2. Machined Steel Slide
  const slideMesh = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.034, 0.205), slideMat);
  slideMesh.position.set(0, 0.029, -0.02);
  root.add(slideMesh);

  // 3. Tritium Night Sights (Rear Notch + Front Post)
  const rearSightL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.009, 0.01), tritiumMat);
  rearSightL.position.set(-0.009, 0.021, 0.072);
  slideMesh.add(rearSightL);

  const rearSightR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.009, 0.01), tritiumMat);
  rearSightR.position.set(0.009, 0.021, 0.072);
  slideMesh.add(rearSightR);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.011, 0.012), tritiumMat);
  frontSight.position.set(0, 0.022, -0.11);
  slideMesh.add(frontSight);

  // 4. Stippled Grip & Baseplate
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.11, 0.048), frameMat);
  grip.position.set(0, -0.058, 0.048);
  grip.rotation.x = -0.24;
  root.add(grip);

  // 5. Trigger Guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.028, 0.048), frameMat);
  guard.position.set(0, -0.024, 0.002);
  root.add(guard);

  // 6. Muzzle Flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffc44d,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.029, -0.19);
  root.add(muzzleFlash);

  return { root, muzzleFlash, slideMesh };
}

/**
 * Build a multi-part MP5SD6 Integrally Suppressed Submachine Gun
 */
export function buildMP5SDViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const receiverMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f26,
    roughness: 0.36,
    metalness: 0.82,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.78,
    metalness: 0.14,
  });
  const suppressorMat = new THREE.MeshStandardMaterial({
    color: 0x282e38,
    roughness: 0.44,
    metalness: 0.74,
  });

  // 1. Stamped Steel Upper Receiver & Cocking Tube
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.078, 0.24), receiverMat);
  root.add(receiver);

  const cockingTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.22, 12),
    receiverMat
  );
  cockingTube.rotation.x = Math.PI / 2;
  cockingTube.position.set(0, 0.036, -0.18);
  root.add(cockingTube);

  // 2. Ribbed Cylindrical Elastomer Handguard + Integral Aluminum Suppressor
  const handguard = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.20, 16),
    polymerMat
  );
  handguard.rotation.x = Math.PI / 2;
  handguard.position.set(0, 0.008, -0.21);
  root.add(handguard);

  const suppressor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.26, 16),
    suppressorMat
  );
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.008, -0.38);
  root.add(suppressor);

  // 3. Curved 30-Round 9mm Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.16, 0.042), receiverMat);
  mag.position.set(0, -0.105, -0.055);
  mag.rotation.x = 0.24;
  root.add(mag);

  // 4. Navy SEF Polymer Grip & Collapsible A3 Wire Stock
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.10, 0.045), polymerMat);
  grip.position.set(0, -0.08, 0.065);
  grip.rotation.x = -0.22;
  root.add(grip);

  const stockCap = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.068, 0.05), polymerMat);
  stockCap.position.set(0, 0.0, 0.14);
  root.add(stockCap);

  const railL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.18), suppressorMat);
  railL.position.set(-0.024, 0.0, 0.21);
  root.add(railL);
  const railR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.18), suppressorMat);
  railR.position.set(0.024, 0.0, 0.21);
  root.add(railR);

  const buttpad = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.105, 0.03), polymerMat);
  buttpad.position.set(0, -0.015, 0.30);
  root.add(buttpad);

  // 5. Low-Profile Claw Mount + Reflex Optic
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0, 0.058, -0.01);
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.075), receiverMat);
  opticGroup.add(mount);

  const reflexFrame = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.036, 0.045), polymerMat);
  reflexFrame.position.set(0, 0.024, 0);
  opticGroup.add(reflexFrame);

  const reticleGroup = new THREE.Group();
  reticleGroup.position.set(0, 0.014, 0.01);
  const retMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0026, 12), retMat);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.0095, 20), retMat);
  reticleGroup.add(dot, ring);
  opticGroup.add(reticleGroup);
  root.add(opticGroup);

  // 6. Subdued Suppressed Muzzle Flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.11, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.008, -0.56);
  root.add(muzzleFlash);

  return { root, muzzleFlash, reticleGroup };
}

/**
 * Build a multi-part MK18 MOD 1 CQB Short-Barreled Rifle (SBR)
 */
export function buildMK18ViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const receiverMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.34,
    metalness: 0.84,
  });
  const fdeMat = new THREE.MeshStandardMaterial({
    color: 0x8c7355, // Flat Dark Earth DD RIS II
    roughness: 0.52,
    metalness: 0.38,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x16181d,
    roughness: 0.76,
    metalness: 0.15,
  });

  // 1. Forged M4 Upper/Lower Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.082, 0.25), receiverMat);
  root.add(receiver);

  // 2. Daniel Defense 9.5" FDE RIS II Quad Rail + Vertical Stubby Foregrip
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.064, 0.22), fdeMat);
  handguard.position.set(0, 0.006, -0.22);
  root.add(handguard);

  const vertGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.014, 0.085, 10), fdeMat);
  vertGrip.position.set(0, -0.062, -0.23);
  root.add(vertGrip);

  // 3. 10.3" Barrel + SureFire SOCOM556 RC2 FDE Suppressor
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 12), receiverMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.01, -0.36);
  root.add(barrel);

  const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.15, 14), fdeMat);
  suppressor.rotation.x = Math.PI / 2;
  suppressor.position.set(0, 0.01, -0.47);
  root.add(suppressor);

  // 4. Windowed PMAG 30-Round Magazine + Pistol Grip + SOPMOD Stock
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.15, 0.066), fdeMat);
  mag.position.set(0, -0.10, -0.05);
  mag.rotation.x = 0.16;
  root.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.102, 0.046), polymerMat);
  grip.position.set(0, -0.082, 0.08);
  grip.rotation.x = -0.25;
  root.add(grip);

  const buffer = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), polymerMat);
  buffer.position.set(0, 0.006, 0.21);
  root.add(buffer);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.11, 0.055), fdeMat);
  stock.position.set(0, -0.015, 0.29);
  root.add(stock);

  // 5. Aimpoint Micro T-2 on High Riser Mount
  const opticGroup = new THREE.Group();
  opticGroup.position.set(0, 0.062, -0.01);
  const riser = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.024, 0.055), receiverMat);
  opticGroup.add(riser);

  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.068, 16, 1, true),
    polymerMat
  );
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 0.028, 0);
  opticGroup.add(tube);

  const reticleGroup = new THREE.Group();
  reticleGroup.position.set(0, 0.024, 0.01);
  const retMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.0024, 12), retMat);
  reticleGroup.add(dot);
  opticGroup.add(reticleGroup);
  root.add(opticGroup);

  // 6. Muzzle Flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb732,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.16, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.01, -0.61);
  root.add(muzzleFlash);

  return { root, muzzleFlash, reticleGroup };
}

/**
 * Build a multi-part M870 MCS Breacher 12-Gauge Tactical Pump Shotgun
 */
export function buildM870ViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x20252d,
    roughness: 0.38,
    metalness: 0.82,
  });
  const polymerMat = new THREE.MeshStandardMaterial({
    color: 0x13161b,
    roughness: 0.80,
    metalness: 0.12,
  });
  const shellRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.45,
    metalness: 0.2,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.88,
  });

  // 1. Milled Steel Shotgun Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.072, 0.25), steelMat);
  root.add(receiver);

  // 2. Side-Saddle 5x 12-Gauge Buckshot Shell Carrier on Left Receiver
  for (let s = 0; s < 5; s++) {
    const sz = -0.07 + s * 0.032;
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.052, 8), shellRedMat);
    hull.position.set(-0.029, 0.005, sz);
    root.add(hull);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.014, 8), brassMat);
    rim.position.set(-0.029, 0.032, sz);
    root.add(rim);
  }

  // 3. 18.5" Heavy Cylinder Bore Barrel + Extended Under-Barrel Magazine Tube
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.46, 14), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.018, -0.34);
  root.add(barrel);

  const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.44, 14), steelMat);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.014, -0.33);
  root.add(magTube);

  // 4. Ribbed Tactical Pump Action Forend
  const pumpForend = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.19, 12),
    polymerMat
  );
  pumpForend.rotation.x = Math.PI / 2;
  pumpForend.position.set(0, -0.014, -0.26);
  root.add(pumpForend);

  // 5. Pistol Grip + Tactical Breacher Stock
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.10, 0.048), polymerMat);
  grip.position.set(0, -0.075, 0.10);
  grip.rotation.x = -0.28;
  root.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.095, 0.22), polymerMat);
  stock.position.set(0, -0.018, 0.23);
  root.add(stock);

  // 6. Top Picatinny Rail & Ghost Ring Sight
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.01, 0.18), steelMat);
  topRail.position.set(0, 0.041, -0.01);
  root.add(topRail);

  const reticleGroup = new THREE.Group();
  reticleGroup.position.set(0, 0.044, 0.04);
  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const ghostRing = new THREE.Mesh(new THREE.RingGeometry(0.011, 0.013, 20), ghostMat);
  reticleGroup.add(ghostRing);
  root.add(reticleGroup);

  // 7. Massive 12-Gauge Muzzle Blast Cone
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xff9e1b,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.24, 10), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.018, -0.68);
  root.add(muzzleFlash);

  return { root, muzzleFlash, reticleGroup };
}

/**
 * Build a high-detail M1777 Charleville Smoothbore Flintlock Musket ViewModel
 * Features full-length oiled walnut stock, polished steel barrel, three brass barrel bands,
 * flintlock hammer & frizzen pan, under-barrel steel ramrod, and aligned iron sights.
 */
export function buildMusketViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup: THREE.Group;
} {
  const root = new THREE.Group();

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x5c3317,
    roughness: 0.62,
    metalness: 0.08,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x8a94a0,
    roughness: 0.26,
    metalness: 0.88,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x262b33,
    roughness: 0.38,
    metalness: 0.82,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.90,
  });

  // 1. Full-Length Oiled Walnut Stock & Forend Bed
  const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.062, 0.62), walnutMat);
  stockBody.position.set(0, -0.008, -0.16);
  root.add(stockBody);

  // Angled Wrist & Buttstock
  const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.056, 0.16), walnutMat);
  wrist.position.set(0, -0.032, 0.19);
  wrist.rotation.x = -0.22;
  root.add(wrist);

  const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.115, 0.22), walnutMat);
  buttstock.position.set(0, -0.052, 0.32);
  buttstock.rotation.x = -0.10;
  root.add(buttstock);

  const brassButtplate = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.118, 0.016), brassMat);
  brassButtplate.position.set(0, -0.052, 0.43);
  brassButtplate.rotation.x = -0.10;
  root.add(brassButtplate);

  // 2. Long .69 Caliber Smoothbore Steel Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.82, 16), steelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.024, -0.28);
  root.add(barrel);

  // 3. Three Brass Barrel Bands clamping Barrel to Walnut Forend
  for (const bz of [-0.12, -0.32, -0.52]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.072, 0.022), brassMat);
    band.position.set(0, 0.004, bz);
    root.add(band);
  }

  // 4. Under-Barrel Steel Ramrod (used during the 7-second reload)
  const ramrod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.76, 8), steelMat);
  ramrod.rotation.x = Math.PI / 2;
  ramrod.position.set(0, -0.042, -0.26);
  root.add(ramrod);

  // 5. Flintlock Lockplate, Cock/Hammer, and Brass Flash Pan on Right Side
  const lockPlate = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.042, 0.12), darkIronMat);
  lockPlate.position.set(0.026, 0.008, 0.06);
  root.add(lockPlate);

  const flashPan = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.028), brassMat);
  flashPan.position.set(0.032, 0.022, 0.04);
  root.add(flashPan);

  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.058, 0.022), darkIronMat);
  hammer.position.set(0.032, 0.042, 0.075);
  hammer.rotation.x = 0.35;
  root.add(hammer);

  // Brass Trigger Guard
  const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.032, 0.085), brassMat);
  triggerGuard.position.set(0, -0.048, 0.10);
  root.add(triggerGuard);

  // 6. Aligned Iron Sight Post & Rear Notch along Camera Z-Axis (y = 0.048)
  const rearNotchL = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.012), darkIronMat);
  rearNotchL.position.set(-0.006, 0.045, 0.08);
  root.add(rearNotchL);
  const rearNotchR = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.010, 0.012), darkIronMat);
  rearNotchR.position.set(0.006, 0.045, 0.08);
  root.add(rearNotchR);

  const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.014, 0.012), brassMat);
  frontPost.position.set(0, 0.046, -0.66);
  root.add(frontPost);

  const reticleGroup = new THREE.Group();
  reticleGroup.position.set(0, OPTIC_LOCAL_OFFSETS.musket.ironSightY, 0.02);
  const sightBeadMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  const sightBead = new THREE.Mesh(new THREE.CircleGeometry(0.0022, 12), sightBeadMat);
  reticleGroup.add(sightBead);
  root.add(reticleGroup);

  // 7. Heavy Black-Powder Muzzle Blast Cone
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffa726,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 10), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.024, -0.78);
  root.add(muzzleFlash);

  return { root, muzzleFlash, reticleGroup };
}

/**
 * Build a multi-part M1911A1 MEU(SOC) .45 ACP Tactical Sidearm
 */
export function buildM1911ViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  slideMesh: THREE.Mesh;
} {
  const root = new THREE.Group();

  const parkerizedMat = new THREE.MeshStandardMaterial({
    color: 0x2b3038,
    roughness: 0.32,
    metalness: 0.85,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1f242b,
    roughness: 0.42,
    metalness: 0.78,
  });
  const walnutGripMat = new THREE.MeshStandardMaterial({
    color: 0x5c341d,
    roughness: 0.68,
    metalness: 0.08,
  });
  const tritiumMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  // 1. Steel Lower Frame & Railed Dust Cover
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.028, 0.205), frameMat);
  frame.position.set(0, 0, -0.02);
  root.add(frame);

  // 2. Parkerized .45 ACP Slide
  const slideMesh = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.036, 0.215), parkerizedMat);
  slideMesh.position.set(0, 0.031, -0.02);
  root.add(slideMesh);

  // 3. Novak Combat Sights
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.009, 0.014), tritiumMat);
  rearSight.position.set(0, 0.022, 0.075);
  slideMesh.add(rearSight);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.011, 0.014), tritiumMat);
  frontSight.position.set(0, 0.022, -0.115);
  slideMesh.add(frontSight);

  // 4. Grip + Checkered Walnut Side Panels + Extended Magazine Bumper
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.115, 0.048), frameMat);
  grip.position.set(0, -0.06, 0.052);
  grip.rotation.x = -0.22;
  root.add(grip);

  const panelG = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.092, 0.038), walnutGripMat);
  panelG.position.set(0, -0.058, 0.052);
  panelG.rotation.x = -0.22;
  root.add(panelG);

  const magBumper = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.05), parkerizedMat);
  magBumper.position.set(0, -0.12, 0.066);
  root.add(magBumper);

  // 5. Trigger Guard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.046), frameMat);
  guard.position.set(0, -0.024, 0.005);
  root.add(guard);

  // 6. Heavy .45 ACP Muzzle Flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb838,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.031, -0.20);
  root.add(muzzleFlash);

  return { root, muzzleFlash, slideMesh };
}

/**
 * Build High-Fidelity Tactical Combat Knife (Fairbairn CQB-K9 Fixed Blade) 3D Model
 * Features black DLC anti-reflective coating, razor-ground steel cutting bevel,
 * spine serrations, fuller groove, steel crossguard, ribbed G10 composite handle,
 * and skull-crusher pommel.
 */
export function buildCombatKnifeViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
} {
  const root = new THREE.Group();

  const bladeDLCMat = new THREE.MeshStandardMaterial({
    color: 0x1f242c,
    roughness: 0.28,
    metalness: 0.88,
  });
  const edgeBevelMat = new THREE.MeshStandardMaterial({
    color: 0xd8dee9,
    roughness: 0.12,
    metalness: 0.96,
  });
  const spineSerrationMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.35,
    metalness: 0.80,
  });
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.45,
    metalness: 0.85,
  });
  const handleG10Mat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.15,
  });
  const pommelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.38,
    metalness: 0.90,
  });

  // 1. Blade Spine & Primary Body (Clip-point tactical fixed blade)
  const bladeSpine = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.038, 0.22), bladeDLCMat);
  bladeSpine.position.set(0, 0.016, -0.11);
  root.add(bladeSpine);

  // 2. Razor Sharp Silver Cutting Edge Bevel
  const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.018, 0.215), edgeBevelMat);
  bladeEdge.position.set(0, -0.008, -0.11);
  root.add(bladeEdge);

  // 3. Piercing Tanto / Clip Point Tip
  const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 4), edgeBevelMat);
  bladeTip.rotation.x = -Math.PI / 2;
  bladeTip.rotation.y = Math.PI / 4;
  bladeTip.position.set(0, 0.008, -0.245);
  root.add(bladeTip);

  // 4. Tactical Spine Serrations (rope/wood cutter notches along spine)
  for (let s = 0; s < 5; s++) {
    const serration = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.006, 0.010), spineSerrationMat);
    serration.position.set(0, 0.036, -0.04 - s * 0.018);
    serration.rotation.x = 0.45;
    root.add(serration);
  }

  // 5. Fuller / Blood Groove indent running down blade center
  const fullerGroove = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.006, 0.14), spineSerrationMat);
  fullerGroove.position.set(0, 0.014, -0.10);
  root.add(fullerGroove);

  // 6. Steel Double-Quillon Crossguard
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.082, 0.014), guardMat);
  guard.position.set(0, 0.010, 0.006);
  root.add(guard);

  // 7. Ergonomic Contoured Ribbed G10 Composite Handle
  const handleGrip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.034, 0.125), handleG10Mat);
  handleGrip.position.set(0, 0.004, 0.076);
  root.add(handleGrip);

  // Tactical ergonomic grip ribs
  for (let r = 0; r < 5; r++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.036, 0.008), handleG10Mat);
    rib.position.set(0, 0.004, 0.035 + r * 0.020);
    root.add(rib);
  }

  // 8. Steel Skull-Crusher Pommel & Lanyard Ring
  const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.038, 0.018), pommelMat);
  pommel.position.set(0, 0.004, 0.146);
  root.add(pommel);

  // Dummy hidden muzzle flash mesh for standard interface contract
  const dummyFlash = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  dummyFlash.position.set(0, 0, -0.28);
  root.add(dummyFlash);

  return { root, muzzleFlash: dummyFlash };
}

export interface ColtSAAArticulatedParts {
  cylinderGroup: THREE.Group;
  hammerPivot: THREE.Group;
  loadingGatePivot: THREE.Group;
  ejectorRodGroup: THREE.Group;
  insertingCartridgeGroup: THREE.Group;
  ejectingCasingMesh: THREE.Mesh;
  fanningHandGroup: THREE.Group;
}

/**
 * Build a high-detail 3D ViewModel for the Colt Single Action Army (SAA) .45 "Peacemaker" Revolver
 * with articulated 6-shot fluted cylinder, spur hammer, hinged loading gate, spring ejector rod,
 * animated reload cartridges, and off-hand hammer-fanning palm.
 */
export function buildColtSAAViewModel(): {
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  coltParts: ColtSAAArticulatedParts;
} {
  const root = new THREE.Group();

  const bluedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x161d26,
    roughness: 0.24,
    metalness: 0.92,
  });
  const caseHardenedMat = new THREE.MeshStandardMaterial({
    color: 0x2b3240,
    roughness: 0.34,
    metalness: 0.86,
  });
  const polishedSilverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.20,
    metalness: 0.94,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.88,
  });
  const leadBulletMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.45,
    metalness: 0.75,
  });
  const walnutGripMat = new THREE.MeshStandardMaterial({
    color: 0x4a2511,
    roughness: 0.62,
    metalness: 0.08,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.75,
    metalness: 0.12,
  });

  // 1. Color Case-Hardened Receiver Frame & Top Strap
  const frameWindow = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.044, 0.078), caseHardenedMat);
  frameWindow.position.set(0, 0.022, -0.018);
  root.add(frameWindow);

  const topStrap = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.007, 0.082), caseHardenedMat);
  topStrap.position.set(0, 0.046, -0.018);
  root.add(topStrap);

  // Rear standing breech & hemispherical recoil shield
  const recoilShield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.014, 16),
    caseHardenedMat
  );
  recoilShield.rotation.x = Math.PI / 2;
  recoilShield.position.set(0, 0.024, 0.022);
  root.add(recoilShield);

  // 2. 5.5" Artillery Blued Steel Round Barrel
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0105, 0.0115, 0.165, 16),
    bluedSteelMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.032, -0.138);
  root.add(barrel);

  // Dark bore aperture
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0065, 0.01, 12),
    new THREE.MeshBasicMaterial({ color: 0x05070a })
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.set(0, 0.032, -0.221);
  root.add(bore);

  // Front crescent blade sight & rear top-strap notch (aligned at y = 0.054)
  const frontBlade = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.016), bluedSteelMat);
  frontBlade.position.set(0, 0.048, -0.205);
  const frontBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.0022, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  frontBead.position.set(0, 0.054, -0.205);
  root.add(frontBlade, frontBead);

  const rearNotchLeft = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.006, 0.014), caseHardenedMat);
  rearNotchLeft.position.set(-0.005, 0.052, 0.016);
  const rearNotchRight = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.006, 0.014), caseHardenedMat);
  rearNotchRight.position.set(0.005, 0.052, 0.016);
  root.add(rearNotchLeft, rearNotchRight);

  // 3. Underbarrel Ejector Rod Housing & Articulated Spring Ejector Rod
  const ejectorHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.0065, 0.135, 12),
    bluedSteelMat
  );
  ejectorHousing.rotation.x = Math.PI / 2;
  ejectorHousing.position.set(0.011, 0.019, -0.125);
  root.add(ejectorHousing);

  const ejectorRodGroup = new THREE.Group();
  ejectorRodGroup.position.set(0.011, 0.019, -0.135);
  const rodShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.0032, 0.095, 10),
    polishedSilverMat
  );
  rodShaft.rotation.x = Math.PI / 2;
  const rodThumbTab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.007, 0.005, 12),
    polishedSilverMat
  );
  rodThumbTab.position.set(0.005, 0, -0.046);
  ejectorRodGroup.add(rodShaft, rodThumbTab);
  root.add(ejectorRodGroup);

  // 4. Articulated 6-Chamber Fluted Cylinder with Visible .45 Colt Brass Rims
  const cylinderGroup = new THREE.Group();
  cylinderGroup.position.set(0, 0.023, -0.018);

  const cylinderDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0205, 0.0205, 0.052, 18),
    bluedSteelMat
  );
  cylinderDrum.rotation.x = Math.PI / 2;
  cylinderGroup.add(cylinderDrum);

  // 6 chambers + 6 external flutes + 6 brass cartridge rims & primers
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const cx = Math.sin(angle) * 0.0115;
    const cy = Math.cos(angle) * 0.0115;

    // Brass cartridge rim at rear of chamber
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0046, 0.0046, 0.004, 10),
      brassMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, cy, 0.025);
    cylinderGroup.add(rim);

    // Silver primer cap in center of rim
    const primer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0018, 0.0018, 0.0045, 8),
      polishedSilverMat
    );
    primer.rotation.x = Math.PI / 2;
    primer.position.set(cx, cy, 0.0252);
    cylinderGroup.add(primer);

    // Fluted groove between chambers
    const fluteAngle = angle + Math.PI / 6;
    const fx = Math.sin(fluteAngle) * 0.0195;
    const fy = Math.cos(fluteAngle) * 0.0195;
    const flute = new THREE.Mesh(
      new THREE.BoxGeometry(0.0045, 0.0045, 0.038),
      caseHardenedMat
    );
    flute.position.set(fx, fy, -0.002);
    flute.rotation.z = -fluteAngle;
    cylinderGroup.add(flute);
  }
  root.add(cylinderGroup);

  // 5. Articulated Right-Side Hinged Loading Gate
  const loadingGatePivot = new THREE.Group();
  loadingGatePivot.position.set(0.018, 0.016, 0.015);
  const gateLatchMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.022, 0.018),
    caseHardenedMat
  );
  gateLatchMesh.position.set(0.002, 0.008, 0);
  const gateThumbSpur = new THREE.Mesh(
    new THREE.SphereGeometry(0.0045, 8, 8),
    polishedSilverMat
  );
  gateThumbSpur.position.set(0.005, 0.016, 0.004);
  loadingGatePivot.add(gateLatchMesh, gateThumbSpur);
  root.add(loadingGatePivot);

  // 6. Articulated Case-Hardened Spur Hammer
  const hammerPivot = new THREE.Group();
  hammerPivot.position.set(0, 0.028, 0.028);
  const hammerBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.007, 0.026, 0.016),
    caseHardenedMat
  );
  hammerBody.position.set(0, 0.012, 0.004);
  const hammerSpur = new THREE.Mesh(
    new THREE.BoxGeometry(0.009, 0.006, 0.018),
    polishedSilverMat
  );
  hammerSpur.position.set(0, 0.024, 0.012);
  hammerSpur.rotation.x = -0.35;
  hammerPivot.add(hammerBody, hammerSpur);
  root.add(hammerPivot);

  // 7. Brass Trigger Guard, Backstrap & Curved Single-Action Trigger
  const triggerGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.024, 0.046),
    brassMat
  );
  triggerGuard.position.set(0, -0.012, 0.004);
  root.add(triggerGuard);

  const triggerShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.005, 0.016, 0.006),
    bluedSteelMat
  );
  triggerShoe.position.set(0, -0.008, 0.008);
  triggerShoe.rotation.x = 0.28;
  root.add(triggerShoe);

  // 8. Oiled Walnut Plowhandle Grip & Gold Colt Medallion
  const gripGroup = new THREE.Group();
  gripGroup.position.set(0, -0.042, 0.048);
  gripGroup.rotation.x = 0.34;
  const walnutGrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.027, 0.096, 0.038),
    walnutGripMat
  );
  const brassBackstrap = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.098, 0.040),
    brassMat
  );
  const medallionLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0055, 0.0055, 0.029, 12),
    brassMat
  );
  medallionLeft.rotation.z = Math.PI / 2;
  medallionLeft.position.set(0, 0.018, 0);
  gripGroup.add(walnutGrip, brassBackstrap, medallionLeft);
  root.add(gripGroup);

  // 9. Animated .45 Colt Cartridge (visible sliding into open loading gate during sequential reload)
  const insertingCartridgeGroup = new THREE.Group();
  insertingCartridgeGroup.visible = false;
  const cartBrass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, 0.028, 10),
    brassMat
  );
  cartBrass.rotation.x = Math.PI / 2;
  const cartLead = new THREE.Mesh(
    new THREE.ConeGeometry(0.0044, 0.012, 10),
    leadBulletMat
  );
  cartLead.rotation.x = -Math.PI / 2;
  cartLead.position.set(0, 0, -0.019);
  insertingCartridgeGroup.add(cartBrass, cartLead);
  insertingCartridgeGroup.position.set(0.014, 0.023, 0.035);
  root.add(insertingCartridgeGroup);

  // 10. Animated Ejecting Spent Brass Casing (visible flying backward out of gate during eject_casing)
  const ejectingCasingMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0045, 0.0045, 0.028, 10),
    brassMat
  );
  ejectingCasingMesh.rotation.x = Math.PI / 2;
  ejectingCasingMesh.visible = false;
  ejectingCasingMesh.position.set(0.014, 0.023, 0.025);
  root.add(ejectingCasingMesh);

  // 11. Animated Off-Hand Hammer-Fanning Palm (visible slapping the hammer when hip-firing!)
  const fanningHandGroup = new THREE.Group();
  fanningHandGroup.visible = false;
  const palmMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.016, 0.062),
    gloveMat
  );
  palmMesh.position.set(-0.015, 0.066, 0.035);
  palmMesh.rotation.z = -0.22;
  fanningHandGroup.add(palmMesh);
  root.add(fanningHandGroup);

  // 12. Muzzle Flash
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffb838,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.ConeGeometry(0.058, 0.16, 8), flashMat);
  muzzleFlash.rotation.x = -Math.PI / 2;
  muzzleFlash.position.set(0, 0.032, -0.245);
  root.add(muzzleFlash);

  const coltParts: ColtSAAArticulatedParts = {
    cylinderGroup,
    hammerPivot,
    loadingGatePivot,
    ejectorRodGroup,
    insertingCartridgeGroup,
    ejectingCasingMesh,
    fanningHandGroup,
  };
  root.userData.coltParts = coltParts;

  return { root, muzzleFlash, coltParts };
}

/**
 * Update the articulated 3D sub-meshes of the Colt SAA Revolver viewmodel every frame
 * (6-chamber cylinder index rotation, spur hammer cocking/fanning slap, hinged loading gate,
 * underbarrel ejector rod stroke, and sequential cartridge/casing meshes).
 */
export function stepColtSAAViewModelParts(
  vm: BuiltWeaponViewModel,
  params: {
    cylinderAngleRad: number;
    hammerAngleRad: number;
    gateAngleRad: number;
    ejectorRodOffsetZ: number;
    insertingCartridgeProgress: number;
    ejectingCasingProgress: number;
    fanningSlapProgress: number; // 0 to 1 when fanning the hammer from the hip
  }
): void {
  const parts = vm.root.userData.coltParts as ColtSAAArticulatedParts | undefined;
  if (!parts) return;

  // 1. 6-chamber cylinder rotation
  parts.cylinderGroup.rotation.z = params.cylinderAngleRad;

  // 2. Spur hammer rotation (single-action cock, half-cock reload, or rapid fanning slap)
  const fanHammerKick = Math.sin(params.fanningSlapProgress * Math.PI) * -0.88;
  parts.hammerPivot.rotation.x = Math.min(params.hammerAngleRad, fanHammerKick);

  // 3. Right-side loading gate hinge rotation
  parts.loadingGatePivot.rotation.z = -params.gateAngleRad;

  // 4. Underbarrel ejector rod stroke
  parts.ejectorRodGroup.position.z = -0.135 + params.ejectorRodOffsetZ;

  // 5. Sequential reload: visible spent casing ejecting out of loading gate
  if (params.ejectingCasingProgress > 0.01 && params.ejectingCasingProgress < 0.99) {
    parts.ejectingCasingMesh.visible = true;
    const p = params.ejectingCasingProgress;
    parts.ejectingCasingMesh.position.set(
      0.014 + p * 0.025,
      0.023 + Math.sin(p * Math.PI) * 0.018,
      0.015 + p * 0.095
    );
    parts.ejectingCasingMesh.rotation.x = Math.PI / 2 + p * 5.2;
  } else {
    parts.ejectingCasingMesh.visible = false;
  }

  // 6. Sequential reload: visible fresh .45 Colt cartridge sliding into cylinder chamber
  if (params.insertingCartridgeProgress > 0.01 && params.insertingCartridgeProgress < 0.99) {
    parts.insertingCartridgeGroup.visible = true;
    const p = params.insertingCartridgeProgress;
    parts.insertingCartridgeGroup.position.set(
      0.013,
      0.023 - (1 - p) * 0.015,
      0.065 - p * 0.068
    );
  } else {
    parts.insertingCartridgeGroup.visible = false;
  }

  // 7. Off-hand hammer-slapping animation during hip-fire Fanning
  if (params.fanningSlapProgress > 0.01) {
    parts.fanningHandGroup.visible = true;
    const slapArc = Math.sin(params.fanningSlapProgress * Math.PI);
    parts.fanningHandGroup.position.set(
      0,
      -slapArc * 0.014,
      slapArc * 0.042
    );
    parts.fanningHandGroup.rotation.x = -slapArc * 0.35;
  } else {
    parts.fanningHandGroup.visible = false;
  }
}

export interface BuiltWeaponViewModel {
  id: WeaponId;
  root: THREE.Group;
  muzzleFlash: THREE.Mesh;
  reticleGroup?: THREE.Group;
  slideMesh?: THREE.Mesh;
  suppressorGroup: THREE.Group;
  holoGroup: THREE.Group;
  laserGroup: THREE.Group;
  hipPosition: { x: number; y: number; z: number };
  adsPosition: { x: number; y: number; z: number };
}

/**
 * Build modular 3D attachment meshes (SOCOM Suppressor, EOTech Holographic Sight, AN/PEQ-15 Laser + Beam)
 * tailored to each weapon's barrel, top rail, and accessory rail coordinates.
 */
function buildModularAttachmentGroups(weaponId: WeaponId): {
  suppressorGroup: THREE.Group;
  holoGroup: THREE.Group;
  laserGroup: THREE.Group;
} {
  const isPistol = WEAPONS[weaponId].slot === 'secondary';
  const suppressorGroup = new THREE.Group();
  const holoGroup = new THREE.Group();
  const laserGroup = new THREE.Group();

  // 1. SOCOM RC2 / Osprey Tactical Suppressor Can
  const supMat = new THREE.MeshStandardMaterial({
    color: weaponId === 'mk18' ? 0x8c7355 : 0x1b2028,
    roughness: 0.42,
    metalness: 0.72,
  });
  const canRadius = isPistol ? 0.014 : 0.019;
  const canLength = isPistol ? 0.125 : 0.155;
  const canMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(canRadius, canRadius, canLength, 14),
    supMat
  );
  canMesh.rotation.x = Math.PI / 2;
  const supPos =
    weaponId === 'hk416'
      ? { x: 0, y: 0.012, z: -0.52 }
      : weaponId === 'mk18'
      ? { x: 0, y: 0.01, z: -0.47 }
      : weaponId === 'glock17'
      ? { x: 0, y: 0.028, z: -0.19 }
      : { x: 0, y: 0.031, z: -0.20 };
  canMesh.position.set(supPos.x, supPos.y, supPos.z);
  suppressorGroup.add(canMesh);

  // 2. EOTech EXPS3 Holographic Sight Hood + Circle-Dot Reticle
  // Positioned so the holographic reticle center is strictly at y = 0.088 (OPTIC_LOCAL_OFFSETS[w].holographicSightY)
  const holoBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e242d,
    roughness: 0.45,
    metalness: 0.75,
  });
  const hoodScale = isPistol ? 0.65 : 1.0;
  const holoPos = {
    x: 0,
    y: OPTIC_LOCAL_OFFSETS[weaponId].holographicSightY - 0.012 * hoodScale,
    z: isPistol ? 0.02 : weaponId === 'm870' || weaponId === 'musket' ? -0.02 : 0.0,
  };
  holoGroup.position.set(holoPos.x, holoPos.y, holoPos.z);

  const hoodBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.044 * hoodScale, 0.016 * hoodScale, 0.064 * hoodScale),
    holoBodyMat
  );
  hoodBase.position.y = -0.012 * hoodScale;
  holoGroup.add(hoodBase);

  const hoodFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.046 * hoodScale, 0.038 * hoodScale, 0.054 * hoodScale),
    holoBodyMat
  );
  hoodFrame.position.y = 0.012 * hoodScale;
  holoGroup.add(hoodFrame);

  const holoRetMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const holoRing = new THREE.Mesh(
    new THREE.RingGeometry(0.0085 * hoodScale, 0.0102 * hoodScale, 20),
    holoRetMat
  );
  holoRing.position.set(0, 0.012 * hoodScale, 0.028 * hoodScale);
  const holoDot = new THREE.Mesh(
    new THREE.CircleGeometry(0.002 * hoodScale, 12),
    holoRetMat
  );
  holoDot.position.set(0, 0.012 * hoodScale, 0.028 * hoodScale);
  holoGroup.add(holoRing, holoDot);

  // 3. AN/PEQ-15 Tactical Laser Box + Visible Red Laser Aiming Beam
  const peqMat = new THREE.MeshStandardMaterial({
    color: 0x7c674d,
    roughness: 0.55,
    metalness: 0.35,
  });
  const laserPos = isPistol
    ? { x: 0, y: -0.012, z: -0.09 }
    : weaponId === 'm870' || weaponId === 'musket'
    ? { x: 0.024, y: -0.012, z: -0.34 }
    : { x: 0.028, y: 0.012, z: -0.25 };
  laserGroup.position.set(laserPos.x, laserPos.y, laserPos.z);

  const boxScale = isPistol ? 0.65 : 1.0;
  const peqBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.026 * boxScale, 0.022 * boxScale, 0.068 * boxScale),
    peqMat
  );
  laserGroup.add(peqBox);

  const emitterDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.0045, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  emitterDot.position.set(0, 0, -0.036 * boxScale);
  laserGroup.add(emitterDot);

  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, -0.036 * boxScale),
    new THREE.Vector3(0, 0, -4.5),
  ]);
  const beamMat = new THREE.LineBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.65,
  });
  const beamLine = new THREE.Line(beamGeo, beamMat);
  laserGroup.add(beamLine);

  return { suppressorGroup, holoGroup, laserGroup };
}

/**
 * Assign a Three.js rendering layer recursively to an Object3D hierarchy
 * (used to isolate the first-person weapon viewmodel onto WEAPON_VIEWMODEL_LAYER = 1).
 */
export function setObjectLayerRecursive(obj: THREE.Object3D, layer: number): void {
  obj.layers.set(layer);
  for (const child of obj.children) {
    setObjectLayerRecursive(child, layer);
  }
}

/**
 * Toggle 3D attachment mesh visibility on a BuiltWeaponViewModel according to compatible active attachments,
 * and update adsPosition to align the active optic's local Z-axis with the camera.
 */
export function applyAttachmentsToWeaponViewModel(
  vm: BuiltWeaponViewModel,
  attachments?: readonly AttachmentId[]
): void {
  const valid = sanitizeWeaponAttachments(vm.id, attachments);
  const hasHolo = valid.includes('holographic');
  vm.suppressorGroup.visible = valid.includes('suppressor');
  vm.holoGroup.visible = hasHolo;
  vm.laserGroup.visible = valid.includes('laser');
  if (vm.reticleGroup) {
    vm.reticleGroup.visible = !hasHolo;
  }
  const cfg = OPTIC_LOCAL_OFFSETS[vm.id];
  const opticY = hasHolo ? cfg.holographicSightY : cfg.ironSightY;
  vm.adsPosition = { x: 0, y: -opticY, z: cfg.adsZ };
}

/**
 * Modular Factory to instantiate any weapon's 3D model by WeaponId.
 * Used both for First-Person Viewmodels and for the Secondary 3D Weapon Inspect Scene.
 */
export function buildWeaponViewModel(
  weaponId: WeaponId,
  initialAttachments?: readonly AttachmentId[]
): BuiltWeaponViewModel {
  const mods = buildModularAttachmentGroups(weaponId);
  const cfg = OPTIC_LOCAL_OFFSETS[weaponId];
  let built: BuiltWeaponViewModel;

  switch (weaponId) {
    case 'hk416': {
      const m = buildHK416ViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'hk416',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        reticleGroup: m.reticleGroup,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'mp5sd': {
      const m = buildMP5SDViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'mp5sd',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        reticleGroup: m.reticleGroup,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'mk18': {
      const m = buildMK18ViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'mk18',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        reticleGroup: m.reticleGroup,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'm870': {
      const m = buildM870ViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'm870',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        reticleGroup: m.reticleGroup,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'musket': {
      const m = buildMusketViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'musket',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        reticleGroup: m.reticleGroup,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'glock17': {
      const m = buildGlock17ViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'glock17',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        slideMesh: m.slideMesh,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'm1911': {
      const m = buildM1911ViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'm1911',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        slideMesh: m.slideMesh,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'colt_saa': {
      const m = buildColtSAAViewModel();
      m.root.add(mods.suppressorGroup, mods.holoGroup, mods.laserGroup);
      built = {
        id: 'colt_saa',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
    case 'combat_knife': {
      const m = buildCombatKnifeViewModel();
      built = {
        id: 'combat_knife',
        root: m.root,
        muzzleFlash: m.muzzleFlash,
        ...mods,
        hipPosition: { ...cfg.hipOffset },
        adsPosition: { x: 0.0, y: -cfg.ironSightY, z: cfg.adsZ },
      };
      break;
    }
  }

  applyAttachmentsToWeaponViewModel(built, initialAttachments);
  return built;
}

export interface RiggedEnemyBones {
  root: THREE.Bone;
  hips: THREE.Bone;
  spine1: THREE.Bone;
  spine2: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  leftClavicle: THREE.Bone;
  leftUpperArm: THREE.Bone;
  leftForearm: THREE.Bone;
  leftHand: THREE.Bone;
  leftThumb: THREE.Bone;
  leftIndex: THREE.Bone;
  leftFingers: THREE.Bone;
  rightClavicle: THREE.Bone;
  rightUpperArm: THREE.Bone;
  rightForearm: THREE.Bone;
  rightHand: THREE.Bone;
  rightThumb: THREE.Bone;
  rightIndex: THREE.Bone;
  rightFingers: THREE.Bone;
  leftHip: THREE.Bone;
  leftKnee: THREE.Bone;
  leftAnkle: THREE.Bone;
  rightHip: THREE.Bone;
  rightKnee: THREE.Bone;
  rightAnkle: THREE.Bone;
}

export interface RiggedEnemyCombatant {
  group: THREE.Group;
  skeleton: THREE.Skeleton;
  bones: RiggedEnemyBones;
  weaponSocket: THREE.Object3D;
  handguardSocket: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
  laserLine: THREE.Line;
  hitMeshes: THREE.Mesh[];
  rifleGroup: THREE.Group;
}

/**
 * Build a High-Fidelity Rigged Humanoid AI Combatant utilizing a complete 26-bone
 * skeletal hierarchy (spine segments, clavicles, independent finger joints, knees, elbows).
 * The weapon is mounted directly to the right-hand bone socket with an IK target on the handguard.
 */
export function buildEnemyCombatantModel(
  enemyId: string,
  archetype: EnemyArchetype
): RiggedEnemyCombatant {
  const group = new THREE.Group();

  // Distinct tactical archetype palettes & roughness contrasts
  const uniformColor =
    archetype === 'breacher'
      ? 0x2c343f
      : archetype === 'rifleman'
      ? 0x353d2f
      : 0x232832;
  const vestColor =
    archetype === 'breacher'
      ? 0x7c2d12 // Heavy crimson-rust breacher rig
      : archetype === 'rifleman'
      ? 0x52525b // Slate plate carrier
      : 0x1e3a8a; // Marksman recon rig
  const visorColor =
    archetype === 'breacher'
      ? 0xf97316
      : archetype === 'rifleman'
      ? 0xef4444
      : 0x38bdf8;

  const uniformMat = new THREE.MeshStandardMaterial({
    color: uniformColor,
    roughness: 0.82,
    metalness: 0.08,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestColor,
    roughness: 0.52,
    metalness: 0.35,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0x1c2026,
    roughness: 0.32,
    metalness: 0.65,
  });
  const visorMat = new THREE.MeshBasicMaterial({ color: visorColor });
  const gunMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.28,
    metalness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc89d7c,
    roughness: 0.75,
    metalness: 0.05,
  });

  const hitMeshes: THREE.Mesh[] = [];

  // 1. Ground contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  // 2. Complete Skeletal Hierarchy (26 Articulated Bones)
  const root = new THREE.Bone();
  root.name = 'Root';
  group.add(root);

  const hips = new THREE.Bone();
  hips.name = 'Hips';
  hips.position.set(0, 0.88, 0);
  root.add(hips);

  const spine1 = new THREE.Bone();
  spine1.name = 'Spine1';
  spine1.position.set(0, 0.12, 0);
  hips.add(spine1);

  const spine2 = new THREE.Bone();
  spine2.name = 'Spine2';
  spine2.position.set(0, 0.16, 0);
  spine1.add(spine2);

  const neck = new THREE.Bone();
  neck.name = 'Neck';
  neck.position.set(0, 0.27, 0);
  spine2.add(neck);

  const head = new THREE.Bone();
  head.name = 'Head';
  head.position.set(0, 0.09, 0);
  neck.add(head);

  // Left Arm hierarchy
  const leftClavicle = new THREE.Bone();
  leftClavicle.name = 'LeftClavicle';
  leftClavicle.position.set(-0.10, 0.18, 0.04);
  spine2.add(leftClavicle);

  const leftUpperArm = new THREE.Bone();
  leftUpperArm.name = 'LeftUpperArm';
  leftUpperArm.position.set(-0.08, -0.02, 0.0);
  leftClavicle.add(leftUpperArm);

  const leftForearm = new THREE.Bone();
  leftForearm.name = 'LeftForearm';
  leftForearm.position.set(0.0, -0.32, 0.0);
  leftUpperArm.add(leftForearm);

  const leftHand = new THREE.Bone();
  leftHand.name = 'LeftHand';
  leftHand.position.set(0.0, -0.30, 0.0);
  leftForearm.add(leftHand);

  const leftThumb = new THREE.Bone();
  leftThumb.name = 'LeftThumb';
  leftThumb.position.set(0.02, -0.03, -0.02);
  leftHand.add(leftThumb);

  const leftIndex = new THREE.Bone();
  leftIndex.name = 'LeftIndex';
  leftIndex.position.set(-0.01, -0.05, -0.01);
  leftHand.add(leftIndex);

  const leftFingers = new THREE.Bone();
  leftFingers.name = 'LeftFingers';
  leftFingers.position.set(-0.03, -0.05, 0.0);
  leftHand.add(leftFingers);

  // Right Arm hierarchy
  const rightClavicle = new THREE.Bone();
  rightClavicle.name = 'RightClavicle';
  rightClavicle.position.set(0.08, 0.18, 0.0);
  spine2.add(rightClavicle);

  const rightUpperArm = new THREE.Bone();
  rightUpperArm.name = 'RightUpperArm';
  rightUpperArm.position.set(0.06, -0.02, 0.0);
  rightClavicle.add(rightUpperArm);

  const rightForearm = new THREE.Bone();
  rightForearm.name = 'RightForearm';
  rightForearm.position.set(0.0, -0.26, 0.0);
  rightUpperArm.add(rightForearm);

  const rightHand = new THREE.Bone();
  rightHand.name = 'RightHand';
  rightHand.position.set(0.0, -0.22, 0.0);
  rightForearm.add(rightHand);

  const rightThumb = new THREE.Bone();
  rightThumb.name = 'RightThumb';
  rightThumb.position.set(-0.02, -0.03, -0.02);
  rightHand.add(rightThumb);

  const rightIndex = new THREE.Bone();
  rightIndex.name = 'RightIndex';
  rightIndex.position.set(0.01, -0.05, -0.02);
  rightHand.add(rightIndex);

  const rightFingers = new THREE.Bone();
  rightFingers.name = 'RightFingers';
  rightFingers.position.set(0.03, -0.05, 0.0);
  rightHand.add(rightFingers);

  // Left Leg hierarchy
  const leftHip = new THREE.Bone();
  leftHip.name = 'LeftHip';
  leftHip.position.set(-0.11, -0.04, 0.0);
  hips.add(leftHip);

  const leftKnee = new THREE.Bone();
  leftKnee.name = 'LeftKnee';
  leftKnee.position.set(0.0, -0.36, 0.0);
  leftHip.add(leftKnee);

  const leftAnkle = new THREE.Bone();
  leftAnkle.name = 'LeftAnkle';
  leftAnkle.position.set(0.0, -0.34, 0.0);
  leftKnee.add(leftAnkle);

  // Right Leg hierarchy
  const rightHip = new THREE.Bone();
  rightHip.name = 'RightHip';
  rightHip.position.set(0.11, -0.04, 0.0);
  hips.add(rightHip);

  const rightKnee = new THREE.Bone();
  rightKnee.name = 'RightKnee';
  rightKnee.position.set(0.0, -0.36, 0.0);
  rightHip.add(rightKnee);

  const rightAnkle = new THREE.Bone();
  rightAnkle.name = 'RightAnkle';
  rightAnkle.position.set(0.0, -0.34, 0.0);
  rightKnee.add(rightAnkle);

  const bones: RiggedEnemyBones = {
    root,
    hips,
    spine1,
    spine2,
    neck,
    head,
    leftClavicle,
    leftUpperArm,
    leftForearm,
    leftHand,
    leftThumb,
    leftIndex,
    leftFingers,
    rightClavicle,
    rightUpperArm,
    rightForearm,
    rightHand,
    rightThumb,
    rightIndex,
    rightFingers,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
  };

  const skeleton = new THREE.Skeleton([
    root,
    hips,
    spine1,
    spine2,
    neck,
    head,
    leftClavicle,
    leftUpperArm,
    leftForearm,
    leftHand,
    leftThumb,
    leftIndex,
    leftFingers,
    rightClavicle,
    rightUpperArm,
    rightForearm,
    rightHand,
    rightThumb,
    rightIndex,
    rightFingers,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
  ]);

  // 3. Attach High-Fidelity Tactical Meshes to Bone Sockets

  // HIPS: Pelvis duty belt (Seamlessly covers hips and upper thighs)
  const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.24), uniformMat);
  pelvisMesh.position.set(0, 0, 0);
  pelvisMesh.userData = { enemyId, hitZone: 'torso', hitBone: 'hips' as RagdollBoneId };
  hips.add(pelvisMesh);
  hitMeshes.push(pelvisMesh);

  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.06, 0.25), gunMat);
  belt.position.set(0, 0.08, 0);
  hips.add(belt);

  // SPINE1: Abdomen & Side utility pouches (Overlaps pelvis with zero gap)
  const abdomenMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.20, 0.24), vestMat);
  abdomenMesh.position.set(0, 0.08, 0);
  abdomenMesh.userData = { enemyId, hitZone: 'torso', hitBone: 'spine1' as RagdollBoneId };
  spine1.add(abdomenMesh);
  hitMeshes.push(abdomenMesh);

  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.09), gunMat);
  pouchL.position.set(-0.20, 0.06, 0.02);
  spine1.add(pouchL);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.09), gunMat);
  pouchR.position.set(0.20, 0.06, 0.02);
  spine1.add(pouchR);

  // SPINE2: Upper Torso Plate Carrier Rig (Torso Hitzone, overlaps abdomen with zero gap)
  const torsoWidth = archetype === 'breacher' ? 0.50 : 0.44;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoWidth, 0.32, 0.27), vestMat);
  torso.position.set(0, 0.13, 0);
  torso.userData = { enemyId, hitZone: 'torso', hitBone: 'spine2' as RagdollBoneId };
  spine2.add(torso);
  hitMeshes.push(torso);

  // 3x MOLLE Stanag Mag Pouches
  const molleMat = new THREE.MeshStandardMaterial({ color: 0x19211a, roughness: 0.85 });
  for (let m = 0; m < 3; m++) {
    const mx = -0.11 + m * 0.11;
    const magPouch = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.14, 0.06), molleMat);
    magPouch.position.set(mx, 0.10, -0.15);
    spine2.add(magPouch);
  }

  // Tactical Shoulder Radio with Whip Antenna
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.05), gunMat);
  radio.position.set(-0.17, 0.24, -0.10);
  spine2.add(radio);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 6), gunMat);
  antenna.position.set(-0.17, 0.38, -0.10);
  spine2.add(antenna);

  // NECK: Collar & Balaclava (Seamlessly bridges chest to head)
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.12, 8), uniformMat);
  neckMesh.position.set(0, 0.05, 0);
  neckMesh.userData = { enemyId, hitZone: 'head', hitBone: 'neck' as RagdollBoneId };
  neck.add(neckMesh);
  hitMeshes.push(neckMesh);

  // HEAD: FAST Ballistic Helmet, NVG Shroud, Tactical Headset, Visor (Head Hitzone)
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.27), helmetMat);
  headMesh.position.set(0, 0.12, -0.01);
  headMesh.userData = { enemyId, hitZone: 'head', hitBone: 'head' as RagdollBoneId };
  head.add(headMesh);
  hitMeshes.push(headMesh);

  const nvgShroud = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.035), gunMat);
  nvgShroud.position.set(0, 0.19, -0.15);
  head.add(nvgShroud);

  const headsetMat = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.65 });
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.10, 0.08), headsetMat);
  earL.position.set(-0.15, 0.12, 0);
  head.add(earL);

  const earR = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.10, 0.08), headsetMat);
  earR.position.set(0.15, 0.12, 0);
  head.add(earR);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.075, 0.03), visorMat);
  visor.position.set(0, 0.12, -0.145);
  visor.userData = { enemyId, hitZone: 'head', hitBone: 'head' as RagdollBoneId };
  head.add(visor);
  hitMeshes.push(visor);

  // LIMBS: Arms & Forearms
  const upperArmGeo = new THREE.BoxGeometry(0.12, 0.26, 0.14);
  const leftUpperArmMesh = new THREE.Mesh(upperArmGeo, uniformMat);
  leftUpperArmMesh.position.set(0, -0.13, 0);
  leftUpperArmMesh.userData = { enemyId, hitZone: 'limb', hitBone: 'leftUpperArm' as RagdollBoneId };
  leftUpperArm.add(leftUpperArmMesh);
  hitMeshes.push(leftUpperArmMesh);

  const rightUpperArmMesh = new THREE.Mesh(upperArmGeo, uniformMat);
  rightUpperArmMesh.position.set(0, -0.13, 0);
  rightUpperArmMesh.userData = { enemyId, hitZone: 'limb', hitBone: 'rightUpperArm' as RagdollBoneId };
  rightUpperArm.add(rightUpperArmMesh);
  hitMeshes.push(rightUpperArmMesh);

  const leftForearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.13), uniformMat);
  leftForearmMesh.position.set(0, -0.14, 0);
  leftForearmMesh.userData = { enemyId, hitZone: 'limb', hitBone: 'leftForearm' as RagdollBoneId };
  leftForearm.add(leftForearmMesh);
  hitMeshes.push(leftForearmMesh);

  const leftElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), gunMat);
  leftElbowPad.position.set(0, -0.06, 0.06);
  leftForearm.add(leftElbowPad);

  const rightForearmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.13), uniformMat);
  rightForearmMesh.position.set(0, -0.12, 0);
  rightForearmMesh.userData = { enemyId, hitZone: 'limb', hitBone: 'rightForearm' as RagdollBoneId };
  rightForearm.add(rightForearmMesh);
  hitMeshes.push(rightForearmMesh);

  const rightElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), gunMat);
  rightElbowPad.position.set(0, -0.06, 0.06);
  rightForearm.add(rightElbowPad);

  // Tactical Gloves & Independent Finger Joints
  const gloveGeo = new THREE.BoxGeometry(0.085, 0.085, 0.09);
  const leftGlove = new THREE.Mesh(gloveGeo, gunMat);
  leftGlove.position.set(0, -0.04, 0);
  leftHand.add(leftGlove);

  const rightGlove = new THREE.Mesh(gloveGeo, gunMat);
  rightGlove.position.set(0, -0.04, 0);
  rightHand.add(rightGlove);

  // Articulated finger phalanges
  const fingerGeo = new THREE.BoxGeometry(0.024, 0.05, 0.024);
  const leftThumbMesh = new THREE.Mesh(fingerGeo, skinMat);
  leftThumb.add(leftThumbMesh);
  const leftIndexMesh = new THREE.Mesh(fingerGeo, skinMat);
  leftIndex.add(leftIndexMesh);
  const leftFingersMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.024), skinMat);
  leftFingers.add(leftFingersMesh);

  const rightThumbMesh = new THREE.Mesh(fingerGeo, skinMat);
  rightThumb.add(rightThumbMesh);
  const rightIndexMesh = new THREE.Mesh(fingerGeo, skinMat);
  rightIndex.add(rightIndexMesh);
  const rightFingersMesh = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.024), skinMat);
  rightFingers.add(rightFingersMesh);

  // LEGS: Thighs, Knees, and Combat Boots (Limb Hitzones, zero gap at hips)
  const thighGeo = new THREE.BoxGeometry(0.16, 0.38, 0.18);
  const leftThigh = new THREE.Mesh(thighGeo, uniformMat);
  leftThigh.position.set(0, -0.17, 0);
  leftThigh.userData = { enemyId, hitZone: 'limb', hitBone: 'leftHip' as RagdollBoneId };
  leftHip.add(leftThigh);
  hitMeshes.push(leftThigh);

  const rightThigh = new THREE.Mesh(thighGeo, uniformMat);
  rightThigh.position.set(0, -0.17, 0);
  rightThigh.userData = { enemyId, hitZone: 'limb', hitBone: 'rightHip' as RagdollBoneId };
  rightHip.add(rightThigh);
  hitMeshes.push(rightThigh);

  // Drop-leg holster on right thigh
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.09), gunMat);
  holster.position.set(0.10, -0.17, 0);
  rightHip.add(holster);

  const shinGeo = new THREE.BoxGeometry(0.14, 0.36, 0.16);
  const leftShin = new THREE.Mesh(shinGeo, uniformMat);
  leftShin.position.set(0, -0.17, 0);
  leftShin.userData = { enemyId, hitZone: 'limb', hitBone: 'leftKnee' as RagdollBoneId };
  leftKnee.add(leftShin);
  hitMeshes.push(leftShin);

  const leftKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.07), gunMat);
  leftKneePad.position.set(0, 0.0, -0.08);
  leftKnee.add(leftKneePad);

  const rightShin = new THREE.Mesh(shinGeo, uniformMat);
  rightShin.position.set(0, -0.17, 0);
  rightShin.userData = { enemyId, hitZone: 'limb', hitBone: 'rightKnee' as RagdollBoneId };
  rightKnee.add(rightShin);
  hitMeshes.push(rightShin);

  const rightKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.10, 0.07), gunMat);
  rightKneePad.position.set(0, 0.0, -0.08);
  rightKnee.add(rightKneePad);

  // Combat Boots (Grounded at floor level)
  const bootGeo = new THREE.BoxGeometry(0.13, 0.14, 0.24);
  const leftBoot = new THREE.Mesh(bootGeo, gunMat);
  leftBoot.position.set(0, -0.06, -0.03);
  leftAnkle.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeo, gunMat);
  rightBoot.position.set(0, -0.06, -0.03);
  rightAnkle.add(rightBoot);

  // 4. WEAPON SOCKET & AI CARBINE
  // Attach firearm directly to right-hand bone socket with accurate forward aim orientation
  const weaponSocket = new THREE.Object3D();
  weaponSocket.name = 'RightHandWeaponSocket';
  weaponSocket.position.set(0.0, -0.04, -0.02);
  weaponSocket.rotation.set(-2.00, 0.22, 0.65);
  rightHand.add(weaponSocket);

  const rifleGroup = new THREE.Group();
  rifleGroup.position.set(-0.16, 0.07, 0.16);
  weaponSocket.add(rifleGroup);

  // Carbine receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.28), gunMat);
  rifleGroup.add(receiver);

  // Pistol grip (inside right hand)
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.12, 0.05), gunMat);
  grip.position.set(0, -0.07, 0.06);
  grip.rotation.x = -0.28;
  rifleGroup.add(grip);

  // STANAG 30-round magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.17, 0.07), gunMat);
  mag.position.set(0, -0.10, -0.05);
  mag.rotation.x = 0.15;
  rifleGroup.add(mag);

  // Handguard rail
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.058, 0.26), gunMat);
  handguard.position.set(0, 0.005, -0.24);
  rifleGroup.add(handguard);

  // Optical sight on upper rail
  const optic = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.048, 0.11), gunMat);
  optic.position.set(0, 0.062, -0.02);
  rifleGroup.add(optic);

  // Handguard IK Target: Left hand snaps accurately here
  const handguardSocket = new THREE.Object3D();
  handguardSocket.name = 'HandguardIKTarget';
  handguardSocket.position.set(0.0, 0.015, -0.16);
  rifleGroup.add(handguardSocket);

  // Barrel & Muzzle Point (Origin for bullet raycasts)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), gunMat);
  barrel.rotation.x = -Math.PI / 2;
  barrel.position.set(0, 0.01, -0.45);
  rifleGroup.add(barrel);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.name = 'CarbineMuzzle';
  muzzlePoint.position.set(0, 0.01, -0.56);
  rifleGroup.add(muzzlePoint);

  // Visible Laser Sight Telegraph Line attached to muzzlePoint
  const laserGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -12.0),
  ]);
  const laserMat = new THREE.LineBasicMaterial({
    color: visorColor,
    transparent: true,
    opacity: 0.0,
  });
  const laserLine = new THREE.Line(laserGeo, laserMat);
  muzzlePoint.add(laserLine);

  return {
    group,
    skeleton,
    bones,
    weaponSocket,
    handguardSocket,
    muzzlePoint,
    laserLine,
    hitMeshes,
    rifleGroup,
  };
}

// Module-level math helpers to guarantee Zero GC in render loop
const _ikTargetWorld = new THREE.Vector3();
const _shoulderWorld = new THREE.Vector3();
const _elbowWorld = new THREE.Vector3();
const _aimChestWorld = new THREE.Vector3();
const _toTargetVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _planeNormalVec = new THREE.Vector3();
const _bendDirVec = new THREE.Vector3();
const _upperArmDirWorld = new THREE.Vector3();
const _upperArmDirLocal = new THREE.Vector3();
const _forearmDirWorld = new THREE.Vector3();
const _forearmDirLocal = new THREE.Vector3();
const _parentInvMat = new THREE.Matrix4();
const _upperArmInvMat = new THREE.Matrix4();
const _quatUpper = new THREE.Quaternion();
const _quatForearm = new THREE.Quaternion();
const _poleVecWorld = new THREE.Vector3(-0.35, -0.85, -0.15).normalize();
const _boneDownLocal = new THREE.Vector3(0, -1, 0);

/**
 * Procedural AI Skeletal Animator & Multi-Bone IK Solver
 * - Smoothly blends idle, tactical walk, sprint, and hit-reaction flinch
 * - Multi-bone IK dynamically rotates spine, chest, neck, head, and right arm toward player
 * - Analytical two-bone Law-of-Cosines IK solver snaps left hand directly to weapon's handguard socket
 * - Physical rifle barrel strictly aligns with forward aim vector and laser telegraph
 */
export function stepAICombatantAnimationAndIK(
  enemy: {
    bones: RiggedEnemyBones;
    handguardSocket: THREE.Object3D;
    muzzlePoint: THREE.Object3D;
    group: THREE.Group;
    blendWeights: AIAnimationBlendWeights;
    animPhase: number;
    flinchTimer: number;
    isAimingAtPlayer: boolean;
    aimTarget: { x: number; y: number; z: number };
    koTimer: number;
    state: string;
    crouchProgress?: number;
    leanAmount?: number;
  },
  dt: number
) {
  // If neutralized / KO, ragdoll physics directly controls bones
  if (enemy.state === 'ko') {
    return;
  }

  // 1. Advance Gait Phase based on blended movement speed
  const strideSpeed = enemy.blendWeights.sprint > 0.4 ? 9.2 : 5.8;
  enemy.animPhase +=
    dt * strideSpeed * (enemy.blendWeights.walk + enemy.blendWeights.sprint * 1.4);
  const p = enemy.animPhase;

  // 2. Base Locomotion Animation Blending
  const wIdle = enemy.blendWeights.idle;
  const wWalk = enemy.blendWeights.walk;
  const wSprint = enemy.blendWeights.sprint;
  const wFlinch = enemy.blendWeights.flinch;
  const crouch = Math.max(0, Math.min(1, enemy.crouchProgress ?? 0));
  const lean = Math.max(-1, Math.min(1, enemy.leanAmount ?? 0));

  // Stride swing & anatomically accurate knee flexion (knees flex backward + crouch knee bend)
  const legSwing = Math.sin(p) * (0.42 * wWalk + 0.72 * wSprint);
  const crouchHipFlex = crouch * 0.65;
  const crouchKneeFlex = crouch * 1.15;
  enemy.bones.leftHip.rotation.x = legSwing + crouchHipFlex;
  enemy.bones.rightHip.rotation.x = -legSwing + crouchHipFlex;
  enemy.bones.leftKnee.rotation.x = -Math.max(0, legSwing * 1.25) - crouchKneeFlex;
  enemy.bones.rightKnee.rotation.x = -Math.max(0, -legSwing * 1.25) - crouchKneeFlex;

  // Hip bounce, crouch drop & sway
  enemy.bones.hips.position.y =
    0.88 -
    crouch * 0.34 +
    Math.abs(Math.sin(p)) * (0.024 * wWalk + 0.048 * wSprint);
  enemy.bones.hips.rotation.y = Math.sin(p) * 0.08 * (wWalk + wSprint);

  // Breathing, forward torso lean & Rainbow Six Siege style lateral spine lean
  const breath = Math.sin(Date.now() * 0.0024) * 0.022 * wIdle;
  enemy.bones.spine1.rotation.x =
    breath + 0.08 * wWalk + 0.28 * wSprint + crouch * 0.22;
  enemy.bones.spine1.rotation.y = 0;
  enemy.bones.spine1.rotation.z = -lean * 0.22;
  enemy.bones.spine2.rotation.x =
    breath * 0.6 + 0.06 * wWalk + 0.18 * wSprint + crouch * 0.12;
  enemy.bones.spine2.rotation.y = 0;
  enemy.bones.spine2.rotation.z = -lean * 0.18;

  enemy.bones.neck.rotation.set(0, 0, -lean * 0.08);
  enemy.bones.head.rotation.set(0, 0, 0);

  // Default tactical weapon ready pose for right arm (braced against shoulder, pointing forward)
  enemy.bones.rightUpperArm.rotation.set(0.48, -0.48, -0.32);
  enemy.bones.rightForearm.rotation.set(1.65, -0.10, 0.45);
  enemy.bones.rightHand.rotation.set(-0.25, 0.10, 0.10);

  // Left clavicle angled slightly forward to complete tactical shooting stance
  enemy.bones.leftClavicle.rotation.set(0.24, 0.32, -0.10);

  // 3. Hit-Reaction Flinching Layer
  if (wFlinch > 0.01) {
    enemy.bones.spine1.rotation.x -= 0.32 * wFlinch;
    enemy.bones.spine2.rotation.x -= 0.24 * wFlinch;
    enemy.bones.neck.rotation.x -= 0.20 * wFlinch;
    enemy.bones.head.rotation.x -= 0.16 * wFlinch;
    enemy.bones.rightUpperArm.rotation.x += 0.24 * wFlinch;
  }

  // 4. Multi-Bone Dynamic Aiming (Spine1, Spine2, Neck, Head, Right Arm)
  if (enemy.isAimingAtPlayer) {
    enemy.bones.spine2.getWorldPosition(_aimChestWorld);
    const aim = calculateMultiBoneAimAngles(
      _aimChestWorld,
      enemy.group.rotation.y,
      enemy.aimTarget
    );

    enemy.bones.spine1.rotation.y += aim.spine1Yaw;
    enemy.bones.spine1.rotation.x += aim.spine1Pitch;
    enemy.bones.spine2.rotation.y += aim.spine2Yaw;
    enemy.bones.spine2.rotation.x += aim.spine2Pitch;
    enemy.bones.neck.rotation.y += aim.neckYaw;
    enemy.bones.neck.rotation.x += aim.neckPitch;
    enemy.bones.head.rotation.y += aim.headYaw;
    enemy.bones.head.rotation.x += aim.headPitch;
    enemy.bones.rightUpperArm.rotation.x += aim.armPitch;
    enemy.bones.rightUpperArm.rotation.y += aim.armYaw;
  }

  // 5. Analytical Two-Bone Inverse Kinematics (IK) for Left Hand -> Handguard Socket
  // Update matrix world for character spine, right arm, and handguard target
  enemy.bones.spine2.updateMatrixWorld(true);
  enemy.bones.rightHand.updateMatrixWorld(true);
  enemy.handguardSocket.updateMatrixWorld(true);

  enemy.handguardSocket.getWorldPosition(_ikTargetWorld);
  enemy.bones.leftUpperArm.getWorldPosition(_shoulderWorld);

  _toTargetVec.subVectors(_ikTargetWorld, _shoulderWorld);
  const targetDist = _toTargetVec.length();
  const ik = solveTwoBoneIK(targetDist, 0.32, 0.30);

  _dirVec.copy(_toTargetVec).normalize();
  _planeNormalVec.crossVectors(_dirVec, _poleVecWorld).normalize();
  _bendDirVec.crossVectors(_planeNormalVec, _dirVec).normalize();

  _upperArmDirWorld
    .copy(_dirVec)
    .multiplyScalar(Math.cos(ik.shoulderAngle))
    .addScaledVector(_bendDirVec, Math.sin(ik.shoulderAngle))
    .normalize();

  if (enemy.bones.leftUpperArm.parent) {
    _parentInvMat.copy(enemy.bones.leftUpperArm.parent.matrixWorld).invert();
    _upperArmDirLocal.copy(_upperArmDirWorld).transformDirection(_parentInvMat);
  } else {
    _upperArmDirLocal.copy(_upperArmDirWorld);
  }

  _quatUpper.setFromUnitVectors(_boneDownLocal, _upperArmDirLocal);
  enemy.bones.leftUpperArm.quaternion.copy(_quatUpper);
  enemy.bones.leftUpperArm.updateMatrixWorld(true);

  enemy.bones.leftForearm.getWorldPosition(_elbowWorld);
  _forearmDirWorld.subVectors(_ikTargetWorld, _elbowWorld).normalize();

  _upperArmInvMat.copy(enemy.bones.leftUpperArm.matrixWorld).invert();
  _forearmDirLocal.copy(_forearmDirWorld).transformDirection(_upperArmInvMat);

  _quatForearm.setFromUnitVectors(_boneDownLocal, _forearmDirLocal);
  enemy.bones.leftForearm.quaternion.copy(_quatForearm);
  enemy.bones.leftForearm.updateMatrixWorld(true);

  // Snap left hand and curl finger joints firmly around the handguard
  enemy.bones.leftHand.rotation.set(-0.35, 0.22, 0.45);
  enemy.bones.leftThumb.rotation.set(0.60, 0.25, 0.15);
  enemy.bones.leftIndex.rotation.set(-0.80, 0.15, 0.0);
  enemy.bones.leftFingers.rotation.set(-0.90, 0.0, 0.0);
}

/**
 * Apply simulated ragdoll joint rotations and root transform directly to the skeletal rig.
 * Seamlessly articulates spine, neck whiplash, knee buckling, arm flop, and weapon drop.
 */
export function applyRagdollToEnemyBones(
  bones: RiggedEnemyBones,
  group: THREE.Group,
  weaponSocket: THREE.Object3D,
  ragdoll: EnemyRagdoll
) {
  // Update root position and overall body orientation
  group.position.set(ragdoll.rootPos.x, ragdoll.rootPos.y, ragdoll.rootPos.z);
  group.rotation.set(ragdoll.rootRot.x, ragdoll.rootRot.y, ragdoll.rootRot.z, 'YXZ');

  // Pelvis / Hips height
  bones.hips.position.y = ragdoll.hipsY;

  // Spine & Torso
  bones.spine1.rotation.set(ragdoll.spine1.rotX, ragdoll.spine1.rotY, ragdoll.spine1.rotZ);
  bones.spine2.rotation.set(ragdoll.spine2.rotX, ragdoll.spine2.rotY, ragdoll.spine2.rotZ);

  // Neck & Head (realistic whiplash and resting head pose)
  bones.neck.rotation.set(ragdoll.neck.rotX, ragdoll.neck.rotY, ragdoll.neck.rotZ);
  bones.head.rotation.set(ragdoll.head.rotX, ragdoll.head.rotY, ragdoll.head.rotZ);

  // Left Arm (relaxed on floor)
  bones.leftClavicle.rotation.set(0.12, 0.15, -0.05);
  bones.leftUpperArm.rotation.set(
    ragdoll.leftUpperArm.rotX,
    ragdoll.leftUpperArm.rotY,
    ragdoll.leftUpperArm.rotZ
  );
  bones.leftForearm.rotation.set(
    ragdoll.leftForearm.rotX,
    ragdoll.leftForearm.rotY,
    ragdoll.leftForearm.rotZ
  );
  bones.leftHand.rotation.set(0.1, 0.2, 0.1);

  // Right Arm (weapon dropped, arm relaxed)
  bones.rightClavicle.rotation.set(0.12, -0.15, 0.05);
  bones.rightUpperArm.rotation.set(
    ragdoll.rightUpperArm.rotX,
    ragdoll.rightUpperArm.rotY,
    ragdoll.rightUpperArm.rotZ
  );
  bones.rightForearm.rotation.set(
    ragdoll.rightForearm.rotX,
    ragdoll.rightForearm.rotY,
    ragdoll.rightForearm.rotZ
  );

  // Fingers open & relaxed (loss of grip on rifle)
  bones.rightThumb.rotation.z = 0.35;
  bones.rightIndex.rotation.x = -0.25;
  bones.rightFingers.rotation.x = -0.35;

  // Legs & Combat Boots (knees flexed, feet resting on floor)
  bones.leftHip.rotation.set(
    ragdoll.leftHip.rotX,
    ragdoll.leftHip.rotY,
    ragdoll.leftHip.rotZ
  );
  bones.leftKnee.rotation.set(
    ragdoll.leftKnee.rotX,
    ragdoll.leftKnee.rotY,
    ragdoll.leftKnee.rotZ
  );
  bones.leftAnkle.rotation.set(0.2, 0, -0.1);

  bones.rightHip.rotation.set(
    ragdoll.rightHip.rotX,
    ragdoll.rightHip.rotY,
    ragdoll.rightHip.rotZ
  );
  bones.rightKnee.rotation.set(
    ragdoll.rightKnee.rotX,
    ragdoll.rightKnee.rotY,
    ragdoll.rightKnee.rotZ
  );
  bones.rightAnkle.rotation.set(0.2, 0, 0.1);

  // Dropped firearm resting on floor beside body
  const w = ragdoll.droppedWeapon;
  weaponSocket.position.set(w.x, w.y, w.z);
  weaponSocket.rotation.set(w.rx, w.ry, w.rz);
}


/**
 * Build a High-Explosive (HE) M67 Fragmentation Grenade 3D Model
 */
export function buildHEGrenadeModel(): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x3d4928, // Olive Drab
    roughness: 0.48,
    metalness: 0.35,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x474d56,
    roughness: 0.28,
    metalness: 0.88,
  });
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });

  // Spherical fragmentation body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), bodyMat);
  group.add(body);

  // Yellow ordnance stripe around equator
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.012, 16, 1, true), yellowMat);
  group.add(stripe);

  // Fuse neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.03, 12), metalMat);
  neck.position.y = 0.058;
  group.add(neck);

  // Curved safety lever (spoon)
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.07, 0.006), metalMat);
  lever.position.set(0.026, 0.04, 0);
  lever.rotation.z = -0.22;
  group.add(lever);

  // Pull ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 8, 16), metalMat);
  ring.position.set(-0.028, 0.065, 0);
  ring.rotation.y = Math.PI / 2;
  group.add(ring);

  return group;
}

/**
 * Build a Tactical Office Desk Model
 */
export function buildTacticalDeskModel(sx = 1.45, sy = 0.82, sz = 0.85): THREE.Group {
  const group = new THREE.Group();

  const laminateMat = new THREE.MeshStandardMaterial({
    color: 0x2b333e,
    roughness: 0.55,
    metalness: 0.2,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1f2329,
    roughness: 0.35,
    metalness: 0.85,
  });

  // Desktop Surface
  const top = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.045, sz), laminateMat);
  top.position.y = sy - 0.0225;
  group.add(top);

  // Twin drawer pedestals
  const pedW = 0.36;
  const pedH = sy - 0.045;
  const leftPed = new THREE.Mesh(new THREE.BoxGeometry(pedW, pedH, sz * 0.92), steelMat);
  leftPed.position.set(-sx * 0.5 + pedW * 0.5 + 0.05, pedH * 0.5, 0);
  group.add(leftPed);

  const rightPed = new THREE.Mesh(new THREE.BoxGeometry(pedW, pedH, sz * 0.92), steelMat);
  rightPed.position.set(sx * 0.5 - pedW * 0.5 - 0.05, pedH * 0.5, 0);
  group.add(rightPed);

  // Modesty back panel
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(sx - 0.1, pedH * 0.65, 0.02), laminateMat);
  backPanel.position.set(0, pedH * 0.6, sz * 0.4);
  group.add(backPanel);

  return group;
}

/**
 * Build a 42U Server Rack Model with Blinking Status LEDs
 */
export function buildServerRackModel(sx = 0.95, sy = 2.15, sz = 0.95): THREE.Group {
  const group = new THREE.Group();

  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0x12151b,
    roughness: 0.45,
    metalness: 0.75,
  });
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x222832,
    roughness: 0.35,
    metalness: 0.85,
  });

  // Outer Cabinet
  const frame = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), cabinetMat);
  frame.position.y = sy * 0.5;
  group.add(frame);

  // Front glass/perforated door inset
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x090c10,
    roughness: 0.15,
    metalness: 0.95,
  });
  const door = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.84, sy * 0.92, 0.02), doorMat);
  door.position.set(0, sy * 0.5, sz * 0.5 + 0.01);
  group.add(door);

  // Stacked 1U/2U server blades with LED indicators
  const ledGreenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
  const ledAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const ledBlueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const bladeCount = 8;
  const bladeH = (sy * 0.82) / bladeCount;
  for (let b = 0; b < bladeCount; b++) {
    const by = 0.25 + b * bladeH;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(sx * 0.78, bladeH * 0.8, 0.025), chassisMat);
    blade.position.set(0, by, sz * 0.5 + 0.018);
    group.add(blade);

    // 3 status LEDs per blade
    const matA = b % 3 === 0 ? ledAmberMat : ledGreenMat;
    const matB = b % 2 === 0 ? ledBlueMat : ledGreenMat;
    const led1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.005), matA);
    led1.position.set(-sx * 0.32, by, sz * 0.5 + 0.032);
    const led2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.005), matB);
    led2.position.set(-sx * 0.28, by, sz * 0.5 + 0.032);
    group.add(led1, led2);
  }

  return group;
}

/**
 * Build a Concrete Jersey Barrier Model
 */
export function buildConcreteBarrierModel(sx = 1.65, sy = 1.05, sz = 0.65): THREE.Group {
  const group = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x545d6a,
    roughness: 0.85,
    metalness: 0.05,
  });
  const rebarMat = new THREE.MeshStandardMaterial({
    color: 0x2a3038,
    roughness: 0.3,
    metalness: 0.9,
  });

  // Wide bottom base
  const base = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.35, sz), concreteMat);
  base.position.y = (sy * 0.35) * 0.5;
  group.add(base);

  // Tapered upper concrete ridge
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(sx, sy * 0.65, sz * 0.52), concreteMat);
  ridge.position.y = sy * 0.35 + (sy * 0.65) * 0.5;
  group.add(ridge);

  // Top steel rebar lifting loops
  const loopGeo = new THREE.TorusGeometry(0.05, 0.01, 8, 16, Math.PI);
  const loop1 = new THREE.Mesh(loopGeo, rebarMat);
  loop1.position.set(-sx * 0.3, sy, 0);
  const loop2 = new THREE.Mesh(loopGeo, rebarMat);
  loop2.position.set(sx * 0.3, sy, 0);
  group.add(loop1, loop2);

  return group;
}

/**
 * Build an Interactable / Proximity-Triggered Tactical Armory Ambush Locker
 * with articulated left and right hinged steel doors that blast open when triggered.
 */
export interface BuiltTacticalLockerModel {
  group: THREE.Group;
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  statusLed: THREE.Mesh;
}

export function buildTacticalLockerModel(
  sx = 0.96,
  sy = 2.18,
  sz = 0.64
): BuiltTacticalLockerModel {
  const group = new THREE.Group();

  const lockerMat = new THREE.MeshStandardMaterial({
    color: 0x262f3b,
    roughness: 0.42,
    metalness: 0.78,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x161b22,
    roughness: 0.35,
    metalness: 0.85,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.5,
    metalness: 0.25,
  });

  // Back wall, side walls, top & bottom of the hollow steel locker cabinet
  const wallT = 0.04;
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, wallT), lockerMat);
  backPanel.position.set(0, sy * 0.5, -sz * 0.5 + wallT * 0.5);
  group.add(backPanel);

  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(wallT, sy, sz), lockerMat);
  leftSide.position.set(-sx * 0.5 + wallT * 0.5, sy * 0.5, 0);
  group.add(leftSide);

  const rightSide = new THREE.Mesh(new THREE.BoxGeometry(wallT, sy, sz), lockerMat);
  rightSide.position.set(sx * 0.5 - wallT * 0.5, sy * 0.5, 0);
  group.add(rightSide);

  const topCap = new THREE.Mesh(new THREE.BoxGeometry(sx, wallT, sz), trimMat);
  topCap.position.set(0, sy - wallT * 0.5, 0);
  group.add(topCap);

  const bottomBase = new THREE.Mesh(new THREE.BoxGeometry(sx, wallT * 1.5, sz), trimMat);
  bottomBase.position.set(0, wallT * 0.75, 0);
  group.add(bottomBase);

  // Top amber/red proximity beacon LED
  const statusLed = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.035, 0.03),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  statusLed.position.set(0, sy - 0.06, sz * 0.5 + 0.01);
  group.add(statusLed);

  // Articulated Double Doors hinged at outer left/right front edges
  const doorW = (sx - wallT * 2) * 0.5;
  const doorH = sy - wallT * 2.5;
  const doorT = 0.03;

  const leftDoorPivot = new THREE.Group();
  leftDoorPivot.position.set(-sx * 0.5 + wallT, sy * 0.5, sz * 0.5 - doorT * 0.5);
  const leftDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorT), lockerMat);
  leftDoorMesh.position.set(doorW * 0.5, 0, 0);
  leftDoorPivot.add(leftDoorMesh);

  const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.85, 0.05, 0.008), hazardMat);
  leftStripe.position.set(doorW * 0.5, 0.25, doorT * 0.5 + 0.004);
  leftDoorPivot.add(leftStripe);
  group.add(leftDoorPivot);

  const rightDoorPivot = new THREE.Group();
  rightDoorPivot.position.set(sx * 0.5 - wallT, sy * 0.5, sz * 0.5 - doorT * 0.5);
  const rightDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorT), lockerMat);
  rightDoorMesh.position.set(-doorW * 0.5, 0, 0);
  rightDoorPivot.add(rightDoorMesh);

  const rightStripe = new THREE.Mesh(new THREE.BoxGeometry(doorW * 0.85, 0.05, 0.008), hazardMat);
  rightStripe.position.set(-doorW * 0.5, 0.25, doorT * 0.5 + 0.004);
  rightDoorPivot.add(rightStripe);
  group.add(rightDoorPivot);

  return { group, leftDoorPivot, rightDoorPivot, statusLed };
}

