// 100% Procedural Web Audio API tactical sound synthesizer with Dynamic Acoustic Occlusion LPF Routing
import {
  ACOUSTIC_LPF_CLEAR_HZ,
  ACOUSTIC_LPF_OCCLUDED_HZ,
  ACOUSTIC_OCCLUDED_VOLUME_SCALE,
  SurfaceMaterialTag,
  EnemyShoutType,
  WeaponId,
} from './tacticalLogic';

class TacticalSoundEngine {
  private ctx: AudioContext | null = null;
  private worldLpfNode: BiquadFilterNode | null = null;
  private worldGainNode: GainNode | null = null;
  public muted = false;
  public currentLpfHz = ACOUSTIC_LPF_CLEAR_HZ;
  public currentVolumeScale = 1.0;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // Persistent World Audio Bus with Real-time Low-Pass Filter & Occlusion Gain
        this.worldLpfNode = this.ctx.createBiquadFilter();
        this.worldLpfNode.type = 'lowpass';
        this.worldLpfNode.frequency.value = this.currentLpfHz;
        this.worldLpfNode.Q.value = 0.7;

        this.worldGainNode = this.ctx.createGain();
        this.worldGainNode.gain.value = this.currentVolumeScale;

        this.worldLpfNode.connect(this.worldGainNode);
        this.worldGainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Real-time Acoustic Updates:
   * Dynamically interpolates the Low-Pass Filter cutoff frequency and volume scale
   * as barricades are breached or line-of-sight between sound sources and listener changes.
   */
  public updateWorldAcousticRouting(lpfHz: number, volumeScale: number) {
    this.currentLpfHz = lpfHz;
    this.currentVolumeScale = volumeScale;
    if (!this.ctx || !this.worldLpfNode || !this.worldGainNode) return;
    const now = this.ctx.currentTime;
    this.worldLpfNode.frequency.setTargetAtTime(
      Math.max(120, Math.min(20000, lpfHz)),
      now,
      0.03
    );
    this.worldGainNode.gain.setTargetAtTime(
      Math.max(0.05, Math.min(1.0, volumeScale)),
      now,
      0.03
    );
  }

  /**
   * Route an audio node either directly to the listener or through the Dynamic Acoustic LPF Bus.
   * Attaches `onended` handlers to `OscillatorNode` and `AudioBufferSourceNode` instances to
   * `.disconnect()` temporary `eventLpf` and `eventGain` nodes immediately after playback.
   */
  private connectSourceWithOcclusion(
    ctx: AudioContext,
    sourceNode: AudioNode,
    isWorldSource: boolean,
    occluded = false,
    scheduledSource?: AudioScheduledSourceNode | AudioScheduledSourceNode[]
  ) {
    if (!isWorldSource) {
      sourceNode.connect(ctx.destination);
      const cleanupDirect = () => {
        try {
          sourceNode.disconnect();
        } catch {
          // Ignore already disconnected node
        }
      };
      if (
        (typeof OscillatorNode !== 'undefined' && sourceNode instanceof OscillatorNode) ||
        (typeof AudioBufferSourceNode !== 'undefined' && sourceNode instanceof AudioBufferSourceNode)
      ) {
        sourceNode.onended = cleanupDirect;
      } else if (scheduledSource) {
        const list = Array.isArray(scheduledSource) ? scheduledSource : [scheduledSource];
        for (const s of list) {
          s.onended = cleanupDirect;
        }
      }
      return;
    }
    // Create a per-event Low-Pass Filter connected into the real-time world LPF bus
    // so both per-source occlusion and real-time barricade breach un-muffling work seamlessly
    const eventLpf = ctx.createBiquadFilter();
    eventLpf.type = 'lowpass';
    eventLpf.frequency.setValueAtTime(
      occluded ? ACOUSTIC_LPF_OCCLUDED_HZ : ACOUSTIC_LPF_CLEAR_HZ,
      ctx.currentTime
    );
    const eventGain = ctx.createGain();
    eventGain.gain.setValueAtTime(
      occluded ? ACOUSTIC_OCCLUDED_VOLUME_SCALE : 1.0,
      ctx.currentTime
    );

    sourceNode.connect(eventLpf);
    eventLpf.connect(eventGain);
    if (this.worldLpfNode) {
      eventGain.connect(this.worldLpfNode);
    } else {
      eventGain.connect(ctx.destination);
    }

    const cleanupNodes = () => {
      try {
        sourceNode.disconnect();
      } catch {
        // Ignore already disconnected
      }
      try {
        eventLpf.disconnect();
      } catch {
        // Ignore already disconnected
      }
      try {
        eventGain.disconnect();
      } catch {
        // Ignore already disconnected
      }
    };

    if (
      (typeof OscillatorNode !== 'undefined' && sourceNode instanceof OscillatorNode) ||
      (typeof AudioBufferSourceNode !== 'undefined' && sourceNode instanceof AudioBufferSourceNode)
    ) {
      sourceNode.onended = cleanupNodes;
    }
    if (scheduledSource) {
      const list = Array.isArray(scheduledSource) ? scheduledSource : [scheduledSource];
      let remaining = list.length;
      for (const s of list) {
        s.onended = () => {
          remaining -= 1;
          if (remaining <= 0) {
            cleanupNodes();
          }
        };
      }
    }
  }

