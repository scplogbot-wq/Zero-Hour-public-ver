import {
  WeaponId,
  AttachmentId,
  MapLayoutVariant,
  HitZone,
  RagdollBoneId,
  GeneratedCQBMap,
} from './tacticalLogic';

export type TacticalGameMode = 'SOLO_BREACH' | 'COOP_SQUAD' | 'PVP_VERSUS';
export type OperatorTeam = 'ATTACKERS' | 'DEFENDERS';

export const SPAWN_SHIELD_DURATION_SEC = 2.0;

export interface WorldStateDeltaSnapshot {
  destroyedLightIds: string[];
  barricades: Array<{
    id: string;
    collapsed: boolean;
    meleeHits: number;
    brokenChunkMask: number[];
  }>;
  triggeredLockerIds: string[];
  enemies: Array<{
    id: string;
    hp: number;
    state: string;
    x: number;
    z: number;
  }>;
}

export interface NetworkPlayerState {
  id: string;
  callsign: string;
  team: OperatorTeam;
  isHost: boolean;
  pos: { x: number; y: number; z: number };
  vel?: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  crouchProgress: number;
  leanAmount: number;
  activeWeapon: WeaponId;
  attachments: AttachmentId[];
  isAds: boolean;
  isReloading: boolean;
  isSprinting: boolean;
  hp: number;
  maxHp: number;
  spawnShieldTimer?: number;
  kills: number;
  deaths: number;
  headshots: number;
  shotsFired: number;
  shotsHit: number;
  pingMs: number;
  lastUpdated: number;
}

export interface BaseReplicatedEvent {
  eventId: string;
  seq: number;
  timestamp: number;
  partyCode: string;
}

export interface ReplicatedFireShotEvent extends BaseReplicatedEvent {
  type: 'FIRE_SHOT';
  shooterId: string;
  callsign: string;
  team: OperatorTeam;
  weaponId: WeaponId;
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
  isSuppressed: boolean;
}

export interface ReplicatedBarricadeDamageEvent extends BaseReplicatedEvent {
  type: 'BARRICADE_DAMAGE';
  shooterId: string;
  barricadeId: string;
  plankIndex: number;
  chunkIndex: number;
  weaponId: WeaponId;
  dir: { x: number; y: number; z: number };
  isMelee: boolean;
}

export interface ReplicatedLightShatterEvent extends BaseReplicatedEvent {
  type: 'LIGHT_SHATTER';
  shooterId: string;
  fixtureId: string;
  point: { x: number; y: number; z: number };
}

export interface ReplicatedGrenadeThrowEvent extends BaseReplicatedEvent {
  type: 'GRENADE_THROW';
  throwerId: string;
  grenadeId: string;
  origin: { x: number; y: number; z: number };
  aimDir: { x: number; y: number; z: number };
}

export interface ReplicatedPlayerHitEvent extends BaseReplicatedEvent {
  type: 'PLAYER_HIT';
  attackerId: string;
  attackerCallsign: string;
  attackerTeam: OperatorTeam;
  weaponId: WeaponId;
  targetId: string;
  targetCallsign: string;
  targetIsAI: boolean;
  damage: number;
  hitZone: HitZone;
  hitBone?: RagdollBoneId;
  isHeadshot: boolean;
  isWallBang: boolean;
  hitPoint: { x: number; y: number; z: number };
  impactDir: { x: number; y: number; z: number };
  fatal: boolean;
}

export interface ReplicatedMatchSyncEvent extends BaseReplicatedEvent {
  type: 'MATCH_SYNC';
  hostId: string;
  mode: TacticalGameMode;
  mapSeed: number;
  layoutVariant: MapLayoutVariant;
  startMatchNow: boolean;
  worldSnapshot?: WorldStateDeltaSnapshot;
}

export type ReplicatedWorldEvent =
  | ReplicatedFireShotEvent
  | ReplicatedBarricadeDamageEvent
  | ReplicatedLightShatterEvent
  | ReplicatedGrenadeThrowEvent
  | ReplicatedPlayerHitEvent
  | ReplicatedMatchSyncEvent;

