=== Missing Auth Features (from original big prompt) ===

4. Account Lockout (DB-persistent)
   - Add `locked_until` column to users table
   - After N consecutive failed attempts, lock the account
   - Add unlock mechanism (admin unlock or time-based)
   - Frontend feedback for locked accounts

=== Other Features the App Needs ===

7. Personal Access Tokens (API Tokens)
   - UI to create/revoke tokens in Settings
   - Sanctum tables already exist but unused

8. Account Deletion
   - Soft-delete or hard-delete workflow
   - Confirmation dialog

10. Security Enhancements
    - Password complexity validation (min length, special chars, etc.)
    - Require re-authentication for sensitive actions (change email, change password)

11. Frontend Polish
    - Loading states for all auth flows
    - Error boundary for auth context
    - Toast notifications for auth events

12. Test Coverage
    - Feature tests for email verification, password reset, password change
    - Integration tests for frontend auth flows
    - Reuse detection test (use old refresh token after rotation)
