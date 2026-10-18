<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		pill?: boolean;
		href?: string;
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		class?: string;
		children?: Snippet;
		onclick?: (event: MouseEvent) => void;
		[key: string]: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		pill = true,
		href,
		type = 'button',
		disabled = false,
		loading = false,
		class: customClass = '',
		children,
		onclick,
		...rest
	}: Props = $props();

	// Variant styling definitions
	const variantClasses: Record<string, string> = {
		primary:
			'bg-[#55d241] text-white hover:bg-[#46c133] hover:shadow-md hover:shadow-[#55d241]/25 active:bg-[#3fb02d]',
		secondary:
			'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300',
		outline:
			'border-2 border-[#55d241] text-[#2ba319] hover:bg-[#55d241]/10 active:bg-[#55d241]/20',
		ghost:
			'text-gray-700 hover:text-black hover:bg-gray-100/70 active:bg-gray-200/80',
		danger:
			'bg-red-500 text-white hover:bg-red-600 hover:shadow-md active:bg-red-700'
	};

	// Size styling definitions
	const sizeClasses: Record<string, string> = {
		sm: 'px-4 py-1.5 text-xs tracking-wide',
		md: 'px-7 py-2.5 text-sm md:text-base tracking-wide',
		lg: 'px-9 py-3.5 text-base md:text-lg tracking-wide'
	};

	const baseClasses =
		'inline-flex items-center justify-center font-inter font-medium select-none transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#55d241]/40 focus:ring-offset-2';
	
	const interactiveClasses =
		'cursor-pointer hover:scale-[1.02] active:scale-[0.98]';
	
	const disabledClasses =
		'opacity-50 cursor-not-allowed pointer-events-none shadow-none';
</script>

{#if href && !disabled}
	<a
		{href}
		class="{baseClasses} {variantClasses[variant] || variantClasses.primary} {sizeClasses[size] || sizeClasses.md} {pill ? 'rounded-full' : 'rounded-xl'} {disabled || loading ? disabledClasses : interactiveClasses} {customClass}"
		{...rest}
	>
		{#if loading}
			<svg
				class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</a>
{:else}
	<button
		{type}
		disabled={disabled || loading}
		{onclick}
		class="{baseClasses} {variantClasses[variant] || variantClasses.primary} {sizeClasses[size] || sizeClasses.md} {pill ? 'rounded-full' : 'rounded-xl'} {disabled || loading ? disabledClasses : interactiveClasses} {customClass}"
		{...rest}
	>
		{#if loading}
			<svg
				class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</button>
{/if}
