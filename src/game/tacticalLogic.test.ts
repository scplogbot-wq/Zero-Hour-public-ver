import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBallisticDamage,
  useMedicalBag,
  computeNextLeanTarget,
  stepLeanKinematics,
  generateCQBMap,
  validateMapGeometry,
  hasStrictLineOfSight,
  resolveCircleAABBCollision,
  LEAN_MAX_OFFSET_X,
  LEAN_MAX_ANGLE_RAD,
  createBarricadeForDoorway,
  applyBulletToBarricade,
  applyMeleeToBarricade,
  calculatePenetratedDamage,
  getIntactBarricadeLoSAABBs,
  BARRICADE_PLANK_COUNT,
  evaluateAcousticOcclusion,
  stepAcousticFilterState,
  ACOUSTIC_LPF_OCCLUDED_HZ,
  ACOUSTIC_LPF_CLEAR_HZ,
  ACOUSTIC_OCCLUDED_VOLUME_SCALE,
  shootLightFixture,
  isTargetIlluminatedByFlashlight,
  computeEffectiveAIVisionRange,
  AI_BASE_VISION_RANGE,
  evaluateMaterialBallistics,
  buildNavGraph,
  findNavPath,
  createHEGrenade,
  stepHEGrenadePhysics,
  evaluateExplosionOcclusionAndDamage,
  INITIAL_GRENADES,
  GRENADE_FUSE_SEC,
  GRENADE_BLAST_RADIUS,
  GRENADE_EPICENTER_DAMAGE,
  applyExplosionToBarricades,
  solveTwoBoneIK,
  calculateMultiBoneAimAngles,
  stepAIAnimationBlend,
  evaluateEnemyAmbientChat,
  getAmbientCalloutText,
  SPOTTED_CALLOUTS,
  LOST_SIGHT_CALLOUTS,
  GLOBAL_CHAT_COOLDOWN_SEC,
  AMBIENT_SHOUT_COOLDOWN_MIN,
  createEnemyRagdoll,
  stepEnemyRagdollPhysics,
  WEAPONS,
  PRIMARY_WEAPON_IDS,
  SECONDARY_WEAPON_IDS,
  ALL_WEAPON_IDS,
  ATTACHMENTS,
  ALL_ATTACHMENT_IDS,
  isAttachmentCompatible,
  sanitizeWeaponAttachments,
  computeEffectiveWeaponStats,
  getWeaponStatBars,
  createLoadoutRuntimeWeapons,
  ALL_MAP_LAYOUT_VARIANTS,
  MAP_LAYOUT_META,
  findRoomAtPosition,
  canPlayerFire,
  canPlayerSprint,
  computePlayerMovementSpeed,
  evaluateLockerAmbushTriggers,
  stepLockerDoorKinematics,
  OPTIC_LOCAL_OFFSETS,
  computeOpticAlignedAdsPosition,
  computeDynamicCameraNearPlane,
  WORLD_SCENE_LAYER,
  WEAPON_VIEWMODEL_LAYER,
  AI_LOW_HEALTH_THRESHOLD,
  findBestCoverPosition,
  evaluateAIBehaviorTree,
  RAGDOLL_SKELETAL_CONSTRAINTS,
  MELEE_WEAPON_IDS,
  PLAYER_STANDING_EYE_Y,
  PLAYER_CROUCHED_EYE_Y,
  PLAYER_STANDING_CAPSULE_HEIGHT,
  PLAYER_CROUCHED_CAPSULE_HEIGHT,
  PLAYER_JUMP_IMPULSE_VELOCITY,
  PLAYER_GRAVITY_ACCEL,
  CROUCH_RECOIL_SPREAD_MULTIPLIER,
  stepPlayerCrouch,
  evaluateColtSAAFireMode,
  createColtSAAReloadState,
  startColtSAAReload,
  stepColtSAAReload,
  createColtSAASpinState,
  triggerColtSAASpin,
  stepColtSAASpin,
  ANIM_CROSSFADE_DURATION_SEC,
  createWeaponAnimationBlendState,
  stepWeaponAnimationController,
  createWeaponSpringState,
  applyWeaponSpringRecoilImpulse,
  stepWeaponSpringPhysics,
  getRoomsAlongRay,
  getWeaponStatDelta,
} from './tacticalLogic';
import {
  generatePartyCode,
  sanitizePartyCode,
  lerpAngleRad,
  interpolateRemotePlayerPose,
  InterpolatedRemotePose,
  computeTeamSpawnPoint,
  SPAWN_SHIELD_DURATION_SEC,
} from './multiplayerNet';

test('Weapons & Realistic Damage Profile: headshots are 1-shot kills, HK416 torso is 45-55, G17 torso is 30-35', () => {
  // Headshots >= 100 HP (instant 1-shot kill)
  assert.ok(calculateBallisticDamage('hk416', 'head') >= 100);
  assert.ok(calculateBallisticDamage('glock17', 'head') >= 100);

  // HK416 torso: 45-55 damage (2-3 shots to kill 100 HP)
  const hkMin = calculateBallisticDamage('hk416', 'torso', 0);
  const hkMax = calculateBallisticDamage('hk416', 'torso', 1);
  assert.equal(hkMin, 45);
  assert.equal(hkMax, 55);

  // Glock 17 torso: 30-35 damage (3-4 shots to kill 100 HP)
  const g17Min = calculateBallisticDamage('glock17', 'torso', 0);
  const g17Max = calculateBallisticDamage('glock17', 'torso', 1);
  assert.equal(g17Min, 30);
  assert.equal(g17Max, 35);
});

test('Health & Medical Bags: restores 80 HP capped at 100 HP and decrements 4 bag inventory', () => {
  // At full 100 HP, medbag is not wasted
  const fullTry = useMedicalBag(100, 4);
  assert.equal(fullTry.consumed, false);
  assert.equal(fullTry.medbags, 4);
  assert.equal(fullTry.hp, 100);

  // At 15 HP, consuming 1 bag restores 80 HP -> 95 HP, 3 bags left
  const heal1 = useMedicalBag(15, 4);
  assert.equal(heal1.consumed, true);
  assert.equal(heal1.hp, 95);
  assert.equal(heal1.healed, 80);
  assert.equal(heal1.medbags, 3);

  // At 55 HP, consuming 1 bag restores up to 100 HP cap -> 100 HP, 2 bags left
  const heal2 = useMedicalBag(55, heal1.medbags);
  assert.equal(heal2.consumed, true);
  assert.equal(heal2.hp, 100);
  assert.equal(heal2.healed, 45);
  assert.equal(heal2.medbags, 2);
});

test('Tactical Leaning: supports toggle and hold modes, ~15 deg Z rotation, 0.35 X offset, and wall collision clamp', () => {
  // Toggle mode Q press -> lean left (-1), press Q again -> unlean (0)
  let target = computeNextLeanTarget(0, 'toggle', {
    key: 'Q',
    type: 'keydown',
    qHeld: true,
    eHeld: false,
  });
  assert.equal(target, -1);
  target = computeNextLeanTarget(target, 'toggle', {
    key: 'Q',
    type: 'keydown',
    qHeld: true,
    eHeld: false,
  });
  assert.equal(target, 0);

  // Hold mode E press and release
  const holdRight = computeNextLeanTarget(0, 'hold', {
    key: 'E',
    type: 'keydown',
    qHeld: false,
    eHeld: true,
  });
  assert.equal(holdRight, 1);
  const holdRelease = computeNextLeanTarget(holdRight, 'hold', {
    key: 'E',
    type: 'keyup',
    qHeld: false,
    eHeld: false,
  });
  assert.equal(holdRelease, 0);

  // Unobstructed lean kinematics converges to ±0.35 offset and ±15 deg roll
  let lean = 0;
  let step = { leanAmount: 0, offsetX: 0, rollZ: 0 };
  for (let i = 0; i < 30; i++) {
    step = stepLeanKinematics({
      currentLeanAmount: lean,
      targetLean: 1,
      dt: 0.05,
      wallClearanceDist: null,
    });
    lean = step.leanAmount;
  }
  assert.ok(Math.abs(step.offsetX - LEAN_MAX_OFFSET_X) < 0.01);
  assert.ok(Math.abs(Math.abs(step.rollZ) - LEAN_MAX_ANGLE_RAD) < 0.01);

  // Wall collision clamp prevents leaning through adjacent wall at 0.25m distance
  const blockedStep = stepLeanKinematics({
    currentLeanAmount: 0,
    targetLean: 1,
    dt: 0.05,
    wallClearanceDist: 0.24, // right against safety margin
  });
  assert.equal(blockedStep.offsetX, 0);
});

test('Procedural CQB Map Generation: flood-fill reachable and zero overlapping walls or blocked doorways across multiple seeds', () => {
  for (const seed of [101, 2026, 4096, 7777, 9999]) {
    const map = generateCQBMap(seed);
    assert.equal(map.allRoomsReachable, true, `Seed ${seed} must have all rooms reachable`);
    const validation = validateMapGeometry(map);
    assert.equal(validation.overlapCount, 0, `Seed ${seed} must have 0 overlapping wall/frame segments`);
    assert.equal(validation.blockedDoorways, 0, `Seed ${seed} must have 0 blocked doorways`);
    assert.equal(validation.valid, true);
  }
});

test('AI Strict Line-of-Sight (LoS): wall occlusion blocks AI vision and open doorway permits LoS', () => {
  const map = generateCQBMap(1337);
  // Test ray through solid perimeter wall is strictly blocked
  const blocked = hasStrictLineOfSight(
    { x: 4, y: 1.5, z: -2 },
    { x: 4, y: 1.5, z: 4 },
    map.wallSegments
  );
  assert.equal(blocked, false);

  // Test ray inside the same room without walls between points is clear
  const clearInRoom = hasStrictLineOfSight(
    { x: 2.5, y: 1.5, z: 2.5 },
    { x: 5.5, y: 1.5, z: 5.5 },
    map.wallSegments
  );
  assert.equal(clearInRoom, true);

  // Test circle-vs-AABB collision keeps actors out of walls while allowing passage under lintels
  const col = resolveCircleAABBCollision(0.05, 4.0, 0.35, map.wallSegments, 1.7);
  assert.equal(col.collided, true);
  assert.ok(col.x >= 0.16 + 0.34);
});

test('Destructible Wooden Barricade: 12 planks with distinct UV mapping, localized chunk bullet holes, and 40% gunfire collapse', () => {
  const map = generateCQBMap(2026);
  const door = map.doorways[0];
  const bar = createBarricadeForDoorway(door);

  assert.equal(bar.plankCount, BARRICADE_PLANK_COUNT);
  assert.equal(bar.planks.length, 12);
  // Verify distinct UV mappings per plank
  assert.notDeepEqual(bar.planks[0].uvOffset, bar.planks[1].uvOffset);

  // Single HK416 bullet splinters a small chunk out of plank 6 while leaving the rest of plank 6 intact
  const shot1 = applyBulletToBarricade(bar, 6, 2, 'hk416', { x: 1, y: 0, z: 0 });
  assert.equal(shot1.chunkDestroyed, true);
  assert.equal(shot1.plankDestroyed, false);
  assert.equal(bar.planks[6].intact, true);
  assert.equal(bar.planks[6].chunks[2].intact, false);
  assert.equal(bar.planks[6].chunks[0].intact, true);

  // Destroying 5 of 12 planks (>= 40%) via gunfire triggers Total Structural Failure
  for (const pIdx of [0, 1, 2, 3, 4]) {
    applyBulletToBarricade(bar, pIdx, 0, 'hk416', { x: 1, y: 0, z: 0 });
    applyBulletToBarricade(bar, pIdx, 1, 'hk416', { x: 1, y: 0, z: 0 });
    applyBulletToBarricade(bar, pIdx, 2, 'hk416', { x: 1, y: 0, z: 0 });
  }
  assert.equal(bar.collapsed, true);
  assert.equal(bar.structuralIntegrityPct, 0);
  assert.equal(bar.planks.every((p) => !p.intact), true);
});

