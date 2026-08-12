import type { NodeTypes } from '@xyflow/react';
import { MetricNode } from './MetricNode';
import { TemplateInputNode } from './TemplateInputNode';
import { ConditionNode } from './ConditionNode';
import { LogicNode } from './LogicNode';
import { TimeNode } from './TimeNode';
import { SeverityNode } from './SeverityNode';
import { NotifyNode } from './NotifyNode';

export const nodeTypes: NodeTypes = {
    // Metric (unified - dropdown)
    metric: MetricNode,
    // Template input (parameterizes compare values)
    template: TemplateInputNode,
    // Condition (merged)
    condition: ConditionNode,
    // Logic (merged)
    logic: LogicNode,
    // Severity
    severity: SeverityNode,
    // Time
    check_after: TimeNode,
    sustained: TimeNode,
    // Notification (merged - terminal, no output)
    notification: NotifyNode,
};
