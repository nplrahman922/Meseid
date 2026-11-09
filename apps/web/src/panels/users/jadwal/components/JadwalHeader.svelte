<script lang="ts">
	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Usaha Anda',
		role = 'Owner',
		dateText = ''
	}: Props = $props();
</script>

<header class="w-full space-y-4">
	<!-- Title & Subtitles -->
	<div class="space-y-1">
		<h1 class="text-2xl sm:text-3xl font-intel font-normal text-[#111111] tracking-wide">
			Jadwal
		</h1>
		<p class="text-sm font-inter text-[#4B5563]">
			Atur pesanan, pengingat, dan waktu usaha dalam satu kalender.
		</p>
		<p class="text-xs font-inter text-[#6B7280]">
			{businessName} · {role}{dateText ? ` · ${dateText}` : ''}
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
