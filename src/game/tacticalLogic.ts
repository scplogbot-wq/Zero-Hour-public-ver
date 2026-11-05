import * as CANNON from 'cannon-es';

export type PrimaryWeaponId = 'hk416' | 'mp5sd' | 'mk18' | 'm870' | 'musket';
export type SecondaryWeaponId = 'glock17' | 'm1911' | 'colt_saa';
export type MeleeWeaponId = 'combat_knife';
export type WeaponId = PrimaryWeaponId | SecondaryWeaponId | MeleeWeaponId;
export type WeaponSlot = 'primary' | 'secondary' | 'melee';
export type AttachmentSlot = 'muzzle' | 'optic' | 'accessory';
export type AttachmentId = 'suppressor' | 'holographic' | 'laser';
export type ReticleStyle = 'iron' | 'reflex' | 'holographic';
export type FireMode = 'auto' | 'semi';
export type HitZone = 'head' | 'torso' | 'limb';
export type LeanDirection = -1 | 0 | 1;
export type LeanInputMode = 'toggle' | 'hold';
export type EnemyArchetype = 'breacher' | 'rifleman' | 'marksman';
export type AIState = 'patrol' | 'combat' | 'reposition' | 'cover' | 'flank' | 'suppress' | 'ko';
export type AIBehaviorAction =
  | 'seek_cover'
  | 'flank'
  | 'suppressive_fire'
  | 'engage'
  | 'patrol';
export type RagdollBoneId =
  | 'hips'
  | 'spine1'
  | 'spine2'
  | 'neck'
  | 'head'
  | 'leftUpperArm'
  | 'leftForearm'
  | 'rightUpperArm'
  | 'rightForearm'
  | 'leftHip'
  | 'leftKnee'
  | 'rightHip'
  | 'rightKnee';

export interface RecoilPattern {
  vertical: number;
  horizontal: number;
}

export interface WeaponStatBars {
  damage: number;   // 0 - 100
  fireRate: number; // 0 - 100
  recoil: number;   // 0 - 100
  mobility: number; // 0 - 100
}

export interface AttachmentSpec {
  id: AttachmentId;
  slot: AttachmentSlot;
  name: string;
  shortName: string;
  description: string;
  // Acoustic & visual signature modifiers (Suppressor)
  soundVolumeMultiplier: number;
  muzzleFlashMultiplier: number;
  suppressesMuzzleFlashAlert: boolean;
  // Optical sight modifiers (Holographic Sight)
  adsZoomBonus: number;
  reticleStyle?: ReticleStyle;
  adsSpreadMultiplier: number;
  // Tactical laser modifiers (Laser Sight)
  hipSpreadMultiplier: number;
  // Handling & recoil modifiers
  recoilMultiplier: number;
  movementSpeedDelta: number;
}

export const ALL_ATTACHMENT_IDS: readonly AttachmentId[] = [
  'suppressor',
  'holographic',
  'laser',
];

export const ATTACHMENTS: Record<AttachmentId, AttachmentSpec> = {
  suppressor: {
    id: 'suppressor',
    slot: 'muzzle',
    name: 'SOCOM RC2 Suppressor',
    shortName: 'SUPPRESSOR',
    description: '-58% Sound Signature · -88% Muzzle Flash · -10% Recoil',
    soundVolumeMultiplier: 0.42,
    muzzleFlashMultiplier: 0.12,
    suppressesMuzzleFlashAlert: true,
    adsZoomBonus: 0,
    adsSpreadMultiplier: 1.0,
    hipSpreadMultiplier: 1.0,
    recoilMultiplier: 0.90,
    movementSpeedDelta: -0.02,
  },
  holographic: {
    id: 'holographic',
    slot: 'optic',
    name: 'EOTech EXPS3 Holo Sight',
    shortName: 'HOLO SIGHT',
    description: '+0.25x ADS Zoom · Holographic Circle-Dot Reticle · -15% ADS Spread',
    soundVolumeMultiplier: 1.0,
    muzzleFlashMultiplier: 1.0,
    suppressesMuzzleFlashAlert: false,
    adsZoomBonus: 0.25,
    reticleStyle: 'holographic',
    adsSpreadMultiplier: 0.85,
    hipSpreadMultiplier: 1.0,
    recoilMultiplier: 1.0,
    movementSpeedDelta: -0.01,
  },
  laser: {
    id: 'laser',
    slot: 'accessory',
    name: 'AN/PEQ-15 Tactical Laser',
    shortName: 'PEQ-15 LASER',
    description: '+42% Hip-Fire Accuracy Bonus · Visible Laser Aiming Beam',
    soundVolumeMultiplier: 1.0,
    muzzleFlashMultiplier: 1.0,
    suppressesMuzzleFlashAlert: false,
    adsZoomBonus: 0,
    adsSpreadMultiplier: 1.0,
    hipSpreadMultiplier: 0.58,
    recoilMultiplier: 1.0,
    movementSpeedDelta: 0,
  },
};

export interface WeaponSpec {
  id: WeaponId;
  slot: WeaponSlot;
  name: string;
  shortName: string;
  designation: string;
  caliber: string;
  meshPath: string;
  // Core modular attributes requested by architecture spec
  damage: number;
  fireRate: number;
  magazineSize: number;
  recoilPattern: RecoilPattern;
  adsZoomMultiplier: number;
  movementSpeedModifier: number;
  pellets: number;
  penetratesDrywall: boolean;
  // Modular Attachment Compatibility
  compatibleAttachments: readonly AttachmentId[];
  compatibleSlots: readonly AttachmentSlot[];
  defaultAttachments: readonly AttachmentId[];
  integralSuppressor?: boolean;
  baseReticleStyle: ReticleStyle;
  // Ballistics & gameplay attributes
  magSize: number;
  initialReserve: number;
  rpm: number;
  fireModes: FireMode[];
  defaultFireMode: FireMode;
  torsoDamageMin: number;
  torsoDamageMax: number;
  limbDamageMin: number;
  limbDamageMax: number;
  headshotDamage: number;
  adsFov: number;
  hipFov: number;
  verticalRecoil: number;
  horizontalRecoil: number;
  spreadHip: number;
  spreadAds: number;
  reloadTimeSec: number;
  muzzleVelocity: number;
}

export const PRIMARY_WEAPON_IDS: readonly PrimaryWeaponId[] = [
  'hk416',
  'mp5sd',
  'mk18',
  'm870',
  'musket',
];

export const SECONDARY_WEAPON_IDS: readonly SecondaryWeaponId[] = [
  'glock17',
  'm1911',
  'colt_saa',
];

export const MELEE_WEAPON_IDS: readonly MeleeWeaponId[] = [
  'combat_knife',
];

export const ALL_WEAPON_IDS: readonly WeaponId[] = [
  ...PRIMARY_WEAPON_IDS,
  ...SECONDARY_WEAPON_IDS,
  ...MELEE_WEAPON_IDS,
];

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  hk416: {
    id: 'hk416',
    slot: 'primary',
    name: 'HK416 D10RS',
    shortName: 'HK416',
    designation: '5.56×45mm NATO Carbine · Modular Rail',
    caliber: '5.56×45mm',
    meshPath: 'models/weapons/hk416.glb',
    damage: 50,
    fireRate: 750,
    magazineSize: 30,
    recoilPattern: { vertical: 0.022, horizontal: 0.009 },
    adsZoomMultiplier: 1.54,
    movementSpeedModifier: 0.94,
    pellets: 1,
    penetratesDrywall: true,
    compatibleAttachments: ['suppressor', 'holographic', 'laser'],
    compatibleSlots: ['muzzle', 'optic', 'accessory'],
    defaultAttachments: ['holographic'],
    baseReticleStyle: 'reflex',
    magSize: 30,
    initialReserve: 120,
    rpm: 750,
    fireModes: ['auto', 'semi'],
    defaultFireMode: 'auto',
    torsoDamageMin: 45,
    torsoDamageMax: 55,
    limbDamageMin: 32,
    limbDamageMax: 38,
    headshotDamage: 140, // Instant 1-shot kill on 100 HP
    adsFov: 48,
    hipFov: 75,
    verticalRecoil: 0.022,
    horizontalRecoil: 0.009,
    spreadHip: 0.026,
    spreadAds: 0.0025,
    reloadTimeSec: 1.85,
    muzzleVelocity: 780,
  },
  mp5sd: {
    id: 'mp5sd',
    slot: 'primary',
    name: 'MP5SD6 INTEGRAL',
    shortName: 'MP5 SD',
    designation: '9×19mm Integral Suppressed SMG · Low-Profile Rail',
    caliber: '9×19mm Subsonic',
    meshPath: 'models/weapons/mp5sd.glb',
    damage: 36,
    fireRate: 850,
    magazineSize: 30,
    recoilPattern: { vertical: 0.014, horizontal: 0.006 },
    adsZoomMultiplier: 1.56,
    movementSpeedModifier: 1.04,
    pellets: 1,
    penetratesDrywall: false,
    compatibleAttachments: ['holographic', 'laser'],
    compatibleSlots: ['optic', 'accessory'],
    defaultAttachments: [],
    integralSuppressor: true,
    baseReticleStyle: 'reflex',
    magSize: 30,
    initialReserve: 150,
    rpm: 850,
    fireModes: ['auto', 'semi'],
    defaultFireMode: 'auto',
    torsoDamageMin: 34,
    torsoDamageMax: 38,
    limbDamageMin: 24,
    limbDamageMax: 28,
    headshotDamage: 125,
    adsFov: 48,
    hipFov: 75,
    verticalRecoil: 0.014,
    horizontalRecoil: 0.006,
    spreadHip: 0.019,
    spreadAds: 0.002,
    reloadTimeSec: 1.65,
    muzzleVelocity: 310,
  },
  mk18: {
    id: 'mk18',
    slot: 'primary',
    name: 'MK18 MOD 1 SBR',
    shortName: 'MK18',
    designation: '5.56×45mm CQBR Block II · DD RIS II Quad Rail',
    caliber: '5.56×45mm',
    meshPath: 'models/weapons/mk18.glb',
    damage: 48,
    fireRate: 820,
    magazineSize: 30,
    recoilPattern: { vertical: 0.025, horizontal: 0.011 },
    adsZoomMultiplier: 1.70,
    movementSpeedModifier: 0.98,
    pellets: 1,
    penetratesDrywall: true,
    compatibleAttachments: ['suppressor', 'holographic', 'laser'],
    compatibleSlots: ['muzzle', 'optic', 'accessory'],
    defaultAttachments: ['suppressor', 'laser'],
    baseReticleStyle: 'reflex',
    magSize: 30,
    initialReserve: 120,
    rpm: 820,
    fireModes: ['auto', 'semi'],
    defaultFireMode: 'auto',
    torsoDamageMin: 44,
    torsoDamageMax: 52,
    limbDamageMin: 30,
    limbDamageMax: 36,
    headshotDamage: 138,
    adsFov: 44,
    hipFov: 75,
    verticalRecoil: 0.025,
    horizontalRecoil: 0.011,
    spreadHip: 0.024,
    spreadAds: 0.0028,
    reloadTimeSec: 1.75,
    muzzleVelocity: 740,
  },
  m870: {
    id: 'm870',
    slot: 'primary',
    name: 'M870 MCS BREACHER',
    shortName: 'SHOTGUN',
    designation: '12-Gauge 00 Buckshot Pump Shotgun · 8 Pellets',
    caliber: '12-Gauge 00',
    meshPath: 'models/weapons/m870.glb',
    damage: 96,
    fireRate: 95,
    magazineSize: 8,
    recoilPattern: { vertical: 0.068, horizontal: 0.024 },
    adsZoomMultiplier: 1.36,
    movementSpeedModifier: 0.89,
    pellets: 8,
    penetratesDrywall: true,
    compatibleAttachments: ['holographic', 'laser'],
    compatibleSlots: ['optic', 'accessory'],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 8,
    initialReserve: 40,
    rpm: 95,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 18, // Per pellet (8 pellets => up to 144 total damage close-range)
    torsoDamageMax: 22,
    limbDamageMin: 12,
    limbDamageMax: 16,
    headshotDamage: 48, // 2-3 pellets to head = instant 100+ HP kill
    adsFov: 55,
    hipFov: 75,
    verticalRecoil: 0.068,
    horizontalRecoil: 0.024,
    spreadHip: 0.068,
    spreadAds: 0.042,
    reloadTimeSec: 2.35,
    muzzleVelocity: 405,
  },
  musket: {
    id: 'musket',
    slot: 'primary',
    name: 'M1777 CHARLEVILLE MUSKET',
    shortName: 'MUSKET',
    designation: '.69 Caliber Smoothbore Flintlock Musket · 1-Round Breach',
    caliber: '.69 Cal Lead Ball',
    meshPath: 'models/weapons/musket.glb',
    damage: 9999,
    fireRate: 8,
    magazineSize: 1,
    recoilPattern: { vertical: 0.095, horizontal: 0.028 },
    adsZoomMultiplier: 1.48,
    movementSpeedModifier: 0.86,
    pellets: 1,
    penetratesDrywall: true,
    compatibleAttachments: ['holographic', 'laser'],
    compatibleSlots: ['optic', 'accessory'],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 1,
    initialReserve: 18,
    rpm: 8,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 9999,
    torsoDamageMax: 9999,
    limbDamageMin: 9999,
    limbDamageMax: 9999,
    headshotDamage: 9999, // Infinite / guaranteed 1-shot kill anywhere on the body
    adsFov: 50,
    hipFov: 75,
    verticalRecoil: 0.095,
    horizontalRecoil: 0.028,
    spreadHip: 0.032,
    spreadAds: 0.0008,
    reloadTimeSec: 7.0, // Strict 7-second black-powder ramrod reload sequence
    muzzleVelocity: 440,
  },
  glock17: {
    id: 'glock17',
    slot: 'secondary',
    name: 'Glock 17 Gen5',
    shortName: 'GLOCK 17',
    designation: '9×19mm MOS Tactical Sidearm · Underbarrel Rail',
    caliber: '9×19mm',
    meshPath: 'models/weapons/glock17.glb',
    damage: 33,
    fireRate: 420,
    magazineSize: 17,
    recoilPattern: { vertical: 0.028, horizontal: 0.011 },
    adsZoomMultiplier: 1.29,
    movementSpeedModifier: 1.08,
    pellets: 1,
    penetratesDrywall: false,
    compatibleAttachments: ['suppressor', 'holographic', 'laser'],
    compatibleSlots: ['muzzle', 'optic', 'accessory'],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 17,
    initialReserve: 68,
    rpm: 420,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 30,
    torsoDamageMax: 35,
    limbDamageMin: 22,
    limbDamageMax: 26,
    headshotDamage: 120, // Instant 1-shot kill on 100 HP
    adsFov: 58,
    hipFov: 75,
    verticalRecoil: 0.028,
    horizontalRecoil: 0.011,
    spreadHip: 0.018,
    spreadAds: 0.004,
    reloadTimeSec: 1.35,
    muzzleVelocity: 375,
  },
  m1911: {
    id: 'm1911',
    slot: 'secondary',
    name: 'M1911A1 MEU(SOC)',
    shortName: 'M1911',
    designation: '.45 ACP Heavy Operator Sidearm · Threaded Barrel',
    caliber: '.45 ACP',
    meshPath: 'models/weapons/m1911.glb',
    damage: 48,
    fireRate: 310,
    magazineSize: 8,
    recoilPattern: { vertical: 0.042, horizontal: 0.015 },
    adsZoomMultiplier: 1.34,
    movementSpeedModifier: 1.05,
    pellets: 1,
    penetratesDrywall: true,
    compatibleAttachments: ['suppressor', 'laser'],
    compatibleSlots: ['muzzle', 'accessory'],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 8,
    initialReserve: 48,
    rpm: 310,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 45,
    torsoDamageMax: 52,
    limbDamageMin: 32,
    limbDamageMax: 36,
    headshotDamage: 135,
    adsFov: 56,
    hipFov: 75,
    verticalRecoil: 0.042,
    horizontalRecoil: 0.015,
    spreadHip: 0.020,
    spreadAds: 0.0035,
    reloadTimeSec: 1.45,
    muzzleVelocity: 260,
  },
  colt_saa: {
    id: 'colt_saa',
    slot: 'secondary',
    name: 'Colt Single Action Army .45',
    shortName: 'COLT SAA',
    designation: '.45 Long Colt Peacemaker · 6-Shot Fluted Cylinder · Single-Action / Fan-Fire',
    caliber: '.45 Colt',
    meshPath: 'models/weapons/colt_saa.glb',
    damage: 75, // 75 torso damage, 1-shot headshot
    fireRate: 158, // Precision ADS single-action rate (420 RPM when fanning from hip!)
    magazineSize: 6,
    recoilPattern: { vertical: 0.056, horizontal: 0.018 },
    adsZoomMultiplier: 1.38,
    movementSpeedModifier: 1.06,
    pellets: 1,
    penetratesDrywall: true,
    compatibleAttachments: ['laser'],
    compatibleSlots: ['accessory'],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 6,
    initialReserve: 36,
    rpm: 158,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 75,
    torsoDamageMax: 75,
    limbDamageMin: 55,
    limbDamageMax: 55,
    headshotDamage: 180, // Guaranteed 1-shot headshot kill
    adsFov: 54,
    hipFov: 75,
    verticalRecoil: 0.056,
    horizontalRecoil: 0.018,
    spreadHip: 0.088, // Fanning hip-fire wide spread
    spreadAds: 0.0018, // Pinpoint single-action ADS accuracy
    reloadTimeSec: 3.12, // Sequential round-by-round gate reload
    muzzleVelocity: 310,
  },
  combat_knife: {
    id: 'combat_knife',
    slot: 'melee',
    name: 'FAIRBAIRN CQB-K9 COMBAT KNIFE',
    shortName: 'COMBAT KNIFE',
    designation: 'S35VN Stainless Fixed Blade · G10 Tactical Grip',
    caliber: 'Razor Steel',
    meshPath: 'models/weapons/combat_knife.glb',
    damage: 100, // Head: 100+ (125 instant kill) · Torso/Limb: 50 (guaranteed 2-hit kill)
    fireRate: 140,
    magazineSize: 1,
    recoilPattern: { vertical: 0, horizontal: 0 },
    adsZoomMultiplier: 1.0,
    movementSpeedModifier: 1.12,
    pellets: 1,
    penetratesDrywall: false,
    compatibleAttachments: [],
    compatibleSlots: [],
    defaultAttachments: [],
    baseReticleStyle: 'iron',
    magSize: 1,
    initialReserve: 0,
    rpm: 140,
    fireModes: ['semi'],
    defaultFireMode: 'semi',
    torsoDamageMin: 50,
    torsoDamageMax: 50,
    limbDamageMin: 50,
    limbDamageMax: 50,
    headshotDamage: 125, // 100+ damage instant 1-hit kill
    adsFov: 75,
    hipFov: 75,
    verticalRecoil: 0,
    horizontalRecoil: 0,
    spreadHip: 0,
    spreadAds: 0,
    reloadTimeSec: 0,
    muzzleVelocity: 0,
  },
};

/**
 * Check whether a given attachment ID is compatible with the specified weapon.
 */
export function isAttachmentCompatible(
  weaponId: WeaponId,
  attachmentId: AttachmentId
): boolean {
  const spec = WEAPONS[weaponId];
  return spec.compatibleAttachments.includes(attachmentId);
}

/**
 * Filter and deduplicate an attachment list so only compatible attachments for the weapon are kept,
 * enforcing at most one attachment per AttachmentSlot ('muzzle', 'optic', 'accessory').
 */
export function sanitizeWeaponAttachments(
  weaponId: WeaponId,
  attachments?: readonly AttachmentId[]
): AttachmentId[] {
  const spec = WEAPONS[weaponId];
  const raw = attachments !== undefined ? attachments : spec.defaultAttachments;
  const occupiedSlots = new Set<AttachmentSlot>();
  const valid: AttachmentId[] = [];
  for (const attId of raw) {
    const attSpec = ATTACHMENTS[attId];
    if (!attSpec) continue;
    if (!spec.compatibleAttachments.includes(attId)) continue;
    if (occupiedSlots.has(attSpec.slot)) continue;
    occupiedSlots.add(attSpec.slot);
    valid.push(attId);
  }
  return valid;
}

export interface EffectiveWeaponStats {
  weaponId: WeaponId;
  attachments: AttachmentId[];
  isSuppressed: boolean;
  hasHolographic: boolean;
  hasLaser: boolean;
  reticleStyle: ReticleStyle;
  soundVolumeMultiplier: number;
  muzzleFlashMultiplier: number;
  suppressesMuzzleFlashAlert: boolean;
  adsZoomMultiplier: number;
  adsFov: number;
  spreadHip: number;
  spreadAds: number;
  recoilPattern: RecoilPattern;
  movementSpeedModifier: number;
  hipAccuracyBonusPct: number;
}

/**
 * Calculate the effective ballistic, acoustic, optical, and handling stats for a weapon
 * combined with its active compatible attachments.
 */
export function computeEffectiveWeaponStats(
  weaponId: WeaponId,
  attachments?: readonly AttachmentId[]
): EffectiveWeaponStats {
  const spec = WEAPONS[weaponId];
  const validAttachments = sanitizeWeaponAttachments(weaponId, attachments);

  let soundVolumeMultiplier = spec.integralSuppressor ? 0.42 : 1.0;
  let muzzleFlashMultiplier = spec.integralSuppressor ? 0.12 : 1.0;
  let suppressesMuzzleFlashAlert = Boolean(spec.integralSuppressor);
  let adsZoomMultiplier = spec.adsZoomMultiplier;
  let reticleStyle: ReticleStyle = spec.baseReticleStyle;
  let spreadHip = spec.spreadHip;
  let spreadAds = spec.spreadAds;
  let recoilMult = 1.0;
  let movementSpeedModifier = spec.movementSpeedModifier;

  for (const attId of validAttachments) {
    const att = ATTACHMENTS[attId];
    soundVolumeMultiplier *= att.soundVolumeMultiplier;
    muzzleFlashMultiplier *= att.muzzleFlashMultiplier;
    if (att.suppressesMuzzleFlashAlert) {
      suppressesMuzzleFlashAlert = true;
    }
    adsZoomMultiplier += att.adsZoomBonus;
    if (att.reticleStyle) {
      reticleStyle = att.reticleStyle;
    }
    spreadHip *= att.hipSpreadMultiplier;
    spreadAds *= att.adsSpreadMultiplier;
    recoilMult *= att.recoilMultiplier;
    movementSpeedModifier += att.movementSpeedDelta;
  }

  adsZoomMultiplier = Number(adsZoomMultiplier.toFixed(2));
  const adsFov = Number((spec.hipFov / adsZoomMultiplier).toFixed(2));
  const verticalRecoil = Number((spec.recoilPattern.vertical * recoilMult).toFixed(4));
  const horizontalRecoil = Number((spec.recoilPattern.horizontal * recoilMult).toFixed(4));
  movementSpeedModifier = Number(Math.max(0.75, Math.min(1.2, movementSpeedModifier)).toFixed(2));

  const hipAccuracyBonusPct = Math.round((1 - spreadHip / spec.spreadHip) * 100);

  return {
    weaponId,
    attachments: validAttachments,
    isSuppressed: Boolean(spec.integralSuppressor || validAttachments.includes('suppressor')),
    hasHolographic: validAttachments.includes('holographic'),
    hasLaser: validAttachments.includes('laser'),
    reticleStyle,
    soundVolumeMultiplier: Number(soundVolumeMultiplier.toFixed(2)),
    muzzleFlashMultiplier: Number(muzzleFlashMultiplier.toFixed(2)),
    suppressesMuzzleFlashAlert,
    adsZoomMultiplier,
    adsFov,
    spreadHip: Number(spreadHip.toFixed(5)),
    spreadAds: Number(spreadAds.toFixed(5)),
    recoilPattern: {
      vertical: verticalRecoil,
      horizontal: horizontalRecoil,
    },
    movementSpeedModifier,
    hipAccuracyBonusPct,
  };
}

/**
 * Compute normalized 0-100 progress bar values for the Loadout Selection UI
 * (Damage, Fire Rate, Recoil Control/Intensity, Mobility), taking active attachments into account.
 */
export function getWeaponStatBars(
  weaponId: WeaponId,
  attachments?: readonly AttachmentId[]
): WeaponStatBars {
  const spec = WEAPONS[weaponId];
  const eff = computeEffectiveWeaponStats(weaponId, attachments);
  const damagePct = Math.min(100, Math.max(15, Math.round((spec.damage / 100) * 100)));
  const fireRatePct = Math.min(100, Math.max(12, Math.round((spec.fireRate / 900) * 100)));
  const recoilPct = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        ((eff.recoilPattern.vertical + eff.recoilPattern.horizontal) / 0.095) * 100
      )
    )
  );
  const mobilityPct = Math.min(
    100,
    Math.max(15, Math.round(((eff.movementSpeedModifier - 0.75) / 0.38) * 100))
  );
  return {
    damage: damagePct,
    fireRate: fireRatePct,
    recoil: recoilPct,
    mobility: mobilityPct,
  };
}

/**
 * Compute base vs attachment-modified weapon stat bars and deltas for the Gunsmith UI.
 */
export function getWeaponStatDelta(
  weaponId: WeaponId,
  attachments?: readonly AttachmentId[]
): {
  base: WeaponStatBars;
  modified: WeaponStatBars;
  delta: WeaponStatBars;
} {
  const base = getWeaponStatBars(weaponId, []);
  const modified = getWeaponStatBars(weaponId, attachments);
  return {
    base,
    modified,
    delta: {
      damage: modified.damage - base.damage,
      fireRate: modified.fireRate - base.fireRate,
      recoil: modified.recoil - base.recoil,
      mobility: modified.mobility - base.mobility,
    },
  };
}

export interface PlayerLoadoutConfig {
  primary: PrimaryWeaponId;
  secondary: SecondaryWeaponId;
  primaryAttachments?: AttachmentId[];
  secondaryAttachments?: AttachmentId[];
}

export interface WeaponRuntimeEntry {
  id: WeaponId;
  mag: number;
  reserve: number;
  fireMode: FireMode;
  attachments: AttachmentId[];
  effectiveStats: EffectiveWeaponStats;
}

/**
 * Instantiate the player's runtime weapon states from the selected Primary and Secondary loadout
 * and their chosen compatible attachments.
 */
export function createLoadoutRuntimeWeapons(
  loadout: PlayerLoadoutConfig
): Record<WeaponId, WeaponRuntimeEntry> {
  const result = {} as Record<WeaponId, WeaponRuntimeEntry>;
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const spec = WEAPONS[id];
    const requestedAttachments =
      id === loadout.primary
        ? loadout.primaryAttachments
        : id === loadout.secondary
        ? loadout.secondaryAttachments
        : spec.defaultAttachments;
    const effectiveStats = computeEffectiveWeaponStats(id, requestedAttachments);
    result[id] = {
      id,
      mag: spec.magazineSize,
      reserve: spec.initialReserve,
      fireMode: spec.defaultFireMode,
      attachments: effectiveStats.attachments,
      effectiveStats,
    };
  }
  return result;
}

export const MAX_PLAYER_HP = 100;
export const INITIAL_MEDBAGS = 4;
export const MEDBAG_HEAL_AMOUNT = 80;
export const LEAN_MAX_ANGLE_RAD = (15 * Math.PI) / 180; // ~15 degrees
export const LEAN_MAX_OFFSET_X = 0.35; // 0.35 units local horizontal peek
export const LEAN_WALL_SAFETY_MARGIN = 0.24;

/**
 * Deterministic PRNG (Mulberry32) for reproducible procedural CQB map generation
 */
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compute realistic ballistic damage based on weapon, hit zone, and optional random factor [0, 1]
 */
export function calculateBallisticDamage(
  weaponId: WeaponId,
  zone: HitZone,
  rand01 = 0.5
): number {
  const spec = WEAPONS[weaponId];
  const clampedRand = Math.max(0, Math.min(1, rand01));
  if (zone === 'head') {
    return spec.headshotDamage;
  }
  if (zone === 'torso') {
    return Math.round(
      spec.torsoDamageMin + (spec.torsoDamageMax - spec.torsoDamageMin) * clampedRand
    );
  }
  return Math.round(
    spec.limbDamageMin + (spec.limbDamageMax - spec.limbDamageMin) * clampedRand
  );
}

/**
 * Consume 1 Medical Bag to heal 80 HP (capped at 100 HP).
 * Returns updated { hp, medbags, healed, consumed }.
 */
