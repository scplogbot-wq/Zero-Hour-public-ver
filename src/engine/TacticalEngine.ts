import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  WEAPONS,
  WeaponId,
  FireMode,
  HitZone,
  LeanDirection,
  LeanInputMode,
  EnemyArchetype,
  AIState,
  MAX_PLAYER_HP,
  INITIAL_MEDBAGS,
  SurfaceMaterialTag,
  AABB,
  LightFixtureSpec,
  ACOUSTIC_LPF_CLEAR_HZ,
  ACOUSTIC_LPF_OCCLUDED_HZ,
  calculateBallisticDamage,
  useMedicalBag,
  computeNextLeanTarget,
  stepLeanKinematics,
  generateCQBMap,
  findRoomAtPosition,
  getRoomsAlongRay,
  MapLayoutVariant,
  validateMapGeometry,
  hasStrictLineOfSight,
  resolveCircleAABBCollision,
  GeneratedCQBMap,
  BarricadeState,
  DebrisSpawnSpec,
  createBarricadeForDoorway,
  applyBulletToBarricade,
  applyMeleeToBarricade,
  getIntactBarricadeLoSAABBs,
  getActiveBarricadeMovementAABBs,
  evaluateAcousticOcclusion,
  stepAcousticFilterState,
  shootLightFixture,
  isTargetIlluminatedByFlashlight,
  computeEffectiveAIVisionRange,
  evaluateMaterialBallistics,
  INITIAL_GRENADES,
  GRENADE_BLAST_RADIUS,
  HEGrenadeState,
  createHEGrenade,
  stepHEGrenadePhysics,
  evaluateExplosionOcclusionAndDamage,
  findNavPath,
  applyExplosionToBarricades,
  stepAIAnimationBlend,
  AIAnimationBlendWeights,
  evaluateEnemyAmbientChat,
  GLOBAL_CHAT_COOLDOWN_SEC,
  EnemyRagdoll,
  createEnemyRagdoll,
  stepEnemyRagdollPhysics,
  PrimaryWeaponId,
  SecondaryWeaponId,
  ALL_WEAPON_IDS,
  AttachmentId,
  EffectiveWeaponStats,
  computeEffectiveWeaponStats,
  PlayerLoadoutConfig,
  WeaponRuntimeEntry,
  createLoadoutRuntimeWeapons,
  EnemySpawnSpec,
  LockerAmbushSpec,
  evaluateLockerAmbushTriggers,
  stepLockerDoorKinematics,
  WORLD_SCENE_LAYER,
  WEAPON_VIEWMODEL_LAYER,
  canPlayerFire,
  computePlayerMovementSpeed,
  computeOpticAlignedAdsPosition,
  computeDynamicCameraNearPlane,
  evaluateAIBehaviorTree,
  RagdollBoneId,
  PLAYER_STANDING_EYE_Y,
  PLAYER_CROUCHED_EYE_Y,
  PLAYER_STANDING_CAPSULE_HEIGHT,
  PLAYER_CROUCHED_CAPSULE_HEIGHT,
  PLAYER_JUMP_IMPULSE_VELOCITY,
  PLAYER_GRAVITY_ACCEL,
  stepPlayerCrouch,
  evaluateColtSAAFireMode,
  createColtSAAReloadState,
  startColtSAAReload,
  stepColtSAAReload,
  createColtSAASpinState,
  triggerColtSAASpin,
  stepColtSAASpin,
  createWeaponAnimationBlendState,
  stepWeaponAnimationController,
  createWeaponSpringState,
  applyWeaponSpringRecoilImpulse,
  stepWeaponSpringPhysics,
} from '../game/tacticalLogic';
import {
  createCQBTextures,
  createUVMappedWoodGeometry,
  buildWeaponViewModel,
  applyAttachmentsToWeaponViewModel,
  BuiltWeaponViewModel,
  buildEnemyCombatantModel,
  buildHEGrenadeModel,
  buildTacticalDeskModel,
  buildServerRackModel,
  buildConcreteBarrierModel,
  buildTacticalLockerModel,
  BuiltTacticalLockerModel,
  setObjectLayerRecursive,
  RiggedEnemyBones,
  stepAICombatantAnimationAndIK,
  applyRagdollToEnemyBones,
  stepColtSAAViewModelParts,
} from '../game/models3d';
import { soundEngine } from '../game/soundEffects';
import {
  TacticalNetworkManager,
  TacticalGameMode,
  OperatorTeam,
  NetworkPlayerState,
  KillfeedEntry,
  InterpolatedRemotePose,
  interpolateRemotePlayerPose,
  generatePartyCode,
  sanitizePartyCode,
  WorldStateDeltaSnapshot,
  computeTeamSpawnPoint,
  SPAWN_SHIELD_DURATION_SEC,
} from '../game/multiplayerNet';

export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';
export type ArmoryDeckTab = 'weapons' | 'blueprint' | 'squad';

/**
 * Recursively disposes all BufferGeometry and Material instances inside a THREE.Group
 * before removing its children to prevent WebGL GPU memory leaks across map rebuilds.
 */
export function disposeGroupChildren(
  group: THREE.Group,
  sharedMaterials?: Set<THREE.Material>
): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (Array.isArray(obj.material)) {
        for (const mat of obj.material) {
          if (mat && (!sharedMaterials || !sharedMaterials.has(mat))) {
            mat.dispose();
          }
        }
      } else if (obj.material) {
        if (!sharedMaterials || !sharedMaterials.has(obj.material)) {
          obj.material.dispose();
        }
      }
    }
  });
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }
}

export interface GraphicsSettings {
  shadowQuality: 'off' | 'low' | 'med' | 'high';
  pcfSoftShadows: boolean;
  antiAliasing: boolean;
  bloom: boolean;
  ambientOcclusion: boolean;
  textureResolution: 256 | 1024;
}

export interface HUDState {
  screen: GameScreenState;
  hp: number;
  medbags: number;
  grenades: number;
  loadout: PlayerLoadoutConfig;
  activeWeapon: WeaponId;
  activeEffectiveStats: EffectiveWeaponStats;
  fireMode: FireMode;
  mag: number;
  reserve: number;
  isReloading: boolean;
  reloadTimeRemaining: number;
  isSprinting: boolean;
  isCrouched: boolean;
  isGrounded: boolean;
  isAds: boolean;
  leanTarget: LeanDirection;
  leanAngleDeg: number;
  leanOffsetMeters: number;
  leanMode: LeanInputMode;
  enemiesRemaining: number;
  enemiesTotal: number;
  lockersTriggered: number;
  lockersTotal: number;
  currentSectorName: string;
  currentRoomShape: string;
  mapSeed: number;
  mapLayoutVariant: MapLayoutVariant;
  mapLayoutName: string;
  bloodDecalsCount: number;
  kills: number;
  deaths: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  elapsedSec: number;
  victory: boolean;
  muted: boolean;
  statusBanner: string | null;
  barricadesStanding: number;
  barricadesTotal: number;
  targetBarricadeIntegrity: number;
  targetBarricadePlanks: number;
  targetBarricadeMeleeHits: number;
  wallBangHits: number;
  flashlightOn: boolean;
  lightsIntactCount: number;
  lightsTotalCount: number;
  currentRoomLit: boolean;
  acousticOccluded: boolean;
  acousticCutoffHz: number;
  coltReloadPhase: string;
  coltSpinActive: boolean;
  coltSpinStage: string;
  graphicsSettings: GraphicsSettings;
  compassBearingDeg: number;
  gameMode: TacticalGameMode;
  partyCode: string;
  callsign: string;
  team: OperatorTeam;
  isHost: boolean;
  pingMs: number;
  pingHistory: number[];
  transportLabel: string;
  squadRoster: NetworkPlayerState[];
  killfeed: KillfeedEntry[];
  scoreboardOpen: boolean;
  spawnShieldActive: boolean;
}

export interface HUDDomRefs {
  weaponPreviewMountRef: React.RefObject<HTMLDivElement | null>;
  minimapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  hpGhostBarRef: React.RefObject<HTMLDivElement | null>;
  hitMarkerRef: React.RefObject<HTMLDivElement | null>;
  damageVignetteRef: React.RefObject<HTMLDivElement | null>;
  damageArcRef: React.RefObject<HTMLDivElement | null>;
  compassTapeTrackRef: React.RefObject<HTMLDivElement | null>;
  compassBearingLabelRef: React.RefObject<HTMLSpanElement | null>;
  reloadProgressFillRef: React.RefObject<HTMLDivElement | null>;
}

export interface InspectTurntableState {
  weaponId: WeaponId;
  yaw: number;
  pitch: number;
  isDragging: boolean;
  lastX: number;
  lastY: number;
}

export interface TacticalGameController {
  startMatch: (
    newSeed?: number,
    loadoutOverride?: PlayerLoadoutConfig,
    layoutOverride?: MapLayoutVariant
  ) => void;
  resumeMatch: () => void;
  pauseMatch: () => void;
  returnToTitle: () => void;
  switchWeapon: (id: WeaponId) => void;
  toggleFireMode: () => void;
  triggerMedbag: () => void;
  triggerMelee: () => void;
  triggerInspectSpin: () => void;
  triggerLobbyTurntableAction: (action: 'spin' | 'fire') => void;
  toggleFlashlight: () => void;
  throwGrenade: () => void;
  updateGraphicsSettings: (settings: Partial<GraphicsSettings>) => void;
  setLeanMode: (mode: LeanInputMode) => void;
  setLeanTargetDirect: (dir: LeanDirection) => void;
  toggleAds: () => void;
  toggleMute: () => void;
  fireSingleShot: () => void;
  setCallsign: (callsign: string) => void;
  setGameMode: (mode: TacticalGameMode) => void;
  setOperatorTeam: (team: OperatorTeam) => void;
  joinPartyCode: (code: string) => string;
  generateNewPartyCode: () => string;
  toggleScoreboard: (force?: boolean) => void;
  getCurrentMap: () => GeneratedCQBMap;
  dispose: () => void;
}

interface ActiveRemotePlayerNode {
  id: string;
  callsign: string;
  team: OperatorTeam;
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  muzzlePoint: THREE.Object3D;
  laserLine: THREE.Line;
  bones: RiggedEnemyBones;
  weaponSocket: THREE.Object3D;
  handguardSocket: THREE.Object3D;
  blendWeights: AIAnimationBlendWeights;
  animPhase: number;
  flinchTimer: number;
  koTimer: number;
  pose: InterpolatedRemotePose;
  ragdoll: EnemyRagdoll | null;
  lastHp: number;
}

interface ActiveEnemy {
  id: string;
  archetype: EnemyArchetype;
  hp: number;
  maxHp: number;
  mag: number;
  maxMag: number;
  isReloading: boolean;
  reloadTimer: number;
  timeSinceLastSeenSec: number;
  state: AIState;
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  muzzlePoint: THREE.Object3D;
  laserLine: THREE.Line;
  bones: RiggedEnemyBones;
  weaponSocket: THREE.Object3D;
  handguardSocket: THREE.Object3D;
  blendWeights: AIAnimationBlendWeights;
  animPhase: number;
  flinchTimer: number;
  locomotion: 'idle' | 'walk' | 'sprint';
  patrolPoints: Array<{ x: number; z: number }>;
  patrolIdx: number;
  fireCooldown: number;
  footstepTimer: number;
  telegraphTimer: number;
  hitFlashTimer: number;
  koTimer: number;
  strafeSign: number;
  strafeTimer: number;
  canSeePlayer: boolean;
  prevCanSeePlayer: boolean;
  shoutCooldownTimer: number;
  effectiveVisionRange: number;
  lastSeenPlayerPos: { x: number; z: number } | null;
  ragdoll: EnemyRagdoll | null;
}

interface ActiveLockerNode {
  spec: LockerAmbushSpec;
  model: BuiltTacticalLockerModel;
}

interface ActiveLightFixtureNode {
  spec: LightFixtureSpec;
  pointLight: THREE.PointLight;
  bulbMesh: THREE.Mesh;
  hitMesh: THREE.Mesh;
  stripMesh: THREE.Mesh;
}

interface PooledDecalSlot {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  dripMesh: THREE.Mesh;
  dripMat: THREE.MeshBasicMaterial;
  active: boolean;
  hasDrip: boolean;
  age: number;
  maxDripScale: number;
}

interface ActiveWoodDebris {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  halfY: number;
  age: number;
  settled: boolean;
}

const MAX_BLOOD_PARTICLES = 180;
const MAX_WOOD_SPLINTERS = 180;
const MAX_IMPACT_PARTICLES = 220;
const MAX_DECAL_RING_BUFFER = 96;

// Pre-allocated scratch math helpers (Strict Zero-GC in render loop, firing, melee, and physics)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _bulletDir = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
const _aiEye = new THREE.Vector3();
const _playerTarget = new THREE.Vector3();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _decalLookTarget = new THREE.Vector3();
const _ceilOrigin = new THREE.Vector3();
const _floorOrigin = new THREE.Vector3();
const _meleeImpactPoint = new THREE.Vector3();
const _meleeScratchVec = new THREE.Vector3();
const _meleeToMesh = new THREE.Vector3();
const _meleePerpVec = new THREE.Vector3();
const _barImpactPoint = new THREE.Vector3();
const _backTowardSurface = new THREE.Vector3();
const _downDir = new THREE.Vector3();
const _evPt = new THREE.Vector3();
const _evDir = new THREE.Vector3();
const _splinterPt = new THREE.Vector3();
const _blastBurstDir = new THREE.Vector3(0, 0.6, 0);

const _shotRaycaster = new THREE.Raycaster();
const _meleeRaycaster = new THREE.Raycaster();
const _decalRaycaster = new THREE.Raycaster();
const _raycasterWallCheck = new THREE.Raycaster();
const _raycasterCeilingCheck = new THREE.Raycaster();
const _raycasterFloorCheck = new THREE.Raycaster();

export function createInitialHUDState(initialAutostart: boolean): HUDState {
  return {
    screen: initialAutostart ? 'playing' : 'title',
    hp: MAX_PLAYER_HP,
    medbags: INITIAL_MEDBAGS,
    grenades: INITIAL_GRENADES,
    loadout: {
      primary: 'hk416',
      secondary: 'glock17',
      primaryAttachments: [...WEAPONS.hk416.defaultAttachments],
      secondaryAttachments: [...WEAPONS.glock17.defaultAttachments],
    },
    activeWeapon: 'hk416',
    activeEffectiveStats: computeEffectiveWeaponStats('hk416'),
    fireMode: 'auto',
    mag: WEAPONS.hk416.magSize,
    reserve: WEAPONS.hk416.initialReserve,
    isReloading: false,
    reloadTimeRemaining: 0,
    isSprinting: false,
    isCrouched: false,
    isGrounded: true,
    isAds: false,
    leanTarget: 0,
    leanAngleDeg: 0,
    leanOffsetMeters: 0,
    leanMode: 'toggle',
    enemiesRemaining: 10,
    enemiesTotal: 10,
    lockersTriggered: 0,
    lockersTotal: 2,
    currentSectorName: 'SECTOR A1 · BREACH ENTRY',
    currentRoomShape: 'BREACH ENTRY',
    mapSeed: 2026,
    mapLayoutVariant: 'l_compound',
    mapLayoutName: 'L-WING COMPOUND',
    bloodDecalsCount: 0,
    kills: 0,
    deaths: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageTaken: 0,
    elapsedSec: 0,
    victory: false,
    muted: false,
    statusBanner: null,
    barricadesStanding: 10,
    barricadesTotal: 10,
    targetBarricadeIntegrity: 100,
    targetBarricadePlanks: 12,
    targetBarricadeMeleeHits: 0,
    wallBangHits: 0,
    flashlightOn: false,
    lightsIntactCount: 9,
    lightsTotalCount: 9,
    currentRoomLit: true,
    acousticOccluded: true,
    acousticCutoffHz: ACOUSTIC_LPF_CLEAR_HZ,
    coltReloadPhase: 'idle',
    coltSpinActive: false,
    coltSpinStage: 'none',
    graphicsSettings: {
      shadowQuality: 'med',
      pcfSoftShadows: true,
      antiAliasing: true,
      bloom: true,
      ambientOcclusion: true,
      textureResolution: 1024,
    },
    compassBearingDeg: 90,
    gameMode: 'COOP_SQUAD',
    partyCode: '749208',
    callsign: 'VANGUARD-01',
    team: 'ATTACKERS',
    isHost: true,
    pingMs: 14,
    pingHistory: [14, 15, 13, 14, 14, 16, 14, 13, 15, 14, 14, 13],
    transportLabel: 'LOCAL_BC',
    squadRoster: [],
    killfeed: [],
    scoreboardOpen: false,
    spawnShieldActive: false,
  };
}

