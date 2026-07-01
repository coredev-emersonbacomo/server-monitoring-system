export default function ServerCardSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-3 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="w-10 h-3 bg-muted rounded" />
            </div>
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
        </div>
    );
}
