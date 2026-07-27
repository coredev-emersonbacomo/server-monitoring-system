import {
    mockServerReport,
    mockServerReportOffline,
    mockServerReportNoData,
} from "../server-report/mockServerReport";

export interface ServerListItem {
    uuid: string;
    name: string;
    client_name: string | null;
    status: string;
    last_seen: string | null;
}

export const mockServerList: ServerListItem[] = [
    mockServerReport,
    mockServerReportOffline,
    mockServerReportNoData,
].map((s) => ({
    uuid: s.uuid,
    name: s.name,
    client_name: s.client_name,
    status: s.status,
    last_seen: s.last_seen,
}));

export async function mockGetServerList(): Promise<ServerListItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockServerList;
}
