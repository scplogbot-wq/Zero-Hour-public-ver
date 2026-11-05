import React from 'react';
import { HUDState, TacticalGameController } from '../engine/TacticalEngine';

interface AfterActionReportModalProps {
  hud: HUDState;
  gameCtrl: TacticalGameController | null;
}

export const AfterActionReportModal: React.FC<AfterActionReportModalProps> = ({
  hud,
  gameCtrl,
}) => {
  const accuracyPct =
    hud.shotsFired > 0
      ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100))
      : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#090c12]/90 p-6 pointer-events-auto">
      <div className="w-full max-w-md tactical-panel rounded p-6 shadow-2xl">
        <div
          className={`text-xs font-mono-tabular uppercase tracking-widest mb-1 ${
            hud.victory ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {hud.victory
            ? 'ALL SECTORS CLEARED · HOSTILES NEUTRALIZED'
            : 'OPERATOR INCAPACITATED IN ACTION'}
        </div>
        <h2 className="text-3xl font-display-tactical font-bold text-white tracking-wide mb-4">
          {hud.victory ? 'SECTOR SECURED' : 'BREACH FAILED'}
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">
              ELIMINATIONS
            </div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-white">
              {hud.kills} / {hud.enemiesTotal}
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">
              HEADSHOTS
            </div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-amber-400">
              {hud.headshots} ({accuracyPct}%)
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-3">
            <div className="text-[10px] font-mono-tabular text-slate-400">
              CLEAR TIME
            </div>
            <div className="text-xl font-display-tactical font-bold font-mono-tabular text-sky-400">
              {hud.elapsedSec}s
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={() =>
              gameCtrl?.startMatch(Math.floor(1000 + Math.random() * 9000))
            }
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-display-tactical text-lg font-bold tracking-wider rounded transition-colors cursor-pointer"
          >
            DEPLOY NEXT CQB OPERATION
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
