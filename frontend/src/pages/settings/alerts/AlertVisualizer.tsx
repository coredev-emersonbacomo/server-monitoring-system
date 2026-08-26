import { useState } from "react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import { Activity } from "lucide-react";
import { useTelemetry } from "./useTelemetry";
import { StatsBar } from "./StatsBar";
import { PipelineBoard } from "./PipelineBoard";
import { EventStreamPanel } from "./EventStreamPanel";
import { OfflineServersPanel } from "./OfflineServersPanel";
import { EventDetailsModal } from "./EventDetailsModal";

export function AlertVisualizer() {
    const [isPaused, setIsPaused] = useState(false);
    const t = useTelemetry(isPaused);

    return (
        <PageLayout>
            <IndexHeader
                icon={Activity}
                title="System Pipeline & Telemetry Visualizer"
                description="Live real-time game-map ecosystem showing agent heartbeats, system monitor sweeps, particle streams, and authentic backend timer countdowns."
                trail={[
                    { label: "Settings", href: "/settings" },
                    { label: "Visualizer" },
                ]}
            />

            <main className="py-6 w-full flex-1 flex flex-col gap-6 px-6">
                <StatsBar
                    stats={t.stats}
                    activeTimers={t.activeTaskList.length}
                    isPaused={isPaused}
                    onTogglePause={() => setIsPaused((p) => !p)}
                    onSync={t.fetchInitialState}
                />

                <PipelineBoard
                    particlesRef={t.particlesRef}
                    nodeCoordsRef={t.nodeCoordsRef}
                    selectedNode={t.selectedNode}
                    setSelectedNode={(id) => t.setSelectedNode(id)}
                    activeTaskList={t.activeTaskList}
                    serverNowOffset={t.serverNowOffset}
                    monitorCountdown={t.monitorCountdown}
                />

                <EventStreamPanel
                    events={t.events}
                    onOpenDetails={(e) => t.setActiveEventModal(e)}
                />

                <OfflineServersPanel servers={t.offlineServers} />

                {t.activeEventModal && (
                    <EventDetailsModal
                        event={t.activeEventModal}
                        onClose={() => t.setActiveEventModal(null)}
                    />
                )}
            </main>
        </PageLayout>
    );
}
