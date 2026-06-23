import { useContext } from "react";
import JwtAuthContext from "@/contexts/JwtAuthContext";

export const useAuthContext = () => {
    const context = useContext(JwtAuthContext);
    if (!context) {
        throw new Error("useAuthContext must be used within JwtAuthProvider");
    }
    return {
        ...context,
        login: context.login,
        logout: context.logout,
        user: context.user,
        isLoading: context.isLoading,
        isLoggingIn: context.isLoggingIn,
        isLoggingOut: context.isLoggingOut,
    };
};
