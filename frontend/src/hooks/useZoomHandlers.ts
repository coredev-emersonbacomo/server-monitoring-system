import { useCallback, useEffect, useRef } from "react";
import { useChartZoomContext } from "./useChartZoomContext";

/**
 * Returns a ref to attach to the chart container div.
 * Wheel and touch-pinch listeners are registered as non-passive so
 * preventDefault() works (React synthetic events are passive by default).
 */
export function useZoomHandlers(timestamps: number[]) {
    const { domain, setDomain } = useChartZoomContext();
    const pinchRef = useRef<{ dist: number; mid: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Keep a stable ref to the latest timestamps + domain so the listeners
    // don't need to be recreated on every render.
    const stateRef = useRef({ domain, timestamps, setDomain });
    useEffect(() => {
        stateRef.current = { domain, timestamps, setDomain };
    });

    const getEffectiveDomain = useCallback((): [number, number] => {
        const { domain, timestamps } = stateRef.current;
        if (domain) return domain;
        if (timestamps.length === 0) return [0, 0];
        return [timestamps[0], timestamps[timestamps.length - 1]];
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const [start, end] = getEffectiveDomain();
            const range = end - start;
            const delta = range * 0.1 * (e.deltaY > 0 ? 1 : -1);
            const newStart = start + delta;
            const newEnd = end - delta;
            if (newStart < newEnd) stateRef.current.setDomain([newStart, newEnd]);
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchRef.current = {
                    dist: Math.hypot(dx, dy),
                    mid: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length !== 2 || !pinchRef.current) return;
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.hypot(dx, dy);
            const scale = pinchRef.current.dist / newDist;
            pinchRef.current.dist = newDist;
            const [start, end] = getEffectiveDomain();
            const range = end - start;
            const center = (start + end) / 2;
            const newRange = range * scale;
            stateRef.current.setDomain([center - newRange / 2, center + newRange / 2]);
        };

        el.addEventListener("wheel", handleWheel, { passive: false });
        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: false });

        return () => {
            el.removeEventListener("wheel", handleWheel);
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
        };
    }, [getEffectiveDomain]);

    return { containerRef };
}
