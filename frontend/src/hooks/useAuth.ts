import { useJwtAuth } from './useJwtAuth';

export const useAuth = () => {
  const { user, isLoading } = useJwtAuth();
  return {
    data: user,
    isLoading,
  };
};

export const useLogin = () => {
  const { login, isLoggingIn } = useJwtAuth();
  return {
    mutateAsync: login,
    isPending: isLoggingIn,
  };
};

export const useLogout = () => {
  const { logout, isLoggingOut } = useJwtAuth();
  return {
    mutateAsync: logout,
    isPending: isLoggingOut,
  };
};
