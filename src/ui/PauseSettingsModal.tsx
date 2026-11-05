import React from 'react';
import { HUDState, TacticalGameController, GraphicsSettings } from '../engine/TacticalEngine';

interface PauseSettingsModalProps {
  hud: HUDState;
  gameCtrl: TacticalGameController | null;
}

export const PauseSettingsModal: React.FC<PauseSettingsModalProps> = ({ hud, gameCtrl }) => {
  const accuracyPct =
    hud.shotsFired > 0
      ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#090c12]/90 p-6 pointer-events-auto">
      <div className="w-full max-w-md tactical-panel rounded p-6 shadow-2xl">
        <div className="text-[11px] font-mono-tabular text-amber-400 uppercase tracking-widest mb-1">
          OPERATION SUSPENDED // SEED #{hud.mapSeed} // PARTY #{hud.partyCode}
        </div>
        <h2 className="text-3xl font-display-tactical font-bold text-white tracking-wide mb-4">
          TACTICAL PAUSE
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">HOSTILES</div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-white">
              {hud.enemiesRemaining} / {hud.enemiesTotal}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">ACCURACY</div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-amber-400">
              {accuracyPct}%
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">MEDBAGS</div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-emerald-400">
              {hud.medbags} / 4
            </div>
          </div>
        </div>

        {/* REAL-TIME GRAPHICS SETTINGS MENU */}
        <div className="bg-slate-950/90 border border-slate-800 rounded p-3 mb-4 text-xs font-mono-tabular">
          <div className="text-[11px] font-bold text-slate-300 tracking-wider uppercase mb-2.5 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <span className="text-amber-400">GRAPHICS SETTINGS</span>
            <span className="text-[9px] text-slate-500">REAL-TIME PBR</span>
          </div>

          <div className="space-y-2">
            {/* Shadow Quality Dropdown */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">SHADOW QUALITY</span>
              <select
                aria-label="Shadow Quality"
                value={hud.graphicsSettings.shadowQuality}
                onChange={(e) =>
                  gameCtrl?.updateGraphicsSettings({
                    shadowQuality: e.target.value as GraphicsSettings['shadowQuality'],
                  })
                }
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono-tabular cursor-pointer"
              >
                <option value="off">OFF</option>
                <option value="low">LOW (512x512)</option>
                <option value="med">MED (1024x1024)</option>
                <option value="high">HIGH (2048x2048)</option>
              </select>
            </div>

            {/* PCF Soft Shadows Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">PCF SOFT SHADOWS</span>
              <button
                type="button"
                onClick={() =>
                  gameCtrl?.updateGraphicsSettings({
                    pcfSoftShadows: !hud.graphicsSettings.pcfSoftShadows,
                  })
                }
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  hud.graphicsSettings.pcfSoftShadows
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {hud.graphicsSettings.pcfSoftShadows ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Anti-Aliasing */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ANTI-ALIASING</span>
              <button
                type="button"
                onClick={() =>
                  gameCtrl?.updateGraphicsSettings({
                    antiAliasing: !hud.graphicsSettings.antiAliasing,
                  })
                }
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  hud.graphicsSettings.antiAliasing
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {hud.graphicsSettings.antiAliasing ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Post-Processing Bloom */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">BLOOM (EMISSIVE BOOST)</span>
              <button
                type="button"
                onClick={() =>
                  gameCtrl?.updateGraphicsSettings({
                    bloom: !hud.graphicsSettings.bloom,
                  })
                }
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  hud.graphicsSettings.bloom
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {hud.graphicsSettings.bloom ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Ambient Occlusion */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">AMBIENT OCCLUSION (AO)</span>
              <button
                type="button"
                onClick={() =>
                  gameCtrl?.updateGraphicsSettings({
                    ambientOcclusion: !hud.graphicsSettings.ambientOcclusion,
                  })
                }
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  hud.graphicsSettings.ambientOcclusion
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {hud.graphicsSettings.ambientOcclusion ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            {/* Texture Resolution */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">TEXTURE RESOLUTION</span>
              <select
                aria-label="Texture Resolution"
                value={hud.graphicsSettings.textureResolution}
                onChange={(e) =>
                  gameCtrl?.updateGraphicsSettings({
                    textureResolution: Number(e.target.value) as 256 | 1024,
                  })
                }
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono-tabular cursor-pointer"
              >
                <option value={256}>LOW (256x256)</option>
                <option value={1024}>HIGH-RES PBR (1024x1024)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => gameCtrl?.resumeMatch()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display-tactical text-lg font-bold tracking-wider rounded transition-colors cursor-pointer"
          >
            RESUME OPERATION [P / ESC]
          </button>

          <button
            type="button"
            onClick={() =>
              gameCtrl?.setLeanMode(hud.leanMode === 'toggle' ? 'hold' : 'toggle')
            }
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono-tabular text-xs rounded transition-colors cursor-pointer"
          >
            LEAN INPUT MODE [Q/E]: {hud.leanMode.toUpperCase()}
          </button>

          <button
            type="button"
            onClick={() =>
              gameCtrl?.startMatch(Math.floor(1000 + Math.random() * 9000))
            }
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-mono-tabular text-xs rounded transition-colors cursor-pointer"
          >
            GENERATE NEW CQB MAP
          </button>

          <button
            type="button"
            onClick={() => gameCtrl?.returnToTitle()}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 border border-slate-800 font-mono-tabular text-xs rounded transition-colors cursor-pointer"
          >
            RETURN TO TITLE SCREEN
          </button>
        </div>
      </div>
    </div>
  );
};
