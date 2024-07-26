// Authentication via Lucia through Prisma as the ORM
import { Lucia } from 'lucia'
import { dev } from '$app/environment'
import { PrismaAdapter } from '@lucia-auth/adapter-prisma'
import { PrismaClient } from '@prisma/client'

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

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia
	}
}
