import { useEffect, useRef } from 'react'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { getAccessToken } from '@/api/tokenManager'
import type { StatPoint } from '@/types/stats'

declare global {
    interface Window {
        Pusher: typeof Pusher
        Echo: Echo<any>
    }
}

window.Pusher = Pusher

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

interface WsPointPayload {
    timestamp: number
    cpu: number
    memory: number
    netIn: number
    netOut: number
    disk: number
}

export function useServerSocket(
    serverId: number,
    onStats: (point: StatPoint) => void,
    onStatus: (status: WsStatus) => void,
) {
    const onStatsRef = useRef(onStats)
    const onStatusRef = useRef(onStatus)
    onStatsRef.current = onStats
    onStatusRef.current = onStatus

    useEffect(() => {
        if (!serverId) return

        const echo = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
            enabledTransports: ['ws', 'wss'],
            authEndpoint: '/api/broadcasting/auth',
            auth: {
                headers: {
                    Authorization: `Bearer ${getAccessToken()}`,
                },
            },
        })

        echo.connector.pusher.connection.bind('connected', () => {
            console.info('[WS] Connected to Reverb')
            onStatusRef.current('connected')
        })

        echo.connector.pusher.connection.bind('disconnected', () => {
            console.info('[WS] Disconnected from Reverb')
            onStatusRef.current('disconnected')
        })

        const channel = `server.${serverId}`

        echo.private(channel)
            .listen('.ServerStatsUpdated', (e: { stats: WsPointPayload }) => {
                const point: StatPoint = {
                    timestamp: e.stats.timestamp,
                    cpu: e.stats.cpu,
                    memory: e.stats.memory,
                    netIn: e.stats.netIn,
                    netOut: e.stats.netOut,
                    disk: e.stats.disk,
                }
                onStatsRef.current(point)
            })

        return () => {
            echo.leaveChannel(channel)
            echo.disconnect()
        }
    }, [serverId])
}
