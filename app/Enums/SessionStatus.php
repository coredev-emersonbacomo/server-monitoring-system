<?php

namespace App\Enums;

enum SessionStatus: string
{
    case Active = 'active';
    case Revoked = 'revoked';
    case Expired = 'expired';
    case Compromised = 'compromised';
}
