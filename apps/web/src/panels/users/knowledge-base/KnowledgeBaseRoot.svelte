<script lang="ts">
	import KnowledgeBaseHeader from './components/KnowledgeBaseHeader.svelte';
	import KnowledgeBaseTabs from './components/KnowledgeBaseTabs.svelte';
	import KnowledgeBaseActions from './components/KnowledgeBaseActions.svelte';
	import BusinessEntriesCard from './components/BusinessEntriesCard.svelte';
	import UnansweredQuestionsCard from './components/UnansweredQuestionsCard.svelte';
	import AddEntryModal from './components/AddEntryModal.svelte';
	import type {
		KnowledgeBaseEntry,
		KnowledgeBaseTab,
		NewEntryPayload,
		UnansweredQuestion
	} from './knowledge-base.types';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Warung Bu Rina',
		role = 'Owner',
		dateText = '16 Oktober 2026, 10.00 WIB'
	}: Props = $props();

	let activeSubTab = $state<KnowledgeBaseTab>('entries');

	let entries = $state<KnowledgeBaseEntry[]>([
		{
			id: '1',
			title: 'Teh original',
			category: 'Produk / Harga',
			content: 'Rp 5.000 per gelas',
			updatedAt: '16 Okt · 09.20 WIB'
		},
		{
			id: '2',
			title: 'Jam buka warung',
			category: 'Jam operasional',
			content: 'Sen-Sab 08.00-20.00 WIB; Minggu tutup',
			updatedAt: '15 Okt · 17.00 WIB'
		},
		{
			id: '3',
			title: 'Pesanan katering',
			category: 'Produk',
			content: 'Pesan minimal 1 hari sebelumnya',
			updatedAt: '14 Okt · 10.00 WIB'
		},
		{
			id: '4',
			title: 'Bisa bayar pakai QRIS?',
			category: 'FAQ',
			content: 'Bisa, QRIS tersedia di kasir warung',
			updatedAt: '14 Okt · 09.00 WIB'
		}
	]);

	let questions = $state<UnansweredQuestion[]>([
		{
			id: '1',
			questionText: 'Ada pilihan tanpa gula?',
			channel: 'whatsapp',
			timestamp: '16 Okt 2026, 09.12 WIB',
			timesAsked: 3
		},
		{
			id: '2',
			questionText: 'Bisa kirim ke Jalan Melati?',
			channel: 'telegram',
			timestamp: '15 Okt 2026, 15.24 WIB',
			timesAsked: 1
		}
	]);

	let isModalOpen = $state(false);
	let modalTitle = $state('');
	let modalCategory = $state('Produk / Harga');
	let modalContent = $state('');
	let editingId = $state<string | null>(null);

	function openAddModal() {
		editingId = null;
		modalTitle = '';
		modalCategory = 'Produk / Harga';
		modalContent = '';
		isModalOpen = true;
	}

	function handleEditEntry(entry: KnowledgeBaseEntry) {
		editingId = entry.id;
		modalTitle = entry.title;
		modalCategory = entry.category;
		modalContent = entry.content;
		isModalOpen = true;
	}

	function handleCreateFromQuestion(q: UnansweredQuestion) {
		editingId = null;
		modalTitle = q.questionText;
		modalCategory = 'FAQ';
		modalContent = '';
		isModalOpen = true;
	}

	function handleSaveEntry(payload: NewEntryPayload) {
		if (editingId) {
			entries = entries.map((e) =>
				e.id === editingId
					? { ...e, ...payload, updatedAt: 'Baru saja' }
					: e
			);
		} else {
			const newEntry: KnowledgeBaseEntry = {
				id: Date.now().toString(),
				...payload,
				updatedAt: 'Baru saja'
			};
			entries = [newEntry, ...entries];

			// Tandai pertanyaan belum terjawab sebagai resolved jika cocok
			questions = questions.filter(
				(q) => q.questionText.toLowerCase() !== payload.title.toLowerCase()
			);
		}
		isModalOpen = false;
	}

	function handleImportCsv() {
		alert('Fitur Import CSV: Anda dapat mengunggah file CSV berformat (Judul, Kategori, Jawaban).');
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- 1. Header with Title & Decorative Line -->
	<KnowledgeBaseHeader
		{businessName}
		{role}
		{dateText}
	/>

	<!-- 2. Dual Sub-tabs: Entri usaha (4) vs Pertanyaan belum terjawab (2) -->
	<KnowledgeBaseTabs
		{activeSubTab}
		entriesCount={entries.length}
		unansweredCount={questions.length}
		onSelectTab={(tab) => (activeSubTab = tab)}
	/>

	<!-- 3. Action Buttons: Tambah entri & Import CSV -->
	<KnowledgeBaseActions
		onAddEntry={openAddModal}
		onImportCsv={handleImportCsv}
	/>

	<!-- 4. Cards Display -->
	{#if activeSubTab === 'entries'}
		<!-- Main Table Card: Entri Usaha -->
		<BusinessEntriesCard
			{entries}
			onEditEntry={handleEditEntry}
		/>

		<!-- Secondary Card: Pertanyaan Belum Terjawab (Matching Demo Mockup Stack) -->
		<UnansweredQuestionsCard
			{questions}
			onCreateEntry={handleCreateFromQuestion}
		/>
	{:else}
		<!-- Dedicated View for Pertanyaan Belum Terjawab -->
		<UnansweredQuestionsCard
			{questions}
			onCreateEntry={handleCreateFromQuestion}
		/>
	{/if}

	<!-- 5. Modal Tambah / Edit Entri -->
	<AddEntryModal
		isOpen={isModalOpen}
		initialTitle={modalTitle}
		initialCategory={modalCategory}
		initialContent={modalContent}
		onSave={handleSaveEntry}
		onClose={() => (isModalOpen = false)}
	/>
</div>
