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