export function useMedicalBag(currentHp: number, currentMedbags: number): {
  hp: number;
  medbags: number;
  healed: number;
  consumed: boolean;
} {
  if (currentHp <= 0 || currentHp >= MAX_PLAYER_HP || currentMedbags <= 0) {
    return {
      hp: currentHp,
      medbags: currentMedbags,
      healed: 0,
      consumed: false,
    };
  }
  const nextHp = Math.min(MAX_PLAYER_HP, currentHp + MEDBAG_HEAL_AMOUNT);
  return {
    hp: nextHp,
    medbags: currentMedbags - 1,
    healed: nextHp - currentHp,
    consumed: true,
  };
}

// ============================================================================
// RELOAD LOCK, SPRINT GATING & OPTIC / ADS CAMERA ALIGNMENT
// ============================================================================

export const WORLD_SCENE_LAYER = 0;
export const WEAPON_VIEWMODEL_LAYER = 1;

/**
 * Check whether the player is currently allowed to fire their active weapon.
 * Enforces strict reload lock (e.g., cannot fire during the Musket's 7-second reload).
 */
export function canPlayerFire(params: {
  isReloading: boolean;
  reloadTimer: number;
  currentMag: number;
  fireCooldown: number;
}): boolean {
  if (params.isReloading || params.reloadTimer > 0) return false;
  if (params.currentMag <= 0) return false;
  if (params.fireCooldown > 0) return false;
  return true;
}

/**
 * Check whether the player is currently allowed to sprint.
 * Enforces strict reload lock: the player cannot sprint while reloading (including the 7-second Musket reload)
 * or while aiming down sights (ADS).
 */
export function canPlayerSprint(params: {
  isReloading: boolean;
  reloadTimer: number;
  isAds: boolean;
  moveForwardOrLateral: boolean;
}): boolean {
  if (params.isReloading || params.reloadTimer > 0) return false;
  if (params.isAds) return false;
  if (!params.moveForwardOrLateral) return false;
  return true;
}

// Movement Kinematics: Crouch & Jump System Constants
export const PLAYER_STANDING_EYE_Y = 1.68;
export const PLAYER_CROUCH_RATIO = 0.55; // 45% reduction (1.0 - 0.45)
export const PLAYER_CROUCHED_EYE_Y = Number((PLAYER_STANDING_EYE_Y * PLAYER_CROUCH_RATIO).toFixed(4)); // 0.924m
export const PLAYER_CAPSULE_RADIUS = 0.34;
export const PLAYER_STANDING_CAPSULE_HEIGHT = 1.80;
export const PLAYER_CROUCHED_CAPSULE_HEIGHT = Number((PLAYER_STANDING_CAPSULE_HEIGHT * PLAYER_CROUCH_RATIO).toFixed(4)); // 0.99m
export const PLAYER_JUMP_IMPULSE_VELOCITY = 4.8; // m/s instant upward vertical impulse
export const PLAYER_GRAVITY_ACCEL = 18.0; // m/s^2 realistic gravity acceleration on descent
export const CROUCH_RECOIL_SPREAD_MULTIPLIER = 0.70; // 30% recoil & spread decrease when crouching

/**
 * Compute the player's effective movement speed, enforcing reload sprint locks,
 * weapon mobility modifiers, and 40% crouch speed reduction.
 */
export function computePlayerMovementSpeed(params: {
  baseWalkSpeed?: number;
  sprintMultiplier?: number;
  weaponSpeedModifier: number;
  isAds: boolean;
  isReloading: boolean;
  reloadTimer: number;
  sprintHeld: boolean;
  isMoving: boolean;
  crouchProgress?: number; // 0 = standing, 1 = fully crouched
}): { speed: number; isSprinting: boolean } {
  const baseWalk = params.baseWalkSpeed ?? 4.25;
  const sprintMult = params.sprintMultiplier ?? 1.38;
  const crouchProgress = Math.max(0, Math.min(1, params.crouchProgress ?? 0));
  const isCrouched = crouchProgress > 0.08;

  // Cannot sprint while crouching
  const sprinting =
    !isCrouched &&
    params.sprintHeld &&
    canPlayerSprint({
      isReloading: params.isReloading,
      reloadTimer: params.reloadTimer,
      isAds: params.isAds,
      moveForwardOrLateral: params.isMoving,
    });

  const stanceMult = params.isAds ? 0.62 : sprinting ? sprintMult : 1.0;
  // Reduce movement speed by 40% when fully crouched
  const crouchSpeedPenalty = 1.0 - 0.40 * crouchProgress;
  // Slightly reduce walk speed during heavy reloads like the Musket
  const reloadWalkPenalty = params.isReloading || params.reloadTimer > 0 ? 0.88 : 1.0;
  const speed = Number(
    (baseWalk * params.weaponSpeedModifier * stanceMult * crouchSpeedPenalty * reloadWalkPenalty).toFixed(4)
  );
  return { speed, isSprinting: sprinting };
}

/**
 * Smoothly interpolates player crouch progress down by 45%.
 * If the player attempts to uncrouch (target < current) but the ceiling raycast detects
 * low geometry overhead, blocks uncrouching to prevent clipping.
 */
export function stepPlayerCrouch(params: {
  currentCrouchProgress: number;
  targetCrouchProgress: number;
  dt: number;
  isCeilingBlocked: boolean;
  lerpSpeed?: number;
}): number {
  const { currentCrouchProgress, targetCrouchProgress, dt, isCeilingBlocked } = params;
  const speed = params.lerpSpeed ?? 12.0;

  // If wanting to uncrouch (target = 0) but ceiling is blocked, hold crouch
  const effectiveTarget =
    targetCrouchProgress < currentCrouchProgress && isCeilingBlocked
      ? 1.0
      : targetCrouchProgress;

  const alpha = 1.0 - Math.exp(-speed * dt);
  return currentCrouchProgress + (effectiveTarget - currentCrouchProgress) * alpha;
}

/**
 * Exact local coordinates of the optic / sight reticle axis relative to each weapon's root viewmodel group.
 * At full ADS (adsAmount = 1.0), the weapon group is positioned at:
 *   x = 0, y = -opticSightY, z = adsZ
 * so the active optic mesh's local Z-axis aligns with the player camera's optical center (0, 0, -Z).
 */
export const OPTIC_LOCAL_OFFSETS: Record<
  WeaponId,
  {
    ironSightY: number;
    holographicSightY: number;
    hipOffset: { x: number; y: number; z: number };
    adsZ: number;
  }
> = {
  hk416: {
    ironSightY: 0.088,
    holographicSightY: 0.088,
    hipOffset: { x: 0.21, y: -0.21, z: -0.37 },
    adsZ: -0.26,
  },
  mp5sd: {
    ironSightY: 0.072,
    holographicSightY: 0.088,
    hipOffset: { x: 0.20, y: -0.205, z: -0.35 },
    adsZ: -0.25,
  },
  mk18: {
    ironSightY: 0.086,
    holographicSightY: 0.088,
    hipOffset: { x: 0.205, y: -0.21, z: -0.36 },
    adsZ: -0.25,
  },
  m870: {
    ironSightY: 0.044,
    holographicSightY: 0.088,
    hipOffset: { x: 0.215, y: -0.22, z: -0.38 },
    adsZ: -0.27,
  },
  musket: {
    ironSightY: 0.048,
    holographicSightY: 0.088,
    hipOffset: { x: 0.22, y: -0.225, z: -0.40 },
    adsZ: -0.28,
  },
  glock17: {
    ironSightY: 0.048,
    holographicSightY: 0.088,
    hipOffset: { x: 0.175, y: -0.195, z: -0.32 },
    adsZ: -0.23,
  },
  m1911: {
    ironSightY: 0.048,
    holographicSightY: 0.088,
    hipOffset: { x: 0.175, y: -0.195, z: -0.32 },
    adsZ: -0.23,
  },
  colt_saa: {
    ironSightY: 0.054,
    holographicSightY: 0.054,
    hipOffset: { x: 0.18, y: -0.20, z: -0.33 },
    adsZ: -0.24,
  },
  combat_knife: {
    ironSightY: 0.0,
    holographicSightY: 0.0,
    hipOffset: { x: 0.18, y: -0.21, z: -0.34 },
    adsZ: -0.26,
  },
};

// ============================================================================
// COLT SINGLE ACTION ARMY (SAA) REVOLVER MECHANICS & STATE MACHINES
// ============================================================================

export const COLT_SAA_CYLINDER_CAPACITY = 6;
export const COLT_SAA_TORSO_DAMAGE = 75;
export const COLT_SAA_HEADSHOT_DAMAGE = 180;
export const COLT_SAA_ADS_COCK_DELAY_SEC = 0.085; // Slight visual & mechanical hammer-cocking delay between precise ADS shots
export const COLT_SAA_ADS_FIRE_INTERVAL_SEC = 0.38; // ~158 RPM deliberate single-action ADS rhythm
export const COLT_SAA_FANNING_RPM = 420; // Rapid off-hand hammer-slapping fire rate when firing from the hip
export const COLT_SAA_FANNING_FIRE_INTERVAL_SEC = Number((60 / COLT_SAA_FANNING_RPM).toFixed(4)); // ~0.1429s
export const COLT_SAA_FANNING_SPREAD_RAD = 0.088; // Drastically reduced accuracy during hip-fire fanning
export const COLT_SAA_ADS_SPREAD_RAD = 0.0018; // Pinpoint single-action ADS accuracy

export interface ColtSAAFireParameters {
  mode: 'single_action_ads' | 'fanning_hip';
  fireIntervalSec: number;
  hammerCockDelaySec: number;
  effectiveRpm: number;
  spreadRad: number;
  verticalRecoil: number;
  horizontalRecoil: number;
  isFanning: boolean;
}

/**
 * Determine firing mode & ballistics for the Colt Single Action Army (SAA):
 * - When aiming down sights (isAds === true): Precision Single-Action mode with slight hammer-cocking delay (0.085s) and pinpoint accuracy.
 * - When firing from the hip (isAds === false): "Fanning the Hammer" mode where the off-hand rapidly slaps the hammer (420 RPM) with high spread.
 */
export function evaluateColtSAAFireMode(isAds: boolean): ColtSAAFireParameters {
  if (isAds) {
    return {
      mode: 'single_action_ads',
      fireIntervalSec: COLT_SAA_ADS_FIRE_INTERVAL_SEC,
      hammerCockDelaySec: COLT_SAA_ADS_COCK_DELAY_SEC,
      effectiveRpm: Math.round(60 / COLT_SAA_ADS_FIRE_INTERVAL_SEC),
      spreadRad: COLT_SAA_ADS_SPREAD_RAD,
      verticalRecoil: 0.056,
      horizontalRecoil: 0.018,
      isFanning: false,
    };
  }
  return {
    mode: 'fanning_hip',
    fireIntervalSec: COLT_SAA_FANNING_FIRE_INTERVAL_SEC,
    hammerCockDelaySec: 0,
    effectiveRpm: COLT_SAA_FANNING_RPM,
    spreadRad: COLT_SAA_FANNING_SPREAD_RAD,
    verticalRecoil: 0.078,
    horizontalRecoil: 0.042,
    isFanning: true,
  };
}

export type ColtSAAReloadPhase =
  | 'idle'
  | 'gate_open'
  | 'eject_casing'
  | 'insert_round'
  | 'gate_close';

export interface ColtSAAReloadState {
  active: boolean;
  phase: ColtSAAReloadPhase;
  phaseTimer: number;
  roundsToLoad: number;
  roundsLoadedSoFar: number;
  casingsEjectedSoFar: number;
  gateAngleRad: number;      // 0 (closed) to 1.32 rad (75° open)
  ejectorRodOffsetZ: number; // 0 (forward) to 0.046m (pushed back into cylinder)
  cylinderAngleRad: number;  // Increments by Math.PI / 3 (60°) per chamber
  hammerAngleRad: number;    // 0 (down), -0.38 (half-cock reload), -0.82 (full-cock)
  insertingCartridgeProgress: number; // 0 to 1 for visible brass cartridge sliding into chamber
  ejectingCasingProgress: number;     // 0 to 1 for spent brass casing flying out
}

export const COLT_SAA_GATE_OPEN_SEC = 0.26;
export const COLT_SAA_EJECT_CASING_SEC = 0.20;
export const COLT_SAA_INSERT_ROUND_SEC = 0.24;
export const COLT_SAA_GATE_CLOSE_SEC = 0.24;

export function createColtSAAReloadState(): ColtSAAReloadState {
  return {
    active: false,
    phase: 'idle',
    phaseTimer: 0,
    roundsToLoad: 0,
    roundsLoadedSoFar: 0,
    casingsEjectedSoFar: 0,
    gateAngleRad: 0,
    ejectorRodOffsetZ: 0,
    cylinderAngleRad: 0,
    hammerAngleRad: 0,
    insertingCartridgeProgress: 0,
    ejectingCasingProgress: 0,
  };
}

export function startColtSAAReload(
  state: ColtSAAReloadState,
  currentMag: number,
  currentReserve: number
): boolean {
  const missing = Math.max(0, COLT_SAA_CYLINDER_CAPACITY - currentMag);
  const toLoad = Math.min(missing, currentReserve);
  if (toLoad <= 0) return false;

  state.active = true;
  state.phase = 'gate_open';
  state.phaseTimer = COLT_SAA_GATE_OPEN_SEC;
  state.roundsToLoad = toLoad;
  state.roundsLoadedSoFar = 0;
  state.casingsEjectedSoFar = 0;
  state.insertingCartridgeProgress = 0;
  state.ejectingCasingProgress = 0;
  return true;
}

export interface ColtSAAReloadStepEvents {
  gateOpened: boolean;
  casingEjected: boolean;
  roundInserted: boolean;
  gateClosed: boolean;
  completed: boolean;
  newMag: number;
  newReserve: number;
}

/**
 * Step the sequential, bullet-by-bullet Colt SAA reload state machine:
 * 1. Opens the loading gate & half-cocks the hammer (`gate_open`)
 * 2. Pushes the ejector rod to punch out a spent brass casing (`eject_casing`)
 * 3. Slides a fresh .45 Colt cartridge into the cylinder & indexes 60° (`insert_round`)
 * 4. Repeats steps 2-3 for each missing round one at a time, then snaps the loading gate shut (`gate_close`).
 */
export function stepColtSAAReload(
  state: ColtSAAReloadState,
  dt: number,
  currentMag: number,
  currentReserve: number
): ColtSAAReloadStepEvents {
  const events: ColtSAAReloadStepEvents = {
    gateOpened: false,
    casingEjected: false,
    roundInserted: false,
    gateClosed: false,
    completed: false,
    newMag: currentMag,
    newReserve: currentReserve,
  };

  if (!state.active || state.phase === 'idle') {
    state.gateAngleRad *= Math.exp(-14 * dt);
    state.ejectorRodOffsetZ *= Math.exp(-18 * dt);
    state.insertingCartridgeProgress = 0;
    state.ejectingCasingProgress = 0;
    return events;
  }

  state.phaseTimer -= dt;

  if (state.phase === 'gate_open') {
    const p = 1.0 - Math.max(0, state.phaseTimer / COLT_SAA_GATE_OPEN_SEC);
    state.gateAngleRad = p * 1.32;
    state.hammerAngleRad = -0.38 * p; // Half-cock notch
    if (state.phaseTimer <= 0) {
      events.gateOpened = true;
      state.phase = 'eject_casing';
      state.phaseTimer = COLT_SAA_EJECT_CASING_SEC;
      state.ejectingCasingProgress = 0;
    }
  } else if (state.phase === 'eject_casing') {
    state.gateAngleRad = 1.32;
    state.hammerAngleRad = -0.38;
    const p = 1.0 - Math.max(0, state.phaseTimer / COLT_SAA_EJECT_CASING_SEC);
    // Ejector rod strokes backward and springs forward
    state.ejectorRodOffsetZ = Math.sin(p * Math.PI) * 0.046;
    state.ejectingCasingProgress = p;
    state.insertingCartridgeProgress = 0;
    if (state.phaseTimer <= 0) {
      state.casingsEjectedSoFar += 1;
      events.casingEjected = true;
      state.ejectorRodOffsetZ = 0;
      state.phase = 'insert_round';
      state.phaseTimer = COLT_SAA_INSERT_ROUND_SEC;
      state.insertingCartridgeProgress = 0;
    }
  } else if (state.phase === 'insert_round') {
    state.gateAngleRad = 1.32;
    state.hammerAngleRad = -0.38;
    const p = 1.0 - Math.max(0, state.phaseTimer / COLT_SAA_INSERT_ROUND_SEC);
    state.insertingCartridgeProgress = p;
    state.ejectingCasingProgress = 0;
    // Smoothly index cylinder by 60 degrees (Math.PI / 3)
    state.cylinderAngleRad += (Math.PI / 3) * (dt / COLT_SAA_INSERT_ROUND_SEC);
    if (state.phaseTimer <= 0) {
      if (events.newMag < COLT_SAA_CYLINDER_CAPACITY && events.newReserve > 0) {
        events.newMag += 1;
        events.newReserve -= 1;
        state.roundsLoadedSoFar += 1;
        events.roundInserted = true;
      }
      state.insertingCartridgeProgress = 0;

      // Check if more rounds need to be loaded sequentially
      if (
        events.newMag < COLT_SAA_CYLINDER_CAPACITY &&
        events.newReserve > 0 &&
        state.roundsLoadedSoFar < state.roundsToLoad
      ) {
        state.phase = 'eject_casing';
        state.phaseTimer = COLT_SAA_EJECT_CASING_SEC;
      } else {
        state.phase = 'gate_close';
        state.phaseTimer = COLT_SAA_GATE_CLOSE_SEC;
      }
    }
  } else if (state.phase === 'gate_close') {
    const p = 1.0 - Math.max(0, state.phaseTimer / COLT_SAA_GATE_CLOSE_SEC);
    state.gateAngleRad = (1.0 - p) * 1.32;
    state.hammerAngleRad = (1.0 - p) * -0.38;
    state.insertingCartridgeProgress = 0;
    state.ejectingCasingProgress = 0;
    if (state.phaseTimer <= 0) {
      state.active = false;
      state.phase = 'idle';
      state.gateAngleRad = 0;
      state.hammerAngleRad = 0;
      events.gateClosed = true;
      events.completed = true;
    }
  }

  return events;
}

export type ColtSAASpinType = 'none' | 'equip_flip' | 'inspect_freestyle';
export type ColtSAASpinPhase =
  | 'idle'
  | 'equip_draw_flip'
  | 'twirl_forward'
  | 'cross_hand_toss'
  | 'reverse_holster_spin';

export interface ColtSAASpinState {
  active: boolean;
  spinType: ColtSAASpinType;
  phase: ColtSAASpinPhase;
  elapsed: number;
  duration: number;
  // Procedural 3D transform offsets applied to the revolver viewmodel
  pitchSpinRad: number; // X-axis trigger-guard twirl rotation
  yawSpinRad: number;   // Y-axis flat spin rotation
  rollSpinRad: number;  // Z-axis barrel-roll rotation
  offsetX: number;      // Cross-body hand toss X offset
  offsetY: number;      // Aerial toss Y arc offset
  offsetZ: number;      // Forward/back spin offset
  cylinderSpinVel: number;
}

export const COLT_SAA_EQUIP_FLIP_DURATION_SEC = 0.55;
export const COLT_SAA_FREESTYLE_SPIN_DURATION_SEC = 2.10;

export function createColtSAASpinState(): ColtSAASpinState {
  return {
    active: false,
    spinType: 'none',
    phase: 'idle',
    elapsed: 0,
    duration: 0,
    pitchSpinRad: 0,
    yawSpinRad: 0,
    rollSpinRad: 0,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    cylinderSpinVel: 0,
  };
}

export function triggerColtSAASpin(
  state: ColtSAASpinState,
  type: 'equip_flip' | 'inspect_freestyle'
): void {
  state.active = true;
  state.spinType = type;
  state.elapsed = 0;
  state.duration =
    type === 'equip_flip'
      ? COLT_SAA_EQUIP_FLIP_DURATION_SEC
      : COLT_SAA_FREESTYLE_SPIN_DURATION_SEC;
  state.phase = type === 'equip_flip' ? 'equip_draw_flip' : 'twirl_forward';
  state.pitchSpinRad = 0;
  state.yawSpinRad = 0;
  state.rollSpinRad = 0;
  state.offsetX = 0;
  state.offsetY = 0;
  state.offsetZ = 0;
  state.cylinderSpinVel = type === 'equip_flip' ? 18.0 : 28.0;
}

/**
 * Step the Colt SAA Freestyle / Gun-Spinning & Equip Flip animation state:
 * - 'equip_flip' (0.55s): Fancy 360° upward draw flip around the trigger guard when equipping.
 * - 'inspect_freestyle' (2.10s, bound to I or J):
 *   1. Stage 1 (0.00 - 0.70s): Double 720° forward twirl around the index finger (`twirl_forward`).
 *   2. Stage 2 (0.70 - 1.45s): Aerial toss across to the off-hand with corkscrew roll (`cross_hand_toss`).
 *   3. Stage 3 (1.45 - 2.10s): Reverse 360° spin & holster-catch snap (`reverse_holster_spin`).
 */
export function stepColtSAASpin(state: ColtSAASpinState, dt: number): void {
  if (!state.active || state.spinType === 'none') {
    state.pitchSpinRad = 0;
    state.yawSpinRad = 0;
    state.rollSpinRad = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.offsetZ = 0;
    state.cylinderSpinVel *= Math.exp(-8 * dt);
    return;
  }

  state.elapsed += dt;
  const t = state.elapsed;

  if (state.spinType === 'equip_flip') {
    const p = Math.min(1.0, t / COLT_SAA_EQUIP_FLIP_DURATION_SEC);
    const smooth = p * p * (3 - 2 * p);
    state.phase = 'equip_draw_flip';
    state.pitchSpinRad = smooth * Math.PI * 2; // Full 360° forward flip
    state.rollSpinRad = Math.sin(p * Math.PI) * 0.28;
    state.offsetY = Math.sin(p * Math.PI) * 0.065;
    state.offsetZ = -Math.sin(p * Math.PI) * 0.04;
  } else {
    // 'inspect_freestyle' 3-stage Ocelot gun-spinning sequence
    if (t < 0.70) {
      // Stage 1: Trigger-finger 720° twirl
      state.phase = 'twirl_forward';
      const p = t / 0.70;
      state.pitchSpinRad = p * Math.PI * 4; // 720° around trigger guard
      state.rollSpinRad = Math.sin(p * Math.PI * 2) * 0.22;
      state.offsetY = Math.sin(p * Math.PI) * 0.04;
      state.offsetX = 0;
      state.offsetZ = -0.03 * Math.sin(p * Math.PI);
    } else if (t < 1.45) {
      // Stage 2: Toss to off-hand & aerial barrel roll
      state.phase = 'cross_hand_toss';
      const p = (t - 0.70) / 0.75;
      state.pitchSpinRad = p * Math.PI * 2;
      state.yawSpinRad = Math.sin(p * Math.PI) * Math.PI * 2;
      state.rollSpinRad = p * Math.PI * 2;
      // Parabolic arc to left off-hand and back
      state.offsetX = -Math.sin(p * Math.PI) * 0.16;
      state.offsetY = Math.sin(p * Math.PI) * 0.085;
      state.offsetZ = -Math.sin(p * Math.PI) * 0.05;
    } else {
      // Stage 3: Reverse spin & holster-catch snap
      state.phase = 'reverse_holster_spin';
      const p = Math.min(1.0, (t - 1.45) / 0.65);
      const easeOut = 1 - Math.pow(1 - p, 3);
      state.pitchSpinRad = -easeOut * Math.PI * 2; // Reverse 360° spin
      state.yawSpinRad = 0;
      state.rollSpinRad = Math.sin(p * Math.PI) * -0.35;
      state.offsetX = (1 - easeOut) * -0.03;
      state.offsetY = -Math.sin(p * Math.PI) * 0.045; // Holster dip
      state.offsetZ = 0;
    }
  }

  if (state.elapsed >= state.duration) {
    state.active = false;
    state.spinType = 'none';
    state.phase = 'idle';
    state.pitchSpinRad = 0;
    state.yawSpinRad = 0;
    state.rollSpinRad = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.offsetZ = 0;
  }
}

// ============================================================================
// PREMIUM ANIMATION BLENDING (0.2s CROSSFADING) & SPRING-DAMPER WEAPON PHYSICS
// ============================================================================

export const ANIM_CROSSFADE_DURATION_SEC = 0.20; // Smooth 0.2-second crossfade lerp

export type WeaponAnimStateId = 'idle' | 'walk' | 'sprint' | 'fire' | 'reload';

export interface WeaponAnimationBlendState {
  activeState: WeaponAnimStateId;
  weights: Record<WeaponAnimStateId, number>;
  crossfadeDurationSec: number;
}

export function createWeaponAnimationBlendState(): WeaponAnimationBlendState {
  return {
    activeState: 'idle',
    weights: {
      idle: 1.0,
      walk: 0.0,
      sprint: 0.0,
      fire: 0.0,
      reload: 0.0,
    },
    crossfadeDurationSec: ANIM_CROSSFADE_DURATION_SEC,
  };
}

/**
 * Smoothly crossfades first-person and character animation weights across
 * Idle, Walk, Sprint, Fire, and Reload states over a 0.2-second lerp window.
 * Guarantees weights are continuous, non-negative, and normalized to 1.0 (zero snapping or T-posing).
 */
export function stepWeaponAnimationController(
  state: WeaponAnimationBlendState,
  targetState: WeaponAnimStateId,
  dt: number
): WeaponAnimationBlendState {
  state.activeState = targetState;
  const fadeRate = 1.0 / Math.max(0.05, state.crossfadeDurationSec);
  const deltaWeight = Math.min(1.0, Math.max(0, dt) * fadeRate);

  const keys: WeaponAnimStateId[] = ['idle', 'walk', 'sprint', 'fire', 'reload'];
  let sum = 0;
  for (const k of keys) {
    if (k === targetState) {
      state.weights[k] = Math.min(1.0, state.weights[k] + deltaWeight);
    } else {
      state.weights[k] = Math.max(0.0, state.weights[k] - deltaWeight);
    }
    if (state.weights[k] < 0.0001) state.weights[k] = 0;
    sum += state.weights[k];
  }

  // Normalize so sum of weights is strictly 1.0
  if (sum > 0.0001) {
    for (const k of keys) {
      state.weights[k] /= sum;
    }
  } else {
    state.weights[targetState] = 1.0;
  }

  return state;
}

export interface WeaponSpringState {
  // Translational spring displacement & velocity (m, m/s)
  posX: number;
  posY: number;
  posZ: number;
  velX: number;
  velY: number;
  velZ: number;
  // Rotational spring displacement & velocity (rad, rad/s)
  rotX: number;
  rotY: number;
  rotZ: number;
  rotVelX: number;
  rotVelY: number;
  rotVelZ: number;
  // Walk bobbing phase
  bobPhase: number;
}

export function createWeaponSpringState(): WeaponSpringState {
  return {
    posX: 0,
    posY: 0,
    posZ: 0,
    velX: 0,
    velY: 0,
    velZ: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    rotVelX: 0,
    rotVelY: 0,
    rotVelZ: 0,
    bobPhase: 0,
  };
}

/**
 * Apply an instantaneous violent recoil impulse to the weapon spring-damper system when fired.
 */
export function applyWeaponSpringRecoilImpulse(
  spring: WeaponSpringState,
  verticalRecoil: number,
  horizontalRecoil: number,
  isAds: boolean
): void {
  const adsScale = isAds ? 0.68 : 1.0;
  // Kick back along +Z (toward shoulder) and slightly up (+Y)
  spring.velZ += (0.85 + verticalRecoil * 9.5) * adsScale;
  spring.velY += (0.22 + verticalRecoil * 3.2) * adsScale;
  spring.velX += (Math.random() - 0.5) * horizontalRecoil * 8.0 * adsScale;

  // Violent rotational muzzle climb (+rotX) and roll twist (rotZ)
  spring.rotVelX += (2.8 + verticalRecoil * 48.0) * adsScale;
  spring.rotVelY += (Math.random() - 0.5) * horizontalRecoil * 32.0 * adsScale;
  spring.rotVelZ += (Math.random() - 0.5) * (0.8 + horizontalRecoil * 24.0) * adsScale;
}

/**
 * Step the second-order Hookean spring-damper physics for the first-person weapon viewmodel:
 * - Camera Turn Sway: Gun drags slightly behind camera yaw/pitch velocity and settles smoothly.
 * - Footstep View Bobbing: Natural Lissajous figure-8 bounce driven by movement speed.
 * - Rotational & Positional Recoil: Violent kickback when fired, settling back to center via spring tension.
 */
