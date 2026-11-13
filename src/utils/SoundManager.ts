/**
 * Web Audio API を用いたプロシージャル音響生成クラス
 * 外部音声ファイルに依存せず、レトロな業務用エレベーターの駆動音・ベル・怪異ノイズを合成する
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorLfo: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  private fanNoiseNode: AudioNode | null = null;
  private fanRattleOsc: OscillatorNode | null = null;
  private fanTurbineOsc: OscillatorNode | null = null;
  private fanGain: GainNode | null = null;
  private fanAutoStopTimer: number | null = null;

  private heartbeatTimer: number | null = null;
  private miasmaNoiseNode: AudioNode | null = null;
  private miasmaGain: GainNode | null = null;

  private anomalyOsc1: OscillatorNode | null = null;
  private anomalyOsc2: OscillatorNode | null = null;
  private anomalyGain: GainNode | null = null;
  private pryingNoiseNode: AudioNode | null = null;
  private pryingGain: GainNode | null = null;

  private cabinRattleNoiseNode: AudioNode | null = null;
  private cabinRattleLfo1: OscillatorNode | null = null;
  private cabinRattleLfo2: OscillatorNode | null = null;
  private cabinRattleSubOsc: OscillatorNode | null = null;
  private cabinRattleGain: GainNode | null = null;
  private cabinCreakTimer: number | null = null;

  private doorNodes: AudioScheduledSourceNode[] = [];
  private doorMasterGain: GainNode | null = null;

  private morningAmbienceNodes: AudioScheduledSourceNode[] = [];
  private morningAmbienceGain: GainNode | null = null;
  private morningBirdTimer: number | null = null;

  private muted: boolean = false;

  /**
   * ユーザー操作（タイトル画面クリック等）で AudioContext を初期化・再開する
   */
  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(mute: boolean, isGameActive: boolean = true): void {
    this.muted = mute;
    if (this.muted) {
      this.stopCabinRattle();
      this.stopMotorDrone();
      this.stopDoorMotor();
      this.stopRapidVentilation();
      this.stopMiasmaHeartbeat();
      this.stopAnomalyPresence();
      this.stopPryingLoop();
      this.stopMorningAmbience();
    } else if (isGameActive) {
      this.startCabinRattle();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * ポーズ時に全オーディオコンテキストを一時停止する
   */
  public pauseAudio(): void {
    this.stopDoorMotor();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  /**
   * ポーズ解除時にオーディオコンテキストを再開する
   */
  public resumeAudio(): void {
    if (!this.muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * 1. 移動中の低いモーター駆動音（ドローン音＋ワイヤーの周期的な軋み）
   */
  public startMotorDrone(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopMotorDrone();

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.20, now + 0.4);

    // ローパスフィルターでくぐもった鉄箱の響きを作る
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(145, now);
    filter.Q.setValueAtTime(4.0, now);

    // 低周波モーター基本波
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(52, now);

    // うなりを生む第2オシレーター
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(78.5, now);

    // 周期的な揺れ（ガタゴト感）を作るLFO（振幅・周波数を強化してガタガタ感を明確に）
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3.4, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(45, now);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.motorOsc1 = osc1;
    this.motorOsc2 = osc2;
    this.motorLfo = lfo;
    this.motorGain = masterGain;
  }

  public stopMotorDrone(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.motorGain) {
      try {
        this.motorGain.gain.cancelScheduledValues(now);
        this.motorGain.gain.setValueAtTime(Math.max(this.motorGain.gain.value, 0.001), now);
        this.motorGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } catch {
        // ignore
      }
    }
    const osc1 = this.motorOsc1;
    const osc2 = this.motorOsc2;
    const lfo = this.motorLfo;
    this.motorOsc1 = null;
    this.motorOsc2 = null;
    this.motorLfo = null;
    this.motorGain = null;

    setTimeout(() => {
      try { osc1?.stop(); osc1?.disconnect(); } catch { /* noop */ }
      try { osc2?.stop(); osc2?.disconnect(); } catch { /* noop */ }
      try { lfo?.stop(); lfo?.disconnect(); } catch { /* noop */ }
    }, 280);
  }

  /**
   * 1-B. 常時微小に鳴り続ける不穏なガタガタ・振動・きしみ環境音
   * 暗いシャフトに吊られた金属箱の微弱な振動、不規則なワイヤーのきしみ、低周波のうなり
   */
  public startCabinRattle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopCabinRattle();

    const now = ctx.currentTime;

    // 全体ゲイン（邪魔にならず、しかし静寂の中で確実に不安を煽る微小なガタガタ音量）
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.065, now + 0.6);

    // 1. 籠の微細な金属ガタつき（ブラウンノイズ ＋ 195Hz帯域フィルター ＋ 3.6Hz揺らぎLFO）
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.05 * white) / 1.05;
      data[i] = lastOut * 2.8;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const rattleFilter = ctx.createBiquadFilter();
    rattleFilter.type = 'bandpass';
    rattleFilter.frequency.setValueAtTime(195, now);
    rattleFilter.Q.setValueAtTime(4.5, now);

    // 不安感を醸し出すガタつき揺らぎLFO
    const lfo1 = ctx.createOscillator();
    lfo1.type = 'sine';
    lfo1.frequency.setValueAtTime(3.6, now);

    const lfo1Gain = ctx.createGain();
    lfo1Gain.gain.setValueAtTime(38, now);
    lfo1.connect(lfo1Gain);
    lfo1Gain.connect(rattleFilter.frequency);

    // 2. シャフト深部の超低周波のうなり（43Hzサブサイン波）
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(43, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.35, now);
    subOsc.connect(subGain);
    subGain.connect(masterGain);

    noiseSource.connect(rattleFilter);
    rattleFilter.connect(masterGain);
    masterGain.connect(ctx.destination);

    noiseSource.start(now);
    lfo1.start(now);
    subOsc.start(now);

    this.cabinRattleNoiseNode = noiseSource;
    this.cabinRattleLfo1 = lfo1;
    this.cabinRattleSubOsc = subOsc;
    this.cabinRattleGain = masterGain;

    this.scheduleNextCabinCreak();
  }

  private scheduleNextCabinCreak(): void {
    if (this.cabinCreakTimer) {
      window.clearTimeout(this.cabinCreakTimer);
      this.cabinCreakTimer = null;
    }
    if (!this.cabinRattleGain || this.muted) return;

    // 2.8秒〜5.2秒ごとに不規則に発生する微細なワイヤーのきしみ・鉄板のたわみ音
    const delayMs = 2800 + Math.random() * 2400;
    this.cabinCreakTimer = window.setTimeout(() => {
      this.playSubtleCabinCreak();
      this.scheduleNextCabinCreak();
    }, delayMs);
  }

  private playSubtleCabinCreak(): void {
    if (this.muted || !this.ctx || !this.cabinRattleGain) return;
    const now = this.ctx.currentTime;

    const creakOsc = this.ctx.createOscillator();
    creakOsc.type = Math.random() < 0.5 ? 'sawtooth' : 'triangle';
    const baseFreq = 260 + Math.random() * 120;
    creakOsc.frequency.setValueAtTime(baseFreq, now);
    creakOsc.frequency.exponentialRampToValueAtTime(baseFreq * (0.8 + Math.random() * 0.4), now + 0.18);

    const creakFilter = this.ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(baseFreq, now);
    creakFilter.Q.setValueAtTime(8.0, now);

    const creakGain = this.ctx.createGain();
    creakGain.gain.setValueAtTime(0.001, now);
    creakGain.gain.linearRampToValueAtTime(0.022, now + 0.03);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    creakOsc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(this.ctx.destination);

    creakOsc.start(now);
    creakOsc.stop(now + 0.25);
  }

  public stopCabinRattle(): void {
    if (this.cabinCreakTimer) {
      window.clearTimeout(this.cabinCreakTimer);
      this.cabinCreakTimer = null;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.cabinRattleGain) {
      try {
        this.cabinRattleGain.gain.cancelScheduledValues(now);
        this.cabinRattleGain.gain.setValueAtTime(Math.max(this.cabinRattleGain.gain.value, 0.001), now);
        this.cabinRattleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      } catch { /* ignore */ }
    }
    const noiseNode = this.cabinRattleNoiseNode;
    const lfo1 = this.cabinRattleLfo1;
    const lfo2 = this.cabinRattleLfo2;
    const subOsc = this.cabinRattleSubOsc;
    const gain = this.cabinRattleGain;
    this.cabinRattleNoiseNode = null;
    this.cabinRattleLfo1 = null;
    this.cabinRattleLfo2 = null;
    this.cabinRattleSubOsc = null;
    this.cabinRattleGain = null;

    setTimeout(() => {
      try {
        if (noiseNode && 'stop' in noiseNode && typeof (noiseNode as AudioScheduledSourceNode).stop === 'function') {
          (noiseNode as AudioScheduledSourceNode).stop();
        }
        noiseNode?.disconnect();
      } catch { /* ignore */ }
      try { lfo1?.stop(); lfo1?.disconnect(); } catch { /* ignore */ }
      try { lfo2?.stop(); lfo2?.disconnect(); } catch { /* ignore */ }
      try { subOsc?.stop(); subOsc?.disconnect(); } catch { /* ignore */ }
      try { gain?.disconnect(); } catch { /* ignore */ }
    }, 320);
  }

  /**
   * 2. 階到着時のレトロなベル音（「チーン」）
   * 倍音構成で古い金属ベルの響きを再現（音量を控えめに調整）
   */
  public playArrivalChime(isAnomalyFloor: boolean = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 怪異階でも一見普通だが僅かにピッチが狂う演出も可能
    const detuneFactor = isAnomalyFloor ? 0.985 : 1.0;
    const partials = [
      { freq: 1046.5 * detuneFactor, amp: 0.10, decay: 1.8 },
      { freq: 2093.0 * detuneFactor, amp: 0.05, decay: 1.2 },
      { freq: 3185.0 * detuneFactor, amp: 0.028, decay: 0.65 },
      { freq: 4430.0 * detuneFactor, amp: 0.014, decay: 0.3 },
    ];

    partials.forEach(({ freq, amp, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(amp, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decay + 0.05);
    });
  }

  /**
   * ブラウンノイズ（重厚な低域摩擦・鉄の質量感を持つノイズ）バッファを生成するヘルパー
   */
  private createHeavyFrictionBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // 積分フィルタによる重厚なブラウンノイズ生成（安っぽい高域のシャリシャリ感を排除）
      lastOut = (lastOut + 0.045 * white) / 1.045;
      // 微細な金属粒子のザラつきをほんの少しブレンド
      data[i] = lastOut * 3.2 + white * 0.06;
    }
    return buffer;
  }

  /**
   * 3-A. 操作盤ボタン押下音（重厚な旧式配電盤・電磁リレーと鋳鉄ボタンの機構音）
   * 「ガチッ…ズン」という鉄製制御盤のスイッチを押し込んだ手応えを合成する
   */
  public playButtonClick(variant: 'OPEN' | 'CLOSE' | 'SWITCH' | 'PAPER' = 'SWITCH'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (variant === 'PAPER') {
      // 古びた厚紙の通達文書をめくる音
      const buffer = this.createHeavyFrictionBuffer(ctx, 0.09);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(1.4, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.09);
      return;
    }

    // 1. 鉄製ボタン筐体を押し込んだ時の重低音（「ズッ / ゴッ」）
    const thumpFreq = variant === 'CLOSE' ? 58 : variant === 'OPEN' ? 68 : 62;
    const thumpOsc = ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(thumpFreq * 1.4, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(26, now + 0.075);

    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.24, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.085);

    // 2. 制御盤内部の電磁接触器（コンタクタ）が噛み合う金属衝撃ノイズ（「ガチッ」）
    const snapBuffer = this.createHeavyFrictionBuffer(ctx, 0.055);
    const snapNoise = ctx.createBufferSource();
    snapNoise.buffer = snapBuffer;

    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(variant === 'CLOSE' ? 420 : 520, now);
    snapFilter.Q.setValueAtTime(3.0, now);

    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.28, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    snapNoise.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapNoise.start(now);
    snapNoise.stop(now + 0.055);

    // 3. 2段目の機械式ラッチ爪の金属反響（18ms遅れて「カッ」と鳴り、重厚な二段スイッチ感を出す）
    const relayDelay = 0.018;
    const relayOsc1 = ctx.createOscillator();
    const relayOsc2 = ctx.createOscillator();
    relayOsc1.type = 'sawtooth';
    relayOsc2.type = 'triangle';
    // 非整数倍音による鉄の乾いた響き
    const baseMetal = variant === 'CLOSE' ? 280 : variant === 'OPEN' ? 340 : 310;
    relayOsc1.frequency.setValueAtTime(baseMetal, now + relayDelay);
    relayOsc1.frequency.exponentialRampToValueAtTime(95, now + relayDelay + 0.04);
    relayOsc2.frequency.setValueAtTime(baseMetal * 1.47, now + relayDelay);
    relayOsc2.frequency.exponentialRampToValueAtTime(135, now + relayDelay + 0.04);

    const relayFilter = ctx.createBiquadFilter();
    relayFilter.type = 'lowpass';
    relayFilter.frequency.setValueAtTime(900, now + relayDelay);

    const relayGain = ctx.createGain();
    relayGain.gain.setValueAtTime(0.001, now + relayDelay);
    relayGain.gain.linearRampToValueAtTime(0.11, now + relayDelay + 0.003);
    relayGain.gain.exponentialRampToValueAtTime(0.001, now + relayDelay + 0.045);

    relayOsc1.connect(relayFilter);
    relayOsc2.connect(relayFilter);
    relayFilter.connect(relayGain);
    relayGain.connect(ctx.destination);

    relayOsc1.start(now + relayDelay);
    relayOsc2.start(now + relayDelay);
    relayOsc1.stop(now + relayDelay + 0.05);
    relayOsc2.stop(now + relayDelay + 0.05);
  }

  /**
   * 3-B. 扉の長押し開扉中：重厚な鉛・鋳鉄扉の連続駆動音（「ゴォォォ……ガラガラガラ……ギィ……」という重い鉄塊の牽引音）
   * 高い電子モーター音ではなく、古い巻上げチェーン・鋳鉄ハンガーローラー・床溝を擦る重い鉄扉の質量感を合成する
   */
  public startDoorMotor(direction: 'OPEN' | 'CLOSE' = 'OPEN'): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopDoorMotor();

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.24, now + 0.14);
    masterGain.connect(ctx.destination);

    // 0. 起動瞬間の電磁クラッチ接続ショック（「ガコンッ」）
    const clunkOsc = ctx.createOscillator();
    clunkOsc.type = 'sawtooth';
    clunkOsc.frequency.setValueAtTime(92, now);
    clunkOsc.frequency.exponentialRampToValueAtTime(28, now + 0.12);
    const clunkFilter = ctx.createBiquadFilter();
    clunkFilter.type = 'lowpass';
    clunkFilter.frequency.setValueAtTime(220, now);
    const clunkGain = ctx.createGain();
    clunkGain.gain.setValueAtTime(0.65, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    clunkOsc.connect(clunkFilter);
    clunkFilter.connect(clunkGain);
    clunkGain.connect(masterGain);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.14);

    // 1. 重低音トルク駆動・鉄箱共鳴（「ゴォォォォ……」：44Hz & 66.5Hzの太い低域うなり）
    const subOsc1 = ctx.createOscillator();
    const subOsc2 = ctx.createOscillator();
    subOsc1.type = 'sawtooth';
    subOsc2.type = 'triangle';

    const baseSub = direction === 'OPEN' ? 43 : 48;
    subOsc1.frequency.setValueAtTime(baseSub, now);
    subOsc1.frequency.linearRampToValueAtTime(baseSub + (direction === 'OPEN' ? 6 : -6), now + 2.0);

    subOsc2.frequency.setValueAtTime(baseSub * 1.51, now); // 5度系の重厚なうなり
    subOsc2.frequency.linearRampToValueAtTime((baseSub + (direction === 'OPEN' ? 6 : -6)) * 1.51, now + 2.0);

    const subFilter = ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.setValueAtTime(145, now);
    subFilter.Q.setValueAtTime(3.2, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.55, now);

    subOsc1.connect(subFilter);
    subOsc2.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(masterGain);

    // 2. 重量鉄扉が床の敷居溝（シル）と上部鋳鉄レールを擦る重摩擦音（「ズズズズ……ゴロゴロ……」ブラウンノイズ）
    const frictionBuffer = this.createHeavyFrictionBuffer(ctx, 2.4);
    const frictionNoise = ctx.createBufferSource();
    frictionNoise.buffer = frictionBuffer;
    frictionNoise.loop = true;

    const frictionFilter = ctx.createBiquadFilter();
    frictionFilter.type = 'bandpass';
    frictionFilter.frequency.setValueAtTime(155, now);
    frictionFilter.Q.setValueAtTime(1.5, now);

    // 鋳鉄製ハンガーローラーが偏心回転する周期的なうねり（6.5Hz）
    const rollerLfo = ctx.createOscillator();
    rollerLfo.type = 'sine';
    rollerLfo.frequency.setValueAtTime(6.5, now);
    const rollerLfoGain = ctx.createGain();
    rollerLfoGain.gain.setValueAtTime(65, now);
    rollerLfo.connect(rollerLfoGain);
    rollerLfoGain.connect(frictionFilter.frequency);

    const frictionGain = ctx.createGain();
    frictionGain.gain.setValueAtTime(0.75, now);

    frictionNoise.connect(frictionFilter);
    frictionFilter.connect(frictionGain);
    frictionGain.connect(masterGain);

    // 3. チェーン・ギアの噛み合い振動（「ガタガタガタ…」という鉄の歯車感：14Hzパルス）
    const gearOsc = ctx.createOscillator();
    gearOsc.type = 'square';
    gearOsc.frequency.setValueAtTime(14.5, now);

    const gearResonator = ctx.createBiquadFilter();
    gearResonator.type = 'bandpass';
    gearResonator.frequency.setValueAtTime(235, now);
    gearResonator.Q.setValueAtTime(5.5, now);

    const gearGain = ctx.createGain();
    gearGain.gain.setValueAtTime(0.28, now);

    gearOsc.connect(gearResonator);
    gearResonator.connect(gearGain);
    gearGain.connect(masterGain);

    // 4. 古びた鉄扉のかすかな金属きしみ倍音（耳障りにならないよう控えめに混じる不穏な金属共鳴）
    const creakOsc = ctx.createOscillator();
    creakOsc.type = 'sawtooth';
    creakOsc.frequency.setValueAtTime(310, now);
    creakOsc.frequency.linearRampToValueAtTime(275, now + 0.9);
    creakOsc.frequency.linearRampToValueAtTime(325, now + 1.8);

    const creakFilter = ctx.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.frequency.setValueAtTime(310, now);
    creakFilter.Q.setValueAtTime(8.0, now);

    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0.06, now);

    creakOsc.connect(creakFilter);
    creakFilter.connect(creakGain);
    creakGain.connect(masterGain);

    subOsc1.start(now);
    subOsc2.start(now);
    frictionNoise.start(now);
    rollerLfo.start(now);
    gearOsc.start(now);
    creakOsc.start(now);

    this.doorMasterGain = masterGain;
    this.doorNodes = [subOsc1, subOsc2, frictionNoise, rollerLfo, gearOsc, creakOsc];
  }

  /**
   * 扉モーター音の停止
   */
  public stopDoorMotor(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gain = this.doorMasterGain;
    const nodes = this.doorNodes;
    this.doorMasterGain = null;
    this.doorNodes = [];

    if (gain) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.001), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
          n.disconnect();
        } catch {
          // ignore
        }
      }
      try {
        gain?.disconnect();
      } catch {
        // ignore
      }
    }, 160);
  }

  /**
   * 3-C. 扉の単発スライド駆動音（各階到着時の隙間開放、指を離した時の戻り、閉扉時の重厚な鉄扉スライド音）
   * 「ゴロゴロ……ズズッ……」という重い鋳鉄の塊がレールを滑る音を鳴らす
   */
  public playDoorSlide(durationSec: number = 0.45, pitchUp: boolean = true): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.24, now + 0.04);
    masterGain.gain.setValueAtTime(0.22, now + Math.max(0.05, durationSec * 0.65));
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + durationSec + 0.06);
    masterGain.connect(ctx.destination);

    // 1. 動き出しの機械クラッチ・リンク機構の衝撃音（「ガコン」）
    const startImpactOsc = ctx.createOscillator();
    startImpactOsc.type = 'sawtooth';
    startImpactOsc.frequency.setValueAtTime(pitchUp ? 82 : 70, now);
    startImpactOsc.frequency.exponentialRampToValueAtTime(26, now + 0.1);

    const startImpactFilter = ctx.createBiquadFilter();
    startImpactFilter.type = 'lowpass';
    startImpactFilter.frequency.setValueAtTime(190, now);

    const startImpactGain = ctx.createGain();
    startImpactGain.gain.setValueAtTime(0.55, now);
    startImpactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    startImpactOsc.connect(startImpactFilter);
    startImpactFilter.connect(startImpactGain);
    startImpactGain.connect(masterGain);
    startImpactOsc.start(now);
    startImpactOsc.stop(now + 0.12);

    // 2. 重低音モーター＆鉄扉の筐体共鳴（42Hz〜65Hzの低い唸り）
    const bodyOsc1 = ctx.createOscillator();
    const bodyOsc2 = ctx.createOscillator();
    bodyOsc1.type = 'sawtooth';
    bodyOsc2.type = 'triangle';

    const fStart = pitchUp ? 44 : 54;
    const fEnd = pitchUp ? 54 : 38;
    bodyOsc1.frequency.setValueAtTime(fStart, now);
    bodyOsc1.frequency.linearRampToValueAtTime(fEnd, now + durationSec);

    bodyOsc2.frequency.setValueAtTime(fStart * 1.48, now);
    bodyOsc2.frequency.linearRampToValueAtTime(fEnd * 1.48, now + durationSec);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(150, now);
    bodyFilter.Q.setValueAtTime(2.8, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.5, now);

    bodyOsc1.connect(bodyFilter);
    bodyOsc2.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(masterGain);

    bodyOsc1.start(now);
    bodyOsc2.start(now);
    bodyOsc1.stop(now + durationSec + 0.06);
    bodyOsc2.stop(now + durationSec + 0.06);

    // 3. 重い鉄製ローラーと敷居レールの摩擦音（ブラウンノイズによる「ゴロゴロ…ズズッ…」）
    const frictionBuffer = this.createHeavyFrictionBuffer(ctx, durationSec + 0.06);
    const frictionNoise = ctx.createBufferSource();
    frictionNoise.buffer = frictionBuffer;

    const railFilter = ctx.createBiquadFilter();
    railFilter.type = 'bandpass';
    railFilter.frequency.setValueAtTime(pitchUp ? 135 : 175, now);
    railFilter.frequency.linearRampToValueAtTime(pitchUp ? 185 : 115, now + durationSec);
    railFilter.Q.setValueAtTime(1.6, now);

    const frictionGain = ctx.createGain();
    frictionGain.gain.setValueAtTime(0.85, now);

    frictionNoise.connect(railFilter);
    railFilter.connect(frictionGain);
    frictionGain.connect(masterGain);

    frictionNoise.start(now);
    frictionNoise.stop(now + durationSec + 0.06);

    // 4. チェーン・ハンガーの金属振動（15Hzの周期パルス）
    const rattleOsc = ctx.createOscillator();
    rattleOsc.type = 'square';
    rattleOsc.frequency.setValueAtTime(pitchUp ? 14 : 16, now);

    const rattleFilter = ctx.createBiquadFilter();
    rattleFilter.type = 'bandpass';
    rattleFilter.frequency.setValueAtTime(220, now);
    rattleFilter.Q.setValueAtTime(5.0, now);

    const rattleGain = ctx.createGain();
    rattleGain.gain.setValueAtTime(0.25, now);

    rattleOsc.connect(rattleFilter);
    rattleFilter.connect(rattleGain);
    rattleGain.connect(masterGain);

    rattleOsc.start(now);
    rattleOsc.stop(now + durationSec + 0.05);
  }

  /**
   * 3-D. 扉が完全に閉まり切った瞬間の重厚な鉄扉衝突・安全ラッチ施錠音（「ドォンッ…ガチャン！」）
   * 左右の分厚い鉄扉がぶつかり合い、上部の重い鉄製ロックボルトが落ちる重厚な密閉音
   */
  public playDoorLatchShut(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 分厚い鉄扉同士が中央でぶつかる重低音インパクト（「ドォンッ…」）
    const slamOsc = ctx.createOscillator();
    slamOsc.type = 'sawtooth';
    slamOsc.frequency.setValueAtTime(86, now);
    slamOsc.frequency.exponentialRampToValueAtTime(24, now + 0.24);

    const slamFilter = ctx.createBiquadFilter();
    slamFilter.type = 'lowpass';
    slamFilter.frequency.setValueAtTime(155, now);
    slamFilter.Q.setValueAtTime(3.0, now);

    const slamGain = ctx.createGain();
    slamGain.gain.setValueAtTime(0.28, now);
    slamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    slamOsc.connect(slamFilter);
    slamFilter.connect(slamGain);
    slamGain.connect(ctx.destination);
    slamOsc.start(now);
    slamOsc.stop(now + 0.28);

    // 2. 鉄板とゴム緩衝材が潰れる重摩擦ショックノイズ
    const thudBuffer = this.createHeavyFrictionBuffer(ctx, 0.18);
    const thudNoise = ctx.createBufferSource();
    thudNoise.buffer = thudBuffer;

    const thudFilter = ctx.createBiquadFilter();
    thudFilter.type = 'lowpass';
    thudFilter.frequency.setValueAtTime(210, now);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.32, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    thudNoise.connect(thudFilter);
    thudFilter.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudNoise.start(now);
    thudNoise.stop(now + 0.18);

    // 3. 上部インターロックの重い鉄製カンヌキ（施錠ボルト）が落ちる音（「ガチャン！」）
    const boltTimes = [0.035, 0.085];
    const boltBaseFreqs = [240, 185];

    boltTimes.forEach((delay, idx) => {
      const f = boltBaseFreqs[idx];
      // 非整数倍の金属クラング（鉄の塊が噛み合う音）
      [1.0, 1.46, 2.12].forEach((ratio) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f * ratio, now + delay);
        osc.frequency.exponentialRampToValueAtTime(f * ratio * 0.48, now + delay + 0.08);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(f * ratio, now + delay);
        filter.Q.setValueAtTime(3.5, now + delay);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.linearRampToValueAtTime(0.075 / ratio, now + delay + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.085);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.09);
      });
    });
  }

  /**
   * 3-E. 扉が全開（100%）に達し、戸袋の奥の鉄製ストッパーに当たって停止する重厚音（「ゴツン…ガch」）
   */
  public playDoorBumperStop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 戸袋の奥のゴム・鉄枠に重量扉が突き当たる重低音
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(78, now);
    osc.frequency.exponentialRampToValueAtTime(26, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // 戸袋内でハンガーリンクが止まる低い金属音
    const clackBuffer = this.createHeavyFrictionBuffer(ctx, 0.09);
    const clackNoise = ctx.createBufferSource();
    clackNoise.buffer = clackBuffer;

    const clackFilter = ctx.createBiquadFilter();
    clackFilter.type = 'bandpass';
    clackFilter.frequency.setValueAtTime(260, now + 0.02);
    clackFilter.Q.setValueAtTime(2.5, now + 0.02);

    const clackGain = ctx.createGain();
    clackGain.gain.setValueAtTime(0.18, now + 0.02);
    clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    clackNoise.connect(clackFilter);
    clackFilter.connect(clackGain);
    clackGain.connect(ctx.destination);
    clackNoise.start(now + 0.02);
    clackNoise.stop(now + 0.1);
  }

  /**
   * 怪異が扉をこじ開けようとする時の激しい金属打撃音・軋み摩擦音・衝撃波（「ドガンッ！！ キギギギ……！」）
   */
  public playDoorBang(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 重低音の金属衝撃打撃波（エレベーターの鉄箱全体が激震する音、耳に刺さらないよう音量バランス調整）
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(140, now);
    bassOsc.frequency.exponentialRampToValueAtTime(28, now + 0.35);

    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0.22, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    bassOsc.start(now);
    bassOsc.stop(now + 0.42);

    // 2. 金属板が叩きつけられる高音の鉄打撃クラスター
    [540, 780, 1120].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq + idx * 45, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    });

    // 3. 爪や鉄板が無理やりこじ開けられる金切り摩擦ノイズ（「ギギギギッ！」）
    const bufferSize = Math.floor(ctx.sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (i % 20 < 10 ? 1 : -0.8);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1800, now);
    filter.frequency.linearRampToValueAtTime(650, now + 0.35);
    filter.Q.setValueAtTime(6.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.10, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.36);
  }

  /**
   * 急速換気（FAN）3秒間の重く激しい排気ファン音（「ブォォォォ…」）とダクト振動音（「ガタガタガタ…」）
   */
  public startRapidVentilation(durationMs: number = 3000): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopRapidVentilation();

    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.24, now + 0.18);
    masterGain.gain.setValueAtTime(0.24, now + Math.max(0.2, durationSec - 0.35));
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    // 1. 「ブォォォォ…」という重く激しい排気気流ノイズ
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // ブラウンノイズ寄りの重厚な風切り音
      data[i] = (lastOut + 0.08 * white) / 1.08;
      lastOut = data[i];
      data[i] *= 2.5;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    const exhaustFilter = ctx.createBiquadFilter();
    exhaustFilter.type = 'bandpass';
    exhaustFilter.frequency.setValueAtTime(140, now);
    exhaustFilter.frequency.exponentialRampToValueAtTime(340, now + 0.3);
    exhaustFilter.frequency.setValueAtTime(310, now + Math.max(0.35, durationSec - 0.4));
    exhaustFilter.frequency.exponentialRampToValueAtTime(95, now + durationSec);
    exhaustFilter.Q.setValueAtTime(1.4, now);

    // 2. 重い排気タービン低音うなり
    const turbineOsc = ctx.createOscillator();
    turbineOsc.type = 'sawtooth';
    turbineOsc.frequency.setValueAtTime(48, now);
    turbineOsc.frequency.exponentialRampToValueAtTime(92, now + 0.25);
    turbineOsc.frequency.setValueAtTime(88, now + Math.max(0.3, durationSec - 0.35));
    turbineOsc.frequency.exponentialRampToValueAtTime(42, now + durationSec);

    const turbineFilter = ctx.createBiquadFilter();
    turbineFilter.type = 'lowpass';
    turbineFilter.frequency.setValueAtTime(165, now);

    const turbineGain = ctx.createGain();
    turbineGain.gain.setValueAtTime(0.35, now);

    // 3. 「ガタガタガタ…」とダクトや鉄箱が振動する音（13Hzの周期的金属ガタつき）
    const rattleOsc = ctx.createOscillator();
    rattleOsc.type = 'square';
    rattleOsc.frequency.setValueAtTime(13.5, now);

    const rattleResonator = ctx.createBiquadFilter();
    rattleResonator.type = 'bandpass';
    rattleResonator.frequency.setValueAtTime(480, now);
    rattleResonator.Q.setValueAtTime(6.0, now);

    const rattleGain = ctx.createGain();
    rattleGain.gain.setValueAtTime(0.28, now);

    noiseSource.connect(exhaustFilter);
    exhaustFilter.connect(masterGain);

    turbineOsc.connect(turbineFilter);
    turbineFilter.connect(turbineGain);
    turbineGain.connect(masterGain);

    rattleOsc.connect(rattleResonator);
    rattleResonator.connect(rattleGain);
    rattleGain.connect(masterGain);

    masterGain.connect(ctx.destination);

    noiseSource.start(now);
    turbineOsc.start(now);
    rattleOsc.start(now);

    this.fanNoiseNode = noiseSource;
    this.fanTurbineOsc = turbineOsc;
    this.fanRattleOsc = rattleOsc;
    this.fanGain = masterGain;

    this.fanAutoStopTimer = window.setTimeout(() => {
      this.stopRapidVentilation();
    }, durationMs);
  }

  public stopRapidVentilation(): void {
    if (this.fanAutoStopTimer) {
      window.clearTimeout(this.fanAutoStopTimer);
      this.fanAutoStopTimer = null;
    }
    if (this.fanGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.fanGain.gain.cancelScheduledValues(now);
        this.fanGain.gain.setValueAtTime(Math.max(0.001, this.fanGain.gain.value), now);
        this.fanGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      } catch { /* ignore */ }
    }
    const noiseNode = this.fanNoiseNode;
    const turbine = this.fanTurbineOsc;
    const rattle = this.fanRattleOsc;
    this.fanNoiseNode = null;
    this.fanTurbineOsc = null;
    this.fanRattleOsc = null;
    this.fanGain = null;

    setTimeout(() => {
      try {
        if (noiseNode && 'stop' in noiseNode && typeof (noiseNode as AudioScheduledSourceNode).stop === 'function') {
          (noiseNode as AudioScheduledSourceNode).stop();
        }
        noiseNode?.disconnect();
      } catch { /* ignore */ }
      try { turbine?.stop(); turbine?.disconnect(); } catch { /* ignore */ }
      try { rattle?.stop(); rattle?.disconnect(); } catch { /* ignore */ }
    }, 200);
  }

  /**
   * 非常ベル／緊急照射（BELL）押下時の重厚な警報サイレン＆高圧滅菌レーザー照射音
   * - 旧式ビルの不気味な重低音機械式クラクションと高圧コンデンサ放電・アーク閃光音を合成
   */
  public playEmergencyBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 重厚な機械式ソレノイド投入音（「ガツンッ！」という硬質な鉄の打撃）
    const clunkOsc = ctx.createOscillator();
    const clunkGain = ctx.createGain();
    clunkOsc.type = 'triangle';
    clunkOsc.frequency.setValueAtTime(160, now);
    clunkOsc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    clunkGain.gain.setValueAtTime(0.32, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(ctx.destination);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.11);

    // 2. 不協和音の旧式防空・非常クラクション（「ブォォォン！ブォォォン！」と唸る重苦しい警報）
    [0, 0.36].forEach((offset) => {
      const start = now + offset;
      const horn1 = ctx.createOscillator();
      const horn2 = ctx.createOscillator();
      const subHorn = ctx.createOscillator();
      const hornFilter = ctx.createBiquadFilter();
      const hornGain = ctx.createGain();

      // 短二度・増四度の不気味な重工業クラクション周波数
      horn1.type = 'sawtooth';
      horn1.frequency.setValueAtTime(248, start);
      horn1.frequency.linearRampToValueAtTime(232, start + 0.32);

      horn2.type = 'sawtooth';
      horn2.frequency.setValueAtTime(352, start); // トライトーン（悪魔の音程）
      horn2.frequency.linearRampToValueAtTime(330, start + 0.32);

      subHorn.type = 'square';
      subHorn.frequency.setValueAtTime(124, start);

      hornFilter.type = 'bandpass';
      hornFilter.frequency.setValueAtTime(520, start);
      hornFilter.Q.setValueAtTime(1.8, start);

      hornGain.gain.setValueAtTime(0.001, start);
      hornGain.gain.linearRampToValueAtTime(0.22, start + 0.03);
      hornGain.gain.setValueAtTime(0.22, start + 0.24);
      hornGain.gain.exponentialRampToValueAtTime(0.001, start + 0.33);

      horn1.connect(hornFilter);
      horn2.connect(hornFilter);
      subHorn.connect(hornFilter);
      hornFilter.connect(hornGain);
      hornGain.connect(ctx.destination);

      horn1.start(start);
      horn2.start(start);
      subHorn.start(start);
      horn1.stop(start + 0.34);
      horn2.stop(start + 0.34);
      subHorn.stop(start + 0.34);
    });

    // 3. 高圧紫外線・防衛レーザー照射の電磁パルス放電音（「バチィィン！ジジジッ…ブゥゥン」）
    const zapStart = now + 0.04;
    const zapOsc = ctx.createOscillator();
    const zapGain = ctx.createGain();
    zapOsc.type = 'sawtooth';
    zapOsc.frequency.setValueAtTime(1650, zapStart);
    zapOsc.frequency.exponentialRampToValueAtTime(65, zapStart + 0.45);
    zapGain.gain.setValueAtTime(0.18, zapStart);
    zapGain.gain.exponentialRampToValueAtTime(0.001, zapStart + 0.48);
    zapOsc.connect(zapGain);
    zapGain.connect(ctx.destination);
    zapOsc.start(zapStart);
    zapOsc.stop(zapStart + 0.5);

    // 4. アーク放電スパーク・怪異が焼灼されるノイズバースト
    const bufferSize = Math.floor(ctx.sampleRate * 0.55);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // バチバチと弾ける高圧放電テクスチャ
      const crackle = Math.random() > 0.82 ? 1.8 : 0.45;
      data[i] = (Math.random() * 2 - 1) * crackle;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1850, zapStart);
    bandpass.frequency.exponentialRampToValueAtTime(420, zapStart + 0.5);
    bandpass.Q.setValueAtTime(1.4, zapStart);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.24, zapStart);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, zapStart + 0.52);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(zapStart);
    noise.stop(zapStart + 0.54);
  }

  /**
   * 4. クレーム発生時のインターホン警告音（ブザー）
   */
  public playComplaintBuzzer(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 2連ブザー「ブーーッ、ブーーッ」
    [0, 0.34].forEach((offset) => {
      const start = now + offset;
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165, start);

      subOsc.type = 'square';
      subOsc.frequency.setValueAtTime(173, start); // 不快なうなり

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.setValueAtTime(0.18, start + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      subOsc.start(start);
      osc.stop(start + 0.29);
      subOsc.stop(start + 0.29);
    });
  }

  /**
   * 5. 怪異侵入・ゲームオーバー時の不協和音ノイズ（ジャンプスケア）
   */
  public playJumpscareNoise(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const duration = 1.45;

    // 不協和音クラスター（三全音・短二度の密集）
    const freqs = [92.5, 98.0, 138.6, 277.2, 293.7, 587.3, 622.3, 1174.6];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), now + duration);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });

    // 激しいホワイトノイズバースト
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(0.8, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * 1階到達・ゲームクリア時の解放チャイム
   */
  public playClearChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.16;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 1.45);
    });
  }

  /**
   * 10F・5F チェックポイント到達時の管理室通信チャイム（「ピポーン」）
   */
  public playCheckpointNotice(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const tones = [
      { freq: 880, start: 0, duration: 0.22 },
      { freq: 659.25, start: 0.22, duration: 0.45 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
  }

  /**
   * 怪異・怪物が扉の隙間に姿を現した瞬間の恐怖演出音響
   * @param isPrying 扉をこじ開けようと飛びついてくるタイプかどうか
   */
  public playMonsterArrival(isPrying: boolean = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. 到着時の不協和音ホラードローン（低周波のうなりと冷気のような帯域）
    this.startAnomalyPresence();

    // 2. 短二度・減五度の不気味なクラスターバースト（一瞬の恐怖インパクト）
    [65.4, 69.3, 92.5, 138.6].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
    });

    // 3. こじ開け怪異の場合：到着して扉が開いた瞬間に「ドガァンッ！」と飛びついてくる金属打撃音を即座に再生
    if (isPrying) {
      this.playDoorBang();
      this.startPryingLoop();
    }
  }

  /**
   * 怪異が扉の向こうに滞在している間の持続的ホラードローン（低音のうなり）
   */
  public startAnomalyPresence(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopAnomalyPresence();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.14, now + 0.4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, now);

    // 短二度の唸り（55Hz と 58.3Hz）
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(58.3, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    this.anomalyOsc1 = osc1;
    this.anomalyOsc2 = osc2;
    this.anomalyGain = masterGain;
  }

  public stopAnomalyPresence(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.anomalyGain) {
      try {
        this.anomalyGain.gain.cancelScheduledValues(now);
        this.anomalyGain.gain.setValueAtTime(Math.max(this.anomalyGain.gain.value, 0.001), now);
        this.anomalyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      } catch { /* ignore */ }
    }
    const o1 = this.anomalyOsc1;
    const o2 = this.anomalyOsc2;
    this.anomalyOsc1 = null;
    this.anomalyOsc2 = null;
    this.anomalyGain = null;
    setTimeout(() => {
      try { o1?.stop(); o1?.disconnect(); } catch { /* noop */ }
      try { o2?.stop(); o2?.disconnect(); } catch { /* noop */ }
    }, 320);
  }

  /**
   * 怪異が扉をこじ開けようと力をかけ続けている間の持続的な金属軋み音ループ（「ギギ…ギギギ…」）
   */
  public startPryingLoop(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.pryingNoiseNode) return; // already active

    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // 擦れる不規則な摩擦音波形
      data[i] = (Math.random() * 2 - 1) * (i % 80 < 40 ? 1 : 0.3);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // LFOでフィルター周波数を揺らして「ギギ…ギギ…」と周期的に軋むリアルな音にする
    const lfo = ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.setValueAtTime(3.2, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(650, now);
    lfo.connect(lfoGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(7.5, now);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    lfo.start(now);

    this.pryingNoiseNode = source;
    this.pryingGain = gain;
  }

  public stopPryingLoop(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.pryingGain) {
      try {
        this.pryingGain.gain.cancelScheduledValues(now);
        this.pryingGain.gain.setValueAtTime(Math.max(this.pryingGain.gain.value, 0.001), now);
        this.pryingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      } catch { /* ignore */ }
    }
    const node = this.pryingNoiseNode;
    this.pryingNoiseNode = null;
    this.pryingGain = null;
    setTimeout(() => {
      try {
        if (node && 'stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node?.disconnect();
      } catch { /* noop */ }
    }, 220);
  }

  /**
   * 6. 扉を65%以上開けた瞬間、怪異が本性を現すグリッチ音・不協和音・関節の折れる音
   */
  public playPeekRevealGlitch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1) 首がガクッと折れる乾いた破砕ノイズバースト（「バキッ…ザザッ！」）
    const snapLen = Math.floor(ctx.sampleRate * 0.22);
    const snapBuf = ctx.createBuffer(1, snapLen, ctx.sampleRate);
    const snapData = snapBuf.getChannelData(0);
    for (let i = 0; i < snapLen; i++) {
      // グリッチ的な断続ノイズ
      const gate = (i % 1800) < 950 ? 1.0 : 0.15;
      snapData[i] = (Math.random() * 2 - 1) * gate;
    }

    const snapSource = ctx.createBufferSource();
    snapSource.buffer = snapBuf;

    const snapFilter = ctx.createBiquadFilter();
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(1650, now);
    snapFilter.frequency.exponentialRampToValueAtTime(320, now + 0.22);
    snapFilter.Q.setValueAtTime(3.5, now);

    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.32, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    snapSource.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapSource.start(now);
    snapSource.stop(now + 0.23);

    // 2) 背筋が凍る不協和音スティンガー（短二度＋三全音）
    [110.0, 116.54, 155.56, 311.13, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, now + 0.65);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.085, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.7);
    });
  }

  /**
   * 7. 扉を65%以上開けた際、怪しい影が「ただの善良な住人」だと判明する安堵音
   */
  public playPeekInnocentReveal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [440, 554.37].forEach((freq, idx) => {
      const start = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.11, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  }

  /**
   * 8. 瘴気（MIASMA）発生時の不気味な噴出音と激しい心音ループ（「ドクン…ドクン…」）
   */
  public startMiasmaHeartbeat(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopMiasmaHeartbeat();

    const now = ctx.currentTime;

    // 1) 瘴気がシューッと立ち込める暗いガス噴出ノイズ
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.45;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.setValueAtTime(3.2, now);

    const mGain = ctx.createGain();
    mGain.gain.setValueAtTime(0.001, now);
    mGain.gain.linearRampToValueAtTime(0.09, now + 0.4);

    source.connect(filter);
    filter.connect(mGain);
    mGain.connect(ctx.destination);
    source.start(now);

    this.miasmaNoiseNode = source;
    this.miasmaGain = mGain;

    // 2) 激しい心音（「ドクン・ドクン」）を周期再生
    const triggerBeat = () => {
      const c = this.ensureContext();
      if (!c) return;
      const t = c.currentTime;
      [0, 0.18].forEach((offset, idx) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        const startFreq = idx === 0 ? 72 : 62;
        osc.frequency.setValueAtTime(startFreq, t + offset);
        osc.frequency.exponentialRampToValueAtTime(26, t + offset + 0.16);

        gain.gain.setValueAtTime(0.001, t + offset);
        gain.gain.linearRampToValueAtTime(idx === 0 ? 0.36 : 0.26, t + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.17);

        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.18);
      });
    };

    triggerBeat();
    this.heartbeatTimer = window.setInterval(triggerBeat, 620);
  }

  public stopMiasmaHeartbeat(): void {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.miasmaGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.miasmaGain.gain.cancelScheduledValues(now);
        this.miasmaGain.gain.setValueAtTime(Math.max(0.001, this.miasmaGain.gain.value), now);
        this.miasmaGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      } catch { /* ignore */ }
    }
    const node = this.miasmaNoiseNode;
    this.miasmaNoiseNode = null;
    this.miasmaGain = null;
    setTimeout(() => {
      try {
        if (node && 'stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node?.disconnect();
      } catch { /* ignore */ }
    }, 220);
  }

  /**
   * 9. 車内怪異の豹変＆ステンレス扉への鏡面映り込み演出音
   */
  public playMirrorGhostAppear(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 持続低音ドローン開始
    this.startAnomalyPresence();

    // 鏡面がキィィンと共鳴するような冷たい金属倍音＋不気味な急降下音
    [1480, 1568, 2217].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.97, now + 1.8);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.85);
    });

    // 蛍光灯がバチバチッと赤黒く明滅するスパークノイズ
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(95, now);
    subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.7);
    subGain.gain.setValueAtTime(0.22, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.78);
  }

  /**
   * 10. 下降中イベント発生時にエレベーターがガタガタッと揺れて減速する衝撃音
   */
  public playElevatorJolt(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [0, 0.11].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now + offset);
      osc.frequency.exponentialRampToValueAtTime(32, now + offset + 0.16);

      gain.gain.setValueAtTime(0.28, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.19);
    });
  }

  /**
   * 11. 通常エンディング：階層インジケーターが 1F → 15F へ高速巻き戻しされる際の機械駆動パルス音
   */
  public playFloorRewindTick(floorNum: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 階数が上がるにつれてピッチが上昇するリレークリック＋モーターうなり
    const baseFreq = 180 + floorNum * 34;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.25, now + 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(baseFreq * 1.5, now);
    filter.Q.setValueAtTime(3.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * 12. トゥルーエンディング：1階を素通りして地下B1Fへ突入する際の火花・制動突破音
   */
  public playB1FBreakthrough(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1) 1Fの偽装ロックを突き破る重低音衝撃と急降下音
    const dropOsc = ctx.createOscillator();
    dropOsc.type = 'sawtooth';
    dropOsc.frequency.setValueAtTime(160, now);
    dropOsc.frequency.exponentialRampToValueAtTime(28, now + 1.1);

    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.32, now);
    dropGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    dropOsc.connect(dropGain);
    dropGain.connect(ctx.destination);
    dropOsc.start(now);
    dropOsc.stop(now + 1.2);

    // 2) バチバチッと火花が散る金属スパークノイズ
    const sparkLen = Math.floor(ctx.sampleRate * 0.75);
    const sparkBuf = ctx.createBuffer(1, sparkLen, ctx.sampleRate);
    const data = sparkBuf.getChannelData(0);
    for (let i = 0; i < sparkLen; i++) {
      const burst = Math.sin(i * 0.015) > 0.2 ? 1.0 : 0.15;
      data[i] = (Math.random() * 2 - 1) * burst;
    }
    const sparkSrc = ctx.createBufferSource();
    sparkSrc.buffer = sparkBuf;

    const sparkFilter = ctx.createBiquadFilter();
    sparkFilter.type = 'bandpass';
    sparkFilter.frequency.setValueAtTime(2200, now);
    sparkFilter.frequency.linearRampToValueAtTime(950, now + 0.75);
    sparkFilter.Q.setValueAtTime(4.0, now);

    const sparkGain = ctx.createGain();
    sparkGain.gain.setValueAtTime(0.18, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    sparkSrc.connect(sparkFilter);
    sparkFilter.connect(sparkGain);
    sparkGain.connect(ctx.destination);
    sparkSrc.start(now);
    sparkSrc.stop(now + 0.78);
  }

  /**
   * 13. トゥルーエンディング：B1Fの扉が100%開いた瞬間、「バチィッ！」と管理室の通信・監視システムが爆発ショートする音
   */
  public playSystemShortCircuitExplosion(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1) 「バチィッ！！」という強烈な高圧アーク放電クラック
    const arcLen = Math.floor(ctx.sampleRate * 0.45);
    const arcBuf = ctx.createBuffer(1, arcLen, ctx.sampleRate);
    const arcData = arcBuf.getChannelData(0);
    for (let i = 0; i < arcLen; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.12));
      arcData[i] = (Math.random() * 2 - 1) * env * 1.4;
    }
    const arcSrc = ctx.createBufferSource();
    arcSrc.buffer = arcBuf;

    const arcFilter = ctx.createBiquadFilter();
    arcFilter.type = 'bandpass';
    arcFilter.frequency.setValueAtTime(2600, now);
    arcFilter.frequency.exponentialRampToValueAtTime(420, now + 0.42);
    arcFilter.Q.setValueAtTime(2.2, now);

    const arcGain = ctx.createGain();
    arcGain.gain.setValueAtTime(0.35, now);
    arcGain.gain.exponentialRampToValueAtTime(0.001, now + 0.44);

    arcSrc.connect(arcFilter);
    arcFilter.connect(arcGain);
    arcGain.connect(ctx.destination);
    arcSrc.start(now);
    arcSrc.stop(now + 0.45);

    // 2) 監視システムの電源が落ちていくパワーダウン音（「キュゥゥゥン……プツッ」）
    const pwrOsc = ctx.createOscillator();
    pwrOsc.type = 'sawtooth';
    pwrOsc.frequency.setValueAtTime(980, now + 0.04);
    pwrOsc.frequency.exponentialRampToValueAtTime(32, now + 0.85);

    const pwrFilter = ctx.createBiquadFilter();
    pwrFilter.type = 'lowpass';
    pwrFilter.frequency.setValueAtTime(1400, now + 0.04);
    pwrFilter.frequency.exponentialRampToValueAtTime(90, now + 0.85);

    const pwrGain = ctx.createGain();
    pwrGain.gain.setValueAtTime(0.18, now + 0.04);
    pwrGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.88);

    pwrOsc.connect(pwrFilter);
    pwrFilter.connect(pwrGain);
    pwrGain.connect(ctx.destination);
    pwrOsc.start(now + 0.04);
    pwrOsc.stop(now + 0.9);
  }

  /**
   * 14. トゥルーエンディング：爽やかな朝の風と光の環境音（Web Audio API合成）
   */
  public startMorningAmbience(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopMorningAmbience();

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 1.5);
    masterGain.connect(ctx.destination);

    const nodes: AudioScheduledSourceNode[] = [];

    // 1) 爽やかな風の音（ピンクノイズに近い柔らかい気流音＋ゆっくり揺れるバンドパスフィルター）
    const windLen = ctx.sampleRate * 3;
    const windBuf = ctx.createBuffer(1, windLen, ctx.sampleRate);
    const windData = windBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < windLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      windData[i] = (b0 + b1 + b2) * 0.35;
    }
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = windBuf;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(520, now);
    windFilter.Q.setValueAtTime(1.8, now);

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.22, now);

    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(240, now);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.45, now);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(masterGain);

    windSrc.start(now);
    windLfo.start(now);
    nodes.push(windSrc, windLfo);

    // 2) 朝の光を思わせる透明感のあるメジャーナインス・アンビエント和音パッド (C4, E4, G4, B4, D5)
    const padFreqs = [261.63, 329.63, 392.00, 493.88, 587.33];
    padFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.001, now);
      padGain.gain.linearRampToValueAtTime(0.06 / (1 + idx * 0.25), now + 1.2 + idx * 0.2);

      osc.connect(padGain);
      padGain.connect(masterGain);
      osc.start(now);
      nodes.push(osc);
    });

    this.morningAmbienceNodes = nodes;
    this.morningAmbienceGain = masterGain;

    // 3) 遠くで響く爽やかな小鳥のさえずり（周期的に合成）
    const playBirdChirp = () => {
      if (this.muted || !this.ctx || !this.morningAmbienceGain) return;
      const t = this.ctx.currentTime;
      const notes = [2450, 2950, 2680];
      notes.forEach((f, i) => {
        if (!this.ctx || !this.morningAmbienceGain) return;
        const start = t + i * 0.11;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);
        osc.frequency.exponentialRampToValueAtTime(f * 1.18, start + 0.08);

        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.035, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

        osc.connect(g);
        g.connect(this.morningAmbienceGain);
        osc.start(start);
        osc.stop(start + 0.1);
      });
    };

    window.setTimeout(playBirdChirp, 650);
    this.morningBirdTimer = window.setInterval(playBirdChirp, 3200);
  }

  public stopMorningAmbience(): void {
    if (this.morningBirdTimer) {
      window.clearInterval(this.morningBirdTimer);
      this.morningBirdTimer = null;
    }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gain = this.morningAmbienceGain;
    const nodes = this.morningAmbienceNodes;
    this.morningAmbienceGain = null;
    this.morningAmbienceNodes = [];

    if (gain) {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      } catch { /* ignore */ }
    }

    setTimeout(() => {
      for (const n of nodes) {
        try { n.stop(); n.disconnect(); } catch { /* ignore */ }
      }
      try { gain?.disconnect(); } catch { /* ignore */ }
    }, 450);
  }
}

export const soundManager = new SoundManager();

