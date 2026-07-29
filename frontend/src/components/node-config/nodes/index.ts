import type { NodeTypes } from '@xyflow/react';
import { MetricNode } from './MetricNode';
import { ConditionNode } from './ConditionNode';
import { LogicNode } from './LogicNode';
import { TimeNode } from './TimeNode';
import { ActionNode } from './ActionNode';

export const nodeTypes: NodeTypes = {
    // Metric (unified - dropdown)
    metric: MetricNode,
    // Condition (merged)
    condition: ConditionNode,
    // Logic (merged)
    logic: LogicNode,
    // Time
    check_after: TimeNode,
    sustained: TimeNode,
    // Notification (merged - terminal, no output)
    notification: ActionNode,
};
