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
}
