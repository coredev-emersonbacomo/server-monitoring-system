interface ReportHeaderProps {
    title: string;
    subtitle?: string;
}

export function ReportHeader({ title, subtitle }: ReportHeaderProps) {
    const generatedAt = new Date().toLocaleString("en-US", {
        dateStyle: "long",
        timeStyle: "short",
    });

    return (
        <div className="flex flex-col gap-4 pb-6 mb-6 border-b-2 border-gray-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tight text-gray-900">
                        CoreDev
                    </span>
                    <span className="text-xs text-gray-400 mt-1">
                        Server Monitoring
                    </span>
                </div>
                <span className="text-xs text-gray-400">
                    Generated {generatedAt}
                </span>
            </div>

            <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
    );
}