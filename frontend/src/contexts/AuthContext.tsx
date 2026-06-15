import { createContext, type ReactNode } from "react";
import { useAuth, useLogin, useLogout, useRegister } from "@/hooks/useAuth";
import type { components } from "@/api/schema.d";

type UserData = components["schemas"]["UserData"];

interface AuthContextType {
    user: UserData | null | undefined;
    isLoading: boolean;
    login: ReturnType<typeof useLogin>["mutateAsync"];
    register: ReturnType<typeof useRegister>["mutateAsync"];
    logout: ReturnType<typeof useLogout>["mutateAsync"];
    isLoggingIn: boolean;
    isRegistering: boolean;
    isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { data: user, isLoading } = useAuth();
    const loginMutation = useLogin();
    const registerMutation = useRegister();
    const logoutMutation = useLogout();

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login: loginMutation.mutateAsync,
                register: registerMutation.mutateAsync,
                logout: logoutMutation.mutateAsync,
                isLoggingIn: loginMutation.isPending,
                isRegistering: registerMutation.isPending,
                isLoggingOut: logoutMutation.isPending,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
