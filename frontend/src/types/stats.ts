export interface NetworkPoint {
    name: string
    netIn: number
    netOut: number
}

export interface StatPoint {
    timestamp: number
    cpu: number | null
    memory: number | null
    disk: number | null
    netIn?: number | null
    netOut?: number | null
    networks?: NetworkPoint[]
}