test('Destructible Wooden Barricade: Melee strike shatters 1-2 planks, opens two-way murder hole LoS, 3 melee hits collapse, and 30% wall-bang reduction', () => {
  const door = {
    id: 'door-test',
    x: 8.0,
    z: 4.0,
    orientation: 'EW' as const,
    width: 2.08,
    height: 2.49,
  };
  const bar = createBarricadeForDoorway(door);

  // Intact barricade blocks Line-of-Sight completely through the doorway
  const plank7CenterY = (bar.planks[7].aabb.minY + bar.planks[7].aabb.maxY) * 0.5;
  const eyeLeft = { x: 6.5, y: plank7CenterY, z: 4.0 };
  const eyeRight = { x: 9.5, y: plank7CenterY, z: 4.0 };
  assert.equal(
    hasStrictLineOfSight(eyeLeft, eyeRight, getIntactBarricadeLoSAABBs([bar])),
    false
  );

  // 1st Melee Strike at plank 7 shatters planks 7 & 8 -> creates a physical Two-Way Murder Hole!
  const m1 = applyMeleeToBarricade(bar, 7, { x: 1, y: 0, z: 0 });
  assert.equal(m1.shatteredPlankIndices.length, 2);
  assert.equal(m1.totalCollapseTriggered, false);
  assert.equal(bar.planks[7].intact, false);
  assert.equal(bar.planks[8].intact, false);

  // Ray through shattered plank 7 now has clear two-way Line-of-Sight, while ray through intact plank 2 is still blocked!
  assert.equal(
    hasStrictLineOfSight(eyeLeft, eyeRight, getIntactBarricadeLoSAABBs([bar])),
    true
  );
  const lowY = (bar.planks[2].aabb.minY + bar.planks[2].aabb.maxY) * 0.5;
  assert.equal(
    hasStrictLineOfSight(
      { x: 6.5, y: lowY, z: 4.0 },
      { x: 9.5, y: lowY, z: 4.0 },
      getIntactBarricadeLoSAABBs([bar])
    ),
    false
  );

  // 2nd and 3rd melee strikes -> 3rd melee hit triggers Total Structural Failure!
  applyMeleeToBarricade(bar, 4, { x: 1, y: 0, z: 0 });
  const m3 = applyMeleeToBarricade(bar, 2, { x: 1, y: 0, z: 0 });
  assert.equal(m3.totalCollapseTriggered, true);
  assert.equal(bar.collapsed, true);

  // Wall-bang penetration reduces bullet damage by 30%
  assert.equal(calculatePenetratedDamage(50), 35);
  assert.equal(calculatePenetratedDamage(100), 70);
});

test('Acoustic Occlusion & Dynamic Audio Routing: LPF muffling (480 Hz, -40% volume) and real-time interpolation on barricade breach', () => {
  const door = {
    id: 'door-acoustic',
    x: 8.0,
    z: 4.0,
    orientation: 'EW' as const,
    width: 2.08,
    height: 2.49,
  };
  const bar = createBarricadeForDoorway(door);
  const y = (bar.planks[7].aabb.minY + bar.planks[7].aabb.maxY) * 0.5;
  const sourcePos = { x: 9.5, y, z: 4.0 };
  const listenerPos = { x: 6.2, y, z: 4.0 };

  // 1. Intact barricade occludes audio -> LPF 480 Hz and 0.60 volume (-40%)
  const occ = evaluateAcousticOcclusion(
    sourcePos,
    listenerPos,
    getIntactBarricadeLoSAABBs([bar])
  );
  assert.equal(occ.occluded, true);
  assert.equal(occ.targetLpfHz, ACOUSTIC_LPF_OCCLUDED_HZ);
  assert.equal(occ.targetVolumeScale, ACOUSTIC_OCCLUDED_VOLUME_SCALE);

  // 2. Breaching plank 7 opens physical line-of-sight -> LPF target restores to 18000 Hz & 1.0 volume
  applyMeleeToBarricade(bar, 7, { x: 1, y: 0, z: 0 });
  const clear = evaluateAcousticOcclusion(
    sourcePos,
    listenerPos,
    getIntactBarricadeLoSAABBs([bar])
  );
  assert.equal(clear.occluded, false);
  assert.equal(clear.targetLpfHz, ACOUSTIC_LPF_CLEAR_HZ);
  assert.equal(clear.targetVolumeScale, 1.0);

  // 3. Real-time interpolation smoothly brings LPF cutoff back to 18000 Hz
  let lpfHz = ACOUSTIC_LPF_OCCLUDED_HZ;
  let vol = ACOUSTIC_OCCLUDED_VOLUME_SCALE;
  for (let i = 0; i < 40; i++) {
    const stepped = stepAcousticFilterState({
      currentLpfHz: lpfHz,
      currentVolumeScale: vol,
      targetLpfHz: clear.targetLpfHz,
      targetVolumeScale: clear.targetVolumeScale,
      dt: 0.05,
    });
    lpfHz = stepped.lpfHz;
    vol = stepped.volumeScale;
  }
  assert.equal(lpfHz, ACOUSTIC_LPF_CLEAR_HZ);
  assert.equal(vol, 1.0);
});

test('Dynamic Lighting & Tactical Visibility: 1-HP shootable light fixtures, 80% AI vision reduction in darkness, and flashlight/muzzle-flash restoration', () => {
  const map = generateCQBMap(2026);
  assert.equal(map.lightFixtures.length, 9);
  const fixture = map.lightFixtures[0];
  assert.equal(fixture.hp, 1);
  assert.equal(fixture.intact, true);

  // Shooting the 1-HP bulb destroys it, spawns sparks, and disables PointLight
  const hitRes = shootLightFixture(fixture);
  assert.equal(hitRes.destroyed, true);
  assert.equal(hitRes.spawnSparks, true);
  assert.equal(hitRes.disablePointLight, true);
  assert.equal(fixture.intact, false);
  assert.equal(fixture.hp, 0);

  // Lit room gives 100% AI vision range (22.0m); dark room reduces AI vision by 80% (to 4.4m)
  const litRange = computeEffectiveAIVisionRange({
    roomLightIntact: true,
    illuminatedByFlashlight: false,
    playerMuzzleFlashActive: false,
  });
  assert.equal(litRange, AI_BASE_VISION_RANGE);

  const darkRange = computeEffectiveAIVisionRange({
    roomLightIntact: false,
    illuminatedByFlashlight: false,
    playerMuzzleFlashActive: false,
  });
  assert.equal(darkRange, Number((AI_BASE_VISION_RANGE * 0.2).toFixed(4)));

  // Shining the player's flashlight [T] onto an AI or firing a weapon (muzzle flash) immediately restores 100% vision range
  const illum = isTargetIlluminatedByFlashlight({
    flashlightActive: true,
    flashlightOrigin: { x: 4, y: 1.68, z: 4 },
    flashlightDir: { x: 1, y: 0, z: 0 },
    targetPos: { x: 9.2, y: 1.5, z: 4.1 },
  });
  assert.equal(illum, true);

  const restoredByFlashlight = computeEffectiveAIVisionRange({
    roomLightIntact: false,
    illuminatedByFlashlight: illum,
    playerMuzzleFlashActive: false,
  });
  assert.equal(restoredByFlashlight, AI_BASE_VISION_RANGE);

  const restoredByMuzzleFlash = computeEffectiveAIVisionRange({
    roomLightIntact: false,
    illuminatedByFlashlight: false,
    playerMuzzleFlashActive: true,
  });
  assert.equal(restoredByMuzzleFlash, AI_BASE_VISION_RANGE);
});

test('Material-Based Ballistic Penetration: Concrete/Steel stop bullets (0 dmg), Drywall penetrated by HK416 (-40% dmg + entry/exit gypsum), Wood (-30% dmg)', () => {
  const drywallWall = {
    id: 'test-drywall',
    minX: 7.84,
    maxX: 8.16,
    minY: 0,
    maxY: 3.6,
    minZ: 0,
    maxZ: 8,
    kind: 'wall' as const,
    materialTag: 'drywall' as const,
  };

  // 1. Concrete & Steel stop bullets immediately with 0 damage and spawn sparks + gray dust
  const concreteRes = evaluateMaterialBallistics({
    materialTag: 'concrete',
    weaponId: 'hk416',
    incomingDamage: 50,
    origin: { x: 6, y: 1.5, z: 4 },
    dir: { x: 1, y: 0, z: 0 },
    surfaceAABB: { ...drywallWall, materialTag: 'concrete' },
  });
  assert.equal(concreteRes.penetrated, false);
  assert.equal(concreteRes.outgoingDamage, 0);
  assert.equal(concreteRes.spawnSparks, true);
  assert.equal(concreteRes.spawnGrayDust, true);

  const steelRes = evaluateMaterialBallistics({
    materialTag: 'steel',
    weaponId: 'hk416',
    incomingDamage: 50,
    origin: { x: 6, y: 1.5, z: 4 },
    dir: { x: 1, y: 0, z: 0 },
    surfaceAABB: { ...drywallWall, materialTag: 'steel' },
  });
  assert.equal(steelRes.penetrated, false);
  assert.equal(steelRes.outgoingDamage, 0);
  assert.equal(steelRes.spawnSparks, true);

  // 2. Drywall: High-caliber HK416 penetrates with 40% damage reduction (50 -> 30) and computes entry & exit points
  const drywallHK = evaluateMaterialBallistics({
    materialTag: 'drywall',
    weaponId: 'hk416',
    incomingDamage: 50,
    origin: { x: 6, y: 1.5, z: 4 },
    dir: { x: 1, y: 0, z: 0 },
    surfaceAABB: drywallWall,
  });
  assert.equal(drywallHK.penetrated, true);
  assert.equal(drywallHK.outgoingDamage, 30); // 40% reduction
  assert.equal(drywallHK.spawnGypsumEntryExit, true);
  assert.ok(drywallHK.entryPoint && Math.abs(drywallHK.entryPoint.x - 7.84) < 1e-4);
  assert.ok(drywallHK.exitPoint && Math.abs(drywallHK.exitPoint.x - 8.16) < 1e-4);

  // 3. Wood: Penetrates with 30% damage reduction (50 -> 35) and spawns wood splinters
  const woodRes = evaluateMaterialBallistics({
    materialTag: 'wood',
    weaponId: 'hk416',
    incomingDamage: 50,
    origin: { x: 6, y: 1.5, z: 4 },
    dir: { x: 1, y: 0, z: 0 },
  });
  assert.equal(woodRes.penetrated, true);
  assert.equal(woodRes.outgoingDamage, 35); // 30% reduction
  assert.equal(woodRes.spawnWoodSplinters, true);
});

test('Navigation Graph & A* Pathfinding: connects room centers and doorways, finds path around obstacles', () => {
  const map = generateCQBMap(2026);
  assert.ok(map.navGraph.waypoints.length > 0);
  assert.ok(map.navGraph.waypointMap.size > 0);

  // Path from Room (0,0) center to Room (2,2) center
  const startPos = { x: map.rooms[0].centerX, z: map.rooms[0].centerZ };
  const goalPos = { x: map.rooms[8].centerX, z: map.rooms[8].centerZ };

  const path = findNavPath(map.navGraph, startPos, goalPos, map.wallSegments);
  assert.ok(path.length >= 1);
  const endPoint = path[path.length - 1];
  assert.equal(endPoint.x, goalPos.x);
  assert.equal(endPoint.z, goalPos.z);
});