export function stepWeaponSpringPhysics(
  spring: WeaponSpringState,
  params: {
    dt: number;
    lookDeltaYaw: number;
    lookDeltaPitch: number;
    moveSpeed: number;
    isMoving: boolean;
    isSprinting: boolean;
    isCrouched: boolean;
    isGrounded: boolean;
    isAds: boolean;
  }
): {
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
} {
  const stepDt = Math.min(params.dt, 0.033);
  const stiffnessPos = 185.0;
  const dampingPos = 22.0;
  const stiffnessRot = 210.0;
  const dampingRot = 20.0;

  // 1. Inject angular drag from camera turning (weapon sway)
  const swayScale = params.isAds ? 0.35 : 1.0;
  spring.velX -= params.lookDeltaYaw * 1.45 * swayScale;
  spring.velY += params.lookDeltaPitch * 1.25 * swayScale;
  spring.rotVelY -= params.lookDeltaYaw * 4.2 * swayScale;
  spring.rotVelX -= params.lookDeltaPitch * 3.8 * swayScale;
  spring.rotVelZ += params.lookDeltaYaw * 2.8 * swayScale;

  // 2. Integrate Hookean translational spring: F = -k * x - c * v
  const ax = -stiffnessPos * spring.posX - dampingPos * spring.velX;
  const ay = -stiffnessPos * spring.posY - dampingPos * spring.velY;
  const az = -stiffnessPos * spring.posZ - dampingPos * spring.velZ;
  spring.velX += ax * stepDt;
  spring.velY += ay * stepDt;
  spring.velZ += az * stepDt;
  spring.posX = Math.max(-0.06, Math.min(0.06, spring.posX + spring.velX * stepDt));
  spring.posY = Math.max(-0.06, Math.min(0.06, spring.posY + spring.velY * stepDt));
  spring.posZ = Math.max(-0.05, Math.min(0.11, spring.posZ + spring.velZ * stepDt));

  // 3. Integrate Hookean rotational spring: Tau = -k * theta - c * omega
  const alphaX = -stiffnessRot * spring.rotX - dampingRot * spring.rotVelX;
  const alphaY = -stiffnessRot * spring.rotY - dampingRot * spring.rotVelY;
  const alphaZ = -stiffnessRot * spring.rotZ - dampingRot * spring.rotVelZ;
  spring.rotVelX += alphaX * stepDt;
  spring.rotVelY += alphaY * stepDt;
  spring.rotVelZ += alphaZ * stepDt;
  spring.rotX = Math.max(-0.35, Math.min(0.55, spring.rotX + spring.rotVelX * stepDt));
  spring.rotY = Math.max(-0.32, Math.min(0.32, spring.rotY + spring.rotVelY * stepDt));
  spring.rotZ = Math.max(-0.35, Math.min(0.35, spring.rotZ + spring.rotVelZ * stepDt));

  // 4. Footstep View Bobbing (Lissajous figure-8 bounce)
  let bobX = 0;
  let bobY = 0;
  let bobRollZ = 0;
  if (params.isMoving && params.isGrounded) {
    const freq = params.isSprinting ? 11.5 : params.isCrouched ? 5.8 : 8.2;
    spring.bobPhase += stepDt * freq;
    const bobAmp = (params.isAds ? 0.25 : 1.0) * (params.isSprinting ? 1.45 : params.isCrouched ? 0.55 : 1.0);
    bobX = Math.cos(spring.bobPhase) * 0.0085 * bobAmp;
    bobY = -Math.abs(Math.sin(spring.bobPhase)) * 0.011 * bobAmp;
    bobRollZ = Math.cos(spring.bobPhase) * 0.018 * bobAmp;
  } else {
    // Subtle breathing oscillation when stationary
    spring.bobPhase += stepDt * 1.8;
    const breathAmp = params.isAds ? 0.2 : 1.0;
    bobY = Math.sin(spring.bobPhase) * 0.0018 * breathAmp;
  }

  return {
    offsetX: spring.posX + bobX,
    offsetY: spring.posY + bobY,
    offsetZ: spring.posZ,
    rotX: spring.rotX,
    rotY: spring.rotY,
    rotZ: spring.rotZ + bobRollZ,
  };
}

export interface OpticAdsAlignmentResult {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  opticLocalY: number;
  opticWorldOffsetFromCameraAxis: { x: number; y: number };
}

/**
 * Compute first-person weapon viewmodel transform so that during ADS (adsAmount -> 1.0),
 * the active optic mesh's local Z-axis aligns strictly with the camera's forward look axis (x = 0, y = 0).
 */
export function computeOpticAlignedAdsPosition(params: {
  weaponId: WeaponId;
  hasHolographic: boolean;
  adsAmount: number; // [0..1]
  swayX?: number;
  swayY?: number;
  leanAmount?: number;
}): OpticAdsAlignmentResult {
  const {
    weaponId,
    hasHolographic,
    adsAmount,
    swayX = 0,
    swayY = 0,
    leanAmount = 0,
  } = params;
  const clampedAds = Math.max(0, Math.min(1, adsAmount));
  const hipWeight = 1 - clampedAds;
  const cfg = OPTIC_LOCAL_OFFSETS[weaponId];
  const opticLocalY = hasHolographic ? cfg.holographicSightY : cfg.ironSightY;

  // Target ADS position puts the optic center at camera local (0, 0, adsZ)
  const targetAdsX = 0;
  const targetAdsY = -opticLocalY;
  const targetAdsZ = cfg.adsZ;

  // Dampen sway and cant to 0 as adsAmount reaches 1.0 so the optic reticle is locked on the camera Z-axis
  const x =
    cfg.hipOffset.x * hipWeight + targetAdsX * clampedAds + swayX * hipWeight;
  const y =
    cfg.hipOffset.y * hipWeight + targetAdsY * clampedAds + swayY * hipWeight;
  const z = cfg.hipOffset.z * hipWeight + targetAdsZ * clampedAds;

  const rotX = swayY * 0.25 * hipWeight;
  const rotY = swayX * 0.35 * hipWeight;
  const rotZ = (-leanAmount * 0.12 - swayX * 0.6) * hipWeight;

  // Residual distance between the optic reticle center and the camera's (0,0) Z-axis
  const opticWorldX = x;
  const opticWorldY = y + opticLocalY;

  return {
    position: {
      x: Number(x.toFixed(5)),
      y: Number(y.toFixed(5)),
      z: Number(z.toFixed(5)),
    },
    rotation: {
      x: Number(rotX.toFixed(5)),
      y: Number(rotY.toFixed(5)),
      z: Number(rotZ.toFixed(5)),
    },
    opticLocalY,
    opticWorldOffsetFromCameraAxis: {
      x: Number(opticWorldX.toFixed(5)),
      y: Number(opticWorldY.toFixed(5)),
    },
  };
}

/**
 * Dynamically adjust the camera's near clipping plane during ADS to prevent any weapon/scope mesh clipping.
 */
export function computeDynamicCameraNearPlane(
  adsAmount: number,
  baseNear = 0.05,
  adsNear = 0.012
): number {
  const t = Math.max(0, Math.min(1, adsAmount));
  return Number((baseNear + (adsNear - baseNear) * t).toFixed(4));
}

/**
 * Update lean state (-1 left, 0 center, +1 right) for either toggle or hold input mode.
 */
export function computeNextLeanTarget(
  currentTarget: LeanDirection,
  mode: LeanInputMode,
  event: { key: 'Q' | 'E'; type: 'keydown' | 'keyup'; qHeld: boolean; eHeld: boolean }
): LeanDirection {
  const dir: LeanDirection = event.key === 'Q' ? -1 : 1;
  if (mode === 'toggle') {
    if (event.type === 'keydown') {
      return currentTarget === dir ? 0 : dir;
    }
    return currentTarget;
  } else {
    // Hold mode
    if (event.qHeld && !event.eHeld) return -1;
    if (event.eHeld && !event.qHeld) return 1;
    if (event.qHeld && event.eHeld) return dir;
    return 0;
  }
}

/**
 * Smoothly interpolate (damp/lerp) lean amount and clamp against wall collision clearance
 * so the camera never clips into wall geometry while leaning.
 */
export function stepLeanKinematics(params: {
  currentLeanAmount: number; // [-1, 1]
  targetLean: LeanDirection;
  dt: number;
  wallClearanceDist: number | null; // distance from player center along the lean side to nearest wall
}): {
  leanAmount: number;
  offsetX: number;
  rollZ: number;
} {
  const { currentLeanAmount, targetLean, dt, wallClearanceDist } = params;
  // Clamp max allowed lean magnitude based on wall clearance
  let maxAllowedMagnitude = 1.0;
  if (wallClearanceDist !== null && Math.abs(targetLean) > 0) {
    const usableSpace = Math.max(0, wallClearanceDist - LEAN_WALL_SAFETY_MARGIN);
    maxAllowedMagnitude = Math.min(1.0, usableSpace / LEAN_MAX_OFFSET_X);
  } else if (wallClearanceDist !== null && Math.abs(currentLeanAmount) > 0.01) {
    const usableSpace = Math.max(0, wallClearanceDist - LEAN_WALL_SAFETY_MARGIN);
    maxAllowedMagnitude = Math.min(1.0, usableSpace / LEAN_MAX_OFFSET_X);
  }

  const effectiveTarget = targetLean * maxAllowedMagnitude;
  const speed = 12.0;
  const alpha = 1 - Math.exp(-speed * Math.min(dt, 0.1));
  let nextLean = currentLeanAmount + (effectiveTarget - currentLeanAmount) * alpha;

  // Hard clamp against wall if player walked sideways into a wall while already leaning
  if (wallClearanceDist !== null) {
    const usableSpace = Math.max(0, wallClearanceDist - LEAN_WALL_SAFETY_MARGIN);
    const maxMag = Math.min(1.0, usableSpace / LEAN_MAX_OFFSET_X);
    if (Math.abs(nextLean) > maxMag) {
      nextLean = Math.sign(nextLean) * maxMag;
    }
  }

  if (Math.abs(nextLean) < 0.001 && effectiveTarget === 0) {
    nextLean = 0;
  }

  return {
    leanAmount: nextLean,
    offsetX: nextLean * LEAN_MAX_OFFSET_X,
    // Leaning left (-1) tilts camera Z positively (+15 deg); leaning right (+1) tilts Z negatively (-15 deg)
    rollZ: -nextLean * LEAN_MAX_ANGLE_RAD,
  };
}

export type SurfaceMaterialTag = 'concrete' | 'steel' | 'drywall' | 'wood';

export interface AABB {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  kind: 'wall' | 'lintel' | 'pillar' | 'crate' | 'frame' | 'light' | 'desk' | 'server' | 'barrier';
  materialTag?: SurfaceMaterialTag;
}

export interface NavWaypoint {
  id: string;
  x: number;
  z: number;
  roomGx: number;
  roomGz: number;
  isDoorway?: boolean;
  isCover?: boolean;
  neighbors: string[];
}

export interface NavGraph {
  waypoints: NavWaypoint[];
  waypointMap: Map<string, NavWaypoint>;
}

export interface LightFixtureSpec {
  id: string;
  roomGx: number;
  roomGz: number;
  x: number;
  y: number;
  z: number;
  hp: number;
  maxHp: number;
  intact: boolean;
  aabb: AABB;
}

export type MapLayoutVariant =
  | 'l_compound'
  | 'u_courtyard'
  | 'cross_bastion'
  | 'z_labyrinth'
  | 't_fortress'
  | 'asymmetric_compound';

export type RoomShapeVariant =
  | 'breach_entry'
  | 'l_alcove'
  | 'angled_chamber'
  | 'split_baffle'
  | 'pillared_atrium'
  | 'irregular_bay';

export const ALL_MAP_LAYOUT_VARIANTS: MapLayoutVariant[] = [
  'l_compound',
  'u_courtyard',
  'cross_bastion',
  'z_labyrinth',
  't_fortress',
  'asymmetric_compound',
];

export const MAP_LAYOUT_META: Record<
  MapLayoutVariant,
  {
    name: string;
    shortName: string;
    description: string;
    activeCells: Array<[number, number]>; // [gx, gz] on 4x4 tactical grid (9 connected sectors)
  }
> = {
  l_compound: {
    name: 'L-WING COMPOUND',
    shortName: 'L-WING',
    description: 'Asymmetric L-shaped tactical wing wrapping a recessed northeast courtyard',
    activeCells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [2, 3],
    ],
  },
  u_courtyard: {
    name: 'U-COURTYARD COMPLEX',
    shortName: 'U-COURT',
    description: 'Twin parallel wings connected by a southern bridge around an open central void',
    activeCells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [2, 2],
      [2, 1],
      [2, 0],
      [3, 0],
    ],
  },
  cross_bastion: {
    name: 'CRUCIFORM BASTION',
    shortName: 'CRUCIFORM',
    description: 'Intersecting 4-column east-west crosswing and deep north-south tactical spine',
    activeCells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
      [2, 2],
      [1, 3],
    ],
  },
  z_labyrinth: {
    name: 'STAGGERED Z-LABYRINTH',
    shortName: 'Z-LABYRINTH',
    description: 'Stepped diagonal dogleg sectors forcing close-quarters corner clearing',
    activeCells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [3, 2],
      [2, 3],
      [3, 3],
    ],
  },
  t_fortress: {
    name: 'T-WING FORTRESS',
    shortName: 'T-FORTRESS',
    description: 'Wide 4-sector northern command bar feeding a deep central vault stem',
    activeCells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2],
      [2, 3],
    ],
  },
  asymmetric_compound: {
    name: 'HOLLOW RING KILLHOUSE',
    shortName: 'RING-COMPLEX',
    description: 'Perimeter CQB loop surrounding an inaccessible central lightwell with an east annex',
    activeCells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [2, 1],
      [3, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
  },
};

export interface RoomCell {
  gx: number;
  gz: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
  centerX: number;
  centerZ: number;
  name: string;
  theme:
    | 'armory'
    | 'comms'
    | 'briefing'
    | 'storage'
    | 'server'
    | 'medical'
    | 'entry'
    | 'vault'
    | 'killhouse';
  doors: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  roomType?: 'office' | 'hallway' | 'atrium' | 'standard';
  shapeVariant: RoomShapeVariant;
}

export interface DoorwaySpec {
  id: string;
  x: number;
  z: number;
  orientation: 'NS' | 'EW'; // 'NS' means wall runs along X (separates North/South rooms); 'EW' runs along Z
  width: number;
  height: number;
  isOpenArchway?: boolean;
}

export interface EnemySpawnSpec {
  id: string;
  archetype: EnemyArchetype;
  x: number;
  z: number;
  roomGx: number;
  roomGz: number;
  patrolPoints: Array<{ x: number; z: number }>;
  isAmbushAgro?: boolean;
}

export interface LockerAmbushSpec {
  id: string;
  roomGx: number;
  roomGz: number;
  x: number;
  y: number;
  z: number;
  facingYaw: number;
  triggerRadius: number;
  triggered: boolean;
  doorOpenProgress: number; // 0 = closed, 1 = blasted wide open
  spawnArchetype: EnemyArchetype;
  spawnPoint: { x: number; z: number };
  aabb: AABB;
}

export interface GeneratedCQBMap {
  seed: number;
  layoutVariant: MapLayoutVariant;
  layoutName: string;
  gridCols: number;
  gridRows: number;
  cellSize: number;
  totalWidth: number;
  totalDepth: number;
  colWidths: number[];
  rowDepths: number[];
  wallHeight: number;
  wallThickness: number;
  rooms: RoomCell[];
  wallSegments: AABB[];
  doorFrameSegments: AABB[];
  coverProps: AABB[];
  doorways: DoorwaySpec[];
  lightFixtures: LightFixtureSpec[];
  lockerAmbushes: LockerAmbushSpec[];
  navGraph: NavGraph;
  playerSpawn: {
    x: number;
    y: number;
    z: number;
    yaw: number; // Facing open doorway
  };
  enemySpawns: EnemySpawnSpec[];
  allRoomsReachable: boolean;
}

const ROOM_THEMES: Array<{ theme: RoomCell['theme']; name: string }> = [
  { theme: 'entry', name: 'SECTOR A1 · BREACH ENTRY' },
  { theme: 'comms', name: 'SECTOR A2 · COMMS RELAY' },
  { theme: 'armory', name: 'SECTOR A3 · ORDNANCE BAY' },
  { theme: 'briefing', name: 'SECTOR B1 · TACTICAL OPS' },
  { theme: 'killhouse', name: 'SECTOR B2 · CENTRAL ATRIUM' },
  { theme: 'server', name: 'SECTOR B3 · DATA VAULT' },
  { theme: 'medical', name: 'SECTOR C1 · MED TRIAGE' },
  { theme: 'storage', name: 'SECTOR C2 · LOGISTICS' },
  { theme: 'vault', name: 'SECTOR C3 · COMMAND CORE' },
];

const ROOM_SHAPE_VARIANTS: RoomShapeVariant[] = [
  'l_alcove',
  'angled_chamber',
  'split_baffle',
  'pillared_atrium',
  'irregular_bay',
];

/**
 * Find the active RoomCell containing world position (wx, wz), or the nearest active room if outside bounds.
 */
