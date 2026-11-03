<script lang="ts">
	interface Props {
		businessName?: string;
		userName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		userName = 'Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	function getGreeting(): string {
		const hour = new Date().getHours();
		if (hour >= 4 && hour < 11) return 'Selamat pagi';
		if (hour >= 11 && hour < 15) return 'Selamat siang';
		if (hour >= 15 && hour < 18) return 'Selamat sore';
		return 'Selamat malam';
	}
</script>

<header class="w-full space-y-4">
	<!-- Title & Subtitles -->
	<div class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-intel font-normal text-[#111111] tracking-wide">
			Beranda
		</h1>
		<p class="text-sm font-inter text-[#4B5563]">
			{getGreeting()}, {userName}. Ini kabar usaha hari ini.
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
</header>