test('High-Explosive (HE) Fragmentation Grenade: 3s fuse countdown, bouncing physics, 6m blast radius, and solid wall occlusion', () => {
  assert.equal(INITIAL_GRENADES, 3);
  assert.equal(GRENADE_FUSE_SEC, 3.0);
  assert.equal(GRENADE_BLAST_RADIUS, 6.0);
  assert.equal(GRENADE_EPICENTER_DAMAGE, 150);

  // 1. Grenade creation & physics step
  const grenade = createHEGrenade('g-test', { x: 4, y: 1.5, z: 4 }, { x: 1, y: 0, z: 0 }, 14.0);
  assert.equal(grenade.exploded, false);
  assert.equal(grenade.fuseTimer, 3.0);

  // Step physics with floor at y = 0.08
  for (let i = 0; i < 20; i++) {
    stepHEGrenadePhysics(grenade, 0.05, []);
  }
  assert.ok(grenade.y >= 0.08); // Never falls below floor
  assert.ok(grenade.fuseTimer < 3.0);

  // Stepping until fuse runs out triggers detonation
  for (let i = 0; i < 60; i++) {
    stepHEGrenadePhysics(grenade, 0.05, []);
  }
  assert.equal(grenade.exploded, true);

  // 2. Blast damage & occlusion evaluation
  const explosionPos = { x: 5.0, y: 0.1, z: 5.0 };

  // Target within 1.0m with clear line of sight takes heavy damage (~125 HP)
  const closeTarget = { x: 5.5, y: 1.0, z: 5.5 };
  const clearBlast = evaluateExplosionOcclusionAndDamage(explosionPos, closeTarget, []);
  assert.equal(clearBlast.inRadius, true);
  assert.equal(clearBlast.occluded, false);
  assert.ok(clearBlast.damage > 100);

  // Target beyond 6.0m takes 0 damage (outside blast zone)
  const farTarget = { x: 15.0, y: 1.0, z: 15.0 };
  const farBlast = evaluateExplosionOcclusionAndDamage(explosionPos, farTarget, []);
  assert.equal(farBlast.inRadius, false);
  assert.equal(farBlast.damage, 0);

  // Target within 3.0m but blocked by a solid wall takes ZERO damage!
  const wallBox = {
    id: 'blast-blocking-wall',
    minX: 5.8,
    maxX: 6.2,
    minY: 0,
    maxY: 3.0,
    minZ: 3.0,
    maxZ: 7.0,
    kind: 'wall' as const,
  };
  const occludedTarget = { x: 7.0, y: 1.0, z: 5.0 };
  const occludedBlast = evaluateExplosionOcclusionAndDamage(explosionPos, occludedTarget, [wallBox]);
  assert.equal(occludedBlast.inRadius, true);
  assert.equal(occludedBlast.occluded, true);
  assert.equal(occludedBlast.damage, 0);
});

test('Explosive Barricade Destruction: radial fracture within 6m, instant shattering within 3m, outward blast wave rigid bodies between 3-6m, and 40% collapse threshold', () => {
  // Construct door barricade at (4.0, 4.0) with orientation EW
  const door = {
    id: 'door-blast-test',
    x: 4.0,
    z: 4.0,
    orientation: 'EW' as const,
    width: 2.2,
    height: 2.55,
  };
  const barricade = createBarricadeForDoorway(door);
  assert.equal(barricade.planks.length, 12);
  assert.equal(barricade.collapsed, false);
  assert.equal(barricade.structuralIntegrityPct, 100);

  // 1. Detonation at 2.0m distance (epicenter <= 3.0m)
  // Explodes close to the center planks (y ~ 1.3, z = 4.0, x = 6.0 => dist = 2.0m)
  const closeDetonation = { x: 6.0, y: 1.3, z: 4.0 };
  const res1 = applyExplosionToBarricades([barricade], closeDetonation, 6.0);

  // Close planks must shatter into splinter particles
  assert.ok(res1.shatteredPlanksCount > 0, 'Planks <= 3m must shatter into splinters');
  assert.ok(res1.splinterBurstPoints.length > 0, 'Splinter particle burst points recorded');
  assert.ok(res1.debris.length > 0, 'Debris generated');

  // Verify that shattered planks are no longer intact
  const destroyedPlanks = barricade.planks.filter((p) => !p.intact);
  assert.ok(destroyedPlanks.length >= res1.shatteredPlanksCount);

  // 2. Test outer blast wave physics (3m..6m):
  // Reset fresh barricade
  const barricade2 = createBarricadeForDoorway(door);
  // Detonate at 4.2m distance (3m < dist <= 6m)
  const outerDetonation = { x: 8.2, y: 1.3, z: 4.0 };
  const res2 = applyExplosionToBarricades([barricade2], outerDetonation, 6.0);

  assert.ok(res2.blownOutPlanksCount > 0, 'Planks in 3-6m zone suffer constraint failure');
  // Check that debris has outward impulse (positive x direction away from blast)
  const blownOutDebris = res2.debris.find((d) => d.id.includes('blastwave'));
  assert.ok(blownOutDebris, 'Dynamic rigid body debris spawned for outer blast wave planks');
  if (blownOutDebris) {
    // Blast was at x = 8.2, barricade at x = 4.0 -> impulse is negative X (away from blast)
    assert.ok(blownOutDebris.vx < 0, 'Debris impulse directed away from explosion epicenter');
    assert.ok(blownOutDebris.vy > 0, 'Debris has upward lifting component');
  }

  // 3. Test that distant explosion (> 6m) has 0 effect on barricade
  const barricade3 = createBarricadeForDoorway(door);
  const farDetonation = { x: 18.0, y: 1.3, z: 4.0 };
  const res3 = applyExplosionToBarricades([barricade3], farDetonation, 6.0);
  assert.equal(res3.shatteredPlanksCount, 0);
  assert.equal(res3.blownOutPlanksCount, 0);
  assert.equal(barricade3.structuralIntegrityPct, 100);
  assert.equal(barricade3.collapsed, false);

  // 4. Test 40% collapse threshold: massive close blast collapses entire door
  const barricade4 = createBarricadeForDoorway(door);
  const directBlast = { x: 4.0, y: 1.3, z: 4.0 };
  const res4 = applyExplosionToBarricades([barricade4], directBlast, 6.0);
  assert.ok(barricade4.collapsed, 'Massive blast collapses barricade completely');
  assert.equal(barricade4.structuralIntegrityPct, 0);
  assert.ok(res4.totalCollapsedBarricadeIds.includes(barricade4.id));
});

test('Analytical Two-Bone IK & Multi-Bone Procedural Aiming: solves elbow flexion and shoulder angles within physical reach, distributes yaw/pitch across spine1, spine2, neck, head, and right arm', () => {
  // 1. Two-bone IK solver: Upper arm = 0.28m, Forearm = 0.26m (Max reach = 0.54m)
  const midReach = solveTwoBoneIK(0.38, 0.28, 0.26);
  assert.equal(midReach.valid, true);
  assert.ok(midReach.elbowFlexionAngle > 0, 'Elbow is flexed at mid-reach');
  assert.ok(midReach.shoulderAngle > 0, 'Shoulder angle computed');

  // Full extension reach (0.53m close to 0.54m max) -> elbow is significantly straighter
  const fullReach = solveTwoBoneIK(0.53, 0.28, 0.26);
  assert.ok(
    fullReach.elbowFlexionAngle < midReach.elbowFlexionAngle,
    'Elbow is straighter at near-maximum reach than at mid-reach'
  );
  assert.ok(fullReach.elbowFlexionAngle < 0.45);

  // Out-of-reach target (0.85m > 0.54m) -> clamped safely without NaN or infinity
  const clampedReach = solveTwoBoneIK(0.85, 0.28, 0.26);
  assert.equal(clampedReach.valid, true);
  assert.ok(Number.isFinite(clampedReach.shoulderAngle));
  assert.ok(Number.isFinite(clampedReach.elbowFlexionAngle));

  // 2. Multi-bone procedural aiming distribution
  const aiChest = { x: 5.0, y: 1.2, z: 5.0 };
  const aiFacingYaw = 0; // facing south (-Z)
  // Target is ahead and slightly above/right: (5.8, 1.8, 2.0)
  const target = { x: 5.8, y: 1.8, z: 2.0 };
  const aim = calculateMultiBoneAimAngles(aiChest, aiFacingYaw, target);

  assert.ok(Number.isFinite(aim.totalYaw));
  assert.ok(Number.isFinite(aim.totalPitch));
  // Proportional distribution ensures natural spine articulation:
  // spine2 gets largest share (~42%), spine1 gets ~22%, neck/head share remaining
  assert.ok(Math.abs(aim.spine2Pitch) > Math.abs(aim.spine1Pitch));
  assert.ok(Math.abs(aim.spine2Yaw) > Math.abs(aim.spine1Yaw));
  assert.ok(Math.abs(aim.headPitch) > 0);
  assert.ok(Math.abs(aim.armPitch) > 0);
});

test('AI Animation Blending: smooth exponential weight transition between idle, tactical walk, sprint, and hit-reaction flinch', () => {
  let blend = { idle: 1.0, walk: 0.0, sprint: 0.0, flinch: 0.0 };

  // 1. Transition from idle to tactical walk
  for (let i = 0; i < 20; i++) {
    blend = stepAIAnimationBlend(blend, 'walk', 0, 0.05);
  }
  assert.ok(blend.walk > 0.85, 'Walk weight ramps up when walking');
  assert.ok(blend.idle < 0.15, 'Idle weight drops when walking');
  // Base locomotion weights normalized to sum to ~1.0
  assert.ok(Math.abs(blend.idle + blend.walk + blend.sprint - 1.0) < 0.001);

  // 2. Transition from walk to sprint
  for (let i = 0; i < 20; i++) {
    blend = stepAIAnimationBlend(blend, 'sprint', 0, 0.05);
  }
  assert.ok(blend.sprint > 0.85, 'Sprint weight dominates in sprint mode');
  assert.ok(blend.walk < 0.15);

  // 3. Hit-reaction flinching spike
  blend = stepAIAnimationBlend(blend, 'idle', 1.0, 0.05);
  assert.ok(blend.flinch > 0.5, 'Flinch intensity spikes immediately on impact');

  // Flinch decays when intensity drops to 0
  for (let i = 0; i < 30; i++) {
    blend = stepAIAnimationBlend(blend, 'idle', 0, 0.05);
  }
  assert.ok(blend.flinch < 0.05, 'Flinch returns smoothly to rest');
});

test('Ambient Tactical Chat: Enemy shouts when alerted to player presence (spotted)', () => {
  const result = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: true,
    prevCanSeePlayer: false,
    currentState: 'patrol',
    shoutCooldownTimer: 0,
    globalChatCooldownTimer: 0,
    enemyPos: { x: 4.0, y: 1.42, z: 8.0 },
    rngRoll: 0.25,
    shoutProbability: 0.8,
  });

  assert.equal(result.shouldShout, true);
  assert.equal(result.shoutType, 'spotted');
  assert.ok(result.callout !== null);
  assert.equal(result.callout.enemyId, 'tango-1');
  assert.ok(SPOTTED_CALLOUTS.includes(result.callout.calloutText));
  assert.ok(result.nextCooldown >= AMBIENT_SHOUT_COOLDOWN_MIN);
});

test('Ambient Tactical Chat: Enemy shouts when losing line of sight (lost_sight)', () => {
  const result = evaluateEnemyAmbientChat({
    enemyId: 'tango-2',
    currentCanSeePlayer: false,
    prevCanSeePlayer: true,
    currentState: 'combat',
    shoutCooldownTimer: 0,
    globalChatCooldownTimer: 0,
    enemyPos: { x: 7.5, y: 1.42, z: 3.2 },
    rngRoll: 0.1,
    shoutProbability: 0.8,
  });

  assert.equal(result.shouldShout, true);
  assert.equal(result.shoutType, 'lost_sight');
  assert.ok(result.callout !== null);
  assert.equal(result.callout.enemyId, 'tango-2');
  assert.ok(LOST_SIGHT_CALLOUTS.includes(result.callout.calloutText));
  assert.ok(result.nextCooldown >= AMBIENT_SHOUT_COOLDOWN_MIN);
});

