import { writable } from 'svelte/store';

export interface AuthUser {
	id: string;
	email: string;
	role: 'owner' | 'admin';
	status: string;
}

export interface AuthOwner {
	id: string;
	business_name: string;
	business_type: string;
	timezone: string;
	status: string;
}

export interface AuthSubscription {
	plan_name: string;
	display_name: string;
	status: string;
	current_period_end: string | null;
}

export interface AuthState {
	isLoading: boolean;
	isAuthenticated: boolean;
	user: AuthUser | null;
	owner: AuthOwner | null;
	subscription: AuthSubscription | null;
	error: string | null;
}

const initialState: AuthState = {
	isLoading: true,
	isAuthenticated: false,
	user: null,
	owner: null,
	subscription: null,
	error: null
};

export const authState = writable<AuthState>(initialState);

/**
 * Check currently logged in user from backend API (/api/auth/me)
 */
export async function checkAuth(): Promise<AuthState> {
	if (typeof window === 'undefined') {
		return initialState;
	}

	try {
		authState.update((s) => ({ ...s, isLoading: true, error: null }));

		const res = await fetch('/api/auth/me', {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include'
		});

		if (res.ok) {
			const data = await res.json();
			const newState: AuthState = {
				isLoading: false,
				isAuthenticated: true,
				user: data.user || null,
				owner: data.owner || null,
				subscription: data.subscription || null,
				error: null
			};
			authState.set(newState);
			return newState;
		} else {
			const newState: AuthState = {
				isLoading: false,
				isAuthenticated: false,
				user: null,
				owner: null,
				subscription: null,
				error: null
			};
			authState.set(newState);
			return newState;
		}
	} catch (err: any) {
		const newState: AuthState = {
			isLoading: false,
			isAuthenticated: false,
			user: null,
			owner: null,
			subscription: null,
			error: err.message || 'Gagal memeriksa sesi'
		};
		authState.set(newState);
		return newState;
	}
}

/**
 * Initiate Google OAuth Login
 */
export function loginWithGoogle(returnUrl?: string) {
	if (typeof window === 'undefined') return;
	const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
	window.location.href = `/api/auth/google${params}`;
}

/**
 * Log out from backend and redirect to landing page
 */
export async function logoutUser(redirectTo: string = '/') {
	if (typeof window === 'undefined') return;

	try {
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include'
		});
	} catch (err) {
		console.warn('Logout network error:', err);
	} finally {
		authState.set({
			isLoading: false,
			isAuthenticated: false,
			user: null,
			owner: null,
			subscription: null,
			error: null
		});
		window.location.href = redirectTo;
	}
}

/**
 * Route Guard for protected dashboard pages.
 * Redirects unauthenticated visitors to /join-us.
 * Redirects users with mismatched roles to their appropriate dashboard.
 * Returns true if authenticated with correct role, false if redirected.
 */
export async function requireAuth(expectedRole?: 'owner' | 'admin'): Promise<boolean> {
	if (typeof window === 'undefined') return false;

	const state = await checkAuth();

	if (!state.isAuthenticated || !state.user) {
		window.location.replace('/join-us');
		return false;
	}

	if (expectedRole && state.user.role !== expectedRole) {
		if (state.user.role === 'admin') {
			window.location.replace('/dashboard-admin');
		} else {
			window.location.replace('/dashboard');
		}
		return false;
	}

	return true;
}

/**
 * Route helper for /join-us:
 * If user is already authenticated, redirects them straight to their dashboard.
 */
export async function redirectIfAuthenticated(): Promise<boolean> {
	if (typeof window === 'undefined') return false;

	const state = await checkAuth();
	if (state.isAuthenticated && state.user) {
		if (state.user.role === 'admin') {
			window.location.replace('/dashboard-admin');
		} else {
			window.location.replace('/dashboard');
		}
		return true;
	}
	return false;
}

