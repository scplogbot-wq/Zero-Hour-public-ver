import React, { useMemo } from 'react';
import {
  WEAPONS,
  WeaponId,
  PrimaryWeaponId,
  SecondaryWeaponId,
  PRIMARY_WEAPON_IDS,
  SECONDARY_WEAPON_IDS,
  AttachmentId,
  ATTACHMENTS,
  ALL_ATTACHMENT_IDS,
  isAttachmentCompatible,
  computeEffectiveWeaponStats,
  getWeaponStatDelta,
  MapLayoutVariant,
  ALL_MAP_LAYOUT_VARIANTS,
  MAP_LAYOUT_META,
  generateCQBMap,
} from '../game/tacticalLogic';
import {
  TacticalGameMode,
  OperatorTeam,
  sanitizePartyCode,
} from '../game/multiplayerNet';
import {
  HUDState,
  ArmoryDeckTab,
  InspectTurntableState,
  TacticalGameController,
} from '../engine/TacticalEngine';

interface TacticalLobbyProps {
  hud: HUDState;
  selectedPrimary: PrimaryWeaponId;
  selectedSecondary: SecondaryWeaponId;
  inspectedWeapon: WeaponId;
  selectedLayout: MapLayoutVariant | 'random';
  armoryTab: ArmoryDeckTab;
  partyCodeInput: string;
  callsignInput: string;
  copiedPartyCode: boolean;
  weaponAttachments: Record<WeaponId, AttachmentId[]>;
  weaponPreviewMountRef: React.RefObject<HTMLDivElement | null>;
  inspectStateRef: React.MutableRefObject<InspectTurntableState>;
  gameCtrlRef: React.RefObject<TacticalGameController | null>;
  onSelectPrimary: (id: PrimaryWeaponId) => void;
  onSelectSecondary: (id: SecondaryWeaponId) => void;
  onSelectInspectedWeapon: (id: WeaponId) => void;
  onToggleAttachment: (weaponId: WeaponId, attId: AttachmentId) => void;
  onSelectLayout: (layout: MapLayoutVariant | 'random') => void;
  onSetArmoryTab: (tab: ArmoryDeckTab) => void;
  onSetPartyCodeInput: (val: string) => void;
  onSetCallsignInput: (val: string) => void;
  onCopyPartyCode: () => void;
  onDeployBreach: (seedOverride?: number) => void;
}