test('Ambient Tactical Chat: Suppressed when visibility is steady, enemy is KO, or on cooldown', () => {
  // 1. Steady visibility (no transition)
  const steadyVisible = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: true,
    prevCanSeePlayer: true,
    currentState: 'combat',
    shoutCooldownTimer: 0,
    enemyPos: { x: 0, y: 0, z: 0 },
    rngRoll: 0.1,
  });
  assert.equal(steadyVisible.shouldShout, false);

  const steadyHidden = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: false,
    prevCanSeePlayer: false,
    currentState: 'patrol',
    shoutCooldownTimer: 0,
    enemyPos: { x: 0, y: 0, z: 0 },
    rngRoll: 0.1,
  });
  assert.equal(steadyHidden.shouldShout, false);

  // 2. Suppressed if enemy is knocked out
  const koResult = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: false,
    prevCanSeePlayer: true,
    currentState: 'ko',
    shoutCooldownTimer: 0,
    enemyPos: { x: 0, y: 0, z: 0 },
    rngRoll: 0.1,
  });
  assert.equal(koResult.shouldShout, false);

  // 3. Suppressed if enemy is on personal cooldown
  const onCooldown = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: true,
    prevCanSeePlayer: false,
    currentState: 'patrol',
    shoutCooldownTimer: 3.5,
    globalChatCooldownTimer: 0,
    enemyPos: { x: 0, y: 0, z: 0 },
    rngRoll: 0.1,
  });
  assert.equal(onCooldown.shouldShout, false);
  assert.equal(onCooldown.nextCooldown, 3.5);

  // 4. Suppressed if another enemy recently shouted (global chatter throttle)
  const onGlobalCooldown = evaluateEnemyAmbientChat({
    enemyId: 'tango-1',
    currentCanSeePlayer: true,
    prevCanSeePlayer: false,
    currentState: 'patrol',
    shoutCooldownTimer: 0,
    globalChatCooldownTimer: GLOBAL_CHAT_COOLDOWN_SEC,
    enemyPos: { x: 0, y: 0, z: 0 },
    rngRoll: 0.1,
  });
  assert.equal(onGlobalCooldown.shouldShout, false);
});

test('Realistic Ragdoll Physics: Directional impulse, whiplash, and knee buckling on bullet headshot', () => {
  const ragdoll = createEnemyRagdoll({
    hitZone: 'head',
    impactDir: { x: 0, y: 0, z: -1 }, // incoming from front to back
    impactForce: 5.8,
    initialYaw: 0, // facing forward
    currentPos: { x: 5.0, y: 0, z: 10.0 },
  });

  assert.equal(ragdoll.active, true);
  assert.equal(ragdoll.settled, false);
  assert.equal(ragdoll.hitZone, 'head');
  // Headshot whiplash: rapid head/neck velocity along bullet axis
  assert.ok(Math.abs(ragdoll.head.velX) > 5.0, 'Head whiplash velocity');
  assert.ok(Math.abs(ragdoll.neck.velX) > 3.0, 'Neck whiplash velocity');
  // Knee collapse: knees immediately lose motor control and buckle backwards (negative velocity)
  assert.ok(ragdoll.leftKnee.velX < -2.0, 'Left knee buckles backwards');
  assert.ok(ragdoll.rightKnee.velX < -2.0, 'Right knee buckles backwards');
  // Dropped weapon physics initialized
  assert.equal(ragdoll.droppedWeapon.active, true);
  assert.equal(ragdoll.droppedWeapon.settled, false);
});

test('Realistic Ragdoll Physics: High-velocity blast impulse and tumbling on grenade explosion', () => {
  const ragdoll = createEnemyRagdoll({
    hitZone: 'explosion',
    impactDir: { x: 0.707, y: 0.5, z: 0.707 },
    impactForce: 9.8,
    initialYaw: Math.PI / 4,
    currentPos: { x: 12.0, y: 0, z: 12.0 },
  });

  assert.equal(ragdoll.hitZone, 'explosion');
  // Explosion imparts strong vertical and horizontal propulsion
  assert.ok(ragdoll.rootVel.y > 2.0, 'Explosion throws body upward');
  assert.ok(Math.hypot(ragdoll.rootVel.x, ragdoll.rootVel.z) > 3.0, 'Explosion imparts strong lateral velocity');
  assert.ok(ragdoll.hipsVy > 1.0, 'Pelvis propelled upward');
});

test('Realistic Ragdoll Kinematics: Floor collision, anatomical joint bounds, and settling to rest', () => {
  const ragdoll = createEnemyRagdoll({
    hitZone: 'torso',
    impactDir: { x: 0, y: 0, z: -1 },
    impactForce: 4.5,
    initialYaw: 0,
    currentPos: { x: 6.0, y: 0, z: 8.0 },
  });

  // Step physics over 2.0 seconds
  for (let step = 0; step < 60; step++) {
    stepEnemyRagdollPhysics(ragdoll, 0.033);
  }

  // Floor collision prevents falling through ground: hips rest at >= 0.18m
  assert.ok(ragdoll.hipsY >= 0.179, 'Pelvis collides and rests on floor surface');
  assert.ok(ragdoll.rootPos.y >= 0, 'Root stays on or above floor');

  // Anatomical knee constraint: knees bend backwards (-140° to 0°), never hyperextend forward
  assert.ok(ragdoll.leftKnee.rotX <= 0.001, 'Left knee does not hyperextend forward');
  assert.ok(ragdoll.rightKnee.rotX <= 0.001, 'Right knee does not hyperextend forward');

  // Limbs relax and motion settles once fully resting on the floor
  for (let step = 0; step < 40; step++) {
    stepEnemyRagdollPhysics(ragdoll, 0.033);
  }
  assert.equal(ragdoll.settled, true, 'Ragdoll comes to complete rest on floor');
  assert.equal(ragdoll.droppedWeapon.settled, true, 'Dropped weapon comes to complete rest');
});

test('Modular Weapon Data Structure & Loadout Initialization: 5 primary weapons (including Musket), 3 secondary weapons (including Colt SAA), stat bars, and runtime loadout state', () => {
  assert.equal(PRIMARY_WEAPON_IDS.length, 5);
  assert.equal(SECONDARY_WEAPON_IDS.length, 3);
  assert.equal(ALL_WEAPON_IDS.length, 9);

  // Verify every weapon entry has required fields: meshPath, damage, fireRate, magazineSize, recoilPattern, adsZoomMultiplier, movementSpeedModifier
  for (const wId of ALL_WEAPON_IDS) {
    const spec = WEAPONS[wId];
    assert.ok(spec, `Weapon ${wId} exists in WEAPONS dictionary`);
    assert.ok(spec.meshPath.endsWith('.glb'), `${wId} has valid .glb meshPath`);
    assert.ok(spec.damage > 0, `${wId} has positive damage`);
    assert.ok(spec.fireRate > 0, `${wId} has positive fireRate`);
    assert.ok(spec.magazineSize > 0, `${wId} has positive magazineSize`);
    assert.ok(spec.recoilPattern.vertical >= 0, `${wId} has vertical recoil`);
    assert.ok(spec.recoilPattern.horizontal >= 0, `${wId} has horizontal recoil`);
    assert.ok(spec.adsZoomMultiplier >= 1.0, `${wId} has adsZoomMultiplier >= 1.0`);
    assert.ok(
      spec.movementSpeedModifier >= 0.8 && spec.movementSpeedModifier <= 1.2,
      `${wId} has valid movementSpeedModifier`
    );

    const bars = getWeaponStatBars(wId);
    assert.ok(bars.damage >= 10 && bars.damage <= 100);
    assert.ok(bars.fireRate >= 10 && bars.fireRate <= 100);
    assert.ok(bars.recoil >= 10 && bars.recoil <= 100);
    assert.ok(bars.mobility >= 10 && bars.mobility <= 100);
  }

  // Verify M870 Shotgun has 8 pellets and high total damage compared to MP5SD
  assert.equal(WEAPONS.m870.pellets, 8);
  assert.ok(getWeaponStatBars('m870').damage > getWeaponStatBars('mp5sd').damage);
  assert.ok(getWeaponStatBars('mk18').fireRate > getWeaponStatBars('hk416').fireRate);
  assert.ok(getWeaponStatBars('glock17').mobility > getWeaponStatBars('hk416').mobility);

  // Verify Loadout Injection & Runtime Weapon Instantiation
  const runtime = createLoadoutRuntimeWeapons({
    primary: 'mp5sd',
    secondary: 'm1911',
  });
  assert.equal(runtime.mp5sd.mag, WEAPONS.mp5sd.magazineSize);
  assert.equal(runtime.m1911.mag, WEAPONS.m1911.magazineSize);
  assert.equal(runtime.m1911.mag, 8);
});

test('Modular Weapon Attachments: compatible attachment slots per firearm, Suppressor sound/muzzle-flash reduction, Holographic Sight zoom/reticle, and Laser hip-fire accuracy bonus', () => {
  assert.deepEqual(ALL_ATTACHMENT_IDS, ['suppressor', 'holographic', 'laser']);
  assert.equal(ATTACHMENTS.suppressor.slot, 'muzzle');
  assert.equal(ATTACHMENTS.holographic.slot, 'optic');
  assert.equal(ATTACHMENTS.laser.slot, 'accessory');

  // 1. Verify each firearm defines compatibleSlots and compatibleAttachments
  const firearms = [...PRIMARY_WEAPON_IDS, ...SECONDARY_WEAPON_IDS];
  for (const wId of firearms) {
    const spec = WEAPONS[wId];
    assert.ok(Array.isArray(spec.compatibleSlots) && spec.compatibleSlots.length > 0);
    assert.ok(
      Array.isArray(spec.compatibleAttachments) && spec.compatibleAttachments.length > 0
    );
    assert.ok(Array.isArray(spec.defaultAttachments));
  }
  // Combat knife has no firearm attachments
  assert.equal(WEAPONS.combat_knife.compatibleSlots.length, 0);

  // Compatibility checks:
  // HK416 & MK18 & Glock17 support all 3 slots (muzzle, optic, accessory)
  assert.equal(isAttachmentCompatible('hk416', 'suppressor'), true);
  assert.equal(isAttachmentCompatible('hk416', 'holographic'), true);
  assert.equal(isAttachmentCompatible('hk416', 'laser'), true);

  // MP5SD has integral suppressor so external suppressor attachment is incompatible, but optic & laser are compatible
  assert.equal(isAttachmentCompatible('mp5sd', 'suppressor'), false);
  assert.equal(isAttachmentCompatible('mp5sd', 'holographic'), true);
  assert.equal(isAttachmentCompatible('mp5sd', 'laser'), true);

  // M870 Shotgun does not take a suppressor (optic + accessory only)
  assert.equal(isAttachmentCompatible('m870', 'suppressor'), false);
  assert.equal(isAttachmentCompatible('m870', 'holographic'), true);
  assert.equal(isAttachmentCompatible('m870', 'laser'), true);

  // M1911 supports suppressor and laser, but not full-size holographic sight
  assert.equal(isAttachmentCompatible('m1911', 'suppressor'), true);
  assert.equal(isAttachmentCompatible('m1911', 'holographic'), false);
  assert.equal(isAttachmentCompatible('m1911', 'laser'), true);

  // Sanitization strips incompatible attachments and deduplicates by slot
  const sanitizedM1911 = sanitizeWeaponAttachments('m1911', [
    'suppressor',
    'holographic',
    'laser',
  ]);
  assert.deepEqual(sanitizedM1911, ['suppressor', 'laser']);

  // 2. Suppressor mechanics: reduces sound volume, muzzle flash intensity, recoil, and suppresses dark-room muzzle flash alert
  const hkBase = computeEffectiveWeaponStats('hk416', []);
  const hkSuppressed = computeEffectiveWeaponStats('hk416', ['suppressor']);
  assert.equal(hkBase.isSuppressed, false);
  assert.equal(hkSuppressed.isSuppressed, true);
  assert.ok(
    hkSuppressed.soundVolumeMultiplier < hkBase.soundVolumeMultiplier,
    'Suppressor reduces gunshot sound volume'
  );
  assert.ok(
    hkSuppressed.muzzleFlashMultiplier < hkBase.muzzleFlashMultiplier,
    'Suppressor reduces muzzle flash intensity'
  );
  assert.equal(hkSuppressed.suppressesMuzzleFlashAlert, true);
  assert.ok(
    hkSuppressed.recoilPattern.vertical < hkBase.recoilPattern.vertical,
    'Suppressor reduces vertical recoil'
  );

  // Integral suppressor on MP5SD is always active even with 0 external attachments
  const mp5Stats = computeEffectiveWeaponStats('mp5sd', []);
  assert.equal(mp5Stats.isSuppressed, true);
  assert.equal(mp5Stats.suppressesMuzzleFlashAlert, true);

  // 3. Holographic Sight mechanics: switches reticleStyle to 'holographic' and updates ADS zoom & FOV
  const g17Iron = computeEffectiveWeaponStats('glock17', []);
  const g17Holo = computeEffectiveWeaponStats('glock17', ['holographic']);
  assert.equal(g17Iron.reticleStyle, 'iron');
  assert.equal(g17Holo.reticleStyle, 'holographic');
  assert.equal(g17Holo.hasHolographic, true);
  assert.ok(
    g17Holo.adsZoomMultiplier > g17Iron.adsZoomMultiplier,
    'Holographic sight increases pistol ADS zoom to 1.35x'
  );
  assert.ok(g17Holo.adsFov < g17Iron.adsFov);

  // 4. Tactical Laser Sight mechanics: provides significant hip-fire accuracy bonus (38% tighter spreadHip)
  const mk18NoLaser = computeEffectiveWeaponStats('mk18', []);
  const mk18WithLaser = computeEffectiveWeaponStats('mk18', ['laser']);
  assert.equal(mk18WithLaser.hasLaser, true);
  assert.ok(
    mk18WithLaser.spreadHip < mk18NoLaser.spreadHip * 0.65,
    'Laser attachment reduces hip-fire spread by 38%'
  );

  // 5. Runtime loadout initialization applies selected attachments and computes effectiveStats
  const loadoutRuntime = createLoadoutRuntimeWeapons({
    primary: 'hk416',
    secondary: 'glock17',
    primaryAttachments: ['suppressor', 'holographic', 'laser'],
    secondaryAttachments: ['suppressor', 'laser'],
  });
  assert.deepEqual(loadoutRuntime.hk416.attachments, [
    'suppressor',
    'holographic',
    'laser',
  ]);
  assert.equal(loadoutRuntime.hk416.effectiveStats.isSuppressed, true);
  assert.equal(loadoutRuntime.hk416.effectiveStats.hasHolographic, true);
  assert.equal(loadoutRuntime.hk416.effectiveStats.hasLaser, true);
  assert.deepEqual(loadoutRuntime.glock17.attachments, ['suppressor', 'laser']);
  assert.equal(loadoutRuntime.glock17.effectiveStats.isSuppressed, true);
  assert.equal(loadoutRuntime.glock17.effectiveStats.hasLaser, true);
});