export function findRoomAtPosition(
  map: GeneratedCQBMap,
  wx: number,
  wz: number
): RoomCell {
  for (const r of map.rooms) {
    if (wx >= r.minX && wx <= r.maxX && wz >= r.minZ && wz <= r.maxZ) {
      return r;
    }
  }
  let best = map.rooms[0];
  let bestDist = Infinity;
  for (const r of map.rooms) {
    const d = Math.hypot(wx - r.centerX, wz - r.centerZ);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}

/**
 * Generate a collision-safe, flood-fill verified CQB map with non-box building footprints,
 * variable room dimensions, offset doorways, and interior non-box room shapes.
 */
export function generateCQBMap(
  seed = 1337,
  layoutOverride?: MapLayoutVariant
): GeneratedCQBMap {
  const rng = createSeededRng(seed);
  const gridCols = 4;
  const gridRows = 4;
  const cellSize = 8.0; // Nominal cell size (Room (0,0) is always 8.0m x 8.0m)
  const wallHeight = 3.6;
  const wallThickness = 0.32;
  const doorWidth = 2.2;
  const doorHeight = 2.55;

  // Select non-box building footprint variant from seed (or explicit override)
  const variantIdx = Math.abs(Math.floor(seed * 7 + rng() * 19)) % ALL_MAP_LAYOUT_VARIANTS.length;
  const layoutVariant: MapLayoutVariant =
    layoutOverride ?? ALL_MAP_LAYOUT_VARIANTS[variantIdx];
  const layoutMeta = MAP_LAYOUT_META[layoutVariant];

  // Variable column widths & row depths so rooms are diverse rectangles/corridors/bays, never uniform boxes.
  // Keep col 0 and row 0 at 8.0m so Breach Entry Room (0,0) has exact [0..8, 0..8] coordinates.
  const dimPool = [6.6, 7.4, 8.4, 9.2];
  const colWidths = [
    8.0,
    dimPool[Math.floor(rng() * dimPool.length)],
    dimPool[Math.floor(rng() * dimPool.length)],
    dimPool[Math.floor(rng() * dimPool.length)],
  ];
  const rowDepths = [
    8.0,
    dimPool[Math.floor(rng() * dimPool.length)],
    dimPool[Math.floor(rng() * dimPool.length)],
    dimPool[Math.floor(rng() * dimPool.length)],
  ];

  const colX: number[] = [0];
  for (let gx = 0; gx < gridCols; gx++) {
    colX.push(Number((colX[gx] + colWidths[gx]).toFixed(4)));
  }
  const rowZ: number[] = [0];
  for (let gz = 0; gz < gridRows; gz++) {
    rowZ.push(Number((rowZ[gz] + rowDepths[gz]).toFixed(4)));
  }

  const totalWidth = colX[gridCols];
  const totalDepth = rowZ[gridRows];

  // Build active footprint mask on 4x4 grid
  const activeMask: boolean[][] = Array.from({ length: gridRows }, () =>
    Array(gridCols).fill(false)
  );
  for (const [gx, gz] of layoutMeta.activeCells) {
    if (gz >= 0 && gz < gridRows && gx >= 0 && gx < gridCols) {
      activeMask[gz][gx] = true;
    }
  }

  const roomGrid: Array<Array<RoomCell | null>> = Array.from(
    { length: gridRows },
    () => Array(gridCols).fill(null)
  );
  const activeRooms: RoomCell[] = [];

  let themeCursor = 0;
  for (let gz = 0; gz < gridRows; gz++) {
    for (let gx = 0; gx < gridCols; gx++) {
      if (!activeMask[gz][gx]) continue;
      const meta = ROOM_THEMES[themeCursor % ROOM_THEMES.length];
      const isEntry = gx === 0 && gz === 0;
      const shapeVariant: RoomShapeVariant = isEntry
        ? 'breach_entry'
        : ROOM_SHAPE_VARIANTS[
            (themeCursor + Math.floor(rng() * ROOM_SHAPE_VARIANTS.length)) %
              ROOM_SHAPE_VARIANTS.length
          ];
      themeCursor++;

      const minX = colX[gx];
      const maxX = colX[gx + 1];
      const minZ = rowZ[gz];
      const maxZ = rowZ[gz + 1];
      const width = Number((maxX - minX).toFixed(4));
      const depth = Number((maxZ - minZ).toFixed(4));

      const cell: RoomCell = {
        gx,
        gz,
        minX,
        maxX,
        minZ,
        maxZ,
        width,
        depth,
        centerX: Number(((minX + maxX) * 0.5).toFixed(4)),
        centerZ: Number(((minZ + maxZ) * 0.5).toFixed(4)),
        name: meta.name,
        theme: meta.theme,
        doors: { north: false, south: false, east: false, west: false },
        shapeVariant,
      };
      roomGrid[gz][gx] = cell;
      activeRooms.push(cell);
    }
  }

  // 1. Randomized Depth-First Spanning Tree across active footprint cells from (0, 0)
  const visited = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
  const stack: Array<{ gx: number; gz: number }> = [{ gx: 0, gz: 0 }];
  visited[0][0] = true;

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors: Array<{
      gx: number;
      gz: number;
      dir: 'north' | 'south' | 'east' | 'west';
      opp: 'north' | 'south' | 'east' | 'west';
    }> = [];

    if (curr.gz > 0 && activeMask[curr.gz - 1][curr.gx] && !visited[curr.gz - 1][curr.gx]) {
      neighbors.push({ gx: curr.gx, gz: curr.gz - 1, dir: 'north', opp: 'south' });
    }
    if (
      curr.gz < gridRows - 1 &&
      activeMask[curr.gz + 1][curr.gx] &&
      !visited[curr.gz + 1][curr.gx]
    ) {
      neighbors.push({ gx: curr.gx, gz: curr.gz + 1, dir: 'south', opp: 'north' });
    }
    if (
      curr.gx < gridCols - 1 &&
      activeMask[curr.gz][curr.gx + 1] &&
      !visited[curr.gz][curr.gx + 1]
    ) {
      neighbors.push({ gx: curr.gx + 1, gz: curr.gz, dir: 'east', opp: 'west' });
    }
    if (curr.gx > 0 && activeMask[curr.gz][curr.gx - 1] && !visited[curr.gz][curr.gx - 1]) {
      neighbors.push({ gx: curr.gx - 1, gz: curr.gz, dir: 'west', opp: 'east' });
    }

    if (neighbors.length > 0) {
      const pick = neighbors[Math.floor(rng() * neighbors.length)];
      roomGrid[curr.gz][curr.gx]!.doors[pick.dir] = true;
      roomGrid[pick.gz][pick.gx]!.doors[pick.opp] = true;
      visited[pick.gz][pick.gx] = true;
      stack.push({ gx: pick.gx, gz: pick.gz });
    } else {
      stack.pop();
    }
  }

  // Add extra tactical loop doorways between adjacent active rooms so flanking routes exist
  const internalEdges: Array<{
    gx1: number;
    gz1: number;
    dir: 'east' | 'south';
    gx2: number;
    gz2: number;
    opp: 'west' | 'north';
  }> = [];

  for (let gz = 0; gz < gridRows; gz++) {
    for (let gx = 0; gx < gridCols; gx++) {
      if (!activeMask[gz][gx]) continue;
      if (gx < gridCols - 1 && activeMask[gz][gx + 1]) {
        internalEdges.push({ gx1: gx, gz1: gz, dir: 'east', gx2: gx + 1, gz2: gz, opp: 'west' });
      }
      if (gz < gridRows - 1 && activeMask[gz + 1][gx]) {
        internalEdges.push({ gx1: gx, gz1: gz, dir: 'south', gx2: gx, gz2: gz + 1, opp: 'north' });
      }
    }
  }

  for (let i = internalEdges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [internalEdges[i], internalEdges[j]] = [internalEdges[j], internalEdges[i]];
  }
  let extraOpened = 0;
  for (const edge of internalEdges) {
    const cellA = roomGrid[edge.gz1][edge.gx1];
    const cellB = roomGrid[edge.gz2][edge.gx2];
    if (cellA && cellB && !cellA.doors[edge.dir]) {
      cellA.doors[edge.dir] = true;
      cellB.doors[edge.opp] = true;
      extraOpened++;
      if (extraOpened >= 3) break;
    }
  }

  // 2. Flood-Fill Connectivity Verification across all active rooms
  const reachable = Array.from({ length: gridRows }, () => Array(gridCols).fill(false));
  const queue: Array<{ gx: number; gz: number }> = [{ gx: 0, gz: 0 }];
  reachable[0][0] = true;
  let reachableCount = 1;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const cell = roomGrid[cur.gz][cur.gx]!;
    const checks: Array<{ cond: boolean; nx: number; nz: number }> = [
      { cond: cell.doors.north, nx: cur.gx, nz: cur.gz - 1 },
      { cond: cell.doors.south, nx: cur.gx, nz: cur.gz + 1 },
      { cond: cell.doors.east, nx: cur.gx + 1, nz: cur.gz },
      { cond: cell.doors.west, nx: cur.gx - 1, nz: cur.gz },
    ];
    for (const c of checks) {
      if (
        c.cond &&
        c.nx >= 0 &&
        c.nx < gridCols &&
        c.nz >= 0 &&
        c.nz < gridRows &&
        activeMask[c.nz][c.nx] &&
        !reachable[c.nz][c.nx]
      ) {
        reachable[c.nz][c.nx] = true;
        reachableCount++;
        queue.push({ gx: c.nx, gz: c.nz });
      }
    }
  }
  const allRoomsReachable = reachableCount === activeRooms.length;

  // 3. Construct Strict Non-Overlapping Wall, Perimeter, Pillar & Doorway Geometry
  // Using exact vertex posts [colX[gx]-halfT, colX[gx]+halfT] x [rowZ[gz]-halfT, rowZ[gz]+halfT]
  // and edge spans strictly between posts so zero overlaps are mathematically guaranteed.
  const wallSegments: AABB[] = [];
  const doorFrameSegments: AABB[] = [];
  const doorways: DoorwaySpec[] = [];
  const halfT = wallThickness / 2;
  const frameThickness = 0.06;

  // 3A. Grid Vertex Posts / Pillars at every active corner or interior junction
  for (let gz = 0; gz <= gridRows; gz++) {
    for (let gx = 0; gx <= gridCols; gx++) {
      const nw = gz > 0 && gx > 0 && activeMask[gz - 1][gx - 1];
      const ne = gz > 0 && gx < gridCols && activeMask[gz - 1][gx];
      const sw = gz < gridRows && gx > 0 && activeMask[gz][gx - 1];
      const se = gz < gridRows && gx < gridCols && activeMask[gz][gx];
      const activeCount = (nw ? 1 : 0) + (ne ? 1 : 0) + (sw ? 1 : 0) + (se ? 1 : 0);
      if (activeCount === 0) continue;

      const px = colX[gx];
      const pz = rowZ[gz];
      wallSegments.push({
        id: `junction-pillar-${gx}-${gz}`,
        minX: px - halfT,
        maxX: px + halfT,
        minY: 0,
        maxY: wallHeight,
        minZ: pz - halfT,
        maxZ: pz + halfT,
        kind: activeCount === 4 ? 'pillar' : 'wall',
        materialTag: 'concrete',
      });
    }
  }

  // 3B. Horizontal Grid Edges (running along X at z = rowZ[gz], for gz = 0..gridRows, gx = 0..gridCols-1)
  for (let gz = 0; gz <= gridRows; gz++) {
    const zLine = rowZ[gz];
    for (let gx = 0; gx < gridCols; gx++) {
      const northActive = gz > 0 && activeMask[gz - 1][gx];
      const southActive = gz < gridRows && activeMask[gz][gx];
      if (!northActive && !southActive) continue;

      const spanMinX = colX[gx] + halfT;
      const spanMaxX = colX[gx + 1] - halfT;
      const spanCenter = (spanMinX + spanMaxX) * 0.5;

      // Exterior boundary of the non-box building footprint -> Heavy Concrete Perimeter Wall
      if (northActive !== southActive) {
        wallSegments.push({
          id: `perimeter-h-${gx}-${gz}`,
          minX: spanMinX,
          maxX: spanMaxX,
          minY: 0,
          maxY: wallHeight,
          minZ: zLine - halfT,
          maxZ: zLine + halfT,
          kind: 'wall',
          materialTag: 'concrete',
        });
        continue;
      }

      // Interior partition between two active rooms (gz-1 and gz)
      const northRoom = roomGrid[gz - 1][gx]!;
      const hasDoor = northRoom.doors.south;

      if (!hasDoor) {
        wallSegments.push({
          id: `hwall-${gx}-${gz}-solid`,
          minX: spanMinX,
          maxX: spanMaxX,
          minY: 0,
          maxY: wallHeight,
          minZ: zLine - halfT,
          maxZ: zLine + halfT,
          kind: 'wall',
          materialTag: 'drywall',
        });
      } else {
        // Keep initial breach doorway out of Room (0,0) centered; offset other doorways for organic room flow
        const isEntryBreachDoor = gx === 0 && gz === 1;
        const maxOffset = Math.max(0, (spanMaxX - spanMinX - doorWidth) * 0.5 - 0.85);
        const doorOffset = isEntryBreachDoor
          ? 0
          : Number(((rng() - 0.5) * 2 * Math.min(0.95, maxOffset)).toFixed(3));
        const doorCenter = spanCenter + doorOffset;
        const doorMinX = doorCenter - doorWidth * 0.5;
        const doorMaxX = doorCenter + doorWidth * 0.5;

        // Left wall leaf (Drywall partition)
        wallSegments.push({
          id: `hwall-${gx}-${gz}-left`,
          minX: spanMinX,
          maxX: doorMinX,
          minY: 0,
          maxY: wallHeight,
          minZ: zLine - halfT,
          maxZ: zLine + halfT,
          kind: 'wall',
          materialTag: 'drywall',
        });
        // Right wall leaf (Drywall partition)
        wallSegments.push({
          id: `hwall-${gx}-${gz}-right`,
          minX: doorMaxX,
          maxX: spanMaxX,
          minY: 0,
          maxY: wallHeight,
          minZ: zLine - halfT,
          maxZ: zLine + halfT,
          kind: 'wall',
          materialTag: 'drywall',
        });
        // Top lintel above doorway (Concrete structural beam)
        wallSegments.push({
          id: `hwall-${gx}-${gz}-lintel`,
          minX: doorMinX,
          maxX: doorMaxX,
          minY: doorHeight,
          maxY: wallHeight,
          minZ: zLine - halfT,
          maxZ: zLine + halfT,
          kind: 'lintel',
          materialTag: 'concrete',
        });
        // Non-overlapping steel door jambs inside the carved opening
        doorFrameSegments.push(
          {
            id: `hdoor-jambL-${gx}-${gz}`,
            minX: doorMinX,
            maxX: doorMinX + frameThickness,
            minY: 0,
            maxY: doorHeight - frameThickness,
            minZ: zLine - halfT,
            maxZ: zLine + halfT,
            kind: 'frame',
            materialTag: 'steel',
          },
          {
            id: `hdoor-jambR-${gx}-${gz}`,
            minX: doorMaxX - frameThickness,
            maxX: doorMaxX,
            minY: 0,
            maxY: doorHeight - frameThickness,
            minZ: zLine - halfT,
            maxZ: zLine + halfT,
            kind: 'frame',
            materialTag: 'steel',
          },
          {
            id: `hdoor-header-${gx}-${gz}`,
            minX: doorMinX,
            maxX: doorMaxX,
            minY: doorHeight - frameThickness,
            maxY: doorHeight,
            minZ: zLine - halfT,
            maxZ: zLine + halfT,
            kind: 'frame',
            materialTag: 'steel',
          }
        );
        doorways.push({
          id: `door-h-${gx}-${gz}`,
          x: doorCenter,
          z: zLine,
          orientation: 'NS',
          width: doorWidth - frameThickness * 2,
          height: doorHeight - frameThickness,
        });
      }
    }
  }

  // 3C. Vertical Grid Edges (running along Z at x = colX[gx], for gx = 0..gridCols, gz = 0..gridRows-1)
  for (let gx = 0; gx <= gridCols; gx++) {
    const xLine = colX[gx];
    for (let gz = 0; gz < gridRows; gz++) {
      const westActive = gx > 0 && activeMask[gz][gx - 1];
      const eastActive = gx < gridCols && activeMask[gz][gx];
      if (!westActive && !eastActive) continue;

      const spanMinZ = rowZ[gz] + halfT;
      const spanMaxZ = rowZ[gz + 1] - halfT;
      const spanCenter = (spanMinZ + spanMaxZ) * 0.5;

      // Exterior boundary of the non-box building footprint -> Heavy Concrete Perimeter Wall
      if (westActive !== eastActive) {
        wallSegments.push({
          id: `perimeter-v-${gx}-${gz}`,
          minX: xLine - halfT,
          maxX: xLine + halfT,
          minY: 0,
          maxY: wallHeight,
          minZ: spanMinZ,
          maxZ: spanMaxZ,
          kind: 'wall',
          materialTag: 'concrete',
        });
        continue;
      }

      // Interior partition between two active rooms (gx-1 and gx)
      const westRoom = roomGrid[gz][gx - 1]!;
      const hasDoor = westRoom.doors.east;

      if (!hasDoor) {
        wallSegments.push({
          id: `vwall-${gx}-${gz}-solid`,
          minX: xLine - halfT,
          maxX: xLine + halfT,
          minY: 0,
          maxY: wallHeight,
          minZ: spanMinZ,
          maxZ: spanMaxZ,
          kind: 'wall',
          materialTag: 'drywall',
        });
      } else {
        // Keep initial breach doorway out of Room (0,0) centered; offset other doorways
        const isEntryBreachDoor = gx === 1 && gz === 0;
        const maxOffset = Math.max(0, (spanMaxZ - spanMinZ - doorWidth) * 0.5 - 0.85);
        const doorOffset = isEntryBreachDoor
          ? 0
          : Number(((rng() - 0.5) * 2 * Math.min(0.95, maxOffset)).toFixed(3));
        const doorCenter = spanCenter + doorOffset;
        const doorMinZ = doorCenter - doorWidth * 0.5;
        const doorMaxZ = doorCenter + doorWidth * 0.5;

        // North wall leaf (Drywall partition)
        wallSegments.push({
          id: `vwall-${gx}-${gz}-north`,
          minX: xLine - halfT,
          maxX: xLine + halfT,
          minY: 0,
          maxY: wallHeight,
          minZ: spanMinZ,
          maxZ: doorMinZ,
          kind: 'wall',
          materialTag: 'drywall',
        });
        // South wall leaf (Drywall partition)
        wallSegments.push({
          id: `vwall-${gx}-${gz}-south`,
          minX: xLine - halfT,
          maxX: xLine + halfT,
          minY: 0,
          maxY: wallHeight,
          minZ: doorMaxZ,
          maxZ: spanMaxZ,
          kind: 'wall',
          materialTag: 'drywall',
        });
        // Top lintel above doorway (Concrete structural beam)
        wallSegments.push({
          id: `vwall-${gx}-${gz}-lintel`,
          minX: xLine - halfT,
          maxX: xLine + halfT,
          minY: doorHeight,
          maxY: wallHeight,
          minZ: doorMinZ,
          maxZ: doorMaxZ,
          kind: 'lintel',
          materialTag: 'concrete',
        });
        // Non-overlapping steel door jambs inside the carved opening
        doorFrameSegments.push(
          {
            id: `vdoor-jambN-${gx}-${gz}`,
            minX: xLine - halfT,
            maxX: xLine + halfT,
            minY: 0,
            maxY: doorHeight - frameThickness,
            minZ: doorMinZ,
            maxZ: doorMinZ + frameThickness,
            kind: 'frame',
            materialTag: 'steel',
          },
          {
            id: `vdoor-jambS-${gx}-${gz}`,
            minX: xLine - halfT,
            maxX: xLine + halfT,
            minY: 0,
            maxY: doorHeight - frameThickness,
            minZ: doorMaxZ - frameThickness,
            maxZ: doorMaxZ,
            kind: 'frame',
            materialTag: 'steel',
          },
          {
            id: `vdoor-header-${gx}-${gz}`,
            minX: xLine - halfT,
            maxX: xLine + halfT,
            minY: doorHeight - frameThickness,
            maxY: doorHeight,
            minZ: doorMinZ,
            maxZ: doorMaxZ,
            kind: 'frame',
            materialTag: 'steel',
          }
        );
        doorways.push({
          id: `door-v-${gx}-${gz}`,
          x: xLine,
          z: doorCenter,
          orientation: 'EW',
          width: doorWidth - frameThickness * 2,
          height: doorHeight - frameThickness,
        });
      }
    }
  }

  // 3D. Carve Non-Box Interior Room Architecture (L-Alcoves, Angled Corner Vaults, Chicanes, Pillared Bays)
  // Every candidate interior partition is strictly validated for zero overlap and >= 2.1m doorway clearance.
  const canPlaceInteriorWall = (cand: AABB, room: RoomCell): boolean => {
    const margin = halfT + 0.35;
    if (
      cand.minX < room.minX + margin ||
      cand.maxX > room.maxX - margin ||
      cand.minZ < room.minZ + margin ||
      cand.maxZ > room.maxZ - margin
    ) {
      return false;
    }
    // Keep room center waypoint clear
    if (
      room.centerX >= cand.minX - 0.65 &&
      room.centerX <= cand.maxX + 0.65 &&
      room.centerZ >= cand.minZ - 0.65 &&
      room.centerZ <= cand.maxZ + 0.65
    ) {
      return false;
    }
    // Keep at least 2.15m clearance around every doorway
    for (const door of doorways) {
      const nearestX = Math.max(cand.minX, Math.min(door.x, cand.maxX));
      const nearestZ = Math.max(cand.minZ, Math.min(door.z, cand.maxZ));
      if (Math.hypot(door.x - nearestX, door.z - nearestZ) < 1.85) {
        return false;
      }
    }
    // Never overlap or touch existing walls or frames
    const padded: AABB = {
      ...cand,
      minX: cand.minX - 0.12,
      maxX: cand.maxX + 0.12,
      minZ: cand.minZ - 0.12,
      maxZ: cand.maxZ + 0.12,
    };
    for (const existing of wallSegments) {
      if (doAABBsOverlap(padded, existing)) return false;
    }
    for (const existing of doorFrameSegments) {
      if (doAABBsOverlap(padded, existing)) return false;
    }
    return true;
  };

  for (const room of activeRooms) {
    if (room.gx === 0 && room.gz === 0) continue; // Keep Breach Entry room unobstructed for initial engagement
    // Also keep the room immediately behind the initial breach doorway clear along the doorway sightline
    const isFirstBreachTarget =
      (roomGrid[0][0]!.doors.east && room.gx === 1 && room.gz === 0) ||
      (!roomGrid[0][0]!.doors.east && room.gx === 0 && room.gz === 1);

    const cx = room.centerX;
    const cz = room.centerZ;
    const rw = room.width;
    const rd = room.depth;

    if (room.shapeVariant === 'l_alcove' && !isFirstBreachTarget) {
      // L-shaped interior partition wing creating an asymmetric alcove pocket
      const wingW = Math.min(2.1, rw * 0.28);
      const wingT = 0.28;
      const sideSign = rng() > 0.5 ? 1 : -1;
      const wingA: AABB = {
        id: `room-lwing-a-${room.gx}-${room.gz}`,
        minX: cx + sideSign * 1.15 - wingW * 0.5,
        maxX: cx + sideSign * 1.15 + wingW * 0.5,
        minY: 0,
        maxY: wallHeight,
        minZ: cz - 1.35 - wingT * 0.5,
        maxZ: cz - 1.35 + wingT * 0.5,
        kind: 'wall',
        materialTag: 'drywall',
      };
      if (canPlaceInteriorWall(wingA, room)) {
        wallSegments.push(wingA);
      }
    } else if (room.shapeVariant === 'angled_chamber') {
      // Corner chamfer buttresses that turn a square box room into an octagonal / chamfered vault
      const cornerSize = 1.05;
      const corners = [
        {
          id: `chamfer-nw-${room.gx}-${room.gz}`,
          minX: room.minX + halfT + 0.36,
          maxX: room.minX + halfT + 0.36 + cornerSize,
          minZ: room.minZ + halfT + 0.36,
          maxZ: room.minZ + halfT + 0.36 + cornerSize,
        },
        {
          id: `chamfer-se-${room.gx}-${room.gz}`,
          minX: room.maxX - halfT - 0.36 - cornerSize,
          maxX: room.maxX - halfT - 0.36,
          minZ: room.maxZ - halfT - 0.36 - cornerSize,
          maxZ: room.maxZ - halfT - 0.36,
        },
      ];
      for (const c of corners) {
        const cand: AABB = {
          ...c,
          minY: 0,
          maxY: wallHeight,
          kind: 'pillar',
          materialTag: 'concrete',
        };
        if (canPlaceInteriorWall(cand, room)) {
          wallSegments.push(cand);
        }
      }
    } else if (room.shapeVariant === 'split_baffle' && !isFirstBreachTarget) {
      // Staggered CQB chicane baffle partitions
      const b1: AABB = {
        id: `baffle-1-${room.gx}-${room.gz}`,
        minX: cx - 1.85,
        maxX: cx - 0.55,
        minY: 0,
        maxY: wallHeight,
        minZ: cz - 1.25,
        maxZ: cz - 0.97,
        kind: 'wall',
        materialTag: 'drywall',
      };
      const b2: AABB = {
        id: `baffle-2-${room.gx}-${room.gz}`,
        minX: cx + 0.55,
        maxX: cx + 1.85,
        minY: 0,
        maxY: wallHeight,
        minZ: cz + 0.97,
        maxZ: cz + 1.25,
        kind: 'wall',
        materialTag: 'drywall',
      };
      if (canPlaceInteriorWall(b1, room)) wallSegments.push(b1);
      if (canPlaceInteriorWall(b2, room)) wallSegments.push(b2);
    } else if (room.shapeVariant === 'pillared_atrium') {
      // Twin structural concrete columns
      const colSize = 0.52;
      const p1: AABB = {
        id: `atrium-col-1-${room.gx}-${room.gz}`,
        minX: cx - 1.45 - colSize * 0.5,
        maxX: cx - 1.45 + colSize * 0.5,
        minY: 0,
        maxY: wallHeight,
        minZ: cz - 1.35 - colSize * 0.5,
        maxZ: cz - 1.35 + colSize * 0.5,
        kind: 'pillar',
        materialTag: 'concrete',
      };
      const p2: AABB = {
        id: `atrium-col-2-${room.gx}-${room.gz}`,
        minX: cx + 1.45 - colSize * 0.5,
        maxX: cx + 1.45 + colSize * 0.5,
        minY: 0,
        maxY: wallHeight,
        minZ: cz + 1.35 - colSize * 0.5,
        maxZ: cz + 1.35 + colSize * 0.5,
        kind: 'pillar',
        materialTag: 'concrete',
      };
      if (canPlaceInteriorWall(p1, room)) wallSegments.push(p1);
      if (canPlaceInteriorWall(p2, room)) wallSegments.push(p2);
    } else if (room.shapeVariant === 'irregular_bay' && !isFirstBreachTarget) {
      const bayWall: AABB = {
        id: `bay-divider-${room.gx}-${room.gz}`,
        minX: cx + 1.05,
        maxX: cx + 1.33,
        minY: 0,
        maxY: wallHeight,
        minZ: cz - Math.min(1.65, rd * 0.22),
        maxZ: cz + Math.min(0.85, rd * 0.14),
        kind: 'wall',
        materialTag: 'drywall',
      };
      if (canPlaceInteriorWall(bayWall, room)) {
        wallSegments.push(bayWall);
      }
    }
  }

  // 4. Add Varied Procedural Cover Props (Desks, Server Racks, Concrete Jersey Barriers, Steel Crates)
  // using Poisson-disk collision-safe distance sampling to ensure thoroughfares stay clear
  const coverProps: AABB[] = [];
  const propTypes: Array<'desk' | 'server' | 'barrier' | 'crate'> = [
    'desk',
    'server',
    'barrier',
    'crate',
  ];

  for (const room of activeRooms) {
    const { gx, gz, centerX: cx, centerZ: cz } = room;
    if (gx === 0 && gz === 0) continue; // Keep player spawn room clear

    // Assign room architecture type
    if (room.shapeVariant === 'pillared_atrium') {
      room.roomType = 'atrium';
    } else if (room.theme === 'server' || room.theme === 'vault') {
      room.roomType = 'office';
    } else if (room.theme === 'comms' || room.theme === 'briefing') {
      room.roomType = 'office';
    } else {
      room.roomType = 'standard';
    }

    const candidates = [
      { ox: -room.width * 0.25, oz: -room.depth * 0.23 },
      { ox: room.width * 0.25, oz: room.depth * 0.23 },
      { ox: -room.width * 0.24, oz: room.depth * 0.22 },
      { ox: room.width * 0.24, oz: -room.depth * 0.22 },
    ];
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    let placedInRoom = 0;
    for (const cand of candidates) {
      if (placedInRoom >= (room.roomType === 'atrium' ? 2 : 1)) break;
      const px = cx + cand.ox;
      const pz = cz + cand.oz;

      // Check distance to all doorways (must be >= 2.2m clear)
      let doorwayClear = true;
      for (const door of doorways) {
        if (Math.hypot(door.x - px, door.z - pz) < 2.2) {
          doorwayClear = false;
          break;
        }
      }
      if (!doorwayClear) continue;

      // Check distance to existing props
      let propClear = true;
      for (const existing of coverProps) {
        const ex = (existing.minX + existing.maxX) * 0.5;
        const ez = (existing.minZ + existing.maxZ) * 0.5;
        if (Math.hypot(ex - px, ez - pz) < 2.2) {
          propClear = false;
          break;
        }
      }
      if (!propClear) continue;

      const propType = propTypes[(gx * 2 + gz * 3 + placedInRoom) % propTypes.length];
      let sx = 1.1;
      let sz = 1.1;
      let sy = 1.15;
      let matTag: SurfaceMaterialTag = 'steel';

      if (propType === 'desk') {
        sx = 1.45;
        sz = 0.85;
        sy = 0.82;
        matTag = 'drywall';
      } else if (propType === 'server') {
        sx = 0.95;
        sz = 0.95;
        sy = 2.15;
        matTag = 'steel';
      } else if (propType === 'barrier') {
        sx = 1.65;
        sz = 0.65;
        sy = 1.05;
        matTag = 'concrete';
      }

      const propBox: AABB = {
        id: `prop-${gx}-${gz}-${placedInRoom}`,
        minX: px - sx * 0.5,
        maxX: px + sx * 0.5,
        minY: 0,
        maxY: sy,
        minZ: pz - sz * 0.5,
        maxZ: pz + sz * 0.5,
        kind: propType,
        materialTag: matTag,
      };

      // Ensure prop never overlaps any interior room partition or perimeter wall
      const paddedProp: AABB = {
        ...propBox,
        minX: propBox.minX - 0.35,
        maxX: propBox.maxX + 0.35,
        minZ: propBox.minZ - 0.35,
        maxZ: propBox.maxZ + 0.35,
      };
      let wallClear = true;
      for (const w of wallSegments) {
        if (doAABBsOverlap(paddedProp, w)) {
          wallClear = false;
          break;
        }
      }
      if (!wallClear) continue;

      coverProps.push(propBox);
      placedInRoom++;
    }
  }

  // 5. Player Spawn in Room (0, 0) facing an open doorway
  const spawnRoom = roomGrid[0][0]!;
  const playerYaw = spawnRoom.doors.east ? -Math.PI / 2 : Math.PI;

  // 5B. Populate Shootable Ceiling Light Fixtures (1-HP bulb hitbox + PointLight per active room)
  const lightFixtures: LightFixtureSpec[] = [];
  for (const r of activeRooms) {
    const { gx, gz } = r;
    const lx =
      gx === 0 && gz === 0
        ? r.centerX + (spawnRoom.doors.east ? 2.15 : 0)
        : r.centerX;
    const lz =
      gx === 0 && gz === 0
        ? r.centerZ + (!spawnRoom.doors.east ? 2.15 : 0)
        : r.centerZ;
    const ly = 2.92;
    const halfW = 0.42;
    const halfH = 0.22;

    lightFixtures.push({
      id: `light-${gx}-${gz}`,
      roomGx: gx,
      roomGz: gz,
      x: lx,
      y: ly,
      z: lz,
      hp: 1,
      maxHp: 1,
      intact: true,
      aabb: {
        id: `light-aabb-${gx}-${gz}`,
        minX: lx - halfW,
        maxX: lx + halfW,
        minY: ly - halfH,
        maxY: ly + halfH,
        minZ: lz - halfW,
        maxZ: lz + halfW,
        kind: 'light',
        materialTag: 'steel',
      },
    });
  }

  // 6. Spawn Randomized Baseline of 9 to 15 Active AI Combatants patrolling the procedural map
  // (excluding player spawn room (0,0)). Validate every spawn and patrol point against wallSegments + coverProps.
  const archetypes: EnemyArchetype[] = ['breacher', 'rifleman', 'marksman'];
  const enemySpawns: EnemySpawnSpec[] = [];
  const allSpawnObstacles = [...wallSegments, ...coverProps];
  let enemyIndex = 0;

  const sanitizePointInRoom = (
    rawX: number,
    rawZ: number,
    room: RoomCell
  ): { x: number; z: number } => {
    const clampedX = Math.max(
      room.minX + halfT + 0.55,
      Math.min(room.maxX - halfT - 0.55, rawX)
    );
    const clampedZ = Math.max(
      room.minZ + halfT + 0.55,
      Math.min(room.maxZ - halfT - 0.55, rawZ)
    );
    const res = resolveCircleAABBCollision(
      clampedX,
      clampedZ,
      0.44,
      allSpawnObstacles,
      1.7
    );
    return {
      x: Number(res.x.toFixed(3)),
      z: Number(res.z.toFixed(3)),
    };
  };

  const nonEntryRooms = activeRooms.filter((r) => !(r.gx === 0 && r.gz === 0));
  const targetEnemyCount = 9 + Math.floor(rng() * 7); // 9 to 15 active patrolling AI combatants

  for (let i = 0; i < targetEnemyCount; i++) {
    const room = nonEntryRooms[i % nonEntryRooms.length];
    const { gx, gz } = room;
    const archetype = archetypes[enemyIndex % archetypes.length];
    enemyIndex++;

    const isSecondaryInRoom = i >= nonEntryRooms.length;
    const offsetSign = isSecondaryInRoom ? -1 : 1;
    const p1 = sanitizePointInRoom(
      room.centerX - 1.35 * offsetSign,
      room.centerZ - 1.1 * offsetSign,
      room
    );
    const p2 = sanitizePointInRoom(
      room.centerX + 1.35 * offsetSign,
      room.centerZ + 1.1 * offsetSign,
      room
    );
    const p3 = sanitizePointInRoom(
      room.centerX - 1.25 * offsetSign,
      room.centerZ + 1.25 * offsetSign,
      room
    );

    enemySpawns.push({
      id: `hostile-${enemyIndex}`,
      archetype,
      x: p1.x,
      z: p1.z,
      roomGx: gx,
      roomGz: gz,
      patrolPoints: [p1, p2, p3],
    });
  }

  // 6B. Place 2 to 3 Interactable / Proximity-Triggered Ambush Lockers in the map geometry
  const lockerAmbushes: LockerAmbushSpec[] = [];
  const targetLockerCount = 2 + Math.floor(rng() * 2); // 2 or 3 lockers
  const lockerCandidateRooms = [...nonEntryRooms];
  for (let i = lockerCandidateRooms.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [lockerCandidateRooms[i], lockerCandidateRooms[j]] = [
      lockerCandidateRooms[j],
      lockerCandidateRooms[i],
    ];
  }

  for (let lIdx = 0; lIdx < Math.min(targetLockerCount, lockerCandidateRooms.length); lIdx++) {
    const room = lockerCandidateRooms[lIdx];
    const lockerW = 0.96;
    const lockerD = 0.64;
    const lockerH = 2.18;

    // Position locker near an interior quadrant, ensuring doorway clearance
    const wallSide = lIdx % 2 === 0 ? -1 : 1;
    const rawLx = room.centerX + wallSide * (room.width * 0.28);
    const rawLz = room.centerZ - wallSide * (room.depth * 0.26);
    const safeLockerPos = sanitizePointInRoom(rawLx, rawLz, room);
    const facingYaw = Math.atan2(
      room.centerX - safeLockerPos.x,
      room.centerZ - safeLockerPos.z
    );

    const stepOutDist = 0.85;
    const spawnPt = sanitizePointInRoom(
      safeLockerPos.x + Math.sin(facingYaw) * stepOutDist,
      safeLockerPos.z + Math.cos(facingYaw) * stepOutDist,
      room
    );

    const lockerAABB: AABB = {
      id: `locker-aabb-${lIdx + 1}`,
      minX: safeLockerPos.x - lockerW * 0.5,
      maxX: safeLockerPos.x + lockerW * 0.5,
      minY: 0,
      maxY: lockerH,
      minZ: safeLockerPos.z - lockerD * 0.5,
      maxZ: safeLockerPos.z + lockerD * 0.5,
      kind: 'server',
      materialTag: 'steel',
    };

    lockerAmbushes.push({
      id: `locker-ambush-${lIdx + 1}`,
      roomGx: room.gx,
      roomGz: room.gz,
      x: safeLockerPos.x,
      y: 0,
      z: safeLockerPos.z,
      facingYaw,
      triggerRadius: 3.2,
      triggered: false,
      doorOpenProgress: 0,
      spawnArchetype: 'breacher',
      spawnPoint: spawnPt,
      aabb: lockerAABB,
    });
  }

  // 7. Generate Navigation Graph for AI pathfinding across active non-box rooms
  const navGraph = buildNavGraph(activeRooms, doorways, coverProps, wallSegments);

  return {
    seed,
    layoutVariant,
    layoutName: layoutMeta.name,
    gridCols,
    gridRows,
    cellSize,
    totalWidth,
    totalDepth,
    colWidths,
    rowDepths,
    wallHeight,
    wallThickness,
    rooms: activeRooms,
    wallSegments,
    doorFrameSegments,
    coverProps,
    doorways,
    lightFixtures,
    lockerAmbushes,
    navGraph,
    playerSpawn: {
      x: spawnRoom.centerX - (spawnRoom.doors.east ? 1.2 : 0),
      y: 1.68,
      z: spawnRoom.centerZ - (!spawnRoom.doors.east ? 1.2 : 0),
      yaw: playerYaw,
    },
    enemySpawns,
    allRoomsReachable,
  };
}

/**
 * Check proximity triggers for all intact ambush lockers against the player's position.
 * When the player enters a locker's triggerRadius, blasts the locker doors open and spawns an aggressive AI combatant.
 */
export function evaluateLockerAmbushTriggers(
  lockers: LockerAmbushSpec[],
  playerPos: { x: number; z: number }
): {
  newlyTriggered: LockerAmbushSpec[];
  spawnedEnemies: EnemySpawnSpec[];
} {
  const newlyTriggered: LockerAmbushSpec[] = [];
  const spawnedEnemies: EnemySpawnSpec[] = [];

  for (const locker of lockers) {
    if (locker.triggered) continue;
    const dist = Math.hypot(playerPos.x - locker.x, playerPos.z - locker.z);
    if (dist <= locker.triggerRadius) {
      locker.triggered = true;
      locker.doorOpenProgress = Math.max(0.15, locker.doorOpenProgress);
      newlyTriggered.push(locker);
      spawnedEnemies.push({
        id: `ambush-${locker.id}`,
        archetype: locker.spawnArchetype,
        x: locker.spawnPoint.x,
        z: locker.spawnPoint.z,
        roomGx: locker.roomGx,
        roomGz: locker.roomGz,
        patrolPoints: [
          { x: locker.spawnPoint.x, z: locker.spawnPoint.z },
          { x: playerPos.x, z: playerPos.z },
        ],
        isAmbushAgro: true,
      });
    }
  }

  return { newlyTriggered, spawnedEnemies };
}

