import type {
  SoundInstruments,
  SoundRecipe,
  SoundVoice,
} from "@/themes/contract";

/** Web Audio, created on first use; everything is generated, no audio files. */
export function createSynth() {
  let ctx: AudioContext | null = null;
  let out: GainNode | null = null;
  let noiseBuffer: AudioBuffer | null = null;

  function ensure(): AudioContext | null {
    if (!ctx) {
      if (typeof AudioContext === "undefined") return null;
      ctx = new AudioContext();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      out = ctx.createGain();
      out.gain.value = 0.8;
      out.connect(comp);
      comp.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  }

  function chain(
    c: AudioContext,
    src: AudioScheduledSourceNode,
    t: number,
    v: SoundVoice,
  ) {
    const a = v.a ?? 0.004;
    const d = v.d ?? 0.3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(v.gain ?? 0.2, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    let node: AudioNode = src;
    if (v.filter) {
      const f = c.createBiquadFilter();
      f.type = v.filter;
      f.frequency.setValueAtTime(v.ff ?? 1200, t);
      f.Q.value = v.q ?? 0.8;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    if (out) g.connect(out);
    src.start(t);
    src.stop(t + a + d + 0.05);
  }

  const instruments = (c: AudioContext): SoundInstruments => ({
    tone(t, v) {
      const s = c.createOscillator();
      s.type = v.type ?? "sine";
      s.frequency.setValueAtTime(v.f, t);
      if (v.f2)
        s.frequency.exponentialRampToValueAtTime(
          v.f2,
          t + (v.glide ?? (v.a ?? 0) + (v.d ?? 0.3)),
        );
      chain(c, s, t, v);
    },
    noise(t, v) {
      const s = c.createBufferSource();
      s.buffer = noiseBuffer;
      s.loop = true;
      chain(c, s, t, { filter: "bandpass", a: 0.002, d: 0.1, ...v });
    },
  });

  return {
    play(recipe: SoundRecipe): void {
      const c = ensure();
      if (c) recipe(instruments(c), c.currentTime + 0.02);
    },
    suspend(): void {
      if (ctx?.state === "running") void ctx.suspend();
    },
  };
}