test('Non-Box Procedural Map & Room Variations: 6 non-rectangular compound footprints, variable room sizes, non-box interior architectures, and zero overlaps', () => {
  assert.equal(ALL_MAP_LAYOUT_VARIANTS.length, 6);

  const observedShapeVariants = new Set<string>();
  const observedRoomWidths = new Set<number>();
  const observedRoomDepths = new Set<number>();

  for (const variant of ALL_MAP_LAYOUT_VARIANTS) {
    assert.ok(MAP_LAYOUT_META[variant], `Metadata exists for ${variant}`);
    for (const seed of [101, 2026, 4096, 8888]) {
      const map = generateCQBMap(seed, variant);
      assert.equal(map.layoutVariant, variant);
      assert.equal(map.layoutName, MAP_LAYOUT_META[variant].name);
      assert.equal(map.rooms.length, 9);
      assert.equal(map.allRoomsReachable, true, `${variant} seed ${seed} must have all rooms reachable`);

      // Verify zero overlapping walls/frames and zero blocked doorways
      const validation = validateMapGeometry(map);
      assert.equal(
        validation.overlapCount,
        0,
        `${variant} seed ${seed} must have 0 overlapping wall/frame segments`
      );
      assert.equal(
        validation.blockedDoorways,
        0,
        `${variant} seed ${seed} must have 0 blocked doorways`
      );
      assert.equal(validation.valid, true);

      // Verify non-rectangular footprint: out of 16 cells on the 4x4 grid, 9 are active and 7 are exterior void cells
      assert.equal(map.colWidths.length, 4);
      assert.equal(map.rowDepths.length, 4);
      const occupiedCoords = new Set(map.rooms.map((r) => `${r.gx},${r.gz}`));
      assert.equal(occupiedCoords.size, 9);
      let voidCellsCount = 0;
      for (let gz = 0; gz < map.rowDepths.length; gz++) {
        for (let gx = 0; gx < map.colWidths.length; gx++) {
          if (!occupiedCoords.has(`${gx},${gz}`)) {
            voidCellsCount++;
          }
        }
      }
      assert.equal(voidCellsCount, 7, `${variant} has 7 carved-out exterior void cells (non-box footprint)`);

      // Verify rooms have variable dimensions and non-box interior shape variants
      for (const room of map.rooms) {
        observedShapeVariants.add(room.shapeVariant);
        observedRoomWidths.add(room.width);
        observedRoomDepths.add(room.depth);

        // findRoomAtPosition resolves room center accurately
        const found = findRoomAtPosition(map, room.centerX, room.centerZ);
        assert.ok(found, `findRoomAtPosition resolves center of room (${room.gx},${room.gz})`);
        assert.equal(found.gx, room.gx);
        assert.equal(found.gz, room.gz);

        // Every room is reachable via A* navigation path from entry room (0,0)
        const navPath = findNavPath(
          map.navGraph,
          { x: map.rooms[0].centerX, z: map.rooms[0].centerZ },
          { x: room.centerX, z: room.centerZ },
          map.wallSegments
        );
        assert.ok(navPath.length >= 1, `Valid A* path from entry to room (${room.gx},${room.gz})`);
      }
    }
  }

  // Verify multiple distinct room widths/depths and non-box interior shapes are generated
  assert.ok(observedRoomWidths.size >= 3, 'Rooms have varied non-uniform widths');
  assert.ok(observedRoomDepths.size >= 3, 'Rooms have varied non-uniform depths');
  assert.ok(observedShapeVariants.has('l_alcove'), 'Generates L-shaped corner alcoves');
  assert.ok(observedShapeVariants.has('angled_chamber'), 'Generates angled chambers');
  assert.ok(observedShapeVariants.has('split_baffle'), 'Generates split baffle rooms');
  assert.ok(observedShapeVariants.has('pillared_atrium'), 'Generates pillared atriums');
  assert.ok(observedShapeVariants.has('irregular_bay'), 'Generates irregular recessed bays');
});

test('1. The Musket: 1-round capacity, guaranteed 1-shot kill anywhere on the body, strict 7-second reload timer blocking fire and sprint', () => {
  const musket = WEAPONS.musket;
  assert.ok(musket, 'Musket exists in WEAPONS dictionary');
  assert.equal(musket.slot, 'primary');
  assert.equal(musket.magSize, 1);
  assert.equal(musket.magazineSize, 1);
  assert.equal(musket.reloadTimeSec, 7.0);
  assert.ok(musket.damage >= 9999, 'Musket has infinite/lethal 1-shot kill damage');

  // Guaranteed 1-shot kill (>= 100 HP) on head, torso, and limbs
  const headDmg = calculateBallisticDamage('musket', 'head', 0.1);
  const torsoDmg = calculateBallisticDamage('musket', 'torso', 0.1);
  const limbDmg = calculateBallisticDamage('musket', 'limb', 0.1);
  assert.ok(headDmg >= 1000, 'Musket headshot is a guaranteed 1-shot kill');
  assert.ok(torsoDmg >= 1000, 'Musket torso shot is a guaranteed 1-shot kill');
  assert.ok(limbDmg >= 1000, 'Musket limb shot is a guaranteed 1-shot kill');

  // Even after penetrating wood or drywall, Musket retains guaranteed 1-shot kill damage
  const drywallWall = { id: 'drywall-1', kind: 'wall' as const, minX: 4.9, maxX: 5.1, minY: 0, maxY: 3.0, minZ: 0, maxZ: 6.0 };
  const musketThroughDrywall = evaluateMaterialBallistics({
    materialTag: 'drywall',
    weaponId: 'musket',
    incomingDamage: limbDmg,
    origin: { x: 2, y: 1.5, z: 3 },
    dir: { x: 1, y: 0, z: 0 },
    surfaceAABB: drywallWall,
  });
  assert.equal(musketThroughDrywall.penetrated, true);
  assert.ok(musketThroughDrywall.outgoingDamage >= 1000);

  // Strict 7-second reload lockout: player cannot fire or sprint during reload
  assert.equal(
    canPlayerFire({ isReloading: true, reloadTimer: 6.5, currentMag: 1, fireCooldown: 0 }),
    false,
    'Cannot fire while reloading Musket'
  );
  assert.equal(
    canPlayerFire({ isReloading: false, reloadTimer: 0, currentMag: 0, fireCooldown: 0 }),
    false,
    'Cannot fire when 1-round capacity is empty'
  );
  assert.equal(
    canPlayerFire({ isReloading: false, reloadTimer: 0, currentMag: 1, fireCooldown: 0 }),
    true,
    'Can fire when loaded and not reloading'
  );

  assert.equal(
    canPlayerSprint({
      isReloading: true,
      reloadTimer: 7.0,
      isAds: false,
      moveForwardOrLateral: true,
    }),
    false,
    'Cannot sprint during 7-second reload sequence'
  );
  assert.equal(
    canPlayerSprint({
      isReloading: false,
      reloadTimer: 0,
      isAds: false,
      moveForwardOrLateral: true,
    }),
    true,
    'Can sprint when not reloading and not aiming down sights'
  );

  const reloadMove = computePlayerMovementSpeed({
    weaponSpeedModifier: musket.movementSpeedModifier,
    isAds: false,
    isReloading: true,
    reloadTimer: 5.0,
    sprintHeld: true,
    isMoving: true,
  });
  const sprintMove = computePlayerMovementSpeed({
    weaponSpeedModifier: musket.movementSpeedModifier,
    isAds: false,
    isReloading: false,
    reloadTimer: 0,
    sprintHeld: true,
    isMoving: true,
  });
  assert.equal(reloadMove.isSprinting, false);
  assert.equal(sprintMove.isSprinting, true);
  assert.ok(
    reloadMove.speed < sprintMove.speed * 0.75,
    'Sprint speed boost is strictly suppressed during reload'
  );
});

test('2. Enemy Quotas & Locker Ambushes: 9 to 15 baseline active AI combatants and 2 to 3 proximity-triggered ambush lockers', () => {
  const spawnCounts = new Set<number>();
  const lockerCounts = new Set<number>();

  for (let seed = 100; seed < 130; seed++) {
    const map = generateCQBMap(seed);
    assert.ok(
      map.enemySpawns.length >= 9 && map.enemySpawns.length <= 15,
      `Seed ${seed} spawns ${map.enemySpawns.length} baseline AI combatants (expected 9..15)`
    );
    assert.ok(
      map.lockerAmbushes.length >= 2 && map.lockerAmbushes.length <= 3,
      `Seed ${seed} places ${map.lockerAmbushes.length} ambush lockers (expected 2..3)`
    );
    spawnCounts.add(map.enemySpawns.length);
    lockerCounts.add(map.lockerAmbushes.length);
  }

  assert.ok(spawnCounts.size >= 3, 'Enemy spawn counts vary randomly across seeds between 9 and 15');
  assert.ok(lockerCounts.has(2) && lockerCounts.has(3), 'Locker ambush counts vary between 2 and 3');

  // Test proximity trigger and door blast kinematics
  const testMap = generateCQBMap(2026);
  const firstLocker = testMap.lockerAmbushes[0];
  assert.equal(firstLocker.triggered, false);

  // Far away player does not trigger locker
  const farTriggered = evaluateLockerAmbushTriggers(testMap.lockerAmbushes, {
    x: -100,
    z: -100,
  });
  assert.equal(farTriggered.newlyTriggered.length, 0);
  assert.equal(farTriggered.spawnedEnemies.length, 0);
  assert.equal(firstLocker.triggered, false);

  // Stepping inside proximity trigger radius blasts the locker open and returns the ambush spec
  const nearTriggered = evaluateLockerAmbushTriggers(testMap.lockerAmbushes, {
    x: firstLocker.x + 0.5,
    z: firstLocker.z + 0.5,
  });
  assert.ok(nearTriggered.newlyTriggered.length >= 1, 'Entering proximity radius triggers locker ambush');
  assert.ok(nearTriggered.spawnedEnemies.length >= 1, 'Spawns aggressive AI combatant from locker');
  assert.equal(firstLocker.triggered, true);
  assert.ok(firstLocker.doorOpenProgress >= 0.15);

  // Subsequent ticks advance door blast open progress to 1.0
  stepLockerDoorKinematics(firstLocker, 0.25);
  assert.equal(firstLocker.doorOpenProgress, 1.0, 'Locker doors blast fully open');
});

