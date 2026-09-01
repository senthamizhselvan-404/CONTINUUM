# Auth-Gated App Testing Playbook (Emergent Google Auth)

## Step 1: Create Test User & Session (mongosh)
Use DB from backend/.env DB_NAME (test_database).
Insert into `users` (user_id, email, name, picture, created_at) and `user_sessions` (user_id, session_token, expires_at 7d, created_at).

## Step 2: Backend API
curl -X GET "$URL/api/auth/me" -H "Authorization: Bearer <SESSION_TOKEN>"
curl -X GET "$URL/api/overview" -H "Authorization: Bearer <SESSION_TOKEN>"

## Step 3: Browser Testing
Set cookie session_token (httpOnly, secure, sameSite None) then goto app.

## Demo login (fastest)
POST /api/auth/demo  -> sets session cookie + returns demo user (Alex Morgan, demo@continuum.edu).
Frontend "Enter Demo" button calls this and lands on /dashboard.

Success: /api/auth/me returns user, dashboard loads without redirect.
Failure: 401 / redirect to /login.
