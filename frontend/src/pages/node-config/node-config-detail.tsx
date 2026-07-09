import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConfig } from '@/hooks/node-config/useNodeConfigs';
import { useBreadcrumb } from '@/hooks/useBreadcrumb';
import PageLayout from '@/components/PageLayout';
import { NodeConfigEditor } from '@/components/node-config/NodeConfigEditor';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NodeConfigDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const configId = useMemo(() => (id ? parseInt(id) : null), [id]);
    const { data: config, isLoading, isError } = useConfig(configId);
    const { setTrail } = useBreadcrumb();

    const isNew = id === 'new';

    useEffect(() => {
        if (isNew) {
            setTrail([{ label: 'Settings', href: '/settings' }, { label: 'Alert Configs', href: '/settings/alerts' }, { label: 'New Config' }]);
        } else if (config) {
            setTrail([{ label: 'Settings', href: '/settings' }, { label: 'Alert Configs', href: '/settings/alerts' }, { label: config.name }]);
        }
    }, [setTrail, config, isNew]);

    if (isNew) {
        return (
            <PageLayout>
                <NodeConfigEditor onSaveComplete={() => navigate('/settings/alerts')} />
            </PageLayout>
        );
    }

    if (isLoading) {
        return (
            <PageLayout>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-muted-foreground" />
                </div>
            </PageLayout>
        );
    }

    if (isError || !config) {
        return (
            <PageLayout>
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <AlertTriangle size={28} className="opacity-40" />
                    <p className="text-sm">Config not found.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<ArrowLeft size={14} />}
                        label="Back"
                        onClick={() => navigate('/settings/alerts')}
                    />
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <NodeConfigEditor config={config} onSaveComplete={() => navigate('/settings/alerts')} />
        </PageLayout>
    );
}