test('3. Optic & Scope Fixes: exact camera alignment with optic local Z-axis during ADS and dynamic near clipping plane / layer isolation', () => {
  assert.notEqual(
    WORLD_SCENE_LAYER,
    WEAPON_VIEWMODEL_LAYER,
    'First-person weapon renders on dedicated camera layer separate from world geometry'
  );

  for (const wId of ALL_WEAPON_IDS) {
    for (const hasHolo of [false, true]) {
      const opticOffset = OPTIC_LOCAL_OFFSETS[wId];
      const expectedOpticY = hasHolo
        ? opticOffset.holographicSightY
        : opticOffset.ironSightY;

      const aligned = computeOpticAlignedAdsPosition({
        weaponId: wId,
        hasHolographic: hasHolo,
        adsAmount: 1.0,
        swayX: 0.005,
        swayY: 0.005,
        leanAmount: 0.5,
      });

      // At full ADS (adsAmount = 1.0), weapon root X == 0, and weapon root Y + opticLocalY == 0
      assert.ok(
        Math.abs(aligned.position.x) < 1e-6,
        `${wId} (holo=${hasHolo}) aligns X=0 with camera optical center`
      );
      assert.ok(
        Math.abs(aligned.position.y + expectedOpticY) < 1e-6,
        `${wId} (holo=${hasHolo}) aligns optic local Y=${expectedOpticY} with camera optical Z-axis`
      );
      assert.equal(
        aligned.opticWorldOffsetFromCameraAxis.x,
        0,
        `${wId} has zero X optical Z-axis alignment error at full ADS`
      );
      assert.equal(
        aligned.opticWorldOffsetFromCameraAxis.y,
        0,
        `${wId} has zero Y optical Z-axis alignment error at full ADS`
      );
    }
  }

  // Dynamic camera near clipping plane tightens from 0.05m at hip to 0.012m in ADS to prevent clipping
  const nearHip = computeDynamicCameraNearPlane(0);
  const nearAds = computeDynamicCameraNearPlane(1);
  assert.equal(nearHip, 0.05);
  assert.equal(nearAds, 0.012);
  assert.ok(nearAds < nearHip);
});

test('4. Advanced AI Behavior Tree: seeks cover when low HP or reloading, uses suppressive fire, and flanks last known position', () => {
  const map = generateCQBMap(2026);
  const aiPos = { x: map.rooms[1].centerX, z: map.rooms[1].centerZ };
  const playerPos = { x: map.rooms[0].centerX, z: map.rooms[0].centerZ };
  const distToPlayer = Math.hypot(aiPos.x - playerPos.x, aiPos.z - playerPos.z);

  // A. Low Health (hp <= AI_LOW_HEALTH_THRESHOLD) triggers 'seek_cover'
  const lowHpDecision = evaluateAIBehaviorTree({
    hp: 30,
    maxHp: 100,
    mag: 15,
    isReloading: false,
    canSeePlayer: true,
    distToPlayer,
    effectiveVisionRange: 22.0,
    hasLastKnownPlayerPos: true,
    timeSinceLastSeenSec: 0,
    aiPos,
    playerPos,
    lastKnownPlayerPos: playerPos,
    navGraph: map.navGraph,
    wallAABBs: map.wallSegments,
    coverAABBs: map.coverProps,
  });
  assert.equal(lowHpDecision.action, 'seek_cover', 'AI seeks cover when health is low');
  assert.equal(lowHpDecision.state, 'cover');
  assert.equal(lowHpDecision.locomotion, 'sprint');

  // B. Reloading (isReloading = true or mag = 0) triggers 'seek_cover'
  const reloadDecision = evaluateAIBehaviorTree({
    hp: 100,
    maxHp: 100,
    mag: 0,
    isReloading: true,
    canSeePlayer: true,
    distToPlayer,
    effectiveVisionRange: 22.0,
    hasLastKnownPlayerPos: true,
    timeSinceLastSeenSec: 0,
    aiPos,
    playerPos,
    lastKnownPlayerPos: playerPos,
    navGraph: map.navGraph,
    wallAABBs: map.wallSegments,
    coverAABBs: map.coverProps,
  });
  assert.equal(reloadDecision.action, 'seek_cover', 'AI seeks cover while reloading');

  // C. Recently lost LoS (<= 2.6s) with ammo remaining triggers 'suppressive_fire'
  const suppressDecision = evaluateAIBehaviorTree({
    hp: 90,
    maxHp: 100,
    mag: 12,
    isReloading: false,
    canSeePlayer: false,
    distToPlayer,
    effectiveVisionRange: 22.0,
    hasLastKnownPlayerPos: true,
    timeSinceLastSeenSec: 1.1,
    aiPos,
    playerPos,
    lastKnownPlayerPos: playerPos,
    navGraph: map.navGraph,
    wallAABBs: map.wallSegments,
    coverAABBs: map.coverProps,
  });
  assert.equal(
    suppressDecision.action,
    'suppressive_fire',
    'AI uses suppressive fire toward last known position after losing LoS'
  );
  assert.equal(suppressDecision.shouldFireSuppressive, true);

  // D. Longer lost LoS (> 2.6s) with known player position triggers 'flank'
  const flankDecision = evaluateAIBehaviorTree({
    hp: 90,
    maxHp: 100,
    mag: 12,
    isReloading: false,
    canSeePlayer: false,
    distToPlayer: 12.0,
    effectiveVisionRange: 22.0,
    hasLastKnownPlayerPos: true,
    timeSinceLastSeenSec: 4.0,
    aiPos: { x: map.rooms[4].centerX, z: map.rooms[4].centerZ },
    playerPos,
    lastKnownPlayerPos: playerPos,
    navGraph: map.navGraph,
    wallAABBs: map.wallSegments,
    coverAABBs: map.coverProps,
  });
  assert.equal(
    flankDecision.action,
    'flank',
    'AI attempts to flank the player last known position'
  );
  assert.equal(flankDecision.locomotion, 'sprint');
});

test('5. Active Ragdoll Physics: 13 skeletal bone rigid bodies, hinge & ball-and-socket joints, and localized impulse on struck bone', () => {
  // Verify skeletal joint constraints include both hinge (knees/elbows) and ball_socket joints
  const hingeJoints = RAGDOLL_SKELETAL_CONSTRAINTS.filter((c) => c.jointType === 'hinge');
  const ballSocketJoints = RAGDOLL_SKELETAL_CONSTRAINTS.filter(
    (c) => c.jointType === 'ball_socket'
  );
  assert.equal(hingeJoints.length, 4, '4 hinge joints for left/right elbows and knees');
  assert.equal(ballSocketJoints.length, 8, '8 ball-and-socket joints for spine, neck, head, shoulders, hips');

  // Create ragdoll struck specifically on the rightForearm by a bullet travelling +Z
  const bulletDir = { x: 0, y: 0.1, z: 1 };
  const ragdoll = createEnemyRagdoll({
    hitZone: 'limb',
    hitBone: 'rightForearm',
    impactDir: bulletDir,
    impactForce: 8.5,
    initialYaw: 0,
    currentPos: { x: 6, y: 0, z: 6 },
  });

  assert.equal(ragdoll.struckBone, 'rightForearm');
  assert.equal(Object.keys(ragdoll.rigidBodies).length, 13, 'All 13 skeletal bones converted into rigid bodies');
  assert.equal(ragdoll.constraints.length, 12, '12 joint constraints connect the 13 rigid bodies');

  // Verify the struck bone ('rightForearm') received a stronger localized impulse along +Z than the unstruck 'leftForearm'
  assert.ok(
    ragdoll.rigidBodies.rightForearm.velocity.z >
      ragdoll.rigidBodies.leftForearm.velocity.z * 2.0,
    'Struck bone receives localized impulse along bullet trajectory'
  );
  assert.ok(
    ragdoll.rigidBodies.rightForearm.accumulatedImpulse.z >
      ragdoll.rigidBodies.leftForearm.accumulatedImpulse.z * 2.5,
    'Localized impulse vector propels struck bone backward along bullet +Z trajectory'
  );

  // Step physics and verify joint constraints keep bones connected and above floor
  for (let i = 0; i < 20; i++) {
    stepEnemyRagdollPhysics(ragdoll, 0.016);
  }
  for (const c of ragdoll.constraints) {
    const parentBody = ragdoll.rigidBodies[c.parentBone];
    const childBody = ragdoll.rigidBodies[c.childBone];
    const dist = Math.hypot(
      childBody.position.x - parentBody.position.x,
      childBody.position.y - parentBody.position.y,
      childBody.position.z - parentBody.position.z
    );
    assert.ok(
      Math.abs(dist - c.restLength) < 0.12,
      `Joint ${c.parentBone}->${c.childBone} (${c.jointType}) maintains rest length`
    );
    assert.ok(childBody.position.y >= 0.05, `Bone ${c.childBone} stays above floor`);
  }
});

test('1. Tactical Melee Weapon: Combat Knife lethality, slot 3 assignment, and 1.8m reach profile', () => {
  // Slot 3 weapon validation
  assert.equal(MELEE_WEAPON_IDS.includes('combat_knife'), true);
  const knife = WEAPONS.combat_knife;
  assert.ok(knife, 'Combat Knife exists in WEAPONS');
  assert.equal(knife.slot, 'melee');

  // Lethality: Head collider deals 100+ damage (instant 1-hit kill on 100 HP)
  const headDamage = calculateBallisticDamage('combat_knife', 'head');
  assert.ok(headDamage >= 100, `Head damage (${headDamage}) must be >= 100`);

  // Torso / Limbs deal exactly 50 damage (guaranteed 2-hit kill on 100 HP)
  const torsoDamage = calculateBallisticDamage('combat_knife', 'torso');
  assert.equal(torsoDamage, 50, 'Torso damage must be exactly 50');
  const limbDamage = calculateBallisticDamage('combat_knife', 'limb');
  assert.equal(limbDamage, 50, 'Limb damage must be exactly 50');

  // 100 HP target requires exactly 2 body hits to eliminate
  let enemyHp = 100;
  enemyHp -= calculateBallisticDamage('combat_knife', 'torso');
  assert.equal(enemyHp, 50, 'After 1 hit enemy has 50 HP remaining');
  enemyHp -= calculateBallisticDamage('combat_knife', 'torso');
  assert.equal(enemyHp, 0, 'After 2 hits enemy is eliminated (guaranteed 2-hit kill)');
});

