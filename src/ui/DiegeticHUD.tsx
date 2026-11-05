import React from 'react';
import { WEAPONS } from '../game/tacticalLogic';
import {
  HUDState,
  HUDDomRefs,
  TacticalGameController,
} from '../engine/TacticalEngine';

interface DiegeticHUDProps {
  hud: HUDState;
  domRefs: HUDDomRefs;
  gameCtrlRef: React.RefObject<TacticalGameController | null>;
}

const COMPASS_TICKS = [
  { deg: 0, label: 'N 000', major: true },
  { deg: 45, label: 'NE 045', major: false },
  { deg: 90, label: 'E 090', major: true },
  { deg: 135, label: 'SE 135', major: false },
  { deg: 180, label: 'S 180', major: true },
  { deg: 225, label: 'SW 225', major: false },
  { deg: 270, label: 'W 270', major: true },
  { deg: 315, label: 'NW 315', major: false },
];

export const DiegeticHUD: React.FC<DiegeticHUDProps> = ({
  hud,
  domRefs,
  gameCtrlRef,
}) => {
  const activeSpec = WEAPONS[hud.activeWeapon];
  const isCriticalHp = hud.hp <= 35;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
      {/* Low Health Red Pulse & Instant Hit Damage Vignette */}
      <div
        ref={domRefs.damageVignetteRef}
        className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
          isCriticalHp ? 'opacity-55' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(circle, rgba(0,0,0,0) 48%, rgba(220,38,38,0.52) 100%)',
        }}
      />

      {/* TOP BAR: Radar Minimap (Left), 360° Scrolling Compass Tape (Center), Telemetry + Killfeed (Right) */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Tactical Floorplan Radar Minimap & Objective Counter */}
        <div className="flex items-start gap-2.5 bg-slate-950/90 border border-slate-800/95 p-2.5 shadow-xl tactical-panel">
          <div className="relative">
            <canvas
              ref={domRefs.minimapCanvasRef}
              width={118}
              height={118}
              className="border border-slate-800 bg-slate-950 block"
            />
            <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-slate-400">
              <span className="text-sky-400">■ LOCKER</span>
              <span className="text-amber-400">■ DOOR</span>
              <span className="text-rose-400">● HOSTILE</span>
            </div>
          </div>
          <div className="space-y-1 pr-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
              {hud.currentSectorName}
            </div>
            <div className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider">
              <span data-testid="hud-map-layout-name">{hud.mapLayoutName}</span> ·{' '}
              {hud.currentRoomShape}
            </div>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="hud-enemies-remaining"
                className="font-mono text-2xl font-extrabold text-white"
              >
                {hud.enemiesRemaining}
              </span>
              <span className="text-xs font-mono text-slate-400">
                / {hud.enemiesTotal} HOSTILES
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              SEED #{hud.mapSeed} · TIME {hud.elapsedSec}s
            </div>
            <div className="text-[10px] font-mono text-amber-400/90">
              BARRICADES: {hud.barricadesStanding}/{hud.barricadesTotal} · LIGHTS:{' '}
              {hud.lightsIntactCount}/{hud.lightsTotalCount}
            </div>
            <div className="text-[10px] font-mono text-sky-400/90">
              LOCKERS: {hud.lockersTriggered}/{hud.lockersTotal} ·{' '}
              {hud.currentRoomLit ? 'ROOM LIT' : 'DARKENED (-80% AI)'}
            </div>
            {hud.spawnShieldActive && (
              <div className="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.5 uppercase">
                SPAWN SHIELD ACTIVE (2.0S)
              </div>
            )}
          </div>
        </div>

        {/* Top-Center: Scrolling 360° Precision Tactical Compass Tape + Status Callout */}
        <div className="flex flex-col items-center gap-1.5">
          <div
            data-testid="hud-compass-tape"
            className="bg-slate-950/92 border border-slate-800/95 px-4 py-1.5 shadow-lg flex flex-col items-center min-w-[290px] overflow-hidden relative"
          >
            {/* Center lubber line indicator */}
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400 mb-0.5" />

            <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest text-slate-400">
              <span>{((hud.compassBearingDeg + 330) % 360).toString().padStart(3, '0')}°</span>
              <span className="text-slate-600">|</span>
              <span>{((hud.compassBearingDeg + 345) % 360).toString().padStart(3, '0')}°</span>
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/60 text-amber-300 font-bold text-xs">
                {hud.compassBearingDeg >= 337 || hud.compassBearingDeg < 23
                  ? 'N'
                  : hud.compassBearingDeg < 68
                  ? 'NE'
                  : hud.compassBearingDeg < 113
                  ? 'E'
                  : hud.compassBearingDeg < 158
                  ? 'SE'
                  : hud.compassBearingDeg < 203
                  ? 'S'
                  : hud.compassBearingDeg < 248
                  ? 'SW'
                  : hud.compassBearingDeg < 293
                  ? 'W'
                  : 'NW'}{' '}
                <span ref={domRefs.compassBearingLabelRef}>
                  {hud.compassBearingDeg.toString().padStart(3, '0')}
                </span>
                °
              </span>
              <span>{((hud.compassBearingDeg + 15) % 360).toString().padStart(3, '0')}°</span>
              <span className="text-slate-600">|</span>
              <span>{((hud.compassBearingDeg + 30) % 360).toString().padStart(3, '0')}°</span>
            </div>

            {/* Smoothly scrolling 60Hz tick track */}
            <div className="w-64 h-3 overflow-hidden relative mt-1 border-t border-slate-800/80 pt-0.5">
              <div
                ref={domRefs.compassTapeTrackRef}
                className="flex items-center gap-6 whitespace-nowrap text-[8px] font-mono text-slate-500 will-change-transform"
                style={{ width: '1440px' }}
              >
                {[...COMPASS_TICKS, ...COMPASS_TICKS].map((tk, i) => (
                  <span
                    key={i}
                    className={
                      tk.major ? 'text-amber-400/90 font-bold' : 'text-slate-500'
                    }
                  >
                    ▲ {tk.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-1 flex items-center gap-3 text-[9px] font-mono text-slate-400">
              <span>{hud.currentSectorName}</span>
              <span className="text-slate-600">·</span>
              <span
                className={
                  hud.acousticOccluded ? 'text-amber-300' : 'text-emerald-300'
                }
              >
                {hud.acousticOccluded
                  ? `LPF ${hud.acousticCutoffHz}Hz`
                  : 'CLEAR LPF'}
              </span>
              <span className="text-slate-600">·</span>
              <span data-testid="hud-squad-pips" className="text-sky-300 font-bold">
                SQUAD {hud.squadRoster.filter((p) => p.hp > 0).length}/
                {Math.max(1, hud.squadRoster.length)} ALIVE
              </span>
            </div>
          </div>

          {hud.targetBarricadeIntegrity > 0 && (
            <div
              data-testid="hud-barricade-status"
              className="px-3.5 py-1 bg-slate-950/92 border border-amber-500/50 text-amber-300 font-mono text-[11px] uppercase tracking-wider shadow-lg"
            >
              DOORWAY BARRICADE: {hud.targetBarricadeIntegrity}% INTEGRITY (
              {hud.targetBarricadePlanks}/12 PLANKS · MELEE{' '}
              {hud.targetBarricadeMeleeHits}/3)
            </div>
          )}

          {hud.statusBanner && (
            <div className="px-4 py-1.5 bg-slate-950/95 border border-amber-400/70 text-amber-300 font-mono text-xs uppercase tracking-widest shadow-lg">
              {hud.statusBanner}
            </div>
          )}
        </div>

        {/* Top-Right: Party Code Telemetry + Quick Controls + Live Killfeed Ticker */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto" data-hud-interactive="true">
            <div
              data-testid="hud-party-badge"
              className="px-2.5 py-1.5 bg-slate-950/90 border border-slate-800 text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider"
            >
              #{hud.partyCode} · {hud.pingMs}ms
            </div>
            <button
              type="button"
              data-testid="flashlight-toggle-btn"
              onClick={() => gameCtrlRef.current?.toggleFlashlight()}
              className={`px-2.5 py-1.5 border text-[11px] font-mono uppercase tracking-wider cursor-pointer ${
                hud.flashlightOn
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold'
                  : 'bg-slate-950/90 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              [T] LIGHT: {hud.flashlightOn ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              data-testid="inspect-spin-btn"
              onClick={() => gameCtrlRef.current?.triggerInspectSpin()}
              className={`px-2.5 py-1.5 border text-[11px] font-mono uppercase tracking-wider cursor-pointer ${
                hud.coltSpinActive
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-bold'
                  : 'bg-slate-950/90 border-slate-800 text-amber-300 hover:border-amber-500/60'
              }`}
            >
              [I] SPIN
            </button>
            <button
              type="button"
              data-testid="melee-strike-btn"
              onClick={() => gameCtrlRef.current?.triggerMelee()}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[11px] font-mono text-amber-300 uppercase tracking-wider cursor-pointer"
            >
              [V] MELEE
            </button>
            <button
              type="button"
              onClick={() => gameCtrlRef.current?.toggleMute()}
              className="px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 uppercase tracking-wider cursor-pointer"
            >
              {hud.muted ? 'UNMUTE [M]' : 'AUDIO [M]'}
            </button>
            <button
              type="button"
              onClick={() => gameCtrlRef.current?.pauseMatch()}
              className="px-2.5 py-1.5 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 uppercase tracking-wider cursor-pointer"
            >
              PAUSE [P]
            </button>
          </div>

          {/* Live Multiplayer / Tactical Killfeed Ticker */}
          {hud.killfeed.length > 0 && (
            <div
              data-testid="hud-killfeed"
              className="flex flex-col items-end gap-1 max-w-xs"
            >
              {hud.killfeed.map((kf) => (
                <div
                  key={kf.id}
                  className="px-2.5 py-1 bg-slate-950/92 border border-slate-800/95 text-[10px] font-mono flex items-center gap-1.5 shadow-md"
                >
                  <span
                    className={
                      kf.attackerTeam === 'DEFENDERS'
                        ? 'text-fuchsia-300 font-bold'
                        : 'text-sky-300 font-bold'
                    }
                  >
                    {kf.attackerCallsign}
                  </span>
                  <span className="px-1 py-0.2 bg-slate-900 border border-slate-700 text-amber-300 text-[9px]">
                    {kf.detailBadge || WEAPONS[kf.weaponId]?.shortName || kf.weaponId}
                  </span>
                  {kf.isHeadshot && (
                    <span className="px-1 bg-rose-500/25 border border-rose-500/50 text-rose-300 text-[8px] font-bold">
                      HS
                    </span>
                  )}
                  {kf.isWallBang && (
                    <span className="px-1 bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[8px] font-bold">
                      WB
                    </span>
                  )}
                  <span className="text-rose-400 font-bold">{kf.victimCallsign}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Dynamic Crosshair / True ADS Optical Sight Reticles + Hit Marker + Directional Damage Arc */}
      <div className="relative flex items-center justify-center my-auto">
        {/* Directional Damage Indicator Arc rotated at 60Hz toward attacker */}
        <div
          ref={domRefs.damageArcRef}
          className="absolute left-1/2 top-1/2 w-36 h-36 pointer-events-none opacity-0 transition-opacity duration-100"
          style={{ transform: 'translate(-50%, -50%) rotate(0deg)' }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <path
              d="M 28 14 A 42 42 0 0 1 72 14"
              fill="none"
              stroke="#ef4444"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <polygon points="50,3 44,13 56,13" fill="#ef4444" />
          </svg>
        </div>

        {hud.isAds ? (
          hud.activeEffectiveStats.hasHolographic ? (
            /* EOTech Holographic Ring + 1-MOA Center Dot Sight */
            <div
              data-testid="ads-reticle-holographic"
              className="relative flex items-center justify-center w-14 h-14"
            >
              <div className="w-10 h-10 rounded-full border border-rose-500/85 shadow-[0_0_10px_rgba(244,63,94,0.75)] flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
              </div>
              <div className="absolute w-14 h-[1px] bg-rose-500/40" />
              <div className="absolute h-14 w-[1px] bg-rose-500/40" />
            </div>
          ) : hud.activeEffectiveStats.reticleStyle === 'reflex' ? (
            /* Precision Reflex Red-Dot Sight */
            <div
              data-testid="ads-reticle-reflex"
              className="relative flex items-center justify-center w-10 h-10"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
              <div className="absolute w-6 h-6 rounded-full border border-emerald-400/35" />
            </div>
          ) : (
            /* Crisp Illuminated Tritium Iron Sight Post Alignment */
            <div
              data-testid="ads-reticle-iron"
              className="relative flex items-center justify-center w-8 h-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-2 h-0.5 bg-emerald-400/75" />
              <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-2 h-0.5 bg-emerald-400/75" />
            </div>
          )
        ) : (
          /* Dynamic Hipfire Crosshair */
          <div
            data-testid="hipfire-crosshair"
            className="relative w-7 h-7 flex items-center justify-center"
          >
            <div className="absolute top-0 w-0.5 h-2 bg-white/85" />
            <div className="absolute bottom-0 w-0.5 h-2 bg-white/85" />
            <div className="absolute left-0 h-0.5 w-2 bg-white/85" />
            <div className="absolute right-0 h-0.5 w-2 bg-white/85" />
            {hud.activeEffectiveStats.hasLaser && (
              <div className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            )}
          </div>
        )}

        {/* Instant Hit Marker X */}
        <div
          ref={domRefs.hitMarkerRef}
          className="absolute w-6 h-6 opacity-0 transition-opacity duration-75 pointer-events-none flex items-center justify-center"
          style={{ color: '#ffffff' }}
        >
          <div className="absolute w-5 h-0.5 bg-current rotate-45" />
          <div className="absolute w-5 h-0.5 bg-current -rotate-45" />
        </div>
      </div>

      {/* [TAB] TACTICAL MULTIPLAYER SCOREBOARD OVERLAY */}
      {hud.scoreboardOpen && (
        <div
          data-testid="tab-scoreboard-overlay"
          className="absolute inset-x-0 top-24 mx-auto max-w-2xl bg-slate-950/96 border border-slate-700 p-4 shadow-2xl z-30"
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold">
                LIVE OPERATION TELEMETRY // PARTY #{hud.partyCode}
              </div>
              <div className="font-display text-xl font-black text-white uppercase">
                {hud.mapLayoutName} · {hud.gameMode.replace('_', ' ')}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-slate-400">
              <div>SEED #{hud.mapSeed}</div>
              <div className="text-emerald-400">
                {hud.transportLabel} · {hud.pingMs}ms
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-12 text-[10px] font-mono text-slate-400 uppercase px-2 py-1 border-b border-slate-800">
              <div className="col-span-4">OPERATOR</div>
              <div className="col-span-2">TEAM</div>
              <div className="col-span-2">WEAPON</div>
              <div className="col-span-1 text-center">K</div>
              <div className="col-span-1 text-center">D</div>
              <div className="col-span-1 text-center">HS</div>
              <div className="col-span-1 text-right">PING</div>
            </div>
            {hud.squadRoster.map((op) => (
              <div
                key={op.id}
                className="grid grid-cols-12 items-center text-xs font-mono px-2 py-2 bg-slate-900/90 border border-slate-800"
              >
                <div className="col-span-4 font-bold text-white flex items-center gap-1.5">
                  <span>{op.callsign}</span>
                  {op.isHost && (
                    <span className="text-[9px] text-amber-400">[HOST]</span>
                  )}
                </div>
                <div className="col-span-2">
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold ${
                      op.team === 'DEFENDERS'
                        ? 'bg-fuchsia-500/20 text-fuchsia-300'
                        : 'bg-sky-500/20 text-sky-300'
                    }`}
                  >
                    {op.team}
                  </span>
                </div>
                <div className="col-span-2 text-slate-300">
                  {WEAPONS[op.activeWeapon]?.shortName || op.activeWeapon}
                </div>
                <div className="col-span-1 text-center text-emerald-400 font-bold">
                  {op.kills}
                </div>
                <div className="col-span-1 text-center text-rose-400">{op.deaths}</div>
                <div className="col-span-1 text-center text-amber-300">
                  {op.headshots}
                </div>
                <div className="col-span-1 text-right text-slate-400">
                  {op.pingMs}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOTTOM BAR: Operator Biometrics & Stance/Lean (Left) + Ballistic Computer & Chamber Pips (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Health Bar + ECG Pulse + Stance/Lean Indicator + Medbag/Frag Slots */}
        <div
          className="bg-slate-950/92 border border-slate-800/95 p-3.5 min-w-[290px] space-y-2.5 pointer-events-auto shadow-xl tactical-panel"
          data-hud-interactive="true"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                OPERATOR VITALS
              </span>
              {/* Animated SVG ECG Pulse Line */}
              <svg width="44" height="14" viewBox="0 0 44 14" className="overflow-visible">
                <polyline
                  fill="none"
                  stroke={isCriticalHp ? '#ef4444' : '#10b981'}
                  strokeWidth="1.5"
                  points="0,7 10,7 14,2 18,12 22,4 25,9 29,7 44,7"
                />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                data-testid="hud-stance-status"
                className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                  !hud.isGrounded
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : hud.isCrouched
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {!hud.isGrounded
                  ? 'AIRBORNE'
                  : hud.isCrouched
                  ? 'CROUCHED (-30% RECOIL)'
                  : 'STAND'}
              </span>
              <span
                data-testid="hud-lean-status"
                className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                  hud.leanTarget !== 0
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {hud.leanTarget === -1
                  ? '◄ LEAN L'
                  : hud.leanTarget === 1
                  ? 'LEAN R ►'
                  : `CENTER (${hud.leanMode.toUpperCase()})`}
              </span>
            </div>
          </div>

          <div className="flex items-baseline justify-between">
            <div
              data-testid="hud-hp-value"
              className={`font-mono text-3xl font-extrabold ${
                isCriticalHp ? 'text-rose-500' : 'text-white'
              }`}
            >
              {hud.hp}
              <span className="text-xs font-normal text-slate-400 ml-1">/ 100 HP</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              LEAN: {hud.leanAngleDeg}° ({hud.leanOffsetMeters}m)
            </div>
          </div>

          {/* Health Bar with Smooth Ghost Trail */}
          <div className="relative h-2.5 bg-slate-900 overflow-hidden border border-slate-800">
            <div
              ref={domRefs.hpGhostBarRef}
              className="absolute inset-y-0 left-0 bg-rose-500/50 transition-none"
              style={{ width: `${hud.hp}%` }}
            />
            <div
              className={`relative h-full transition-all duration-150 ${
                isCriticalHp ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${hud.hp}%` }}
            />
          </div>

          {/* Interactive Medical Bag + HE Frag Grenade Quick-Slots */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="use-medbag-btn"
                onClick={() => gameCtrlRef.current?.triggerMedbag()}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer"
              >
                [H] MEDBAG ({hud.medbags})
              </button>
              <button
                type="button"
                data-testid="throw-grenade-btn"
                onClick={() => gameCtrlRef.current?.throwGrenade()}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer"
              >
                [G] FRAG ({hud.grenades})
              </button>
            </div>
          </div>
        </div>

        {/* Bottom-Right: Ballistic Computer, Individual Bullet/Cylinder Pips & 3-Slot Weapon Hotbar */}
        <div
          className="bg-slate-950/92 border border-slate-800/95 p-3.5 min-w-[320px] space-y-2.5 pointer-events-auto shadow-xl tactical-panel"
          data-hud-interactive="true"
        >
          {/* 3-Slot Weapon Hotbar Selector */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-testid="select-primary-btn"
                onClick={() => gameCtrlRef.current?.switchWeapon(hud.loadout.primary)}
                className={`px-2 py-0.5 text-[10px] font-mono uppercase border cursor-pointer ${
                  hud.activeWeapon === hud.loadout.primary
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                [1] {WEAPONS[hud.loadout.primary].shortName}
              </button>
              <button
                type="button"
                data-testid="select-secondary-btn"
                onClick={() => gameCtrlRef.current?.switchWeapon(hud.loadout.secondary)}
                className={`px-2 py-0.5 text-[10px] font-mono uppercase border cursor-pointer ${
                  hud.activeWeapon === hud.loadout.secondary
                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                [2] {WEAPONS[hud.loadout.secondary].shortName}
              </button>
              <button
                type="button"
                data-testid="select-knife-btn"
                onClick={() => gameCtrlRef.current?.switchWeapon('combat_knife')}
                className={`px-2 py-0.5 text-[10px] font-mono uppercase border cursor-pointer ${
                  hud.activeWeapon === 'combat_knife'
                    ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                [3] KNIFE
              </button>
            </div>
            <button
              type="button"
              data-testid="hud-fire-mode-badge"
              onClick={() => gameCtrlRef.current?.toggleFireMode()}
              className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-900 border border-slate-700 text-amber-400 uppercase cursor-pointer"
            >
              [B]{' '}
              {hud.activeWeapon === 'colt_saa'
                ? hud.isAds
                  ? 'SA ADS'
                  : 'FAN HIP'
                : hud.fireMode}
            </button>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-lg font-bold text-white uppercase tracking-wide">
                {activeSpec.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-slate-400">
                  {activeSpec.caliber}
                </span>
                {hud.activeEffectiveStats.attachments.map((attId) => (
                  <span
                    key={attId}
                    className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[9px] uppercase"
                  >
                    {attId === 'suppressor'
                      ? 'SUP'
                      : attId === 'holographic'
                      ? 'HOLO'
                      : 'LAS'}
                  </span>
                ))}
              </div>
            </div>

            {hud.activeWeapon === 'combat_knife' ? (
              <div
                data-testid="hud-knife-status"
                className="text-right font-mono text-sm font-extrabold text-emerald-400 uppercase"
              >
                MELEE READY [LMB / V]
                <div className="text-[10px] font-normal text-slate-400">
                  125 HEAD / 50 TORSO
                </div>
              </div>
            ) : (
              <div className="text-right font-mono">
                {hud.isReloading ? (
                  <span
                    data-testid="hud-reload-status"
                    className="text-sm font-bold text-amber-400 uppercase animate-pulse"
                  >
                    {hud.activeWeapon === 'colt_saa'
                      ? `SEQ GATE RELOAD (${hud.mag}/6)...`
                      : `RELOADING (${hud.reloadTimeRemaining}s)...`}
                  </span>
                ) : (
                  <div className="flex flex-col items-end">
                    {hud.activeWeapon === 'colt_saa' && (
                      <span
                        data-testid="hud-colt-mode-status"
                        className="text-[9px] font-mono text-amber-300 uppercase tracking-wider"
                      >
                        {hud.isAds
                          ? 'SINGLE-ACTION PINPOINT'
                          : 'FANNING THE HAMMER (420 RPM)'}
                      </span>
                    )}
                    {/* Individual Chamber / Shell Silhouette Pips */}
                    <div className="flex items-center gap-0.5 my-1">
                      {Array.from({ length: Math.min(12, activeSpec.magSize) }).map(
                        (_, idx) => {
                          const filled =
                            activeSpec.magSize <= 12
                              ? idx < hud.mag
                              : idx < Math.ceil((hud.mag / activeSpec.magSize) * 12);
                          return (
                            <span
                              key={idx}
                              className={`inline-block transition-colors ${
                                hud.activeWeapon === 'colt_saa'
                                  ? 'w-2 h-2 rounded-full border border-amber-400/60'
                                  : 'w-1.5 h-3'
                              } ${
                                filled
                                  ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                                  : 'bg-slate-800'
                              }`}
                            />
                          );
                        }
                      )}
                    </div>
                    <div>
                      <span
                        data-testid="hud-ammo-mag"
                        className={`text-3xl font-extrabold ${
                          hud.mag <= Math.ceil(activeSpec.magSize * 0.25)
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}
                      >
                        {hud.mag}
                      </span>
                      <span className="text-sm text-slate-400 ml-1">
                        / {hud.reserve}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Magazine Progress Bar + Reload Progress Fill */}
          <div className="h-1.5 bg-slate-900 overflow-hidden relative">
            <div
              data-testid="hud-mag-fill-bar"
              className="h-full bg-amber-400 transition-all duration-150"
              style={{
                width: `${
                  hud.activeWeapon === 'combat_knife'
                    ? 100
                    : (hud.mag / activeSpec.magSize) * 100
                }%`,
              }}
            />
            <div
              ref={domRefs.reloadProgressFillRef}
              className="absolute inset-y-0 left-0 bg-sky-400 transition-none"
              style={{ width: '0%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
