<script lang="ts">
	import type { OwnerProfile } from '../pengaturan.types';

	interface Props {
		initialData?: OwnerProfile;
		onSave?: (data: OwnerProfile) => void;
	}

	let {
		initialData = {
			ownerName: 'Bu Rina',
			email: 'rina@contoh.invalid',
			role: 'Owner · Pemilik usaha'
		},
		onSave
	}: Props = $props();

	let ownerName = $state('');
	let email = $state('');
	let role = $derived(initialData.role);
	let isSaved = $state(false);

	$effect(() => {
		ownerName = initialData.ownerName;
		email = initialData.email;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		onSave?.({ ownerName, email, role });
		isSaved = true;
		setTimeout(() => {
			isSaved = false;
		}, 3000);
	}
</script>

<div class="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-5">
	<h2 class="text-base sm:text-lg font-semibold text-[#111111]">
		Profil Owner
	</h2>

	<form onsubmit={handleSubmit} class="space-y-4">
		<!-- Nama Pemilik -->
		<div class="space-y-1.5">
			<label for="owner-name" class="block text-xs font-semibold text-[#111111]">
				Nama pemilik
			</label>
			<input
				id="owner-name"
				type="text"
				bind:value={ownerName}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
		</div>

		<!-- Email Akun -->
		<div class="space-y-1.5">
			<label for="owner-email" class="block text-xs font-semibold text-[#111111]">
				Email akun
			</label>
			<input
				id="owner-email"
				type="email"
				bind:value={email}
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-[#D1D5DB] rounded-lg text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A]"
			/>
			<p class="text-xs text-[#6B7280]">
				Alamat contoh, bukan akun nyata.
			</p>
		</div>

		<!-- Peran (Read-only) -->
		<div class="space-y-1.5">
			<label for="owner-role" class="block text-xs font-semibold text-[#111111]">
				Peran
			</label>
			<input
				id="owner-role"
				type="text"
				value={role}
				readonly
				class="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-[#4B5563] cursor-not-allowed select-none"
			/>
			<p class="text-xs text-[#6B7280]">
				Hanya Owner yang dapat mengelola data usaha.
			</p>
		</div>

		<!-- Action Button -->
		<div class="pt-2 flex items-center gap-3">
			<button
				type="submit"
				class="px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors cursor-pointer"
			>
				Simpan profil
			</button>
			{#if isSaved}
				<span class="text-xs font-medium text-[#16A34A]">✓ Tersimpan</span>
			{/if}
		</div>
	</form>
</div>