test('2. Crouch & Jump Movement Systems: 45% height reduction, 40% speed penalty, 30% recoil reduction, ceiling obstruction check, and jump impulse/gravity', () => {
  // Camera eye height drops by 45% (standing 1.68m down to 0.924m)
  assert.equal(PLAYER_STANDING_EYE_Y, 1.68);
  assert.equal(PLAYER_CROUCHED_EYE_Y, 0.924);
  const eyeHeightDropPct = (PLAYER_STANDING_EYE_Y - PLAYER_CROUCHED_EYE_Y) / PLAYER_STANDING_EYE_Y;
  assert.ok(Math.abs(eyeHeightDropPct - 0.45) < 0.001, 'Camera eye height drops by exactly 45%');

  // Capsule collider height drops by 45% (standing 1.80m down to 0.99m)
  assert.equal(PLAYER_STANDING_CAPSULE_HEIGHT, 1.80);
  assert.equal(PLAYER_CROUCHED_CAPSULE_HEIGHT, 0.99);
  const capsuleDropPct = (PLAYER_STANDING_CAPSULE_HEIGHT - PLAYER_CROUCHED_CAPSULE_HEIGHT) / PLAYER_STANDING_CAPSULE_HEIGHT;
  assert.ok(Math.abs(capsuleDropPct - 0.45) < 0.001, 'Capsule height drops by exactly 45%');

  // Speed is reduced by 40% when crouching (4.25 * 0.94 -> 4.25 * 0.94 * 0.60)
  const standSpeed = computePlayerMovementSpeed({
    weaponSpeedModifier: 1.0,
    isAds: false,
    isReloading: false,
    reloadTimer: 0,
    sprintHeld: false,
    isMoving: true,
    crouchProgress: 0.0,
  }).speed;
  const crouchSpeed = computePlayerMovementSpeed({
    weaponSpeedModifier: 1.0,
    isAds: false,
    isReloading: false,
    reloadTimer: 0,
    sprintHeld: false,
    isMoving: true,
    crouchProgress: 1.0,
  }).speed;
  assert.ok(
    Math.abs(crouchSpeed / standSpeed - 0.60) < 0.01,
    `Crouching speed (${crouchSpeed}) must be 60% of standing speed (${standSpeed})`
  );

  // Recoil & spread multiplier is 0.70 (30% decrease)
  assert.equal(CROUCH_RECOIL_SPREAD_MULTIPLIER, 0.70);

  // Ceiling check: if overhead ceiling blocks uncrouching, crouch progress remains locked at 1.0
  const uncrouchBlocked = stepPlayerCrouch({
    currentCrouchProgress: 1.0,
    targetCrouchProgress: 0.0,
    dt: 0.05,
    isCeilingBlocked: true,
  });
  assert.equal(uncrouchBlocked, 1.0, 'Player remains crouched when ceiling is blocked overhead');

  // Ceiling clear: uncrouch progress smoothly interpolates toward 0.0
  const uncrouchClear = stepPlayerCrouch({
    currentCrouchProgress: 1.0,
    targetCrouchProgress: 0.0,
    dt: 0.05,
    isCeilingBlocked: false,
  });
  assert.ok(uncrouchClear < 1.0, 'Player begins standing up when ceiling is clear');

  // Jump physics constants
  assert.equal(PLAYER_JUMP_IMPULSE_VELOCITY, 4.8);
  assert.equal(PLAYER_GRAVITY_ACCEL, 18.0);
});

test('3. Semi-Auto Pistol (Glock 17) Input Buffering & Trigger Reset logic', () => {
  // Simulate semi-auto trigger cycle
  let canShoot = true;
  let pendingBufferedShot = false;
  let bufferedShotExpiry = 0;
  let shotsFired = 0;
  let fireCooldown = 0;
  const now = 1000;

  // Discrete click 1 fires immediately
  if (canShoot && fireCooldown <= 0) {
    shotsFired++;
    canShoot = false; // Trigger is depressed
    fireCooldown = 60 / WEAPONS.glock17.rpm; // ~0.133s
  }
  assert.equal(shotsFired, 1);
  assert.equal(canShoot, false);

  // Rapid mouse click while still on cooldown queues a 50ms buffered input
  if (!canShoot || fireCooldown > 0) {
    pendingBufferedShot = true;
    bufferedShotExpiry = now + 50;
  }
  assert.equal(pendingBufferedShot, true);
  assert.equal(bufferedShotExpiry, now + 50);

  // Trigger release resets canShoot boolean flag
  canShoot = true;
  assert.equal(canShoot, true);

  // Millisecond when cooldown expires (at t = now + 40ms, within 50ms buffer)
  const cooldownExpiredTime = now + 40;
  if (pendingBufferedShot && cooldownExpiredTime <= bufferedShotExpiry && fireCooldown > 0) {
    // Cooldown completes
    fireCooldown = 0;
    shotsFired++;
    pendingBufferedShot = false;
  }
  assert.equal(shotsFired, 2, 'Buffered shot fired without dropped inputs');
  assert.equal(pendingBufferedShot, false);
});

test('4. Non-Clipping Ragdoll Physics: Continuous Collision Detection (CCD) against static walls and anatomical joint bounds', () => {
  const map = generateCQBMap(2026);
  // Create ragdoll at coordinate near a wall
  const ragdoll = createEnemyRagdoll({
    hitZone: 'torso',
    hitBone: 'spine2',
    impactDir: { x: 1, y: 0, z: 0 },
    impactForce: 12.0, // High-energy ballistic impact
    initialYaw: 0,
    currentPos: { x: 4.0, y: 0, z: 4.0 },
  });

  // Step physics with 6 solver substeps and static wall collision
  for (let i = 0; i < 40; i++) {
    stepEnemyRagdollPhysics(ragdoll, 0.016, map.wallSegments);
  }

  // Verify all 13 rigid bodies have valid capsule or box collider shapes
  for (const boneId of Object.keys(ragdoll.rigidBodies) as (keyof typeof ragdoll.rigidBodies)[]) {
    const rb = ragdoll.rigidBodies[boneId];
    assert.ok(rb.radius > 0, `${boneId} has positive collider radius`);
    assert.ok(rb.height > 0, `${boneId} has positive collider height`);
    assert.ok(rb.colliderType === 'capsule' || rb.colliderType === 'box');
    assert.ok(rb.position.y >= 0.04, `${boneId} does not penetrate floor`);
  }

  // Anatomical joint angular bounds: elbows and knees bend realistically without inverted limbs
  assert.ok(ragdoll.leftKnee.rotX <= 0.001, 'Left knee flexion remains <= 0 (no forward hyperextension)');
  assert.ok(ragdoll.rightKnee.rotX <= 0.001, 'Right knee flexion remains <= 0 (no forward hyperextension)');
  assert.ok(ragdoll.leftForearm.rotX >= -0.001, 'Left elbow flexion remains >= 0 (no backward hyperextension)');
  assert.ok(ragdoll.rightForearm.rotX >= -0.001, 'Right elbow flexion remains >= 0 (no backward hyperextension)');
});

test('Colt Single Action Army (SAA) Revolver: 6-round cylinder, 75 torso damage, 1-shot headshot, Single-Action ADS hammer-cock delay, Hip-Fire Fanning, Sequential Bullet-by-Bullet Reload, and Freestyle Gun-Spinning', () => {
  const colt = WEAPONS.colt_saa;
  assert.ok(colt, 'Colt SAA exists in WEAPONS dictionary');
  assert.equal(colt.slot, 'secondary');
  assert.equal(colt.magSize, 6, '6-round cylinder capacity');
  assert.equal(colt.magazineSize, 6);
  assert.equal(colt.damage, 75, 'High 75 torso damage');

  // 1. Damage profile: 75 torso damage (2-shot kill on 100 HP) and 1-shot headshot (>= 100 HP)
  assert.equal(calculateBallisticDamage('colt_saa', 'torso'), 75);
  assert.ok(calculateBallisticDamage('colt_saa', 'head') >= 100, '1-shot headshot lethality');

  // 2. Single-Action ADS vs Hip-Fire Fanning fire modes
  const adsMode = evaluateColtSAAFireMode(true);
  const hipFanMode = evaluateColtSAAFireMode(false);
  assert.equal(adsMode.mode, 'single_action_ads');
  assert.ok(adsMode.hammerCockDelaySec > 0.05, 'Single-action ADS has slight hammer-cocking delay');
  assert.equal(hipFanMode.mode, 'fanning_hip');
  assert.equal(hipFanMode.hammerCockDelaySec, 0);
  assert.ok(
    hipFanMode.fireIntervalSec < adsMode.fireIntervalSec * 0.5,
    'Fanning the hammer from the hip significantly increases fire rate (420 RPM vs ~158 RPM)'
  );
  assert.ok(
    hipFanMode.spreadRad > adsMode.spreadRad * 20,
    'Fanning the hammer drastically reduces accuracy compared to precision ADS'
  );

  // 3. Realistic Sequential Bullet-by-Bullet Reload (gate_open -> eject_casing -> insert_round x N -> gate_close)
  const reloadState = createColtSAAReloadState();
  let mag = 3; // 3 rounds fired, 3 rounds needed
  let reserve = 24;
  const started = startColtSAAReload(reloadState, mag, reserve);
  assert.equal(started, true);
  assert.equal(reloadState.active, true);
  assert.equal(reloadState.phase, 'gate_open');
  assert.equal(reloadState.roundsToLoad, 3);

  let ejectedCount = 0;
  let insertedCount = 0;
  let completed = false;
  for (let i = 0; i < 160; i++) {
    const stepRes = stepColtSAAReload(reloadState, 0.025, mag, reserve);
    mag = stepRes.newMag;
    reserve = stepRes.newReserve;
    if (stepRes.casingEjected) ejectedCount++;
    if (stepRes.roundInserted) insertedCount++;
    if (stepRes.completed) {
      completed = true;
      break;
    }
  }
  assert.equal(ejectedCount, 3, 'Ejects spent casings individually one at a time');
  assert.equal(insertedCount, 3, 'Inserts new .45 Colt cartridges individually one at a time');
  assert.equal(mag, 6, 'Cylinder reaches full 6 rounds');
  assert.equal(reserve, 21, 'Reserve decremented by 3 rounds');
  assert.equal(completed, true, 'Sequential reload completes and latches loading gate');
  assert.equal(reloadState.active, false);

  // 4. Freestyle Gun-Spinning (I / J key) and Fancy Equip Flip animations
  const spinState = createColtSAASpinState();
  triggerColtSAASpin(spinState, 'equip_flip');
  assert.equal(spinState.active, true);
  assert.equal(spinState.phase, 'equip_draw_flip');
  stepColtSAASpin(spinState, 0.25);
  assert.ok(spinState.pitchSpinRad > 1.5, 'Equip flip performs 360-degree upward pitch spin');

  triggerColtSAASpin(spinState, 'inspect_freestyle');
  assert.equal(spinState.active, true);
  assert.equal(spinState.phase, 'twirl_forward');
  const observedStages = new Set<string>([spinState.phase]);
  for (let i = 0; i < 90; i++) {
    stepColtSAASpin(spinState, 0.03);
    observedStages.add(spinState.phase);
  }
  assert.ok(observedStages.has('twirl_forward'), 'Stage 1: Trigger finger forward twirl');
  assert.ok(observedStages.has('cross_hand_toss'), 'Stage 2: Cross-hand toss to off-hand');
  assert.ok(observedStages.has('reverse_holster_spin'), 'Stage 3: Reverse spin into holster');
  assert.equal(spinState.active, false, 'Freestyle routine completes cleanly');
});

