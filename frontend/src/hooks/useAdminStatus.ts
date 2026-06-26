import { useQuery } from "@tanstack/react-query";
import { useJwtAuth } from "./useJwtAuth";

export function useAdminStatus() {
    const { user } = useJwtAuth();

    return useQuery({
        queryKey: ["adminStatus", user?.uuid],
        queryFn: async () => {
            if (!user?.uuid) {
                return false;
            }

            const response = await fetch(`/api/admin/check/${user.uuid}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            return data.is_admin === true;
        },
        enabled: !!user?.uuid,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}