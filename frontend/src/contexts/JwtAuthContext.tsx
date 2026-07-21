import {
    createContext,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { setAccessToken, refreshAccessToken } from "@/api/tokenManager";
import api from "@/api/api";
import type {
    AuthUserData,
    JwtAuthLoginPayload,
    SecurityActivityData,
    SessionResource,
} from "@/types/models";

interface JwtAuthContextType {
    user: AuthUserData | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: JwtAuthLoginPayload) => Promise<void>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    logoutReason: "manual" | "expired" | null;
    isLoggingIn: boolean;
    isLoggingOut: boolean;
    refreshUser: () => Promise<void>;
    sessions: SessionResource[];
    sessionsLoading: boolean;
    fetchSessions: () => Promise<void>;
    revokeSession: (sessionUuid: string) => Promise<void>;
    revokeAllOtherSessions: () => Promise<void>;
    permanentDeleteSession: (sessionUuid: string) => Promise<void>;
    securityActivity: SecurityActivityData[];
    securityActivityLoading: boolean;
    fetchSecurityActivity: () => Promise<void>;
}

const JwtAuthContext = createContext<JwtAuthContextType | undefined>(undefined);
export default JwtAuthContext;

let initStarted = false;

export function JwtAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [sessions, setSessions] = useState<SessionResource[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [securityActivity, setSecurityActivity] = useState<
        SecurityActivityData[]
    >([]);
    const [logoutReason, setLogoutReason] =
        useState<JwtAuthContextType["logoutReason"]>(null);
    const [securityActivityLoading, setSecurityActivityLoading] =
        useState(false);
    const mountedRef = useRef(true);

    const handleForceLogout = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setSessions([]);
        setSecurityActivity([]);
        setLogoutReason("expired");
    }, []);

    useEffect(() => {
        const handler = () => handleForceLogout();
        window.addEventListener("auth:logout", handler);
        return () => window.removeEventListener("auth:logout", handler);
    }, [handleForceLogout]);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.GET("/v1/me");
            if (mountedRef.current) {
                const userData = response.data as AuthUserData;
                setUser(userData);
            }
        } catch {
            if (mountedRef.current) {
                setUser(null);
                setAccessToken(null);
            }
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        if (initStarted) {
            return;
        }
        initStarted = true;

        const init = async () => {
            setIsLoading(true);

            try {
                const access_token = await refreshAccessToken();
                if (access_token) {
                    await refreshUser();
                }
            } catch {
                // user stays null (initial state)
            }

            if (mountedRef.current) {
                setIsLoading(false);
            }
        };

        init();

        return () => {
            mountedRef.current = false;
            // NOT resetting initStarted — module-level variable persists across
            // StrictMode double-mount but resets on actual page reload (new JS context).
            // This prevents the second parallel /refresh call that would race with
            // the first, causing token rotation to detect "reuse" and compromise
            // the session permanently.
        };
    }, [refreshUser]);

    const login = useCallback(async (credentials: JwtAuthLoginPayload) => {
        setIsLoggingIn(true);
        try {
            const response = await api.POST("/v1/login", {
                body: {
                    email: credentials.email,
                    password: credentials.password,
                    remember: credentials.remember ?? false,
                },
            });

            const { access_token } = response.data as {
                access_token: string;
            };
            setAccessToken(access_token);

            const meResponse = await api.GET("/v1/me");
            if (mountedRef.current) {
                setUser(meResponse.data as AuthUserData);
            }
        } catch (error) {
            setAccessToken(null);
            throw error;
        } finally {
            if (mountedRef.current) {
                setIsLoggingIn(false);
            }
        }
    }, []);

    const logout = useCallback(async () => {
        setIsLoggingOut(true);

        try {
            await api.POST("/v1/logout");
        } catch {
            // ignore
        } finally {
            setLogoutReason("manual");
            setAccessToken(null);
            setUser(null);
            setSessions([]);
            setSecurityActivity([]);

            if (mountedRef.current) {
                setIsLoggingOut(false);
            }
        }
    }, []);

    const logoutAll = useCallback(async () => {
        setIsLoggingOut(true);
        try {
            await api.POST("/v1/logout-all");
        } catch {
            // Proceed anyway
        } finally {
            setAccessToken(null);
            setLogoutReason("manual");
            setUser(null);
            setSessions([]);
            setSecurityActivity([]);
            if (mountedRef.current) {
                setIsLoggingOut(false);
            }
        }
    }, []);

    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const response = await api.GET("/v1/sessions");
            if (mountedRef.current) {
                setSessions(response.data?.data ?? []);
            }
        } catch {
            if (mountedRef.current) {
                setSessions([]);
            }
        } finally {
            if (mountedRef.current) {
                setSessionsLoading(false);
            }
        }
    }, []);

    const revokeSession = useCallback(async (sessionUuid: string) => {
        await api.DELETE("/v1/sessions/{sessionUuid}", {
            params: { path: { sessionUuid } },
        });
        setSessions((prev) =>
            prev.map((s) =>
                s.session_uuid === sessionUuid
                    ? { ...s, status: "revoked", revoked_at: "Just now" }
                    : s,
            ),
        );
    }, []);

    const revokeAllOtherSessions = useCallback(async () => {
        await api.POST("/v1/sessions/logout-all-others");
        setSessions((prev) =>
            prev.map((s) =>
                s.current_session
                    ? s
                    : { ...s, status: "revoked", revoked_at: "Just now" },
            ),
        );
    }, []);

    const permanentDeleteSession = useCallback(async (sessionUuid: string) => {
        await api.DELETE("/v1/sessions/{sessionUuid}/permanent", {
            params: { path: { sessionUuid } },
        });
        setSessions((prev) =>
            prev.filter((s) => s.session_uuid !== sessionUuid),
        );
    }, []);

    const fetchSecurityActivity = useCallback(async () => {
        setSecurityActivityLoading(true);
        try {
            const response = await api.GET("/v1/security-activity");
            if (mountedRef.current) {
                setSecurityActivity(response.data?.data ?? []);
            }
        } catch {
            if (mountedRef.current) {
                setSecurityActivity([]);
            }
        } finally {
            if (mountedRef.current) {
                setSecurityActivityLoading(false);
            }
        }
    }, []);

    return (
        <JwtAuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                logout,
                logoutAll,
                logoutReason,
                isLoggingIn,
                isLoggingOut,
                refreshUser,
                sessions,
                sessionsLoading,
                fetchSessions,
                revokeSession,
                revokeAllOtherSessions,
                permanentDeleteSession,
                securityActivity,
                securityActivityLoading,
                fetchSecurityActivity,
            }}
        >
            {children}
        </JwtAuthContext.Provider>
    );
}
