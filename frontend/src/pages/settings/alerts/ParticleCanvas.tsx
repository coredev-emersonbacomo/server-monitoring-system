import { useEffect, useRef } from "react";
import { CONNECTIONS } from "./nodes";
import type { Particle } from "./types";

interface ParticleCanvasProps {
    particlesRef: React.MutableRefObject<Particle[]>;
    nodeCoordsRef: React.MutableRefObject<
        Record<string, { x: number; y: number }>
    >;
}

export function ParticleCanvas({ particlesRef, nodeCoordsRef }: ParticleCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        let animId: number;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";

            CONNECTIONS.forEach(([fromId, toId]) => {
                const from = nodeCoordsRef.current[fromId];
                const to = nodeCoordsRef.current[toId];
                if (from && to) {
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);
                    ctx.stroke();
                }
            });

            particlesRef.current = particlesRef.current.filter((p) => {
                p.progress += p.speed;
                if (p.progress >= 1) return false;

                const currX = p.startX + (p.endX - p.startX) * p.progress;
                const currY = p.startY + (p.endY - p.startY) * p.progress;

                ctx.beginPath();
                ctx.arc(currX, currY, 6, 0, Math.PI * 2);
                ctx.fillStyle = p.color + "44";
                ctx.fill();

                ctx.beginPath();
                ctx.arc(currX, currY, 3, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                return true;
            });

            animId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, [particlesRef, nodeCoordsRef]);

    return (
        <canvas
            ref={canvasRef}
            width={1000}
            height={480}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />
    );
}
