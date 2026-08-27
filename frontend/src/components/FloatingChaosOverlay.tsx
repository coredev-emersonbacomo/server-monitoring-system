import { useEffect, useState } from "react";

const DOC_ASSETS = [
    "/images/cc1.gif",
    "/images/cdelete.gif",
    "/images/cdelete1.gif",
    "/images/cdetails.gif",
    "/images/client_serverlist.png",
    "/images/coreDevlogo.png",
    "/images/create client.gif",
    "/images/createserver.gif",
    "/images/screate.gif",
    "/images/sdetails.gif",
    "/images/sinstall.gif",
    "/images/ucreate.gif",
    "/images/udelete.gif",
    "/images/udetails.gif",
];

interface FloatingItem {
    id: number;
    src: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    vRot: number;
}

export function FloatingChaosOverlay() {
    const [items, setItems] = useState<FloatingItem[]>([]);

    useEffect(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Spawn 14 animated floating items
        const initial: FloatingItem[] = DOC_ASSETS.map((src, i) => ({
            id: i,
            src,
            x: Math.random() * Math.max(100, w - 240),
            y: Math.random() * Math.max(100, h - 200),
            vx: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 2 : -2),
            vy: (Math.random() - 0.5) * 4 + (Math.random() > 0.5 ? 2 : -2),
            size: 150 + Math.floor(Math.random() * 100),
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 2,
        }));

        setItems(initial);

        let animationFrameId: number;

        const update = () => {
            const curW = window.innerWidth;
            const curH = window.innerHeight;

            setItems((prev) =>
                prev.map((item) => {
                    let nextX = item.x + item.vx;
                    let nextY = item.y + item.vy;
                    let nextVx = item.vx;
                    let nextVy = item.vy;

                    // Bounce off edges
                    if (nextX <= 0) {
                        nextX = 0;
                        nextVx = Math.abs(nextVx);
                    } else if (nextX + item.size >= curW) {
                        nextX = curW - item.size;
                        nextVx = -Math.abs(nextVx);
                    }

                    if (nextY <= 0) {
                        nextY = 0;
                        nextVy = Math.abs(nextVy);
                    } else if (nextY + (item.size * 0.7) >= curH) {
                        nextY = curH - item.size * 0.7;
                        nextVy = -Math.abs(nextVy);
                    }

                    return {
                        ...item,
                        x: nextX,
                        y: nextY,
                        vx: nextVx,
                        vy: nextVy,
                        rotation: (item.rotation + item.vRot) % 360,
                    };
                }),
            );

            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="absolute transition-transform duration-75 ease-linear will-change-transform"
                    style={{
                        transform: `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rotation}deg)`,
                        width: item.size,
                    }}
                >
                    <img
                        src={item.src}
                        alt="floating doc asset"
                        className="w-full h-auto rounded-xl shadow-2xl border-2 border-primary/40 bg-card/90 backdrop-blur-xs object-cover"
                    />
                </div>
            ))}
        </div>
    );
}
