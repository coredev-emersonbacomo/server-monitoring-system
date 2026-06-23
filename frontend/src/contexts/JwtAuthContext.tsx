import {
    createContext,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import axios from "axios";
import jwtClient, { setAccessToken } from "@/api/jwtClient";
import { useNavigate } from "react-router-dom";
import type { AuthUserData } from "@/types/models";

interface LoginCredentials {
    email: string;
    password: string;
    remember?: boolean;
}

interface SessionData {
    session_uuid: string;
    device_name: string | null;
    device_type: string | null;
    browser: string | null;
    operating_system: string | null;
    ip_address: string | null;
    remember_me: boolean;
    last_activity_at: string | null;
    last_activity_at_timestamp: string | null;
    created_at: string | null;
    created_at_timestamp: string | null;
    current_session: boolean;
    status: string;
    compromised: boolean;
    compromised_at: string | null;
    compromised_at_timestamp: string | null;
    compromise_reason: string | null;
    revoked_at: string | null;
    revoked_at_timestamp: string | null;
}

interface SecurityActivityData {
    id: number;
    event_type: string;
    ip_address: string | null;
    created_at: string | null;
    created_at_timestamp: string | null;
    metadata: Record<string, unknown> | null;
}

interface JwtAuthContextType {
    user: AuthUserData | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    logoutAll: () => Promise<void>;
    isLoggingIn: boolean;
    isLoggingOut: boolean;
    refreshUser: () => Promise<void>;
    sessions: SessionData[];
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
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [securityActivity, setSecurityActivity] = useState<
        SecurityActivityData[]
    >([]);
    const [securityActivityLoading, setSecurityActivityLoading] =
        useState(false);
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    const handleForceLogout = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setSessions([]);
        setSecurityActivity([]);
        navigate("/login", { replace: true });
    }, [navigate]);

    useEffect(() => {
        const handler = () => handleForceLogout();
        window.addEventListener("auth:logout", handler);
        return () => window.removeEventListener("auth:logout", handler);
    }, [handleForceLogout]);

    const refreshUser = useCallback(async () => {
        try {
            const response = await jwtClient.get("/me");
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
                const response = await axios.post(
                    "/api/refresh",
                    {},
                    { withCredentials: true },
                );
                const { access_token } = response.data;
                if (access_token) {
                    setAccessToken(access_token);
                    await refreshUser();
                }
            } catch {
                // user stays null (initial state)
            } finally {
                if (mountedRef.current) {
                    setIsLoading(false);
                }
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

    const login = useCallback(async (credentials: LoginCredentials) => {
        setIsLoggingIn(true);
        try {
            const response = await jwtClient.post("/login", {
                email: credentials.email,
                password: credentials.password,
                remember: credentials.remember ?? false,
            });

            const { access_token } = response.data;
            setAccessToken(access_token);

            const meResponse = await jwtClient.get("/me");
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
            await jwtClient.post("/logout");
        } catch {
            // Proceed anyway
        } finally {
            setAccessToken(null);
            setUser(null);
            setSessions([]);
            setSecurityActivity([]);
            if (mountedRef.current) {
                setIsLoggingOut(false);
            }
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    const logoutAll = useCallback(async () => {
        setIsLoggingOut(true);
        try {
            await jwtClient.post("/logout-all");
        } catch {
            // Proceed anyway
        } finally {
            setAccessToken(null);
            setUser(null);
            setSessions([]);
            setSecurityActivity([]);
            if (mountedRef.current) {
                setIsLoggingOut(false);
            }
            navigate("/login", { replace: true });
        }
    }, [navigate]);

    const fetchSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const response = await jwtClient.get("/sessions");
            if (mountedRef.current) {
                setSessions(response.data.data ?? []);
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
        await jwtClient.delete(`/sessions/${sessionUuid}`);
        setSessions((prev) =>
            prev.map((s) =>
                s.session_uuid === sessionUuid
                    ? { ...s, status: "revoked", revoked_at: "Just now" }
                    : s,
            ),
        );
    }, []);

    const revokeAllOtherSessions = useCallback(async () => {
        await jwtClient.post("/sessions/logout-all-others");
        setSessions((prev) =>
            prev.map((s) =>
                s.current_session
                    ? s
                    : { ...s, status: "revoked", revoked_at: "Just now" },
            ),
        );
    }, []);

    const permanentDeleteSession = useCallback(async (sessionUuid: string) => {
        await jwtClient.delete(`/sessions/${sessionUuid}/permanent`);
        setSessions((prev) =>
            prev.filter((s) => s.session_uuid !== sessionUuid),
        );
    }, []);

    const fetchSecurityActivity = useCallback(async () => {
        setSecurityActivityLoading(true);
        try {
            const response = await jwtClient.get("/security-activity");
            if (mountedRef.current) {
                setSecurityActivity(response.data.data ?? []);
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
