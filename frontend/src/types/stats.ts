export interface NetworkPoint {
    name: string
    netIn: number
    netOut: number
}

export interface StatPoint {
    timestamp: number
    cpu: number
    memory: number
    disk: number
    networks?: NetworkPoint[]
}