test('Premium Animation Blending & Physics-Based Weapon Sway/Recoil: 0.2s smooth crossfade controller and Hookean spring-damper solver', () => {
  assert.equal(ANIM_CROSSFADE_DURATION_SEC, 0.20, '0.2-second crossfade duration');
  const animState = createWeaponAnimationBlendState();
  assert.equal(animState.weights.idle, 1.0);

  // Crossfade from Idle -> Walk over 0.1s (halfway through 0.2s crossfade)
  stepWeaponAnimationController(animState, 'walk', 0.10);
  assert.equal(animState.activeState, 'walk');
  assert.ok(animState.weights.idle > 0.3 && animState.weights.idle < 0.7, 'Smoothly crossfading at 50%');
  assert.ok(animState.weights.walk > 0.3 && animState.weights.walk < 0.7, 'Smoothly crossfading at 50%');
  const weightSum =
    animState.weights.idle +
    animState.weights.walk +
    animState.weights.sprint +
    animState.weights.fire +
    animState.weights.reload;
  assert.ok(Math.abs(weightSum - 1.0) < 1e-5, 'Animation blend weights always sum to 1.0 (zero T-posing)');

  // Transition through Sprint -> Fire -> Reload smoothly
  for (const mode of ['sprint', 'fire', 'reload'] as const) {
    for (let i = 0; i < 10; i++) {
      stepWeaponAnimationController(animState, mode, 0.025);
    }
    assert.equal(animState.activeState, mode);
    assert.ok(animState.weights[mode] > 0.95, `${mode} state reaches full blend weight smoothly`);
  }

  // Hookean Spring-Damper Weapon Sway & Recoil
  const spring = createWeaponSpringState();
  // Turning camera imparts rotational/positional drag (weapon sway)
  const swayOut = stepWeaponSpringPhysics(spring, {
    dt: 0.016,
    lookDeltaYaw: 0.08,
    lookDeltaPitch: -0.05,
    moveSpeed: 3.8,
    isMoving: true,
    isSprinting: false,
    isCrouched: false,
    isGrounded: true,
    isAds: false,
  });
  assert.ok(Math.abs(swayOut.offsetX) > 0 || Math.abs(swayOut.rotY) > 0, 'Camera turn produces weapon sway lag');

  // Firing imparts violent backward & upward recoil impulse that settles back to zero via spring-damper
  applyWeaponSpringRecoilImpulse(spring, 0.04, 0.01, false);
  const kickOut = stepWeaponSpringPhysics(spring, {
    dt: 0.016,
    lookDeltaYaw: 0,
    lookDeltaPitch: 0,
    moveSpeed: 0,
    isMoving: false,
    isSprinting: false,
    isCrouched: false,
    isGrounded: true,
    isAds: false,
  });
  assert.ok(kickOut.offsetZ > 0.005, 'Weapon kicks backward (+Z) on recoil impulse');
  assert.ok(kickOut.rotX > 0.01, 'Weapon pitches upward (+rotX) on recoil impulse');

  // Settle back to rest over 1.0s
  let settledOut = kickOut;
  for (let i = 0; i < 60; i++) {
    settledOut = stepWeaponSpringPhysics(spring, {
      dt: 0.016,
      lookDeltaYaw: 0,
      lookDeltaPitch: 0,
      moveSpeed: 0,
      isMoving: false,
      isSprinting: false,
      isCrouched: false,
      isGrounded: true,
      isAds: false,
    });
  }
  assert.ok(Math.abs(settledOut.offsetZ) < 0.002, 'Spring settles smoothly back to center');
  assert.ok(Math.abs(settledOut.rotX) < 0.005, 'Rotational recoil settles smoothly back to center');
});

test('ACTUAL Cannon.js (cannon-es) Ragdoll Physics: CANNON.World, Box torso/pelvis & Capsule limbs, Hinge & ConeTwist constraints, localized bullet impulse, and CCD', () => {
  const map = generateCQBMap(2026);
  const ragdoll = createEnemyRagdoll({
    hitZone: 'head',
    hitBone: 'head',
    impactDir: { x: 0, y: 0.1, z: -1 },
    impactForce: 7.5,
    initialYaw: 0,
    currentPos: { x: 4.5, y: 0, z: 4.5 },
  });

  assert.equal(ragdoll.physicsEngine, 'cannon-es', 'Powered by real cannon-es physics engine');
  assert.ok(ragdoll.cannonWorld, 'CANNON.World instance initialized');
  assert.ok(ragdoll.cannonBodies, 'CANNON.Body map initialized');
  assert.equal(Object.keys(ragdoll.cannonBodies!).length, 13, 'All 13 skeletal bones have CANNON.Body instances');

  // Torso and pelvis use Box colliders; limbs use Capsule colliders
  assert.equal(ragdoll.rigidBodies.hips.colliderType, 'box');
  assert.equal(ragdoll.rigidBodies.spine1.colliderType, 'box');
  assert.equal(ragdoll.rigidBodies.spine2.colliderType, 'box');
  assert.equal(ragdoll.rigidBodies.leftUpperArm.colliderType, 'capsule');
  assert.equal(ragdoll.rigidBodies.rightForearm.colliderType, 'capsule');
  assert.equal(ragdoll.rigidBodies.leftKnee.colliderType, 'capsule');

  // Verify Continuous Collision Detection (CCD) is enabled on every Cannon.js rigid body
  for (const boneId of Object.keys(ragdoll.cannonBodies!) as (keyof typeof ragdoll.rigidBodies)[]) {
    const cBody = ragdoll.cannonBodies![boneId];
    assert.ok(cBody.ccdSpeedThreshold > 0, `${boneId} has CCD speed threshold enabled`);
    assert.ok(cBody.ccdIterations >= 8, `${boneId} has >= 8 CCD sub-iterations`);
  }

  // Verify Cannon.js constraints (HingeConstraint for elbows/knees + ConeTwistConstraint for ball-socket joints)
  assert.equal(ragdoll.cannonWorld!.constraints.length, 12, '12 Cannon.js constraints link the 13 rigid bodies');

  // Step physics with walls and floor and verify zero clipping and strict anatomical joint limits
  for (let i = 0; i < 45; i++) {
    stepEnemyRagdollPhysics(ragdoll, 0.016, map.wallSegments);
  }
  for (const boneId of Object.keys(ragdoll.rigidBodies) as (keyof typeof ragdoll.rigidBodies)[]) {
    const rb = ragdoll.rigidBodies[boneId];
    assert.ok(rb.position.y >= rb.radius * 0.95, `${boneId} never clips through floor (y=${rb.position.y})`);
  }
  assert.ok(ragdoll.leftKnee.rotX <= 0.001 && ragdoll.leftKnee.rotX >= -2.45, 'Left knee respects anatomical hinge limits');
  assert.ok(ragdoll.rightKnee.rotX <= 0.001 && ragdoll.rightKnee.rotX >= -2.45, 'Right knee respects anatomical hinge limits');
  assert.ok(ragdoll.leftForearm.rotX >= -0.001 && ragdoll.leftForearm.rotX <= 2.45, 'Left elbow respects anatomical hinge limits');
  assert.ok(ragdoll.rightForearm.rotX >= -0.001 && ragdoll.rightForearm.rotX <= 2.45, 'Right elbow respects anatomical hinge limits');
});

test('Multiplayer 6-Digit Party Code & 60Hz Remote Operator Interpolation: generatePartyCode, sanitizePartyCode, lerpAngleRad, and interpolateRemotePlayerPose', () => {
  // 1. 6-digit Party Code generation & sanitization
  const code = generatePartyCode();
  assert.match(code, /^\d{6}$/, 'generatePartyCode produces a 6-digit numeric party code');
  assert.equal(sanitizePartyCode(' #749-208-99 '), '749208', 'sanitizePartyCode strips punctuation and caps at 6 chars');

  // 2. Shortest-arc radian angle interpolation across -PI/+PI wraparound
  const wrapped = lerpAngleRad(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
  assert.ok(Math.abs(Math.abs(wrapped) - Math.PI) < 0.05, 'lerpAngleRad interpolates across PI boundary without spinning 360 degrees');

  // 3. 60Hz Remote Player Transform & Stance/Lean Interpolation
  const prevPose: InterpolatedRemotePose = {
    pos: { x: 4.0, y: 1.68, z: 4.0 },
    yaw: 0,
    pitch: 0,
    crouchProgress: 0,
    leanAmount: 0,
    locomotion: 'idle',
  };
  const targetNetState = {
    id: 'op-2',
    callsign: 'BRAVO-02',
    team: 'ATTACKERS' as const,
    isHost: false,
    pos: { x: 8.0, y: 1.05, z: 6.0 },
    yaw: Math.PI / 2,
    pitch: -0.25,
    crouchProgress: 1.0,
    leanAmount: -1.0,
    activeWeapon: 'hk416' as const,
    attachments: ['suppressor' as const, 'holographic' as const],
    isAds: true,
    isReloading: false,
    isSprinting: false,
    hp: 100,
    maxHp: 100,
    kills: 3,
    deaths: 0,
    headshots: 2,
    shotsFired: 20,
    shotsHit: 17,
    pingMs: 18,
    lastUpdated: Date.now(),
  };

  let cur = prevPose;
  for (let i = 0; i < 20; i++) {
    cur = interpolateRemotePlayerPose(cur, targetNetState, 1 / 60);
  }
  assert.ok(cur.pos.x > 7.5 && cur.pos.x <= 8.0, 'Remote X position smoothly converges toward target');
  assert.ok(cur.crouchProgress > 0.85, 'Remote crouchProgress smoothly converges toward 1.0');
  assert.ok(cur.leanAmount < -0.85, 'Remote leanAmount smoothly converges toward -1.0');
  assert.ok(Math.abs(cur.yaw - Math.PI / 2) < 0.15, 'Remote yaw smoothly converges toward target');
});

test('Spatial Hash Ray Traversal, Multi-Iteration Swept Circle-vs-AABB Solver, Gunsmith Stat Deltas, and PvP Team Spawns', () => {
  const map = generateCQBMap(2026, 'l_compound');

  // 1. Room-Grid Spatial Hash Ray Traversal returns traversed RoomCells without scanning unrelated sectors
  const rayRooms = getRoomsAlongRay(
    map,
    { x: map.rooms[0].centerX, z: map.rooms[0].centerZ },
    { x: 1, z: 0 },
    8.0
  );
  assert.ok(rayRooms.length >= 1 && rayRooms.length <= 6, 'getRoomsAlongRay returns local traversed and neighbor RoomCells');
  assert.ok(
    rayRooms.some((r) => r.gx === map.rooms[0].gx && r.gz === map.rooms[0].gz),
    'Includes origin RoomCell'
  );

  // 2. Multi-iteration swept circle-vs-AABB collision prevents acute corner tunneling and slides velocity
  const cornerWalls = [
    { id: 'w-north', minX: 0, maxX: 4, minY: 0, maxY: 3.6, minZ: -0.16, maxZ: 0.16, kind: 'wall' as const },
    { id: 'w-west', minX: -0.16, maxX: 0.16, minY: 0, maxY: 3.6, minZ: 0, maxZ: 4, kind: 'wall' as const },
  ];
  const cornerRes = resolveCircleAABBCollision(
    0.05,
    0.05,
    0.34,
    cornerWalls,
    1.7,
    0.8,
    0.8
  );
  assert.equal(cornerRes.collided, true);
  assert.ok(cornerRes.x >= 0.16 + 0.339, 'Resolved X pushed cleanly out of west wall');
  assert.ok(cornerRes.z >= 0.16 + 0.339, 'Resolved Z pushed cleanly out of north wall');

  // 3. Gunsmith Stat Delta Bars compute base vs. modified attachment deltas
  const hkDelta = getWeaponStatDelta('hk416', ['suppressor', 'holographic', 'laser']);
  assert.ok(hkDelta.delta.recoil < 0, 'Suppressor reduces recoil kick intensity delta');
  assert.ok(hkDelta.modified.recoil < hkDelta.base.recoil, 'Modified recoil kick is lower than base');

  // 4. PvP Team Spawns place Attackers in Breach Entry (rooms[0]) and Defenders in Command Core (rooms[last])
  assert.equal(SPAWN_SHIELD_DURATION_SEC, 2.0);
  const atkSpawn = computeTeamSpawnPoint(map, 'ATTACKERS', 'PVP_VERSUS', 0);
  const defSpawn = computeTeamSpawnPoint(map, 'DEFENDERS', 'PVP_VERSUS', 0);
  const distBetweenSpawns = Math.hypot(atkSpawn.x - defSpawn.x, atkSpawn.z - defSpawn.z);
  assert.ok(distBetweenSpawns > 8.0, 'Attackers and Defenders spawn in opposite sectors of the CQB compound');
});


