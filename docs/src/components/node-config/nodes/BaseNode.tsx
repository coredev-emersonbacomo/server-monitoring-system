import { useEffect, useRef, useState } from 'react';

interface BaseNodeProps {
    width?: string;
    borderColor?: string;
    selected?: boolean;
    children: React.ReactNode;
}

export const BaseNode = ({ width = 'w-[200px]', borderColor = '#e5e7eb', selected, children }: BaseNodeProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [snappedHeight, setSnappedHeight] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Ring uses box-shadow and doesn't affect layout — no border offset needed
                const contentHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
                const snapped = Math.ceil(contentHeight / 10) * 10;
                setSnappedHeight(snapped);
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, [selected]);

    const boxShadow = selected
        ? `0 0 0 2px ${borderColor}, 0 0 0 4px color-mix(in srgb, ${borderColor} 25%, transparent)`
        : `0 0 0 1px ${borderColor}`;

    return (
        <div
            className={`relative rounded-xl bg-card ${width} transition-[height] duration-75`}
            style={{
                boxShadow,
                height: snappedHeight ? `${snappedHeight}px` : 'fit-content'
            }}
        >
            <div ref={contentRef} className="h-fit w-full flex flex-col">
                {children}
            </div>
        </div>
    );
};
