# Habit Tracker Backend

A RESTful Node.js/Express backend for managing personal habits, daily check-ins, and long-term goals. The service exposes JWT-protected APIs for authentication, habit scheduling with flexible frequencies, progress tracking, and goal-step management on PostgreSQL.

## Technology Stack and Rationale
- **Node.js (JavaScript runtime)** – Event-driven, non-blocking I/O keeps the API responsive under concurrent requests without a heavy runtime footprint.
- **Express 5** – Minimal framework that composes middleware and routes cleanly; HTTP concerns are explicit and easy to extend with custom middleware.
- **PostgreSQL** – Strong relational guarantees for user-owned data, plus JSONB support to store flexible habit frequency rules without extra tables.
- **pg** – Official PostgreSQL driver; connection pooling and parameterized queries reduce latency and block SQL injection attempts.
- **bcryptjs** – Salts and hashes passwords before storage; pure JS implementation avoids native compile steps while remaining battle-tested.
- **jsonwebtoken (JWT)** – Stateless auth tokens allow horizontal scaling without session storage; payload includes user metadata and 7-day expiry.
- **cors** – Enables controlled cross-origin requests from frontend clients.
- **dotenv** – Loads environment variables from `.env`, keeping secrets (DB credentials, JWT secret) outside source control.

## Project Structure
```
src/
  config/
    db.js              # PostgreSQL pool and DATE type parser override
  controllers/         # Request handlers per domain
    authController.js
    categoryController.js
    habitController.js
    checkinController.js
    goalController.js
  middleware/
    userMiddleware.js  # JWT guard for protected routes
  routes/
    authRoutes.js      # Public auth endpoints
    apiRoutes.js       # Protected domain routers
  server.js            # Express bootstrap and wiring
```

### Entry Point: `src/server.js`
- Registers global middleware (`cors`, JSON body parsing).
- Mounts public auth routes under `/api/auth`.
- Applies `userMiddleware` to all subsequent `/api` routes before delegating to domain routers.
- Reads `PORT` from environment (default `5000`) and starts the HTTP server.

### Database Configuration: `src/config/db.js`
- Builds a shared PostgreSQL pool from `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`.
- Overrides type OID `1082` to return DATE columns as strings, avoiding implicit timezone shifts when only date precision is needed.

### Authentication Middleware: `src/middleware/userMiddleware.js`
- Expects `Authorization: Bearer <token>` header; missing tokens return `401` with a clear message.
- Verifies JWT with `JWT_SECRET`; attaches `req.userId` and `req.user` payloads for downstream handlers.
- Catches verification errors (invalid/expired) and responds with `401`.

## Database Schema
The backend uses a relational model with ownership scoping and cascade rules to keep data consistent.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_id NULL means a default category available to all users
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#000000',
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    frequency JSONB DEFAULT '{"type": "daily"}',
    reminder_time TIME,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (habit_id, checkin_date)
);

CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    deadline DATE,
    status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goal_steps (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    step_order INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Schema Design Notes
- **Ownership and cascading** – Users own habits, goals, and user-specific categories; cascading deletes clean up dependent rows automatically.
- **Categories** – Support shared defaults (`user_id` NULL) plus per-user overrides; colors stored for frontend display consistency.
- **Habits** – Optional category, flexible `frequency` JSONB (e.g., `{ "type": "specific_days", "days": [1,3,5] }`), nullable `reminder_time`, and `is_archived` flag for soft-hiding.
- **Check-ins** – Unique `(habit_id, checkin_date)` enforces at most one completion per day per habit; ties a specific date to progress history.
- **Goals & steps** – Steps cascade with goals and are ordered via `step_order`; goal status is constrained (`in_progress`, `completed`, `abandoned`).

## API and Module Details
### Authentication (`src/controllers/authController.js`, `src/routes/authRoutes.js`)
- **POST `/api/auth/register`** – Validates presence of username/email/password, checks uniqueness, hashes password with `bcryptjs`, inserts the user, and signs a JWT containing `id`, `username`, and `email` (7-day expiry).
- **POST `/api/auth/login`** – Looks up by email, compares password against `password_hash`, and issues a fresh JWT with the same payload shape.
- **GET `/api/auth/me`** – Requires JWT; returns the decoded user payload for session introspection.

### Authorization Middleware (`src/middleware/userMiddleware.js`)
- Guards all `/api` routes (except `/api/auth/**`); requests without a valid bearer token are rejected before hitting controllers.

### Protected Domain Routes (`src/routes/apiRoutes.js`)
All handlers run with `req.userId` from the JWT for row-level access control.

#### Categories (`src/controllers/categoryController.js`)
- **GET `/api/categories`** – Merges global categories with the user’s own categories using a UNION query; sorted by ID for deterministic ordering.

#### Habits (`src/controllers/habitController.js`)
- **GET `/api/habits`** – Returns non-archived habits for the user joined with category metadata; leaves `reminder_time` formatting untouched for client control.
- **POST `/api/habits`** – Coerces empty `reminder_time` to `NULL`, defaults `frequency` to `{ type: "daily" }`, and inserts a habit tied to the authenticated user.
- **PUT `/api/habits/:id`** – Updates fields for the owner; preserves frequency defaulting and normalizes reminder time.
- **DELETE `/api/habits/:id`** – Deletes only if owned by the user; otherwise returns `404`.

#### Check-ins (`src/controllers/checkinController.js`)
- **GET `/api/checkins`** – Lists all check-ins for habits owned by the user (habit ID and date).
- **POST `/api/checkins`** – Inserts a check-in for the specified habit/date; gracefully reports if the check-in already exists due to the unique constraint.

#### Goals and Steps (`src/controllers/goalController.js`)
- **GET `/api/goals`** – Aggregates total/completed steps per goal and derives status (`completed`, `overdue`, `in_progress`) based on deadline vs. completion.
- **POST `/api/goals`** – Creates goals with optional description/deadline; defaults status to `in_progress`.
- **PUT `/api/goals/:id`** – Updates goal fields for the owner; empty deadline strings are normalized to `NULL`.
- **DELETE `/api/goals/:id`** – Removes a goal owned by the user.
- **GET `/api/goals/:goalId/steps`** – Lists steps ordered by `step_order` then `id`.
- **POST `/api/goals/:goalId/steps`** – Adds a new step to a goal.
- **PUT `/api/goal-steps/:stepId`** – Updates step description and/or `is_completed` while preserving unspecified fields.
- **DELETE `/api/goal-steps/:stepId`** – Deletes a specific step.

## Request Handling Flow
1. Client registers or logs in to receive a JWT signed with `JWT_SECRET`.
2. Client includes `Authorization: Bearer <token>` for protected `/api` endpoints.
3. `userMiddleware` verifies the token and injects user context.
4. Controllers run parameterized SQL through the shared pool, scoping queries to `req.userId` to prevent cross-user access.
5. Responses are returned as JSON; errors fall back to `500` with generic messages while logging the issue server-side.

## Configuration
Set the following variables (e.g., in a local `.env`):
```
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=habit_tracker
DB_PORT=5432
JWT_SECRET=replace_with_strong_secret
```

## Running the Project
### Install dependencies
```bash
npm install
```

### Development
```bash
# run with live reload if you have nodemon globally installed
NODE_ENV=development node src/server.js
# or: npx nodemon src/server.js
```

### Production / Build
There is no compile step; set production env vars and run Node directly:
```bash
NODE_ENV=production node src/server.js
```
Use a process manager (PM2/systemd) for restarts and configure reverse proxy/TLS as needed.

## Security Considerations
- Passwords are hashed with `bcryptjs`; plaintext passwords never persist.
- JWTs expire after seven days; invalid or missing tokens return `401` responses.
- All SQL statements are parameterized to mitigate injection.
- Foreign keys and cascading deletes preserve relational integrity; unique check-in constraint prevents duplicate daily entries.

## Extensibility Notes
- `frequency` JSONB can represent new scheduling shapes without migrations (e.g., weekly, monthly patterns).
- Category model already supports shared defaults and per-user customizations; extendable with icons or ordering fields.
- Goal status is computed in the controller; could be moved to a view or materialized view if the logic grows.