export const TacticalLobby: React.FC<TacticalLobbyProps> = ({
  hud,
  selectedPrimary,
  selectedSecondary,
  inspectedWeapon,
  selectedLayout,
  armoryTab,
  partyCodeInput,
  callsignInput,
  copiedPartyCode,
  weaponAttachments,
  weaponPreviewMountRef,
  inspectStateRef,
  gameCtrlRef,
  onSelectPrimary,
  onSelectSecondary,
  onSelectInspectedWeapon,
  onToggleAttachment,
  onSelectLayout,
  onSetArmoryTab,
  onSetPartyCodeInput,
  onSetCallsignInput,
  onCopyPartyCode,
  onDeployBreach,
}) => {
  const inspectedSpec = WEAPONS[inspectedWeapon];
  const inspectedAttachments = weaponAttachments[inspectedWeapon] || [];
  const inspectedEffective = computeEffectiveWeaponStats(
    inspectedWeapon,
    inspectedAttachments
  );
  const inspectedDelta = getWeaponStatDelta(inspectedWeapon, inspectedAttachments);
  const inspectedBars = inspectedDelta.modified;

  // Generate deterministic 2D architectural schematic preview for the selected layout
  const blueprintPreviewMap = useMemo(() => {
    const variantToPreview: MapLayoutVariant =
      selectedLayout === 'random' ? hud.mapLayoutVariant : selectedLayout;
    return generateCQBMap(hud.mapSeed || 2026, variantToPreview);
  }, [selectedLayout, hud.mapLayoutVariant, hud.mapSeed]);

  // Build SVG sparkline path for RTT ping history
  const pingSparklinePoints = useMemo(() => {
    const hist = hud.pingHistory?.length ? hud.pingHistory : [14, 15, 13, 14, 14, 15];
    const maxP = Math.max(40, ...hist);
    const minP = Math.min(2, ...hist);
    const range = Math.max(10, maxP - minP);
    return hist
      .map((val, idx) => {
        const x = (idx / Math.max(1, hist.length - 1)) * 56;
        const y = 16 - ((val - minP) / range) * 13;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [hud.pingHistory]);

  return (
    <div
      data-testid="loadout-menu-overlay"
      className="absolute inset-0 z-20 flex flex-col justify-between p-2.5 md:p-4 bg-gradient-to-b from-slate-950/92 via-slate-950/78 to-slate-950/95 overflow-y-auto"
    >
      {/* Top Command Header Bar: Title + Multiplayer Squad & 6-Digit Party Code Lobby */}
      <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-800/90">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/15 border border-amber-400/50 text-amber-300 text-[10px] font-mono uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-amber-400 animate-pulse" />
              TIER-1 TACTICAL COMMAND · {hud.gameMode.replace('_', ' ')}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white uppercase">
              ZERO HOUR <span className="text-amber-400">// CQB BREACH</span>
            </h1>
          </div>

          {/* 3-Tab Armory Deck Switcher */}
          <div className="flex items-center gap-1 bg-slate-950/95 border border-slate-800 p-1">
            {(
              [
                { id: 'weapons', label: '01 // GUNSMITH & LOADOUT' },
                { id: 'blueprint', label: '02 // FACILITY BLUEPRINT' },
                {
                  id: 'squad',
                  label: `03 // SQUAD & COMMS (${hud.squadRoster.length})`,
                },
              ] as Array<{ id: ArmoryDeckTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`armory-tab-${tab.id}`}
                onClick={() => onSetArmoryTab(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  armoryTab === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Multiplayer Squad & Party Code Command Bar */}
        <div
          data-testid="multiplayer-lobby-bar"
          className="tactical-panel bg-slate-950/92 border border-slate-800/95 p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-xl"
        >
          {/* Operator Callsign Input */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              CALLSIGN
            </span>
            <input
              type="text"
              data-testid="lobby-callsign-input"
              value={callsignInput}
              maxLength={14}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                onSetCallsignInput(v);
                gameCtrlRef.current?.setCallsign(v);
              }}
              className="w-32 px-2.5 py-1 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-amber-300 uppercase tracking-wider focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Mode Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-900/95 p-1 border border-slate-800">
            {(
              [
                { id: 'SOLO_BREACH', label: 'SOLO BREACH' },
                { id: 'COOP_SQUAD', label: 'CO-OP SQUAD' },
                { id: 'PVP_VERSUS', label: 'PVP VERSUS' },
              ] as Array<{ id: TacticalGameMode; label: string }>
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`mode-btn-${m.id}`}
                onClick={() => gameCtrlRef.current?.setGameMode(m.id)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  hud.gameMode === m.id
                    ? 'bg-sky-500/25 border border-sky-400 text-sky-200'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 6-Digit Party Code Display + Copy + Join Input */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/40 px-2.5 py-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                PARTY CODE:
              </span>
              <span
                data-testid="active-party-code"
                className="text-sm font-mono font-black tracking-widest text-amber-400"
              >
                {hud.partyCode}
              </span>
              <button
                type="button"
                data-testid="copy-party-code-btn"
                onClick={onCopyPartyCode}
                className="ml-1 px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-[9px] font-mono font-bold text-amber-200 uppercase cursor-pointer"
              >
                {copiedPartyCode ? 'COPIED' : 'COPY'}
              </button>
              <button
                type="button"
                data-testid="new-party-code-btn"
                onClick={() => {
                  const code = gameCtrlRef.current?.generateNewPartyCode();
                  if (code) onSetPartyCodeInput(code);
                }}
                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[9px] font-mono text-slate-300 uppercase cursor-pointer"
              >
                NEW
              </button>
            </div>

            <div className="flex items-center gap-1">
              <input
                type="text"
                data-testid="party-code-input"
                value={partyCodeInput}
                maxLength={6}
                placeholder="6-DIGIT"
                onChange={(e) => onSetPartyCodeInput(sanitizePartyCode(e.target.value))}
                className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-center text-sky-300 tracking-widest uppercase focus:outline-none focus:border-sky-400"
              />
              <button
                type="button"
                data-testid="join-party-btn"
                onClick={() => {
                  if (partyCodeInput.length >= 4) {
                    const joined = gameCtrlRef.current?.joinPartyCode(partyCodeInput);
                    if (joined) onSetPartyCodeInput(joined);
                  }
                }}
                className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/60 text-[10px] font-mono font-bold text-sky-200 uppercase tracking-wider cursor-pointer"
              >
                JOIN PARTY
              </button>
            </div>
          </div>

          {/* Live Ping Sparkline + Connected Squad Roster Pills */}
          <div className="flex items-center gap-3">
            <div
              data-testid="lobby-ping-badge"
              className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-300"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 animate-ping" />
              <span>
                {hud.transportLabel} · {hud.pingMs}ms
              </span>
              <svg width="56" height="16" className="overflow-visible">
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="1.5"
                  points={pingSparklinePoints}
                />
              </svg>
            </div>
            <div
              data-testid="lobby-squad-roster"
              className="flex items-center gap-1.5 flex-wrap"
            >
              {hud.squadRoster.slice(0, 4).map((op) => (
                <div
                  key={op.id}
                  className={`px-2 py-0.5 border text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 ${
                    op.team === 'DEFENDERS'
                      ? 'bg-fuchsia-950/50 border-fuchsia-500/50 text-fuchsia-200'
                      : 'bg-sky-950/50 border-sky-500/50 text-sky-200'
                  }`}
                >
                  <span>
                    {op.callsign}
                    {op.isHost ? ' ★' : ''}
                  </span>
                  <span className="text-[9px] text-amber-300/90 font-normal">
                    [{WEAPONS[op.activeWeapon]?.shortName || 'HK416'}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tactical Loadout & Inspect Deck */}
      <div className="w-full max-w-[1440px] mx-auto my-auto py-2">
        {armoryTab === 'squad' ? (
          <div
            data-testid="squad-server-deck"
            className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-950/92 border border-slate-800 p-4"
          >
            <div className="lg:col-span-5 flex flex-col justify-between gap-4 border-r border-slate-800/80 pr-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-1">
                  PARTY ROOM TELEMETRY & TEAM ASSIGNMENT
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  Share your 6-digit Party Code (
                  <span className="text-amber-300 font-mono font-bold">
                    #{hud.partyCode}
                  </span>
                  ) with another browser tab or remote operator to synchronize procedural
                  map seeds, 12-plank barricade breaches, shootable ceiling lights, and
                  live operator poses at 60Hz.
                </p>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    data-testid="team-btn-ATTACKERS"
                    onClick={() => gameCtrlRef.current?.setOperatorTeam('ATTACKERS')}
                    className={`p-2.5 border text-left transition-all cursor-pointer ${
                      hud.team === 'ATTACKERS'
                        ? 'bg-sky-950/70 border-sky-400 text-sky-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase">
                      TEAM // ATTACKERS
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Breach Entry Vector [0,0] · Dynamic Entry
                    </div>
                  </button>
                  <button
                    type="button"
                    data-testid="team-btn-DEFENDERS"
                    onClick={() => gameCtrlRef.current?.setOperatorTeam('DEFENDERS')}
                    className={`p-2.5 border text-left transition-all cursor-pointer ${
                      hud.team === 'DEFENDERS'
                        ? 'bg-fuchsia-950/70 border-fuchsia-400 text-fuchsia-200'
                        : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase">
                      TEAM // DEFENDERS
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Command Core Spawn · Interior Hold (PvP)
                    </div>
                  </button>
                </div>

                {/* Network Transport Diagnostics Box */}
                <div className="p-2.5 bg-slate-900/90 border border-slate-800 text-[10px] font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ACTIVE TRANSPORT:</span>
                    <span className="text-emerald-300 font-bold">{hud.transportLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SNAPSHOT JITTER BUFFER:</span>
                    <span className="text-sky-300">100ms HERMITE + SHORTEST-ARC YAW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PVP SPAWN PROTECTION:</span>
                    <span className="text-amber-300">2.0s BALLISTIC SHIELD</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDeployBreach()}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-lg uppercase tracking-wider cursor-pointer"
              >
                DEPLOY SQUAD INTO #{hud.partyCode} ({hud.mapLayoutName})
              </button>
            </div>

            <div className="lg:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold mb-2">
                CONNECTED OPERATORS IN ROOM #{hud.partyCode} ({hud.squadRoster.length}/4)
              </div>
              <div className="space-y-2">
                {hud.squadRoster.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                          op.team === 'DEFENDERS'
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        }`}
                      >
                        {op.team}
                      </span>
                      <div>
                        <div className="text-sm font-mono font-bold text-white">
                          {op.callsign}{' '}
                          {op.isHost && (
                            <span className="text-amber-400 text-xs">[ROOM HOST]</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          WEAPON: {WEAPONS[op.activeWeapon]?.name || op.activeWeapon} · HP:{' '}
                          {op.hp}/{op.maxHp}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-300">
                      <div>
                        {op.kills} K / {op.deaths} D
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {op.pingMs}ms RTT · READY
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : armoryTab === 'blueprint' ? (
          /* TAB 2: Interactive 2D Architectural Schematic & Facility Blueprint */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-950/92 border border-slate-800 p-4">
            <div className="lg:col-span-5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    SELECT FACILITY FLOORPLAN TOPOLOGY
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    SEED #{blueprintPreviewMap.seed}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    data-testid="layout-btn-random"
                    onClick={() => onSelectLayout('random')}
                    className={`p-2.5 border text-left transition-all cursor-pointer ${
                      selectedLayout === 'random'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold uppercase">
                      RANDOM PROCEDURAL
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Rotates all 6 non-box CQB compounds
                    </div>
                  </button>
                  {ALL_MAP_LAYOUT_VARIANTS.map((vId) => {
                    const meta = MAP_LAYOUT_META[vId];
                    const isPicked = selectedLayout === vId;
                    return (
                      <button
                        key={vId}
                        type="button"
                        data-testid={`layout-btn-${vId}`}
                        onClick={() => onSelectLayout(vId)}
                        className={`p-2.5 border text-left transition-all cursor-pointer ${
                          isPicked
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-mono font-bold uppercase">
                          {meta.shortName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {meta.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Tactical Recon Summary */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="text-[10px] text-sky-400 uppercase tracking-widest font-bold">
                    ARCHITECTURAL RECONNAISSANCE // {blueprintPreviewMap.layoutName}
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">ACTIVE SECTORS:</span>
                    <span className="text-white font-bold">
                      {blueprintPreviewMap.rooms.length} CONNECTED CHAMBERS
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">12-PLANK BARRICADES:</span>
                    <span className="text-amber-400 font-bold">
                      {blueprintPreviewMap.doorways.length} BREACH VECTORS
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">1-HP CEILING LIGHTS:</span>
                    <span className="text-sky-300 font-bold">
                      {blueprintPreviewMap.lightFixtures.length} SHOOTABLE FIXTURES
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">HOSTILE GARRISON:</span>
                    <span className="text-rose-400 font-bold">
                      {blueprintPreviewMap.enemySpawns.length} TANGOS +{' '}
                      {blueprintPreviewMap.lockerAmbushes.length} LOCKER AMBUSHES
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onDeployBreach()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-base uppercase tracking-wider cursor-pointer"
                >
                  DEPLOY TO {blueprintPreviewMap.layoutName}
                </button>
                <button
                  type="button"
                  onClick={() => onSetArmoryTab('weapons')}
                  className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 uppercase cursor-pointer"
                >
                  BACK TO GUNSMITH
                </button>
              </div>
            </div>

            {/* 2D SVG Architectural Blueprint Schematic */}
            <div className="lg:col-span-7 bg-slate-900/95 border border-slate-800 p-3 flex flex-col justify-between relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                <div className="text-xs font-mono font-bold text-sky-300 uppercase tracking-wider">
                  2D ARCHITECTURAL SCHEMATIC // {blueprintPreviewMap.layoutName}
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-sky-300">
                    <span className="w-2 h-2 bg-sky-400 inline-block" /> ENTRY
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 bg-amber-400 inline-block" /> BARRICADE
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <span className="w-2 h-2 bg-rose-500 inline-block" /> HOSTILE
                  </span>
                  <span className="flex items-center gap-1 text-fuchsia-300">
                    <span className="w-2 h-2 bg-fuchsia-400 inline-block" /> AMBUSH LOCKER
                  </span>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[300px]">
                <svg
                  viewBox={`-2 -2 ${blueprintPreviewMap.totalWidth + 4} ${
                    blueprintPreviewMap.totalDepth + 4
                  }`}
                  className="w-full h-[310px] max-w-[540px]"
                >
                  {/* Room Footprints */}
                  {blueprintPreviewMap.rooms.map((r) => (
                    <g key={`room-${r.gx}-${r.gz}`}>
                      <rect
                        x={r.minX}
                        y={r.minZ}
                        width={r.width}
                        height={r.depth}
                        fill={
                          r.gx === 0 && r.gz === 0
                            ? 'rgba(14, 116, 144, 0.28)'
                            : 'rgba(15, 23, 42, 0.92)'
                        }
                        stroke="rgba(56, 189, 248, 0.35)"
                        strokeWidth={0.18}
                      />
                      <text
                        x={r.centerX}
                        y={r.centerZ - 0.5}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="0.82"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {r.name.split('·')[0]}
                      </text>
                      <text
                        x={r.centerX}
                        y={r.centerZ + 0.65}
                        textAnchor="middle"
                        fill="#e2e8f0"
                        fontSize="0.72"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {r.name.split('·')[1] || r.theme.toUpperCase()}
                      </text>
                    </g>
                  ))}

                  {/* Wall Segments */}
                  {blueprintPreviewMap.wallSegments
                    .filter((w) => w.kind !== 'lintel')
                    .map((w, idx) => (
                      <rect
                        key={`wall-${idx}`}
                        x={w.minX}
                        y={w.minZ}
                        width={Math.max(0.25, w.maxX - w.minX)}
                        height={Math.max(0.25, w.maxZ - w.minZ)}
                        fill={w.materialTag === 'concrete' ? '#cbd5e1' : '#64748b'}
                      />
                    ))}

                  {/* Barricaded Doorways */}
                  {blueprintPreviewMap.doorways.map((d) => (
                    <rect
                      key={d.id}
                      x={d.x - (d.orientation === 'NS' ? d.width * 0.5 : 0.25)}
                      y={d.z - (d.orientation === 'EW' ? d.width * 0.5 : 0.25)}
                      width={d.orientation === 'NS' ? d.width : 0.5}
                      height={d.orientation === 'EW' ? d.width : 0.5}
                      fill="#f59e0b"
                    />
                  ))}

                  {/* Ambush Lockers */}
                  {blueprintPreviewMap.lockerAmbushes.map((l) => (
                    <rect
                      key={l.id}
                      x={l.x - 0.45}
                      y={l.z - 0.45}
                      width={0.9}
                      height={0.9}
                      fill="#e879f9"
                    />
                  ))}

                  {/* Hostile Spawns */}
                  {blueprintPreviewMap.enemySpawns.map((sp) => (
                    <circle
                      key={sp.id}
                      cx={sp.x}
                      cy={sp.z}
                      r={0.48}
                      fill="#ef4444"
                      stroke="#fecaca"
                      strokeWidth={0.12}
                    />
                  ))}

                  {/* Player Breach Entry Point */}
                  <circle
                    cx={blueprintPreviewMap.playerSpawn.x}
                    cy={blueprintPreviewMap.playerSpawn.z}
                    r={0.62}
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth={0.18}
                  />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 1: GUNSMITH & LOADOUT (Default 12-Column Split Deck) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* LEFT 5 COLUMNS: Slot 1 Primary + Slot 2 Secondary + Slot 3 Melee + Map Blueprint Selector + Deploy CTA */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/92 border border-slate-800/95 p-3.5 shadow-2xl">
              <div className="space-y-3">
                {/* Slot 1: Primary Weapon */}
                <div data-testid="primary-weapon-slot">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                      SLOT 1 // PRIMARY WEAPON
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {WEAPONS[selectedPrimary].caliber}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PRIMARY_WEAPON_IDS.map((wId) => {
                      const spec = WEAPONS[wId];
                      const isSelected = selectedPrimary === wId;
                      const isInspected = inspectedWeapon === wId;
                      return (
                        <button
                          key={wId}
                          type="button"
                          data-testid={`loadout-primary-${wId}`}
                          onClick={() => onSelectPrimary(wId)}
                          className={`text-left p-2 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/18 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                          } ${isInspected ? 'ring-1 ring-amber-300/60' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs tracking-wide text-white">
                              {spec.shortName}
                            </span>
                            {isSelected && (
                              <span className="text-[8px] font-mono px-1 py-0.2 bg-amber-400 text-slate-950 font-extrabold">
                                EQP
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                            {spec.damage} DMG
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slot 2: Secondary Sidearm & Slot 3: Combat Knife */}
                <div className="grid grid-cols-12 gap-2">
                  <div data-testid="secondary-weapon-slot" className="col-span-9">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                        SLOT 2 // SIDEARM
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {WEAPONS[selectedSecondary].caliber}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SECONDARY_WEAPON_IDS.map((wId) => {
                        const spec = WEAPONS[wId];
                        const isSelected = selectedSecondary === wId;
                        const isInspected = inspectedWeapon === wId;
                        return (
                          <button
                            key={wId}
                            type="button"
                            data-testid={`loadout-secondary-${wId}`}
                            onClick={() => onSelectSecondary(wId)}
                            className={`text-left p-2 border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/18 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                            } ${isInspected ? 'ring-1 ring-sky-300/60' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs tracking-wide text-white">
                                {spec.shortName}
                              </span>
                              {isSelected && (
                                <span className="text-[8px] font-mono px-1 py-0.2 bg-sky-400 text-slate-950 font-extrabold">
                                  EQP
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                              {spec.damage} DMG
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slot 3: Dedicated Melee */}
                  <div className="col-span-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        SLOT 3 // MELEE
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectInspectedWeapon('combat_knife')}
                      className={`w-full text-left p-2 border transition-all cursor-pointer ${
                        inspectedWeapon === 'combat_knife'
                          ? 'bg-emerald-500/20 border-emerald-400 text-white'
                          : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs text-emerald-300">
                        KM-2000
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                        [3 / V] SLASH
                      </div>
                    </button>
                  </div>
                </div>

                {/* CQB Map Footprint Blueprint Selector */}
                <div
                  data-testid="map-layout-selector"
                  className="pt-2 border-t border-slate-800/90"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                      FACILITY BLUEPRINT TOPOLOGY (NON-BOX CQB)
                    </span>
                    <span
                      data-testid="selected-layout-label"
                      className="text-[10px] font-mono text-slate-300 font-bold"
                    >
                      {selectedLayout === 'random'
                        ? 'RANDOM ROTATION'
                        : MAP_LAYOUT_META[selectedLayout].name}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    <button
                      type="button"
                      data-testid="layout-btn-random"
                      onClick={() => onSelectLayout('random')}
                      className={`px-1.5 py-1.5 border text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        selectedLayout === 'random'
                          ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                          : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      RANDOM
                    </button>
                    {ALL_MAP_LAYOUT_VARIANTS.map((vId) => {
                      const meta = MAP_LAYOUT_META[vId];
                      const isPicked = selectedLayout === vId;
                      return (
                        <button
                          key={vId}
                          type="button"
                          data-testid={`layout-btn-${vId}`}
                          onClick={() => onSelectLayout(vId)}
                          className={`px-1.5 py-1.5 border text-[9px] font-mono font-bold uppercase transition-all cursor-pointer truncate ${
                            isPicked
                              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                          title={meta.description}
                        >
                          {meta.shortName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-3 border-t border-slate-800/90 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  data-start="true"
                  data-testid="deploy-loadout-btn"
                  onClick={() => onDeployBreach()}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-base uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(245,158,11,0.35)] cursor-pointer"
                >
                  DEPLOY &amp; INITIATE BREACH [ENTER]
                </button>
                <button
                  type="button"
                  data-testid="deploy-random-seed-btn"
                  onClick={() =>
                    onDeployBreach(Math.floor(1000 + Math.random() * 9000))
                  }
                  className="py-3 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                >
                  NEW SEED
                </button>
              </div>
            </div>

            {/* RIGHT 7 COLUMNS: 3D Weapon Turntable Viewport + Attachment Nodes + Delta Stat Bars */}
            <div className="lg:col-span-7 flex flex-col justify-between bg-slate-950/92 border border-slate-800/95 p-3.5 shadow-2xl">
              {/* Top Header of Weapon Inspect Panel */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/90">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    3D WEAPON TURNTABLE &amp; BALLISTIC TELEMETRY // DRAG TO ROTATE 360°
                  </div>
                  <h2
                    data-testid="inspected-weapon-name"
                    className="font-display text-xl md:text-2xl font-black text-white uppercase tracking-wide"
                  >
                    {inspectedSpec.name}{' '}
                    <span className="text-slate-400 text-sm font-mono font-normal">
                      ({inspectedSpec.caliber})
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      gameCtrlRef.current?.triggerLobbyTurntableAction('fire')
                    }
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-amber-500/60 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 cursor-pointer"
                  >
                    TEST FIRE
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      gameCtrlRef.current?.triggerLobbyTurntableAction('spin')
                    }
                    className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-sky-500/60 bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 cursor-pointer"
                  >
                    SPIN IN TURNTABLE
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectInspectedWeapon(selectedPrimary)}
                    className={`px-2 py-1 text-[10px] font-mono uppercase border cursor-pointer ${
                      inspectedWeapon === selectedPrimary
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    PRIMARY
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectInspectedWeapon(selectedSecondary)}
                    className={`px-2 py-1 text-[10px] font-mono uppercase border cursor-pointer ${
                      inspectedWeapon === selectedSecondary
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    SIDEARM
                  </button>
                </div>
              </div>

              {/* Interactive 3D Weapon Preview Viewport (Rendered via WebGL Scissor Pass) */}
              <div
                ref={weaponPreviewMountRef}
                data-testid="weapon-preview-stage"
                onMouseDown={(e) => {
                  inspectStateRef.current.isDragging = true;
                  inspectStateRef.current.lastX = e.clientX;
                  inspectStateRef.current.lastY = e.clientY;
                }}
                onMouseMove={(e) => {
                  if (!inspectStateRef.current.isDragging) return;
                  const dx = e.clientX - inspectStateRef.current.lastX;
                  const dy = e.clientY - inspectStateRef.current.lastY;
                  inspectStateRef.current.lastX = e.clientX;
                  inspectStateRef.current.lastY = e.clientY;
                  inspectStateRef.current.yaw += dx * 0.012;
                  inspectStateRef.current.pitch = Math.max(
                    -0.55,
                    Math.min(0.55, inspectStateRef.current.pitch + dy * 0.008)
                  );
                }}
                onMouseUp={() => {
                  inspectStateRef.current.isDragging = false;
                }}
                onMouseLeave={() => {
                  inspectStateRef.current.isDragging = false;
                }}
                className="relative w-full h-36 md:h-44 my-2 border border-slate-800/95 bg-transparent cursor-grab active:cursor-grabbing select-none overflow-hidden"
              >
                {/* Diegetic attachment node callout overlays */}
                <div className="absolute top-2 left-2.5 text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-2">
                  <span>MAG: {inspectedSpec.magSize} RDS</span>
                  <span>·</span>
                  <span>RPM: {inspectedSpec.rpm}</span>
                  <span>·</span>
                  <span>RELOAD: {inspectedSpec.reloadTimeSec}S</span>
                </div>
                <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5 pointer-events-none">
                  <span className="px-1.5 py-0.5 bg-slate-950/85 border border-slate-700 text-[9px] font-mono text-slate-300">
                    MUZZLE:{' '}
                    {inspectedEffective.isSuppressed ? 'SUPPRESSED' : 'STD COMP'}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-950/85 border border-slate-700 text-[9px] font-mono text-slate-300">
                    OPTIC:{' '}
                    {inspectedEffective.hasHolographic ? 'EOTECH HOLO' : 'IRON SIGHT'}
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-950/85 border border-slate-700 text-[9px] font-mono text-slate-300">
                    RAIL:{' '}
                    {inspectedEffective.hasLaser ? 'PEQ-15 LASER' : 'BARE RAIL'}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2.5 text-[10px] font-mono text-amber-400/90 pointer-events-none">
                  {inspectedSpec.designation}
                </div>
              </div>

              {/* Modular Weapon Attachments Customization Selector */}
              <div
                data-testid="weapon-attachments-panel"
                className="mb-2.5 p-2.5 bg-slate-900/90 border border-slate-800"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                    GUNSMITH MODULAR ATTACHMENTS (MUZZLE / OPTIC / UNDERBARREL)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {inspectedAttachments.length} EQUIPPED
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_ATTACHMENT_IDS.map((attId) => {
                    const att = ATTACHMENTS[attId];
                    const compatible = isAttachmentCompatible(inspectedWeapon, attId);
                    const equipped = inspectedAttachments.includes(attId);
                    return (
                      <button
                        key={attId}
                        type="button"
                        disabled={!compatible}
                        data-testid={`attachment-btn-${attId}`}
                        onClick={() => onToggleAttachment(inspectedWeapon, attId)}
                        className={`p-2 border text-left transition-all ${
                          !compatible
                            ? 'bg-slate-950/50 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
                            : equipped
                            ? 'bg-emerald-500/20 border-emerald-400 text-white cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[11px] uppercase">
                            {att.shortName}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-1 py-0.5 uppercase font-bold ${
                              !compatible
                                ? 'bg-slate-900 text-slate-600'
                                : equipped
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {!compatible ? 'N/A' : equipped ? 'ON' : 'OFF'}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 mt-0.5 truncate">
                          {att.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 Comparative Stat Progress Bars with Base vs Modified Delta */}
              <div
                data-testid="weapon-stat-bars"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800/90"
              >
                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase">DAMAGE</span>
                    <span
                      data-testid="stat-damage-val"
                      className="text-amber-400 font-bold"
                    >
                      {inspectedBars.damage}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 overflow-hidden">
                    <div
                      data-testid="stat-bar-damage"
                      className="h-full bg-amber-400 transition-all duration-300"
                      style={{ width: `${inspectedBars.damage}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase">FIRE RATE</span>
                    <span
                      data-testid="stat-firerate-val"
                      className="text-sky-400 font-bold"
                    >
                      {inspectedBars.fireRate}/100
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 overflow-hidden">
                    <div
                      data-testid="stat-bar-firerate"
                      className="h-full bg-sky-400 transition-all duration-300"
                      style={{ width: `${inspectedBars.fireRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase">RECOIL</span>
                    <span
                      data-testid="stat-recoil-val"
                      className="text-rose-400 font-bold"
                    >
                      {inspectedBars.recoil}/100
                      {inspectedDelta.delta.recoil !== 0 && (
                        <span
                          className={
                            inspectedDelta.delta.recoil < 0
                              ? 'text-emerald-400 ml-1'
                              : 'text-rose-400 ml-1'
                          }
                        >
                          ({inspectedDelta.delta.recoil > 0 ? '+' : ''}
                          {inspectedDelta.delta.recoil})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 overflow-hidden">
                    <div
                      data-testid="stat-bar-recoil"
                      className="h-full bg-rose-500 transition-all duration-300"
                      style={{ width: `${inspectedBars.recoil}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-slate-400 uppercase">MOBILITY</span>
                    <span
                      data-testid="stat-mobility-val"
                      className="text-emerald-400 font-bold"
                    >
                      {inspectedBars.mobility}/100
                      {inspectedDelta.delta.mobility !== 0 && (
                        <span
                          className={
                            inspectedDelta.delta.mobility > 0
                              ? 'text-emerald-400 ml-1'
                              : 'text-rose-400 ml-1'
                          }
                        >
                          ({inspectedDelta.delta.mobility > 0 ? '+' : ''}
                          {inspectedDelta.delta.mobility})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 overflow-hidden">
                    <div
                      data-testid="stat-bar-mobility"
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{ width: `${inspectedBars.mobility}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Effective Ballistic Modifiers Summary Line */}
              <div className="mt-2 pt-1.5 border-t border-slate-800/70 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400">
                <span data-testid="stat-ads-zoom">
                  ADS FOV:{' '}
                  <strong className="text-sky-300">{inspectedEffective.adsFov}°</strong>
                </span>
                <span data-testid="stat-hip-spread">
                  HIP SPREAD:{' '}
                  <strong className="text-emerald-300">
                    {inspectedEffective.hipAccuracyBonusPct > 0
                      ? `-${inspectedEffective.hipAccuracyBonusPct}% (LASER)`
                      : 'STANDARD'}
                  </strong>
                </span>
                <span data-testid="stat-signature">
                  SIGNATURE:{' '}
                  <strong className="text-amber-300">
                    {inspectedEffective.isSuppressed
                      ? 'SUBSONIC SUPPRESSED'
                      : 'UNSUPPRESSED'}
                  </strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Keybind Strip */}
      <div className="w-full max-w-[1440px] mx-auto pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
        <span>[WASD] MOVE · [SHIFT] SPRINT · [C] CROUCH · [SPACE] JUMP</span>
        <span>[Q / E] PEEK LEAN · [L] LEAN MODE · [V / 3] KNIFE SLASH</span>
        <span>[LMB] FIRE · [RMB] ADS OPTIC · [I / J] SPIN FLOURISH</span>
        <span>[T] FLASHLIGHT · [G] FRAG · [H] MEDBAG · [TAB] SCOREBOARD</span>
      </div>
    </div>
  );
};