  public playGunshot(
    weaponId: WeaponId,
    isEnemy = false,
    occluded = false,
    suppressedOverride?: boolean
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const pitchVar = 0.94 + Math.random() * 0.12;
    const isSuppressed = Boolean(suppressedOverride || weaponId === 'mp5sd');
    const isShotgun = weaponId === 'm870';
    const isMusket = weaponId === 'musket';
    const isRevolver = weaponId === 'colt_saa';
    const isHeavyPistol = weaponId === 'm1911' || isRevolver;
    const gainScale = isEnemy
      ? 0.25
      : isSuppressed
      ? 0.22
      : isMusket
      ? 0.68
      : isRevolver
      ? 0.62
      : isShotgun
      ? 0.56
      : 0.42;

    // 1. Transient punch oscillator
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type =
      weaponId === 'hk416' || weaponId === 'mk18' || isShotgun || isMusket || isRevolver
        ? 'sawtooth'
        : 'triangle';
    const baseFreq = isMusket
      ? 110
      : isRevolver
      ? 148
      : isShotgun
      ? 135
      : isSuppressed
      ? 260
      : isHeavyPistol
      ? 175
      : weaponId === 'glock17'
      ? 240
      : 195;
    const startFreq = baseFreq * pitchVar;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(
      isMusket ? 22 : isShotgun ? 28 : 38,
      now + (isMusket ? 0.24 : isShotgun ? 0.14 : 0.09)
    );

    oscGain.gain.setValueAtTime(gainScale, now);
    oscGain.gain.exponentialRampToValueAtTime(
      0.001,
      now + (isMusket ? 0.26 : isShotgun ? 0.16 : 0.11)
    );

    osc.connect(oscGain);
    this.connectSourceWithOcclusion(ctx, oscGain, isEnemy, occluded, osc);
    osc.start(now);
    osc.stop(now + (isMusket ? 0.27 : isShotgun ? 0.17 : 0.12));

    // 2. High-pressure propellant crack noise burst
    const duration = isMusket
      ? 0.36
      : isShotgun
      ? 0.24
      : isSuppressed
      ? 0.085
      : weaponId === 'glock17'
      ? 0.12
      : 0.16;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.32));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = isSuppressed ? 'lowpass' : 'bandpass';
    const filterFreq = isMusket
      ? 720
      : isShotgun
      ? 920
      : isSuppressed
      ? 980
      : weaponId === 'glock17'
      ? 1850
      : 1450;
    filter.frequency.setValueAtTime(filterFreq * pitchVar, now);
    filter.Q.setValueAtTime(0.9, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(gainScale * 0.95, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    this.connectSourceWithOcclusion(ctx, noiseGain, isEnemy, occluded, whiteNoise);
    whiteNoise.start(now);
  }

  public playFootstep(isEnemy = true, occluded = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(115 + Math.random() * 25, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.065);

    const baseGain = isEnemy ? 0.12 : 0.09;
    gain.gain.setValueAtTime(baseGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    this.connectSourceWithOcclusion(ctx, gain, isEnemy, occluded, osc);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playHitMarker(isHeadshot: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isHeadshot ? 'square' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 1680 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(isHeadshot ? 620 : 420, now + 0.065);

    gain.gain.setValueAtTime(isHeadshot ? 0.28 : 0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playMedbagHeal() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [440, 587.33, 880];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.065;
      osc.frequency.setValueAtTime(f, t0);
      gain.gain.setValueAtTime(0.16, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.19);
    });
  }

  public playReload(isEnemy = false, occluded = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.28].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 310 : 520, now + offset);
      osc.frequency.exponentialRampToValueAtTime(160, now + offset + 0.06);
      gain.gain.setValueAtTime(0.16, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.065);
      osc.connect(gain);
      this.connectSourceWithOcclusion(ctx, gain, isEnemy, occluded, osc);
      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });
  }

  public playLeanSwoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playPlayerHurt() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playMeleeSwing() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.09);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playWoodSplinter(isHeavyMelee = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sharp dry timber crack burst
    const duration = isHeavyMelee ? 0.19 : 0.11;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.exp(-i / (bufferSize * 0.28));
      output[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isHeavyMelee ? 920 : 1350, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(isHeavyMelee ? 0.42 : 0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    // Low wooden thud resonance
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeavyMelee ? 155 : 220, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);
    oscGain.gain.setValueAtTime(isHeavyMelee ? 0.34 : 0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playBarricadeCollapse() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Cascading multi-plank timber crash
    [0, 0.055, 0.12, 0.19].forEach((delay, idx) => {
      setTimeout(() => {
        this.playWoodSplinter(idx % 2 === 0);
      }, delay * 1000);
    });
  }

  /**
   * Glass-shattering sound when a shootable ceiling light bulb (1-HP) is destroyed
   */
  public playGlassShatter() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. High-frequency crystalline glass burst
    const duration = 0.22;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(3200, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(hpFilter);
    hpFilter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // 2. Tinkly glass shard chimes
    [2850, 3620, 4480, 5120].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      const t0 = now + idx * 0.028;
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 240, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t0 + 0.09);
      g.gain.setValueAtTime(0.14, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.095);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    });
  }

  /**
   * Tactical flashlight switch click [T]
   */
  public playFlashlightToggle() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1420, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.025);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  /**
   * Material-based bullet impact sound (Concrete thud, Steel ricochet, Drywall punch)
   */
  public playSurfaceImpact(materialTag: SurfaceMaterialTag) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (materialTag === 'steel') {
      // Metallic ricochet ping
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + Math.random() * 450, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.135);
      return;
    }

    if (materialTag === 'concrete') {
      // Hard stone spall crack
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      return;
    }

    if (materialTag === 'drywall') {
      // Hollow gypsum board punch
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(62, now + 0.085);
      g.gain.setValueAtTime(0.22, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    }
  }

  /**
   * Tactical HE Grenade Pin Pull & Spoon Release
   */
  public playGrenadePinPull() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * Grenade body bouncing off concrete / steel
   */
  public playGrenadeBounce() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * High-Explosive (HE) Fragmentation Blast
   * Sub-bass shockwave + deafening noise rumble + supersonic crack + tinnitus ringing
   */
  public playGrenadeExplosion() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Deep Sub-bass Shockwave (35Hz downward slide)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130, now);
    subOsc.frequency.exponentialRampToValueAtTime(28, now + 0.5);
    subGain.gain.setValueAtTime(0.7, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.7);

    // 2. High-energy debris blast noise burst
    const duration = 0.55;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + duration);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noiseSource.start(now);

    // 3. Tinnitus ringing (high-frequency sine fadeout)
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(3850, now);
    ringGain.gain.setValueAtTime(0.08, now + 0.05);
    ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    ringOsc.connect(ringGain);
    ringGain.connect(ctx.destination);
    ringOsc.start(now + 0.05);
    ringOsc.stop(now + 1.25);
  }

  /**
   * Procedural Enemy Vocalization / Tactical Shouting Sound Effect
   * Synthesizes formant-filtered vocal tract oscillations and consonant noise bursts.
   * If `isOccluded` is true, routes through the Acoustic Low-Pass Filter bus.
   */
  public playEnemyShout(type: EnemyShoutType = 'spotted', isOccluded = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const isSpotted = type === 'spotted';
    const duration = isSpotted ? 0.32 : 0.42;

    // Master vocal group gain
    const vocalGain = ctx.createGain();
    vocalGain.gain.setValueAtTime(0.001, now);
    vocalGain.gain.linearRampToValueAtTime(0.55, now + 0.025);
    vocalGain.gain.setValueAtTime(0.52, now + duration * 0.55);
    vocalGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Vocal cord oscillator: Sawtooth wave with human pitch modulation
    const voiceOsc = ctx.createOscillator();
    voiceOsc.type = 'sawtooth';
    if (isSpotted) {
      // Urgent, aggressive rise-then-fall bark ("Contact!")
      voiceOsc.frequency.setValueAtTime(175, now);
      voiceOsc.frequency.exponentialRampToValueAtTime(235, now + 0.08);
      voiceOsc.frequency.exponentialRampToValueAtTime(160, now + duration);
    } else {
      // Frustrated/searching descending shout ("Lost visual!")
      voiceOsc.frequency.setValueAtTime(215, now);
      voiceOsc.frequency.exponentialRampToValueAtTime(175, now + 0.12);
      voiceOsc.frequency.exponentialRampToValueAtTime(135, now + duration);
    }

    // Formant 1: Vocal tract chest resonance (Bandpass ~680Hz)
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.setValueAtTime(isSpotted ? 720 : 640, now);
    f1.Q.setValueAtTime(3.2, now);

    // Formant 2: Oral cavity vowel formant (Bandpass ~1450-1850Hz)
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.setValueAtTime(isSpotted ? 1550 : 1780, now);
    f2.Q.setValueAtTime(4.0, now);

    // Parallel formant routing
    voiceOsc.connect(f1);
    voiceOsc.connect(f2);
    f1.connect(vocalGain);
    f2.connect(vocalGain);

    // Consonant attack / throat noise burst
    const noiseLen = 0.055;
    const noiseSamples = Math.floor(ctx.sampleRate * noiseLen);
    const noiseBuf = ctx.createBuffer(1, noiseSamples, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseSamples; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseSamples * 0.35));
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(isSpotted ? 2400 : 2000, now);
    noiseFilter.Q.setValueAtTime(1.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLen);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(vocalGain);

    // Route through acoustic occlusion system
    this.connectSourceWithOcclusion(ctx, vocalGain, true, isOccluded, [voiceOsc, noiseSrc]);

    voiceOsc.start(now);
    voiceOsc.stop(now + duration + 0.02);
    noiseSrc.start(now);
  }

  /**
   * Loud Metallic Locker Door Blast & Slam Sound Effect for Locker Ambushes
   */
  public playLockerAmbushSlam(isOccluded = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Heavy metallic sheet-metal impact clang (inharmonic FM clang)
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const outGain = ctx.createGain();

    carrier.type = 'square';
    carrier.frequency.setValueAtTime(285, now);
    carrier.frequency.exponentialRampToValueAtTime(82, now + 0.32);

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(640, now);
    modGain.gain.setValueAtTime(420, now);
    modGain.gain.exponentialRampToValueAtTime(10, now + 0.25);

    outGain.gain.setValueAtTime(0.62, now);
    outGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(outGain);
    this.connectSourceWithOcclusion(ctx, outGain, true, isOccluded, [carrier, mod]);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.39);
    carrier.stop(now + 0.39);

    // 2. High-energy metallic door slam rattle burst
    const dur = 0.28;
    const samples = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.25));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1350, now);
    bp.Q.setValueAtTime(1.4, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.55, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(bp);
    bp.connect(nGain);
    this.connectSourceWithOcclusion(ctx, nGain, true, isOccluded, noise);
    noise.start(now);
  }

  /**
   * Fast aerodynamic whoosh of a combat knife blade slashing through the air
   */
  public playKnifeSlash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const dur = 0.16;
    const samples = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      const env = Math.sin((i / samples) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(800, now);
    bp.frequency.exponentialRampToValueAtTime(1950, now + 0.07);
    bp.frequency.exponentialRampToValueAtTime(450, now + dur);
    bp.Q.setValueAtTime(2.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.38, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Visceral wet organic flesh impact audio cue (heavy meat thud + cutting wet squelch)
   */
  public playFleshImpact() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Deep sub-frequency visceral meat impact thud
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);

    // 2. Wet cutting slice squelch (FM modulated squish)
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const carrier = ctx.createOscillator();
    const cGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(420, now);
    carrier.frequency.exponentialRampToValueAtTime(95, now + 0.12);

    mod.type = 'sawtooth';
    mod.frequency.setValueAtTime(140, now);
    modGain.gain.setValueAtTime(260, now);
    modGain.gain.exponentialRampToValueAtTime(10, now + 0.11);

    cGain.gain.setValueAtTime(0.42, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    mod.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(cGain);
    cGain.connect(ctx.destination);

    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.14);
    carrier.stop(now + 0.14);

    // 3. Sharp high-frequency bone/cartilage snap crack
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'square';
    snapOsc.frequency.setValueAtTime(1250, now);
    snapOsc.frequency.exponentialRampToValueAtTime(220, now + 0.035);
    snapGain.gain.setValueAtTime(0.28, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.045);
  }

  /**
   * Player jump upward spring / tactical gear rustle
   */
  public playJump() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  /**
   * Tactical crouch knee-bend / clothing rustle
   */
  public playCrouch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const dur = 0.12;
    const samples = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < samples; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(450, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Colt SAA Single-Action 4-click metallic hammer cock & cylinder index ratchet
   */
  public playRevolverHammerCock() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 4-click Colt SAA sear ratchet clicks (C-O-L-T)
    const clickOffsets = [0, 0.018, 0.036, 0.056];
    const clickFreqs = [2100, 2450, 2800, 3300];
    for (let i = 0; i < clickOffsets.length; i++) {
      const t = now + clickOffsets[i];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(clickFreqs[i], t);
      osc.frequency.exponentialRampToValueAtTime(750, t + 0.014);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.016);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.018);
    }
  }

  /**
   * Colt SAA loading gate snap open / close
   */
  public playRevolverGateLatch(open = true) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(open ? 1400 : 1950, now);
    osc.frequency.exponentialRampToValueAtTime(open ? 2400 : 950, now + 0.035);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /**
   * Colt SAA ejector rod push & spent brass casing ping
   */
  public playRevolverShellEject() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Ejector rod spring scrape
    const rodOsc = ctx.createOscillator();
    const rodGain = ctx.createGain();
    rodOsc.type = 'sawtooth';
    rodOsc.frequency.setValueAtTime(580, now);
    rodOsc.frequency.exponentialRampToValueAtTime(1250, now + 0.045);
    rodGain.gain.setValueAtTime(0.16, now);
    rodGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    rodOsc.connect(rodGain);
    rodGain.connect(ctx.destination);
    rodOsc.start(now);
    rodOsc.stop(now + 0.055);

    // 2. High-pitched brass casing ring
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    ringOsc.frequency.setValueAtTime(4200 + Math.random() * 400, now + 0.03);
    ringOsc.frequency.exponentialRampToValueAtTime(2900, now + 0.14);
    ringGain.gain.setValueAtTime(0.18, now + 0.03);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.145);
    ringOsc.connect(ringGain);
    ringGain.connect(ctx.destination);
    ringOsc.start(now + 0.03);
    ringOsc.stop(now + 0.15);
  }

  /**
   * Colt SAA single .45 Colt cartridge sliding into cylinder chamber + index click
   */
  public playRevolverBulletInsert() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Brass cartridge slide + chamber seat thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(1680, now + 0.045);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);

    // Cylinder index ratchet click
    const idxOsc = ctx.createOscillator();
    const idxGain = ctx.createGain();
    idxOsc.type = 'sine';
    idxOsc.frequency.setValueAtTime(2600, now + 0.05);
    idxOsc.frequency.exponentialRampToValueAtTime(1100, now + 0.075);
    idxGain.gain.setValueAtTime(0.2, now + 0.05);
    idxGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    idxOsc.connect(idxGain);
    idxGain.connect(ctx.destination);
    idxOsc.start(now + 0.05);
    idxOsc.stop(now + 0.085);
  }

  /**
   * Colt SAA Freestyle Gun-Spinning metallic cylinder whirl & air whoosh
   */
  public playRevolverSpinTwirl() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Rapid ratchet clicks simulating spinning cylinder & trigger guard twirl
    for (let i = 0; i < 8; i++) {
      const t = now + i * 0.042;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1850 + (i % 3) * 320, t);
      osc.frequency.exponentialRampToValueAtTime(820, t + 0.018);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.025);
    }
  }
}

export const soundEngine = new TacticalSoundEngine();



