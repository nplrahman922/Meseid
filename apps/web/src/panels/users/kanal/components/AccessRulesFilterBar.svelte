<script lang="ts">
	interface Props {
		activeChannel: 'all' | 'whatsapp' | 'telegram';
		activeCategory: 'all' | 'group' | 'number' | 'blocked';
		searchQuery: string;
		onSelectChannel: (c: 'all' | 'whatsapp' | 'telegram') => void;
		onSelectCategory: (cat: 'all' | 'group' | 'number' | 'blocked') => void;
	}

	let {
		activeChannel,
		activeCategory,
		searchQuery = $bindable(''),
		onSelectChannel,
		onSelectCategory
	}: Props = $props();
</script>

<div class="space-y-3 font-intel">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<!-- Channel Filter Pills -->
		<div class="flex items-center gap-1.5">
			<button
				type="button"
				onclick={() => onSelectChannel('all')}
				class="px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors {activeChannel === 'all' ? 'bg-[#111111] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
			>
				Semua Kanal
			</button>
			<button
				type="button"
				onclick={() => onSelectChannel('whatsapp')}
				class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors {activeChannel === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}"
			>
				<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
				<span>WhatsApp</span>
			</button>
			<button
				type="button"
				onclick={() => onSelectChannel('telegram')}
				class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors {activeChannel === 'telegram' ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'}"
			>
				<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
				<span>Telegram</span>
			</button>
		</div>

		<!-- Search Input -->
		<div class="relative w-full sm:w-64">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Cari nama, nomor, grup..."
				class="w-full text-xs py-1.5 pl-8 pr-3 rounded-lg border border-gray-200 focus:outline-none focus:border-[#0E6B2B]"
			/>
			<svg class="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
		</div>
	</div>

	<!-- Category Filter Pills -->
	<div class="flex items-center gap-1.5 border-b border-gray-100 pb-2">
		<button
			type="button"
			onclick={() => onSelectCategory('all')}
			class="text-xs px-2.5 py-1 rounded font-medium cursor-pointer {activeCategory === 'all' ? 'text-[#0E6B2B] font-semibold bg-emerald-50' : 'text-gray-500 hover:text-gray-900'}"
		>
			Semua
		</button>
		<button
			type="button"
			onclick={() => onSelectCategory('group')}
			class="text-xs px-2.5 py-1 rounded font-medium cursor-pointer {activeCategory === 'group' ? 'text-[#0E6B2B] font-semibold bg-emerald-50' : 'text-gray-500 hover:text-gray-900'}"
		>
			Grup Usaha
		</button>
		<button
			type="button"
			onclick={() => onSelectCategory('number')}
			class="text-xs px-2.5 py-1 rounded font-medium cursor-pointer {activeCategory === 'number' ? 'text-[#0E6B2B] font-semibold bg-emerald-50' : 'text-gray-500 hover:text-gray-900'}"
		>
			Kontak Personal
		</button>
		<button
			type="button"
			onclick={() => onSelectCategory('blocked')}
			class="text-xs px-2.5 py-1 rounded font-medium cursor-pointer {activeCategory === 'blocked' ? 'text-red-700 font-semibold bg-red-50' : 'text-gray-500 hover:text-red-600'}"
		>
			Diblokir (Blacklist)
		</button>
	</div>
</div>
