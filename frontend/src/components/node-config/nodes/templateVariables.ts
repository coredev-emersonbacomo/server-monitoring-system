import type { components } from '@/api/schema';

type ServerData = components['schemas']['ServerData'];
type ClientData = components['schemas']['ClientData'];
type StatPointData = components['schemas']['StatPointData'];

type ServerVarKey = `server.${keyof ServerData & string}`;
type ClientVarKey = `server.client.${keyof ClientData & string}`;
type MetricVarKey = `metric.${keyof StatPointData & string}`;

type TemplateVariableKey = ServerVarKey | ClientVarKey | MetricVarKey;

export interface TemplateVariable {
    key: TemplateVariableKey;
    label: string;
    group: 'server' | 'client' | 'metric';
    description: string;
}

const LABELS: Record<TemplateVariableKey, { label: string; group: TemplateVariable['group']; description: string }> = {
    'server.name'                   : { label: 'Name', group: 'server', description: 'Name (ServerData)' },
    'server.description'            : { label: 'Description', group: 'server', description: 'Description (ServerData)' },
    'server.uuid'                   : { label: 'Uuid', group: 'server', description: 'Uuid (ServerData)' },
    'server.host_name'              : { label: 'Host Name', group: 'server', description: 'Host Name (ServerData)' },
    'server.client_uuid'            : { label: 'Client Uuid', group: 'server', description: 'Client Uuid (ServerData)' },
    'server.client_name'            : { label: 'Client Name', group: 'server', description: 'Client Name (ServerData)' },
    'server.created_at'             : { label: 'Created At', group: 'server', description: 'Created At (ServerData)' },
    'server.updated_at'             : { label: 'Updated At', group: 'server', description: 'Updated At (ServerData)' },
    'server.record_status'          : { label: 'Record Status', group: 'server', description: 'Record Status (ServerData)' },
    'server.cpu_model'              : { label: 'Cpu Model', group: 'server', description: 'Cpu Model (ServerData)' },
    'server.cpu_cores'              : { label: 'Cpu Cores', group: 'server', description: 'Cpu Cores (ServerData)' },
    'server.ram'                    : { label: 'Ram', group: 'server', description: 'Ram (ServerData)' },
    'server.disk'                   : { label: 'Disk', group: 'server', description: 'Disk (ServerData)' },
    'server.operating_system'       : { label: 'Operating System', group: 'server', description: 'Operating System (ServerData)' },
    'server.status'                 : { label: 'Status', group: 'server', description: 'Status (ServerData)' },
    'server.stats'                  : { label: 'Stats', group: 'server', description: 'Stats (ServerData)' },
    'server.activeProvisionDetails' : { label: 'ActiveProvisionDetails', group: 'server', description: 'ActiveProvisionDetails (ServerData)' },
    'server.ports'                  : { label: 'Ports', group: 'server', description: 'Ports (ServerData)' },
    'server.processes'              : { label: 'Processes', group: 'server', description: 'Processes (ServerData)' },
    'server.uninstall_linux_command': { label: 'Uninstall Linux Command', group: 'server', description: 'Uninstall Linux Command (ServerData)' },
    'server.uninstall_windows_command': { label: 'Uninstall Windows Command', group: 'server', description: 'Uninstall Windows Command (ServerData)' },
    'server.agent_deleted'          : { label: 'Agent Deleted', group: 'server', description: 'Agent Deleted (ServerData)' },
    'server.activities'             : { label: 'Activities', group: 'server', description: 'Activities (ServerData)' },
    'server.agent'                  : { label: 'Agent', group: 'server', description: 'Agent (ServerData)' },
    'server.alert_scope'            : { label: 'Alert Scope', group: 'server', description: 'Alert Scope (ServerData)' },
    'server.monthly_cost'           : { label: 'Monthly Cost', group: 'server', description: 'Monthly Cost (ServerData)' },
    'server.cost_offset'            : { label: 'Cost Offset', group: 'server', description: 'Cost Offset (ServerData)' },
    'server.cost_reset_at'          : { label: 'Cost Reset At', group: 'server', description: 'Cost Reset At (ServerData)' },
    'server.historical_cost'        : { label: 'Historical Cost', group: 'server', description: 'Historical Cost (ServerData)' },
    'server.rate_updated_at'        : { label: 'Rate Updated At', group: 'server', description: 'Rate Updated At (ServerData)' },
    'server.uptime_seconds'         : { label: 'Uptime Seconds', group: 'server', description: 'Uptime Seconds (ServerData)' },
    'server.gross_cost'             : { label: 'Gross Cost', group: 'server', description: 'Gross Cost (ServerData)' },
    'server.net_cost'               : { label: 'Net Cost', group: 'server', description: 'Net Cost (ServerData)' },
    'server.accumulated_cost'       : { label: 'Accumulated Cost', group: 'server', description: 'Accumulated Cost (ServerData)' },
    'server.billing_date'           : { label: 'Billing Date', group: 'server', description: 'Billing Date (ServerData)' },
    'server.pending_monthly_cost'   : { label: 'Pending Monthly Cost', group: 'server', description: 'Pending Monthly Cost (ServerData)' },
    'server.client.uuid'            : { label: 'Uuid', group: 'client', description: 'Uuid (ClientData)' },
    'server.client.name'            : { label: 'Name', group: 'client', description: 'Name (ClientData)' },
    'server.client.description'     : { label: 'Description', group: 'client', description: 'Description (ClientData)' },
    'server.client.location'        : { label: 'Location', group: 'client', description: 'Location (ClientData)' },
    'server.client.email'           : { label: 'Email', group: 'client', description: 'Email (ClientData)' },
    'server.client.contact_number'  : { label: 'Contact Number', group: 'client', description: 'Contact Number (ClientData)' },
    'server.client.banner_image_url': { label: 'Banner Image Url', group: 'client', description: 'Banner Image Url (ClientData)' },
    'server.client.servers_count'   : { label: 'Servers Count', group: 'client', description: 'Servers Count (ClientData)' },
    'server.client.secops_count'    : { label: 'Secops Count', group: 'client', description: 'Secops Count (ClientData)' },
    'server.client.created_at'      : { label: 'Created At', group: 'client', description: 'Created At (ClientData)' },
    'server.client.updated_at'      : { label: 'Updated At', group: 'client', description: 'Updated At (ClientData)' },
    'server.client.alert_scope'     : { label: 'Alert Scope', group: 'client', description: 'Alert Scope (ClientData)' },
    'metric.timestamp'              : { label: 'Timestamp', group: 'metric', description: 'Timestamp (StatPointData)' },
    'metric.cpu'                    : { label: 'Cpu', group: 'metric', description: 'Cpu (StatPointData)' },
    'metric.memory'                 : { label: 'Memory', group: 'metric', description: 'Memory (StatPointData)' },
    'metric.netIn'                  : { label: 'NetIn', group: 'metric', description: 'NetIn (StatPointData)' },
    'metric.netOut'                 : { label: 'NetOut', group: 'metric', description: 'NetOut (StatPointData)' },
    'metric.disk'                   : { label: 'Disk', group: 'metric', description: 'Disk (StatPointData)' },
};

export const TEMPLATE_VARIABLES: TemplateVariable[] = (Object.entries(LABELS) as [TemplateVariableKey, typeof LABELS[TemplateVariableKey]][]).map(
    ([key, meta]) => ({ key, ...meta }),
);

export function filterVariables(query: string): TemplateVariable[] {
    const q = query.toLowerCase();
    return TEMPLATE_VARIABLES.filter(
        (v) => v.key.toLowerCase().includes(q) || v.label.toLowerCase().includes(q),
    );
}
