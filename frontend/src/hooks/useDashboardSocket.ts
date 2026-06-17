import { useEffect, useState } from 'react'
import type { Client } from '../data/mockDashboard'
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Tell TypeScript that window has Pusher
declare global {
    interface Window {
        Pusher: typeof Pusher
        Echo: Echo<any>
    }
}

window.Pusher = Pusher

export type WsStatus = 'connecting' | 'connected' | 'disconnected'

export function useDashboardSocket() {
    const [clients, setClients] = useState<Client[]>([])
    const [status, setStatus] = useState<WsStatus>('connecting')

    useEffect(() => {
        const echo = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
            enabledTransports: ['ws', 'wss'],
        })

        echo.connector.pusher.connection.bind('connected', () => {
            console.info('[WS] Connected to Reverb')
            setStatus('connected')
        })

        echo.connector.pusher.connection.bind('disconnected', () => {
            console.info('[WS] Disconnected from Reverb')
            setStatus('disconnected')
        })

        echo.private('dashboard')
            .listen('.ServerStatsUpdated', (e: { clients: Client[] }) => {
                if (e.clients && e.clients.length > 0) {
                    setClients(e.clients)
                }
            })

        return () => {
            echo.leaveChannel('dashboard')
            echo.disconnect()
        }
    }, [])

    return { clients, status }
}