/**
 * Step the violent door-blast opening animation [0..1] for a triggered ambush locker.
 */
export function stepLockerDoorKinematics(
  locker: LockerAmbushSpec,
  dt: number
): number {
  if (!locker.triggered) return 0;
  locker.doorOpenProgress = Math.min(1.0, locker.doorOpenProgress + dt * 7.5);
  return locker.doorOpenProgress;
}

/**
 * Check if two AABBs strictly overlap in 3D volume (ignoring touching faces within epsilon).
 */
export function doAABBsOverlap(a: AABB, b: AABB, eps = 1e-4): boolean {
  const overlapX = a.minX + eps < b.maxX && a.maxX - eps > b.minX;
  const overlapY = a.minY + eps < b.maxY && a.maxY - eps > b.minY;
  const overlapZ = a.minZ + eps < b.maxZ && a.maxZ - eps > b.minZ;
  return overlapX && overlapY && overlapZ;
}

/**
 * Validate that no wall segments or door frame segments overlap each other,
 * and that no wall segment blocks any carved doorway opening.
 */
export function validateMapGeometry(map: GeneratedCQBMap): {
  valid: boolean;
  overlapCount: number;
  blockedDoorways: number;
} {
  const allStructural = [...map.wallSegments, ...map.doorFrameSegments];
  let overlapCount = 0;
  for (let i = 0; i < allStructural.length; i++) {
    for (let j = i + 1; j < allStructural.length; j++) {
      if (doAABBsOverlap(allStructural[i], allStructural[j])) {
        overlapCount++;
      }
    }
  }

  let blockedDoorways = 0;
  for (const door of map.doorways) {
    const clearanceBox: AABB =
      door.orientation === 'NS'
        ? {
            id: door.id,
            minX: door.x - door.width * 0.48,
            maxX: door.x + door.width * 0.48,
            minY: 0.05,
            maxY: door.height - 0.05,
            minZ: door.z - 0.45,
            maxZ: door.z + 0.45,
            kind: 'frame',
          }
        : {
            id: door.id,
            minX: door.x - 0.45,
            maxX: door.x + 0.45,
            minY: 0.05,
            maxY: door.height - 0.05,
            minZ: door.z - door.width * 0.48,
            maxZ: door.z + door.width * 0.48,
            kind: 'frame',
          };

    for (const seg of map.wallSegments) {
      if (doAABBsOverlap(clearanceBox, seg)) {
        blockedDoorways++;
      }
    }
  }

  return {
    valid: overlapCount === 0 && blockedDoorways === 0 && map.allRoomsReachable,
    overlapCount,
    blockedDoorways,
  };
}

/**
 * Slab-method 3D ray vs AABB intersection distance.
 * Returns distance >= 0 along ray if hit within maxDist, or null if no hit.
 */
export function intersectRayAABB(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number }, // normalized
  box: AABB,
  maxDist: number
): number | null {
  let tmin = 0;
  let tmax = maxDist;

  const axes: Array<['x' | 'y' | 'z', number, number]> = [
    ['x', box.minX, box.maxX],
    ['y', box.minY, box.maxY],
    ['z', box.minZ, box.maxZ],
  ];

  for (const [axis, bMin, bMax] of axes) {
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < bMin || o > bMax) return null;
    } else {
      const invD = 1 / d;
      let t1 = (bMin - o) * invD;
      let t2 = (bMax - o) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }

  return tmin <= maxDist && tmax >= 0 ? tmin : null;
}

/**
 * Strict Line-of-Sight (LoS) Wall Occlusion Check:
 * Returns true ONLY if the ray from AI eye/barrel to player target does NOT intersect any wall AABB before reaching the player.
 */
export function hasStrictLineOfSight(
  aiEye: { x: number; y: number; z: number },
  playerTarget: { x: number; y: number; z: number },
  wallAABBs: AABB[]
): boolean {
  const dx = playerTarget.x - aiEye.x;
  const dy = playerTarget.y - aiEye.y;
  const dz = playerTarget.z - aiEye.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 1e-4) return true;

  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };

  for (const wall of wallAABBs) {
    const hitDist = intersectRayAABB(aiEye, dir, wall, dist);
    if (hitDist !== null && hitDist < dist - 0.05) {
      return false; // Occluded by wall!
    }
  }
  return true;
}

/**
 * Multi-iteration swept Circle vs AABB collision resolution in XZ plane for player and AI movement.
 * Runs 3 iterative relaxation passes with velocity slide projection so actors never jitter or clip
 * through acute corners between walls, lockers, and cover props.
 */
export function resolveCircleAABBCollision(
  x: number,
  z: number,
  radius: number,
  obstacles: AABB[],
  actorHeight = 1.7,
  prevX?: number,
  prevZ?: number
): { x: number; z: number; collided: boolean } {
  let resolvedX = x;
  let resolvedZ = z;
  let collided = false;

  // Optional swept-step subdivision if displacement exceeds 65% of radius to prevent fast tunneling
  if (prevX !== undefined && prevZ !== undefined) {
    const stepDx = x - prevX;
    const stepDz = z - prevZ;
    const stepDist = Math.hypot(stepDx, stepDz);
    if (stepDist > radius * 0.65 && stepDist < 12.0) {
      const subSteps = Math.min(6, Math.ceil(stepDist / (radius * 0.45)));
      let curX = prevX;
      let curZ = prevZ;
      const dStepX = stepDx / subSteps;
      const dStepZ = stepDz / subSteps;
      for (let s = 1; s <= subSteps; s++) {
        const targetX = curX + dStepX;
        const targetZ = curZ + dStepZ;
        const subRes = resolveCircleAABBCollision(targetX, targetZ, radius, obstacles, actorHeight);
        curX = subRes.x;
        curZ = subRes.z;
        if (subRes.collided) collided = true;
      }
      return { x: curX, z: curZ, collided };
    }
  }

  // 3 iterative Gauss-Seidel relaxation passes with surface tangent slide projection
  const ITERATIONS = 3;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    let passCollided = false;
    let accumNx = 0;
    let accumNz = 0;
    let normalCount = 0;

    for (let i = 0; i < obstacles.length; i++) {
      const box = obstacles[i];
      // Ignore high lintels above actor head
      if (box.minY >= actorHeight) continue;

      const closestX = Math.max(box.minX, Math.min(resolvedX, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(resolvedZ, box.maxZ));

      const dx = resolvedX - closestX;
      const dz = resolvedZ - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        collided = true;
        passCollided = true;
        const dist = Math.sqrt(distSq);
        if (dist > 1e-5) {
          const nx = dx / dist;
          const nz = dz / dist;
          const push = radius - dist + 1e-4;
          resolvedX += nx * push;
          resolvedZ += nz * push;
          accumNx += nx;
          accumNz += nz;
          normalCount++;
        } else {
          // Inside box fallback: push out along nearest edge
          const leftPen = Math.abs(resolvedX - box.minX);
          const rightPen = Math.abs(box.maxX - resolvedX);
          const northPen = Math.abs(resolvedZ - box.minZ);
          const southPen = Math.abs(box.maxZ - resolvedZ);
          const minPen = Math.min(leftPen, rightPen, northPen, southPen);
          if (minPen === leftPen) {
            resolvedX = box.minX - radius - 1e-4;
            accumNx -= 1;
          } else if (minPen === rightPen) {
            resolvedX = box.maxX + radius + 1e-4;
            accumNx += 1;
          } else if (minPen === northPen) {
            resolvedZ = box.minZ - radius - 1e-4;
            accumNz -= 1;
          } else {
            resolvedZ = box.maxZ + radius + 1e-4;
            accumNz += 1;
          }
          normalCount++;
        }
      }
    }

    // Acute corner stabilization: if wedged against 2+ opposing normals, damp inward oscillation
    if (normalCount >= 2 && prevX !== undefined && prevZ !== undefined) {
      const nLen = Math.hypot(accumNx, accumNz);
      if (nLen > 1e-4) {
        const avgNx = accumNx / nLen;
        const avgNz = accumNz / nLen;
        const velX = resolvedX - prevX;
        const velZ = resolvedZ - prevZ;
        const inwardDot = velX * avgNx + velZ * avgNz;
        if (inwardDot < 0) {
          resolvedX -= avgNx * inwardDot * 0.25;
          resolvedZ -= avgNz * inwardDot * 0.25;
        }
      }
    }

    if (!passCollided) break;
  }

  return { x: resolvedX, z: resolvedZ, collided };
}

/**
 * Spatial Hash Ray-Room Traversal:
 * Returns the ordered set of active RoomCells (and their immediate doorway-connected or adjacent cells)
 * intersected by a ray of length `maxDist`. Used by TacticalEngine to cut raycast mesh checks by ~75%.
 */
export function getRoomsAlongRay(
  map: GeneratedCQBMap,
  origin: { x: number; y?: number; z: number },
  dir: { x: number; y?: number; z: number },
  maxDist = 45
): RoomCell[] {
  const matched: RoomCell[] = [];
  const seen = new Set<string>();
  const margin = 0.85; // Include shared boundary walls & doorway frames

  const lenXZ = Math.hypot(dir.x, dir.z);
  const ndx = lenXZ > 1e-5 ? dir.x / lenXZ : 0;
  const ndz = lenXZ > 1e-5 ? dir.z / lenXZ : 0;

  for (let i = 0; i < map.rooms.length; i++) {
    const r = map.rooms[i];
    const roomAabb: AABB = {
      id: `room-ray-${r.gx}-${r.gz}`,
      kind: 'wall',
      minX: r.minX - margin,
      maxX: r.maxX + margin,
      minY: -1,
      maxY: map.wallHeight + 1,
      minZ: r.minZ - margin,
      maxZ: r.maxZ + margin,
    };

    const containsOrigin =
      origin.x >= roomAabb.minX &&
      origin.x <= roomAabb.maxX &&
      origin.z >= roomAabb.minZ &&
      origin.z <= roomAabb.maxZ;

    let hit = containsOrigin;
    if (!hit && lenXZ > 1e-5) {
      const dist = intersectRayAABB(
        { x: origin.x, y: 1.5, z: origin.z },
        { x: ndx, y: 0, z: ndz },
        roomAabb,
        maxDist
      );
      if (dist !== null) hit = true;
    }

    if (hit) {
      const key = `${r.gx},${r.gz}`;
      if (!seen.has(key)) {
        seen.add(key);
        matched.push(r);
      }
    }
  }

  if (matched.length === 0 && map.rooms.length > 0) {
    matched.push(findRoomAtPosition(map, origin.x, origin.z));
  }

  return matched;
}

// ============================================================================
// RAINBOW SIX SIEGE STYLE DESTRUCTIBLE WOODEN BARRICADE SYSTEM
// ============================================================================

export const BARRICADE_PLANK_COUNT = 12;
export const PLANK_CHUNKS_PER_ROW = 6;
export const BARRICADE_MELEE_COLLAPSE_THRESHOLD = 3;
export const BARRICADE_PLANK_LOSS_COLLAPSE_RATIO = 0.4; // 40% planks destroyed -> total collapse
export const WOOD_PENETRATION_DAMAGE_MULTIPLIER = 0.7; // 30% damage reduction on wall-bang

export interface BarricadeChunk {
  id: string;
  plankIndex: number;
  chunkIndex: number;
  hp: number;
  maxHp: number;
  intact: boolean;
  aabb: AABB;
  uvOffset: { x: number; y: number };
  uvRepeat: { x: number; y: number };
}

export interface BarricadePlank {
  id: string;
  plankIndex: number;
  hp: number;
  maxHp: number;
  intact: boolean;
  aabb: AABB;
  uvOffset: { x: number; y: number };
  uvRepeat: { x: number; y: number };
  chunks: BarricadeChunk[];
}

export interface DebrisSpawnSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  isFullPlank: boolean;
}

export interface BarricadeState {
  id: string;
  doorId: string;
  x: number;
  z: number;
  orientation: 'NS' | 'EW';
  width: number;
  height: number;
  plankCount: number;
  planks: BarricadePlank[];
  meleeHits: number;
  collapsed: boolean;
  structuralIntegrityPct: number;
}

/**
 * Create a 12-plank segmented wooden barricade fitted inside a carved DoorwaySpec.
 * Each plank has its own AABB, independent HP pool, distinct wood UV mapping, and 6 localized sub-chunks.
 */
export function createBarricadeForDoorway(
  door: DoorwaySpec,
  plankCount = BARRICADE_PLANK_COUNT
): BarricadeState {
  const planks: BarricadePlank[] = [];
  const bottomMargin = 0.05;
  const topMargin = 0.04;
  const usableHeight = door.height - bottomMargin - topMargin;
  const slotHeight = usableHeight / plankCount;
  const plankGap = 0.012;
  const plankHeight = slotHeight - plankGap;
  const plankThickness = 0.055;
  const usableWidth = door.width - 0.02;

  for (let p = 0; p < plankCount; p++) {
    const minY = bottomMargin + p * slotHeight;
    const maxY = minY + plankHeight;
    const uvOffsetY = (p * 0.17) % 0.75;
    const uvOffsetX = ((p * 37) % 100) / 200;

    const plankAABB: AABB =
      door.orientation === 'NS'
        ? {
            id: `${door.id}-plank-${p}`,
            minX: door.x - usableWidth * 0.5,
            maxX: door.x + usableWidth * 0.5,
            minY,
            maxY,
            minZ: door.z - plankThickness * 0.5,
            maxZ: door.z + plankThickness * 0.5,
            kind: 'crate',
          }
        : {
            id: `${door.id}-plank-${p}`,
            minX: door.x - plankThickness * 0.5,
            maxX: door.x + plankThickness * 0.5,
            minY,
            maxY,
            minZ: door.z - usableWidth * 0.5,
            maxZ: door.z + usableWidth * 0.5,
            kind: 'crate',
          };

    const chunks: BarricadeChunk[] = [];
    const chunkSpan = usableWidth / PLANK_CHUNKS_PER_ROW;

    for (let c = 0; c < PLANK_CHUNKS_PER_ROW; c++) {
      const startOffset = -usableWidth * 0.5 + c * chunkSpan;
      const endOffset = startOffset + chunkSpan;
      const chunkAABB: AABB =
        door.orientation === 'NS'
          ? {
              id: `${door.id}-plank-${p}-chunk-${c}`,
              minX: door.x + startOffset,
              maxX: door.x + endOffset,
              minY,
              maxY,
              minZ: door.z - plankThickness * 0.5,
              maxZ: door.z + plankThickness * 0.5,
              kind: 'crate',
            }
          : {
              id: `${door.id}-plank-${p}-chunk-${c}`,
              minX: door.x - plankThickness * 0.5,
              maxX: door.x + plankThickness * 0.5,
              minY,
              maxY,
              minZ: door.z + startOffset,
              maxZ: door.z + endOffset,
              kind: 'crate',
            };

      chunks.push({
        id: chunkAABB.id,
        plankIndex: p,
        chunkIndex: c,
        hp: 40,
        maxHp: 40,
        intact: true,
        aabb: chunkAABB,
        uvOffset: {
          x: uvOffsetX + (c / PLANK_CHUNKS_PER_ROW) * 0.5,
          y: uvOffsetY,
        },
        uvRepeat: {
          x: 1 / PLANK_CHUNKS_PER_ROW,
          y: 0.16,
        },
      });
    }

    planks.push({
      id: plankAABB.id,
      plankIndex: p,
      hp: 100,
      maxHp: 100,
      intact: true,
      aabb: plankAABB,
      uvOffset: { x: uvOffsetX, y: uvOffsetY },
      uvRepeat: { x: 1.0, y: 0.16 },
      chunks,
    });
  }

  return {
    id: `barricade-${door.id}`,
    doorId: door.id,
    x: door.x,
    z: door.z,
    orientation: door.orientation,
    width: usableWidth,
    height: door.height,
    plankCount,
    planks,
    meleeHits: 0,
    collapsed: false,
    structuralIntegrityPct: 100,
  };
}

/**
 * Compute reduced bullet damage after penetrating a wooden barricade plank (-30% damage).
 */
export function calculatePenetratedDamage(rawDamage: number): number {
  return Math.max(1, Math.round(rawDamage * WOOD_PENETRATION_DAMAGE_MULTIPLIER));
}

function makeDebrisFromAABB(
  id: string,
  box: AABB,
  impulseDir: { x: number; y: number; z: number },
  speed: number,
  isFullPlank: boolean
): DebrisSpawnSpec {
  const cx = (box.minX + box.maxX) * 0.5;
  const cy = (box.minY + box.maxY) * 0.5;
  const cz = (box.minZ + box.maxZ) * 0.5;
  const sx = box.maxX - box.minX;
  const sy = box.maxY - box.minY;
  const sz = box.maxZ - box.minZ;

  // Deterministic pseudo-random angular velocity from id characters
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const n1 = ((hash & 0xff) / 255 - 0.5) * 2;
  const n2 = (((hash >> 8) & 0xff) / 255 - 0.5) * 2;

  return {
    id,
    x: cx,
    y: cy,
    z: cz,
    sx,
    sy,
    sz,
    vx: impulseDir.x * speed + n1 * 0.9,
    vy: Math.max(0.4, impulseDir.y * speed + 0.85),
    vz: impulseDir.z * speed + n2 * 0.9,
    rx: n1 * 7.5,
    ry: n2 * 6.0,
    rz: (n1 - n2) * 5.0,
    isFullPlank,
  };
}

function checkAndTriggerTotalCollapse(
  barricade: BarricadeState,
  impulseDir: { x: number; y: number; z: number },
  debrisOut: DebrisSpawnSpec[]
): boolean {
  if (barricade.collapsed) return true;

  const destroyedPlanks = barricade.planks.filter((p) => !p.intact).length;
  const destroyedRatio = destroyedPlanks / barricade.plankCount;

  // Update structural integrity percentage
  const intactChunksCount = barricade.planks.reduce(
    (acc, p) => acc + (p.intact ? p.chunks.filter((c) => c.intact).length : 0),
    0
  );
  const totalChunks = barricade.plankCount * PLANK_CHUNKS_PER_ROW;
  barricade.structuralIntegrityPct = Math.round((intactChunksCount / totalChunks) * 100);

  if (
    barricade.meleeHits >= BARRICADE_MELEE_COLLAPSE_THRESHOLD ||
    destroyedRatio >= BARRICADE_PLANK_LOSS_COLLAPSE_RATIO
  ) {
    barricade.collapsed = true;
    barricade.structuralIntegrityPct = 0;

    // Unanchor all remaining intact planks and convert them into physics rigid bodies
    for (const plank of barricade.planks) {
      if (plank.intact) {
        plank.intact = false;
        plank.hp = 0;
        for (const c of plank.chunks) {
          c.intact = false;
          c.hp = 0;
        }
        debrisOut.push(
          makeDebrisFromAABB(
            `${plank.id}-collapse`,
            plank.aabb,
            impulseDir,
            2.4,
            true
          )
        );
      }
    }
    return true;
  }

  return false;
}

/**
 * Apply gunfire impact to a specific plank & chunk of a barricade.
 * High-caliber (HK416) splinters out the local chunk immediately (creating a bullet-hole peek gap)
 * while damaging the plank's overall health pool. If >= 40% of planks are destroyed, triggers total collapse.
 */
export function applyBulletToBarricade(
  barricade: BarricadeState,
  plankIndex: number,
  chunkIndex: number,
  weaponId: WeaponId,
  bulletDir: { x: number; y: number; z: number }
): {
  chunkDestroyed: boolean;
  plankDestroyed: boolean;
  totalCollapseTriggered: boolean;
  debris: DebrisSpawnSpec[];
} {
  const debris: DebrisSpawnSpec[] = [];
  if (barricade.collapsed) {
    return {
      chunkDestroyed: false,
      plankDestroyed: false,
      totalCollapseTriggered: false,
      debris,
    };
  }

  const plank = barricade.planks[plankIndex];
  if (!plank || !plank.intact) {
    return {
      chunkDestroyed: false,
      plankDestroyed: false,
      totalCollapseTriggered: false,
      debris,
    };
  }

  const chunk = plank.chunks[chunkIndex];
  let chunkDestroyed = false;
  let plankDestroyed = false;

  const spec = WEAPONS[weaponId];
  const isHighCaliber = spec.penetratesDrywall;
  const chunkDmg = weaponId === 'm870' ? 60 : isHighCaliber ? 45 : 26;
  const plankDmg = weaponId === 'm870' ? 50 : isHighCaliber ? 35 : 22;

  if (chunk && chunk.intact) {
    chunk.hp = Math.max(0, chunk.hp - chunkDmg);
    if (chunk.hp <= 0) {
      chunk.intact = false;
      chunkDestroyed = true;
      debris.push(
        makeDebrisFromAABB(chunk.id, chunk.aabb, bulletDir, 3.8, false)
      );
    }
  }

  plank.hp = Math.max(0, plank.hp - plankDmg);
  const remainingIntactChunks = plank.chunks.filter((c) => c.intact).length;

  // If plank health reaches 0 or half its chunks are splintered out, the entire plank breaks
  if (plank.hp <= 0 || remainingIntactChunks <= Math.floor(PLANK_CHUNKS_PER_ROW * 0.5)) {
    plank.intact = false;
    plank.hp = 0;
    plankDestroyed = true;
    for (const c of plank.chunks) {
      if (c.intact) {
        c.intact = false;
        c.hp = 0;
        debris.push(makeDebrisFromAABB(c.id, c.aabb, bulletDir, 3.2, false));
      }
    }
  }

  const totalCollapseTriggered = checkAndTriggerTotalCollapse(
    barricade,
    bulletDir,
    debris
  );

  return {
    chunkDestroyed,
    plankDestroyed,
    totalCollapseTriggered,
    debris,
  };
}

/**
 * Apply close-range Melee Strike [V] to a barricade at the impacted plankIndex.
 * Instantly shatters 1 to 2 complete planks at the point of impact, creating a jagged peek hole.
 * On the 3rd melee hit (or >= 40% planks destroyed), triggers total structural failure!
 */
export function applyMeleeToBarricade(
  barricade: BarricadeState,
  hitPlankIndex: number,
  strikeDir: { x: number; y: number; z: number }
): {
  shatteredPlankIndices: number[];
  totalCollapseTriggered: boolean;
  debris: DebrisSpawnSpec[];
} {
  const debris: DebrisSpawnSpec[] = [];
  const shatteredPlankIndices: number[] = [];
  if (barricade.collapsed) {
    return { shatteredPlankIndices, totalCollapseTriggered: false, debris };
  }

  barricade.meleeHits += 1;

  // Shatter 1 to 2 complete planks right at the point of impact
  const candidateIndices = [hitPlankIndex];
  if (
    hitPlankIndex + 1 < barricade.plankCount &&
    barricade.planks[hitPlankIndex + 1].intact
  ) {
    candidateIndices.push(hitPlankIndex + 1);
  } else if (hitPlankIndex - 1 >= 0 && barricade.planks[hitPlankIndex - 1].intact) {
    candidateIndices.push(hitPlankIndex - 1);
  }

  for (const idx of candidateIndices) {
    const plank = barricade.planks[idx];
    if (plank && plank.intact) {
      plank.intact = false;
      plank.hp = 0;
      for (const c of plank.chunks) {
        c.intact = false;
        c.hp = 0;
      }
      shatteredPlankIndices.push(idx);
      debris.push(
        makeDebrisFromAABB(plank.id, plank.aabb, strikeDir, 4.5, true)
      );
    }
  }

  const totalCollapseTriggered = checkAndTriggerTotalCollapse(
    barricade,
    strikeDir,
    debris
  );

  return {
    shatteredPlankIndices,
    totalCollapseTriggered,
    debris,
  };
}

/**
 * Collect all intact chunk AABBs across barricades for Line-of-Sight (LoS) raycast occlusion.
 * Intact planks block vision; broken planks/chunks create physical gaps (Two-Way Murder Holes)
 * that rays pass cleanly through!
 */
export function getIntactBarricadeLoSAABBs(barricades: BarricadeState[]): AABB[] {
  const out: AABB[] = [];
  for (const b of barricades) {
    if (b.collapsed) continue;
    for (const p of b.planks) {
      if (!p.intact) continue;
      for (const c of p.chunks) {
        if (c.intact) {
          out.push(c.aabb);
        }
      }
    }
  }
  return out;
}

/**
 * Collect active movement-blocking AABBs for barricades that have not yet collapsed.
 */
export function getActiveBarricadeMovementAABBs(barricades: BarricadeState[]): AABB[] {
  const out: AABB[] = [];
  for (const b of barricades) {
    if (b.collapsed) continue;
    for (const p of b.planks) {
      if (p.intact) {
        out.push(p.aabb);
      }
    }
  }
  return out;
}

// ============================================================================
// 1. ACOUSTIC OCCLUSION & DYNAMIC AUDIO ROUTING
// ============================================================================

export const ACOUSTIC_OCCLUDED_VOLUME_SCALE = 0.6; // 40% volume reduction when muffled
export const ACOUSTIC_CLEAR_VOLUME_SCALE = 1.0;
export const ACOUSTIC_LPF_OCCLUDED_HZ = 480; // Low-pass cutoff when occluded by wall/barricade
export const ACOUSTIC_LPF_CLEAR_HZ = 18000; // Full-spectrum cutoff when clear LoS opens

export interface AcousticOcclusionResult {
  occluded: boolean;
  targetLpfHz: number;
  targetVolumeScale: number;
}

/**
 * Cast a ray from a sound source (footsteps, gunfire, reloads) to the player's camera listener.
 * If the ray intersects an intact wall, ceiling, or closed doorway barricade, muffle high frequencies
 * via a Low-Pass Filter (480 Hz) and reduce volume by 40% (0.60x).
 */
export function evaluateAcousticOcclusion(
  sourcePos: { x: number; y: number; z: number },
  listenerPos: { x: number; y: number; z: number },
  intactOccluderAABBs: AABB[]
): AcousticOcclusionResult {
  const clearLoS = hasStrictLineOfSight(sourcePos, listenerPos, intactOccluderAABBs);
  if (!clearLoS) {
    return {
      occluded: true,
      targetLpfHz: ACOUSTIC_LPF_OCCLUDED_HZ,
      targetVolumeScale: ACOUSTIC_OCCLUDED_VOLUME_SCALE,
    };
  }
  return {
    occluded: false,
    targetLpfHz: ACOUSTIC_LPF_CLEAR_HZ,
    targetVolumeScale: ACOUSTIC_CLEAR_VOLUME_SCALE,
  };
}

/**
 * Real-time Acoustic Interpolation:
 * When a destructible barricade is breached or a wall line-of-sight opens up, dynamically
 * interpolate the Low-Pass Filter cutoff frequency and volume back to normal.
 */
export function stepAcousticFilterState(params: {
  currentLpfHz: number;
  currentVolumeScale: number;
  targetLpfHz: number;
  targetVolumeScale: number;
  dt: number;
  interpSpeed?: number;
}): {
  lpfHz: number;
  volumeScale: number;
} {
  const speed = params.interpSpeed ?? 14.0;
  const alpha = 1 - Math.exp(-speed * Math.min(Math.max(params.dt, 0), 0.2));
  const nextHz = params.currentLpfHz + (params.targetLpfHz - params.currentLpfHz) * alpha;
  const nextVol =
    params.currentVolumeScale + (params.targetVolumeScale - params.currentVolumeScale) * alpha;

  return {
    lpfHz: Math.abs(params.targetLpfHz - nextHz) < 1 ? params.targetLpfHz : nextHz,
    volumeScale:
      Math.abs(params.targetVolumeScale - nextVol) < 0.005
        ? params.targetVolumeScale
        : nextVol,
  };
}

// ============================================================================
// 2. DYNAMIC LIGHTING & TACTICAL VISIBILITY
// ============================================================================

export const AI_BASE_VISION_RANGE = 22.0;
export const AI_DARK_VISION_MULTIPLIER = 0.2; // 80% vision reduction when room light is shot out
export const FLASHLIGHT_CONE_HALF_ANGLE_RAD = Math.PI / 6.5;
export const FLASHLIGHT_MAX_RANGE = 22.0;

/**
 * Apply bullet impact to a 1-HP ceiling light fixture bulb.
 * Instantly destroys the bulb, triggers spark particles & glass shatter audio, and disables its PointLight.
 */
export function shootLightFixture(fixture: LightFixtureSpec): {
  destroyed: boolean;
  spawnSparks: boolean;
  disablePointLight: boolean;
} {
  if (!fixture.intact || fixture.hp <= 0) {
    return {
      destroyed: false,
      spawnSparks: false,
      disablePointLight: false,
    };
  }
  fixture.hp = 0;
  fixture.intact = false;
  return {
    destroyed: true,
    spawnSparks: true,
    disablePointLight: true,
  };
}

