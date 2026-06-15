export type ServerStatus = 'online' | 'offline' | 'warning'
export type PortStatus = 'open' | 'closed' | 'filtered'
export type Protocol = 'TCP' | 'UDP'

export interface StatPoint {
    timestamp: number // unix ms
    cpu: number       // 0–100 %
    memory: number    // 0–100 %
    netIn: number     // MB/s
    netOut: number    // MB/s
    disk: number      // 0–100 %
}

export interface OpenPort {
    name: string
    port: number
    protocol: Protocol
    status: PortStatus
}

export interface Server {
    id: number
    name: string
    ip: string
    status: ServerStatus
    uptime: string
    os: string
    cpuCores: number
    ramGb: number
    stats: StatPoint[]
    openPorts: OpenPort[]
}

export interface Coop {
    id: number
    name: string
    region: string
    description: string
    gradient: { from: string; to: string }
    servers: Server[]
}


// ── Stat generator ────────────────────────────────────────────────────────────
function generateStats(hours = 24, intervalMin = 10): StatPoint[] {
    const now = Date.now()
    const points = Math.floor((hours * 60) / intervalMin)
    const data: StatPoint[] = []

    let cpu    = 30 + Math.random() * 20
    let memory = 50 + Math.random() * 20
    let netIn  = 2  + Math.random() * 3
    let netOut = 0.5 + Math.random() * 1
    let disk   = 45 + Math.random() * 10

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const rw    = (v: number, delta: number) => v + (Math.random() - 0.5) * delta

    for (let i = points; i >= 0; i--) {
        cpu    = clamp(rw(cpu,    10), 5,  98)
        memory = clamp(rw(memory,  5), 20, 92)
        netIn  = clamp(rw(netIn,  1.5), 0, 30)
        netOut = clamp(rw(netOut, 0.6), 0, 10)
        disk   = clamp(rw(disk,   0.4), 30, 99)

        data.push({
            timestamp: now - i * intervalMin * 60 * 1000,
            cpu:    Math.round(cpu    * 10) / 10,
            memory: Math.round(memory * 10) / 10,
            netIn:  Math.round(netIn  * 100) / 100,
            netOut: Math.round(netOut * 100) / 100,
            disk:   Math.round(disk   * 10) / 10,
        })
    }
    return data
}

// ── Mock Coops ────────────────────────────────────────────────────────────────
export const mockCoops: Coop[] = [
    {
        id: 1,
        name: 'Alpha Cluster',
        region: 'US West',
        description: 'Primary production cluster',
        gradient: { from: '#7c3aed', to: '#4338ca' },
        servers: [
            {
                id: 1,
                name: 'web-01',
                ip: '10.0.0.10',
                status: 'online',
                uptime: '99d 14h 22m',
                os: 'Ubuntu 24.04 LTS',
                cpuCores: 8,
                ramGb: 32,
                stats: generateStats(),
                openPorts: [
                    { name: 'SSH',   port: 22,  protocol: 'TCP', status: 'open'     },
                    { name: 'HTTP',  port: 80,  protocol: 'TCP', status: 'open'     },
                    { name: 'HTTPS', port: 443, protocol: 'TCP', status: 'open'     },
                    { name: 'FTP',   port: 21,  protocol: 'TCP', status: 'filtered' },
                ],
            },
            {
                id: 2,
                name: 'api-01',
                ip: '10.0.0.11',
                status: 'warning',
                uptime: '12d 3h 08m',
                os: 'Debian 12',
                cpuCores: 16,
                ramGb: 64,
                stats: generateStats(),
                openPorts: [
                    { name: 'SSH',      port: 22,   protocol: 'TCP', status: 'open'   },
                    { name: 'HTTPS',    port: 443,  protocol: 'TCP', status: 'open'   },
                    { name: 'Node.js',  port: 3000, protocol: 'TCP', status: 'open'   },
                    { name: 'Postgres', port: 5432, protocol: 'TCP', status: 'closed' },
                ],
            },
        ],
    },
    {
        id: 2,
        name: 'Beta Cluster',
        region: 'EU Central',
        description: 'Regional edge cluster',
        gradient: { from: '#0891b2', to: '#0f766e' },
        servers: [
            {
                id: 3,
                name: 'edge-eu-01',
                ip: '172.16.0.5',
                status: 'online',
                uptime: '200d 8h 11m',
                os: 'Alpine Linux 3.19',
                cpuCores: 4,
                ramGb: 16,
                stats: generateStats(),
                openPorts: [
                    { name: 'SSH',   port: 22,  protocol: 'TCP', status: 'open'     },
                    { name: 'HTTPS', port: 443, protocol: 'TCP', status: 'open'     },
                    { name: 'DNS',   port: 53,  protocol: 'UDP', status: 'open'     },
                    { name: 'SMTP',  port: 25,  protocol: 'TCP', status: 'filtered' },
                ],
            },
            {
                id: 4,
                name: 'cache-eu-01',
                ip: '172.16.0.6',
                status: 'online',
                uptime: '44d 22h 59m',
                os: 'Ubuntu 22.04 LTS',
                cpuCores: 4,
                ramGb: 8,
                stats: generateStats(),
                openPorts: [
                    { name: 'SSH',   port: 22,    protocol: 'TCP', status: 'open' },
                    { name: 'Redis', port: 6379,  protocol: 'TCP', status: 'open' },
                    { name: 'HTTP',  port: 80,    protocol: 'TCP', status: 'closed' },
                ],
            },
        ],
    },
    {
        id: 3,
        name: 'Gamma Ops',
        region: 'AP South',
        description: 'Staging & QA environment',
        gradient: { from: '#b45309', to: '#92400e' },
        servers: [
            {
                id: 5,
                name: 'staging-01',
                ip: '192.168.50.10',
                status: 'offline',
                uptime: '0d 0h 0m',
                os: 'Ubuntu 24.04 LTS',
                cpuCores: 2,
                ramGb: 4,
                stats: generateStats(),
                openPorts: [
                    { name: 'SSH',   port: 22,  protocol: 'TCP', status: 'closed'   },
                    { name: 'HTTPS', port: 443, protocol: 'TCP', status: 'filtered' },
                ],
            },
        ],
    },
]
