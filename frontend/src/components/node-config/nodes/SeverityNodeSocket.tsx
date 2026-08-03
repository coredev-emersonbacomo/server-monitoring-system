import { Position } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { getInputType } from "./socketTypes";
import { NodeSocket } from "./node-socket";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const OPTIONS = [
    { value: "notice", label: "Notice", color: "#fde047" },
    { value: "warning", label: "Warning", color: "#fb923c" },
    { value: "critical", label: "Critical", color: "#ef4444" },
];

const COLORS: Record<string, string> = {
    notice: "#fde047",
    warning: "#fb923c",
    critical: "#ef4444",
};

interface Props {
    nodeType: string;
    value: string;
    onChange: (value: string) => void;
    inputSocket?: boolean;
}

export function SeverityNodeSocket({
    nodeType,
    value,
    onChange,
    inputSocket = true,
}: Props) {
    const sevInDef = getInputType(nodeType, "severity");

    const select = (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger
                className="h-7 text-xs font-semibold"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
            >
                <AlertTriangle
                    size={12}
                    style={{ color: COLORS[value] || COLORS.warning }}
                    className="mr-1"
                />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {OPTIONS.map((sv) => (
                    <SelectItem key={sv.value} value={sv.value}>
                        {sv.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    if (!inputSocket) {
        return select;
    }

    return (
        <NodeSocket
            type="target"
            position={Position.Left}
            id="severity"
            def={sevInDef}
            right={select}
        />
    );
}