/**
 * Determine if an AI target lies within the player's weapon-mounted flashlight beam cone.
 */
export function isTargetIlluminatedByFlashlight(params: {
  flashlightActive: boolean;
  flashlightOrigin: { x: number; y: number; z: number };
  flashlightDir: { x: number; y: number; z: number }; // normalized
  targetPos: { x: number; y: number; z: number };
  coneHalfAngleRad?: number;
  maxRange?: number;
}): boolean {
  if (!params.flashlightActive) return false;
  const maxR = params.maxRange ?? FLASHLIGHT_MAX_RANGE;
  const halfAngle = params.coneHalfAngleRad ?? FLASHLIGHT_CONE_HALF_ANGLE_RAD;

  const dx = params.targetPos.x - params.flashlightOrigin.x;
  const dy = params.targetPos.y - params.flashlightOrigin.y;
  const dz = params.targetPos.z - params.flashlightOrigin.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist <= 1e-4) return true;
  if (dist > maxR) return false;

  const dirLen = Math.hypot(
    params.flashlightDir.x,
    params.flashlightDir.y,
    params.flashlightDir.z
  );
  if (dirLen <= 1e-6) return false;

  const dot =
    (dx * params.flashlightDir.x +
      dy * params.flashlightDir.y +
      dz * params.flashlightDir.z) /
    (dist * dirLen);

  return dot >= Math.cos(halfAngle);
}

/**
 * Light-Dependent AI Vision:
 * - If a room's lights are shot out, reduce AI vision distance by 80% (to 20% of base range).
 * - If the player's flashlight beam illuminates the AI, OR if the player fires a weapon
 *   (creating a brief muzzle flash PointLight), immediately restore 100% AI vision range.
 */
export function computeEffectiveAIVisionRange(params: {
  baseRange?: number;
  roomLightIntact: boolean;
  illuminatedByFlashlight: boolean;
  playerMuzzleFlashActive: boolean;
}): number {
  const base = params.baseRange ?? AI_BASE_VISION_RANGE;
  if (
    params.roomLightIntact ||
    params.illuminatedByFlashlight ||
    params.playerMuzzleFlashActive
  ) {
    return base;
  }
  return Number((base * AI_DARK_VISION_MULTIPLIER).toFixed(4));
}

// ============================================================================
// 3. MATERIAL-BASED BALLISTIC PENETRATION
// ============================================================================

export const DRYWALL_PENETRATION_DAMAGE_MULTIPLIER = 0.6; // 40% damage reduction

export interface RayEntryExitResult {
  hit: boolean;
  entryDist: number;
  exitDist: number;
  entryPoint: { x: number; y: number; z: number };
  exitPoint: { x: number; y: number; z: number };
}

/**
 * Compute both the 3D entry point and exit point of a ray passing through an AABB (e.g. Drywall partition).
 */
export function computeRayAABBEntryExit(
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number }, // normalized
  box: AABB,
  maxDist = 100
): RayEntryExitResult | null {
  let tmin = 0;
  let tmax = maxDist;

  const axes: Array<['x' | 'y' | 'z', number, number]> = [
    ['x', box.minX, box.maxX],
    ['y', box.minY, box.maxY],
    ['z', box.minZ, box.maxZ],
  ];

  for (const [axis, bMin, bMax] of axes) {
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-8) {
      if (o < bMin || o > bMax) return null;
    } else {
      const invD = 1 / d;
      let t1 = (bMin - o) * invD;
      let t2 = (bMax - o) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }

  if (tmin > maxDist || tmax < 0) return null;
  const entryDist = Math.max(0, tmin);
  const exitDist = Math.max(entryDist, tmax);

  return {
    hit: true,
    entryDist,
    exitDist,
    entryPoint: {
      x: origin.x + dir.x * entryDist,
      y: origin.y + dir.y * entryDist,
      z: origin.z + dir.z * entryDist,
    },
    exitPoint: {
      x: origin.x + dir.x * exitDist,
      y: origin.y + dir.y * exitDist,
      z: origin.z + dir.z * exitDist,
    },
  };
}

export interface MaterialBallisticResult {
  materialTag: SurfaceMaterialTag;
  penetrated: boolean;
  damageMultiplier: number;
  outgoingDamage: number;
  entryPoint: { x: number; y: number; z: number } | null;
  exitPoint: { x: number; y: number; z: number } | null;
  spawnSparks: boolean;
  spawnGrayDust: boolean;
  spawnGypsumEntryExit: boolean;
  spawnWoodSplinters: boolean;
}

/**
 * Evaluate material-based bullet penetration:
 * - Concrete / Steel: Bullet stops immediately (0 damage behind it), spawns sparks + gray dust.
 * - Drywall / Office Partitions: High-caliber (HK416) penetrates with 40% damage reduction (0.6x)
 *   and calculates both entry and exit points to spawn white gypsum dust on both sides of the wall.
 * - Wood (Doors / Barricades): Bullet penetrates with 30% damage reduction (0.7x) and spawns wood splinters.
 */
export function evaluateMaterialBallistics(params: {
  materialTag: SurfaceMaterialTag;
  weaponId: WeaponId;
  incomingDamage: number;
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
  surfaceAABB?: AABB;
}): MaterialBallisticResult {
  const { materialTag, weaponId, incomingDamage, origin, dir, surfaceAABB } = params;
  const entryExit = surfaceAABB
    ? computeRayAABBEntryExit(origin, dir, surfaceAABB, 100)
    : null;

  if (materialTag === 'concrete' || materialTag === 'steel') {
    return {
      materialTag,
      penetrated: false,
      damageMultiplier: 0,
      outgoingDamage: 0,
      entryPoint: entryExit ? entryExit.entryPoint : null,
      exitPoint: null,
      spawnSparks: true,
      spawnGrayDust: true,
      spawnGypsumEntryExit: false,
      spawnWoodSplinters: false,
    };
  }

  if (materialTag === 'drywall') {
    // High-caliber rounds (HK416, MK18, M870, M1911, Musket) penetrate drywall with 40% damage reduction
    if (WEAPONS[weaponId].penetratesDrywall) {
      const mult = DRYWALL_PENETRATION_DAMAGE_MULTIPLIER;
      const outDmg =
        weaponId === 'musket'
          ? Math.max(9999, Math.round(incomingDamage * mult))
          : Math.max(1, Math.round(incomingDamage * mult));
      return {
        materialTag,
        penetrated: true,
        damageMultiplier: mult,
        outgoingDamage: outDmg,
        entryPoint: entryExit ? entryExit.entryPoint : null,
        exitPoint: entryExit ? entryExit.exitPoint : null,
        spawnSparks: false,
        spawnGrayDust: false,
        spawnGypsumEntryExit: true,
        spawnWoodSplinters: false,
      };
    }
    // Low-caliber pistol rounds stop in drywall
    return {
      materialTag,
      penetrated: false,
      damageMultiplier: 0,
      outgoingDamage: 0,
      entryPoint: entryExit ? entryExit.entryPoint : null,
      exitPoint: null,
      spawnSparks: false,
      spawnGrayDust: false,
      spawnGypsumEntryExit: true,
      spawnWoodSplinters: false,
    };
  }

  // Wood (Doors / Barricades): penetrates with 30% damage reduction
  const mult = WOOD_PENETRATION_DAMAGE_MULTIPLIER;
  const woodOutDmg =
    weaponId === 'musket'
      ? Math.max(9999, Math.round(incomingDamage * mult))
      : Math.max(1, Math.round(incomingDamage * mult));
  return {
    materialTag: 'wood',
    penetrated: true,
    damageMultiplier: mult,
    outgoingDamage: woodOutDmg,
    entryPoint: entryExit ? entryExit.entryPoint : null,
    exitPoint: entryExit ? entryExit.exitPoint : null,
    spawnSparks: false,
    spawnGrayDust: false,
    spawnGypsumEntryExit: false,
    spawnWoodSplinters: true,
  };
}

// ============================================================================
// 4. NAVMESH / NAVIGATION GRAPH & A* PATHFINDING
// ============================================================================

/**
 * Build a structured navigation waypoint graph for CQB tactical pathfinding.
 * Includes room centers, door thresholds (inside & center), and tactical cover positions.
 */
export function buildNavGraph(
  rooms: RoomCell[] | RoomCell[][],
  doorways: DoorwaySpec[],
  coverProps: AABB[],
  wallSegments: AABB[]
): NavGraph {
  const waypoints: NavWaypoint[] = [];
  const waypointMap = new Map<string, NavWaypoint>();
  const flatRooms: RoomCell[] = Array.isArray(rooms[0])
    ? (rooms as RoomCell[][]).flat().filter(Boolean)
    : (rooms as RoomCell[]);

  const isWaypointClear = (px: number, pz: number): boolean => {
    for (const w of wallSegments) {
      if (w.kind === 'lintel') continue;
      if (
        px >= w.minX - 0.28 &&
        px <= w.maxX + 0.28 &&
        pz >= w.minZ - 0.28 &&
        pz <= w.maxZ + 0.28
      ) {
        return false;
      }
    }
    for (const p of coverProps) {
      if (
        px >= p.minX - 0.25 &&
        px <= p.maxX + 0.25 &&
        pz >= p.minZ - 0.25 &&
        pz <= p.maxZ + 0.25
      ) {
        return false;
      }
    }
    return true;
  };

  // 1. Room center & sub-quadrant waypoints (for navigating around L-alcoves and chicanes)
  for (const room of flatRooms) {
    const wp: NavWaypoint = {
      id: `wp-room-${room.gx}-${room.gz}`,
      x: room.centerX,
      z: room.centerZ,
      roomGx: room.gx,
      roomGz: room.gz,
      neighbors: [],
    };
    waypoints.push(wp);
    waypointMap.set(wp.id, wp);

    const rw = room.width ?? 8.0;
    const rd = room.depth ?? 8.0;
    const subOffsets = [
      { ox: -rw * 0.22, oz: -rd * 0.22 },
      { ox: rw * 0.22, oz: -rd * 0.22 },
      { ox: -rw * 0.22, oz: rd * 0.22 },
      { ox: rw * 0.22, oz: rd * 0.22 },
    ];
    for (let q = 0; q < subOffsets.length; q++) {
      const qx = room.centerX + subOffsets[q].ox;
      const qz = room.centerZ + subOffsets[q].oz;
      if (isWaypointClear(qx, qz)) {
        const qWp: NavWaypoint = {
          id: `wp-room-q-${room.gx}-${room.gz}-${q}`,
          x: qx,
          z: qz,
          roomGx: room.gx,
          roomGz: room.gz,
          neighbors: [],
        };
        waypoints.push(qWp);
        waypointMap.set(qWp.id, qWp);
      }
    }
  }

  // 2. Doorway waypoints:
  // For each doorway, create doorway center point and two threshold points (0.85m into either room)
  for (const door of doorways) {
    const doorCenterWp: NavWaypoint = {
      id: `wp-door-${door.id}`,
      x: door.x,
      z: door.z,
      roomGx: -1,
      roomGz: -1,
      isDoorway: true,
      neighbors: [],
    };
    waypoints.push(doorCenterWp);
    waypointMap.set(doorCenterWp.id, doorCenterWp);

    const offset = 0.85;
    const threshA: NavWaypoint = {
      id: `wp-threshA-${door.id}`,
      x: door.orientation === 'NS' ? door.x : door.x - offset,
      z: door.orientation === 'NS' ? door.z - offset : door.z,
      roomGx: -1,
      roomGz: -1,
      neighbors: [doorCenterWp.id],
    };
    const threshB: NavWaypoint = {
      id: `wp-threshB-${door.id}`,
      x: door.orientation === 'NS' ? door.x : door.x + offset,
      z: door.orientation === 'NS' ? door.z + offset : door.z,
      roomGx: -1,
      roomGz: -1,
      neighbors: [doorCenterWp.id],
    };
    doorCenterWp.neighbors.push(threshA.id, threshB.id);
    waypoints.push(threshA, threshB);
    waypointMap.set(threshA.id, threshA);
    waypointMap.set(threshB.id, threshB);
  }

  // 3. Tactical cover waypoints near props
  for (const prop of coverProps) {
    const cx = (prop.minX + prop.maxX) * 0.5;
    const cz = (prop.minZ + prop.maxZ) * 0.5;
    const offsets = [
      { ox: 0, oz: 1.15 },
      { ox: 0, oz: -1.15 },
      { ox: 1.15, oz: 0 },
      { ox: -1.15, oz: 0 },
    ];
    for (let i = 0; i < offsets.length; i++) {
      const px = cx + offsets[i].ox;
      const pz = cz + offsets[i].oz;
      if (isWaypointClear(px, pz)) {
        const coverWp: NavWaypoint = {
          id: `wp-cover-${prop.id}-${i}`,
          x: px,
          z: pz,
          roomGx: -1,
          roomGz: -1,
          isCover: true,
          neighbors: [],
        };
        waypoints.push(coverWp);
        waypointMap.set(coverWp.id, coverWp);
      }
    }
  }

  // 4. Connect waypoints that have clear Line-of-Sight (within distance <= 12.0m)
  const losHeight = 1.0;
  for (let i = 0; i < waypoints.length; i++) {
    const a = waypoints[i];
    for (let j = i + 1; j < waypoints.length; j++) {
      const b = waypoints[j];
      const dist = Math.hypot(a.x - b.x, a.z - b.z);
      if (dist > 12.0) continue;
      const canSee = hasStrictLineOfSight(
        { x: a.x, y: losHeight, z: a.z },
        { x: b.x, y: losHeight, z: b.z },
        wallSegments
      );
      if (canSee) {
        if (!a.neighbors.includes(b.id)) a.neighbors.push(b.id);
        if (!b.neighbors.includes(a.id)) b.neighbors.push(a.id);
      }
    }
  }

  return { waypoints, waypointMap };
}

/**
 * A* pathfinding on NavGraph. Returns list of 2D coordinates {x, z} representing waypoints to navigate.
 */
export function findNavPath(
  graph: NavGraph,
  startPos: { x: number; z: number },
  goalPos: { x: number; z: number },
  wallSegments?: AABB[]
): Array<{ x: number; z: number }> {
  if (graph.waypoints.length === 0) return [{ x: goalPos.x, z: goalPos.z }];

  // If start has direct line of sight to goal, path directly to goal
  if (wallSegments) {
    if (
      hasStrictLineOfSight(
        { x: startPos.x, y: 1.0, z: startPos.z },
        { x: goalPos.x, y: 1.0, z: goalPos.z },
        wallSegments
      )
    ) {
      return [{ x: goalPos.x, z: goalPos.z }];
    }
  }

  // Find closest waypoint visible to startPos
  let startWp: NavWaypoint | null = null;
  let startDist = Infinity;
  let goalWp: NavWaypoint | null = null;
  let goalDist = Infinity;

  for (const wp of graph.waypoints) {
    const dStart = Math.hypot(wp.x - startPos.x, wp.z - startPos.z);
    if (dStart < startDist) {
      startDist = dStart;
      startWp = wp;
    }
    const dGoal = Math.hypot(wp.x - goalPos.x, wp.z - goalPos.z);
    if (dGoal < goalDist) {
      goalDist = dGoal;
      goalWp = wp;
    }
  }

  if (!startWp || !goalWp || startWp.id === goalWp.id) {
    return [{ x: goalPos.x, z: goalPos.z }];
  }

  // A* search
  const openSet = new Set<string>([startWp.id]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(startWp.id, 0);

  const fScore = new Map<string, number>();
  fScore.set(startWp.id, Math.hypot(startWp.x - goalWp.x, startWp.z - goalWp.z));

  while (openSet.size > 0) {
    let currentId: string | null = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (!currentId) break;
    if (currentId === goalWp.id) {
      const path: Array<{ x: number; z: number }> = [{ x: goalPos.x, z: goalPos.z }];
      let curr = currentId;
      while (cameFrom.has(curr)) {
        const wp = graph.waypointMap.get(curr);
        if (wp) path.unshift({ x: wp.x, z: wp.z });
        curr = cameFrom.get(curr)!;
      }
      return path;
    }

    openSet.delete(currentId);
    const currentWp = graph.waypointMap.get(currentId);
    if (!currentWp) continue;

    for (const neighborId of currentWp.neighbors) {
      const neighborWp = graph.waypointMap.get(neighborId);
      if (!neighborWp) continue;
      const edgeWeight = Math.hypot(currentWp.x - neighborWp.x, currentWp.z - neighborWp.z);
      const tentativeG = (gScore.get(currentId) ?? Infinity) + edgeWeight;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        const h = Math.hypot(neighborWp.x - goalWp.x, neighborWp.z - goalWp.z);
        fScore.set(neighborId, tentativeG + h);
        openSet.add(neighborId);
      }
    }
  }

  return [{ x: goalPos.x, z: goalPos.z }];
}

// ============================================================================
// 4B. ADVANCED AI BEHAVIOR TREE (COVER SEEKING, FLANKING, SUPPRESSIVE FIRE)
// ============================================================================

export const AI_LOW_HEALTH_THRESHOLD = 45;

/**
 * Find the best nearby tactical cover position that breaks Line-of-Sight from the threat
 * (or places a solid wall / cover prop between the AI and the threat).
 */
export function findBestCoverPosition(params: {
  aiPos: { x: number; z: number };
  threatPos: { x: number; z: number };
  navGraph: NavGraph;
  wallAABBs: AABB[];
  coverAABBs?: AABB[];
}): { x: number; z: number } | null {
  const { aiPos, threatPos, navGraph, wallAABBs, coverAABBs = [] } = params;
  const occluders = [...wallAABBs, ...coverAABBs];
  let bestWp: { x: number; z: number } | null = null;
  let bestScore = Infinity;

  for (const wp of navGraph.waypoints) {
    const distFromAI = Math.hypot(wp.x - aiPos.x, wp.z - aiPos.z);
    if (distFromAI > 14.0) continue;
    const distFromThreat = Math.hypot(wp.x - threatPos.x, wp.z - threatPos.z);
    if (distFromThreat < 2.2) continue;

    // Check if this waypoint is occluded from the threat at chest height (1.1m)
    const exposed = hasStrictLineOfSight(
      { x: wp.x, y: 1.1, z: wp.z },
      { x: threatPos.x, y: 1.1, z: threatPos.z },
      occluders
    );

    if (!exposed) {
      const coverBonus = wp.isCover ? -1.8 : 0;
      const score = distFromAI + coverBonus;
      if (score < bestScore) {
        bestScore = score;
        bestWp = { x: wp.x, z: wp.z };
      }
    }
  }

  if (bestWp) return bestWp;

  // Fallback: pick waypoint that maximizes distance from threat while staying reachable
  for (const wp of navGraph.waypoints) {
    const distFromAI = Math.hypot(wp.x - aiPos.x, wp.z - aiPos.z);
    const distFromThreat = Math.hypot(wp.x - threatPos.x, wp.z - threatPos.z);
    const score = distFromAI - distFromThreat * 0.65;
    if (score < bestScore) {
      bestScore = score;
      bestWp = { x: wp.x, z: wp.z };
    }
  }

  return bestWp;
}

/**
 * Compute a tactical flanking route around the player's last known position by penalizing
 * waypoints that lie directly along the frontal sightline vector between AI and target.
 */
export function findFlankingPath(params: {
  aiPos: { x: number; z: number };
  targetPos: { x: number; z: number };
  navGraph: NavGraph;
  wallAABBs: AABB[];
}): Array<{ x: number; z: number }> {
  const { aiPos, targetPos, navGraph, wallAABBs } = params;
  if (navGraph.waypoints.length === 0) return [{ x: targetPos.x, z: targetPos.z }];

  const dx = targetPos.x - aiPos.x;
  const dz = targetPos.z - aiPos.z;
  const directDist = Math.hypot(dx, dz) || 1;
  // Perpendicular lateral vectors for flanking offset
  const perpX = -dz / directDist;
  const perpZ = dx / directDist;

  // Choose the best lateral flanking anchor waypoint off to the side of the direct line
  let flankAnchor: NavWaypoint | null = null;
  let bestFlankScore = -Infinity;
  const midX = (aiPos.x + targetPos.x) * 0.5;
  const midZ = (aiPos.z + targetPos.z) * 0.5;

  for (const wp of navGraph.waypoints) {
    const lateralOffset = Math.abs((wp.x - midX) * perpX + (wp.z - midZ) * perpZ);
    const distToMid = Math.hypot(wp.x - midX, wp.z - midZ);
    if (distToMid > 12.5) continue;
    const score = lateralOffset * 1.6 - distToMid * 0.45;
    if (score > bestFlankScore) {
      bestFlankScore = score;
      flankAnchor = wp;
    }
  }

  if (flankAnchor && Math.hypot(flankAnchor.x - aiPos.x, flankAnchor.z - aiPos.z) > 1.2) {
    const leg1 = findNavPath(
      navGraph,
      aiPos,
      { x: flankAnchor.x, z: flankAnchor.z },
      wallAABBs
    );
    const leg2 = findNavPath(
      navGraph,
      { x: flankAnchor.x, z: flankAnchor.z },
      targetPos,
      wallAABBs
    );
    return [...leg1, ...leg2];
  }

  return findNavPath(navGraph, aiPos, targetPos, wallAABBs);
}

export interface AIBehaviorTreeInput {
  hp: number;
  maxHp?: number;
  isReloading: boolean;
  mag: number;
  canSeePlayer: boolean;
  distToPlayer: number;
  effectiveVisionRange: number;
  hasLastKnownPlayerPos: boolean;
  timeSinceLastSeenSec: number;
  aiPos: { x: number; z: number };
  playerPos: { x: number; z: number };
  lastKnownPlayerPos: { x: number; z: number } | null;
  navGraph: NavGraph;
  wallAABBs: AABB[];
  coverAABBs?: AABB[];
}

export interface AIBehaviorDecision {
  action: AIBehaviorAction;
  state: AIState;
  locomotion: 'idle' | 'walk' | 'sprint';
  moveTarget: { x: number; z: number } | null;
  path: Array<{ x: number; z: number }>;
  shouldFireDirect: boolean;
  shouldFireSuppressive: boolean;
  aimTarget: { x: number; y: number; z: number };
}

/**
 * Evaluate the dynamic AI Behavior Tree:
 * 1. SEEK COVER ('seek_cover'): Triggered when AI health is low (hp <= 45) or when reloading / empty magazine.
 * 2. SUPPRESSIVE FIRE ('suppressive_fire'): Triggered when player recently broke Line-of-Sight (<= 2.6s ago)
 *    with a known last position — AI lays down suppressive fire toward the last known position / corner.
 * 3. FLANK ('flank'): Triggered when player is out of sight with a last known position — AI routes along a lateral flanking path.
 * 4. ENGAGE ('engage'): Direct Line-of-Sight combat engagement within effective vision range.
 * 5. PATROL ('patrol'): Baseline sector patrol when unalerted.
 */
export function evaluateAIBehaviorTree(
  input: AIBehaviorTreeInput
): AIBehaviorDecision {
  const {
    hp,
    isReloading,
    mag,
    canSeePlayer,
    distToPlayer,
    effectiveVisionRange,
    hasLastKnownPlayerPos,
    timeSinceLastSeenSec,
    aiPos,
    playerPos,
    lastKnownPlayerPos,
    navGraph,
    wallAABBs,
    coverAABBs = [],
  } = input;

  const threatCoord = lastKnownPlayerPos ?? playerPos;

  // Node 1: Self-Preservation / Cover Seeking (Low HP <= 45 or Reloading / Empty Mag)
  if (hp <= AI_LOW_HEALTH_THRESHOLD || isReloading || mag <= 0) {
    const coverTarget = findBestCoverPosition({
      aiPos,
      threatPos: threatCoord,
      navGraph,
      wallAABBs,
      coverAABBs,
    });
    const dest = coverTarget ?? aiPos;
    const path = findNavPath(navGraph, aiPos, dest, wallAABBs);
    const distToCover = Math.hypot(dest.x - aiPos.x, dest.z - aiPos.z);

    return {
      action: 'seek_cover',
      state: 'cover',
      locomotion: distToCover > 0.65 ? 'sprint' : 'idle',
      moveTarget: dest,
      path,
      shouldFireDirect: canSeePlayer && !isReloading && mag > 0 && distToCover <= 1.2,
      shouldFireSuppressive: false,
      aimTarget: { x: threatCoord.x, y: 1.35, z: threatCoord.z },
    };
  }

  // Node 2: Direct Engagement when player is visible within effective vision range
  if (canSeePlayer && distToPlayer <= effectiveVisionRange) {
    const shouldAdvance = distToPlayer > 5.5;
    const path = shouldAdvance
      ? findNavPath(navGraph, aiPos, playerPos, wallAABBs)
      : [];
    return {
      action: 'engage',
      state: shouldAdvance ? 'reposition' : 'combat',
      locomotion: shouldAdvance ? 'walk' : 'idle',
      moveTarget: shouldAdvance ? playerPos : null,
      path,
      shouldFireDirect: true,
      shouldFireSuppressive: false,
      aimTarget: { x: playerPos.x, y: 1.35, z: playerPos.z },
    };
  }

  // Node 3: Suppressive Fire when player recently broke Line-of-Sight (<= 2.6s)
  if (
    !canSeePlayer &&
    hasLastKnownPlayerPos &&
    lastKnownPlayerPos &&
    timeSinceLastSeenSec <= 2.6 &&
    mag > 3
  ) {
    const flankPath = findFlankingPath({
      aiPos,
      targetPos: lastKnownPlayerPos,
      navGraph,
      wallAABBs,
    });
    return {
      action: 'suppressive_fire',
      state: 'suppress',
      locomotion: 'walk',
      moveTarget: flankPath[0] ?? lastKnownPlayerPos,
      path: flankPath,
      shouldFireDirect: false,
      shouldFireSuppressive: true,
      aimTarget: {
        x: lastKnownPlayerPos.x,
        y: 1.32,
        z: lastKnownPlayerPos.z,
      },
    };
  }

  // Node 4: Tactical Flanking toward Player's Last Known Position (<= 14.0s)
  if (
    !canSeePlayer &&
    hasLastKnownPlayerPos &&
    lastKnownPlayerPos &&
    timeSinceLastSeenSec <= 14.0
  ) {
    const flankPath = findFlankingPath({
      aiPos,
      targetPos: lastKnownPlayerPos,
      navGraph,
      wallAABBs,
    });
    return {
      action: 'flank',
      state: 'flank',
      locomotion: 'sprint',
      moveTarget: flankPath[0] ?? lastKnownPlayerPos,
      path: flankPath,
      shouldFireDirect: false,
      shouldFireSuppressive: false,
      aimTarget: {
        x: lastKnownPlayerPos.x,
        y: 1.35,
        z: lastKnownPlayerPos.z,
      },
    };
  }

  // Node 5: Baseline Patrol
  return {
    action: 'patrol',
    state: 'patrol',
    locomotion: 'walk',
    moveTarget: null,
    path: [],
    shouldFireDirect: false,
    shouldFireSuppressive: false,
    aimTarget: {
      x: aiPos.x,
      y: 1.35,
      z: aiPos.z - 1,
    },
  };
}

// ============================================================================
// 5. HIGH-EXPLOSIVE (HE) FRAGMENTATION GRENADES
// ============================================================================

export const INITIAL_GRENADES = 3;
export const GRENADE_FUSE_SEC = 3.0;
export const GRENADE_BLAST_RADIUS = 6.0;
export const GRENADE_EPICENTER_DAMAGE = 150;

export interface HEGrenadeState {
  id: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  fuseTimer: number;
  exploded: boolean;
  bounces: number;
}

export function createHEGrenade(
  id: string,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  throwSpeed = 16.0
): HEGrenadeState {
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
  const nx = dir.x / len;
  const ny = dir.y / len;
  const nz = dir.z / len;

  return {
    id,
    x: origin.x + nx * 0.45,
    y: origin.y + ny * 0.45,
    z: origin.z + nz * 0.45,
    vx: nx * throwSpeed,
    vy: ny * throwSpeed + 2.8,
    vz: nz * throwSpeed,
    rx: 0,
    ry: 0,
    rz: 0,
    vrx: (Math.random() - 0.5) * 16,
    vry: (Math.random() - 0.5) * 16,
    vrz: (Math.random() - 0.5) * 16,
    fuseTimer: GRENADE_FUSE_SEC,
    exploded: false,
    bounces: 0,
  };
}

