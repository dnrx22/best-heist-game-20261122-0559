// Tiny WebAudio bleeps, synthesized in code — no audio files, no network.
// The context is created lazily on the first user gesture so browsers allow it.
let ctx = null;

function ensure() {
  if (ctx) return ctx;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  } catch {
    ctx = null;
  }
  return ctx;
}

function tone(freq, dur, type, gain, when = 0) {
  const audio = ensure();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, audio.currentTime + when);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + when + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(audio.currentTime + when);
    osc.stop(audio.currentTime + when + dur);
  } catch {
    // Sound is garnish; a failure here must never break the game.
  }
}

export const sound = {
  unlock() { ensure(); },
  spotted() { tone(620, 0.12, 'square', 0.06); tone(830, 0.14, 'square', 0.06, 0.12); },
  grab() { tone(523, 0.1, 'sine', 0.08); tone(659, 0.1, 'sine', 0.08, 0.09); tone(784, 0.18, 'sine', 0.08, 0.18); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, i * 0.13)); },
  busted() { tone(220, 0.3, 'sawtooth', 0.07); tone(165, 0.45, 'sawtooth', 0.07, 0.22); },
};
