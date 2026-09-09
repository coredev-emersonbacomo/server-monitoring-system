import type { NodeTypeDefinition } from "@/types/node-config";

// Default settings for a freshly dropped node. Split from NodePalette so the
// component file only exports components (react-refresh).
export function getNodeDefaults(
    type: string,
    definitions: NodeTypeDefinition[],
): Record<string, unknown> {
    const def = definitions.find((d) => d.type === type);
    if (!def) return { label: type };
    const settings: Record<string, unknown> = { label: def.label };
    for (const setting of def.settings) {
        if (setting.default !== undefined) {
            settings[setting.key] = setting.default;
        }
    }
    return settings;
}