export type ReplicatedEventInput =
  | Omit<ReplicatedFireShotEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>
  | Omit<ReplicatedBarricadeDamageEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>
  | Omit<ReplicatedLightShatterEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>
  | Omit<ReplicatedGrenadeThrowEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>
  | Omit<ReplicatedPlayerHitEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>
  | Omit<ReplicatedMatchSyncEvent, 'eventId' | 'seq' | 'timestamp' | 'partyCode'>;

export interface KillfeedEntry {
  id: string;
  timestamp: number;
  attackerCallsign: string;
  attackerTeam: OperatorTeam;
  victimCallsign: string;
  weaponId: WeaponId;
  isHeadshot: boolean;
  isWallBang: boolean;
  detailBadge?: string;
}

export type NetEnvelope =
  | {
      kind: 'JOIN_ROOM';
      partyCode: string;
      mode: TacticalGameMode;
      player: NetworkPlayerState;
      mapSeed: number;
      layoutVariant: MapLayoutVariant;
    }
  | {
      kind: 'LEAVE_ROOM';
      partyCode: string;
      playerId: string;
    }
  | {
      kind: 'ROOM_STATE';
      partyCode: string;
      mode: TacticalGameMode;
      hostId: string;
      mapSeed: number;
      layoutVariant: MapLayoutVariant;
      players: NetworkPlayerState[];
      worldSnapshot?: WorldStateDeltaSnapshot;
    }
  | {
      kind: 'PLAYER_POSE';
      partyCode: string;
      player: NetworkPlayerState;
    }
  | {
      kind: 'WORLD_EVENT';
      partyCode: string;
      event: ReplicatedWorldEvent;
    }
  | {
      kind: 'PING';
      partyCode: string;
      senderId: string;
      sentAt: number;
    }
  | {
      kind: 'PONG';
      partyCode: string;
      targetId: string;
      sentAt: number;
    };

/**
 * Generates a clean 6-character numeric tactical Party Code (e.g., "749208" or "834912")
 */
