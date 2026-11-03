<script lang="ts">
	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
		timezone?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB',
		timezone = 'Asia/Jakarta'
	}: Props = $props();
</script>

<header class="w-full space-y-4">
	<!-- Title & Subtitles -->
	<div class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-intel font-normal text-[#111111] tracking-wide">
			Jam Operasional
		</h1>
		<p class="text-sm font-inter text-[#4B5563]">
			Jam warung yang jelas, agar pelanggan tahu kapan dilayani.
		</p>
		<p class="text-xs font-inter text-[#9CA3AF]">
			Data contoh · {businessName} · {role} · {dateText}
		</p>
	</div>

	<!-- Slider / Progress Line Decoration -->
	<div class="w-full flex items-center py-1">
		<div class="relative w-full flex items-center">
			<div class="w-2.5 h-2.5 rounded-full border-2 border-[#1ED10E] bg-white shrink-0"></div>
			<div class="flex-1 h-[1.5px] bg-[#1ED10E]/60"></div>
			<div class="w-2.5 h-2.5 rounded-full border-2 border-[#1ED10E] bg-white shrink-0"></div>
		</div>
	</div>

	<!-- Timezone & Bot Policy Banner -->
	<div
		class="w-full px-4 py-3 rounded-xl bg-[#E8F9E6] border border-[#C6F0C2] text-[#0E6B2B] text-xs sm:text-sm font-intel leading-relaxed"
	>
		Zona waktu: <span class="font-medium">{timezone} (WIB)</span> · Bot menjawab info dasar 24 jam. Pelayanan {userName} tetap mengikuti jam buka warung.
	</div>
</header>
