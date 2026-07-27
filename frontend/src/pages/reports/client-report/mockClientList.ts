export interface ClientListItem {
    uuid: string;
    name: string;
    total_servers: number;
    online_servers: number;
    offline_servers: number;
}

export const mockClientList: ClientListItem[] = [
    {
        uuid: "c-acme-logistics",
        name: "Acme Logistics",
        total_servers: 5,
        online_servers: 4,
        offline_servers: 1,
    },
    {
        uuid: "c-globex",
        name: "Globex Corp",
        total_servers: 3,
        online_servers: 3,
        offline_servers: 0,
    },
    {
        uuid: "c-initech",
        name: "Initech",
        total_servers: 8,
        online_servers: 6,
        offline_servers: 2,
    },
];

export async function mockGetClientList(): Promise<ClientListItem[]> {
    await new Promise((r) => setTimeout(r, 200));
    return mockClientList;
}
