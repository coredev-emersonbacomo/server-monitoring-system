import { useCallback, useRef } from "react";
import { useChartZoomContext } from "./useChartZoomContext";

/**
 * Returns wheel + touch-pinch handlers to apply to a chart container div.
 * Both update the shared domain via context.
 */
export function useZoomHandlers(timestamps: number[]) {
    const { domain, setDomain } = useChartZoomContext();
    const pinchRef = useRef<{ dist: number; mid: number } | null>(null);

    const getEffectiveDomain = useCallback((): [number, number] => {
        if (domain) return domain;
        if (timestamps.length === 0) return [0, 0];
        return [timestamps[0], timestamps[timestamps.length - 1]];
    }, [domain, timestamps]);

    const onWheel = useCallback(
        (e: React.WheelEvent<HTMLDivElement>) => {
            e.preventDefault();
            const [start, end] = getEffectiveDomain();
            const range = end - start;
            const delta = range * 0.1 * (e.deltaY > 0 ? 1 : -1);
            const newStart = start + delta;
            const newEnd = end - delta;
            if (newStart < newEnd) setDomain([newStart, newEnd]);
        },
        [getEffectiveDomain, setDomain],
    );

    const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchRef.current = {
                dist: Math.hypot(dx, dy),
                mid: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            };
        }
    }, []);

    const onTouchMove = useCallback(
        (e: React.TouchEvent<HTMLDivElement>) => {
            if (e.touches.length !== 2 || !pinchRef.current) return;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const newDist = Math.hypot(dx, dy);
            const scale = pinchRef.current.dist / newDist;
            pinchRef.current.dist = newDist;
            const [start, end] = getEffectiveDomain();
            const range = end - start;
            const center = (start + end) / 2;
            const newRange = range * scale;
            setDomain([center - newRange / 2, center + newRange / 2]);
        },
        [getEffectiveDomain, setDomain],
    );

    return { onWheel, onTouchStart, onTouchMove };
}
