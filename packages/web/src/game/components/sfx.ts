// WebAudio sound effects for the Guess Your Song game.
//
// All tones are synthesized on demand — no audio assets are shipped.
// A single shared AudioContext is created lazily on the first call,
// so this module is safe to import from server-rendered code paths
// (the context is only constructed when a function is actually invoked
// in the browser).
//
// Browsers suspend the AudioContext until a user gesture; every helper
// re-resumes it before scheduling, so calling SFX.click() inside an
// onClick handler "just works" without explicit unlock plumbing.

let audioCtx: AudioContext | null = null;

function getAudio(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
        try {
            const Ctor =
                window.AudioContext ||
                (window as unknown as {
                    webkitAudioContext?: typeof AudioContext;
                }).webkitAudioContext;
            if (!Ctor) return null;
            audioCtx = new Ctor();
        } catch {
            return null;
        }
    }
    if (audioCtx.state === "suspended") {
        void audioCtx.resume();
    }
    return audioCtx;
}

interface ToneOptions {
    freq?: number;
    duration?: number;
    type?: OscillatorType;
    volume?: number;
    /** Frequency offset (Hz) to slide to over the duration. */
    slide?: number;
}

function playTone({
    freq = 440,
    duration = 0.12,
    type = "sine",
    volume = 0.15,
    slide = 0,
}: ToneOptions): void {
    const ctx = getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) {
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(20, freq + slide),
            ctx.currentTime + duration,
        );
    }
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
    );
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
}

/**
 * Bank of named sound effects used across the game.
 * Each call is fire-and-forget; failures (no AudioContext, blocked
 * autoplay, etc.) are swallowed silently.
 */
export const SFX = {
    /** Generic UI tap — buttons, toggles. */
    click: (): void =>
        playTone({ freq: 800, duration: 0.04, type: "square", volume: 0.08 }),
    /** Snap-to-gap when the timeline lands on a new position. */
    snap: (): void =>
        playTone({
            freq: 1200,
            duration: 0.05,
            type: "triangle",
            volume: 0.1,
        }),
    /** Three-note rising arpeggio for a correct placement. */
    correct: (): void => {
        playTone({
            freq: 523,
            duration: 0.1,
            type: "triangle",
            volume: 0.12,
        });
        setTimeout(
            () =>
                playTone({
                    freq: 659,
                    duration: 0.1,
                    type: "triangle",
                    volume: 0.12,
                }),
            90,
        );
        setTimeout(
            () =>
                playTone({
                    freq: 784,
                    duration: 0.2,
                    type: "triangle",
                    volume: 0.14,
                }),
            180,
        );
    },
    /** Sad downward sawtooth slide for a wrong placement. */
    wrong: (): void =>
        playTone({
            freq: 300,
            duration: 0.2,
            type: "sawtooth",
            volume: 0.1,
            slide: -150,
        }),
    /** Whoosh used for transitions / card flips. */
    whoosh: (): void =>
        playTone({
            freq: 200,
            duration: 0.2,
            type: "sine",
            volume: 0.06,
            slide: 400,
        }),
    /** Three-note descending dirge for game over / loss. */
    gameover: (): void => {
        playTone({
            freq: 440,
            duration: 0.15,
            type: "square",
            volume: 0.1,
        });
        setTimeout(
            () =>
                playTone({
                    freq: 370,
                    duration: 0.15,
                    type: "square",
                    volume: 0.1,
                }),
            150,
        );
        setTimeout(
            () =>
                playTone({
                    freq: 294,
                    duration: 0.3,
                    type: "square",
                    volume: 0.12,
                }),
            300,
        );
    },
    /** Four-note rising arpeggio for a win. */
    win: (): void => {
        [523, 659, 784, 1047].forEach((f, i) => {
            setTimeout(
                () =>
                    playTone({
                        freq: f,
                        duration: 0.15,
                        type: "triangle",
                        volume: 0.14,
                    }),
                i * 100,
            );
        });
    },
};
