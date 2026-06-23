import { createContext, type ReactNode } from "react";
import { useAuth, useLogin, useLogout } from "@/hooks/useAuth";
import type { AuthUserData } from "@/types/models";

interface AuthContextType {
    user: AuthUserData | null;
    isLoading: boolean;
    login: ReturnType<typeof useLogin>["mutateAsync"];
    logout: ReturnType<typeof useLogout>["mutateAsync"];
    isLoggingIn: boolean;
    isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { data: user, isLoading } = useAuth();
    const loginMutation = useLogin();
    const logoutMutation = useLogout();

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login: loginMutation.mutateAsync,
                logout: logoutMutation.mutateAsync,
                isLoggingIn: loginMutation.isPending,
                isLoggingOut: logoutMutation.isPending,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
