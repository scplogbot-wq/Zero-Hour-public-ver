import React, { useEffect, useRef, useState } from 'react';
import {
  WEAPONS,
  WeaponId,
  PrimaryWeaponId,
  SecondaryWeaponId,
  AttachmentId,
  ATTACHMENTS,
  isAttachmentCompatible,
  sanitizeWeaponAttachments,
  PlayerLoadoutConfig,
  MapLayoutVariant,
} from './game/tacticalLogic';
import {
  initTacticalEngine,
  createInitialHUDState,
  HUDState,
  HUDDomRefs,
  ArmoryDeckTab,
  InspectTurntableState,
  TacticalGameController,
} from './engine/TacticalEngine';
import { TacticalLobby } from './ui/TacticalLobby';
import { DiegeticHUD } from './ui/DiegeticHUD';
import { PauseSettingsModal } from './ui/PauseSettingsModal';
import { AfterActionReportModal } from './ui/AfterActionReportModal';

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const mountRef = useRef<HTMLDivElement | null>(null);
  const weaponPreviewMountRef = useRef<HTMLDivElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hpGhostBarRef = useRef<HTMLDivElement | null>(null);
  const hitMarkerRef = useRef<HTMLDivElement | null>(null);
  const damageVignetteRef = useRef<HTMLDivElement | null>(null);
  const damageArcRef = useRef<HTMLDivElement | null>(null);
  const compassTapeTrackRef = useRef<HTMLDivElement | null>(null);
  const compassBearingLabelRef = useRef<HTMLSpanElement | null>(null);
  const reloadProgressFillRef = useRef<HTMLDivElement | null>(null);

  const [selectedPrimary, setSelectedPrimary] = useState<PrimaryWeaponId>('hk416');
  const [selectedSecondary, setSelectedSecondary] =
    useState<SecondaryWeaponId>('glock17');
  const [inspectedWeapon, setInspectedWeapon] = useState<WeaponId>('hk416');
  const [selectedLayout, setSelectedLayout] = useState<
    MapLayoutVariant | 'random'
  >('l_compound');
  const [armoryTab, setArmoryTab] = useState<ArmoryDeckTab>('weapons');
  const [partyCodeInput, setPartyCodeInput] = useState<string>('749208');
  const [callsignInput, setCallsignInput] = useState<string>('VANGUARD-01');
  const [copiedPartyCode, setCopiedPartyCode] = useState<boolean>(false);

  const [weaponAttachments, setWeaponAttachments] = useState<
    Record<WeaponId, AttachmentId[]>
  >(() => ({
    hk416: [...WEAPONS.hk416.defaultAttachments],
    mp5sd: [...WEAPONS.mp5sd.defaultAttachments],
    m870: [...WEAPONS.m870.defaultAttachments],
    mk18: [...WEAPONS.mk18.defaultAttachments],
    musket: [...WEAPONS.musket.defaultAttachments],
    glock17: [...WEAPONS.glock17.defaultAttachments],
    m1911: [...WEAPONS.m1911.defaultAttachments],
    colt_saa: [...WEAPONS.colt_saa.defaultAttachments],
    combat_knife: [],
  }));

  const selectedLayoutRef = useRef<MapLayoutVariant | 'random'>('l_compound');
  const weaponAttachmentsRef = useRef(weaponAttachments);
  const loadoutSelectionRef = useRef<PlayerLoadoutConfig>({
    primary: 'hk416',
    secondary: 'glock17',
    primaryAttachments: [...WEAPONS.hk416.defaultAttachments],
    secondaryAttachments: [...WEAPONS.glock17.defaultAttachments],
  });

  const inspectStateRef = useRef<InspectTurntableState>({
    weaponId: 'hk416',
    yaw: -0.62,
    pitch: 0.14,
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  const [hud, setHud] = useState<HUDState>(() =>
    createInitialHUDState(initialAutostart)
  );
  const gameCtrlRef = useRef<TacticalGameController | null>(null);

  const domRefs: HUDDomRefs = {
    weaponPreviewMountRef,
    minimapCanvasRef,
    hpGhostBarRef,
    hitMarkerRef,
    damageVignetteRef,
    damageArcRef,
    compassTapeTrackRef,
    compassBearingLabelRef,
    reloadProgressFillRef,
  };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const ctrl = initTacticalEngine({
      mount,
      initialAutostart,
      domRefs,
      selectedLayoutRef,
      weaponAttachmentsRef,
      loadoutSelectionRef,
      inspectStateRef,
      onHudStateChange: setHud,
    });
    gameCtrlRef.current = ctrl;

    return () => {
      ctrl.dispose();
      gameCtrlRef.current = null;
    };
  }, []);

  const handleSelectPrimary = (id: PrimaryWeaponId) => {
    setSelectedPrimary(id);
    setInspectedWeapon(id);
    inspectStateRef.current.weaponId = id;
    loadoutSelectionRef.current = {
      ...loadoutSelectionRef.current,
      primary: id,
      primaryAttachments: weaponAttachmentsRef.current[id],
    };
  };

  const handleSelectSecondary = (id: SecondaryWeaponId) => {
    setSelectedSecondary(id);
    setInspectedWeapon(id);
    inspectStateRef.current.weaponId = id;
    loadoutSelectionRef.current = {
      ...loadoutSelectionRef.current,
      secondary: id,
      secondaryAttachments: weaponAttachmentsRef.current[id],
    };
  };

  const handleSelectInspectedWeapon = (id: WeaponId) => {
    setInspectedWeapon(id);
    inspectStateRef.current.weaponId = id;
  };

  const handleToggleAttachment = (weaponId: WeaponId, attId: AttachmentId) => {
    if (!isAttachmentCompatible(weaponId, attId)) return;
    setWeaponAttachments((prev) => {
      const current = prev[weaponId] || [];
      const hasIt = current.includes(attId);
      const targetSlot = ATTACHMENTS[attId].slot;
      let nextList: AttachmentId[];
      if (hasIt) {
        nextList = current.filter((a) => a !== attId);
      } else {
        nextList = [
          ...current.filter((a) => ATTACHMENTS[a].slot !== targetSlot),
          attId,
        ];
      }
      const sanitized = sanitizeWeaponAttachments(weaponId, nextList);
      const updated = { ...prev, [weaponId]: sanitized };
      weaponAttachmentsRef.current = updated;
      loadoutSelectionRef.current = {
        ...loadoutSelectionRef.current,
        primaryAttachments: updated[loadoutSelectionRef.current.primary],
        secondaryAttachments: updated[loadoutSelectionRef.current.secondary],
      };
      return updated;
    });
  };

  const handleSelectLayout = (layout: MapLayoutVariant | 'random') => {
    setSelectedLayout(layout);
    selectedLayoutRef.current = layout;
  };

  const handleCopyPartyCode = () => {
    navigator.clipboard?.writeText(hud.partyCode).catch(() => {});
    setCopiedPartyCode(true);
    setTimeout(() => setCopiedPartyCode(false), 1500);
  };

  const handleDeployBreach = (seedOverride?: number) => {
    const chosenLoadout: PlayerLoadoutConfig = {
      primary: selectedPrimary,
      secondary: selectedSecondary,
      primaryAttachments: weaponAttachments[selectedPrimary],
      secondaryAttachments: weaponAttachments[selectedSecondary],
    };
    loadoutSelectionRef.current = chosenLoadout;
    gameCtrlRef.current?.startMatch(seedOverride, chosenLoadout);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#090c12] text-slate-100 select-none">
      {/* 3D WebGL Viewport Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-crosshair"
        onClick={() => {
          if (hud.screen === 'playing' && !document.pointerLockElement) {
            mountRef.current?.querySelector('canvas')?.requestPointerLock?.();
          }
        }}
      />

      {/* 1. PRE-MISSION TACTICAL OPERATIONS CENTER */}
      {hud.screen === 'title' && (
        <TacticalLobby
          hud={hud}
          selectedPrimary={selectedPrimary}
          selectedSecondary={selectedSecondary}
          inspectedWeapon={inspectedWeapon}
          selectedLayout={selectedLayout}
          armoryTab={armoryTab}
          partyCodeInput={partyCodeInput}
          callsignInput={callsignInput}
          copiedPartyCode={copiedPartyCode}
          weaponAttachments={weaponAttachments}
          weaponPreviewMountRef={weaponPreviewMountRef}
          inspectStateRef={inspectStateRef}
          gameCtrlRef={gameCtrlRef}
          onSelectPrimary={handleSelectPrimary}
          onSelectSecondary={handleSelectSecondary}
          onSelectInspectedWeapon={handleSelectInspectedWeapon}
          onToggleAttachment={handleToggleAttachment}
          onSelectLayout={handleSelectLayout}
          onSetArmoryTab={setArmoryTab}
          onSetPartyCodeInput={setPartyCodeInput}
          onSetCallsignInput={setCallsignInput}
          onCopyPartyCode={handleCopyPartyCode}
          onDeployBreach={handleDeployBreach}
        />
      )}

      {/* 2. DIEGETIC IN-GAME TACTICAL HUD */}
      {hud.screen === 'playing' && (
        <DiegeticHUD
          hud={hud}
          domRefs={domRefs}
          gameCtrlRef={gameCtrlRef}
        />
      )}

      {/* 3. PAUSE & PBR GRAPHICS SETTINGS MODAL */}
      {hud.screen === 'paused' && (
        <PauseSettingsModal hud={hud} gameCtrl={gameCtrlRef.current} />
      )}

      {/* 4. AFTER-ACTION REPORT (VICTORY / DEFEAT) MODAL */}
      {hud.screen === 'gameover' && (
        <AfterActionReportModal hud={hud} gameCtrl={gameCtrlRef.current} />
      )}
    </div>
  );
}
