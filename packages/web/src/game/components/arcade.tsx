// Shared neon-arcade visual primitives used across the start screen,
// reveal overlay, and results page. Pure presentation, no game logic.

import type { CSSProperties, ReactNode } from "react";
import { gameTheme } from "./theme";

interface NeonTextProps {
    children: ReactNode;
    color?: string;
    size?: number;
    weight?: number;
    flicker?: boolean;
    style?: CSSProperties;
}

/**
 * Neon-glow text. Uses the display font + currentColor-driven text-shadow,
 * so the keyframe `gys-neon-flicker` reads `currentColor` to keep the glow
 * synchronized with whatever color we set.
 */
export function NeonText({
    children,
    color = gameTheme.color.neonPink,
    size = 28,
    weight = 800,
    flicker = false,
    style,
}: NeonTextProps) {
    return (
        <span
            style={{
                fontFamily: gameTheme.font.display,
                fontWeight: weight,
                fontSize: size,
                color,
                textShadow: `0 0 6px ${color}, 0 0 14px ${color}, 0 0 24px ${color}88`,
                letterSpacing: "0.04em",
                animation: flicker ? "gys-neon-flicker 3s infinite" : "none",
                ...style,
            }}
        >
            {children}
        </span>
    );
}

interface GridBackgroundProps {
    color?: string;
    opacity?: number;
}

/**
 * Animated retro perspective grid + sun. Sits behind the foreground.
 * Renders absolute-positioned, fills its containing block.
 */
export function GridBackground({
    color = gameTheme.color.neonPink,
    opacity = 0.25,
}: GridBackgroundProps) {
    return (
        <div
            aria-hidden="true"
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "38%",
                    transform: "translate(-50%,-50%)",
                    width: 200,
                    height: 200,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${gameTheme.color.neonYellow}, ${gameTheme.color.neonPink} 55%, transparent 75%)`,
                    opacity: 0.35,
                    filter: "blur(2px)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    left: "-50%",
                    right: "-50%",
                    bottom: 0,
                    height: "55%",
                    background: `
                        linear-gradient(${color} 2px, transparent 2px) 0 0 / 40px 40px,
                        linear-gradient(90deg, ${color} 2px, transparent 2px) 0 0 / 40px 40px
                    `,
                    opacity,
                    transform: "perspective(300px) rotateX(55deg)",
                    transformOrigin: "bottom",
                    animation: "gys-grid-scroll 2s linear infinite",
                }}
            />
        </div>
    );
}

interface ConfettiProps {
    active: boolean;
    colors?: string[];
}

/**
 * Lightweight DOM-based confetti burst. ~32 absolutely-positioned divs
 * each animating from 50% / 50% out to a random offset via custom props.
 *
 * Re-mount to re-fire — call with `active={false}` then `active={true}` or
 * pass a fresh `key` to restart the burst.
 */
export function Confetti({
    active,
    colors = [
        gameTheme.color.neonPink,
        gameTheme.color.neonCyan,
        gameTheme.color.accent,
        gameTheme.color.neonYellow,
    ],
}: ConfettiProps) {
    if (!active) return null;
    const pieces = Array.from({ length: 32 }, (_, i) => {
        const color = colors[i % colors.length];
        const left = 50 + (Math.random() - 0.5) * 30;
        const tx = (Math.random() - 0.5) * 300;
        const ty = -200 - Math.random() * 200;
        const rot = Math.random() * 720 - 360;
        const delay = Math.random() * 150;
        const size = 6 + Math.random() * 6;
        const style = {
            position: "absolute" as const,
            left: `${left}%`,
            top: "50%",
            width: size,
            height: size * 1.6,
            background: color,
            borderRadius: 1,
            animation: `gys-confetti-burst 1.4s ${delay}ms cubic-bezier(.2,.7,.3,1) forwards`,
            "--tx": `${tx}px`,
            "--ty": `${ty}px`,
            "--rot": `${rot}deg`,
        } as CSSProperties;
        return (
            // biome-ignore lint/suspicious/noArrayIndexKey: pieces are positionally identical
            <div key={i} style={style} />
        );
    });
    return (
        <div
            aria-hidden="true"
            style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 100,
                overflow: "hidden",
            }}
        >
            {pieces}
        </div>
    );
}
