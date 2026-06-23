import { useContext } from "react";
import JwtAuthContext from "@/contexts/JwtAuthContext";

export function useJwtAuth() {
    const context = useContext(JwtAuthContext);
    if (context === undefined) {
        throw new Error("useJwtAuth must be used within a JwtAuthProvider");
    }
    return context;
}
