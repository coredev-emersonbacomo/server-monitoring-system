import { toast } from "sonner";
import { requestUploadIntent } from "@/api/uploads";
import { directUpload } from "@/services/directUpload";
import type { UploadResult } from "@/types/upload";

const content = (label: string, pct: string) => (
    <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">{label}</p>
            <div className="mt-1.5 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: pct }} />
            </div>
        </div>
        <span className="text-xs font-semibold text-blue-600 tabular-nums shrink-0">{pct}</span>
    </div>
);

const style = { backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" };

export async function uploadFile(
    file: File,
    purpose: "profile_picture" | "client_banner",
    label: string,
    onProgress?: (pct: number) => void,
): Promise<UploadResult & { intent_id: string }> {
    const toastId = toast(content(label, "0%"), { style });

    try {
        const intent = await requestUploadIntent({ purpose });
        const result = await directUpload(file, intent, (p) => {
            toast(content(label, `${p}%`), { id: toastId, style });
            onProgress?.(p);
        });
        toast.dismiss(toastId);
        return { ...result, intent_id: intent.intent_id };
    } catch (err) {
        toast.dismiss(toastId);
        throw err;
    }
}
