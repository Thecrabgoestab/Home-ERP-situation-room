## Installation Guide

### Toolchain Setup

1. NodeJS (x64)
2. BunJS
3. Rustup

### Project Setup

1. Initialize a Svelte project
   `bun create svelte@latest`

- Skeleton project
- Use TypeScript syntax
- Add ESLint and Prettier

2. Install Vite 4.4.0 (?)
   For some reason, a plain vanilla Svelte project can't even install anymore without this.

`bun install vite@4.4.0`

`bun update` (Changes occurred)
`bun install` (No changes)

`bunx @svelte-add/tailwindcss@latest`

- Use TypeScript
- Default style
- Stone colour
- `src/app.css`
- `tailwind.config.ts`
- `$lib/components`
- `$lib/utils`

3. Install shadcn-svelte
   `bunx shadcn-svelte@latest init`

- Use TypeScript
- Default style
- Stone colour
- `src/app.css` (not a typo, edited this manually from `src\app.css`)
- `tailwind.config.ts`
- `$lib/components`
- `$lib/utils`

`bun update` (No changes)
`bun install` (No changes)

`bunx shadcn-svelte@latest add button`

- Yes

All successful, no errors.

4. Install Prisma
`bun install prisma --dev`
`bun add @prisma/client`
`bunx prisma init` (Make sure that NodeJS is x64)

Setup your `.env` file like so:
```bash
# Development testing
# Database provider: SQLite
DATABASE_URL="file:./sqlite.db"

# Production deployment
# Database provider: PostgreSQL
# DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

Inside of `prisma/schema.prisma`, set the following base (no models yet):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

5. Setup Lucia-auth
`bun install -D lucia`
`bun install @lucia-auth/adapter-prisma`

Huntabytes' video on setting up Lucia-auth (older video but still helpful):
https://www.youtube.com/watch?v=UMpKaZy0Rpc&list=PLZZFjR-nIShcMU8TROwX1ByY9HiTHEAAJ&index=4

Lucia-auth SvelteKit documentation:
https://lucia-auth.com/getting-started/sveltekit

Lucia-auth Prisma adapter documentation:
https://lucia-auth.com/database/prisma

Create the folders and file `src/lib/server/auth.ts` and paste the following code:

```typescript
// Authentication via Lucia through Prisma as the ORM
import { Lucia } from "lucia"
import { dev } from "$app/environment"
import { PrismaAdapter } from "@lucia-auth/adapter-prisma"
import { PrismaClient } from "@prisma/client"

// Create an instance of Prisma for the end user (client)
const client = new PrismaClient()
const adapter = new PrismaAdapter(client.session, client.user)

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// set to `true` when using HTTPS
			secure: !dev
		}
	}
})

declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
	}
}
```

Now go to prisma/schema.prisma and append the following code:

```prisma
model User {
  id       String    @id
  sessions Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(references: [id], fields: [userId], onDelete: Cascade)
}
```

`bun prisma generate`
`bun prisma db push`


Create `src/hooks.server.ts` and paste the following code:

```typescript
import { lucia } from "$lib/server/auth"
import type { Handle } from "@sveltejs/kit"

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName)
	if (!sessionId) {
		event.locals.user = null
		event.locals.session = null
		return resolve(event)
	}

	const { session, user } = await lucia.validateSession(sessionId)
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id)
		// sveltekit types deviates from the de-facto standard
		// you can use 'as any' too
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		})
	}
	if (!session) {
		const sessionCookie = lucia.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		})
	}
	event.locals.user = user
	event.locals.session = session
	return resolve(event)
}
```

Documentation on the code above:
https://lucia-auth.com/guides/
validate-session-cookies/sveltekit

Update `src/app.d.ts` with:
```typescript
interface Locals {
    user: import("lucia").User
    session: import("lucia").Session
}
```

So that it should look like this now:
```typescript
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
		interface Locals {
			user: import("lucia").User
			session: import("lucia").Session
		}
	}
}

export {}
```

Example code for `src/routes/+page.server.ts`:
```typescript
import { lucia } from "$lib/server/auth"
import { fail, redirect } from "@sveltejs/kit"

import type { Actions, PageServerLoad } from "./$types"

export const load: PageServerLoad = async (event) => {

    // If the current visitor is not a user
	if (!event.locals.user) {
		redirect(302, "/login")
    }

    // Logic for if the current visitor is a user
    // ...
}

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.user) {
			throw fail(401)
		}
		// Actions go here
	}
}
```

Example code for `src/routes/+server.ts`:
```typescript
import { lucia } from "$lib/server/auth"

export function GET(event: RequestEvent): Promise<Response> {
	if (!event.locals.user) {
		return new Response(null, {
			status: 401
		})
	}
	// Promises go here
}
```
