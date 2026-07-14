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