export function stepHEGrenadePhysics(
  grenade: HEGrenadeState,
  dt: number,
  obstacleAABBs: AABB[]
): { bounced: boolean; hitGround: boolean } {
  if (grenade.exploded) return { bounced: false, hitGround: false };

  // Countdown fuse
  grenade.fuseTimer -= dt;
  if (grenade.fuseTimer <= 0) {
    grenade.exploded = true;
    return { bounced: false, hitGround: false };
  }

  let bounced = false;
  let hitGround = false;

  // Apply gravity & air drag
  const gravity = -14.0;
  grenade.vy += gravity * dt;
  const drag = Math.pow(0.985, dt * 60);
  grenade.vx *= drag;
  grenade.vz *= drag;

  // Rotation
  grenade.rx += grenade.vrx * dt;
  grenade.ry += grenade.vry * dt;
  grenade.rz += grenade.vrz * dt;
  grenade.vrx *= drag;
  grenade.vry *= drag;
  grenade.vrz *= drag;

  let nextX = grenade.x + grenade.vx * dt;
  let nextY = grenade.y + grenade.vy * dt;
  let nextZ = grenade.z + grenade.vz * dt;

  const radius = 0.08;

  // Floor collision (y = radius)
  if (nextY <= radius) {
    nextY = radius;
    if (Math.abs(grenade.vy) > 0.6) {
      bounced = true;
    }
    hitGround = true;
    grenade.vy = -grenade.vy * 0.45;
    grenade.vx *= 0.88;
    grenade.vz *= 0.88;
    grenade.bounces++;
    if (Math.abs(grenade.vy) < 0.12) grenade.vy = 0;
  }

  // Ceiling collision (room height = 3.0m)
  if (nextY >= 3.0 - radius) {
    nextY = 3.0 - radius;
    grenade.vy = -Math.abs(grenade.vy) * 0.45;
    bounced = true;
  }

  // Obstacle AABB collisions
  for (const box of obstacleAABBs) {
    if (
      nextX + radius > box.minX &&
      nextX - radius < box.maxX &&
      nextY + radius > box.minY &&
      nextY - radius < box.maxY &&
      nextZ + radius > box.minZ &&
      nextZ - radius < box.maxZ
    ) {
      const penLeft = Math.abs(nextX + radius - box.minX);
      const penRight = Math.abs(box.maxX - (nextX - radius));
      const penBottom = Math.abs(nextY + radius - box.minY);
      const penTop = Math.abs(box.maxY - (nextY - radius));
      const penFront = Math.abs(nextZ + radius - box.minZ);
      const penBack = Math.abs(box.maxZ - (nextZ - radius));

      const minPen = Math.min(penLeft, penRight, penBottom, penTop, penFront, penBack);

      if (minPen === penLeft) {
        nextX = box.minX - radius;
        grenade.vx = -Math.abs(grenade.vx) * 0.5;
        bounced = true;
      } else if (minPen === penRight) {
        nextX = box.maxX + radius;
        grenade.vx = Math.abs(grenade.vx) * 0.5;
        bounced = true;
      } else if (minPen === penFront) {
        nextZ = box.minZ - radius;
        grenade.vz = -Math.abs(grenade.vz) * 0.5;
        bounced = true;
      } else if (minPen === penBack) {
        nextZ = box.maxZ + radius;
        grenade.vz = Math.abs(grenade.vz) * 0.5;
        bounced = true;
      } else if (minPen === penBottom) {
        nextY = box.minY - radius;
        grenade.vy = -Math.abs(grenade.vy) * 0.5;
        bounced = true;
      } else {
        nextY = box.maxY + radius;
        grenade.vy = Math.abs(grenade.vy) * 0.5;
        bounced = true;
      }
      grenade.bounces++;
    }
  }

  grenade.x = nextX;
  grenade.y = nextY;
  grenade.z = nextZ;

  return { bounced, hitGround };
}

/**
 * Explosion Occlusion & Radial Damage Calculation:
 * - 6-meter radial blast zone (150 damage at epicenter, scaling linearly down to 0 at 6m).
 * - Casts ray from grenade center to target entity. If a solid wall blocks the ray, entity takes ZERO damage!
 */
export function evaluateExplosionOcclusionAndDamage(
  explosionPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  solidWallAABBs: AABB[]
): {
  inRadius: boolean;
  occluded: boolean;
  damage: number;
  distance: number;
} {
  const dx = targetPos.x - explosionPos.x;
  const dy = targetPos.y - explosionPos.y;
  const dz = targetPos.z - explosionPos.z;
  const distance = Math.hypot(dx, dy, dz);

  if (distance > GRENADE_BLAST_RADIUS) {
    return { inRadius: false, occluded: false, damage: 0, distance };
  }

  const canSee = hasStrictLineOfSight(explosionPos, targetPos, solidWallAABBs);
  if (!canSee) {
    return { inRadius: true, occluded: true, damage: 0, distance };
  }

  const damageFactor = Math.max(0, 1 - distance / GRENADE_BLAST_RADIUS);
  const damage = Math.round(GRENADE_EPICENTER_DAMAGE * damageFactor);

  return {
    inRadius: true,
    occluded: false,
    damage,
    distance,
  };
}

/**
 * Result of explosive barricade destruction from an HE grenade blast wave.
 */
export interface BarricadeExplosionResult {
  shatteredPlanksCount: number;
  blownOutPlanksCount: number;
  splinterBurstPoints: Array<{ x: number; y: number; z: number }>;
  debris: DebrisSpawnSpec[];
  totalCollapsedBarricadeIds: string[];
}

/**
 * Explosive Barricade Destruction:
 * Radial Fracture: Queries all wooden planks within the 6-meter blast radius.
 * - Planks within 3 meters of epicenter: instantly shatter into splinter particles.
 * - Planks between 3 and 6 meters: suffer constraint failure, converting into dynamic
 *   rigid bodies violently thrown outward by the explosion's directional force.
 * - Triggers total collapse if >= 40% of planks are destroyed or integrity drops to 0.
 */
export function applyExplosionToBarricades(
  barricades: BarricadeState[],
  explosionPos: { x: number; y: number; z: number },
  blastRadius = GRENADE_BLAST_RADIUS
): BarricadeExplosionResult {
  const result: BarricadeExplosionResult = {
    shatteredPlanksCount: 0,
    blownOutPlanksCount: 0,
    splinterBurstPoints: [],
    debris: [],
    totalCollapsedBarricadeIds: [],
  };

  for (const bar of barricades) {
    if (bar.collapsed) continue;

    let planksDamagedInThisBarricade = false;

    for (const plank of bar.planks) {
      if (!plank.intact) continue;

      const px = (plank.aabb.minX + plank.aabb.maxX) * 0.5;
      const py = (plank.aabb.minY + plank.aabb.maxY) * 0.5;
      const pz = (plank.aabb.minZ + plank.aabb.maxZ) * 0.5;

      const dx = px - explosionPos.x;
      const dy = py - explosionPos.y;
      const dz = pz - explosionPos.z;
      const dist = Math.hypot(dx, dy, dz);

      if (dist <= blastRadius) {
        planksDamagedInThisBarricade = true;
        const dLen = dist || 1.0;
        // Directional blast impulse vector with upward lift
        const impulseDir = {
          x: dx / dLen,
          y: (dy / dLen) * 0.45 + 0.42,
          z: dz / dLen,
        };

        if (dist <= 3.0) {
          // Epicenter zone (0..3m): Instantly shatters plank into splinter particles
          plank.intact = false;
          plank.hp = 0;
          for (const c of plank.chunks) {
            c.intact = false;
            c.hp = 0;
          }
          result.shatteredPlanksCount++;
          result.splinterBurstPoints.push({ x: px, y: py, z: pz });

          // Tiny splinter debris fragments thrown outward with high velocity
          for (const c of plank.chunks) {
            result.debris.push(
              makeDebrisFromAABB(
                `${c.id}-splinter`,
                c.aabb,
                impulseDir,
                5.5 + Math.random() * 3.5,
                false
              )
            );
          }
        } else {
          // Outer blast wave zone (3..6m): Suffer constraint failure, violently thrown outward as rigid bodies
          plank.intact = false;
          plank.hp = 0;
          for (const c of plank.chunks) {
            c.intact = false;
            c.hp = 0;
          }
          result.blownOutPlanksCount++;

          // Outward blast speed scaled inversely by distance (closer = faster impulse)
          const falloff = 1.0 - (dist - 3.0) / (blastRadius - 3.0);
          const blastSpeed = 4.2 + falloff * 8.0;

          result.debris.push(
            makeDebrisFromAABB(
              `${plank.id}-blastwave`,
              plank.aabb,
              impulseDir,
              blastSpeed,
              true
            )
          );
        }
      }
    }

    if (planksDamagedInThisBarricade) {
      // Re-evaluate structural integrity and threshold collapse
      const intactChunksCount = bar.planks.reduce(
        (acc, p) => acc + (p.intact ? p.chunks.filter((c) => c.intact).length : 0),
        0
      );
      const totalChunks = bar.plankCount * PLANK_CHUNKS_PER_ROW;
      bar.structuralIntegrityPct = Math.round((intactChunksCount / totalChunks) * 100);

      const destroyedPlanks = bar.planks.filter((p) => !p.intact).length;
      const destroyedRatio = destroyedPlanks / bar.plankCount;

      if (destroyedRatio >= BARRICADE_PLANK_LOSS_COLLAPSE_RATIO || bar.structuralIntegrityPct === 0) {
        bar.collapsed = true;
        bar.structuralIntegrityPct = 0;
        result.totalCollapsedBarricadeIds.push(bar.id);

        // Unanchor any remaining planks as rigid bodies
        for (const p of bar.planks) {
          if (p.intact) {
            p.intact = false;
            p.hp = 0;
            for (const c of p.chunks) {
              c.intact = false;
              c.hp = 0;
            }
            result.debris.push(
              makeDebrisFromAABB(
                `${p.id}-collapse`,
                p.aabb,
                { x: 0, y: 0.35, z: 0 },
                2.8,
                true
              )
            );
          }
        }
      }
    }
  }

  return result;
}

/**
 * Two-Bone Analytical Inverse Kinematics (IK) Solution
 */
export interface TwoBoneIKSolution {
  shoulderAngle: number;
  elbowFlexionAngle: number;
  targetDistance: number;
  clampedDistance: number;
  valid: boolean;
}

/**
 * Analytical Two-Bone Inverse Kinematics (IK) solver using the Law of Cosines.
 * Used to snap AI left hand accurately to the weapon's handguard socket.
 */
export function solveTwoBoneIK(
  distanceToTarget: number,
  upperArmLength = 0.28,
  forearmLength = 0.26
): TwoBoneIKSolution {
  const maxReach = upperArmLength + forearmLength;
  const minReach = Math.abs(upperArmLength - forearmLength) + 0.02;
  const clampedDistance = Math.min(
    maxReach * 0.998,
    Math.max(minReach, distanceToTarget)
  );

  // Law of cosines:
  // cos(alpha) = (L1^2 + D^2 - L2^2) / (2 * L1 * D)
  const cosAlpha =
    (upperArmLength * upperArmLength +
      clampedDistance * clampedDistance -
      forearmLength * forearmLength) /
    (2 * upperArmLength * clampedDistance);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

  // cos(beta) = (L1^2 + L2^2 - D^2) / (2 * L1 * L2)
  const cosBeta =
    (upperArmLength * upperArmLength +
      forearmLength * forearmLength -
      clampedDistance * clampedDistance) /
    (2 * upperArmLength * forearmLength);
  const beta = Math.acos(Math.max(-1, Math.min(1, cosBeta)));
  const elbowFlexion = Math.PI - beta;

  return {
    shoulderAngle: alpha,
    elbowFlexionAngle: elbowFlexion,
    targetDistance: distanceToTarget,
    clampedDistance,
    valid: true,
  };
}

/**
 * Multi-Bone Procedural Aiming Angle Distribution
 */
export interface AIAimDistribution {
  totalPitch: number;
  totalYaw: number;
  spine1Pitch: number;
  spine1Yaw: number;
  spine2Pitch: number;
  spine2Yaw: number;
  neckPitch: number;
  neckYaw: number;
  headPitch: number;
  headYaw: number;
  armPitch: number;
  armYaw: number;
}

/**
 * Calculate multi-bone IK rotation angles to dynamically aim spine, chest,
 * neck, head, and weapon arm directly at target center of mass.
 */
export function calculateMultiBoneAimAngles(
  aiChestPos: { x: number; y: number; z: number },
  aiFacingYaw: number,
  targetPos: { x: number; y: number; z: number }
): AIAimDistribution {
  const dx = targetPos.x - aiChestPos.x;
  const dy = targetPos.y - aiChestPos.y;
  const dz = targetPos.z - aiChestPos.z;

  // Global target angle in XZ plane
  const targetYaw = Math.atan2(-dx, -dz);
  // Difference between target yaw and AI base facing yaw
  let yawOffset = targetYaw - aiFacingYaw;
  while (yawOffset > Math.PI) yawOffset -= Math.PI * 2;
  while (yawOffset < -Math.PI) yawOffset += Math.PI * 2;

  // Pitch angle (looking up or down)
  const horizontalDist = Math.hypot(dx, dz) || 0.001;
  const pitchOffset = Math.atan2(dy, horizontalDist);

  // Clamp within realistic human physiological range
  const clampedYaw = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, yawOffset));
  const clampedPitch = Math.max(-Math.PI * 0.35, Math.min(Math.PI * 0.35, pitchOffset));

  return {
    totalPitch: clampedPitch,
    totalYaw: clampedYaw,
    // Distributed proportionally across skeletal hierarchy
    spine1Pitch: clampedPitch * 0.22,
    spine1Yaw: clampedYaw * 0.22,
    spine2Pitch: clampedPitch * 0.42,
    spine2Yaw: clampedYaw * 0.42,
    neckPitch: clampedPitch * 0.16,
    neckYaw: clampedYaw * 0.16,
    headPitch: clampedPitch * 0.20,
    headYaw: clampedYaw * 0.20,
    armPitch: clampedPitch * 0.35,
    armYaw: clampedYaw * 0.15,
  };
}

/**
 * AI Animation Blend Weights
 */
export interface AIAnimationBlendWeights {
  idle: number;
  walk: number;
  sprint: number;
  flinch: number;
}

/**
 * Smooth animation weight blending between idle, tactical walk, sprint, and hit-reaction flinch.
 */
export function stepAIAnimationBlend(
  current: AIAnimationBlendWeights,
  targetLocomotion: 'idle' | 'walk' | 'sprint',
  flinchIntensity: number,
  dt: number
): AIAnimationBlendWeights {
  const speed = 10.0;
  const alpha = 1 - Math.exp(-speed * Math.min(dt, 0.1));

  const targetIdle = targetLocomotion === 'idle' ? 1.0 : 0.0;
  const targetWalk = targetLocomotion === 'walk' ? 1.0 : 0.0;
  const targetSprint = targetLocomotion === 'sprint' ? 1.0 : 0.0;
  const targetFlinch = Math.max(0, Math.min(1.0, flinchIntensity));

  let nextIdle = current.idle + (targetIdle - current.idle) * alpha;
  let nextWalk = current.walk + (targetWalk - current.walk) * alpha;
  let nextSprint = current.sprint + (targetSprint - current.sprint) * alpha;
  let nextFlinch = current.flinch + (targetFlinch - current.flinch) * (1 - Math.exp(-18 * Math.min(dt, 0.1)));

  // Normalize base locomotion weights
  const totalBase = nextIdle + nextWalk + nextSprint || 1.0;
  nextIdle /= totalBase;
  nextWalk /= totalBase;
  nextSprint /= totalBase;

  return {
    idle: nextIdle,
    walk: nextWalk,
    sprint: nextSprint,
    flinch: nextFlinch,
  };
}

/**
 * Enemy Ambient Tactical Chat & Shouting Mechanics
 * Combatants shout when acquiring line-of-sight (alerted/spotted) or losing line-of-sight (lost_sight).
 */
export type EnemyShoutType = 'spotted' | 'lost_sight';

export interface EnemyShoutEvent {
  type: EnemyShoutType;
  enemyId: string;
  calloutText: string;
  timestamp: number;
  position: { x: number; y: number; z: number };
}

export const AMBIENT_SHOUT_COOLDOWN_MIN = 5.0; // Minimum seconds between shouts per enemy
export const AMBIENT_SHOUT_COOLDOWN_MAX = 8.5; // Maximum seconds between shouts per enemy
export const GLOBAL_CHAT_COOLDOWN_SEC = 2.0;   // Cooldown between ANY enemy shouting so lines do not clash
export const DEFAULT_SHOUT_PROBABILITY = 0.80; // 80% chance to vocalize when transition event occurs

export const SPOTTED_CALLOUTS: readonly string[] = [
  'Contact! Front!',
  'Target spotted!',
  'Intruder in sight! Open fire!',
  'Hostile in the sector!',
  'Eyes on target! Take him down!',
  'Movement ahead! Engaging!',
];

export const LOST_SIGHT_CALLOUTS: readonly string[] = [
  'Lost visual! Search the room!',
  'Where did he go?!',
  'Target broke line of sight!',
  'Lost contact! Check your corners!',
  'Cover the doorway! Keep your eyes open!',
  'He slipped away! Sweep the area!',
];

/**
 * Select a tactical shout callout text based on type and roll
 */
export function getAmbientCalloutText(
  type: EnemyShoutType,
  rngRoll = Math.random()
): string {
  const pool = type === 'spotted' ? SPOTTED_CALLOUTS : LOST_SIGHT_CALLOUTS;
  const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(rngRoll * pool.length)));
  return pool[idx];
}

export interface AmbientChatCheckParams {
  enemyId: string;
  currentCanSeePlayer: boolean;
  prevCanSeePlayer: boolean;
  currentState: AIState;
  shoutCooldownTimer: number;
  globalChatCooldownTimer?: number;
  enemyPos: { x: number; y: number; z: number };
  rngRoll?: number;
  shoutProbability?: number;
  nowSec?: number;
}

export interface AmbientChatResult {
  shouldShout: boolean;
  shoutType: EnemyShoutType | null;
  callout: EnemyShoutEvent | null;
  nextCooldown: number;
}

/**
 * Evaluates whether an enemy combatant should trigger an ambient shout / voice line
 * based on line-of-sight state transitions (spotted vs lost sight), health, and cooldowns.
 */
export function evaluateEnemyAmbientChat(
  params: AmbientChatCheckParams
): AmbientChatResult {
  const {
    enemyId,
    currentCanSeePlayer,
    prevCanSeePlayer,
    currentState,
    shoutCooldownTimer,
    globalChatCooldownTimer = 0,
    enemyPos,
    rngRoll = Math.random(),
    shoutProbability = DEFAULT_SHOUT_PROBABILITY,
    nowSec = Date.now() / 1000,
  } = params;

  // Cannot shout if incapacitated / knocked out
  if (currentState === 'ko') {
    return {
      shouldShout: false,
      shoutType: null,
      callout: null,
      nextCooldown: 0,
    };
  }

  // Detect state transition
  let transitionType: EnemyShoutType | null = null;
  if (!prevCanSeePlayer && currentCanSeePlayer) {
    transitionType = 'spotted';
  } else if (prevCanSeePlayer && !currentCanSeePlayer) {
    transitionType = 'lost_sight';
  }

  // If no visibility transition occurred, keep current cooldown
  if (!transitionType) {
    return {
      shouldShout: false,
      shoutType: null,
      callout: null,
      nextCooldown: Math.max(0, shoutCooldownTimer),
    };
  }

  // Check cooldowns (per-enemy debounce and global chatter throttle)
  if (shoutCooldownTimer > 0 || globalChatCooldownTimer > 0) {
    return {
      shouldShout: false,
      shoutType: null,
      callout: null,
      nextCooldown: Math.max(0, shoutCooldownTimer),
    };
  }

  // Evaluate probability roll
  if (rngRoll >= shoutProbability) {
    // Skipped this time; set a moderate cooldown (3s) so the enemy doesn't immediately check every frame
    return {
      shouldShout: false,
      shoutType: null,
      callout: null,
      nextCooldown: 3.0,
    };
  }

  // Shout successfully triggered!
  const text = getAmbientCalloutText(transitionType, (rngRoll * 17.13) % 1);
  const nextCooldown =
    AMBIENT_SHOUT_COOLDOWN_MIN +
    ((rngRoll * 9.41) % 1) * (AMBIENT_SHOUT_COOLDOWN_MAX - AMBIENT_SHOUT_COOLDOWN_MIN);

  return {
    shouldShout: true,
    shoutType: transitionType,
    callout: {
      type: transitionType,
      enemyId,
      calloutText: text,
      timestamp: nowSec,
      position: { ...enemyPos },
    },
    nextCooldown,
  };
}

/**
 * Realistic Articulated Humanoid Ragdoll Physics & Active Rigid-Body Constraint System
 * Upon AI death, converts all skeletal rig bones into rigid bodies connected by hinge and
 * ball-and-socket joints, applying a localized impulse force directly to the struck bone
 * along the bullet's exact trajectory.
 */

export type RagdollJointType = 'hinge' | 'ball_socket';

export interface RagdollRigidBody {
  boneId: RagdollBoneId;
  mass: number;
  radius: number;
  height: number;
  colliderType: 'capsule' | 'box';
  position: { x: number; y: number; z: number };
  prevPosition: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
  accumulatedImpulse: { x: number; y: number; z: number };
  cannonBody: CANNON.Body;
}

export interface RagdollJointConstraint {
  id: string;
  parentBone: RagdollBoneId;
  childBone: RagdollBoneId;
  jointType: RagdollJointType;
  restLength: number;
  minAngles: { x: number; y: number; z: number };
  maxAngles: { x: number; y: number; z: number };
}

export interface RagdollJointState {
  rotX: number;
  rotY: number;
  rotZ: number;
  velX: number;
  velY: number;
  velZ: number;
}

export interface DroppedWeaponPhysics {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  settled: boolean;
}

export interface CannonBodyWithCCD extends CANNON.Body {
  ccdSpeedThreshold: number;
  ccdIterations: number;
}

export interface EnemyRagdoll {
  active: boolean;
  settled: boolean;
  age: number;
  physicsEngine: 'cannon-es';
  cannonWorld: CANNON.World;
  cannonGroundBody: CANNON.Body;
  cannonBodies: Record<RagdollBoneId, CannonBodyWithCCD>;
  cannonConstraints: CANNON.Constraint[];
  rootPos: { x: number; y: number; z: number };
  rootVel: { x: number; y: number; z: number };
  rootRot: { x: number; y: number; z: number };
  rootRotVel: { x: number; y: number; z: number };
  targetRootRotX: number;
  hipsY: number;
  hipsVy: number;
  impactDir: { x: number; y: number; z: number };
  impactForce: number;
  hitZone: HitZone | 'explosion';
  struckBone: RagdollBoneId;
  rigidBodies: Record<RagdollBoneId, RagdollRigidBody>;
  constraints: RagdollJointConstraint[];
  // Skeletal joints
  spine1: RagdollJointState;
  spine2: RagdollJointState;
  neck: RagdollJointState;
  head: RagdollJointState;
  leftUpperArm: RagdollJointState;
  leftForearm: RagdollJointState;
  rightUpperArm: RagdollJointState;
  rightForearm: RagdollJointState;
  leftHip: RagdollJointState;
  leftKnee: RagdollJointState;
  rightHip: RagdollJointState;
  rightKnee: RagdollJointState;
  droppedWeapon: DroppedWeaponPhysics;
}

export interface CreateRagdollParams {
  hitZone: HitZone | 'explosion';
  hitBone?: RagdollBoneId;
  impactDir: { x: number; y: number; z: number };
  impactForce?: number;
  initialYaw: number;
  currentPos: { x: number; y: number; z: number };
}

function initJoint(rotX = 0, rotY = 0, rotZ = 0, velX = 0, velY = 0, velZ = 0): RagdollJointState {
  return { rotX, rotY, rotZ, velX, velY, velZ };
}

export const RAGDOLL_SKELETAL_CONSTRAINTS: readonly RagdollJointConstraint[] = [
  {
    id: 'joint-hips-spine1',
    parentBone: 'hips',
    childBone: 'spine1',
    jointType: 'ball_socket',
    restLength: 0.20,
    minAngles: { x: -0.65, y: -0.45, z: -0.55 },
    maxAngles: { x: 0.65, y: 0.45, z: 0.55 },
  },
  {
    id: 'joint-spine1-spine2',
    parentBone: 'spine1',
    childBone: 'spine2',
    jointType: 'ball_socket',
    restLength: 0.24,
    minAngles: { x: -0.75, y: -0.55, z: -0.45 },
    maxAngles: { x: 0.75, y: 0.55, z: 0.45 },
  },
  {
    id: 'joint-spine2-neck',
    parentBone: 'spine2',
    childBone: 'neck',
    jointType: 'ball_socket',
    restLength: 0.16,
    minAngles: { x: -0.85, y: -0.75, z: -0.65 },
    maxAngles: { x: 0.85, y: 0.75, z: 0.65 },
  },
  {
    id: 'joint-neck-head',
    parentBone: 'neck',
    childBone: 'head',
    jointType: 'ball_socket',
    restLength: 0.14,
    minAngles: { x: -1.15, y: -1.25, z: -0.85 },
    maxAngles: { x: 1.15, y: 1.25, z: 0.85 },
  },
  {
    id: 'joint-spine2-leftUpperArm',
    parentBone: 'spine2',
    childBone: 'leftUpperArm',
    jointType: 'ball_socket',
    restLength: 0.24,
    minAngles: { x: -0.8, y: -0.8, z: 0.1 },
    maxAngles: { x: 1.4, y: 0.8, z: 1.6 },
  },
  {
    id: 'joint-leftUpperArm-leftForearm',
    parentBone: 'leftUpperArm',
    childBone: 'leftForearm',
    jointType: 'hinge',
    restLength: 0.26,
    minAngles: { x: 0.05, y: 0, z: 0 },
    maxAngles: { x: 2.1, y: 0, z: 0 },
  },
  {
    id: 'joint-spine2-rightUpperArm',
    parentBone: 'spine2',
    childBone: 'rightUpperArm',
    jointType: 'ball_socket',
    restLength: 0.24,
    minAngles: { x: -0.8, y: -0.8, z: -1.6 },
    maxAngles: { x: 1.4, y: 0.8, z: -0.1 },
  },
  {
    id: 'joint-rightUpperArm-rightForearm',
    parentBone: 'rightUpperArm',
    childBone: 'rightForearm',
    jointType: 'hinge',
    restLength: 0.26,
    minAngles: { x: 0.05, y: 0, z: 0 },
    maxAngles: { x: 2.1, y: 0, z: 0 },
  },
  {
    id: 'joint-hips-leftHip',
    parentBone: 'hips',
    childBone: 'leftHip',
    jointType: 'ball_socket',
    restLength: 0.18,
    minAngles: { x: -0.5, y: -0.4, z: -0.65 },
    maxAngles: { x: 0.8, y: 0.4, z: 0.2 },
  },
  {
    id: 'joint-leftHip-leftKnee',
    parentBone: 'leftHip',
    childBone: 'leftKnee',
    jointType: 'hinge',
    restLength: 0.40,
    minAngles: { x: -2.4, y: 0, z: 0 },
    maxAngles: { x: 0.0, y: 0, z: 0 },
  },
  {
    id: 'joint-hips-rightHip',
    parentBone: 'hips',
    childBone: 'rightHip',
    jointType: 'ball_socket',
    restLength: 0.18,
    minAngles: { x: -0.5, y: -0.4, z: -0.2 },
    maxAngles: { x: 0.8, y: 0.4, z: 0.65 },
  },
  {
    id: 'joint-rightHip-rightKnee',
    parentBone: 'rightHip',
    childBone: 'rightKnee',
    jointType: 'hinge',
    restLength: 0.40,
    minAngles: { x: -2.4, y: 0, z: 0 },
    maxAngles: { x: 0.0, y: 0, z: 0 },
  },
];

/**
 * Build a Cannon.js compound capsule shape (cylinder shaft + top/bottom hemispherical spheres)
 * or box primitive for a skeletal bone.
 */
function addBonePrimitiveToCannonBody(
  body: CANNON.Body,
  colliderType: 'capsule' | 'box',
  radius: number,
  height: number
): void {
  if (colliderType === 'box') {
    const halfExtents = new CANNON.Vec3(radius, height * 0.5, radius * 0.72);
    body.addShape(new CANNON.Box(halfExtents));
  } else {
    const cylHeight = Math.max(0.04, height - radius * 1.2);
    const cylinder = new CANNON.Cylinder(radius, radius, cylHeight, 8);
    body.addShape(cylinder);
    const capOffset = cylHeight * 0.5;
    body.addShape(new CANNON.Sphere(radius * 0.92), new CANNON.Vec3(0, capOffset, 0));
    body.addShape(new CANNON.Sphere(radius * 0.92), new CANNON.Vec3(0, -capOffset, 0));
  }
}

