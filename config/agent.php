<?php

return [
    // Short-lived agent session credential lifetime (seconds).
    'session_ttl' => env('AGENT_SESSION_TTL', 900),

    // Cryptographic challenge lifetime (seconds) — single-use, random, short-lived.
    'challenge_ttl' => env('AGENT_CHALLENGE_TTL', 60),
];