export function initTacticalEngine(params: {
  mount: HTMLDivElement;
  initialAutostart: boolean;
  domRefs: HUDDomRefs;
  selectedLayoutRef: React.MutableRefObject<MapLayoutVariant | 'random'>;
  weaponAttachmentsRef: React.MutableRefObject<Record<WeaponId, AttachmentId[]>>;
  loadoutSelectionRef: React.MutableRefObject<PlayerLoadoutConfig>;
  inspectStateRef: React.MutableRefObject<InspectTurntableState>;
  onHudStateChange: (nextHud: HUDState) => void;
}): TacticalGameController {
  const {
    mount,
    initialAutostart,
    domRefs,
    selectedLayoutRef,
    weaponAttachmentsRef,
    loadoutSelectionRef,
    inspectStateRef,
    onHudStateChange,
  } = params;

  // 1. Software WebGL detection per Three.js skill
  const isSoftwareGl = (() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  })();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.setSize(
    mount.clientWidth || window.innerWidth,
    mount.clientHeight || window.innerHeight
  );
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070a0e);
  scene.fog = new THREE.FogExp2(0x070a0e, 0.045);

  // Studio PBR environment reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(
    75,
    (mount.clientWidth || window.innerWidth) / (mount.clientHeight || window.innerHeight),
    0.05,
    65
  );
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  // Atmospheric floating dust motes
  const DUST_COUNT = 75;
  const dustGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const dustMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, DUST_COUNT);
  const dustPositions: Array<{ x: number; y: number; z: number; vy: number; vx: number }> = [];
  for (let i = 0; i < DUST_COUNT; i++) {
    const px = Math.random() * 24;
    const py = 0.2 + Math.random() * 2.6;
    const pz = Math.random() * 24;
    dustPositions.push({
      x: px,
      y: py,
      z: pz,
      vy: 0.04 + Math.random() * 0.06,
      vx: (Math.random() - 0.5) * 0.03,
    });
    _dummyMatrix.setPosition(px, py, pz);
    dustMesh.setMatrixAt(i, _dummyMatrix);
  }
  dustMesh.instanceMatrix.needsUpdate = true;
  scene.add(dustMesh);

  const controls = new PointerLockControls(camera, renderer.domElement);

  // Lighting rig: Low ambient base so shooting out ceiling PointLights plunges rooms into real darkness
  const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.35);
  hemiLight.position.set(0, 12, 0);
  hemiLight.layers.enable(WEAPON_VIEWMODEL_LAYER);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfff1d6, 0.45);
  dirLight.position.set(14, 22, 10);
  dirLight.layers.enable(WEAPON_VIEWMODEL_LAYER);
  if (!isSoftwareGl) {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 45;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    dirLight.shadow.bias = -0.0005;
  }
  scene.add(dirLight);

  // Muzzle flash dynamic PointLight
  const muzzleLight = new THREE.PointLight(0xffa938, 0, 11);
  muzzleLight.layers.enable(WEAPON_VIEWMODEL_LAYER);
  camera.add(muzzleLight);
  muzzleLight.position.set(0.1, -0.1, -0.8);

  // Weapon-mounted Tactical Flashlight SpotLight [T] attached to camera/weapon barrel
  const flashlightSpot = new THREE.SpotLight(0xe0f2fe, 0, 24, Math.PI / 5.5, 0.38, 1.2);
  flashlightSpot.position.set(0.16, -0.11, -0.35);
  flashlightSpot.layers.enable(WEAPON_VIEWMODEL_LAYER);
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -12);
  camera.add(flashlightSpot);
  camera.add(flashlightTarget);
  flashlightSpot.target = flashlightTarget;

  // Build First-Person Weapon Viewmodels attached to camera on WEAPON_VIEWMODEL_LAYER (Layer 1)
  const viewModels = {} as Record<WeaponId, BuiltWeaponViewModel>;
  for (const wId of ALL_WEAPON_IDS) {
    const vm = buildWeaponViewModel(wId);
    setObjectLayerRecursive(vm.root, WEAPON_VIEWMODEL_LAYER);
    vm.root.visible = wId === 'hk416';
    camera.add(vm.root);
    viewModels[wId] = vm;
  }

  // Secondary 3D Weapon Preview Inspect Scene & Camera (Rendered via Viewport Scissoring on Title Menu)
  const inspectScene = new THREE.Scene();
  inspectScene.background = new THREE.Color(0x070b12);
  inspectScene.environment = scene.environment;
  const inspectCamera = new THREE.PerspectiveCamera(30, 1.6, 0.05, 10);
  inspectCamera.position.set(0, 0.05, 0.84);
  inspectCamera.lookAt(0, 0, 0);

  const inspectHemi = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 2.5);
  inspectScene.add(inspectHemi);
  const inspectKeyLight = new THREE.DirectionalLight(0xfffbeb, 4.4);
  inspectKeyLight.position.set(1.6, 2.4, 2.0);
  inspectScene.add(inspectKeyLight);
  const inspectRimLight = new THREE.DirectionalLight(0x38bdf8, 2.9);
  inspectRimLight.position.set(-1.8, 1.1, -1.6);
  inspectScene.add(inspectRimLight);
  const inspectFillLight = new THREE.PointLight(0xf59e0b, 2.5, 5);
  inspectFillLight.position.set(0.6, -0.5, 1.2);
  inspectScene.add(inspectFillLight);

  const inspectTurntable = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.31, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    })
  );
  inspectTurntable.rotation.x = -Math.PI / 2;
  inspectTurntable.position.y = -0.15;
  inspectScene.add(inspectTurntable);

  const inspectGrid = new THREE.GridHelper(0.9, 6, 0x334155, 0x1e293b);
  inspectGrid.position.y = -0.152;
  inspectScene.add(inspectGrid);

  const inspectPivot = new THREE.Group();
  inspectScene.add(inspectPivot);

  const inspectModels = {} as Record<WeaponId, BuiltWeaponViewModel>;
  for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
    const wId = ALL_WEAPON_IDS[i];
    const vm = buildWeaponViewModel(wId);
    const isPistol = WEAPONS[wId].slot === 'secondary';
    vm.root.position.set(0, isPistol ? -0.02 : -0.01, isPistol ? 0.02 : 0.14);
    if (vm.reticleGroup) vm.reticleGroup.visible = false;
    vm.root.scale.setScalar(isPistol ? 1.95 : 1.32);
    vm.root.visible = wId === inspectStateRef.current.weaponId;
    inspectPivot.add(vm.root);
    inspectModels[wId] = vm;
  }

  let lobbyTurntableKickZ = 0;
  let lobbyTurntableSpinRad = 0;
  let lobbyTurntableSpinVel = 0;
  let lobbyTurntableFlashTimer = 0;

  // Shared procedural textures & physical material tags (Concrete, Drywall, Steel, Wood)
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  let activeProceduralTextures = createCQBTextures(maxAnisotropy);

  const concreteWallMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: activeProceduralTextures.wallTexture,
    bumpMap: activeProceduralTextures.wallTexture,
    bumpScale: 0.018,
    roughness: 0.78,
    metalness: 0.12,
  });
  const drywallPartitionMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: activeProceduralTextures.drywallTexture,
    bumpMap: activeProceduralTextures.drywallTexture,
    bumpScale: 0.01,
    roughness: 0.85,
    metalness: 0.04,
  });
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x242a33,
    roughness: 0.55,
    metalness: 0.35,
  });
  const steelFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e2530,
    roughness: 0.28,
    metalness: 0.86,
  });
  const crateSteelMat = new THREE.MeshStandardMaterial({
    color: 0x3b4454,
    roughness: 0.38,
    metalness: 0.78,
  });
  const crateDrywallMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    map: activeProceduralTextures.drywallTexture,
    roughness: 0.82,
    metalness: 0.08,
  });
  const crateAccentMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.45,
    metalness: 0.25,
  });
  const woodPlankMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: activeProceduralTextures.woodTexture,
    bumpMap: activeProceduralTextures.woodTexture,
    bumpScale: 0.018,
    roughness: 0.78,
    metalness: 0.06,
  });
  const woodYellowXMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    map: activeProceduralTextures.woodTexture,
    roughness: 0.65,
    metalness: 0.08,
  });
  const woodStrapMat = new THREE.MeshStandardMaterial({
    color: 0x3b2f26,
    map: activeProceduralTextures.woodTexture,
    roughness: 0.85,
    metalness: 0.12,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: activeProceduralTextures.floorTexture,
    roughness: 0.8,
    metalness: 0.1,
  });
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x161a20,
    roughness: 0.6,
    metalness: 0.5,
  });
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x262e3b,
    roughness: 0.4,
    metalness: 0.75,
  });

  // Zero-GC Pooled Blood Droplet Particle InstancedMesh
  const dropletGeo = new THREE.SphereGeometry(0.026, 6, 6);
  const dropletMat = new THREE.MeshBasicMaterial({ color: 0x990a11 });
  const bloodParticlesMesh = new THREE.InstancedMesh(
    dropletGeo,
    dropletMat,
    MAX_BLOOD_PARTICLES
  );
  bloodParticlesMesh.frustumCulled = false;
  scene.add(bloodParticlesMesh);

  const particleActive = new Uint8Array(MAX_BLOOD_PARTICLES);
  const particleLife = new Float32Array(MAX_BLOOD_PARTICLES);
  const particleMaxLife = new Float32Array(MAX_BLOOD_PARTICLES);
  const particlePos = new Float32Array(MAX_BLOOD_PARTICLES * 3);
  const particleVel = new Float32Array(MAX_BLOOD_PARTICLES * 3);
  let particleCursor = 0;

  // Zero-GC Pooled Wood Splinter Particle InstancedMesh
  const splinterGeo = new THREE.BoxGeometry(0.022, 0.014, 0.085);
  const splinterMat = new THREE.MeshStandardMaterial({
    color: 0xb4824c,
    roughness: 0.8,
    metalness: 0.05,
  });
  const woodSplintersMesh = new THREE.InstancedMesh(
    splinterGeo,
    splinterMat,
    MAX_WOOD_SPLINTERS
  );
  woodSplintersMesh.frustumCulled = false;
  scene.add(woodSplintersMesh);

  const splinterActive = new Uint8Array(MAX_WOOD_SPLINTERS);
  const splinterLife = new Float32Array(MAX_WOOD_SPLINTERS);
  const splinterMaxLife = new Float32Array(MAX_WOOD_SPLINTERS);
  const splinterPos = new Float32Array(MAX_WOOD_SPLINTERS * 3);
  const splinterVel = new Float32Array(MAX_WOOD_SPLINTERS * 3);
  let splinterCursor = 0;

  // Zero-GC Pooled Material Impact Particles (Sparks, Gray Concrete Dust, White Gypsum Dust)
  const sparkGeo = new THREE.OctahedronGeometry(0.024, 0);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const sparkParticlesMesh = new THREE.InstancedMesh(
    sparkGeo,
    sparkMat,
    MAX_IMPACT_PARTICLES
  );
  sparkParticlesMesh.frustumCulled = false;
  scene.add(sparkParticlesMesh);

  const grayDustGeo = new THREE.DodecahedronGeometry(0.048, 0);
  const grayDustMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.78,
  });
  const grayDustMesh = new THREE.InstancedMesh(
    grayDustGeo,
    grayDustMat,
    MAX_IMPACT_PARTICLES
  );
  grayDustMesh.frustumCulled = false;
  scene.add(grayDustMesh);

  const gypsumDustGeo = new THREE.DodecahedronGeometry(0.052, 0);
  const gypsumDustMat = new THREE.MeshBasicMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.9,
  });
  const gypsumDustMesh = new THREE.InstancedMesh(
    gypsumDustGeo,
    gypsumDustMat,
    MAX_IMPACT_PARTICLES
  );
  gypsumDustMesh.frustumCulled = false;
  scene.add(gypsumDustMesh);

  interface ImpactPoolState {
    mesh: THREE.InstancedMesh;
    active: Uint8Array;
    life: Float32Array;
    maxLife: Float32Array;
    pos: Float32Array;
    vel: Float32Array;
    gravity: number;
    cursor: number;
  }

  const createImpactPool = (mesh: THREE.InstancedMesh, gravity: number): ImpactPoolState => ({
    mesh,
    active: new Uint8Array(MAX_IMPACT_PARTICLES),
    life: new Float32Array(MAX_IMPACT_PARTICLES),
    maxLife: new Float32Array(MAX_IMPACT_PARTICLES),
    pos: new Float32Array(MAX_IMPACT_PARTICLES * 3),
    vel: new Float32Array(MAX_IMPACT_PARTICLES * 3),
    gravity,
    cursor: 0,
  });

  const sparkPool = createImpactPool(sparkParticlesMesh, 13.5);
  const grayDustPool = createImpactPool(grayDustMesh, 3.2);
  const gypsumDustPool = createImpactPool(gypsumDustMesh, 2.8);

  const spawnPoolBurst = (
    pool: ImpactPoolState,
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    count: number,
    speedMin: number,
    speedMax: number,
    lifeMin: number,
    lifeMax: number
  ) => {
    for (let i = 0; i < count; i++) {
      const idx = pool.cursor;
      pool.cursor = (pool.cursor + 1) % MAX_IMPACT_PARTICLES;
      pool.active[idx] = 1;
      pool.life[idx] = 0;
      pool.maxLife[idx] = lifeMin + Math.random() * (lifeMax - lifeMin);

      pool.pos[idx * 3 + 0] = origin.x + (Math.random() - 0.5) * 0.08;
      pool.pos[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.08;
      pool.pos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.08;

      const speed = speedMin + Math.random() * (speedMax - speedMin);
      pool.vel[idx * 3 + 0] = dir.x * speed + (Math.random() - 0.5) * 2.2;
      pool.vel[idx * 3 + 1] = dir.y * speed + 0.5 + Math.random() * 1.6;
      pool.vel[idx * 3 + 2] = dir.z * speed + (Math.random() - 0.5) * 2.2;
    }
  };

  //Scene containers for dynamic map rebuilds
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);
  const barricadeGroup = new THREE.Group();
  scene.add(barricadeGroup);
  const debrisGroup = new THREE.Group();
  scene.add(debrisGroup);
  const decalGroup = new THREE.Group();
  scene.add(decalGroup);
  const enemiesGroup = new THREE.Group();
  scene.add(enemiesGroup);
  const remotePlayersGroup = new THREE.Group();
  scene.add(remotePlayersGroup);

  // Fixed-Size Ring Buffer Decal Pool (max 96 decals, recycled geometries & materials, zero leaks)
  const sharedDecalGeo = new THREE.PlaneGeometry(1, 1);
  const sharedDripGeo = new THREE.PlaneGeometry(0.045, 0.25);
  const decalRingPool: PooledDecalSlot[] = [];
  let decalRingCursor = 0;
  let totalDecalsSpawnedCount = 0;

  for (let i = 0; i < MAX_DECAL_RING_BUFFER; i++) {
    const mat = new THREE.MeshBasicMaterial({
      map: activeProceduralTextures.bloodTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(sharedDecalGeo, mat);
    mesh.visible = false;
    decalGroup.add(mesh);

    const dripMat = new THREE.MeshBasicMaterial({
      color: 0x6e060b,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    const dripMesh = new THREE.Mesh(sharedDripGeo, dripMat);
    dripMesh.visible = false;
    decalGroup.add(dripMesh);

    decalRingPool.push({
      mesh,
      mat,
      dripMesh,
      dripMat,
      active: false,
      hasDrip: false,
      age: 0,
      maxDripScale: 2.0,
    });
  }

  const resetDecalRingPool = () => {
    decalRingCursor = 0;
    totalDecalsSpawnedCount = 0;
    for (let i = 0; i < MAX_DECAL_RING_BUFFER; i++) {
      const slot = decalRingPool[i];
      slot.active = false;
      slot.hasDrip = false;
      slot.mesh.visible = false;
      slot.dripMesh.visible = false;
    }
  };

  const resetParticles = () => {
    for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
      particleActive[i] = 0;
      _dummyMatrix.makeScale(0, 0, 0);
      bloodParticlesMesh.setMatrixAt(i, _dummyMatrix);
    }
    bloodParticlesMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_WOOD_SPLINTERS; i++) {
      splinterActive[i] = 0;
      _dummyMatrix.makeScale(0, 0, 0);
      woodSplintersMesh.setMatrixAt(i, _dummyMatrix);
    }
    woodSplintersMesh.instanceMatrix.needsUpdate = true;

    for (const pool of [sparkPool, grayDustPool, gypsumDustPool]) {
      for (let i = 0; i < MAX_IMPACT_PARTICLES; i++) {
        pool.active[i] = 0;
        _dummyMatrix.makeScale(0, 0, 0);
        pool.mesh.setMatrixAt(i, _dummyMatrix);
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
  };
  resetParticles();

  const spawnDirectionalBloodBurst = (
    origin: THREE.Vector3,
    exitDir: THREE.Vector3,
    count = 20
  ) => {
    for (let i = 0; i < count; i++) {
      const idx = particleCursor;
      particleCursor = (particleCursor + 1) % MAX_BLOOD_PARTICLES;
      particleActive[idx] = 1;
      particleLife[idx] = 0;
      particleMaxLife[idx] = 0.38 + Math.random() * 0.34;

      particlePos[idx * 3 + 0] = origin.x + (Math.random() - 0.5) * 0.08;
      particlePos[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.08;
      particlePos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.08;

      const speed = 3.2 + Math.random() * 4.8;
      particleVel[idx * 3 + 0] = exitDir.x * speed + (Math.random() - 0.5) * 1.6;
      particleVel[idx * 3 + 1] = exitDir.y * speed + 0.6 + Math.random() * 1.4;
      particleVel[idx * 3 + 2] = exitDir.z * speed + (Math.random() - 0.5) * 1.6;
    }
  };

  const spawnWoodSplinterBurst = (
    origin: THREE.Vector3,
    exitDir: THREE.Vector3,
    count = 16
  ) => {
    for (let i = 0; i < count; i++) {
      const idx = splinterCursor;
      splinterCursor = (splinterCursor + 1) % MAX_WOOD_SPLINTERS;
      splinterActive[idx] = 1;
      splinterLife[idx] = 0;
      splinterMaxLife[idx] = 0.42 + Math.random() * 0.38;

      splinterPos[idx * 3 + 0] = origin.x + (Math.random() - 0.5) * 0.14;
      splinterPos[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.1;
      splinterPos[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.14;

      const speed = 2.8 + Math.random() * 4.5;
      splinterVel[idx * 3 + 0] = exitDir.x * speed + (Math.random() - 0.5) * 2.2;
      splinterVel[idx * 3 + 1] = exitDir.y * speed + 0.8 + Math.random() * 1.8;
      splinterVel[idx * 3 + 2] = exitDir.z * speed + (Math.random() - 0.5) * 2.2;
    }
  };

  const sharedMaterials = new Set<THREE.Material>([
    concreteWallMat,
    drywallPartitionMat,
    pillarMat,
    steelFrameMat,
    crateSteelMat,
    crateDrywallMat,
    crateAccentMat,
    woodPlankMat,
    woodYellowXMat,
    woodStrapMat,
    floorMat,
    beamMat,
    socketMat,
  ]);

  let wallMeshes: THREE.Mesh[] = [];
  let splatterTargetMeshes: THREE.Mesh[] = [];
  let activeEnemies: ActiveEnemy[] = [];
  let activeBarricades: BarricadeState[] = [];
  const barricadeChunkMeshMap = new Map<string, THREE.Mesh>();
  let intactBarricadeMeshes: THREE.Mesh[] = [];
  let activeWoodDebris: ActiveWoodDebris[] = [];
  let activeLightFixtures: ActiveLightFixtureNode[] = [];
  let lightBulbHitMeshes: THREE.Mesh[] = [];
  let activeLockers: ActiveLockerNode[] = [];
  let currentMap: GeneratedCQBMap = generateCQBMap(2026);
  let activeGrenades: Array<{ state: HEGrenadeState; mesh: THREE.Group }> = [];
  const remotePlayerNodes = new Map<string, ActiveRemotePlayerNode>();

  // Room-Grid Spatial Hash Maps (`"${gx},${gz}"` -> Mesh[]) for 75% faster raycasting
  const spatialWallHash = new Map<string, THREE.Mesh[]>();
  const spatialBarricadeHash = new Map<string, THREE.Mesh[]>();
  const spatialSplatterHash = new Map<string, THREE.Mesh[]>();
  const _queriedWallMeshes: THREE.Mesh[] = [];
  const _queriedBarricadeMeshes: THREE.Mesh[] = [];
  const _queriedSplatterMeshes: THREE.Mesh[] = [];
  const _seenMeshSet = new Set<THREE.Mesh>();

  const registerMeshInSpatialHash = (
    hash: Map<string, THREE.Mesh[]>,
    mesh: THREE.Mesh,
    aabb: AABB
  ) => {
    const margin = 0.85;
    for (let i = 0; i < currentMap.rooms.length; i++) {
      const r = currentMap.rooms[i];
      if (
        aabb.maxX >= r.minX - margin &&
        aabb.minX <= r.maxX + margin &&
        aabb.maxZ >= r.minZ - margin &&
        aabb.minZ <= r.maxZ + margin
      ) {
        const key = `${r.gx},${r.gz}`;
        let list = hash.get(key);
        if (!list) {
          list = [];
          hash.set(key, list);
        }
        list.push(mesh);
      }
    }
  };

  const querySpatialMeshesAlongRay = (
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxDist: number
  ) => {
    _queriedWallMeshes.length = 0;
    _queriedBarricadeMeshes.length = 0;
    _seenMeshSet.clear();

    const rooms = getRoomsAlongRay(currentMap, origin, dir, maxDist);
    for (let i = 0; i < rooms.length; i++) {
      const key = `${rooms[i].gx},${rooms[i].gz}`;
      const wList = spatialWallHash.get(key);
      if (wList) {
        for (let j = 0; j < wList.length; j++) {
          const m = wList[j];
          if (!_seenMeshSet.has(m)) {
            _seenMeshSet.add(m);
            _queriedWallMeshes.push(m);
          }
        }
      }
      const bList = spatialBarricadeHash.get(key);
      if (bList) {
        for (let j = 0; j < bList.length; j++) {
          const m = bList[j];
          if (m.visible && !_seenMeshSet.has(m)) {
            _seenMeshSet.add(m);
            _queriedBarricadeMeshes.push(m);
          }
        }
      }
    }

    return {
      walls: _queriedWallMeshes.length > 0 ? _queriedWallMeshes : wallMeshes,
      barricades:
        _queriedBarricadeMeshes.length > 0 ? _queriedBarricadeMeshes : intactBarricadeMeshes,
    };
  };

  let currentGraphicsSettings: GraphicsSettings = {
    shadowQuality: 'med',
    pcfSoftShadows: true,
    antiAliasing: true,
    bloom: true,
    ambientOcclusion: true,
    textureResolution: 1024,
  };

  const sim = {
    screen: (initialAutostart ? 'playing' : 'title') as GameScreenState,
    hp: MAX_PLAYER_HP,
    ghostHp: MAX_PLAYER_HP,
    medbags: INITIAL_MEDBAGS,
    grenades: INITIAL_GRENADES,
    loadout: { primary: 'hk416', secondary: 'glock17' } as PlayerLoadoutConfig,
    activeWeapon: 'hk416' as WeaponId,
    weapons: createLoadoutRuntimeWeapons({
      primary: 'hk416',
      secondary: 'glock17',
    }) as Record<WeaponId, WeaponRuntimeEntry>,
    isReloading: false,
    reloadTimer: 0,
    reloadTotalSec: 2.1,
    isCrouching: false,
    crouchProgress: 0,
    isGrounded: true,
    playerJumpY: 0,
    playerVelocityY: 0,
    isSprinting: false,
    isAds: false,
    adsAmount: 0,
    leanMode: 'toggle' as LeanInputMode,
    leanTarget: 0 as LeanDirection,
    leanAmount: 0,
    leanOffsetX: 0,
    leanRollZ: 0,
    playerBodyPos: new THREE.Vector3(4, 1.68, 4),
    playerYaw: -Math.PI / 2,
    playerPitch: 0,
    walkBobPhase: 0,
    playerStepTimer: 0.42,
    fireCooldown: 0,
    muzzleFlashTimer: 0,
    recoilKickZ: 0,
    recoilPitch: 0,
    meleeAnimTimer: 0,
    cameraTrauma: 0,
    hitstopTimer: 0,
    hitMarkerTimer: 0,
    hitMarkerColor: '#ffffff',
    damageVignetteTimer: 0,
    damageArcTimer: 0,
    damageSourcePos: null as { x: number; z: number } | null,
    spawnShieldTimer: 0,
    victoryDelayTimer: 0,
    flashlightOn: false,
    acousticFilter: {
      cutoffHz: ACOUSTIC_LPF_OCCLUDED_HZ,
      volumeScale: 0.6,
      occluded: true,
    },
    kills: 0,
    deaths: 0,
    headshots: 0,
    shotsFired: 0,
    shotsHit: 0,
    wallBangHits: 0,
    damageTaken: 0,
    elapsedSec: 0,
    victory: false,
    statusBanner: null as string | null,
    statusBannerTimer: 0,
    globalEnemyChatCooldown: 0,
    tourTime: 0,
    scoreboardOpen: false,
    killfeed: [] as KillfeedEntry[],
  };

  // Dual-Transport Tactical Multiplayer Manager
  const urlParty =
    typeof window !== 'undefined'
      ? sanitizePartyCode(new URLSearchParams(window.location.search).get('party') || '')
      : '';
  const netManager = new TacticalNetworkManager({
    callsign: 'VANGUARD-01',
    partyCode: urlParty || '749208',
    mode: 'COOP_SQUAD',
    mapSeed: 2026,
    layoutVariant: 'l_compound',
  });

  const captureWorldSnapshot = (): WorldStateDeltaSnapshot => {
    const destroyedLightIds: string[] = [];
    for (let i = 0; i < activeLightFixtures.length; i++) {
      if (!activeLightFixtures[i].spec.intact) {
        destroyedLightIds.push(activeLightFixtures[i].spec.id);
      }
    }

    const barricades: WorldStateDeltaSnapshot['barricades'] = [];
    for (let i = 0; i < activeBarricades.length; i++) {
      const b = activeBarricades[i];
      const brokenChunkMask: number[] = [];
      for (let p = 0; p < b.planks.length; p++) {
        const plank = b.planks[p];
        let mask = 0;
        for (let c = 0; c < plank.chunks.length; c++) {
          if (!plank.intact || !plank.chunks[c].intact) {
            mask |= 1 << c;
          }
        }
        brokenChunkMask.push(mask);
      }
      if (b.collapsed || b.meleeHits > 0 || brokenChunkMask.some((m) => m > 0)) {
        barricades.push({
          id: b.id,
          collapsed: b.collapsed,
          meleeHits: b.meleeHits,
          brokenChunkMask,
        });
      }
    }

    const triggeredLockerIds: string[] = [];
    for (let i = 0; i < activeLockers.length; i++) {
      if (activeLockers[i].spec.triggered) {
        triggeredLockerIds.push(activeLockers[i].spec.id);
      }
    }

    const enemies: WorldStateDeltaSnapshot['enemies'] = [];
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      enemies.push({
        id: e.id,
        hp: e.hp,
        state: e.state,
        x: Number(e.group.position.x.toFixed(2)),
        z: Number(e.group.position.z.toFixed(2)),
      });
    }

    return {
      destroyedLightIds,
      barricades,
      triggeredLockerIds,
      enemies,
    };
  };

  const applyWorldSnapshot = (snapshot?: WorldStateDeltaSnapshot) => {
    if (!snapshot) return;

    // 1. Sync destroyed lights
    if (snapshot.destroyedLightIds?.length) {
      const destroyedSet = new Set(snapshot.destroyedLightIds);
      for (let i = 0; i < activeLightFixtures.length; i++) {
        const fNode = activeLightFixtures[i];
        if (destroyedSet.has(fNode.spec.id) && fNode.spec.intact) {
          shootLightFixture(fNode.spec);
          fNode.bulbMesh.visible = false;
          fNode.hitMesh.visible = false;
          fNode.pointLight.intensity = 0;
          (fNode.stripMesh.material as THREE.MeshBasicMaterial).color.setHex(0x1e293b);
        }
      }
      lightBulbHitMeshes = activeLightFixtures
        .filter((f) => f.spec.intact)
        .map((f) => f.hitMesh);
    }

    // 2. Sync damaged/collapsed barricades
    if (snapshot.barricades?.length) {
      for (let i = 0; i < snapshot.barricades.length; i++) {
        const bSnap = snapshot.barricades[i];
        const bar = activeBarricades.find((b) => b.id === bSnap.id);
        if (!bar) continue;
        bar.collapsed = bSnap.collapsed;
        bar.meleeHits = bSnap.meleeHits;
        for (let p = 0; p < bar.planks.length; p++) {
          const plank = bar.planks[p];
          const mask = bSnap.brokenChunkMask[p] || 0;
          if (bSnap.collapsed || mask === 0x3f) {
            plank.intact = false;
            plank.hp = 0;
          }
          for (let c = 0; c < plank.chunks.length; c++) {
            if (bSnap.collapsed || (mask & (1 << c)) !== 0) {
              plank.chunks[c].intact = false;
              plank.chunks[c].hp = 0;
            }
          }
        }
      }
      rebuildIntactBarricadeMeshList();
    }

    // 3. Sync triggered lockers
    if (snapshot.triggeredLockerIds?.length) {
      const trigSet = new Set(snapshot.triggeredLockerIds);
      for (let i = 0; i < activeLockers.length; i++) {
        const lNode = activeLockers[i];
        if (trigSet.has(lNode.spec.id)) {
          lNode.spec.triggered = true;
          lNode.spec.doorOpenProgress = 1;
          lNode.model.leftDoorPivot.rotation.y = -2.05;
          lNode.model.rightDoorPivot.rotation.y = 2.05;
        }
      }
    }

    // 4. Sync AI enemies
    if (snapshot.enemies?.length) {
      for (let i = 0; i < snapshot.enemies.length; i++) {
        const eSnap = snapshot.enemies[i];
        const enemy = activeEnemies.find((e) => e.id === eSnap.id);
        if (!enemy) continue;
        enemy.hp = eSnap.hp;
        enemy.group.position.x = eSnap.x;
        enemy.group.position.z = eSnap.z;
        if (eSnap.hp <= 0 || eSnap.state === 'ko') {
          enemy.hp = 0;
          enemy.state = 'ko';
          enemy.koTimer = 0.01;
          enemy.laserLine.visible = false;
          if (!enemy.ragdoll) {
            enemy.ragdoll = createEnemyRagdoll({
              hitZone: 'torso',
              impactDir: { x: 0, y: 0.2, z: 1 },
              impactForce: 4.2,
              initialYaw: enemy.group.rotation.y,
              currentPos: {
                x: enemy.group.position.x,
                y: enemy.group.position.y,
                z: enemy.group.position.z,
              },
            });
          }
        }
      }
    }
  };

  netManager.setWorldSnapshotProvider(captureWorldSnapshot);

  const pushKillfeedEntry = (entry: Omit<KillfeedEntry, 'id' | 'timestamp'>) => {
    const item: KillfeedEntry = {
      ...entry,
      id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    sim.killfeed = [item, ...sim.killfeed].slice(0, 5);
  };

  const triggerHitMarker = (isHeadshot: boolean, durationSec = 0.095) => {
    sim.hitMarkerTimer = durationSec;
    sim.hitMarkerColor = isHeadshot ? '#ef4444' : '#ffffff';
    if (domRefs.hitMarkerRef.current) {
      domRefs.hitMarkerRef.current.style.opacity = '1';
      domRefs.hitMarkerRef.current.style.color = sim.hitMarkerColor;
    }
  };

  const triggerDamageVignette = (
    durationSec = 0.22,
    attackerWorldPos?: { x: number; z: number }
  ) => {
    sim.damageVignetteTimer = durationSec;
    if (domRefs.damageVignetteRef.current) {
      domRefs.damageVignetteRef.current.style.opacity = '0.88';
    }
    if (attackerWorldPos) {
      sim.damageSourcePos = { x: attackerWorldPos.x, z: attackerWorldPos.z };
      sim.damageArcTimer = 1.15;
    }
  };

  const keysHeld = new Set<string>();
  let mouseLeftHeld = false;
  let canShoot = true;
  let pendingBufferedShot = false;
  let bufferedShotExpiry = 0;

  const coltReloadState = createColtSAAReloadState();
  const coltSpinState = createColtSAASpinState();
  const weaponAnimBlend = createWeaponAnimationBlendState();
  const weaponSpring = createWeaponSpringState();
  let coltHammerCockTimer = 0;
  let coltPendingAdsShot = false;
  let coltFanningSlapTimer = 0;
  let prevCameraYaw = sim.playerYaw;
  let prevCameraPitch = sim.playerPitch;

  const showBanner = (msg: string, duration = 2.0) => {
    sim.statusBanner = msg;
    sim.statusBannerTimer = duration;
  };

  const findNearestBarricade = (): BarricadeState | null => {
    let best: BarricadeState | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < activeBarricades.length; i++) {
      const b = activeBarricades[i];
      const d = Math.hypot(b.x - sim.playerBodyPos.x, b.z - sim.playerBodyPos.z);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best && bestDist <= 5.5 ? best : null;
  };

  const getRoomLightIntactAt = (wx: number, wz: number): boolean => {
    const room = findRoomAtPosition(currentMap, wx, wz);
    for (let i = 0; i < activeLightFixtures.length; i++) {
      const f = activeLightFixtures[i];
      if (f.spec.roomGx === room.gx && f.spec.roomGz === room.gz) {
        return f.spec.intact;
      }
    }
    return true;
  };

  // High-frequency 60Hz DOM ref mutator (zero React re-renders!)
  const updateHighFrequencyDomRefs = () => {
    // 1. Compass bearing & scrolling tape
    const rawDeg = Math.round(((-sim.playerYaw * 180) / Math.PI) % 360);
    const compassBearingDeg = (rawDeg + 360) % 360;
    if (domRefs.compassBearingLabelRef.current) {
      domRefs.compassBearingLabelRef.current.textContent = String(compassBearingDeg).padStart(
        3,
        '0'
      );
    }
    if (domRefs.compassTapeTrackRef.current) {
      // Shift horizontal tape smoothly by bearing degree
      const offsetPx = -((compassBearingDeg / 360) * 720);
      domRefs.compassTapeTrackRef.current.style.transform = `translate3d(${offsetPx.toFixed(1)}px, 0, 0)`;
    }

    // 2. Reload progress bar
    if (domRefs.reloadProgressFillRef.current) {
      if (sim.isReloading && sim.reloadTotalSec > 0) {
        const pct = Math.max(
          0,
          Math.min(100, ((sim.reloadTotalSec - sim.reloadTimer) / sim.reloadTotalSec) * 100)
        );
        domRefs.reloadProgressFillRef.current.style.width = `${pct.toFixed(1)}%`;
      } else {
        domRefs.reloadProgressFillRef.current.style.width = '0%';
      }
    }

    // 3. Directional damage indicator arc around crosshair
    if (domRefs.damageArcRef.current) {
      if (sim.damageArcTimer > 0 && sim.damageSourcePos) {
        const dx = sim.damageSourcePos.x - sim.playerBodyPos.x;
        const dz = sim.damageSourcePos.z - sim.playerBodyPos.z;
        const worldAngle = Math.atan2(dx, -dz);
        const relAngleRad = worldAngle + sim.playerYaw;
        const relDeg = (relAngleRad * 180) / Math.PI;
        domRefs.damageArcRef.current.style.opacity = String(
          Math.min(1, sim.damageArcTimer / 0.6)
        );
        domRefs.damageArcRef.current.style.transform = `translate(-50%, -50%) rotate(${relDeg.toFixed(1)}deg)`;
      } else {
        domRefs.damageArcRef.current.style.opacity = '0';
      }
    }
  };

  let lastSyncedSectorName = '';
  let lastSyncedEnemiesRem = -1;
  let lastSyncedBanner: string | null = null;

  const syncHudNow = () => {
    const wState = sim.weapons[sim.activeWeapon];
    const room = findRoomAtPosition(
      currentMap,
      sim.playerBodyPos.x,
      sim.playerBodyPos.z
    );

    const nearestBarricade = findNearestBarricade();
    const currentRoomLit = getRoomLightIntactAt(
      sim.playerBodyPos.x,
      sim.playerBodyPos.z
    );
    let lightsIntactCount = 0;
    for (let i = 0; i < activeLightFixtures.length; i++) {
      if (activeLightFixtures[i].spec.intact) lightsIntactCount++;
    }

    const rawDeg = Math.round(((-sim.playerYaw * 180) / Math.PI) % 360);
    const compassBearingDeg = (rawDeg + 360) % 360;

    document.body.dataset.flashlight = sim.flashlightOn ? 'on' : 'off';
    document.body.dataset.roomLit = currentRoomLit ? 'lit' : 'dark';
    document.body.dataset.lightsIntact = String(lightsIntactCount);
    document.body.dataset.acousticOccluded = sim.acousticFilter.occluded
      ? 'true'
      : 'false';
    document.body.dataset.acousticHz = String(
      Math.round(sim.acousticFilter.cutoffHz)
    );
    document.body.dataset.mapLayout = currentMap.layoutVariant;
    document.body.dataset.reloading = sim.isReloading ? 'true' : 'false';
    document.body.dataset.sprinting = sim.isSprinting ? 'true' : 'false';

    let enemiesRemaining = 0;
    for (let i = 0; i < activeEnemies.length; i++) {
      if (activeEnemies[i].state !== 'ko') enemiesRemaining++;
    }

    let lockersTriggered = 0;
    for (let i = 0; i < activeLockers.length; i++) {
      if (activeLockers[i].spec.triggered) lockersTriggered++;
    }

    let barricadesStanding = 0;
    for (let i = 0; i < activeBarricades.length; i++) {
      if (!activeBarricades[i].collapsed) barricadesStanding++;
    }

    lastSyncedSectorName = room.name;
    lastSyncedEnemiesRem = enemiesRemaining;
    lastSyncedBanner = sim.statusBanner;

    onHudStateChange({
      screen: sim.screen,
      hp: Math.round(sim.hp),
      medbags: sim.medbags,
      grenades: sim.grenades,
      loadout: sim.loadout,
      graphicsSettings: currentGraphicsSettings,
      activeWeapon: sim.activeWeapon,
      activeEffectiveStats: wState.effectiveStats,
      fireMode: wState.fireMode,
      mag: wState.mag,
      reserve: wState.reserve,
      isReloading: sim.isReloading,
      reloadTimeRemaining: Math.max(0, Number(sim.reloadTimer.toFixed(1))),
      isSprinting: sim.isSprinting,
      isCrouched: sim.crouchProgress > 0.35,
      isGrounded: sim.isGrounded,
      isAds: sim.isAds,
      leanTarget: sim.leanTarget,
      leanAngleDeg: Math.round((-sim.leanRollZ * 180) / Math.PI),
      leanOffsetMeters: Number(sim.leanOffsetX.toFixed(2)),
      leanMode: sim.leanMode,
      enemiesRemaining,
      enemiesTotal: activeEnemies.length,
      lockersTriggered,
      lockersTotal: activeLockers.length,
      currentSectorName: room.name,
      currentRoomShape: room.shapeVariant.replace('_', ' ').toUpperCase(),
      mapSeed: currentMap.seed,
      mapLayoutVariant: currentMap.layoutVariant,
      mapLayoutName: currentMap.layoutName,
      bloodDecalsCount: totalDecalsSpawnedCount,
      barricadesStanding,
      barricadesTotal: activeBarricades.length,
      targetBarricadeIntegrity: nearestBarricade
        ? nearestBarricade.structuralIntegrityPct
        : 0,
      targetBarricadePlanks: nearestBarricade
        ? nearestBarricade.planks.filter((p) => p.intact).length
        : 0,
      targetBarricadeMeleeHits: nearestBarricade ? nearestBarricade.meleeHits : 0,
      wallBangHits: sim.wallBangHits,
      flashlightOn: sim.flashlightOn,
      lightsIntactCount,
      lightsTotalCount: activeLightFixtures.length,
      currentRoomLit,
      acousticOccluded: sim.acousticFilter.occluded,
      acousticCutoffHz: Math.round(sim.acousticFilter.cutoffHz),
      coltReloadPhase: coltReloadState.phase,
      coltSpinActive: coltSpinState.active,
      coltSpinStage: coltSpinState.phase,
      kills: sim.kills,
      deaths: sim.deaths,
      headshots: sim.headshots,
      shotsFired: sim.shotsFired,
      shotsHit: sim.shotsHit,
      damageTaken: Math.round(sim.damageTaken),
      elapsedSec: Math.floor(sim.elapsedSec),
      victory: sim.victory,
      muted: soundEngine.muted,
      statusBanner: sim.statusBanner,
      compassBearingDeg,
      gameMode: netManager.mode,
      partyCode: netManager.partyCode,
      callsign: netManager.callsign,
      team: netManager.team,
      isHost: netManager.isHost,
      pingMs: netManager.pingMs,
      pingHistory: [...netManager.pingHistory],
      transportLabel: netManager.transportLabel,
      squadRoster: netManager.getPlayers(),
      killfeed: sim.killfeed,
      scoreboardOpen: sim.scoreboardOpen,
      spawnShieldActive: sim.spawnShieldTimer > 0,
    });
  };

  const rebuildIntactBarricadeMeshList = () => {
    intactBarricadeMeshes = [];
    for (let i = 0; i < activeBarricades.length; i++) {
      const b = activeBarricades[i];
      for (let p = 0; p < b.planks.length; p++) {
        const plank = b.planks[p];
        for (let c = 0; c < plank.chunks.length; c++) {
          const chunk = plank.chunks[c];
          const m = barricadeChunkMeshMap.get(chunk.id);
          if (!m) continue;
          const isChunkVisible = !b.collapsed && plank.intact && chunk.intact;
          m.visible = isChunkVisible;
          if (isChunkVisible) {
            intactBarricadeMeshes.push(m);
          }
        }
      }
    }
  };

  const spawnRigidBodyDebris = (specs: DebrisSpawnSpec[]) => {
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const sx = Math.max(0.05, spec.sx);
      const sy = Math.max(0.05, spec.sy);
      const sz = Math.max(0.05, spec.sz);
      const geo = createUVMappedWoodGeometry(
        sx,
        sy,
        sz,
        { x: Math.random() * 0.45, y: Math.random() * 0.45 },
        { x: spec.isFullPlank ? 1.0 : 0.35, y: 0.16 }
      );
      const debMesh = new THREE.Mesh(geo, woodPlankMat);
      debMesh.position.set(spec.x, spec.y, spec.z);
      debMesh.castShadow = !isSoftwareGl;
      debMesh.receiveShadow = !isSoftwareGl;
      debrisGroup.add(debMesh);

      activeWoodDebris.push({
        mesh: debMesh,
        vx: spec.vx,
        vy: spec.vy,
        vz: spec.vz,
        rx: spec.rx,
        ry: spec.ry,
        rz: spec.rz,
        halfY: sy * 0.5,
        age: 0,
        settled: false,
      });

      if (activeWoodDebris.length > 75) {
        const oldest = activeWoodDebris.shift();
        if (oldest) {
          debrisGroup.remove(oldest.mesh);
          oldest.mesh.geometry.dispose();
        }
      }
    }
  };

  // Build 3D CQB Map Geometry, Populate Room-Grid Spatial Hash & Spawn AI Combatants
  const buildMapScene = (seed: number, layoutOverride?: MapLayoutVariant) => {
    const chosenLayout =
      layoutOverride ??
      (selectedLayoutRef.current === 'random' ? undefined : selectedLayoutRef.current);
    currentMap = generateCQBMap(seed, chosenLayout);
    validateMapGeometry(currentMap);

    disposeGroupChildren(mapGroup, sharedMaterials);
    disposeGroupChildren(barricadeGroup, sharedMaterials);
    disposeGroupChildren(debrisGroup, sharedMaterials);
    disposeGroupChildren(enemiesGroup, sharedMaterials);

    wallMeshes = [];
    splatterTargetMeshes = [];
    activeEnemies = [];
    activeBarricades = [];
    barricadeChunkMeshMap.clear();
    intactBarricadeMeshes = [];
    activeWoodDebris = [];
    activeLightFixtures = [];
    lightBulbHitMeshes = [];
    activeLockers = [];
    spatialWallHash.clear();
    spatialBarricadeHash.clear();
    spatialSplatterHash.clear();
    resetDecalRingPool();

    for (let i = 0; i < activeGrenades.length; i++) {
      disposeGroupChildren(activeGrenades[i].mesh, sharedMaterials);
      scene.remove(activeGrenades[i].mesh);
    }
    activeGrenades = [];
    sim.grenades = INITIAL_GRENADES;
    resetParticles();

    const spawnRoom = currentMap.rooms[0];
    const eastOpen = spawnRoom.doors.east;

    for (let i = 0; i < currentMap.rooms.length; i++) {
      const room = currentMap.rooms[i];
      const roomFloorGeo = new THREE.PlaneGeometry(room.width + 0.34, room.depth + 0.34);
      const roomFloorMesh = new THREE.Mesh(roomFloorGeo, floorMat);
      roomFloorMesh.rotation.x = -Math.PI / 2;
      roomFloorMesh.position.set(room.centerX, 0, room.centerZ);
      roomFloorMesh.receiveShadow = !isSoftwareGl;
      const floorAabb: AABB = {
        id: `floor-${room.gx}-${room.gz}`,
        kind: 'wall',
        minX: room.minX,
        maxX: room.maxX,
        minY: -0.1,
        maxY: 0.1,
        minZ: room.minZ,
        maxZ: room.maxZ,
      };
      roomFloorMesh.userData = { materialTag: 'concrete' as SurfaceMaterialTag, aabb: floorAabb };
      mapGroup.add(roomFloorMesh);
      splatterTargetMeshes.push(roomFloorMesh);
      registerMeshInSpatialHash(spatialSplatterHash, roomFloorMesh, floorAabb);

      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(room.width - 0.6, 0.18, 0.28),
        beamMat
      );
      beam.position.set(room.centerX, currentMap.wallHeight - 0.09, room.centerZ);
      mapGroup.add(beam);
    }

    // Populate Shootable 1-HP Ceiling Light Fixtures
    for (let i = 0; i < currentMap.lightFixtures.length; i++) {
      const fixture = currentMap.lightFixtures[i];
      const isEntryFixture =
        fixture.roomGx === spawnRoom.gx && fixture.roomGz === spawnRoom.gz;
      const fx = isEntryFixture ? (eastOpen ? 7.35 : 4.0) : fixture.x;
      const fy = isEntryFixture ? 2.46 : fixture.y;
      const fz = isEntryFixture ? (eastOpen ? 4.0 : 7.35) : fixture.z;
      fixture.x = fx;
      fixture.y = fy;
      fixture.z = fz;
      fixture.aabb = {
        id: fixture.aabb.id,
        kind: 'light',
        minX: fx - 0.34,
        maxX: fx + 0.34,
        minY: fy - 0.28,
        maxY: fy + 0.28,
        minZ: fz - 0.34,
        maxZ: fz + 0.34,
      };

      const stripMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
      const stripMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.16), stripMat);
      stripMesh.position.set(fx, fy + 0.16, fz);
      mapGroup.add(stripMesh);

      const socketMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.22, 0.08, 12),
        socketMat
      );
      socketMesh.position.set(fx, fy + 0.1, fz);
      mapGroup.add(socketMesh);

      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
      const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), bulbMat);
      bulbMesh.position.set(fx, fy, fz);
      mapGroup.add(bulbMesh);

      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), hitMat);
      hitMesh.position.set(fx, fy, fz);
      hitMesh.userData = { lightFixtureId: fixture.id };
      mapGroup.add(hitMesh);
      lightBulbHitMeshes.push(hitMesh);

      const pointLight = new THREE.PointLight(0xfff4d6, 5.2, 13.5, 1.45);
      pointLight.position.set(fx, fy - 0.08, fz);
      mapGroup.add(pointLight);

      activeLightFixtures.push({
        spec: fixture,
        pointLight,
        bulbMesh,
        hitMesh,
        stripMesh,
      });
    }

    // Build Wall & Lintel Segments with Material Tags & Room-Grid Spatial Hash Registration
    for (let i = 0; i < currentMap.wallSegments.length; i++) {
      const seg = currentMap.wallSegments[i];
      const sx = seg.maxX - seg.minX;
      const sy = seg.maxY - seg.minY;
      const sz = seg.maxZ - seg.minZ;
      const geo = new THREE.BoxGeometry(sx, sy, sz);
      const matTag: SurfaceMaterialTag = seg.materialTag || 'concrete';
      const mat =
        seg.kind === 'pillar'
          ? pillarMat
          : matTag === 'drywall'
          ? drywallPartitionMat
          : concreteWallMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (seg.minX + seg.maxX) * 0.5,
        (seg.minY + seg.maxY) * 0.5,
        (seg.minZ + seg.maxZ) * 0.5
      );
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      mesh.userData = {
        materialTag: matTag,
        aabb: seg,
      };
      mapGroup.add(mesh);
      wallMeshes.push(mesh);
      splatterTargetMeshes.push(mesh);
      registerMeshInSpatialHash(spatialWallHash, mesh, seg);
      registerMeshInSpatialHash(spatialSplatterHash, mesh, seg);
    }

    // Build Non-Overlapping Steel Door Frames
    for (let i = 0; i < currentMap.doorFrameSegments.length; i++) {
      const frame = currentMap.doorFrameSegments[i];
      const sx = frame.maxX - frame.minX;
      const sy = frame.maxY - frame.minY;
      const sz = frame.maxZ - frame.minZ;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), steelFrameMat);
      mesh.position.set(
        (frame.minX + frame.maxX) * 0.5,
        (frame.minY + frame.maxY) * 0.5,
        (frame.minZ + frame.maxZ) * 0.5
      );
      mesh.userData = {
        materialTag: 'steel' as SurfaceMaterialTag,
        aabb: frame,
      };
      mapGroup.add(mesh);
      wallMeshes.push(mesh);
      registerMeshInSpatialHash(spatialWallHash, mesh, frame);
    }

    // Build Varied Procedural Cover Props
    for (let i = 0; i < currentMap.coverProps.length; i++) {
      const prop = currentMap.coverProps[i];
      const sx = prop.maxX - prop.minX;
      const sy = prop.maxY - prop.minY;
      const sz = prop.maxZ - prop.minZ;
      const cx = (prop.minX + prop.maxX) * 0.5;
      const cz = (prop.minZ + prop.maxZ) * 0.5;
      const propMatTag: SurfaceMaterialTag = prop.materialTag || 'steel';

      if (prop.kind === 'desk') {
        const desk = buildTacticalDeskModel(sx, sy, sz);
        desk.position.set(cx, 0, cz);
        desk.userData = { materialTag: propMatTag, aabb: prop };
        mapGroup.add(desk);
        desk.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = !isSoftwareGl;
            child.receiveShadow = !isSoftwareGl;
            child.userData = { materialTag: propMatTag, aabb: prop };
            wallMeshes.push(child);
            splatterTargetMeshes.push(child);
            registerMeshInSpatialHash(spatialWallHash, child, prop);
            registerMeshInSpatialHash(spatialSplatterHash, child, prop);
          }
        });
      } else if (prop.kind === 'server') {
        const server = buildServerRackModel(sx, sy, sz);
        server.position.set(cx, 0, cz);
        server.userData = { materialTag: propMatTag, aabb: prop };
        mapGroup.add(server);
        server.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = !isSoftwareGl;
            child.receiveShadow = !isSoftwareGl;
            child.userData = { materialTag: propMatTag, aabb: prop };
            wallMeshes.push(child);
            splatterTargetMeshes.push(child);
            registerMeshInSpatialHash(spatialWallHash, child, prop);
            registerMeshInSpatialHash(spatialSplatterHash, child, prop);
          }
        });
      } else if (prop.kind === 'barrier') {
        const barrier = buildConcreteBarrierModel(sx, sy, sz);
        barrier.position.set(cx, 0, cz);
        barrier.userData = { materialTag: propMatTag, aabb: prop };
        mapGroup.add(barrier);
        barrier.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = !isSoftwareGl;
            child.receiveShadow = !isSoftwareGl;
            child.userData = { materialTag: propMatTag, aabb: prop };
            wallMeshes.push(child);
            splatterTargetMeshes.push(child);
            registerMeshInSpatialHash(spatialWallHash, child, prop);
            registerMeshInSpatialHash(spatialSplatterHash, child, prop);
          }
        });
      } else {
        const crateBase = new THREE.Mesh(
          new THREE.BoxGeometry(sx, sy * 0.86, sz),
          propMatTag === 'drywall' ? crateDrywallMat : crateSteelMat
        );
        crateBase.position.set(cx, sy * 0.43, cz);
        crateBase.castShadow = !isSoftwareGl;
        crateBase.receiveShadow = !isSoftwareGl;
        crateBase.userData = {
          materialTag: propMatTag,
          aabb: prop,
        };
        mapGroup.add(crateBase);
        wallMeshes.push(crateBase);
        splatterTargetMeshes.push(crateBase);
        registerMeshInSpatialHash(spatialWallHash, crateBase, prop);
        registerMeshInSpatialHash(spatialSplatterHash, crateBase, prop);

        const crateLid = new THREE.Mesh(
          new THREE.BoxGeometry(sx * 1.04, sy * 0.14, sz * 1.04),
          crateAccentMat
        );
        crateLid.position.set(cx, sy * 0.93, cz);
        mapGroup.add(crateLid);
      }
    }

    // Build 12-Plank Rainbow Six Siege Style Destructible Wooden Barricades
    for (let i = 0; i < currentMap.doorways.length; i++) {
      const door = currentMap.doorways[i];
      const barState = createBarricadeForDoorway(door);
      activeBarricades.push(barState);

      for (let p = 0; p < barState.planks.length; p++) {
        const plank = barState.planks[p];
        for (let c = 0; c < plank.chunks.length; c++) {
          const chunk = plank.chunks[c];
          const sx = chunk.aabb.maxX - chunk.aabb.minX;
          const sy = chunk.aabb.maxY - chunk.aabb.minY;
          const sz = chunk.aabb.maxZ - chunk.aabb.minZ;
          const geo = createUVMappedWoodGeometry(
            sx,
            sy,
            sz,
            chunk.uvOffset,
            chunk.uvRepeat
          );

          const isYellowX =
            ((plank.plankIndex === 4 || plank.plankIndex === 7) &&
              (chunk.chunkIndex === 1 || chunk.chunkIndex === 4)) ||
            ((plank.plankIndex === 5 || plank.plankIndex === 6) &&
              (chunk.chunkIndex === 2 || chunk.chunkIndex === 3));
          const isSideStrap = chunk.chunkIndex === 0 || chunk.chunkIndex === 5;
          const mat = isYellowX
            ? woodYellowXMat
            : isSideStrap
            ? woodStrapMat
            : woodPlankMat;

          const chunkMesh = new THREE.Mesh(geo, mat);
          chunkMesh.position.set(
            (chunk.aabb.minX + chunk.aabb.maxX) * 0.5,
            (chunk.aabb.minY + chunk.aabb.maxY) * 0.5,
            (chunk.aabb.minZ + chunk.aabb.maxZ) * 0.5
          );
          chunkMesh.castShadow = !isSoftwareGl;
          chunkMesh.receiveShadow = !isSoftwareGl;
          chunkMesh.userData = {
            materialTag: 'wood' as SurfaceMaterialTag,
            aabb: chunk.aabb,
            barricadeId: barState.id,
            plankIndex: plank.plankIndex,
            chunkIndex: chunk.chunkIndex,
          };

          barricadeGroup.add(chunkMesh);
          barricadeChunkMeshMap.set(chunk.id, chunkMesh);
          intactBarricadeMeshes.push(chunkMesh);
          splatterTargetMeshes.push(chunkMesh);
          registerMeshInSpatialHash(spatialBarricadeHash, chunkMesh, chunk.aabb);
          registerMeshInSpatialHash(spatialSplatterHash, chunkMesh, chunk.aabb);
        }
      }
    }

    // Build Interactive Proximity Ambush Lockers
    for (let i = 0; i < currentMap.lockerAmbushes.length; i++) {
      const lockerSpec = currentMap.lockerAmbushes[i];
      const lockerModel = buildTacticalLockerModel();
      lockerModel.group.position.set(lockerSpec.x, lockerSpec.y, lockerSpec.z);
      lockerModel.group.rotation.y = lockerSpec.facingYaw;
      lockerModel.group.userData = {
        materialTag: 'steel' as SurfaceMaterialTag,
        aabb: lockerSpec.aabb,
      };
      mapGroup.add(lockerModel.group);
      lockerModel.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = !isSoftwareGl;
          child.receiveShadow = !isSoftwareGl;
          child.userData = {
            materialTag: 'steel' as SurfaceMaterialTag,
            aabb: lockerSpec.aabb,
          };
          wallMeshes.push(child);
          splatterTargetMeshes.push(child);
          registerMeshInSpatialHash(spatialWallHash, child, lockerSpec.aabb);
          registerMeshInSpatialHash(spatialSplatterHash, child, lockerSpec.aabb);
        }
      });
      activeLockers.push({ spec: lockerSpec, model: lockerModel });
    }

    const spawnCombatantUnit = (
      sp: EnemySpawnSpec,
      idx: number,
      isEntryTarget = false,
      forceAgro = false
    ) => {
      const built = buildEnemyCombatantModel(sp.id, sp.archetype);
      const spawnX = isEntryTarget ? (eastOpen ? 9.25 : 4.0) : sp.x;
      const spawnZ = isEntryTarget ? (eastOpen ? 4.0 : 9.25) : sp.z;
      built.group.position.set(spawnX, 0, spawnZ);
      enemiesGroup.add(built.group);

      const maxMag = sp.archetype === 'breacher' ? 8 : sp.archetype === 'marksman' ? 12 : 20;
      activeEnemies.push({
        id: sp.id,
        archetype: sp.archetype,
        hp: 100,
        maxHp: 100,
        mag: maxMag,
        maxMag,
        isReloading: false,
        reloadTimer: 0,
        timeSinceLastSeenSec: forceAgro ? 0 : 99,
        state: forceAgro ? 'combat' : 'patrol',
        group: built.group,
        hitMeshes: built.hitMeshes,
        muzzlePoint: built.muzzlePoint,
        laserLine: built.laserLine,
        bones: built.bones,
        weaponSocket: built.weaponSocket,
        handguardSocket: built.handguardSocket,
        blendWeights: { idle: 1.0, walk: 0.0, sprint: 0.0, flinch: 0.0 },
        animPhase: Math.random() * Math.PI * 2,
        flinchTimer: 0,
        locomotion: forceAgro ? 'sprint' : 'idle',
        patrolPoints: isEntryTarget
          ? [
              { x: spawnX, z: spawnZ },
              { x: spawnX + (eastOpen ? 0.6 : 0), z: spawnZ + (!eastOpen ? 0.6 : 0) },
            ]
          : sp.patrolPoints,
        patrolIdx: 0,
        fireCooldown: forceAgro ? 0.35 : 0.8 + Math.random() * 0.7,
        footstepTimer: 0.25 + idx * 0.12,
        telegraphTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        strafeSign: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.5,
        canSeePlayer: forceAgro,
        prevCanSeePlayer: false,
        shoutCooldownTimer: forceAgro ? 0 : 1.0 + idx * 0.75,
        effectiveVisionRange: 22.0,
        lastSeenPlayerPos: forceAgro
          ? { x: sim.playerBodyPos.x, z: sim.playerBodyPos.z }
          : null,
        ragdoll: null,
      });
    };

    for (let idx = 0; idx < currentMap.enemySpawns.length; idx++) {
      spawnCombatantUnit(currentMap.enemySpawns[idx], idx, idx === 0, false);
    }

    // Team-based spawn selection: Defenders in PVP_VERSUS spawn in Command Core, Attackers/Solo/Co-Op at Breach Entry
    if (netManager.mode === 'PVP_VERSUS' && netManager.team === 'DEFENDERS') {
      const defSpawn = computeTeamSpawnPoint(currentMap, netManager.team, netManager.mode, 0);
      sim.playerBodyPos.set(defSpawn.x, defSpawn.y, defSpawn.z);
      sim.playerYaw = defSpawn.yaw;
    } else {
      sim.playerBodyPos.set(
        eastOpen ? 6.15 : 4.0,
        currentMap.playerSpawn.y,
        eastOpen ? 4.0 : 6.15
      );
      sim.playerYaw = currentMap.playerSpawn.yaw;
    }
    sim.playerPitch = 0;
    camera.rotation.set(0, sim.playerYaw, 0, 'YXZ');
    camera.position.copy(sim.playerBodyPos);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
  };

  // Ring-Buffer Blood & Scorch Decal Projector (Zero Geometry/Material Leaks)
  const projectBloodDecal = (hitPoint: THREE.Vector3, bulletDir: THREE.Vector3) => {
    _rayOrigin.copy(hitPoint).addScaledVector(bulletDir, 0.06);
    _decalRaycaster.set(_rayOrigin, bulletDir);
    _decalRaycaster.near = 0.02;
    _decalRaycaster.far = 7.5;

    // Query spatial splatter targets in hit room
    _queriedSplatterMeshes.length = 0;
    const hitRoom = findRoomAtPosition(currentMap, hitPoint.x, hitPoint.z);
    const roomSplatter = spatialSplatterHash.get(`${hitRoom.gx},${hitRoom.gz}`);
    const targetList =
      roomSplatter && roomSplatter.length > 0 ? roomSplatter : splatterTargetMeshes;

    const hits = _decalRaycaster.intersectObjects(targetList, false);
    let surfaceHit: THREE.Intersection | null = null;
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].object.visible) {
        surfaceHit = hits[i];
        break;
      }
    }
    if (!surfaceHit || !surfaceHit.face) return;

    _hitNormal
      .copy(surfaceHit.face.normal)
      .transformDirection(surfaceHit.object.matrixWorld)
      .normalize();
    const decalSize = 0.65 + Math.random() * 0.55;

    const slot = decalRingPool[decalRingCursor];
    decalRingCursor = (decalRingCursor + 1) % MAX_DECAL_RING_BUFFER;
    totalDecalsSpawnedCount += 1;

    slot.mat.map = activeProceduralTextures.bloodTexture;
    slot.mat.color.setHex(0xffffff);
    slot.mat.opacity = 0.92;
    slot.mat.needsUpdate = true;

    slot.mesh.visible = true;
    slot.mesh.scale.set(decalSize, decalSize, 1);
    slot.mesh.position.copy(surfaceHit.point).addScaledVector(_hitNormal, 0.016);
    _decalLookTarget.copy(slot.mesh.position).add(_hitNormal);
    slot.mesh.lookAt(_decalLookTarget);
    slot.mesh.rotation.z += (Math.random() - 0.5) * 0.6;

    if (Math.abs(_hitNormal.y) < 0.35) {
      slot.hasDrip = true;
      slot.dripMesh.visible = true;
      slot.dripMesh.position.copy(slot.mesh.position).addScaledVector(_hitNormal, 0.004);
      slot.dripMesh.lookAt(_decalLookTarget);
      slot.dripMesh.scale.set(1, 0.05, 1);
    } else {
      slot.hasDrip = false;
      slot.dripMesh.visible = false;
    }

    slot.active = true;
    slot.age = 0;
    slot.maxDripScale = 1.6 + Math.random() * 1.4;
  };

  const spawnScorchDecal = (x: number, z: number) => {
    const slot = decalRingPool[decalRingCursor];
    decalRingCursor = (decalRingCursor + 1) % MAX_DECAL_RING_BUFFER;
    slot.mat.map = null;
    slot.mat.color.setHex(0x050608);
    slot.mat.opacity = 0.85;
    slot.mat.needsUpdate = true;
    slot.mesh.visible = true;
    slot.mesh.scale.set(2.4, 2.4, 1);
    slot.mesh.position.set(x, 0.02, z);
    slot.mesh.rotation.set(-Math.PI / 2, 0, 0);
    slot.hasDrip = false;
    slot.dripMesh.visible = false;
    slot.active = true;
    slot.age = 99;
  };

  // Pre-allocated enemy hit mesh scratch array
  const _enemyHitMeshes: THREE.Mesh[] = [];

  const firePlayerWeapon = (bypassColtAdsCockDelay = false) => {
    if (sim.screen !== 'playing') return;

    if (sim.activeWeapon === 'combat_knife') {
      triggerMeleeStrike();
      return;
    }

    const spec = WEAPONS[sim.activeWeapon];
    const wState = sim.weapons[sim.activeWeapon];
    const eff = wState.effectiveStats;

    if (
      sim.activeWeapon === 'colt_saa' &&
      sim.isReloading &&
      coltReloadState.active &&
      wState.mag > 0
    ) {
      coltReloadState.active = false;
      coltReloadState.phase = 'idle';
      coltReloadState.gateAngleRad = 0;
      coltReloadState.ejectorRodOffsetZ = 0;
      coltReloadState.insertingCartridgeProgress = 0;
      coltReloadState.ejectingCasingProgress = 0;
      sim.isReloading = false;
      sim.reloadTimer = 0;
      soundEngine.playRevolverGateLatch(false);
    }

    if (coltSpinState.active) {
      coltSpinState.active = false;
      coltSpinState.spinType = 'none';
      coltSpinState.phase = 'idle';
    }

    if (wState.mag <= 0 && !sim.isReloading) {
      startReload();
      return;
    }

    if (
      !canPlayerFire({
        isReloading: sim.isReloading,
        reloadTimer: sim.reloadTimer,
        currentMag: wState.mag,
        fireCooldown: sim.fireCooldown,
      })
    ) {
      return;
    }

    const coltFireParams =
      sim.activeWeapon === 'colt_saa' ? evaluateColtSAAFireMode(sim.isAds) : null;
    if (
      coltFireParams &&
      coltFireParams.mode === 'single_action_ads' &&
      !bypassColtAdsCockDelay
    ) {
      if (coltPendingAdsShot) return;
      coltPendingAdsShot = true;
      coltHammerCockTimer = coltFireParams.hammerCockDelaySec;
      soundEngine.playRevolverHammerCock();
      return;
    }

    wState.mag -= 1;
    sim.shotsFired += 1;
    sim.fireCooldown = coltFireParams ? coltFireParams.fireIntervalSec : 60 / spec.rpm;
    sim.muzzleFlashTimer = 0.055;

    if (coltFireParams) {
      coltReloadState.cylinderAngleRad += Math.PI / 3;
      if (coltFireParams.mode === 'fanning_hip') {
        coltFanningSlapTimer = 0.14;
        soundEngine.playRevolverHammerCock();
      }
    }

    const crouchRecoilFactor = 1.0 - 0.3 * (sim.crouchProgress ?? 0);
    sim.recoilKickZ = (spec.pellets > 1 ? 0.068 : 0.042) * crouchRecoilFactor;
    soundEngine.playGunshot(sim.activeWeapon, false, false, eff.isSuppressed);

    applyWeaponSpringRecoilImpulse(
      weaponSpring,
      eff.recoilPattern.vertical * crouchRecoilFactor,
      (Math.random() - 0.5) * eff.recoilPattern.horizontal * 2.0 * crouchRecoilFactor,
      sim.isAds
    );

    const baseSpread = coltFireParams
      ? coltFireParams.spreadRad
      : sim.isAds
      ? eff.spreadAds
      : eff.spreadHip;
    const spread = baseSpread * crouchRecoilFactor;
    const baseYaw = sim.playerYaw;
    const basePitch = sim.playerPitch;
    const pelletCount = spec.pellets || 1;

    camera.getWorldDirection(_bulletDir);
    netManager.broadcastWorldEvent({
      type: 'FIRE_SHOT',
      shooterId: netManager.localPlayerId,
      callsign: netManager.callsign,
      team: netManager.team,
      weaponId: sim.activeWeapon,
      origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      dir: { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
      isSuppressed: eff.isSuppressed,
    });

    // Collect active enemy hit meshes once outside pellet loop
    _enemyHitMeshes.length = 0;
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state !== 'ko') {
        for (let m = 0; m < e.hitMeshes.length; m++) {
          _enemyHitMeshes.push(e.hitMeshes[m]);
        }
      }
    }
    if (netManager.mode === 'PVP_VERSUS') {
      for (const remNode of remotePlayerNodes.values()) {
        if (remNode.lastHp > 0) {
          for (let m = 0; m < remNode.hitMeshes.length; m++) {
            _enemyHitMeshes.push(remNode.hitMeshes[m]);
          }
        }
      }
    }

    for (let pelletIdx = 0; pelletIdx < pelletCount; pelletIdx++) {
      camera.rotation.y = baseYaw;
      camera.rotation.x = basePitch;
      camera.updateMatrixWorld();
      camera.getWorldDirection(_bulletDir);
      _bulletDir.x += (Math.random() - 0.5) * spread;
      _bulletDir.y += (Math.random() - 0.5) * spread;
      _bulletDir.z += (Math.random() - 0.5) * spread;
      _bulletDir.normalize();

      _shotRaycaster.set(camera.position, _bulletDir);
      _shotRaycaster.near = 0.08;
      _shotRaycaster.far = 60;

      // Room-Grid Spatial Hash query: only test walls & barricades in traversed rooms
      const spatialEnv = querySpatialMeshesAlongRay(
        { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
        60
      );

      const bulbHits = _shotRaycaster.intersectObjects(lightBulbHitMeshes, false);
      const wallHits = _shotRaycaster.intersectObjects(spatialEnv.walls, false);
      const firstWallDist = wallHits.length > 0 ? wallHits[0].distance : Infinity;

      let hitFixtureNode: ActiveLightFixtureNode | undefined;
      let hitFixturePoint: { x: number; y: number; z: number } | undefined;

      if (bulbHits.length > 0 && bulbHits[0].distance < firstWallDist) {
        const bHit = bulbHits[0];
        const { lightFixtureId } = bHit.object.userData as { lightFixtureId: string };
        const candidate = activeLightFixtures.find((f) => f.spec.id === lightFixtureId);
        if (candidate && candidate.spec.intact) {
          hitFixtureNode = candidate;
          hitFixturePoint = { x: bHit.point.x, y: bHit.point.y, z: bHit.point.z };
        }
      } else if (_bulletDir.y > 0.14) {
        for (let i = 0; i < activeLightFixtures.length; i++) {
          const fNode = activeLightFixtures[i];
          if (!fNode.spec.intact) continue;
          const dx = fNode.spec.x - camera.position.x;
          const dy = fNode.spec.y - camera.position.y;
          const dz = fNode.spec.z - camera.position.z;
          const dist = Math.hypot(dx, dy, dz);
          if (dist > 0.1 && dist < Math.min(firstWallDist, 6.5)) {
            const dot = (dx * _bulletDir.x + dy * _bulletDir.y + dz * _bulletDir.z) / dist;
            if (dot > 0.78) {
              hitFixtureNode = fNode;
              hitFixturePoint = { x: fNode.spec.x, y: fNode.spec.y, z: fNode.spec.z };
              break;
            }
          }
        }
      }

      if (hitFixtureNode && hitFixturePoint) {
        const shotRes = shootLightFixture(hitFixtureNode.spec);
        if (shotRes.destroyed) {
          hitFixtureNode.bulbMesh.visible = false;
          hitFixtureNode.hitMesh.visible = false;
          hitFixtureNode.pointLight.intensity = 0;
          (hitFixtureNode.stripMesh.material as THREE.MeshBasicMaterial).color.setHex(
            0x1e293b
          );
          lightBulbHitMeshes = activeLightFixtures
            .filter((f) => f.spec.intact)
            .map((f) => f.hitMesh);

          spawnPoolBurst(
            sparkPool,
            hitFixturePoint,
            { x: 0, y: -1, z: 0 },
            28,
            3.2,
            7.8,
            0.25,
            0.55
          );
          soundEngine.playGlassShatter();
          showBanner('LIGHT FIXTURE SHATTERED · ROOM DARKENED (-80% AI VISION)', 2.0);
          netManager.broadcastWorldEvent({
            type: 'LIGHT_SHATTER',
            shooterId: netManager.localPlayerId,
            fixtureId: hitFixtureNode.spec.id,
            point: hitFixturePoint,
          });
          continue;
        }
      }

      const enemyHits = _shotRaycaster.intersectObjects(_enemyHitMeshes, false);
      const targetEnemyHit = enemyHits.length > 0 ? enemyHits[0] : null;
      const maxEvalDist = targetEnemyHit ? targetEnemyHit.distance : Infinity;

      const plankHits = _shotRaycaster.intersectObjects(spatialEnv.barricades, false);
      const combinedEnvHits = [...wallHits, ...plankHits].sort(
        (a, b) => a.distance - b.distance
      );

      const orderedSurfaceHits: Array<{
        distance: number;
        point: { x: number; y: number; z: number };
        materialTag: SurfaceMaterialTag;
        aabb: AABB;
        barricadeId?: string;
        plankIndex?: number;
        chunkIndex?: number;
      }> = [];
      const seenSurfaceKeys = new Set<string>();

      for (let i = 0; i < combinedEnvHits.length; i++) {
        const h = combinedEnvHits[i];
        if (targetEnemyHit && h.distance >= maxEvalDist) break;
        const uData = h.object.userData as {
          materialTag?: SurfaceMaterialTag;
          aabb?: AABB;
          barricadeId?: string;
          plankIndex?: number;
          chunkIndex?: number;
        };
        if (!uData || !uData.aabb) continue;

        const key = uData.barricadeId
          ? `bar-${uData.barricadeId}`
          : `aabb-${uData.aabb.minX}-${uData.aabb.minZ}-${uData.aabb.maxX}-${uData.aabb.maxZ}`;
        if (seenSurfaceKeys.has(key)) continue;
        seenSurfaceKeys.add(key);

        orderedSurfaceHits.push({
          distance: h.distance,
          point: { x: h.point.x, y: h.point.y, z: h.point.z },
          materialTag: uData.materialTag || 'concrete',
          aabb: uData.aabb,
          barricadeId: uData.barricadeId,
          plankIndex: uData.plankIndex,
          chunkIndex: uData.chunkIndex,
        });

        if (!targetEnemyHit && orderedSurfaceHits.length >= 2) break;
      }

      let hitZone: HitZone = 'torso';
      let hitBone: RagdollBoneId | undefined;
      let targetEnemy: ActiveEnemy | undefined;
      let targetRemoteNode: ActiveRemotePlayerNode | undefined;
      if (targetEnemyHit) {
        const meta = targetEnemyHit.object.userData as {
          enemyId: string;
          remotePlayerId?: string;
          hitZone: HitZone;
          hitBone?: RagdollBoneId;
        };
        hitZone = meta.hitZone;
        hitBone = meta.hitBone;
        if (meta.remotePlayerId) {
          targetRemoteNode = remotePlayerNodes.get(meta.remotePlayerId);
        } else {
          targetEnemy = activeEnemies.find((e) => e.id === meta.enemyId);
        }
      }

      const rawDmg = calculateBallisticDamage(sim.activeWeapon, hitZone, Math.random());

      const reflectDir = {
        x: -_bulletDir.x,
        y: -_bulletDir.y,
        z: -_bulletDir.z,
      };
      const forwardDir = {
        x: _bulletDir.x,
        y: _bulletDir.y,
        z: _bulletDir.z,
      };

      let currentDamage = rawDmg;
      let bulletStopped = false;
      let penetratedCount = 0;
      let penetratedMaterialLabel: string | null = null;

      for (let i = 0; i < orderedSurfaceHits.length; i++) {
        const surfSpec = orderedSurfaceHits[i];
        const bEval = evaluateMaterialBallistics({
          materialTag: surfSpec.materialTag,
          weaponId: sim.activeWeapon,
          incomingDamage: currentDamage,
          origin: {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          },
          dir: forwardDir,
          surfaceAABB: surfSpec.aabb,
        });

        const entryPt = bEval.entryPoint || surfSpec.point;

        if (bEval.materialTag === 'concrete' || bEval.materialTag === 'steel') {
          if (bEval.spawnSparks && pelletIdx === 0) {
            spawnPoolBurst(
              sparkPool,
              entryPt,
              reflectDir,
              bEval.materialTag === 'steel' ? 22 : 14,
              3.0,
              6.8,
              0.16,
              0.36
            );
          }
          if (bEval.spawnGrayDust && pelletIdx === 0) {
            spawnPoolBurst(
              grayDustPool,
              entryPt,
              reflectDir,
              16,
              1.1,
              3.0,
              0.32,
              0.62
            );
          }
          if (pelletIdx === 0) soundEngine.playSurfaceImpact(bEval.materialTag);
        } else if (bEval.materialTag === 'drywall') {
          if (bEval.spawnGypsumEntryExit && pelletIdx === 0) {
            spawnPoolBurst(
              gypsumDustPool,
              entryPt,
              reflectDir,
              18,
              1.3,
              3.2,
              0.35,
              0.68
            );
            if (bEval.penetrated && bEval.exitPoint) {
              spawnPoolBurst(
                gypsumDustPool,
                bEval.exitPoint,
                forwardDir,
                20,
                1.8,
                4.0,
                0.36,
                0.72
              );
              penetratedMaterialLabel = 'DRYWALL (-40% DMG)';
            }
          }
          if (pelletIdx === 0) soundEngine.playSurfaceImpact('drywall');
        } else if (bEval.materialTag === 'wood' && surfSpec.barricadeId) {
          const targetBar = activeBarricades.find((b) => b.id === surfSpec.barricadeId);
          if (
            targetBar &&
            !targetBar.collapsed &&
            surfSpec.plankIndex !== undefined &&
            surfSpec.chunkIndex !== undefined
          ) {
            const bRes = applyBulletToBarricade(
              targetBar,
              surfSpec.plankIndex,
              surfSpec.chunkIndex,
              sim.activeWeapon,
              forwardDir
            );
            _hitPoint.set(entryPt.x, entryPt.y, entryPt.z);
            spawnWoodSplinterBurst(_hitPoint, _bulletDir, pelletCount > 1 ? 6 : 15);
            spawnRigidBodyDebris(bRes.debris);
            rebuildIntactBarricadeMeshList();

            netManager.broadcastWorldEvent({
              type: 'BARRICADE_DAMAGE',
              shooterId: netManager.localPlayerId,
              barricadeId: targetBar.id,
              plankIndex: surfSpec.plankIndex,
              chunkIndex: surfSpec.chunkIndex,
              weaponId: sim.activeWeapon,
              dir: forwardDir,
              isMelee: false,
            });

            if (bRes.totalCollapseTriggered) {
              soundEngine.playBarricadeCollapse();
              showBanner('BARRICADE COLLAPSED (40% PLANK FAILURE)', 2.0);
            } else if (pelletIdx === 0) {
              soundEngine.playWoodSplinter(false);
            }
            penetratedMaterialLabel = 'WOOD (-30% DMG)';
          }
        }

        if (!bEval.penetrated) {
          bulletStopped = true;
          currentDamage = 0;
          break;
        } else {
          penetratedCount += 1;
          currentDamage = bEval.outgoingDamage;
        }
      }

      // PvP Remote Player Impact
      if (
        targetEnemyHit &&
        targetRemoteNode &&
        targetRemoteNode.lastHp > 0 &&
        !bulletStopped &&
        currentDamage > 0
      ) {
        const dmg = currentDamage;
        const didWallBang = penetratedCount > 0;
        if (didWallBang && pelletIdx === 0) {
          sim.wallBangHits += 1;
        }
        if (pelletIdx === 0) {
          sim.shotsHit += 1;
        }
        const isHeadshot = hitZone === 'head';
        targetRemoteNode.lastHp = Math.max(0, targetRemoteNode.lastHp - dmg);
        targetRemoteNode.flinchTimer = 0.35;
        const fatal = targetRemoteNode.lastHp <= 0;

        if (pelletIdx === 0 || fatal) {
          soundEngine.playHitMarker(isHeadshot);
        }
        triggerHitMarker(isHeadshot, 0.095);

        _hitPoint.copy(targetEnemyHit.point);
        spawnDirectionalBloodBurst(_hitPoint, _bulletDir, isHeadshot ? 26 : 18);
        projectBloodDecal(_hitPoint, _bulletDir);

        if (fatal && netManager.tryClaimFatalHit(targetRemoteNode.id)) {
          sim.kills += 1;
          if (isHeadshot) sim.headshots += 1;
          pushKillfeedEntry({
            attackerCallsign: netManager.callsign,
            attackerTeam: netManager.team,
            victimCallsign: targetRemoteNode.callsign,
            weaponId: sim.activeWeapon,
            isHeadshot,
            isWallBang: didWallBang,
          });
          showBanner(
            `PVP ELIMINATION · ${targetRemoteNode.callsign} (${spec.shortName})`,
            1.8
          );
          setTimeout(() => netManager.releaseFatalClaim(targetRemoteNode!.id), 1500);
        }

        netManager.broadcastWorldEvent({
          type: 'PLAYER_HIT',
          attackerId: netManager.localPlayerId,
          attackerCallsign: netManager.callsign,
          attackerTeam: netManager.team,
          weaponId: sim.activeWeapon,
          targetId: targetRemoteNode.id,
          targetCallsign: targetRemoteNode.callsign,
          targetIsAI: false,
          damage: dmg,
          hitZone,
          hitBone,
          isHeadshot,
          isWallBang: didWallBang,
          hitPoint: { x: _hitPoint.x, y: _hitPoint.y, z: _hitPoint.z },
          impactDir: { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
          fatal,
        });
      }

      // AI Enemy Impact
      if (
        targetEnemyHit &&
        targetEnemy &&
        targetEnemy.state !== 'ko' &&
        !bulletStopped &&
        currentDamage > 0
      ) {
        const dmg = currentDamage;
        const didWallBang = penetratedCount > 0;
        if (didWallBang && pelletIdx === 0) {
          sim.wallBangHits += 1;
        }

        targetEnemy.hp = Math.max(0, targetEnemy.hp - dmg);
        targetEnemy.hitFlashTimer = 0.06;
        targetEnemy.flinchTimer = 0.35;
        targetEnemy.state = 'combat';
        targetEnemy.lastSeenPlayerPos = {
          x: sim.playerBodyPos.x,
          z: sim.playerBodyPos.z,
        };

        if (pelletIdx === 0) {
          sim.shotsHit += 1;
        }
        const isHeadshot = hitZone === 'head';
        if (pelletIdx === 0 || targetEnemy.hp <= 0) {
          soundEngine.playHitMarker(isHeadshot);
        }

        triggerHitMarker(isHeadshot, 0.095);

        _hitPoint.copy(targetEnemyHit.point);
        spawnDirectionalBloodBurst(
          _hitPoint,
          _bulletDir,
          pelletCount > 1 ? 8 : isHeadshot ? 26 : 18
        );
        if (pelletIdx === 0 || targetEnemy.hp <= 0) {
          projectBloodDecal(_hitPoint, _bulletDir);
        }

        if (didWallBang && pelletIdx === 0) {
          _backTowardSurface.copy(_bulletDir).negate();
          projectBloodDecal(_hitPoint, _backTowardSurface);
        }

        if (isHeadshot || targetEnemy.hp <= 0) {
          _downDir.set(_bulletDir.x * 0.25, -0.95, _bulletDir.z * 0.25).normalize();
          projectBloodDecal(_hitPoint, _downDir);
        }

        const fatal = targetEnemy.hp <= 0;

        netManager.broadcastWorldEvent({
          type: 'PLAYER_HIT',
          attackerId: netManager.localPlayerId,
          attackerCallsign: netManager.callsign,
          attackerTeam: netManager.team,
          weaponId: sim.activeWeapon,
          targetId: targetEnemy.id,
          targetCallsign: `HOSTILE-${targetEnemy.archetype.toUpperCase()}`,
          targetIsAI: true,
          damage: dmg,
          hitZone,
          hitBone,
          isHeadshot,
          isWallBang: didWallBang,
          hitPoint: { x: _hitPoint.x, y: _hitPoint.y, z: _hitPoint.z },
          impactDir: { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
          fatal,
        });

        if (fatal && netManager.tryClaimFatalHit(targetEnemy.id)) {
          targetEnemy.state = 'ko';
          targetEnemy.koTimer = 0.001;
          targetEnemy.laserLine.visible = false;
          targetEnemy.ragdoll = createEnemyRagdoll({
            hitZone,
            hitBone,
            impactDir: { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
            impactForce:
              sim.activeWeapon === 'musket'
                ? 9.2
                : pelletCount > 1
                ? 6.8
                : isHeadshot
                ? 5.8
                : 4.6,
            initialYaw: targetEnemy.group.rotation.y,
            currentPos: {
              x: targetEnemy.group.position.x,
              y: targetEnemy.group.position.y,
              z: targetEnemy.group.position.z,
            },
          });
          sim.kills += 1;
          if (isHeadshot) sim.headshots += 1;
          sim.hitstopTimer = 0.04;
          pushKillfeedEntry({
            attackerCallsign: netManager.callsign,
            attackerTeam: netManager.team,
            victimCallsign: `TANGO (${targetEnemy.archetype.toUpperCase()})`,
            weaponId: sim.activeWeapon,
            isHeadshot,
            isWallBang: didWallBang,
          });
          showBanner(
            didWallBang
              ? `WALL-BANG ELIMINATION · ${penetratedMaterialLabel || 'PENETRATED'} · ${dmg} DMG`
              : isHeadshot
              ? `HEADSHOT ELIMINATION · ${spec.name}`
              : `TANGO NEUTRALIZED · ${spec.name}`,
            1.8
          );

          let remaining = 0;
          for (let k = 0; k < activeEnemies.length; k++) {
            if (activeEnemies[k].state !== 'ko') remaining++;
          }
          if (remaining === 0) {
            sim.victoryDelayTimer = 0.55;
          }
        } else if (didWallBang && pelletIdx === 0) {
          showBanner(
            `PENETRATION HIT · ${penetratedMaterialLabel || 'WALL-BANG'} · ${dmg} DMG`,
            1.5
          );
        }
      }
    }

    const adsRecoilMult = sim.isAds ? 0.65 : 1.0;
    sim.playerPitch = Math.min(
      Math.PI * 0.46,
      sim.playerPitch + eff.recoilPattern.vertical * adsRecoilMult
    );
    sim.playerYaw += (Math.random() - 0.5) * eff.recoilPattern.horizontal * adsRecoilMult;
    camera.rotation.x = sim.playerPitch;
    camera.rotation.y = sim.playerYaw;

    if (wState.mag <= 0 && spec.magSize === 1 && wState.reserve > 0) {
      startReload();
    } else {
      syncHudNow();
    }
  };

  // Zero-GC Tactical Combat Knife Slash [V] or Slot 3 Melee Attack
  const triggerMeleeStrike = () => {
    if (sim.screen !== 'playing') return;
    sim.meleeAnimTimer = 0.22;
    soundEngine.playKnifeSlash();

    camera.getWorldDirection(_bulletDir);

    const MELEE_RANGE = 1.8;
    _meleeRaycaster.set(camera.position, _bulletDir);
    _meleeRaycaster.near = 0.05;
    _meleeRaycaster.far = MELEE_RANGE;

    _enemyHitMeshes.length = 0;
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state !== 'ko') {
        for (let m = 0; m < e.hitMeshes.length; m++) {
          _enemyHitMeshes.push(e.hitMeshes[m]);
        }
      }
    }

    const enemyHits = _meleeRaycaster.intersectObjects(_enemyHitMeshes, false);

    let bestHitObject: THREE.Object3D | null =
      enemyHits.length > 0 ? enemyHits[0].object : null;
    if (enemyHits.length > 0) {
      _meleeImpactPoint.copy(enemyHits[0].point);
    } else {
      _meleeImpactPoint.copy(camera.position).addScaledVector(_bulletDir, 1.2);
    }

    if (!bestHitObject) {
      let bestDist = Infinity;
      for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        if (e.state === 'ko') continue;
        for (let m = 0; m < e.hitMeshes.length; m++) {
          const mesh = e.hitMeshes[m];
          _meleeScratchVec.setFromMatrixPosition(mesh.matrixWorld);
          _meleeToMesh.copy(_meleeScratchVec).sub(camera.position);
          const forwardDist = _meleeToMesh.dot(_bulletDir);
          if (forwardDist > 0 && forwardDist <= MELEE_RANGE) {
            _meleePerpVec.copy(_meleeToMesh).addScaledVector(_bulletDir, -forwardDist);
            const perpDist = _meleePerpVec.length();
            if (perpDist <= 0.32 && forwardDist < bestDist) {
              bestDist = forwardDist;
              bestHitObject = mesh;
              _meleeImpactPoint.copy(_meleeScratchVec);
            }
          }
        }
      }
    }

    if (bestHitObject) {
      const meta = bestHitObject.userData as {
        enemyId: string;
        hitZone: HitZone;
        hitBone?: RagdollBoneId;
      };
      const targetEnemy = activeEnemies.find((e) => e.id === meta.enemyId);
      if (targetEnemy && targetEnemy.state !== 'ko') {
        const hitZone = meta.hitZone;
        const hitBone = meta.hitBone;
        const isHeadshot = hitZone === 'head' || hitBone === 'head' || hitBone === 'neck';
        const damage = isHeadshot ? 125 : 50;

        soundEngine.playFleshImpact();
        soundEngine.playHitMarker(isHeadshot);
        triggerHitMarker(isHeadshot, 0.11);

        spawnDirectionalBloodBurst(_meleeImpactPoint, _bulletDir, isHeadshot ? 32 : 22);
        projectBloodDecal(_meleeImpactPoint, _bulletDir);
        _downDir.set(_bulletDir.x * 0.2, -0.98, _bulletDir.z * 0.2).normalize();
        projectBloodDecal(_meleeImpactPoint, _downDir);

        targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
        targetEnemy.hitFlashTimer = 0.08;
        targetEnemy.flinchTimer = 0.4;
        targetEnemy.state = 'combat';
        targetEnemy.lastSeenPlayerPos = {
          x: sim.playerBodyPos.x,
          z: sim.playerBodyPos.z,
        };
        sim.shotsHit += 1;

        const fatal = targetEnemy.hp <= 0;
        netManager.broadcastWorldEvent({
          type: 'PLAYER_HIT',
          attackerId: netManager.localPlayerId,
          attackerCallsign: netManager.callsign,
          attackerTeam: netManager.team,
          weaponId: 'combat_knife',
          targetId: targetEnemy.id,
          targetCallsign: `HOSTILE-${targetEnemy.archetype.toUpperCase()}`,
          targetIsAI: true,
          damage,
          hitZone,
          hitBone,
          isHeadshot,
          isWallBang: false,
          hitPoint: {
            x: _meleeImpactPoint.x,
            y: _meleeImpactPoint.y,
            z: _meleeImpactPoint.z,
          },
          impactDir: { x: _bulletDir.x, y: 0.22, z: _bulletDir.z },
          fatal,
        });

        if (fatal && netManager.tryClaimFatalHit(targetEnemy.id)) {
          targetEnemy.state = 'ko';
          targetEnemy.koTimer = 0.001;
          targetEnemy.laserLine.visible = false;
          targetEnemy.ragdoll = createEnemyRagdoll({
            hitZone,
            hitBone,
            impactDir: { x: _bulletDir.x, y: 0.22, z: _bulletDir.z },
            impactForce: isHeadshot ? 6.8 : 5.4,
            initialYaw: targetEnemy.group.rotation.y,
            currentPos: {
              x: targetEnemy.group.position.x,
              y: targetEnemy.group.position.y,
              z: targetEnemy.group.position.z,
            },
          });
          sim.kills += 1;
          if (isHeadshot) sim.headshots += 1;
          pushKillfeedEntry({
            attackerCallsign: netManager.callsign,
            attackerTeam: netManager.team,
            victimCallsign: `TANGO (${targetEnemy.archetype.toUpperCase()})`,
            weaponId: 'combat_knife',
            isHeadshot,
            isWallBang: false,
          });
          showBanner(
            isHeadshot
              ? 'TACTICAL KNIFE HEADSHOT · INSTANT KILL (+125 DMG)'
              : 'COMBAT KNIFE TAKEDOWN · 2-HIT FATALITY (+50 DMG)',
            2.0
          );
          let remaining = 0;
          for (let k = 0; k < activeEnemies.length; k++) {
            if (activeEnemies[k].state !== 'ko') remaining++;
          }
          if (remaining === 0) {
            sim.victoryDelayTimer = 0.55;
          }
        } else {
          showBanner(
            `COMBAT KNIFE SLASH (-50 DMG) · ENEMY HP: ${targetEnemy.hp}/100`,
            1.6
          );
        }
        syncHudNow();
        return;
      }
    }

    const plankHits = _meleeRaycaster.intersectObjects(intactBarricadeMeshes, false);
    let targetBar: BarricadeState | undefined;
    let hitPlankIdx = 6;
    _barImpactPoint.copy(camera.position).addScaledVector(_bulletDir, 1.2);

    if (plankHits.length > 0) {
      const hit = plankHits[0];
      _barImpactPoint.copy(hit.point);
      const meta = hit.object.userData as {
        barricadeId: string;
        plankIndex: number;
      };
      targetBar = activeBarricades.find((b) => b.id === meta.barricadeId);
      hitPlankIdx = meta.plankIndex;
    } else {
      const nearest = findNearestBarricade();
      if (nearest && !nearest.collapsed) {
        const dist = Math.hypot(
          nearest.x - sim.playerBodyPos.x,
          nearest.z - sim.playerBodyPos.z
        );
        if (dist <= 1.8) {
          const firstIntact =
            nearest.planks.find((p) => p.intact && p.plankIndex >= 5) ||
            nearest.planks.find((p) => p.intact);
          if (firstIntact) {
            targetBar = nearest;
            hitPlankIdx = firstIntact.plankIndex;
            _barImpactPoint.set(
              nearest.x,
              (firstIntact.aabb.minY + firstIntact.aabb.maxY) * 0.5,
              nearest.z
            );
          }
        }
      }
    }

    if (targetBar && !targetBar.collapsed) {
      const mRes = applyMeleeToBarricade(targetBar, hitPlankIdx, {
        x: _bulletDir.x,
        y: _bulletDir.y,
        z: _bulletDir.z,
      });

      spawnWoodSplinterBurst(_barImpactPoint, _bulletDir, 26);
      spawnRigidBodyDebris(mRes.debris);
      rebuildIntactBarricadeMeshList();
      sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.28);

      netManager.broadcastWorldEvent({
        type: 'BARRICADE_DAMAGE',
        shooterId: netManager.localPlayerId,
        barricadeId: targetBar.id,
        plankIndex: hitPlankIdx,
        chunkIndex: 2,
        weaponId: 'combat_knife',
        dir: { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z },
        isMelee: true,
      });

      if (mRes.totalCollapseTriggered) {
        soundEngine.playBarricadeCollapse();
        showBanner(
          `BARRICADE SHATTERED & COLLAPSED (${targetBar.meleeHits}/3 MELEE HITS)`,
          2.2
        );
      } else {
        soundEngine.playWoodSplinter(true);
        showBanner(
          `MELEE PEEK HOLE CARVED · SHATTERED ${mRes.shatteredPlankIndices.length} PLANKS (MELEE ${targetBar.meleeHits}/3)`,
          2.0
        );
      }
      syncHudNow();
    }
  };

  const toggleFlashlight = () => {
    if (sim.screen !== 'playing') return;
    sim.flashlightOn = !sim.flashlightOn;
    flashlightSpot.intensity = sim.flashlightOn ? 9.5 : 0;
    soundEngine.playFlashlightToggle();
    showBanner(
      sim.flashlightOn ? 'TACTICAL FLASHLIGHT: ON' : 'TACTICAL FLASHLIGHT: OFF',
      1.1
    );
    syncHudNow();
  };

  const startReload = () => {
    if (sim.isReloading) return;
    const spec = WEAPONS[sim.activeWeapon];
    const wState = sim.weapons[sim.activeWeapon];
    if (wState.mag >= spec.magSize || wState.reserve <= 0) return;

    coltPendingAdsShot = false;
    coltHammerCockTimer = 0;
    if (coltSpinState.active) {
      coltSpinState.active = false;
      coltSpinState.spinType = 'none';
      coltSpinState.phase = 'idle';
    }

    if (sim.activeWeapon === 'colt_saa') {
      const started = startColtSAAReload(coltReloadState, wState.mag, wState.reserve);
      if (!started) return;
      sim.isReloading = true;
      sim.reloadTimer = coltReloadState.roundsToLoad * 0.56 + 0.42;
      sim.reloadTotalSec = sim.reloadTimer;
      sim.isAds = false;
      soundEngine.playRevolverGateLatch(true);
      showBanner(
        `COLT SAA SEQUENTIAL RELOAD: GATE OPEN · LOADING ${coltReloadState.roundsToLoad} ROUNDS ONE BY ONE`,
        2.2
      );
      syncHudNow();
      return;
    }

    sim.isReloading = true;
    sim.reloadTimer = spec.reloadTimeSec;
    sim.reloadTotalSec = spec.reloadTimeSec;
    sim.isAds = false;
    soundEngine.playReload(false);
    showBanner(`RELOADING ${spec.name}...`, spec.reloadTimeSec);
    syncHudNow();
  };

  const triggerInspectSpin = () => {
    if (sim.screen !== 'playing' || sim.isReloading) return;
    triggerColtSAASpin(coltSpinState, 'inspect_freestyle');
    soundEngine.playRevolverSpinTwirl();
    showBanner(
      sim.activeWeapon === 'colt_saa'
        ? 'COLT SAA FREESTYLE SPIN [I/J] · TRIGGER TWIRL → CROSS-HAND TOSS → HOLSTER FLIP'
        : `WEAPON INSPECT FLOURISH [I/J] · ${WEAPONS[sim.activeWeapon].name}`,
      2.1
    );
    syncHudNow();
  };

  const triggerLobbyTurntableAction = (action: 'spin' | 'fire') => {
    const wId = inspectStateRef.current.weaponId;
    if (action === 'spin') {
      lobbyTurntableSpinVel = Math.PI * 3.8;
      soundEngine.playRevolverSpinTwirl();
    } else {
      lobbyTurntableKickZ = -0.075;
      lobbyTurntableFlashTimer = 0.08;
      const atts = weaponAttachmentsRef.current[wId] || [];
      const eff = computeEffectiveWeaponStats(wId, atts);
      soundEngine.playGunshot(wId, false, false, eff.isSuppressed);
    }
  };

  const triggerMedbag = () => {
    const res = useMedicalBag(sim.hp, sim.medbags);
    if (!res.consumed) {
      if (sim.hp >= MAX_PLAYER_HP) {
        showBanner('HP AT MAXIMUM (100/100)', 1.2);
      } else if (sim.medbags <= 0) {
        showBanner('NO MEDICAL BAGS REMAINING', 1.2);
      }
      syncHudNow();
      return;
    }
    sim.hp = res.hp;
    sim.medbags = res.medbags;
    soundEngine.playMedbagHeal();
    showBanner(`MEDICAL BAG APPLIED (+${res.healed} HP)`, 1.8);
    syncHudNow();
  };

  const switchWeapon = (id: WeaponId) => {
    if (sim.activeWeapon === id) return;
    sim.activeWeapon = id;
    sim.isReloading = false;
    sim.reloadTimer = 0;
    sim.isAds = false;
    coltReloadState.active = false;
    coltReloadState.phase = 'idle';
    coltReloadState.gateAngleRad = 0;
    coltReloadState.ejectorRodOffsetZ = 0;
    coltReloadState.insertingCartridgeProgress = 0;
    coltReloadState.ejectingCasingProgress = 0;
    coltPendingAdsShot = false;
    coltHammerCockTimer = 0;
    coltFanningSlapTimer = 0;
    canShoot = true;
    pendingBufferedShot = false;
    for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
      const wId = ALL_WEAPON_IDS[i];
      viewModels[wId].root.visible = wId === id;
    }
    if (id === 'colt_saa') {
      triggerColtSAASpin(coltSpinState, 'equip_flip');
      soundEngine.playRevolverSpinTwirl();
      showBanner(
        'COLT SAA PEACEMAKER EQUIPPED · [RMB] SINGLE-ACTION ADS · [HIP] FAN THE HAMMER · [I/J] SPIN',
        2.0
      );
    } else {
      coltSpinState.active = false;
      coltSpinState.spinType = 'none';
      coltSpinState.phase = 'idle';
      soundEngine.playLeanSwoosh();
    }
    syncHudNow();
  };

  const toggleFireMode = () => {
    const spec = WEAPONS[sim.activeWeapon];
    const wState = sim.weapons[sim.activeWeapon];
    if (spec.fireModes.length <= 1) {
      showBanner(`${spec.name} IS SEMI-AUTO ONLY`, 1.2);
      syncHudNow();
      return;
    }
    wState.fireMode = wState.fireMode === 'auto' ? 'semi' : 'auto';
    showBanner(`FIRE SELECTOR: ${wState.fireMode.toUpperCase()}`, 1.2);
    syncHudNow();
  };

  const resetAndStartMatch = (
    newSeed?: number,
    loadoutOverride?: PlayerLoadoutConfig,
    layoutOverride?: MapLayoutVariant,
    fromNetworkSync = false
  ) => {
    const seedToUse = newSeed ?? currentMap.seed;
    const chosenLoadout = loadoutOverride ?? loadoutSelectionRef.current;
    sim.loadout = {
      primary: chosenLoadout.primary,
      secondary: chosenLoadout.secondary,
      primaryAttachments:
        chosenLoadout.primaryAttachments ??
        weaponAttachmentsRef.current[chosenLoadout.primary],
      secondaryAttachments:
        chosenLoadout.secondaryAttachments ??
        weaponAttachmentsRef.current[chosenLoadout.secondary],
    };
    sim.hp = MAX_PLAYER_HP;
    sim.ghostHp = MAX_PLAYER_HP;
    sim.medbags = INITIAL_MEDBAGS;
    sim.weapons = createLoadoutRuntimeWeapons(sim.loadout);
    sim.activeWeapon = sim.loadout.primary;
    sim.isReloading = false;
    sim.reloadTimer = 0;
    sim.isAds = false;
    sim.adsAmount = 0;
    sim.leanTarget = 0;
    sim.leanAmount = 0;
    sim.leanOffsetX = 0;
    sim.leanRollZ = 0;
    sim.flashlightOn = false;
    flashlightSpot.intensity = 0;
    sim.acousticFilter = {
      cutoffHz: ACOUSTIC_LPF_OCCLUDED_HZ,
      volumeScale: 0.6,
      occluded: true,
    };
    sim.kills = 0;
    sim.headshots = 0;
    sim.shotsFired = 0;
    sim.shotsHit = 0;
    sim.wallBangHits = 0;
    sim.damageTaken = 0;
    sim.elapsedSec = 0;
    sim.victory = false;
    sim.victoryDelayTimer = 0;
    sim.spawnShieldTimer = SPAWN_SHIELD_DURATION_SEC;
    sim.scoreboardOpen = false;
    sim.screen = 'playing';
    netManager.resetMatchLocks();

    for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
      const wId = ALL_WEAPON_IDS[i];
      applyAttachmentsToWeaponViewModel(viewModels[wId], sim.weapons[wId].attachments);
      viewModels[wId].root.visible = wId === sim.activeWeapon;
    }
    keysHeld.clear();
    mouseLeftHeld = false;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      controls.lock();
    } catch {
      // Ignore pointer lock rejection in headless browser
    }

    buildMapScene(seedToUse, layoutOverride);
    netManager.mapSeed = currentMap.seed;
    netManager.layoutVariant = currentMap.layoutVariant;
    if (!fromNetworkSync && netManager.isHost && netManager.mode !== 'SOLO_BREACH') {
      netManager.broadcastWorldEvent({
        type: 'MATCH_SYNC',
        hostId: netManager.localPlayerId,
        mode: netManager.mode,
        mapSeed: currentMap.seed,
        layoutVariant: currentMap.layoutVariant,
        startMatchNow: true,
        worldSnapshot: captureWorldSnapshot(),
      });
    }
    showBanner(
      `BREACH INITIATED · ${currentMap.layoutName} · PARTY #${netManager.partyCode}`,
      1.5
    );
    syncHudNow();
    requestAnimationFrame(() => {
      renderMinimap();
    });
  };

  // Wire Multiplayer World Events & Room State Synchronization
  netManager.onRosterChange(() => {
    syncHudNow();
  });

  netManager.onRoomSync((sync) => {
    if (sync.hostId !== netManager.localPlayerId) {
      if (
        currentMap.seed !== sync.mapSeed ||
        currentMap.layoutVariant !== sync.layoutVariant
      ) {
        buildMapScene(sync.mapSeed, sync.layoutVariant);
      }
      if (sync.worldSnapshot) {
        applyWorldSnapshot(sync.worldSnapshot);
      }
    }
    syncHudNow();
  });

  netManager.onWorldEvent((ev) => {
    switch (ev.type) {
      case 'MATCH_SYNC': {
        if (ev.hostId === netManager.localPlayerId) break;
        if (ev.startMatchNow && sim.screen !== 'playing') {
          resetAndStartMatch(ev.mapSeed, undefined, ev.layoutVariant, true);
          if (ev.worldSnapshot) applyWorldSnapshot(ev.worldSnapshot);
        } else if (
          currentMap.seed !== ev.mapSeed ||
          currentMap.layoutVariant !== ev.layoutVariant
        ) {
          buildMapScene(ev.mapSeed, ev.layoutVariant);
          if (ev.worldSnapshot) applyWorldSnapshot(ev.worldSnapshot);
          syncHudNow();
        } else if (ev.worldSnapshot) {
          applyWorldSnapshot(ev.worldSnapshot);
          syncHudNow();
        }
        break;
      }
      case 'FIRE_SHOT': {
        if (ev.shooterId === netManager.localPlayerId) break;
        const dist = Math.hypot(
          ev.origin.x - camera.position.x,
          ev.origin.z - camera.position.z
        );
        if (dist < 28) {
          soundEngine.playGunshot(ev.weaponId, true, dist > 11, ev.isSuppressed);
        }
        spawnPoolBurst(sparkPool, ev.origin, ev.dir, 6, 4.0, 8.0, 0.08, 0.16);
        break;
      }
      case 'BARRICADE_DAMAGE': {
        if (ev.shooterId === netManager.localPlayerId) break;
        const targetBar = activeBarricades.find((b) => b.id === ev.barricadeId);
        if (targetBar && !targetBar.collapsed) {
          if (ev.isMelee) {
            const mRes = applyMeleeToBarricade(targetBar, ev.plankIndex, ev.dir);
            spawnRigidBodyDebris(mRes.debris);
          } else {
            const bRes = applyBulletToBarricade(
              targetBar,
              ev.plankIndex,
              ev.chunkIndex,
              ev.weaponId,
              ev.dir
            );
            spawnRigidBodyDebris(bRes.debris);
          }
          rebuildIntactBarricadeMeshList();
          soundEngine.playWoodSplinter(ev.isMelee);
          syncHudNow();
        }
        break;
      }
      case 'LIGHT_SHATTER': {
        if (ev.shooterId === netManager.localPlayerId) break;
        const fNode = activeLightFixtures.find((f) => f.spec.id === ev.fixtureId);
        if (fNode && fNode.spec.intact) {
          shootLightFixture(fNode.spec);
          fNode.bulbMesh.visible = false;
          fNode.hitMesh.visible = false;
          fNode.pointLight.intensity = 0;
          (fNode.stripMesh.material as THREE.MeshBasicMaterial).color.setHex(0x1e293b);
          lightBulbHitMeshes = activeLightFixtures
            .filter((f) => f.spec.intact)
            .map((f) => f.hitMesh);
          spawnPoolBurst(
            sparkPool,
            ev.point,
            { x: 0, y: -1, z: 0 },
            22,
            3.0,
            7.0,
            0.22,
            0.48
          );
          soundEngine.playGlassShatter();
          syncHudNow();
        }
        break;
      }
      case 'GRENADE_THROW': {
        if (ev.throwerId === netManager.localPlayerId) break;
        const grState = createHEGrenade(ev.grenadeId, ev.origin, ev.aimDir);
        const grModel = buildHEGrenadeModel();
        grModel.position.set(grState.x, grState.y, grState.z);
        scene.add(grModel);
        activeGrenades.push({ state: grState, mesh: grModel });
        break;
      }
      case 'PLAYER_HIT': {
        if (ev.attackerId === netManager.localPlayerId) break;
        _evPt.set(ev.hitPoint.x, ev.hitPoint.y, ev.hitPoint.z);
        _evDir.set(ev.impactDir.x, ev.impactDir.y, ev.impactDir.z);
        spawnDirectionalBloodBurst(_evPt, _evDir, ev.isHeadshot ? 24 : 16);
        projectBloodDecal(_evPt, _evDir);

        if (ev.targetIsAI) {
          const targetEnemy = activeEnemies.find((e) => e.id === ev.targetId);
          if (targetEnemy && targetEnemy.state !== 'ko') {
            targetEnemy.hp = Math.max(0, targetEnemy.hp - ev.damage);
            targetEnemy.flinchTimer = 0.35;
            if (ev.fatal || targetEnemy.hp <= 0) {
              targetEnemy.hp = 0;
              targetEnemy.state = 'ko';
              targetEnemy.koTimer = 0.001;
              targetEnemy.laserLine.visible = false;
              targetEnemy.ragdoll = createEnemyRagdoll({
                hitZone: ev.hitZone,
                hitBone: ev.hitBone,
                impactDir: ev.impactDir,
                impactForce: ev.isHeadshot ? 5.8 : 4.6,
                initialYaw: targetEnemy.group.rotation.y,
                currentPos: {
                  x: targetEnemy.group.position.x,
                  y: targetEnemy.group.position.y,
                  z: targetEnemy.group.position.z,
                },
              });
            }
          }
        } else if (ev.targetId === netManager.localPlayerId) {
          // Enforce PvP Spawn Invulnerability Shield (2.0s)
          if (sim.spawnShieldTimer > 0) {
            showBanner('SPAWN SHIELD ACTIVE · INCOMING HIT DEFLECTED', 1.2);
            break;
          }
          sim.hp = Math.max(0, sim.hp - ev.damage);
          sim.damageTaken += ev.damage;
          sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.5);
          soundEngine.playPlayerHurt();
          triggerDamageVignette(0.24, {
            x: ev.hitPoint.x - ev.impactDir.x * 4,
            z: ev.hitPoint.z - ev.impactDir.z * 4,
          });
          if (sim.hp <= 0) {
            sim.deaths += 1;
            sim.hp = MAX_PLAYER_HP;
            sim.spawnShieldTimer = SPAWN_SHIELD_DURATION_SEC;
            const respawnPt = computeTeamSpawnPoint(
              currentMap,
              netManager.team,
              netManager.mode,
              sim.deaths
            );
            sim.playerBodyPos.set(respawnPt.x, respawnPt.y, respawnPt.z);
            sim.playerYaw = respawnPt.yaw;
            showBanner(
              `ELIMINATED BY ${ev.attackerCallsign} · RESPAWNED (${SPAWN_SHIELD_DURATION_SEC}S SHIELD)`,
              2.2
            );
          }
        }

        if (ev.fatal) {
          pushKillfeedEntry({
            attackerCallsign: ev.attackerCallsign,
            attackerTeam: ev.attackerTeam,
            victimCallsign: ev.targetCallsign,
            weaponId: ev.weaponId,
            isHeadshot: ev.isHeadshot,
            isWallBang: ev.isWallBang,
          });
        }
        syncHudNow();
        break;
      }
    }
  });

  netManager.initTransports();

  // Initial map build
  buildMapScene(2026);
  if (initialAutostart) {
    resetAndStartMatch(2026);
  } else {
    syncHudNow();
  }

  const throwGrenade = () => {
    if (sim.screen !== 'playing' || sim.grenades <= 0) return;
    sim.grenades -= 1;
    soundEngine.playGrenadePinPull();

    camera.getWorldDirection(_bulletDir);
    const spawnOrigin = {
      x: camera.position.x + _bulletDir.x * 0.45,
      y: camera.position.y - 0.2 + _bulletDir.y * 0.45,
      z: camera.position.z + _bulletDir.z * 0.45,
    };
    const grenadeId = `grenade-${Date.now()}`;
    const aimDir = { x: _bulletDir.x, y: _bulletDir.y, z: _bulletDir.z };
    const grState = createHEGrenade(grenadeId, spawnOrigin, aimDir);
    const grModel = buildHEGrenadeModel();
    grModel.position.set(grState.x, grState.y, grState.z);
    scene.add(grModel);
    activeGrenades.push({ state: grState, mesh: grModel });

    netManager.broadcastWorldEvent({
      type: 'GRENADE_THROW',
      throwerId: netManager.localPlayerId,
      grenadeId,
      origin: spawnOrigin,
      aimDir,
    });

    showBanner(`HE FRAG THROWN · ${sim.grenades} REMAINING [G]`, 1.5);
    syncHudNow();
  };

  // Strict GPU Resource Disposal & Real Post-Processing / Supersampling Controls
  const applyGraphicsSettings = (settings: GraphicsSettings) => {
    currentGraphicsSettings = { ...settings };

    // 1. FXAA / Supersampling Pixel Ratio Control
    if (!isSoftwareGl) {
      const targetPixelRatio = settings.antiAliasing
        ? Math.min(window.devicePixelRatio, 2)
        : 1.0;
      renderer.setPixelRatio(targetPixelRatio);
    }

    // 2. Shadow Map Quality & Soft Shadows
    if (settings.shadowQuality === 'off' || isSoftwareGl) {
      renderer.shadowMap.enabled = false;
      dirLight.castShadow = false;
    } else {
      renderer.shadowMap.enabled = true;
      dirLight.castShadow = true;
      const res =
        settings.shadowQuality === 'low'
          ? 512
          : settings.shadowQuality === 'high'
          ? 2048
          : 1024;
      dirLight.shadow.mapSize.set(res, res);
      if (dirLight.shadow.map) {
        dirLight.shadow.map.dispose();
        dirLight.shadow.map = null;
      }
    }
    renderer.shadowMap.type = settings.pcfSoftShadows
      ? THREE.PCFSoftShadowMap
      : THREE.PCFShadowMap;
    renderer.shadowMap.needsUpdate = true;

    // 3. Dispose old procedural textures before swapping resolution to prevent GPU texture leaks
    const oldTextures = activeProceduralTextures;
    const newTextures = createCQBTextures(maxAnisotropy, settings.textureResolution);
    activeProceduralTextures = newTextures;

    concreteWallMat.map = newTextures.wallTexture;
    concreteWallMat.bumpMap = newTextures.wallTexture;
    concreteWallMat.needsUpdate = true;

    drywallPartitionMat.map = newTextures.drywallTexture;
    drywallPartitionMat.bumpMap = newTextures.drywallTexture;
    drywallPartitionMat.needsUpdate = true;

    crateDrywallMat.map = newTextures.drywallTexture;
    crateDrywallMat.needsUpdate = true;

    woodPlankMat.map = newTextures.woodTexture;
    woodPlankMat.bumpMap = newTextures.woodTexture;
    woodPlankMat.needsUpdate = true;

    woodYellowXMat.map = newTextures.woodTexture;
    woodYellowXMat.needsUpdate = true;

    woodStrapMat.map = newTextures.woodTexture;
    woodStrapMat.needsUpdate = true;

    floorMat.map = newTextures.floorTexture;
    floorMat.needsUpdate = true;

    for (let i = 0; i < MAX_DECAL_RING_BUFFER; i++) {
      if (decalRingPool[i].mat.map) {
        decalRingPool[i].mat.map = newTextures.bloodTexture;
        decalRingPool[i].mat.needsUpdate = true;
      }
    }

    oldTextures.wallTexture.dispose();
    oldTextures.drywallTexture.dispose();
    oldTextures.floorTexture.dispose();
    oldTextures.bloodTexture.dispose();
    oldTextures.woodTexture.dispose();

    // 4. Bloom / Emissive Boost on Light Fixtures
    const bloomScale = settings.bloom ? 1.4 : 0.8;
    for (let i = 0; i < activeLightFixtures.length; i++) {
      const node = activeLightFixtures[i];
      if (node.spec.intact) {
        node.pointLight.intensity = 5.2 * bloomScale;
      }
    }

    // 5. Tone Mapping Exposure for Ambient Occlusion depth contrast
    renderer.toneMappingExposure = settings.ambientOcclusion ? 1.08 : 1.18;
  };

  // Zero-GC Vertical Obstacle Clearance Raycasts
  const isCeilingBlocked = (): boolean => {
    _rayDir.set(0, 1, 0);
    const currentHeadY = camera.position.y;
    const targetStandingHeadY = PLAYER_STANDING_EYE_Y + sim.playerJumpY;
    const distanceNeeded = Math.max(0.12, targetStandingHeadY - currentHeadY + 0.18);
    _ceilOrigin.set(sim.playerBodyPos.x, currentHeadY, sim.playerBodyPos.z);
    _raycasterCeilingCheck.set(_ceilOrigin, _rayDir);
    _raycasterCeilingCheck.near = 0.05;
    _raycasterCeilingCheck.far = distanceNeeded;
    const ceilingHits = _raycasterCeilingCheck.intersectObjects(wallMeshes, false);
    return ceilingHits.length > 0;
  };

  const checkGrounded = (): boolean => {
    if (sim.playerJumpY <= 0.002) return true;
    _rayDir.set(0, -1, 0);
    _floorOrigin.set(sim.playerBodyPos.x, sim.playerJumpY + 0.1, sim.playerBodyPos.z);
    _raycasterFloorCheck.set(_floorOrigin, _rayDir);
    _raycasterFloorCheck.near = 0.02;
    _raycasterFloorCheck.far = 0.22;
    const floorHits = _raycasterFloorCheck.intersectObjects(wallMeshes, false);
    return floorHits.length > 0;
  };

  // Keyboard & Mouse Input Listeners
  const onKeyDown = (e: KeyboardEvent) => {
    const targetEl = e.target as HTMLElement | null;
    if (
      targetEl &&
      (targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.tagName === 'SELECT')
    ) {
      return;
    }

    if (e.code === 'Tab' && sim.screen === 'playing') {
      e.preventDefault();
      if (!sim.scoreboardOpen) {
        sim.scoreboardOpen = true;
        syncHudNow();
      }
      return;
    }

    if (e.repeat) return;
    keysHeld.add(e.code);

    if (sim.screen === 'title') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        resetAndStartMatch();
      }
      return;
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (sim.screen === 'playing') {
        sim.screen = 'paused';
        sim.scoreboardOpen = false;
        document.exitPointerLock?.();
        keysHeld.clear();
        mouseLeftHeld = false;
        syncHudNow();
      } else if (sim.screen === 'paused') {
        sim.screen = 'playing';
        syncHudNow();
      }
      return;
    }

    if (sim.screen !== 'playing') return;

    if (e.code === 'Digit1') switchWeapon(sim.loadout.primary);
    else if (e.code === 'Digit2') switchWeapon(sim.loadout.secondary);
    else if (e.code === 'Digit3') switchWeapon('combat_knife');
    else if (e.code === 'KeyH' || e.code === 'Digit4') triggerMedbag();
    else if (e.code === 'KeyG') throwGrenade();
    else if (e.code === 'KeyR') startReload();
    else if (e.code === 'KeyB') toggleFireMode();
    else if (e.code === 'KeyV') triggerMeleeStrike();
    else if (e.code === 'KeyT') toggleFlashlight();
    else if (e.code === 'KeyC') {
      if (sim.isCrouching) {
        if (!isCeilingBlocked()) {
          sim.isCrouching = false;
          soundEngine.playCrouch();
          showBanner('STAND', 0.9);
        } else {
          showBanner('LOW CEILING — HEADROOM BLOCKED', 1.2);
        }
      } else {
        sim.isCrouching = true;
        soundEngine.playCrouch();
        showBanner('CROUCH', 0.9);
      }
      syncHudNow();
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (checkGrounded() && (!sim.isReloading || sim.activeWeapon !== 'musket')) {
        sim.playerVelocityY = PLAYER_JUMP_IMPULSE_VELOCITY;
        sim.isGrounded = false;
        soundEngine.playJump();
        syncHudNow();
      }
    } else if (e.code === 'KeyL') {
      sim.leanMode = sim.leanMode === 'toggle' ? 'hold' : 'toggle';
      sim.leanTarget = 0;
      showBanner(`LEAN MODE: ${sim.leanMode.toUpperCase()}`, 1.3);
      syncHudNow();
    } else if (e.code === 'KeyM') {
      soundEngine.muted = !soundEngine.muted;
      syncHudNow();
    } else if (e.code === 'KeyN') {
      resetAndStartMatch(Math.floor(1000 + Math.random() * 9000));
    } else if (e.code === 'KeyI' || e.code === 'KeyJ') {
      triggerInspectSpin();
    } else if (e.code === 'KeyU') {
      sim.hp = Math.max(15, sim.hp - 45);
      sim.damageTaken += 45;
      soundEngine.playPlayerHurt();
      showBanner('SIMULATED SHRAPNEL HIT (-45 HP) · PRESS [H] OR [4] TO HEAL', 2.0);
      syncHudNow();
    } else if (e.code === 'KeyQ' || e.code === 'KeyE') {
      const nextLean = computeNextLeanTarget(sim.leanTarget, sim.leanMode, {
        key: e.code === 'KeyQ' ? 'Q' : 'E',
        type: 'keydown',
        qHeld: keysHeld.has('KeyQ'),
        eHeld: keysHeld.has('KeyE'),
      });
      if (nextLean !== sim.leanTarget) {
        sim.leanTarget = nextLean;
        soundEngine.playLeanSwoosh();
        syncHudNow();
      }
    } else if (e.code === 'ArrowUp') {
      sim.playerPitch = Math.min(Math.PI * 0.42, sim.playerPitch + 0.36);
      camera.rotation.x = sim.playerPitch;
      camera.updateMatrixWorld();
    } else if (e.code === 'ArrowDown') {
      sim.playerPitch = Math.max(-Math.PI * 0.42, sim.playerPitch - 0.36);
      camera.rotation.x = sim.playerPitch;
      camera.updateMatrixWorld();
    } else if (e.code === 'ArrowLeft') {
      sim.playerYaw += 0.25;
      camera.rotation.y = sim.playerYaw;
      camera.updateMatrixWorld();
    } else if (e.code === 'ArrowRight') {
      sim.playerYaw -= 0.25;
      camera.rotation.y = sim.playerYaw;
      camera.updateMatrixWorld();
    } else if (e.code === 'KeyF') {
      firePlayerWeapon();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Tab' && sim.scoreboardOpen) {
      e.preventDefault();
      sim.scoreboardOpen = false;
      syncHudNow();
    }
    keysHeld.delete(e.code);
    if (sim.screen === 'playing' && (e.code === 'KeyQ' || e.code === 'KeyE')) {
      const nextLean = computeNextLeanTarget(sim.leanTarget, sim.leanMode, {
        key: e.code === 'KeyQ' ? 'Q' : 'E',
        type: 'keyup',
        qHeld: keysHeld.has('KeyQ'),
        eHeld: keysHeld.has('KeyE'),
      });
      if (nextLean !== sim.leanTarget) {
        sim.leanTarget = nextLean;
        soundEngine.playLeanSwoosh();
        syncHudNow();
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    if (sim.screen !== 'playing') return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-hud-interactive="true"]')) return;

    if (!controls.isLocked) {
      try {
        controls.lock();
      } catch {
        // Ignore pointer lock rejection
      }
    }

    if (e.button === 0) {
      mouseLeftHeld = true;
      const isSemi = sim.weapons[sim.activeWeapon].fireMode === 'semi';

      if (isSemi) {
        if (canShoot) {
          canShoot = false;
          if (sim.fireCooldown <= 0) {
            firePlayerWeapon();
          } else if (sim.fireCooldown <= 0.05) {
            pendingBufferedShot = true;
            bufferedShotExpiry = performance.now() + 55;
          }
        }
      } else {
        if (sim.fireCooldown <= 0) {
          firePlayerWeapon();
        }
      }
    } else if (e.button === 2) {
      e.preventDefault();
      if (!sim.isReloading && sim.activeWeapon !== 'combat_knife') {
        sim.isAds = !sim.isAds;
        syncHudNow();
      }
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      mouseLeftHeld = false;
      canShoot = true;
    }
  };

  const onWheel = (e: WheelEvent) => {
    if (sim.screen !== 'playing') return;
    if (Math.abs(e.deltaY) > 4) {
      const nextW =
        sim.activeWeapon === sim.loadout.primary
          ? sim.loadout.secondary
          : sim.activeWeapon === sim.loadout.secondary
          ? 'combat_knife'
          : sim.loadout.primary;
      switchWeapon(nextW);
    }
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  const onBlur = () => {
    keysHeld.clear();
    mouseLeftHeld = false;
    canShoot = true;
    pendingBufferedShot = false;
  };

  const onResize = () => {
    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onResize);

  // Draw 2D Tactical Minimap on HUD canvas
  const renderMinimap = () => {
    const canvas = domRefs.minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const mapW = currentMap.totalWidth;
    const mapD = currentMap.totalDepth;
    const pad = 8;
    const scale = Math.min((W - pad * 2) / mapW, (H - pad * 2) / mapD);

    const toX = (wx: number) => pad + wx * scale;
    const toY = (wz: number) => pad + wz * scale;

    // Active room footprints
    ctx.fillStyle = 'rgba(10, 16, 28, 0.94)';
    for (let i = 0; i < currentMap.rooms.length; i++) {
      const r = currentMap.rooms[i];
      ctx.fillRect(toX(r.minX), toY(r.minZ), r.width * scale, r.depth * scale);
    }

    // Subtle tactical grid lines per room
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i < currentMap.rooms.length; i++) {
      const r = currentMap.rooms[i];
      ctx.strokeRect(toX(r.minX), toY(r.minZ), r.width * scale, r.depth * scale);
    }

    // Wall & interior partition segments
    for (let i = 0; i < currentMap.wallSegments.length; i++) {
      const seg = currentMap.wallSegments[i];
      if (seg.kind === 'lintel') continue;
      ctx.fillStyle = seg.materialTag === 'concrete' ? '#cbd5e1' : '#64748b';
      const x = toX(seg.minX);
      const y = toY(seg.minZ);
      const w = Math.max(1.8, (seg.maxX - seg.minX) * scale);
      const h = Math.max(1.8, (seg.maxZ - seg.minZ) * scale);
      ctx.fillRect(x, y, w, h);
    }

    // Barricades (amber line when standing, dashed dim when collapsed)
    for (let i = 0; i < activeBarricades.length; i++) {
      const b = activeBarricades[i];
      if (b.collapsed) continue;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(toX(b.x) - 2.5, toY(b.z) - 2.5, 5, 5);
    }

    // Cover props
    ctx.fillStyle = '#0284c7';
    for (let i = 0; i < currentMap.coverProps.length; i++) {
      const c = currentMap.coverProps[i];
      ctx.fillRect(
        toX(c.minX),
        toY(c.minZ),
        Math.max(3, (c.maxX - c.minX) * scale),
        Math.max(3, (c.maxZ - c.minZ) * scale)
      );
    }

    // Ambush Lockers
    for (let i = 0; i < activeLockers.length; i++) {
      const lNode = activeLockers[i];
      const lx = toX(lNode.spec.x);
      const ly = toY(lNode.spec.z);
      ctx.fillStyle = lNode.spec.triggered ? '#f43f5e' : '#38bdf8';
      ctx.fillRect(lx - 3, ly - 3, 6, 6);
    }

    // Hostiles
    for (let i = 0; i < activeEnemies.length; i++) {
      const e = activeEnemies[i];
      if (e.state === 'ko') continue;
      const ex = toX(e.group.position.x);
      const ey = toY(e.group.position.z);
      ctx.fillStyle = e.canSeePlayer ? '#ef4444' : 'rgba(245, 158, 11, 0.72)';
      ctx.beginPath();
      ctx.arc(ex, ey, e.canSeePlayer ? 4.2 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Remote Multiplayer Operators
    const remList = netManager.getRemotePlayers();
    for (let i = 0; i < remList.length; i++) {
      const rem = remList[i];
      if (rem.hp <= 0) continue;
      const rx = toX(rem.pos.x);
      const ry = toY(rem.pos.z);
      ctx.fillStyle = netManager.mode === 'PVP_VERSUS' ? '#e879f9' : '#10b981';
      ctx.beginPath();
      ctx.arc(rx, ry, 4.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player + FOV Cone
    const px = toX(sim.playerBodyPos.x);
    const py = toY(sim.playerBodyPos.z);
    const lookAngle = -camera.rotation.y - Math.PI / 2;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, 24, lookAngle - 0.45, lookAngle + 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, 4.2, 0, Math.PI * 2);
    ctx.fill();
  };

  // Main Simulation + Render Loop
  let frameId = 0;
  let lastTime = performance.now();
  let hudSyncAccumulator = 0;
  let minimapAccumulator = 0;
  let netPoseAccumulator = 0;

  function afterDraw(cb: () => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    gl.flush();
    const poll = () => {
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        frameId = window.setTimeout(cb, 80);
      }
    };
    frameId = window.setTimeout(poll, 5);
  }

  function tick() {
    const now = performance.now();
    const rawDt = (now - lastTime) / 1000;
    lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (sim.hitMarkerTimer > 0) {
      sim.hitMarkerTimer = Math.max(0, sim.hitMarkerTimer - dt);
      if (domRefs.hitMarkerRef.current) {
        domRefs.hitMarkerRef.current.style.opacity = sim.hitMarkerTimer > 0 ? '1' : '0';
        domRefs.hitMarkerRef.current.style.color = sim.hitMarkerColor;
      }
    }
    if (sim.damageVignetteTimer > 0) {
      sim.damageVignetteTimer = Math.max(0, sim.damageVignetteTimer - dt);
      if (domRefs.damageVignetteRef.current) {
        const baseLowHp = sim.hp <= 35 && sim.screen === 'playing' ? 0.55 : 0;
        domRefs.damageVignetteRef.current.style.opacity =
          sim.damageVignetteTimer > 0 ? '0.88' : String(baseLowHp);
      }
    }
    if (sim.damageArcTimer > 0) {
      sim.damageArcTimer = Math.max(0, sim.damageArcTimer - dt);
    }
    if (sim.spawnShieldTimer > 0) {
      sim.spawnShieldTimer = Math.max(0, sim.spawnShieldTimer - dt);
    }
    if (sim.victoryDelayTimer > 0 && sim.screen === 'playing') {
      sim.victoryDelayTimer = Math.max(0, sim.victoryDelayTimer - dt);
      if (sim.victoryDelayTimer <= 0) {
        sim.victory = true;
        sim.screen = 'gameover';
        sim.scoreboardOpen = false;
        document.exitPointerLock?.();
        keysHeld.clear();
        mouseLeftHeld = false;
        syncHudNow();
      }
    }

    // Atmospheric floating dust motes drift
    for (let i = 0; i < DUST_COUNT; i++) {
      const d = dustPositions[i];
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      if (d.y > 2.85) d.y = 0.2;
      if (d.x < 0.5 || d.x > 23.5) d.vx *= -1;
      _dummyMatrix.setPosition(d.x, d.y, d.z);
      dustMesh.setMatrixAt(i, _dummyMatrix);
    }
    dustMesh.instanceMatrix.needsUpdate = true;

    if (sim.screen === 'title') {
      sim.tourTime += dt;
      const t = sim.tourTime * 0.35;
      const cx = 12 + Math.cos(t) * 6.2;
      const cz = 12 + Math.sin(t * 0.8) * 6.2;
      camera.position.set(cx, 2.35, cz);
      camera.lookAt(12, 1.2, 12);
      camera.fov = 70;
      camera.updateProjectionMatrix();
      hemiLight.intensity = 0.85;
      dirLight.intensity = 1.25;

      if (lobbyTurntableFlashTimer > 0) {
        lobbyTurntableFlashTimer = Math.max(0, lobbyTurntableFlashTimer - dt);
      }
      lobbyTurntableKickZ *= Math.exp(-18 * dt);
      if (lobbyTurntableSpinVel > 0.01) {
        lobbyTurntableSpinRad += lobbyTurntableSpinVel * dt;
        lobbyTurntableSpinVel *= Math.exp(-4.5 * dt);
        if (lobbyTurntableSpinVel < 0.05) {
          lobbyTurntableSpinVel = 0;
          lobbyTurntableSpinRad = 0;
        }
      }

      for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
        const wId = ALL_WEAPON_IDS[i];
        viewModels[wId].root.visible = false;
        const m = inspectModels[wId];
        applyAttachmentsToWeaponViewModel(m, weaponAttachmentsRef.current[wId]);
        if (m.reticleGroup) {
          m.reticleGroup.visible = false;
        }
        const isTarget = wId === inspectStateRef.current.weaponId;
        m.root.visible = isTarget;
        if (isTarget) {
          (m.muzzleFlash.material as THREE.MeshBasicMaterial).opacity =
            lobbyTurntableFlashTimer > 0 ? 0.92 : 0;
          const isPistol = WEAPONS[wId].slot === 'secondary';
          m.root.position.z = (isPistol ? 0.02 : 0.14) + lobbyTurntableKickZ;
          m.root.rotation.x = lobbyTurntableSpinRad;
        }
      }
      if (!inspectStateRef.current.isDragging) {
        inspectStateRef.current.yaw += dt * 0.55;
      }
      inspectPivot.rotation.set(
        inspectStateRef.current.pitch,
        inspectStateRef.current.yaw,
        0
      );
    } else if (sim.screen === 'playing') {
      const activeEff = sim.weapons[sim.activeWeapon].effectiveStats;
      for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
        const wId = ALL_WEAPON_IDS[i];
        viewModels[wId].root.visible = wId === sim.activeWeapon;
      }

      sim.elapsedSec += dt;

      if (sim.statusBannerTimer > 0) {
        sim.statusBannerTimer -= dt;
        if (sim.statusBannerTimer <= 0) {
          sim.statusBanner = null;
        }
      }

      const playerRoomLit = getRoomLightIntactAt(
        sim.playerBodyPos.x,
        sim.playerBodyPos.z
      );
      const targetHemi = playerRoomLit ? 0.38 : 0.035;
      const targetDir = playerRoomLit ? 0.45 : 0.04;
      hemiLight.intensity += (targetHemi - hemiLight.intensity) * Math.min(1, dt * 10);
      dirLight.intensity += (targetDir - dirLight.intensity) * Math.min(1, dt * 10);

      const simDt = sim.hitstopTimer > 0 ? dt * 0.15 : dt;
      if (sim.hitstopTimer > 0) sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);

      if (controls.isLocked) {
        sim.playerYaw = camera.rotation.y;
        sim.playerPitch = camera.rotation.x;
      } else {
        const turnSpeed = 2.1;
        if (keysHeld.has('ArrowLeft')) sim.playerYaw += turnSpeed * dt;
        if (keysHeld.has('ArrowRight')) sim.playerYaw -= turnSpeed * dt;
        if (keysHeld.has('ArrowUp'))
          sim.playerPitch = Math.min(Math.PI * 0.42, sim.playerPitch + 1.4 * dt);
        if (keysHeld.has('ArrowDown'))
          sim.playerPitch = Math.max(-Math.PI * 0.42, sim.playerPitch - 1.4 * dt);
        camera.rotation.y = sim.playerYaw;
        camera.rotation.x = sim.playerPitch;
      }

      // 1. Player WASD Movement & Multi-Iteration Swept Circle-vs-AABB Collision
      _forward.set(0, 0, -1).applyAxisAngle(_up, sim.playerYaw).normalize();
      _right.set(1, 0, 0).applyAxisAngle(_up, sim.playerYaw).normalize();

      let moveForward = 0;
      let moveRight = 0;
      if (keysHeld.has('KeyW')) moveForward += 1;
      if (keysHeld.has('KeyS')) moveForward -= 1;
      if (keysHeld.has('KeyD')) moveRight += 1;
      if (keysHeld.has('KeyA')) moveRight -= 1;

      const moveLen = Math.hypot(moveForward, moveRight);

      const ceilingBlocked = isCeilingBlocked();
      sim.crouchProgress = stepPlayerCrouch({
        currentCrouchProgress: sim.crouchProgress,
        targetCrouchProgress: sim.isCrouching ? 1.0 : 0.0,
        dt,
        isCeilingBlocked: ceilingBlocked,
      });

      if (!sim.isGrounded) {
        sim.playerVelocityY -= PLAYER_GRAVITY_ACCEL * simDt;
        sim.playerJumpY += sim.playerVelocityY * simDt;
        if (sim.playerJumpY <= 0) {
          sim.playerJumpY = 0;
          sim.playerVelocityY = 0;
          sim.isGrounded = true;
          soundEngine.playFootstep(false, false);
        }
      }

      const sprintInputHeld =
        !sim.isCrouching && (keysHeld.has('ShiftLeft') || keysHeld.has('ShiftRight'));
      const moveCalc = computePlayerMovementSpeed({
        weaponSpeedModifier: activeEff.movementSpeedModifier,
        isAds: sim.isAds,
        isReloading: sim.isReloading,
        reloadTimer: sim.reloadTimer,
        sprintHeld: sprintInputHeld,
        isMoving: moveLen > 0,
        crouchProgress: sim.crouchProgress,
      });
      sim.isSprinting = moveCalc.isSprinting;
      if (sim.isSprinting) {
        canShoot = true;
        pendingBufferedShot = false;
      }

      const baseSpeed =
        moveCalc.speed * (Math.abs(sim.leanAmount) > 0.1 && !sim.isAds ? 0.78 : 1.0);
      if (moveLen > 0) {
        moveForward /= moveLen;
        moveRight /= moveLen;
        const stepX =
          (_forward.x * moveForward + _right.x * moveRight) * baseSpeed * simDt;
        const stepZ =
          (_forward.z * moveForward + _right.z * moveRight) * baseSpeed * simDt;

        const barricadeMoveBlocks = getActiveBarricadeMovementAABBs(activeBarricades);
        const allObstacles = [
          ...currentMap.wallSegments,
          ...currentMap.coverProps,
          ...barricadeMoveBlocks,
        ];
        const currentCapsuleRadius = 0.34;
        const currentCapsuleHeight =
          PLAYER_STANDING_CAPSULE_HEIGHT -
          (PLAYER_STANDING_CAPSULE_HEIGHT - PLAYER_CROUCHED_CAPSULE_HEIGHT) *
            sim.crouchProgress;
        const prevX = sim.playerBodyPos.x;
        const prevZ = sim.playerBodyPos.z;
        const resolved = resolveCircleAABBCollision(
          prevX + stepX,
          prevZ + stepZ,
          currentCapsuleRadius,
          allObstacles,
          currentCapsuleHeight,
          prevX,
          prevZ
        );
        sim.playerBodyPos.x = resolved.x;
        sim.playerBodyPos.z = resolved.z;
        sim.walkBobPhase += moveLen * baseSpeed * simDt * 2.7;

        sim.playerStepTimer -= simDt;
        if (sim.playerStepTimer <= 0) {
          sim.playerStepTimer = sim.isAds
            ? 0.52
            : sim.isCrouching
            ? 0.58
            : sim.isSprinting
            ? 0.28
            : 0.38;
          soundEngine.playFootstep(false, sim.crouchProgress > 0.35);
        }
      }

      // 1B. Proximity Locker Ambush Trigger
      const lockerEval = evaluateLockerAmbushTriggers(currentMap.lockerAmbushes, {
        x: sim.playerBodyPos.x,
        z: sim.playerBodyPos.z,
      });
      if (lockerEval.newlyTriggered.length > 0) {
        soundEngine.playLockerAmbushSlam(false);
        sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.34);

        for (let i = 0; i < lockerEval.spawnedEnemies.length; i++) {
          const sp = lockerEval.spawnedEnemies[i];
          const built = buildEnemyCombatantModel(sp.id, sp.archetype);
          built.group.position.set(sp.x, 0, sp.z);
          enemiesGroup.add(built.group);

          activeEnemies.push({
            id: sp.id,
            archetype: sp.archetype,
            hp: 100,
            maxHp: 100,
            mag: 10,
            maxMag: 10,
            isReloading: false,
            reloadTimer: 0,
            timeSinceLastSeenSec: 0,
            state: 'combat',
            group: built.group,
            hitMeshes: built.hitMeshes,
            muzzlePoint: built.muzzlePoint,
            laserLine: built.laserLine,
            bones: built.bones,
            weaponSocket: built.weaponSocket,
            handguardSocket: built.handguardSocket,
            blendWeights: { idle: 0.0, walk: 0.0, sprint: 1.0, flinch: 0.0 },
            animPhase: Math.random() * Math.PI * 2,
            flinchTimer: 0,
            locomotion: 'sprint',
            patrolPoints: sp.patrolPoints,
            patrolIdx: 0,
            fireCooldown: 0.35,
            footstepTimer: 0.15,
            telegraphTimer: 0,
            hitFlashTimer: 0,
            koTimer: 0,
            strafeSign: Math.random() > 0.5 ? 1 : -1,
            strafeTimer: 1.2,
            canSeePlayer: true,
            prevCanSeePlayer: false,
            shoutCooldownTimer: 0.1,
            effectiveVisionRange: 22.0,
            lastSeenPlayerPos: {
              x: sim.playerBodyPos.x,
              z: sim.playerBodyPos.z,
            },
            ragdoll: null,
          });
        }
        showBanner(
          'LOCKER AMBUSH! STEEL DOORS BLASTED OPEN — BREACHER RUSHING OUT!',
          2.4
        );
        syncHudNow();
      }

      for (let i = 0; i < activeLockers.length; i++) {
        const lNode = activeLockers[i];
        if (lNode.spec.triggered) {
          stepLockerDoorKinematics(lNode.spec, dt);
          const prog = lNode.spec.doorOpenProgress;
          lNode.model.leftDoorPivot.rotation.y = -prog * 2.05;
          lNode.model.rightDoorPivot.rotation.y = prog * 2.05;
        }
      }

      // 2. Tactical Leaning
      let wallClearanceDist: number | null = null;
      const checkDirSign =
        sim.leanTarget !== 0 ? sim.leanTarget : Math.sign(sim.leanAmount);
      if (checkDirSign !== 0) {
        _rayDir.copy(_right).multiplyScalar(checkDirSign).normalize();
        _raycasterWallCheck.set(sim.playerBodyPos, _rayDir);
        _raycasterWallCheck.near = 0.02;
        _raycasterWallCheck.far = 0.85;
        const leanWallHits = _raycasterWallCheck.intersectObjects(wallMeshes, false);
        if (leanWallHits.length > 0) {
          wallClearanceDist = leanWallHits[0].distance;
        }
      }

      const leanStep = stepLeanKinematics({
        currentLeanAmount: sim.leanAmount,
        targetLean: sim.leanTarget,
        dt,
        wallClearanceDist,
      });
      sim.leanAmount = leanStep.leanAmount;
      sim.leanOffsetX = leanStep.offsetX;
      sim.leanRollZ = leanStep.rollZ;

      const currentEyeHeight =
        PLAYER_STANDING_EYE_Y -
        (PLAYER_STANDING_EYE_Y - PLAYER_CROUCHED_EYE_Y) * sim.crouchProgress;
      const bobY = Math.sin(sim.walkBobPhase * 2) * 0.022 * (sim.isAds ? 0.1 : 1);
      camera.position
        .copy(sim.playerBodyPos)
        .addScaledVector(_right, sim.leanOffsetX);
      camera.position.y = currentEyeHeight + sim.playerJumpY + bobY;

      sim.cameraTrauma = Math.max(0, sim.cameraTrauma - dt * 2.4);
      const shakeZ =
        sim.cameraTrauma * sim.cameraTrauma * (Math.random() - 0.5) * 0.08;
      camera.rotation.z = sim.leanRollZ + shakeZ;

      // 3. ADS FOV Zoom & True Optic Local Z-Axis Alignment
      const spec = WEAPONS[sim.activeWeapon];
      const targetAds = sim.isAds && !sim.isReloading ? 1 : 0;
      sim.adsAmount += (targetAds - sim.adsAmount) * (1 - Math.exp(-28 * dt));
      if (Math.abs(targetAds - sim.adsAmount) < 0.01) {
        sim.adsAmount = targetAds;
      }

      const activeVM = viewModels[sim.activeWeapon];
      if (activeVM.reticleGroup) {
        activeVM.reticleGroup.visible =
          sim.adsAmount < 0.65 && !activeEff.hasHolographic;
      }

      const computedAdsFov = activeEff.adsFov;
      const targetFov = THREE.MathUtils.lerp(spec.hipFov, computedAdsFov, sim.adsAmount);
      const targetNear = computeDynamicCameraNearPlane(sim.adsAmount);
      if (
        Math.abs(camera.fov - targetFov) > 0.05 ||
        Math.abs(camera.near - targetNear) > 0.001
      ) {
        camera.fov = targetFov;
        camera.near = targetNear;
        camera.updateProjectionMatrix();
      }

      sim.recoilKickZ *= Math.exp(-18 * dt);
      if (sim.meleeAnimTimer > 0) {
        sim.meleeAnimTimer = Math.max(0, sim.meleeAnimTimer - dt);
      }
      const meleeLunge =
        sim.meleeAnimTimer > 0
          ? Math.sin((sim.meleeAnimTimer / 0.24) * Math.PI) * 0.19
          : 0;

      // 3B. Procedural Animation Blending + Spring Physics
      const lookDeltaYaw = sim.playerYaw - prevCameraYaw;
      const lookDeltaPitch = sim.playerPitch - prevCameraPitch;
      prevCameraYaw = sim.playerYaw;
      prevCameraPitch = sim.playerPitch;

      const isWeaponFiringNow =
        sim.muzzleFlashTimer > 0 || coltFanningSlapTimer > 0 || coltPendingAdsShot;
      const targetAnimState = sim.isReloading
        ? 'reload'
        : isWeaponFiringNow
        ? 'fire'
        : sim.isSprinting
        ? 'sprint'
        : moveLen > 0
        ? 'walk'
        : 'idle';
      stepWeaponAnimationController(weaponAnimBlend, targetAnimState, dt);

      const springOffset = stepWeaponSpringPhysics(weaponSpring, {
        dt,
        lookDeltaYaw,
        lookDeltaPitch,
        moveSpeed: baseSpeed,
        isMoving: moveLen > 0,
        isSprinting: sim.isSprinting,
        isCrouched: sim.crouchProgress > 0.35,
        isGrounded: sim.isGrounded,
        isAds: sim.adsAmount > 0.5,
      });

      stepColtSAASpin(coltSpinState, dt);

      const wSprint = weaponAnimBlend.weights.sprint * (1 - sim.adsAmount);
      const wReload = weaponAnimBlend.weights.reload;
      const blendPosX = -wSprint * 0.035;
      const blendPosY = -wSprint * 0.028;
      const blendPosZ = -wSprint * 0.015;
      const blendRotX = -wSprint * 0.22 - wReload * 0.12;
      const blendRotY = wSprint * 0.38;
      const blendRotZ = wSprint * 0.16;

      const reloadDipY =
        sim.isReloading && sim.activeWeapon !== 'colt_saa'
          ? -Math.sin((sim.reloadTimer / spec.reloadTimeSec) * Math.PI) * 0.22
          : 0;

      const alignedVm = computeOpticAlignedAdsPosition({
        weaponId: sim.activeWeapon,
        hasHolographic: activeEff.hasHolographic,
        adsAmount: sim.adsAmount,
        swayX: springOffset.offsetX + blendPosX,
        swayY: springOffset.offsetY + blendPosY,
        leanAmount: sim.leanAmount,
      });

      const coltSeqReloadOffsetX =
        sim.isReloading && sim.activeWeapon === 'colt_saa' ? -0.045 : 0;
      const coltSeqReloadOffsetY =
        sim.isReloading && sim.activeWeapon === 'colt_saa' ? 0.032 : 0;
      const coltSeqReloadRotZ =
        sim.isReloading && sim.activeWeapon === 'colt_saa' ? 0.42 : 0;
      const coltSeqReloadRotX =
        sim.isReloading && sim.activeWeapon === 'colt_saa' ? 0.18 : 0;

      activeVM.root.position.set(
        alignedVm.position.x +
          coltSeqReloadOffsetX +
          coltSpinState.offsetX -
          meleeLunge * 0.4 * (1 - sim.adsAmount),
        alignedVm.position.y +
          reloadDipY +
          coltSeqReloadOffsetY +
          coltSpinState.offsetY +
          meleeLunge * 0.2 * (1 - sim.adsAmount),
        alignedVm.position.z +
          sim.recoilKickZ +
          springOffset.offsetZ +
          blendPosZ +
          coltSpinState.offsetZ -
          meleeLunge
      );
      activeVM.root.rotation.set(
        (sim.isReloading && sim.activeWeapon !== 'colt_saa'
          ? -0.35
          : alignedVm.rotation.x +
            coltSeqReloadRotX +
            springOffset.rotX +
            blendRotX * (1 - sim.adsAmount * 0.8) +
            (sim.recoilKickZ * 1.4 + meleeLunge * 1.2) * (1 - sim.adsAmount * 0.75)) +
          coltSpinState.pitchSpinRad,
        alignedVm.rotation.y +
          springOffset.rotY +
          blendRotY * (1 - sim.adsAmount * 0.8) +
          coltSpinState.yawSpinRad +
          meleeLunge * 1.6 * (1 - sim.adsAmount),
        alignedVm.rotation.z +
          coltSeqReloadRotZ +
          springOffset.rotZ +
          blendRotZ * (1 - sim.adsAmount * 0.8) +
          coltSpinState.rollSpinRad
      );

      if (activeVM.slideMesh) {
        const baseZ = sim.activeWeapon === 'm870' ? -0.26 : -0.02;
        activeVM.slideMesh.position.z = baseZ + sim.recoilKickZ * 0.85;
      }

      if (coltFanningSlapTimer > 0) {
        coltFanningSlapTimer = Math.max(0, coltFanningSlapTimer - dt);
      }
      if (sim.activeWeapon === 'colt_saa') {
        const hammerAngle = coltPendingAdsShot
          ? -0.78 * Math.min(1, 1 - Math.max(0, coltHammerCockTimer / 0.085))
          : coltReloadState.active
          ? coltReloadState.hammerAngleRad
          : 0;
        const fanningSlap =
          coltFanningSlapTimer > 0 ? 1 - coltFanningSlapTimer / 0.14 : 0;
        stepColtSAAViewModelParts(activeVM, {
          cylinderAngleRad:
            coltReloadState.cylinderAngleRad +
            (coltSpinState.active ? coltSpinState.elapsed * coltSpinState.cylinderSpinVel : 0),
          hammerAngleRad: hammerAngle,
          gateAngleRad: coltReloadState.gateAngleRad,
          ejectorRodOffsetZ: coltReloadState.ejectorRodOffsetZ,
          insertingCartridgeProgress: coltReloadState.insertingCartridgeProgress,
          ejectingCasingProgress: coltReloadState.ejectingCasingProgress,
          fanningSlapProgress: fanningSlap,
        });
      }

      // 4. Weapon Firing Cooldown & Reload
      if (coltPendingAdsShot) {
        coltHammerCockTimer -= dt;
        if (coltHammerCockTimer <= 0) {
          coltPendingAdsShot = false;
          firePlayerWeapon(true);
        }
      }

      if (sim.fireCooldown > 0) {
        sim.fireCooldown = Math.max(0, sim.fireCooldown - dt);
      }
      if (sim.muzzleFlashTimer > 0) {
        sim.muzzleFlashTimer = Math.max(0, sim.muzzleFlashTimer - dt);
        const flashAlpha =
          sim.muzzleFlashTimer > 0 ? 0.92 * activeEff.muzzleFlashMultiplier : 0;
        for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
          const wId = ALL_WEAPON_IDS[i];
          (viewModels[wId].muzzleFlash.material as THREE.MeshBasicMaterial).opacity =
            sim.activeWeapon === wId ? flashAlpha : 0;
        }
        muzzleLight.intensity =
          sim.muzzleFlashTimer > 0 ? 3.5 * activeEff.muzzleFlashMultiplier : 0;
      } else {
        for (let i = 0; i < ALL_WEAPON_IDS.length; i++) {
          const wId = ALL_WEAPON_IDS[i];
          (viewModels[wId].muzzleFlash.material as THREE.MeshBasicMaterial).opacity = 0;
        }
        muzzleLight.intensity = 0;
      }

      if (sim.isReloading) {
        if (sim.activeWeapon === 'colt_saa' && coltReloadState.active) {
          const wState = sim.weapons.colt_saa;
          const seqRes = stepColtSAAReload(
            coltReloadState,
            dt,
            wState.mag,
            wState.reserve
          );
          wState.mag = seqRes.newMag;
          wState.reserve = seqRes.newReserve;
          sim.reloadTimer = Math.max(
            0.05,
            (WEAPONS.colt_saa.magSize - wState.mag) * 0.56 + 0.18
          );

          if (seqRes.casingEjected) {
            soundEngine.playRevolverShellEject();
          }
          if (seqRes.roundInserted) {
            soundEngine.playRevolverBulletInsert();
            showBanner(
              `COLT SAA SEQUENTIAL RELOAD: CHAMBERED ${wState.mag}/6 (.45 COLT) · [LMB] INTERRUPT`,
              1.0
            );
            syncHudNow();
          }
          if (seqRes.completed) {
            sim.isReloading = false;
            sim.reloadTimer = 0;
            soundEngine.playRevolverGateLatch(false);
            showBanner('COLT SAA CYLINDER FULL (6/6) · LOADING GATE CLOSED', 1.5);
            syncHudNow();
          }
        } else {
          sim.reloadTimer -= dt;
          if (sim.reloadTimer <= 0) {
            sim.isReloading = false;
            const wState = sim.weapons[sim.activeWeapon];
            const needed = spec.magSize - wState.mag;
            const transfer = Math.min(needed, wState.reserve);
            wState.mag += transfer;
            wState.reserve -= transfer;
            syncHudNow();
          }
        }
      }

      if (pendingBufferedShot) {
        if (performance.now() > bufferedShotExpiry) {
          pendingBufferedShot = false;
        } else if (sim.fireCooldown <= 0 && !sim.isReloading) {
          pendingBufferedShot = false;
          firePlayerWeapon();
        }
      } else if (
        mouseLeftHeld &&
        (sim.weapons[sim.activeWeapon].fireMode === 'auto' ||
          (sim.activeWeapon === 'colt_saa' && !sim.isAds)) &&
        sim.fireCooldown <= 0 &&
        !sim.isReloading
      ) {
        firePlayerWeapon();
      }

      // 5. Acoustic Occlusion & AI Vision / Behavior Tree
      const intactBarricadeLoSBoxes = getIntactBarricadeLoSAABBs(activeBarricades);
      const losBlockingAABBs = [
        ...currentMap.wallSegments,
        ...intactBarricadeLoSBoxes,
      ];
      const allObstacles = [
        ...currentMap.wallSegments,
        ...currentMap.coverProps,
        ...getActiveBarricadeMovementAABBs(activeBarricades),
      ];

      let nearestEnemy: ActiveEnemy | null = null;
      let nearestEnemyDist = Infinity;
      for (let i = 0; i < activeEnemies.length; i++) {
        const e = activeEnemies[i];
        if (e.state === 'ko') continue;
        const d = Math.hypot(
          e.group.position.x - camera.position.x,
          e.group.position.z - camera.position.z
        );
        if (d < nearestEnemyDist) {
          nearestEnemyDist = d;
          nearestEnemy = e;
        }
      }

      const nearestOcclusion = nearestEnemy
        ? evaluateAcousticOcclusion(
            {
              x: nearestEnemy.group.position.x,
              y: 1.42,
              z: nearestEnemy.group.position.z,
            },
            {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            losBlockingAABBs
          )
        : {
            occluded: false,
            targetLpfHz: ACOUSTIC_LPF_CLEAR_HZ,
            targetVolumeScale: 1.0,
          };

      const steppedFilter = stepAcousticFilterState({
        currentLpfHz: sim.acousticFilter.cutoffHz,
        currentVolumeScale: sim.acousticFilter.volumeScale,
        targetLpfHz: nearestOcclusion.targetLpfHz,
        targetVolumeScale: nearestOcclusion.targetVolumeScale,
        dt,
      });
      sim.acousticFilter = {
        cutoffHz: steppedFilter.lpfHz,
        volumeScale: steppedFilter.volumeScale,
        occluded: nearestOcclusion.occluded,
      };
      document.body.dataset.acousticOccluded = sim.acousticFilter.occluded
        ? 'true'
        : 'false';
      document.body.dataset.acousticHz = String(
        Math.round(sim.acousticFilter.cutoffHz)
      );
      soundEngine.updateWorldAcousticRouting(
        sim.acousticFilter.cutoffHz,
        sim.acousticFilter.volumeScale
      );

      camera.getWorldDirection(_bulletDir);
      const camForwardVec = {
        x: _bulletDir.x,
        y: _bulletDir.y,
        z: _bulletDir.z,
      };
      const camOriginVec = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };

      let concurrentAttackers = 0;
      sim.globalEnemyChatCooldown = Math.max(0, sim.globalEnemyChatCooldown - simDt);

      for (let i = 0; i < activeEnemies.length; i++) {
        const enemy = activeEnemies[i];
        enemy.shoutCooldownTimer = Math.max(0, enemy.shoutCooldownTimer - simDt);

        if (enemy.hitFlashTimer > 0) {
          enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
        }

        if (enemy.state === 'ko') {
          if (enemy.ragdoll) {
            stepEnemyRagdollPhysics(enemy.ragdoll, simDt, allObstacles);
            applyRagdollToEnemyBones(
              enemy.bones,
              enemy.group,
              enemy.weaponSocket,
              enemy.ragdoll
            );
          }
          continue;
        }

        enemy.muzzlePoint.getWorldPosition(_aiEye);
        _aiEye.y = 1.48;
        _playerTarget.copy(camera.position);

        const enemyRoomLit = getRoomLightIntactAt(
          enemy.group.position.x,
          enemy.group.position.z
        );
        const ambientLit = enemyRoomLit && playerRoomLit;
        const illuminatedByFlashlight = isTargetIlluminatedByFlashlight({
          flashlightActive: sim.flashlightOn,
          flashlightOrigin: camOriginVec,
          flashlightDir: camForwardVec,
          targetPos: { x: _aiEye.x, y: _aiEye.y, z: _aiEye.z },
        });
        const effectiveVisionRange = computeEffectiveAIVisionRange({
          baseRange: 22.0,
          roomLightIntact: ambientLit,
          illuminatedByFlashlight,
          playerMuzzleFlashActive:
            sim.muzzleFlashTimer > 0 && !activeEff.suppressesMuzzleFlashAlert,
        });
        enemy.effectiveVisionRange = effectiveVisionRange;

        const distToPlayer = _aiEye.distanceTo(_playerTarget);
        let hasLoS = false;

        if (distToPlayer < effectiveVisionRange) {
          const aabbClear = hasStrictLineOfSight(
            { x: _aiEye.x, y: _aiEye.y, z: _aiEye.z },
            { x: _playerTarget.x, y: _playerTarget.y, z: _playerTarget.z },
            losBlockingAABBs
          );
          if (aabbClear) {
            _rayDir.subVectors(_playerTarget, _aiEye).normalize();
            const aiSpatialEnv = querySpatialMeshesAlongRay(
              { x: _aiEye.x, y: _aiEye.y, z: _aiEye.z },
              { x: _rayDir.x, y: _rayDir.y, z: _rayDir.z },
              distToPlayer
            );
            _raycasterWallCheck.set(_aiEye, _rayDir);
            _raycasterWallCheck.near = 0.05;
            _raycasterWallCheck.far = distToPlayer - 0.1;
            const wallBlocked =
              _raycasterWallCheck.intersectObjects(aiSpatialEnv.walls, false).length > 0;
            const barBlocked =
              !wallBlocked &&
              _raycasterWallCheck.intersectObjects(aiSpatialEnv.barricades, false)
                .length > 0;
            hasLoS = !wallBlocked && !barBlocked;
          }
        }

        enemy.canSeePlayer = hasLoS;

        const enemyAcousticOccluded = evaluateAcousticOcclusion(
          {
            x: enemy.group.position.x,
            y: 1.42,
            z: enemy.group.position.z,
          },
          camOriginVec,
          losBlockingAABBs
        ).occluded;

        const chatEval = evaluateEnemyAmbientChat({
          enemyId: enemy.id,
          currentCanSeePlayer: hasLoS,
          prevCanSeePlayer: enemy.prevCanSeePlayer,
          currentState: enemy.state,
          shoutCooldownTimer: enemy.shoutCooldownTimer,
          globalChatCooldownTimer: sim.globalEnemyChatCooldown,
          enemyPos: {
            x: enemy.group.position.x,
            y: 1.42,
            z: enemy.group.position.z,
          },
        });

        enemy.shoutCooldownTimer = chatEval.nextCooldown;
        if (chatEval.shouldShout && chatEval.callout) {
          sim.globalEnemyChatCooldown = GLOBAL_CHAT_COOLDOWN_SEC;
          soundEngine.playEnemyShout(chatEval.shoutType!, enemyAcousticOccluded);
          showBanner(`[HOSTILE]: "${chatEval.callout.calloutText}"`, 2.2);
        }
        enemy.prevCanSeePlayer = hasLoS;

        if (hasLoS) {
          enemy.lastSeenPlayerPos = {
            x: sim.playerBodyPos.x,
            z: sim.playerBodyPos.z,
          };
          enemy.timeSinceLastSeenSec = 0;
        } else {
          enemy.timeSinceLastSeenSec += simDt;
        }

        if (enemy.isReloading) {
          enemy.reloadTimer -= simDt;
          if (enemy.reloadTimer <= 0) {
            enemy.isReloading = false;
            enemy.mag = enemy.maxMag;
          }
        }

        const btDecision = evaluateAIBehaviorTree({
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          mag: enemy.mag,
          isReloading: enemy.isReloading,
          canSeePlayer: hasLoS,
          distToPlayer,
          effectiveVisionRange,
          hasLastKnownPlayerPos: enemy.lastSeenPlayerPos !== null,
          timeSinceLastSeenSec: enemy.timeSinceLastSeenSec,
          aiPos: { x: enemy.group.position.x, z: enemy.group.position.z },
          playerPos: { x: sim.playerBodyPos.x, z: sim.playerBodyPos.z },
          lastKnownPlayerPos: enemy.lastSeenPlayerPos,
          navGraph: currentMap.navGraph,
          wallAABBs: losBlockingAABBs,
          coverAABBs: currentMap.coverProps,
        });

        enemy.state = btDecision.state;
        enemy.locomotion = btDecision.locomotion;

        if (btDecision.action === 'engage' && hasLoS) {
          const desiredYaw = Math.atan2(
            enemy.group.position.x - sim.playerBodyPos.x,
            enemy.group.position.z - sim.playerBodyPos.z
          );
          enemy.group.rotation.y = desiredYaw;

          let moveX = 0;
          let moveZ = 0;
          if (enemy.archetype === 'breacher') {
            if (distToPlayer > 3.2) {
              moveX = -Math.sin(desiredYaw) * 2.55 * simDt;
              moveZ = -Math.cos(desiredYaw) * 2.55 * simDt;
            }
          } else if (enemy.archetype === 'rifleman') {
            enemy.strafeTimer -= simDt;
            if (enemy.strafeTimer <= 0) {
              enemy.strafeSign *= -1;
              enemy.strafeTimer = 1.1 + Math.random() * 0.9;
            }
            moveX = Math.cos(desiredYaw) * enemy.strafeSign * 1.65 * simDt;
            moveZ = -Math.sin(desiredYaw) * enemy.strafeSign * 1.65 * simDt;
          } else {
            if (distToPlayer < 5.5) {
              moveX = Math.sin(desiredYaw) * 1.45 * simDt;
              moveZ = Math.cos(desiredYaw) * 1.45 * simDt;
            }
          }

          if (moveX !== 0 || moveZ !== 0) {
            const prevEx = enemy.group.position.x;
            const prevEz = enemy.group.position.z;
            const res = resolveCircleAABBCollision(
              prevEx + moveX,
              prevEz + moveZ,
              0.36,
              allObstacles,
              1.7,
              prevEx,
              prevEz
            );
            const keepsLoS = hasStrictLineOfSight(
              { x: res.x, y: 1.48, z: res.z },
              { x: _playerTarget.x, y: _playerTarget.y, z: _playerTarget.z },
              losBlockingAABBs
            );
            if (keepsLoS) {
              enemy.group.position.x = res.x;
              enemy.group.position.z = res.z;
            } else {
              enemy.strafeSign *= -1;
            }
            enemy.locomotion =
              enemy.archetype === 'breacher' && distToPlayer > 3.8
                ? 'sprint'
                : 'walk';
          } else {
            enemy.locomotion = 'idle';
          }

          if (concurrentAttackers < 3 && !enemy.isReloading) {
            concurrentAttackers++;
            enemy.fireCooldown -= simDt;
            const lMat = enemy.laserLine.material as THREE.LineBasicMaterial;
            lMat.opacity = enemy.fireCooldown < 0.45 ? 0.78 : 0.25;

            if (enemy.fireCooldown <= 0) {
              if (enemy.canSeePlayer) {
                enemy.mag = Math.max(0, enemy.mag - 1);
                if (enemy.mag <= 0) {
                  enemy.isReloading = true;
                  enemy.reloadTimer = 2.2;
                }
                soundEngine.playGunshot('hk416', true, enemyAcousticOccluded);
                const baseInterval =
                  enemy.archetype === 'breacher'
                    ? 0.95
                    : enemy.archetype === 'rifleman'
                    ? 0.78
                    : 1.25;
                enemy.fireCooldown = baseInterval + Math.random() * 0.4;

                const leanCoverBonus = Math.abs(sim.leanAmount) > 0.35 ? 0.58 : 1.0;
                const hitProb =
                  Math.max(0.18, 0.68 - distToPlayer * 0.022) * leanCoverBonus;

                if (Math.random() < hitProb && sim.spawnShieldTimer <= 0) {
                  const enemyDmg =
                    enemy.archetype === 'marksman'
                      ? 18
                      : enemy.archetype === 'breacher'
                      ? 14
                      : 12;
                  sim.hp = Math.max(0, sim.hp - enemyDmg);
                  sim.damageTaken += enemyDmg;
                  sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.45);
                  soundEngine.playPlayerHurt();
                  triggerDamageVignette(0.18, {
                    x: enemy.group.position.x,
                    z: enemy.group.position.z,
                  });

                  if (sim.hp <= 0) {
                    sim.deaths += 1;
                    sim.victory = false;
                    sim.screen = 'gameover';
                    sim.scoreboardOpen = false;
                    document.exitPointerLock?.();
                    keysHeld.clear();
                    mouseLeftHeld = false;
                  }
                  syncHudNow();
                }
              }
            }
          }
        } else if (btDecision.action === 'suppressive_fire') {
          const suppressYaw = Math.atan2(
            enemy.group.position.x - btDecision.aimTarget.x,
            enemy.group.position.z - btDecision.aimTarget.z
          );
          enemy.group.rotation.y = suppressYaw;
          const lMat = enemy.laserLine.material as THREE.LineBasicMaterial;
          lMat.opacity = 0.45;
          enemy.fireCooldown -= simDt;
          if (enemy.fireCooldown <= 0 && !enemy.isReloading && concurrentAttackers < 3) {
            concurrentAttackers++;
            enemy.mag = Math.max(0, enemy.mag - 1);
            if (enemy.mag <= 0) {
              enemy.isReloading = true;
              enemy.reloadTimer = 2.2;
            }
            enemy.fireCooldown = 0.65 + Math.random() * 0.35;
            soundEngine.playGunshot('hk416', true, enemyAcousticOccluded);
          }
        } else {
          const lMat = enemy.laserLine.material as THREE.LineBasicMaterial;
          lMat.opacity = 0;
          enemy.fireCooldown = Math.max(enemy.fireCooldown, 0.55);

          const targetWay =
            btDecision.action === 'patrol' || !btDecision.moveTarget
              ? enemy.patrolPoints[enemy.patrolIdx]
              : btDecision.moveTarget;
          const navPath =
            btDecision.path.length > 0
              ? btDecision.path
              : findNavPath(
                  currentMap.navGraph,
                  { x: enemy.group.position.x, z: enemy.group.position.z },
                  targetWay,
                  currentMap.wallSegments
                );
          const nextWaypoint = navPath[0] || targetWay;
          const dx = nextWaypoint.x - enemy.group.position.x;
          const dz = nextWaypoint.z - enemy.group.position.z;
          const dist = Math.hypot(dx, dz);

          if (dist < 0.45) {
            if (btDecision.action === 'flank') {
              enemy.lastSeenPlayerPos = null;
            } else if (btDecision.action === 'patrol') {
              enemy.patrolIdx = (enemy.patrolIdx + 1) % enemy.patrolPoints.length;
            }
            enemy.locomotion = 'idle';
          } else {
            const stepSpeed =
              btDecision.action === 'seek_cover'
                ? 2.65
                : btDecision.action === 'flank'
                ? 2.25
                : 1.35;
            const nx = (dx / dist) * stepSpeed * simDt;
            const nz = (dz / dist) * stepSpeed * simDt;
            const prevEx = enemy.group.position.x;
            const prevEz = enemy.group.position.z;
            const res = resolveCircleAABBCollision(
              prevEx + nx,
              prevEz + nz,
              0.36,
              allObstacles,
              1.7,
              prevEx,
              prevEz
            );
            enemy.group.position.x = res.x;
            enemy.group.position.z = res.z;
            if (res.collided && btDecision.action === 'patrol') {
              enemy.patrolIdx = (enemy.patrolIdx + 1) % enemy.patrolPoints.length;
            }
            enemy.group.rotation.y = Math.atan2(-dx, -dz);

            enemy.footstepTimer -= simDt;
            if (enemy.footstepTimer <= 0 && distToPlayer < 14) {
              enemy.footstepTimer =
                btDecision.action === 'seek_cover' || btDecision.action === 'flank'
                  ? 0.36
                  : 0.55 + Math.random() * 0.25;
              soundEngine.playFootstep(true, enemyAcousticOccluded);
            }
          }
        }

        // 5B. Step AI Animation Blending & Multi-Bone Procedural IK
        enemy.flinchTimer = Math.max(0, enemy.flinchTimer - dt);
        enemy.blendWeights = stepAIAnimationBlend(
          enemy.blendWeights,
          enemy.locomotion,
          enemy.flinchTimer > 0 ? enemy.flinchTimer / 0.35 : 0,
          simDt
        );
        stepAICombatantAnimationAndIK(
          {
            bones: enemy.bones,
            handguardSocket: enemy.handguardSocket,
            muzzlePoint: enemy.muzzlePoint,
            group: enemy.group,
            blendWeights: enemy.blendWeights,
            animPhase: enemy.animPhase,
            flinchTimer: enemy.flinchTimer,
            isAimingAtPlayer: enemy.canSeePlayer || enemy.state === 'combat',
            aimTarget: { x: _playerTarget.x, y: _playerTarget.y, z: _playerTarget.z },
            koTimer: enemy.koTimer,
            state: enemy.state,
          },
          simDt
        );
      }

      // 5C. 20Hz Local Player Pose Broadcast & 60Hz Remote Operator Interpolation
      netPoseAccumulator += dt;
      if (netPoseAccumulator >= 0.05) {
        netPoseAccumulator = 0;
        const activeAtts =
          sim.activeWeapon === sim.loadout.primary
            ? sim.loadout.primaryAttachments || []
            : sim.activeWeapon === sim.loadout.secondary
            ? sim.loadout.secondaryAttachments || []
            : [];
        netManager.broadcastLocalPose({
          pos: {
            x: sim.playerBodyPos.x,
            y: sim.playerBodyPos.y,
            z: sim.playerBodyPos.z,
          },
          yaw: sim.playerYaw,
          pitch: sim.playerPitch,
          crouchProgress: sim.crouchProgress,
          leanAmount: sim.leanAmount,
          activeWeapon: sim.activeWeapon,
          attachments: activeAtts,
          isAds: sim.isAds,
          isReloading: sim.isReloading,
          isSprinting: sim.isSprinting,
          hp: sim.hp,
          maxHp: MAX_PLAYER_HP,
          spawnShieldTimer: sim.spawnShieldTimer,
          kills: sim.kills,
          deaths: sim.deaths,
          headshots: sim.headshots,
          shotsFired: sim.shotsFired,
          shotsHit: sim.shotsHit,
        });
      }

      const remoteSnapshots = netManager.getRemotePlayers();
      const activeRemoteIds = new Set<string>();
      for (let i = 0; i < remoteSnapshots.length; i++) {
        const snap = remoteSnapshots[i];
        activeRemoteIds.add(snap.id);
        let remNode = remotePlayerNodes.get(snap.id);
        if (!remNode) {
          const archetype = snap.team === 'DEFENDERS' ? 'breacher' : 'marksman';
          const built = buildEnemyCombatantModel(`remote-${snap.id}`, archetype);
          for (let m = 0; m < built.hitMeshes.length; m++) {
            built.hitMeshes[m].userData = {
              ...built.hitMeshes[m].userData,
              remotePlayerId: snap.id,
            };
          }
          const lMat = built.laserLine.material as THREE.LineBasicMaterial;
          lMat.color.setHex(snap.team === 'DEFENDERS' ? 0xe879f9 : 0x34d399);
          lMat.opacity = 0.55;
          built.group.position.set(snap.pos.x, 0, snap.pos.z);
          remotePlayersGroup.add(built.group);

          const createdNode: ActiveRemotePlayerNode = {
            id: snap.id,
            callsign: snap.callsign,
            team: snap.team,
            group: built.group,
            hitMeshes: built.hitMeshes,
            muzzlePoint: built.muzzlePoint,
            laserLine: built.laserLine,
            bones: built.bones,
            weaponSocket: built.weaponSocket,
            handguardSocket: built.handguardSocket,
            blendWeights: { idle: 1, walk: 0, sprint: 0, flinch: 0 },
            animPhase: Math.random() * Math.PI * 2,
            flinchTimer: 0,
            koTimer: 0,
            pose: {
              pos: { x: snap.pos.x, y: snap.pos.y, z: snap.pos.z },
              yaw: snap.yaw,
              pitch: snap.pitch,
              crouchProgress: snap.crouchProgress,
              leanAmount: snap.leanAmount,
              locomotion: 'idle',
            },
            ragdoll: null,
            lastHp: snap.hp,
          };
          remotePlayerNodes.set(snap.id, createdNode);
          remNode = createdNode;
        }

        remNode.callsign = snap.callsign;
        remNode.team = snap.team;
        if (snap.hp < remNode.lastHp) {
          remNode.flinchTimer = 0.32;
        }
        remNode.lastHp = snap.hp;

        if (snap.hp <= 0) {
          remNode.koTimer += dt;
          remNode.laserLine.visible = false;
          if (!remNode.ragdoll) {
            remNode.ragdoll = createEnemyRagdoll({
              hitZone: 'torso',
              impactDir: { x: 0, y: 0.2, z: 1 },
              impactForce: 5.5,
              initialYaw: remNode.group.rotation.y,
              currentPos: {
                x: remNode.group.position.x,
                y: remNode.group.position.y,
                z: remNode.group.position.z,
              },
            });
          }
          stepEnemyRagdollPhysics(remNode.ragdoll, dt, allObstacles);
          applyRagdollToEnemyBones(
            remNode.bones,
            remNode.group,
            remNode.weaponSocket,
            remNode.ragdoll
          );
        } else {
          remNode.ragdoll = null;
          remNode.koTimer = 0;
          remNode.laserLine.visible = true;
          remNode.pose = interpolateRemotePlayerPose(remNode.pose, snap, dt);

          remNode.group.position.set(remNode.pose.pos.x, 0, remNode.pose.pos.z);
          remNode.group.rotation.set(0, remNode.pose.yaw, 0);
          remNode.flinchTimer = Math.max(0, remNode.flinchTimer - dt);
          remNode.blendWeights = stepAIAnimationBlend(
            remNode.blendWeights,
            remNode.pose.locomotion,
            remNode.flinchTimer > 0 ? remNode.flinchTimer / 0.35 : 0,
            dt
          );

          const lookDist = 6.0;
          const aimX =
            remNode.pose.pos.x -
            Math.sin(remNode.pose.yaw) * Math.cos(remNode.pose.pitch) * lookDist;
          const aimY = 1.42 + Math.sin(remNode.pose.pitch) * lookDist;
          const aimZ =
            remNode.pose.pos.z -
            Math.cos(remNode.pose.yaw) * Math.cos(remNode.pose.pitch) * lookDist;

          stepAICombatantAnimationAndIK(
            {
              bones: remNode.bones,
              handguardSocket: remNode.handguardSocket,
              muzzlePoint: remNode.muzzlePoint,
              group: remNode.group,
              blendWeights: remNode.blendWeights,
              animPhase: remNode.animPhase,
              flinchTimer: remNode.flinchTimer,
              isAimingAtPlayer: true,
              aimTarget: { x: aimX, y: aimY, z: aimZ },
              koTimer: 0,
              state: 'combat',
              crouchProgress: remNode.pose.crouchProgress,
              leanAmount: remNode.pose.leanAmount,
            },
            dt
          );
        }
      }

      // Remove disconnected remote operator nodes & dispose GPU resources cleanly
      for (const [remId, remNode] of remotePlayerNodes.entries()) {
        if (!activeRemoteIds.has(remId)) {
          disposeGroupChildren(remNode.group, sharedMaterials);
          remotePlayersGroup.remove(remNode.group);
          remotePlayerNodes.delete(remId);
        }
      }

      // 6. Update Pooled Particles
      let anyParticleUpdated = false;
      for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
        if (!particleActive[i]) continue;
        anyParticleUpdated = true;
        particleLife[i] += dt;
        if (particleLife[i] >= particleMaxLife[i]) {
          particleActive[i] = 0;
          _dummyMatrix.makeScale(0, 0, 0);
          bloodParticlesMesh.setMatrixAt(i, _dummyMatrix);
          continue;
        }
        particleVel[i * 3 + 1] -= 12.5 * dt;
        particlePos[i * 3 + 0] += particleVel[i * 3 + 0] * dt;
        particlePos[i * 3 + 1] = Math.max(
          0.02,
          particlePos[i * 3 + 1] + particleVel[i * 3 + 1] * dt
        );
        particlePos[i * 3 + 2] += particleVel[i * 3 + 2] * dt;

        const s = 1 - (particleLife[i] / particleMaxLife[i]) * 0.65;
        _dummyPos.set(
          particlePos[i * 3 + 0],
          particlePos[i * 3 + 1],
          particlePos[i * 3 + 2]
        );
        _dummyScale.set(s, s, s);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        bloodParticlesMesh.setMatrixAt(i, _dummyMatrix);
      }
      if (anyParticleUpdated) {
        bloodParticlesMesh.instanceMatrix.needsUpdate = true;
      }

      let anySplinterUpdated = false;
      for (let i = 0; i < MAX_WOOD_SPLINTERS; i++) {
        if (!splinterActive[i]) continue;
        anySplinterUpdated = true;
        splinterLife[i] += dt;
        if (splinterLife[i] >= splinterMaxLife[i]) {
          splinterActive[i] = 0;
          _dummyMatrix.makeScale(0, 0, 0);
          woodSplintersMesh.setMatrixAt(i, _dummyMatrix);
          continue;
        }
        splinterVel[i * 3 + 1] -= 14.0 * dt;
        splinterPos[i * 3 + 0] += splinterVel[i * 3 + 0] * dt;
        splinterPos[i * 3 + 1] = Math.max(
          0.015,
          splinterPos[i * 3 + 1] + splinterVel[i * 3 + 1] * dt
        );
        splinterPos[i * 3 + 2] += splinterVel[i * 3 + 2] * dt;

        const s = 1 - (splinterLife[i] / splinterMaxLife[i]) * 0.55;
        _dummyPos.set(
          splinterPos[i * 3 + 0],
          splinterPos[i * 3 + 1],
          splinterPos[i * 3 + 2]
        );
        _dummyScale.set(s, s, s);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        woodSplintersMesh.setMatrixAt(i, _dummyMatrix);
      }
      if (anySplinterUpdated) {
        woodSplintersMesh.instanceMatrix.needsUpdate = true;
      }

      for (const pool of [sparkPool, grayDustPool, gypsumDustPool]) {
        let poolUpdated = false;
        for (let i = 0; i < MAX_IMPACT_PARTICLES; i++) {
          if (!pool.active[i]) continue;
          poolUpdated = true;
          pool.life[i] += dt;
          if (pool.life[i] >= pool.maxLife[i]) {
            pool.active[i] = 0;
            _dummyMatrix.makeScale(0, 0, 0);
            pool.mesh.setMatrixAt(i, _dummyMatrix);
            continue;
          }
          pool.vel[i * 3 + 1] -= pool.gravity * dt;
          pool.pos[i * 3 + 0] += pool.vel[i * 3 + 0] * dt;
          pool.pos[i * 3 + 1] = Math.max(
            0.015,
            pool.pos[i * 3 + 1] + pool.vel[i * 3 + 1] * dt
          );
          pool.pos[i * 3 + 2] += pool.vel[i * 3 + 2] * dt;

          const s = 1 - (pool.life[i] / pool.maxLife[i]) * 0.6;
          _dummyPos.set(
            pool.pos[i * 3 + 0],
            pool.pos[i * 3 + 1],
            pool.pos[i * 3 + 2]
          );
          _dummyScale.set(s, s, s);
          _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
          pool.mesh.setMatrixAt(i, _dummyMatrix);
        }
        if (poolUpdated) {
          pool.mesh.instanceMatrix.needsUpdate = true;
        }
      }

      // 6B. Update Wood Debris
      for (let i = 0; i < activeWoodDebris.length; i++) {
        const deb = activeWoodDebris[i];
        if (deb.settled) continue;
        deb.age += dt;
        deb.vy -= 14.8 * dt;
        deb.mesh.position.x += deb.vx * dt;
        deb.mesh.position.y += deb.vy * dt;
        deb.mesh.position.z += deb.vz * dt;

        deb.mesh.rotation.x += deb.rx * dt;
        deb.mesh.rotation.y += deb.ry * dt;
        deb.mesh.rotation.z += deb.rz * dt;

        if (deb.mesh.position.y <= deb.halfY) {
          deb.mesh.position.y = deb.halfY;
          deb.vy = -deb.vy * 0.28;
          deb.vx *= 0.62;
          deb.vz *= 0.62;
          deb.rx *= 0.45;
          deb.ry *= 0.65;
          deb.rz *= 0.45;
          if (Math.abs(deb.vy) < 0.22 && Math.hypot(deb.vx, deb.vz) < 0.18) {
            deb.mesh.rotation.x = 0;
            deb.mesh.rotation.z = 0;
            deb.settled = true;
          }
        }
      }

      // 6C. Update Active HE Fragmentation Grenades
      for (let g = activeGrenades.length - 1; g >= 0; g--) {
        const gr = activeGrenades[g];
        const phys = stepHEGrenadePhysics(gr.state, dt, allObstacles);
        if (phys.bounced) {
          soundEngine.playGrenadeBounce();
        }

        gr.mesh.position.set(gr.state.x, gr.state.y, gr.state.z);
        gr.mesh.rotation.set(gr.state.rx, gr.state.ry, gr.state.rz);

        if (gr.state.exploded) {
          soundEngine.playGrenadeExplosion();
          sim.cameraTrauma = Math.min(1.0, sim.cameraTrauma + 0.75);

          const boomPos = { x: gr.state.x, y: gr.state.y, z: gr.state.z };
          spawnPoolBurst(
            sparkPool,
            boomPos,
            { x: 0, y: 1, z: 0 },
            45,
            4.5,
            12.0,
            0.35,
            0.7
          );
          spawnPoolBurst(
            grayDustPool,
            boomPos,
            { x: 0, y: 0.8, z: 0 },
            35,
            1.8,
            5.2,
            0.6,
            1.4
          );

          // Use Ring-Buffer Decal Pool for explosion scorch mark
          spawnScorchDecal(boomPos.x, boomPos.z);

          const barBlast = applyExplosionToBarricades(
            activeBarricades,
            boomPos,
            GRENADE_BLAST_RADIUS
          );
          for (let s = 0; s < barBlast.splinterBurstPoints.length; s++) {
            const pt = barBlast.splinterBurstPoints[s];
            _splinterPt.set(pt.x, pt.y, pt.z);
            spawnWoodSplinterBurst(_splinterPt, _up, 24);
          }
          if (barBlast.debris.length > 0) {
            spawnRigidBodyDebris(barBlast.debris);
          }
          if (barBlast.shatteredPlanksCount > 0 || barBlast.blownOutPlanksCount > 0) {
            rebuildIntactBarricadeMeshList();
            if (barBlast.totalCollapsedBarricadeIds.length > 0) {
              soundEngine.playBarricadeCollapse();
              showBanner('HE BLAST WAVE: BARRICADE OBLITERATED & COLLAPSED!', 2.2);
            } else {
              soundEngine.playWoodSplinter(true);
              showBanner(
                `HE BLAST: ${barBlast.shatteredPlanksCount} PLANKS SHATTERED · ${barBlast.blownOutPlanksCount} BLOWN OUT`,
                2.0
              );
            }
          }

          const solidAABBs = [
            ...currentMap.wallSegments,
            ...currentMap.doorFrameSegments,
            ...intactBarricadeLoSBoxes,
          ];

          for (let eIdx = 0; eIdx < activeEnemies.length; eIdx++) {
            const enemy = activeEnemies[eIdx];
            if (enemy.state === 'ko') continue;
            const enemyPos = {
              x: enemy.group.position.x,
              y: 1.1,
              z: enemy.group.position.z,
            };
            const blastRes = evaluateExplosionOcclusionAndDamage(
              boomPos,
              enemyPos,
              solidAABBs
            );
            if (blastRes.inRadius && !blastRes.occluded && blastRes.damage > 0) {
              enemy.hp = Math.max(0, enemy.hp - blastRes.damage);
              enemy.flinchTimer = 0.45;
              enemy.hitFlashTimer = 0.25;
              soundEngine.playHitMarker(false);
              triggerHitMarker(false, 0.095);
              if (enemy.hp <= 0 && netManager.tryClaimFatalHit(enemy.id)) {
                enemy.state = 'ko';
                enemy.koTimer = 0.01;
                enemy.laserLine.visible = false;
                const blastDir = {
                  x: enemyPos.x - boomPos.x,
                  y: 0.65,
                  z: enemyPos.z - boomPos.z,
                };
                const bLen = Math.hypot(blastDir.x, blastDir.z) || 1;
                blastDir.x /= bLen;
                blastDir.z /= bLen;
                enemy.ragdoll = createEnemyRagdoll({
                  hitZone: 'explosion',
                  impactDir: blastDir,
                  impactForce: 9.8,
                  initialYaw: enemy.group.rotation.y,
                  currentPos: {
                    x: enemy.group.position.x,
                    y: enemy.group.position.y,
                    z: enemy.group.position.z,
                  },
                });
                sim.kills++;
                pushKillfeedEntry({
                  attackerCallsign: netManager.callsign,
                  attackerTeam: netManager.team,
                  victimCallsign: `HOSTILE ${enemy.archetype.toUpperCase()}`,
                  weaponId: sim.activeWeapon,
                  isHeadshot: false,
                  isWallBang: false,
                  detailBadge: 'M67 FRAG',
                });
                spawnDirectionalBloodBurst(enemy.group.position, _blastBurstDir, 24);
                let remaining = 0;
                for (let k = 0; k < activeEnemies.length; k++) {
                  if (activeEnemies[k].state !== 'ko') remaining++;
                }
                if (remaining === 0) {
                  sim.victory = true;
                  sim.screen = 'gameover';
                  sim.scoreboardOpen = false;
                  document.exitPointerLock?.();
                  keysHeld.clear();
                  mouseLeftHeld = false;
                }
              }
            }
          }

          const playerPos = { x: camera.position.x, y: 1.0, z: camera.position.z };
          const playerBlastRes = evaluateExplosionOcclusionAndDamage(
            boomPos,
            playerPos,
            solidAABBs
          );
          if (
            playerBlastRes.inRadius &&
            !playerBlastRes.occluded &&
            playerBlastRes.damage > 0 &&
            sim.spawnShieldTimer <= 0
          ) {
            sim.hp = Math.max(0, sim.hp - playerBlastRes.damage);
            sim.damageTaken += playerBlastRes.damage;
            soundEngine.playPlayerHurt();
            triggerDamageVignette(0.22, { x: boomPos.x, z: boomPos.z });
            if (sim.hp <= 0) {
              sim.deaths += 1;
              sim.victory = false;
              sim.screen = 'gameover';
              sim.scoreboardOpen = false;
              document.exitPointerLock?.();
              keysHeld.clear();
              mouseLeftHeld = false;
            }
          }

          disposeGroupChildren(gr.mesh, sharedMaterials);
          scene.remove(gr.mesh);
          activeGrenades.splice(g, 1);
          syncHudNow();
        }
      }

      // 7. Update Ring-Buffer Wall Blood Splatter Downward Drip Animation
      for (let i = 0; i < MAX_DECAL_RING_BUFFER; i++) {
        const slot = decalRingPool[i];
        if (slot.active && slot.hasDrip && slot.age < 2.6) {
          slot.age += dt;
          const prog = Math.min(1, slot.age / 2.6);
          slot.dripMesh.scale.y = 0.1 + prog * slot.maxDripScale;
          slot.dripMesh.position.y -= dt * 0.045;
        }
      }

      // Smooth ghost HP bar & 60Hz DOM ref mutators (zero React re-renders)
      sim.ghostHp += (sim.hp - sim.ghostHp) * (1 - Math.exp(-4.5 * dt));
      if (domRefs.hpGhostBarRef.current) {
        domRefs.hpGhostBarRef.current.style.width = `${Math.max(0, sim.ghostHp)}%`;
      }
      updateHighFrequencyDomRefs();

      // Minimap canvas update (~10Hz, zero React state update)
      minimapAccumulator += dt;
      if (minimapAccumulator >= 0.1) {
        minimapAccumulator = 0;
        renderMinimap();
      }

      // Discrete / low-frequency React HUD check (~2.5Hz or when sector/banner/enemies change)
      hudSyncAccumulator += dt;
      if (hudSyncAccumulator >= 0.4) {
        hudSyncAccumulator = 0;
        const curRoom = findRoomAtPosition(
          currentMap,
          sim.playerBodyPos.x,
          sim.playerBodyPos.z
        );
        let remCount = 0;
        for (let k = 0; k < activeEnemies.length; k++) {
          if (activeEnemies[k].state !== 'ko') remCount++;
        }
        if (
          curRoom.name !== lastSyncedSectorName ||
          remCount !== lastSyncedEnemiesRem ||
          sim.statusBanner !== lastSyncedBanner ||
          sim.isReloading
        ) {
          syncHudNow();
        }
      }
    }

    // Render World Pass on Layer 0, then clear depth buffer & render First-Person Weapon Viewmodel on Layer 1
    camera.layers.set(WORLD_SCENE_LAYER);
    renderer.render(scene, camera);
    if (sim.screen === 'playing') {
      const savedBg = scene.background;
      const savedFog = scene.fog;
      scene.background = null;
      scene.fog = null;
      renderer.autoClear = false;
      renderer.clearDepth();
      camera.layers.set(WEAPON_VIEWMODEL_LAYER);
      renderer.render(scene, camera);
      renderer.autoClear = true;
      scene.background = savedBg;
      scene.fog = savedFog;
    }
    camera.layers.enableAll();

    // Secondary 3D Weapon Preview Pass (Scissor Viewport Overlay when in Title / Loadout Menu)
    const previewEl = domRefs.weaponPreviewMountRef.current;
    if (sim.screen === 'title' && previewEl) {
      const rect = previewEl.getBoundingClientRect();
      const canvasRect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 16 && rect.height > 16 && canvasRect.height > 16) {
        const left = Math.max(0, rect.left - canvasRect.left);
        const bottom = Math.max(0, canvasRect.bottom - rect.bottom);
        const width = Math.min(canvasRect.width - left, rect.width);
        const height = Math.min(canvasRect.height - bottom, rect.height);

        inspectCamera.aspect = width / height;
        inspectCamera.updateProjectionMatrix();

        renderer.setViewport(left, bottom, width, height);
        renderer.setScissor(left, bottom, width, height);
        renderer.setScissorTest(true);
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(inspectScene, inspectCamera);
        renderer.autoClear = true;
        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, canvasRect.width, canvasRect.height);
      }
    }

    if (isSoftwareGl) afterDraw(tick);
    else frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);

  return {
    startMatch: (newSeed, loadoutOverride, layoutOverride) =>
      resetAndStartMatch(newSeed, loadoutOverride, layoutOverride),
    resumeMatch: () => {
      sim.screen = 'playing';
      keysHeld.clear();
      mouseLeftHeld = false;
      syncHudNow();
    },
    pauseMatch: () => {
      if (sim.screen === 'playing') {
        sim.screen = 'paused';
        document.exitPointerLock?.();
        keysHeld.clear();
        mouseLeftHeld = false;
        syncHudNow();
      }
    },
    returnToTitle: () => {
      sim.screen = 'title';
      sim.scoreboardOpen = false;
      document.exitPointerLock?.();
      keysHeld.clear();
      mouseLeftHeld = false;
      syncHudNow();
    },
    switchWeapon,
    toggleFireMode,
    triggerMedbag,
    triggerMelee: triggerMeleeStrike,
    triggerInspectSpin,
    triggerLobbyTurntableAction,
    toggleFlashlight,
    throwGrenade,
    updateGraphicsSettings: (settings) => {
      currentGraphicsSettings = { ...currentGraphicsSettings, ...settings };
      applyGraphicsSettings(currentGraphicsSettings);
      syncHudNow();
    },
    setLeanMode: (mode) => {
      sim.leanMode = mode;
      sim.leanTarget = 0;
      syncHudNow();
    },
    setLeanTargetDirect: (dir) => {
      sim.leanTarget = sim.leanTarget === dir ? 0 : dir;
      soundEngine.playLeanSwoosh();
      syncHudNow();
    },
    toggleAds: () => {
      if (sim.screen === 'playing' && !sim.isReloading) {
        sim.isAds = !sim.isAds;
        syncHudNow();
      }
    },
    toggleMute: () => {
      soundEngine.muted = !soundEngine.muted;
      syncHudNow();
    },
    fireSingleShot: () => {
      firePlayerWeapon();
    },
    setCallsign: (callsign) => {
      netManager.setCallsign(callsign);
      syncHudNow();
    },
    setGameMode: (mode) => {
      netManager.setMode(mode);
      syncHudNow();
    },
    setOperatorTeam: (team) => {
      netManager.setTeam(team);
      syncHudNow();
    },
    joinPartyCode: (code) => {
      const joined = netManager.joinPartyCode(
        code,
        netManager.mode,
        currentMap.seed,
        currentMap.layoutVariant
      );
      showBanner(`JOINED PARTY ROOM #${joined}`, 1.8);
      syncHudNow();
      return joined;
    },
    generateNewPartyCode: () => {
      const nextCode = generatePartyCode();
      netManager.joinPartyCode(
        nextCode,
        netManager.mode,
        currentMap.seed,
        currentMap.layoutVariant
      );
      showBanner(`GENERATED NEW PARTY CODE #${nextCode}`, 1.8);
      syncHudNow();
      return nextCode;
    },
    toggleScoreboard: (force) => {
      sim.scoreboardOpen = typeof force === 'boolean' ? force : !sim.scoreboardOpen;
      syncHudNow();
    },
    getCurrentMap: () => currentMap,
    dispose: () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      netManager.dispose();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      disposeGroupChildren(mapGroup, sharedMaterials);
      disposeGroupChildren(barricadeGroup, sharedMaterials);
      disposeGroupChildren(debrisGroup, sharedMaterials);
      disposeGroupChildren(decalGroup, sharedMaterials);
      disposeGroupChildren(enemiesGroup, sharedMaterials);
      disposeGroupChildren(remotePlayersGroup, sharedMaterials);
      envRenderTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    },
  };
}