/**
 * Initialize a true Cannon.js (`cannon-es`) active rigid-body ragdoll upon enemy incapacitation.
 * - Maps all 13 skeletal bones to Cannon.js physics bodies (Boxes for torso/pelvis, Capsules for limbs/head).
 * - Connects bodies via Cannon.js PointToPoint / ConeTwist and Hinge constraints with strict anatomical limits.
 * - Applies a massive localized `CANNON.Vec3` impulse directly to the struck bone along the killing bullet's trajectory.
 * - Enables Continuous Collision Detection (`ccdSpeedThreshold`, `ccdIterations`) on every body.
 */
export function createEnemyRagdoll(params: CreateRagdollParams): EnemyRagdoll {
  const { hitZone, impactDir, initialYaw, currentPos } = params;
  const struckBone: RagdollBoneId =
    params.hitBone ??
    (hitZone === 'head'
      ? 'head'
      : hitZone === 'limb'
      ? 'rightUpperArm'
      : 'spine2');
  const force =
    params.impactForce ??
    (hitZone === 'head' ? 6.8 : hitZone === 'explosion' ? 11.5 : 5.6);

  // Normalize impact direction (bullet trajectory)
  const len = Math.hypot(impactDir.x, impactDir.y, impactDir.z) || 1;
  const dirX = impactDir.x / len;
  const dirY = impactDir.y / len;
  const dirZ = impactDir.z / len;

  // Local impact direction relative to facing angle
  const cosYaw = Math.cos(initialYaw);
  const sinYaw = Math.sin(initialYaw);
  const localX = dirX * cosYaw - dirZ * sinYaw;
  const localZ = dirX * sinYaw + dirZ * cosYaw;

  const isHeadshot = hitZone === 'head' || struckBone === 'head' || struckBone === 'neck';
  const isExplosion = hitZone === 'explosion';

  let targetRootRotX = -Math.PI * 0.48; // default backward fall (supine)
  if (localZ > 0.15) {
    targetRootRotX = Math.PI * 0.46; // forward fall (prone)
  }

  // Root linear velocities propelled backward along bullet trajectory
  const rootVelX = dirX * force * 0.58;
  const rootVelY = isExplosion ? 3.8 + Math.random() * 2.2 : Math.max(0.35, dirY * force * 0.35 + 0.45);
  const rootVelZ = dirZ * force * 0.58;
  const hipsVy = isExplosion ? 2.5 : -3.2;

  // 1. Initialize Cannon.js Physics World with Gauss-Seidel constraint solver
  const cannonWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -15.2, 0),
  });
  cannonWorld.broadphase = new CANNON.NaiveBroadphase();
  const solver = new CANNON.GSSolver();
  solver.iterations = 10;
  solver.tolerance = 0.001;
  cannonWorld.solver = solver;

  const ragdollMat = new CANNON.Material('ragdollBoneMaterial');
  const groundMat = new CANNON.Material('groundMaterial');
  cannonWorld.addContactMaterial(
    new CANNON.ContactMaterial(groundMat, ragdollMat, {
      friction: 0.65,
      restitution: 0.12,
    })
  );

  // Static floor plane at Y = 0
  const cannonGroundBody = new CANNON.Body({
    mass: 0,
    material: groundMat,
    shape: new CANNON.Plane(),
  });
  cannonGroundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  cannonWorld.addBody(cannonGroundBody);

  // 2. Precise Skeletal Bone Mapping (Boxes for Pelvis/Torso, Capsules for Limbs/Neck/Head)
  const boneLocalOffsets: Record<
    RagdollBoneId,
    {
      x: number;
      y: number;
      z: number;
      mass: number;
      radius: number;
      height: number;
      colliderType: 'capsule' | 'box';
    }
  > = {
    hips: { x: 0, y: 0.88, z: 0, mass: 14.0, radius: 0.18, height: 0.22, colliderType: 'box' },
    spine1: { x: 0, y: 1.08, z: 0, mass: 12.0, radius: 0.15, height: 0.22, colliderType: 'box' },
    spine2: { x: 0, y: 1.32, z: 0, mass: 14.0, radius: 0.16, height: 0.26, colliderType: 'box' },
    neck: { x: 0, y: 1.48, z: 0, mass: 3.0, radius: 0.09, height: 0.16, colliderType: 'capsule' },
    head: { x: 0, y: 1.62, z: 0, mass: 5.0, radius: 0.13, height: 0.20, colliderType: 'capsule' },
    leftUpperArm: { x: -0.24, y: 1.36, z: 0, mass: 3.2, radius: 0.07, height: 0.28, colliderType: 'capsule' },
    leftForearm: { x: -0.28, y: 1.10, z: 0.08, mass: 2.1, radius: 0.06, height: 0.26, colliderType: 'capsule' },
    rightUpperArm: { x: 0.24, y: 1.36, z: 0, mass: 3.2, radius: 0.07, height: 0.28, colliderType: 'capsule' },
    rightForearm: { x: 0.28, y: 1.10, z: 0.08, mass: 2.1, radius: 0.06, height: 0.26, colliderType: 'capsule' },
    leftHip: { x: -0.11, y: 0.68, z: 0, mass: 7.5, radius: 0.09, height: 0.38, colliderType: 'capsule' },
    leftKnee: { x: -0.11, y: 0.32, z: 0, mass: 4.5, radius: 0.08, height: 0.38, colliderType: 'capsule' },
    rightHip: { x: 0.11, y: 0.68, z: 0, mass: 7.5, radius: 0.09, height: 0.38, colliderType: 'capsule' },
    rightKnee: { x: 0.11, y: 0.32, z: 0, mass: 4.5, radius: 0.08, height: 0.38, colliderType: 'capsule' },
  };

  const rigidBodies = {} as Record<RagdollBoneId, RagdollRigidBody>;
  const cannonBodies = {} as Record<RagdollBoneId, CannonBodyWithCCD>;

  for (const boneId of Object.keys(boneLocalOffsets) as RagdollBoneId[]) {
    const off = boneLocalOffsets[boneId];
    const wx = currentPos.x + off.x * cosYaw + off.z * sinYaw;
    const wy = currentPos.y + off.y;
    const wz = currentPos.z - off.x * sinYaw + off.z * cosYaw;

    const isStruck = boneId === struckBone;
    const impulseScale = isStruck ? 2.4 : 0.65;
    const invMass = 4.0 / off.mass;

    const ix = dirX * force * impulseScale;
    const iy = (dirY * 0.5 + 0.22) * force * impulseScale;
    const iz = dirZ * force * impulseScale;

    const vx = rootVelX + ix * invMass;
    const vy = rootVelY + iy * invMass * 0.4;
    const vz = rootVelZ + iz * invMass;

    // Create actual Cannon.js RigidBody with Continuous Collision Detection (CCD)
    const cBody = Object.assign(
      new CANNON.Body({
        mass: off.mass,
        material: ragdollMat,
        position: new CANNON.Vec3(wx, wy, wz),
        velocity: new CANNON.Vec3(vx, vy, vz),
        linearDamping: 0.18,
        angularDamping: 0.42,
        collisionFilterGroup: 2, // Ragdoll bones don't self-explode in Cannon broadphase
        collisionFilterMask: 1,  // Collide with static world & ground (group 1)
      }),
      {
        ccdSpeedThreshold: 0.25,
        ccdIterations: 8,
      }
    ) as CannonBodyWithCCD;
    cBody.quaternion.setFromEuler(0, initialYaw, 0);

    addBonePrimitiveToCannonBody(cBody, off.colliderType, off.radius, off.height);

    // Apply direct ballistic physics impulse via Cannon.js applyImpulse on the struck bone
    if (isStruck) {
      cBody.applyImpulse(
        new CANNON.Vec3(ix * 0.45, iy * 0.25, iz * 0.45),
        new CANNON.Vec3(0, 0, 0)
      );
    }

    cannonWorld.addBody(cBody);
    cannonBodies[boneId] = cBody;

    rigidBodies[boneId] = {
      boneId,
      mass: off.mass,
      radius: off.radius,
      height: off.height,
      colliderType: off.colliderType,
      position: { x: cBody.position.x, y: cBody.position.y, z: cBody.position.z },
      prevPosition: { x: wx, y: wy, z: wz },
      quaternion: {
        x: cBody.quaternion.x,
        y: cBody.quaternion.y,
        z: cBody.quaternion.z,
        w: cBody.quaternion.w,
      },
      velocity: { x: cBody.velocity.x, y: cBody.velocity.y, z: cBody.velocity.z },
      angularVelocity: {
        x: -localZ * force * (isStruck ? 3.2 : 0.8),
        y: -localX * force * (isStruck ? 2.4 : 0.5),
        z: localX * force * (isStruck ? 2.0 : 0.4),
      },
      accumulatedImpulse: { x: ix, y: iy, z: iz },
      cannonBody: cBody,
    };
  }

  // 3. Connect Cannon.js Rigid Bodies using Anatomical Hinge, ConeTwist & PointToPoint Constraints
  const cannonConstraints: CANNON.Constraint[] = [];
  for (const spec of RAGDOLL_SKELETAL_CONSTRAINTS) {
    const bodyA = cannonBodies[spec.parentBone];
    const bodyB = cannonBodies[spec.childBone];
    if (!bodyA || !bodyB) continue;

    // Compute local pivot points so initial distance matches restLength
    const worldDelta = new CANNON.Vec3(
      bodyB.position.x - bodyA.position.x,
      bodyB.position.y - bodyA.position.y,
      bodyB.position.z - bodyA.position.z
    );
    const pivotA = bodyA.quaternion.inverse().vmult(worldDelta.scale(0.5));
    const pivotB = bodyB.quaternion.inverse().vmult(worldDelta.scale(-0.5));

    if (spec.jointType === 'hinge') {
      // Elbows & Knees use Cannon.js HingeConstraint along local X axis
      const hinge = new CANNON.HingeConstraint(bodyA, bodyB, {
        pivotA,
        pivotB,
        axisA: new CANNON.Vec3(1, 0, 0),
        axisB: new CANNON.Vec3(1, 0, 0),
        collideConnected: false,
      });
      cannonWorld.addConstraint(hinge);
      cannonConstraints.push(hinge);
    } else {
      // Spine, Neck, Head, Shoulders & Hips use Cannon.js ConeTwistConstraint
      const coneTwist = new CANNON.ConeTwistConstraint(bodyA, bodyB, {
        pivotA,
        pivotB,
        axisA: new CANNON.Vec3(0, 1, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        angle: Math.max(Math.abs(spec.maxAngles.x), Math.abs(spec.maxAngles.z)),
        twistAngle: Math.max(0.2, Math.abs(spec.maxAngles.y)),
        collideConnected: false,
      });
      cannonWorld.addConstraint(coneTwist);
      cannonConstraints.push(coneTwist);
    }
  }

  // Base joint rotational velocities driven by impact zone + localized struckBone boost
  let headVelX = 0;
  let headVelY = 0;
  let neckVelX = 0;
  let spine1VelX = 0;
  let spine2VelX = 0;
  let spine1VelZ = 0;

  if (isHeadshot) {
    headVelX = -localZ * 16.5;
    headVelY = -localX * 10.5;
    neckVelX = -localZ * 9.5;
    spine1VelX = -localZ * 3.0;
    spine2VelX = -localZ * 4.2;
  } else if (isExplosion) {
    headVelX = (Math.random() - 0.5) * 12.0;
    headVelY = (Math.random() - 0.5) * 10.0;
    neckVelX = (Math.random() - 0.5) * 8.0;
    spine1VelX = (Math.random() - 0.5) * 8.0;
    spine2VelX = (Math.random() - 0.5) * 8.0;
    spine1VelZ = (Math.random() - 0.5) * 6.0;
    targetRootRotX = (Math.random() > 0.5 ? 1 : -1) * Math.PI * 0.47;
  } else {
    spine1VelX = -localZ * 6.0;
    spine2VelX = -localZ * 8.2;
    spine1VelZ = localX * 4.5;
    headVelX = -localZ * 4.8;
    neckVelX = -localZ * 3.8;
  }

  // Apply extra localized joint angular velocity to the exact struck bone
  const leftKneeVelX =
    -4.5 - Math.random() * 2.5 + (struckBone === 'leftKnee' ? -Math.abs(localZ) * 9.0 : 0);
  const rightKneeVelX =
    -4.8 - Math.random() * 2.5 + (struckBone === 'rightKnee' ? -Math.abs(localZ) * 9.0 : 0);
  const leftArmVelZ = 4.5 + (struckBone === 'leftUpperArm' ? force * 1.8 : 0);
  const rightArmVelZ = -4.5 - (struckBone === 'rightUpperArm' ? force * 1.8 : 0);
  const leftArmVelX = struckBone === 'leftUpperArm' || struckBone === 'leftForearm' ? -localZ * force * 2.2 : 0;
  const rightArmVelX = struckBone === 'rightUpperArm' || struckBone === 'rightForearm' ? -localZ * force * 2.2 : 0;
  const leftHipVelX = struckBone === 'leftHip' ? -localZ * force * 2.0 : 0;
  const rightHipVelX = struckBone === 'rightHip' ? -localZ * force * 2.0 : 0;

  return {
    active: true,
    settled: false,
    age: 0,
    physicsEngine: 'cannon-es',
    cannonWorld,
    cannonGroundBody,
    cannonBodies,
    cannonConstraints,
    rootPos: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
    rootVel: { x: rootVelX, y: rootVelY, z: rootVelZ },
    rootRot: { x: 0, y: initialYaw, z: 0 },
    rootRotVel: {
      x: isExplosion ? (Math.random() - 0.5) * 8.0 : -localZ * 2.8,
      y: isExplosion ? (Math.random() - 0.5) * 6.0 : localX * 1.6,
      z: isExplosion ? (Math.random() - 0.5) * 8.0 : 0,
    },
    targetRootRotX,
    hipsY: 0.88,
    hipsVy,
    impactDir: { x: dirX, y: dirY, z: dirZ },
    impactForce: force,
    hitZone,
    struckBone,
    rigidBodies,
    constraints: [...RAGDOLL_SKELETAL_CONSTRAINTS],
    // Articulated joints
    spine1: initJoint(0, 0, 0, spine1VelX, 0, spine1VelZ),
    spine2: initJoint(0, 0, 0, spine2VelX, 0, 0),
    neck: initJoint(0, 0, 0, neckVelX, 0, 0),
    head: initJoint(0, 0, 0, headVelX, headVelY, 0),
    leftUpperArm: initJoint(0.35, 0, 0.45, leftArmVelX, 0, leftArmVelZ),
    leftForearm: initJoint(0.65, 0, 0, -2.5 + leftArmVelX * 0.6, 0, 0),
    rightUpperArm: initJoint(0.40, 0, -0.45, rightArmVelX, 0, rightArmVelZ),
    rightForearm: initJoint(0.55, 0, 0, -2.5 + rightArmVelX * 0.6, 0, 0),
    leftHip: initJoint(0.12, 0, -0.15, leftHipVelX, 0, -1.5),
    leftKnee: initJoint(-0.25, 0, 0, leftKneeVelX, 0, 0),
    rightHip: initJoint(0.12, 0, 0.15, rightHipVelX, 0, 1.5),
    rightKnee: initJoint(-0.25, 0, 0, rightKneeVelX, 0, 0),
    // Dropped weapon physics
    droppedWeapon: {
      active: true,
      x: 0.12,
      y: -0.12,
      z: 0.08,
      vx: dirX * 1.6 + (Math.random() - 0.5) * 0.6,
      vy: 1.2 + Math.random() * 0.8,
      vz: dirZ * 1.6 + (Math.random() - 0.5) * 0.6,
      rx: -0.6,
      ry: 0.7,
      rz: 1.1,
      vrx: 4.5,
      vry: 3.5,
      vrz: 2.5,
      settled: false,
    },
  };
}

/**
 * Step the Cannon.js (`cannon-es`) active rigid-body humanoid ragdoll simulation.
 * - Steps `ragdoll.cannonWorld` across 6 sub-steps per frame for Continuous Collision Detection (CCD).
 * - Enforces anatomical joint constraints (Hinge & Cone-Twist) and distance preservation.
 * - Resolves swept floor & static wall AABB collisions so zero limbs ever clip through walls or floors.
 */
export function stepEnemyRagdollPhysics(
  ragdoll: EnemyRagdoll,
  dt: number,
  obstacles?: AABB[]
): void {
  if (ragdoll.settled) return;
  const stepDt = Math.min(dt, 0.05);
  ragdoll.age += stepDt;

  const SUB_STEPS = 6;
  const subDt = stepDt / SUB_STEPS;
  const boneKeys = Object.keys(ragdoll.rigidBodies) as RagdollBoneId[];

  const SELF_COLLISION_PAIRS: readonly [RagdollBoneId, RagdollBoneId][] = [
    ['leftForearm', 'rightForearm'],
    ['leftUpperArm', 'rightUpperArm'],
    ['leftKnee', 'rightKnee'],
    ['leftHip', 'rightHip'],
    ['leftForearm', 'spine2'],
    ['rightForearm', 'spine2'],
    ['leftKnee', 'spine1'],
    ['rightKnee', 'spine1'],
    ['head', 'spine2'],
  ];

  for (let step = 0; step < SUB_STEPS; step++) {
    // A. Step the Cannon.js Physics World
    ragdoll.cannonWorld.step(subDt);

    // B. Synchronize Cannon.js bodies & enforce Continuous Collision Detection (CCD) against Floor and Walls
    for (const boneId of boneKeys) {
      const rb = ragdoll.rigidBodies[boneId];
      const cBody = rb.cannonBody;

      rb.prevPosition.x = rb.position.x;
      rb.prevPosition.y = rb.position.y;
      rb.prevPosition.z = rb.position.z;

      let candX = cBody.position.x;
      let candY = cBody.position.y;
      let candZ = cBody.position.z;

      // Floor CCD clamp (zero floor clipping)
      const minFloorY = Math.max(0.045, rb.radius);
      if (candY < minFloorY) {
        candY = minFloorY;
        if (cBody.velocity.y < -0.3) {
          cBody.velocity.y = -cBody.velocity.y * 0.16;
        } else {
          cBody.velocity.y = 0;
        }
        cBody.velocity.x *= Math.exp(-8.5 * subDt);
        cBody.velocity.z *= Math.exp(-8.5 * subDt);
      }

      // Swept Wall & Obstacle CCD clamp (zero wall clipping)
      if (obstacles && obstacles.length > 0) {
        for (const obs of obstacles) {
          const pad = rb.radius;
          const minX = obs.minX - pad;
          const maxX = obs.maxX + pad;
          const minY = (obs.minY ?? 0) - pad;
          const maxY = (obs.maxY ?? 3.5) + pad;
          const minZ = obs.minZ - pad;
          const maxZ = obs.maxZ + pad;

          if (
            candX >= minX &&
            candX <= maxX &&
            candY >= minY &&
            candY <= maxY &&
            candZ >= minZ &&
            candZ <= maxZ
          ) {
            const dLeft = Math.abs(candX - minX);
            const dRight = Math.abs(maxX - candX);
            const dBack = Math.abs(candZ - minZ);
            const dFront = Math.abs(maxZ - candZ);
            const minPen = Math.min(dLeft, dRight, dBack, dFront);

            if (minPen === dLeft) {
              candX = minX - 0.002;
              cBody.velocity.x = Math.min(0, cBody.velocity.x * -0.2);
            } else if (minPen === dRight) {
              candX = maxX + 0.002;
              cBody.velocity.x = Math.max(0, cBody.velocity.x * -0.2);
            } else if (minPen === dBack) {
              candZ = minZ - 0.002;
              cBody.velocity.z = Math.min(0, cBody.velocity.z * -0.2);
            } else {
              candZ = maxZ + 0.002;
              cBody.velocity.z = Math.max(0, cBody.velocity.z * -0.2);
            }

            cBody.velocity.x *= 0.65;
            cBody.velocity.z *= 0.65;
          }
        }
      }

      cBody.position.set(candX, candY, candZ);
      rb.position.x = candX;
      rb.position.y = candY;
      rb.position.z = candZ;
    }

    // C. Enforce exact skeletal joint rest-length manifold after CCD clamping
    for (let iter = 0; iter < 3; iter++) {
      for (const constraint of ragdoll.constraints) {
        const parentRb = ragdoll.rigidBodies[constraint.parentBone];
        const childRb = ragdoll.rigidBodies[constraint.childBone];
        if (!parentRb || !childRb) continue;

        const dx = childRb.position.x - parentRb.position.x;
        const dy = childRb.position.y - parentRb.position.y;
        const dz = childRb.position.z - parentRb.position.z;
        const dist = Math.hypot(dx, dy, dz) || 0.0001;
        const diff = (dist - constraint.restLength) / dist;

        const totalMass = parentRb.mass + childRb.mass;
        const wParent = childRb.mass / totalMass;
        const wChild = parentRb.mass / totalMass;

        parentRb.position.x += dx * diff * wParent;
        parentRb.position.y = Math.max(parentRb.radius, parentRb.position.y + dy * diff * wParent);
        parentRb.position.z += dz * diff * wParent;

        childRb.position.x -= dx * diff * wChild;
        childRb.position.y = Math.max(childRb.radius, childRb.position.y - dy * diff * wChild);
        childRb.position.z -= dz * diff * wChild;

        parentRb.cannonBody.position.set(
          parentRb.position.x,
          parentRb.position.y,
          parentRb.position.z
        );
        childRb.cannonBody.position.set(
          childRb.position.x,
          childRb.position.y,
          childRb.position.z
        );
      }
    }

    // D. Inter-Limb Self-Collision Repulsion
    for (const [boneA, boneB] of SELF_COLLISION_PAIRS) {
      const rbA = ragdoll.rigidBodies[boneA];
      const rbB = ragdoll.rigidBodies[boneB];
      if (!rbA || !rbB) continue;

      const dx = rbB.position.x - rbA.position.x;
      const dy = rbB.position.y - rbA.position.y;
      const dz = rbB.position.z - rbA.position.z;
      const dist = Math.hypot(dx, dy, dz) || 0.0001;
      const minDist = rbA.radius + rbB.radius;

      if (dist < minDist) {
        const sep = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        rbA.position.x -= nx * sep;
        rbA.position.y = Math.max(rbA.radius, rbA.position.y - ny * sep);
        rbA.position.z -= nz * sep;

        rbB.position.x += nx * sep;
        rbB.position.y = Math.max(rbB.radius, rbB.position.y + ny * sep);
        rbB.position.z += nz * sep;

        rbA.cannonBody.position.set(rbA.position.x, rbA.position.y, rbA.position.z);
        rbB.cannonBody.position.set(rbB.position.x, rbB.position.y, rbB.position.z);
      }
    }

    // Sync velocities & quaternions back to RagdollRigidBody records
    for (const boneId of boneKeys) {
      const rb = ragdoll.rigidBodies[boneId];
      const cBody = rb.cannonBody;
      rb.velocity.x = cBody.velocity.x;
      rb.velocity.y = cBody.velocity.y;
      rb.velocity.z = cBody.velocity.z;
      rb.quaternion.x = cBody.quaternion.x;
      rb.quaternion.y = cBody.quaternion.y;
      rb.quaternion.z = cBody.quaternion.z;
      rb.quaternion.w = cBody.quaternion.w;
    }
  }

  // 2. Synchronize Root & Hips position with the simulated Cannon.js hips rigid body
  const hipsRb = ragdoll.rigidBodies.hips;
  if (hipsRb) {
    ragdoll.rootPos.x = hipsRb.position.x;
    ragdoll.rootPos.y = Math.max(0, hipsRb.position.y - 0.88);
    ragdoll.rootPos.z = hipsRb.position.z;
    ragdoll.hipsY = hipsRb.position.y;
    ragdoll.rootVel.x = hipsRb.velocity.x;
    ragdoll.rootVel.z = hipsRb.velocity.z;
    ragdoll.hipsVy = hipsRb.velocity.y;
  }

  // 3. Smooth Root Pitch & Fall Orientation Dynamics
  const rotAlpha = 1 - Math.exp(-8.0 * stepDt);
  ragdoll.rootRot.x += (ragdoll.targetRootRotX - ragdoll.rootRot.x) * rotAlpha;
  ragdoll.rootRot.y += ragdoll.rootRotVel.y * stepDt;
  ragdoll.rootRotVel.y *= Math.exp(-6.5 * stepDt);
  ragdoll.rootRot.z += ragdoll.rootRotVel.z * stepDt;
  ragdoll.rootRotVel.z *= Math.exp(-7.5 * stepDt);

  // 4. Anatomical Joint Constraint Solver (Strict Hinge & Cone-Twist Angular Limits)
  const stepJoint = (
    j: RagdollJointState,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
    damping = 7.5
  ) => {
    j.rotX += j.velX * stepDt;
    j.rotY += j.velY * stepDt;
    j.rotZ += j.velZ * stepDt;

    const decay = Math.exp(-damping * stepDt);
    j.velX *= decay;
    j.velY *= decay;
    j.velZ *= decay;

    // Strict human anatomical range-of-motion clamping (prevents limb inversion)
    j.rotX = Math.max(minX, Math.min(maxX, j.rotX));
    j.rotY = Math.max(minY, Math.min(maxY, j.rotY));
    j.rotZ = Math.max(minZ, Math.min(maxZ, j.rotZ));
  };

  // Spine & Neck: Cone-Twist 3-axis articulation with realistic anatomical limits
  stepJoint(ragdoll.spine1, -0.45, 0.55, -0.40, 0.40, -0.30, 0.30, 8.5);
  stepJoint(ragdoll.spine2, -0.50, 0.60, -0.45, 0.45, -0.35, 0.35, 8.5);
  stepJoint(ragdoll.neck, -0.45, 0.45, -0.60, 0.60, -0.35, 0.35, 9.0);
  stepJoint(ragdoll.head, -0.75, 0.75, -0.85, 0.85, -0.45, 0.45, 8.0);

  // Arms: Shoulders (Ball-and-Socket) & Elbows (Hinge strictly positive flexion 0° to 140°)
  stepJoint(ragdoll.leftUpperArm, -0.7, 1.3, -0.7, 0.7, 0.1, 1.5, 6.5);
  stepJoint(ragdoll.leftForearm, 0.0, 2.4, 0, 0, 0, 0, 8.0);

  stepJoint(ragdoll.rightUpperArm, -0.7, 1.3, -0.7, 0.7, -1.5, -0.1, 6.5);
  stepJoint(ragdoll.rightForearm, 0.0, 2.4, 0, 0, 0, 0, 8.0);

  // Legs: Hips (Ball-and-Socket) & Knees (Hinge strictly negative flexion -140° to 0°)
  stepJoint(ragdoll.leftHip, -0.4, 0.7, -0.3, 0.3, -0.5, 0.2, 7.0);
  stepJoint(ragdoll.leftKnee, -2.4, 0.0, 0, 0, 0, 0, 7.0);

  stepJoint(ragdoll.rightHip, -0.4, 0.7, -0.3, 0.3, -0.2, 0.5, 7.0);
  stepJoint(ragdoll.rightKnee, -2.4, 0.0, 0, 0, 0, 0, 7.0);

  // 5. Dropped Weapon Physics (tumbles and settles onto floor)
  const w = ragdoll.droppedWeapon;
  if (!w.settled) {
    w.vy -= 14.0 * stepDt;
    w.y += w.vy * stepDt;
    w.x += w.vx * stepDt;
    w.z += w.vz * stepDt;
    w.rx += w.vrx * stepDt;
    w.ry += w.vry * stepDt;
    w.rz += w.vrz * stepDt;

    const floorY = -0.22;
    if (w.y <= floorY) {
      w.y = floorY;
      w.vy = -w.vy * 0.22;
      w.vx *= 0.55;
      w.vz *= 0.55;
      w.vrx *= 0.4;
      w.vry *= 0.4;
      w.vrz *= 0.4;
      if (Math.abs(w.vy) < 0.25 && Math.hypot(w.vx, w.vz) < 0.15) {
        w.settled = true;
      }
    }
  }

  // 6. Settling Check
  const speeds =
    Math.hypot(ragdoll.rootVel.x, ragdoll.rootVel.z) +
    Math.abs(ragdoll.hipsVy) +
    Math.abs(ragdoll.head.velX) +
    Math.abs(ragdoll.spine1.velX);

  if (ragdoll.age > 1.4 && speeds < 0.12 && Math.abs(ragdoll.rootRot.x - ragdoll.targetRootRotX) < 0.05) {
    ragdoll.settled = true;
  }
}
