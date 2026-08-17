export function InfoBlock({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-muted/50 border border-border/40 rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-medium">
                    {label}
                </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">
                {value}
            </p>
        </div>
    );
}