export function generatePartyCode(seedNum?: number): string {
  if (typeof seedNum === 'number') {
    const normalized = Math.abs(Math.floor(seedNum * 1664525 + 1013904223)) % 900000;
    return String(100000 + normalized);
  }
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

/**
 * Normalizes a user-entered Party Code to 6 uppercase alphanumeric characters.
 */
export function sanitizePartyCode(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  return cleaned;
}

/**
 * Shortest-arc angular interpolation using atan2(sin(dYaw), cos(dYaw)) so remote operators
 * never spin 360 degrees when crossing the -PI / +PI yaw boundary.
 */
export function lerpAngleRad(current: number, target: number, alpha: number): number {
  const dYaw = target - current;
  const shortestDiff = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  return current + shortestDiff * Math.max(0, Math.min(1, alpha));
}

export interface PoseSnapshotSample {
  timestamp: number;
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  crouchProgress: number;
  leanAmount: number;
  isSprinting: boolean;
}

export interface InterpolatedRemotePose {
  pos: { x: number; y: number; z: number };
  vel?: { x: number; y: number; z: number };
  yaw: number;
  pitch: number;
  crouchProgress: number;
  leanAmount: number;
  locomotion: 'idle' | 'walk' | 'sprint';
  lastTargetPos?: { x: number; y: number; z: number };
  lastSampleTimestamp?: number;
}

/**
 * Smooth 60Hz Hermite velocity-extrapolated & shortest-arc damped interpolation
 * with a 100ms jitter window for remote multiplayer operators.
 */
export function interpolateRemotePlayerPose(
  current: InterpolatedRemotePose,
  target: NetworkPlayerState,
  dt: number
): InterpolatedRemotePose {
  const clampedDt = Math.max(0.001, Math.min(0.1, dt));
  const alpha = 1 - Math.exp(-16 * clampedDt);

  // Estimate target velocity from consecutive target snapshots (100ms jitter buffer awareness)
  let vx = target.vel?.x ?? 0;
  let vz = target.vel?.z ?? 0;
  if (
    current.lastTargetPos &&
    current.lastSampleTimestamp &&
    target.lastUpdated > current.lastSampleTimestamp
  ) {
    const sampleDt = Math.max(0.02, Math.min(0.25, (target.lastUpdated - current.lastSampleTimestamp) / 1000));
    vx = (target.pos.x - current.lastTargetPos.x) / sampleDt;
    vz = (target.pos.z - current.lastTargetPos.z) / sampleDt;
  }

  // Apply light Hermite velocity lead (capped at 50ms horizon) to mask 20Hz packet cadence
  const leadHorizon = 0.035;
  const predictedTargetX = target.pos.x + Math.max(-0.35, Math.min(0.35, vx * leadHorizon));
  const predictedTargetZ = target.pos.z + Math.max(-0.35, Math.min(0.35, vz * leadHorizon));

  const dx = predictedTargetX - current.pos.x;
  const dz = predictedTargetZ - current.pos.z;
  const rawDist = Math.hypot(target.pos.x - current.pos.x, target.pos.z - current.pos.z);
  const planarSpeed = Math.hypot(dx, dz) / Math.max(0.016, clampedDt);

  const nextPos =
    rawDist > 6.0
      ? { x: target.pos.x, y: target.pos.y, z: target.pos.z }
      : {
          x: current.pos.x + dx * alpha,
          y: current.pos.y + (target.pos.y - current.pos.y) * alpha,
          z: current.pos.z + dz * alpha,
        };

  const locomotion: 'idle' | 'walk' | 'sprint' = target.isSprinting
    ? 'sprint'
    : planarSpeed > 0.35
    ? 'walk'
    : 'idle';

  return {
    pos: nextPos,
    vel: { x: vx, y: 0, z: vz },
    yaw: lerpAngleRad(current.yaw, target.yaw, alpha),
    pitch: current.pitch + (target.pitch - current.pitch) * alpha,
    crouchProgress:
      current.crouchProgress + (target.crouchProgress - current.crouchProgress) * alpha,
    leanAmount: current.leanAmount + (target.leanAmount - current.leanAmount) * alpha,
    locomotion,
    lastTargetPos: { x: target.pos.x, y: target.pos.y, z: target.pos.z },
    lastSampleTimestamp: target.lastUpdated,
  };
}

/**
 * Deterministic team-based spawn selector:
 * - ATTACKERS (or SOLO/CO-OP) spawn at Breach Entry (rooms[0]).
 * - DEFENDERS in PVP_VERSUS spawn in the deepest Command Core room (rooms[rooms.length - 1]).
 */
export function computeTeamSpawnPoint(
  map: GeneratedCQBMap,
  team: OperatorTeam,
  mode: TacticalGameMode,
  slotOffsetIndex = 0
): { x: number; y: number; z: number; yaw: number } {
  const offsetAngle = (slotOffsetIndex % 4) * (Math.PI * 0.5);
  const offsetRadius = slotOffsetIndex === 0 ? 0 : 0.45;
  const ox = Math.cos(offsetAngle) * offsetRadius;
  const oz = Math.sin(offsetAngle) * offsetRadius;

  if (mode === 'PVP_VERSUS' && team === 'DEFENDERS' && map.rooms.length > 1) {
    const coreRoom = map.rooms[map.rooms.length - 1];
    const prevRoom = map.rooms[Math.max(0, map.rooms.length - 2)];
    const faceYaw = Math.atan2(
      prevRoom.centerX - coreRoom.centerX,
      prevRoom.centerZ - coreRoom.centerZ
    );
    return {
      x: coreRoom.centerX + ox,
      y: map.playerSpawn.y,
      z: coreRoom.centerZ + oz,
      yaw: faceYaw,
    };
  }

  return {
    x: map.playerSpawn.x + ox,
    y: map.playerSpawn.y,
    z: map.playerSpawn.z + oz,
    yaw: map.playerSpawn.yaw,
  };
}

/**
 * Dual-Transport Tactical Network Manager:
 * - Connects to `/ws` WebSocket server for cross-device / multi-browser Party Code rooms
 * - Simultaneously bridges `BroadcastChannel('zero_hour_cqb_net')` for zero-config instant local multi-tab sync
 * - Maintains authoritative sequence counters, mortality locks, and delta world snapshots for late joiners
 */
export class TacticalNetworkManager {
  public readonly localPlayerId: string;
  public callsign: string;
  public partyCode: string;
  public mode: TacticalGameMode;
  public team: OperatorTeam;
  public isHost: boolean;
  public connected: boolean = false;
  public transportLabel: 'WS+BC' | 'LOCAL_BC' | 'OFFLINE' = 'LOCAL_BC';
  public pingMs: number = 14;
  public pingHistory: number[] = [14, 15, 13, 14, 14, 16, 14, 13, 15, 14, 14, 13];
  public mapSeed: number = 2026;
  public layoutVariant: MapLayoutVariant = 'l_compound';

  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private players = new Map<string, NetworkPlayerState>();
  private processedEventIds = new Set<string>();
  private claimedFatalTargetIds = new Set<string>();
  private peerHighestSeq = new Map<string, number>();
  private localSeq = 0;
  private latestWorldSnapshot?: WorldStateDeltaSnapshot;
  private snapshotProviderCb?: () => WorldStateDeltaSnapshot | undefined;
  private pingIntervalId: number | null = null;
  private reconnectTimerId: number | null = null;
  private destroyed = false;

  private onRosterChangeCb?: (players: NetworkPlayerState[]) => void;
  private onWorldEventCb?: (event: ReplicatedWorldEvent) => void;
  private onRoomSyncCb?: (sync: {
    partyCode: string;
    mode: TacticalGameMode;
    hostId: string;
    mapSeed: number;
    layoutVariant: MapLayoutVariant;
    worldSnapshot?: WorldStateDeltaSnapshot;
  }) => void;

  constructor(opts?: {
    callsign?: string;
    partyCode?: string;
    mode?: TacticalGameMode;
    mapSeed?: number;
    layoutVariant?: MapLayoutVariant;
  }) {
    this.localPlayerId = `op-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-3)}`;
    this.callsign = opts?.callsign || `VANGUARD-${Math.floor(10 + Math.random() * 89)}`;
    this.partyCode = opts?.partyCode || generatePartyCode();
    this.mode = opts?.mode || 'COOP_SQUAD';
    this.team = 'ATTACKERS';
    this.isHost = true;
    this.mapSeed = opts?.mapSeed ?? 2026;
    this.layoutVariant = opts?.layoutVariant ?? 'l_compound';

    this.upsertLocalPlayerState({
      pos: { x: 6.15, y: 1.68, z: 4.0 },
      yaw: -Math.PI / 2,
      pitch: 0,
      crouchProgress: 0,
      leanAmount: 0,
      activeWeapon: 'hk416',
      attachments: [],
      isAds: false,
      isReloading: false,
      isSprinting: false,
      hp: 100,
      maxHp: 100,
      spawnShieldTimer: 0,
      kills: 0,
      deaths: 0,
      headshots: 0,
      shotsFired: 0,
      shotsHit: 0,
    });
  }

  public setWorldSnapshotProvider(cb: () => WorldStateDeltaSnapshot | undefined): void {
    this.snapshotProviderCb = cb;
  }

  public resetMatchLocks(): void {
    this.claimedFatalTargetIds.clear();
  }

  /**
   * Claims a fatal kill on a target ID (AI or player) so simultaneous peer hits on the same tick
   * never double-count kills or spawn duplicate ragdolls.
   */
  public tryClaimFatalHit(targetId: string): boolean {
    if (this.claimedFatalTargetIds.has(targetId)) {
      return false;
    }
    this.claimedFatalTargetIds.add(targetId);
    return true;
  }

  public releaseFatalClaim(targetId: string): void {
    this.claimedFatalTargetIds.delete(targetId);
  }

  public initTransports(): void {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel for zero-latency multi-tab local room synchronization
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel('zero_hour_cqb_net');
        this.bc.onmessage = (ev: MessageEvent<NetEnvelope>) => {
          if (ev.data) this.handleIncomingEnvelope(ev.data, 'bc');
        };
        this.connected = true;
        this.transportLabel = 'LOCAL_BC';
      } catch {
        // Ignore BroadcastChannel errors in restricted contexts
      }
    }

    // 2. WebSocket connection to `/ws` on the Express server
    this.connectWebSocket();

    // 3. Periodic Ping / Heartbeat
    this.pingIntervalId = window.setInterval(() => {
      this.sendPing();
      this.pruneStaleRemotePlayers();
    }, 2000);

    // Announce initial room presence
    this.announceJoin();
  }

  private connectWebSocket(): void {
    if (typeof window === 'undefined' || this.destroyed) return;
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        if (this.destroyed) return;
        this.connected = true;
        this.transportLabel = 'WS+BC';
        this.announceJoin();
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as NetEnvelope;
          this.handleIncomingEnvelope(data, 'ws');
        } catch {
          // Ignore malformed frame
        }
      };

      socket.onclose = () => {
        if (this.destroyed) return;
        this.transportLabel = this.bc ? 'LOCAL_BC' : 'OFFLINE';
        if (this.reconnectTimerId === null) {
          this.reconnectTimerId = window.setTimeout(() => {
            this.reconnectTimerId = null;
            this.connectWebSocket();
          }, 3500);
        }
      };

      socket.onerror = () => {
        // Handled by onclose fallback to BroadcastChannel
      };
    } catch {
      this.transportLabel = this.bc ? 'LOCAL_BC' : 'OFFLINE';
    }
  }

  public onRosterChange(cb: (players: NetworkPlayerState[]) => void): void {
    this.onRosterChangeCb = cb;
    cb(this.getPlayers());
  }

  public onWorldEvent(cb: (event: ReplicatedWorldEvent) => void): void {
    this.onWorldEventCb = cb;
  }

  public onRoomSync(
    cb: (sync: {
      partyCode: string;
      mode: TacticalGameMode;
      hostId: string;
      mapSeed: number;
      layoutVariant: MapLayoutVariant;
      worldSnapshot?: WorldStateDeltaSnapshot;
    }) => void
  ): void {
    this.onRoomSyncCb = cb;
  }

  public getPlayers(): NetworkPlayerState[] {
    return Array.from(this.players.values()).sort((a, b) =>
      a.isHost === b.isHost ? a.callsign.localeCompare(b.callsign) : a.isHost ? -1 : 1
    );
  }

  public getRemotePlayers(): NetworkPlayerState[] {
    return this.getPlayers().filter((p) => p.id !== this.localPlayerId);
  }

  public setCallsign(newCallsign: string): void {
    const clean = newCallsign.trim().toUpperCase().slice(0, 14) || 'OPERATOR';
    this.callsign = clean;
    const me = this.players.get(this.localPlayerId);
    if (me) {
      me.callsign = clean;
      this.players.set(this.localPlayerId, me);
      this.broadcastPose(me);
      this.notifyRoster();
    }
  }

  public setMode(newMode: TacticalGameMode): void {
    this.mode = newMode;
    if (newMode !== 'PVP_VERSUS') {
      this.team = 'ATTACKERS';
      const me = this.players.get(this.localPlayerId);
      if (me) {
        me.team = 'ATTACKERS';
        this.players.set(this.localPlayerId, me);
      }
    }
    this.announceJoin();
    this.notifyRoster();
  }

  public setTeam(newTeam: OperatorTeam): void {
    this.team = newTeam;
    const me = this.players.get(this.localPlayerId);
    if (me) {
      me.team = newTeam;
      this.players.set(this.localPlayerId, me);
      this.broadcastPose(me);
      this.notifyRoster();
    }
  }

  public joinPartyCode(
    rawCode: string,
    modeOverride?: TacticalGameMode,
    seedOverride?: number,
    layoutOverride?: MapLayoutVariant
  ): string {
    const nextCode = sanitizePartyCode(rawCode) || generatePartyCode();
    if (this.partyCode && this.partyCode !== nextCode) {
      this.sendEnvelope({
        kind: 'LEAVE_ROOM',
        partyCode: this.partyCode,
        playerId: this.localPlayerId,
      });
    }
    this.partyCode = nextCode;
    if (modeOverride) this.mode = modeOverride;
    if (seedOverride !== undefined) this.mapSeed = seedOverride;
    if (layoutOverride !== undefined) this.layoutVariant = layoutOverride;

    // Reset remote players from previous room
    const me = this.players.get(this.localPlayerId);
    this.players.clear();
    this.claimedFatalTargetIds.clear();
    if (me) {
      me.isHost = true;
      this.isHost = true;
      this.players.set(this.localPlayerId, me);
    }

    this.announceJoin();
    this.notifyRoster();
    return this.partyCode;
  }

  public upsertLocalPlayerState(
    partial: Omit<
      NetworkPlayerState,
      'id' | 'callsign' | 'team' | 'isHost' | 'pingMs' | 'lastUpdated'
    >
  ): NetworkPlayerState {
    const next: NetworkPlayerState = {
      id: this.localPlayerId,
      callsign: this.callsign,
      team: this.team,
      isHost: this.isHost,
      ...partial,
      pingMs: this.pingMs,
      lastUpdated: Date.now(),
    };
    this.players.set(this.localPlayerId, next);
    return next;
  }

  public broadcastLocalPose(
    partial: Omit<
      NetworkPlayerState,
      'id' | 'callsign' | 'team' | 'isHost' | 'pingMs' | 'lastUpdated'
    >
  ): void {
    const state = this.upsertLocalPlayerState(partial);
    if (this.mode === 'SOLO_BREACH') return;
    this.broadcastPose(state);
  }

  private broadcastPose(player: NetworkPlayerState): void {
    this.sendEnvelope({
      kind: 'PLAYER_POSE',
      partyCode: this.partyCode,
      player,
    });
  }

  public broadcastWorldEvent(eventPayload: ReplicatedEventInput): void {
    if (this.mode === 'SOLO_BREACH' && eventPayload.type !== 'MATCH_SYNC') return;
    this.localSeq += 1;
    const seq = this.localSeq;
    const timestamp = Date.now();
    const eventId = `ev-${this.localPlayerId}-${seq}-${timestamp.toString(36)}`;
    this.processedEventIds.add(eventId);

    const fullEvent = {
      ...eventPayload,
      eventId,
      seq,
      timestamp,
      partyCode: this.partyCode,
    } as ReplicatedWorldEvent;

    if (fullEvent.type === 'MATCH_SYNC' && !fullEvent.worldSnapshot && this.snapshotProviderCb) {
      fullEvent.worldSnapshot = this.snapshotProviderCb();
    }

    this.sendEnvelope({
      kind: 'WORLD_EVENT',
      partyCode: this.partyCode,
      event: fullEvent,
    });
  }

  private announceJoin(): void {
    const me = this.players.get(this.localPlayerId);
    if (!me) return;
    this.sendEnvelope({
      kind: 'JOIN_ROOM',
      partyCode: this.partyCode,
      mode: this.mode,
      player: me,
      mapSeed: this.mapSeed,
      layoutVariant: this.layoutVariant,
    });
  }

  private sendPing(): void {
    this.sendEnvelope({
      kind: 'PING',
      partyCode: this.partyCode,
      senderId: this.localPlayerId,
      sentAt: performance.now(),
    });
  }

  private sendEnvelope(env: NetEnvelope): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(env));
      } catch {
        // Ignore send error
      }
    }
    if (this.bc) {
      try {
        this.bc.postMessage(env);
      } catch {
        // Ignore BroadcastChannel error
      }
    }
  }

  private handleIncomingEnvelope(env: NetEnvelope, source: 'ws' | 'bc'): void {
    if (env.partyCode !== this.partyCode) return;

    switch (env.kind) {
      case 'JOIN_ROOM': {
        if (env.player.id === this.localPlayerId) return;
        const isExisting = this.players.has(env.player.id);
        this.players.set(env.player.id, {
          ...env.player,
          lastUpdated: Date.now(),
        });

        // If we are the host, reply with authoritative ROOM_STATE + latest delta worldSnapshot for late joiners
        if (this.isHost) {
          const snapshot = this.snapshotProviderCb?.() ?? this.latestWorldSnapshot;
          this.sendEnvelope({
            kind: 'ROOM_STATE',
            partyCode: this.partyCode,
            mode: this.mode,
            hostId: this.localPlayerId,
            mapSeed: this.mapSeed,
            layoutVariant: this.layoutVariant,
            players: this.getPlayers(),
            worldSnapshot: snapshot,
          });
        } else if (source === 'bc' && !isExisting) {
          this.notifyRoster();
        }
        if (!isExisting) {
          this.notifyRoster();
        }
        break;
      }

      case 'LEAVE_ROOM': {
        if (this.players.delete(env.playerId)) {
          this.peerHighestSeq.delete(env.playerId);
          this.notifyRoster();
        }
        break;
      }

      case 'ROOM_STATE': {
        this.mode = env.mode;
        this.mapSeed = env.mapSeed;
        this.layoutVariant = env.layoutVariant;
        this.isHost = env.hostId === this.localPlayerId;
        if (env.worldSnapshot) {
          this.latestWorldSnapshot = env.worldSnapshot;
        }

        for (const p of env.players) {
          if (p.id === this.localPlayerId) {
            const me = this.players.get(this.localPlayerId);
            if (me) {
              me.isHost = p.isHost;
              this.players.set(this.localPlayerId, me);
            }
          } else {
            this.players.set(p.id, { ...p, lastUpdated: Date.now() });
          }
        }
        this.onRoomSyncCb?.({
          partyCode: env.partyCode,
          mode: env.mode,
          hostId: env.hostId,
          mapSeed: env.mapSeed,
          layoutVariant: env.layoutVariant,
          worldSnapshot: env.worldSnapshot,
        });
        this.notifyRoster();
        break;
      }

      case 'PLAYER_POSE': {
        if (env.player.id === this.localPlayerId) return;
        const prev = this.players.get(env.player.id);
        // Drop out-of-order stale pose packets
        if (prev && env.player.lastUpdated < prev.lastUpdated - 50) return;

        this.players.set(env.player.id, {
          ...env.player,
          lastUpdated: Date.now(),
        });
        if (!prev) {
          this.notifyRoster();
        }
        break;
      }

      case 'WORLD_EVENT': {
        const ev = env.event;
        if (this.processedEventIds.has(ev.eventId)) return;
        this.processedEventIds.add(ev.eventId);
        if (this.processedEventIds.size > 500) {
          const first = this.processedEventIds.values().next().value;
          if (first) this.processedEventIds.delete(first);
        }

        // Deduplicate fatal PLAYER_HIT events across peers
        if (ev.type === 'PLAYER_HIT' && ev.fatal) {
          if (!this.tryClaimFatalHit(ev.targetId)) {
            return;
          }
        }

        if (ev.type === 'MATCH_SYNC') {
          this.mode = ev.mode;
          this.mapSeed = ev.mapSeed;
          this.layoutVariant = ev.layoutVariant;
          this.resetMatchLocks();
          if (ev.worldSnapshot) {
            this.latestWorldSnapshot = ev.worldSnapshot;
          }
        }
        this.onWorldEventCb?.(ev);
        break;
      }

      case 'PING': {
        if (env.senderId === this.localPlayerId) return;
        this.sendEnvelope({
          kind: 'PONG',
          partyCode: this.partyCode,
          targetId: env.senderId,
          sentAt: env.sentAt,
        });
        break;
      }

      case 'PONG': {
        if (env.targetId !== this.localPlayerId) return;
        const rtt = Math.max(1, Math.round(performance.now() - env.sentAt));
        this.pingMs = Math.round(this.pingMs * 0.6 + rtt * 0.4);
        this.pingHistory.push(this.pingMs);
        if (this.pingHistory.length > 16) {
          this.pingHistory.shift();
        }
        const me = this.players.get(this.localPlayerId);
        if (me) {
          me.pingMs = this.pingMs;
        }
        break;
      }
    }
  }

  private pruneStaleRemotePlayers(): void {
    const now = Date.now();
    let changed = false;
    for (const [id, p] of this.players.entries()) {
      if (id === this.localPlayerId) continue;
      if (now - p.lastUpdated > 12000) {
        this.players.delete(id);
        this.peerHighestSeq.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notifyRoster();
    }
  }

  private notifyRoster(): void {
    this.onRosterChangeCb?.(this.getPlayers());
  }

  public dispose(): void {
    this.destroyed = true;
    this.sendEnvelope({
      kind: 'LEAVE_ROOM',
      partyCode: this.partyCode,
      playerId: this.localPlayerId,
    });
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close error
      }
      this.ws = null;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {
        // Ignore close error
      }
      this.bc = null;
    }
  }
}
