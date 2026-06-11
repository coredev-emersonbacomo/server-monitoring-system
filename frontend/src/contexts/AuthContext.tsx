import { createContext, useCallback, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

export interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_QUERY_KEY = ["auth-user"] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();

    const userQuery = useQuery<User>({
        queryKey: USER_QUERY_KEY,
        queryFn: async () => {
            const { data } = await api.get<User>("/me");
            return data;
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    const loginMutation = useMutation<
        User,
        Error,
        { email: string; password: string }
    >({
        mutationFn: ({ email, password }) =>
            api.post<User>("/login", { email, password }).then((r) => r.data),
        onSuccess: (user) => {
            queryClient.setQueryData(USER_QUERY_KEY, user);
        },
    });

    const registerMutation = useMutation<
        User,
        Error,
        { name: string; email: string; password: string }
    >({
        mutationFn: ({ name, email, password }) =>
            api
                .post<User>("/register", { name, email, password })
                .then((r) => r.data),
        onSuccess: (user) => {
            queryClient.setQueryData(USER_QUERY_KEY, user);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => api.post("/logout"),
        onSettled: () => {
            queryClient.setQueryData(USER_QUERY_KEY, null);
            queryClient.clear();
        },
    });

    const login = useCallback(
        async (email: string, password: string) => {
            await loginMutation.mutateAsync({ email, password });
        },
        [loginMutation],
    );

    const register = useCallback(
        async (name: string, email: string, password: string) => {
            await registerMutation.mutateAsync({ name, email, password });
        },
        [registerMutation],
    );

    const logout = useCallback(async () => {
        await logoutMutation.mutateAsync();
    }, [logoutMutation]);

    return (
        <AuthContext.Provider
            value={{
                user: userQuery.data ?? null,
                loading: userQuery.isLoading,
                login,
                logout,
                register,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
