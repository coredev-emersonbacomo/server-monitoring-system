import {
    Activity,
    Server,
    Cpu,
    Database,
    Clock,
    Send,
    RefreshCw,
    type LucideIcon,
} from "lucide-react";

export interface NodeDef {
    id: string;
    label: string;
    icon: LucideIcon;
    x: number;
    y: number;
    color: string;
    type: string;
}

export const NODE_DEFS: NodeDef[] = [
    { id: "agents", label: "Agent Pool", icon: Server, x: 100, y: 120, color: "#3b82f6", type: "ingress" },
    { id: "heartbeat_ingress", label: "Heartbeat Gateway", icon: Activity, x: 320, y: 120, color: "#10b981", type: "processor" },
    { id: "system_monitor", label: "System Monitor", icon: Clock, x: 100, y: 320, color: "#f59e0b", type: "cron" },
    { id: "metric_db", label: "Metric DB Storage", icon: Database, x: 550, y: 320, color: "#8b5cf6", type: "storage" },
    { id: "rule_engine", label: "Node Config FSM", icon: Cpu, x: 550, y: 120, color: "#ec4899", type: "fsm" },
    { id: "scheduler_pool", label: "Task Scheduler Pool", icon: RefreshCw, x: 800, y: 120, color: "#06b6d4", type: "timer" },
    { id: "action_outlet", label: "Notification Channels", icon: Send, x: 800, y: 320, color: "#ef4444", type: "outlet" },
];

// Edge connections drawn between nodes on the visualizer board.
export const CONNECTIONS: [string, string][] = [
    ["agents", "heartbeat_ingress"],
    ["heartbeat_ingress", "metric_db"],
    ["heartbeat_ingress", "rule_engine"],
    ["system_monitor", "metric_db"],
    ["rule_engine", "scheduler_pool"],
    ["scheduler_pool", "rule_engine"],
    ["rule_engine", "action_outlet"],
    ["scheduler_pool", "action_outlet"],
];
