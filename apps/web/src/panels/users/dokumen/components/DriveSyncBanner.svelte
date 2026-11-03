<script lang="ts">
	interface Props {
		businessName?: string;
	}

	let { businessName = 'Warung Bu Rina' }: Props = $props();
</script>

<div class="w-full bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3.5 sm:p-4 text-xs text-[#166534] leading-relaxed">
	Google Drive terhubung · Folder Meseid / {businessName}. Gmail nonaktif; unduh file langsung atau aktifkan izin kirim laporan di Kanal.
</div>
