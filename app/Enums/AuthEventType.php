<?php

namespace App\Enums;

enum AuthEventType: string
{
    case Login = 'login';
    case LoginFailed = 'login_failed';
    case Refresh = 'refresh';
    case RefreshFailed = 'refresh_failed';
    case Logout = 'logout';
    case LogoutAll = 'logout_all';
    case SessionRevoked = 'session_revoked';
    case SessionExpired = 'session_expired';
    case SessionCompromised = 'session_compromised';
    case RefreshTokenReuseDetected = 'refresh_token_reuse_detected';
    case PasswordResetRequested = 'password_reset_requested';
    case PasswordResetCodeVerified = 'password_reset_code_verified';
    case PasswordResetCompleted = 'password_reset_completed';
    case PasswordResetFailed = 'password_reset_failed';
}
