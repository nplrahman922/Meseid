<script lang="ts">
	import { onMount } from 'svelte';
	import KnowledgeBaseHeader from './components/KnowledgeBaseHeader.svelte';
	import KnowledgeBaseTabs from './components/KnowledgeBaseTabs.svelte';
	import KnowledgeBaseActions from './components/KnowledgeBaseActions.svelte';
	import BusinessEntriesCard from './components/BusinessEntriesCard.svelte';
	import UnansweredQuestionsCard from './components/UnansweredQuestionsCard.svelte';
	import AddEntryModal from './components/AddEntryModal.svelte';
	import DeleteConfirmModal from './components/DeleteConfirmModal.svelte';
	import ImportCsvModal from './components/ImportCsvModal.svelte';
	import {
		fetchKnowledgeBaseList,
		createKnowledgeBaseEntry,
		updateKnowledgeBaseEntry,
		deleteKnowledgeBaseEntry,
		batchImportKnowledgeBase,
		fetchUnansweredQuestions,
		resolveUnansweredQuestion
	} from './knowledge-base-api.service';
	import type {
		KnowledgeBaseEntry,
		KnowledgeBaseTab,
		NewEntryPayload,
		UnansweredQuestion,
		CsvKnowledgeBaseItem
	} from './knowledge-base.types';

	interface Props {
		businessName?: string;
		role?: string;
		dateText?: string;
	}

	let {
		businessName = 'Meseid Store',
		role = 'Owner',
		dateText = ''
	}: Props = $props();

	let activeSubTab = $state<KnowledgeBaseTab>('entries');
	let entries = $state<KnowledgeBaseEntry[]>([]);
	let questions = $state<UnansweredQuestion[]>([]);
	let isLoading = $state(true);
	let toastMessage = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	// Modal States
	let isAddModalOpen = $state(false);
	let modalInitialTitle = $state('');
	let modalInitialCategory = $state('Produk / Harga');
	let modalInitialContent = $state('');
	let modalInitialInternal = $state(false);
	let editingEntry = $state<KnowledgeBaseEntry | null>(null);
	let pendingQuestionId = $state<string | null>(null);

	let isDeleteModalOpen = $state(false);
	let deletingEntry = $state<KnowledgeBaseEntry | null>(null);

	let isImportModalOpen = $state(false);

	function showToast(msg: string) {
		toastMessage = msg;
		setTimeout(() => {
			if (toastMessage === msg) toastMessage = null;
		}, 3500);
	}

	async function loadAllData() {
		isLoading = true;
		errorMessage = null;
		try {
			const [kbList, questionList] = await Promise.all([
				fetchKnowledgeBaseList(),
				fetchUnansweredQuestions(false)
			]);
			entries = kbList;
			questions = questionList;
		} catch (err: any) {
			errorMessage = err.message || 'Gagal memuat data Knowledge Base dari server.';
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		loadAllData();
	});

	function openAddModal() {
		editingEntry = null;
		pendingQuestionId = null;
		modalInitialTitle = '';
		modalInitialCategory = 'Produk / Harga';
		modalInitialContent = '';
		modalInitialInternal = false;
		isAddModalOpen = true;
	}

	function handleEditEntry(entry: KnowledgeBaseEntry) {
		editingEntry = entry;
		pendingQuestionId = null;
		modalInitialTitle = entry.title;
		modalInitialCategory = entry.category;
		modalInitialContent = entry.content;
		modalInitialInternal = entry.is_internal ?? false;
		isAddModalOpen = true;
	}

	function handleCreateFromQuestion(q: UnansweredQuestion) {
		editingEntry = null;
		pendingQuestionId = q.id;
		modalInitialTitle = q.question_text || q.questionText || '';
		modalInitialCategory = 'FAQ';
		modalInitialContent = '';
		modalInitialInternal = false;
		isAddModalOpen = true;
	}

	function handleDeleteRequest(entry: KnowledgeBaseEntry) {
		deletingEntry = entry;
		isDeleteModalOpen = true;
	}

	async function handleConfirmDelete() {
		if (!deletingEntry) return;
		try {
			await deleteKnowledgeBaseEntry(deletingEntry.id);
			entries = entries.filter((e) => e.id !== deletingEntry!.id);
			showToast('Entri berhasil dihapus dari Knowledge Base.');
		} catch (err: any) {
			alert(err.message || 'Gagal menghapus entri.');
		} finally {
			deletingEntry = null;
		}
	}

	async function handleSaveEntry(payload: NewEntryPayload) {
		if (editingEntry) {
			const updated = await updateKnowledgeBaseEntry(editingEntry.id, payload);
			entries = entries.map((e) => (e.id === updated.id ? updated : e));
			showToast('Entri berhasil diperbarui.');
		} else {
			const created = await createKnowledgeBaseEntry(payload);
			entries = [created, ...entries];
			showToast('Entri baru berhasil ditambahkan.');

			if (pendingQuestionId) {
				try {
					await resolveUnansweredQuestion(pendingQuestionId, created.id);
					questions = questions.filter((q) => q.id !== pendingQuestionId);
				} catch (err) {
					console.warn('Gagal menandai pertanyaan selesai:', err);
				}
				pendingQuestionId = null;
			}
		}
		isAddModalOpen = false;
	}

	async function handleImportCsvBatch(items: CsvKnowledgeBaseItem[]) {
		const imported = await batchImportKnowledgeBase(items);
		entries = [...imported, ...entries];
		showToast(`Berhasil mengimpor ${imported.length} entri ke Knowledge Base.`);
	}
</script>

<div class="w-full max-w-5xl mx-auto space-y-6 pb-12">
	<!-- Toast Notification -->
	{#if toastMessage}
		<div class="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#0E6B2B] text-white text-xs font-intel rounded-xl shadow-lg transition-all animate-bounce">
			<span>✓</span>
			<span>{toastMessage}</span>
		</div>
	{/if}

	<!-- Header -->
	<KnowledgeBaseHeader {businessName} {role} {dateText} />

	<!-- Error Alert -->
	{#if errorMessage}
		<div class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-intel flex items-center justify-between">
			<span>{errorMessage}</span>
			<button type="button" onclick={loadAllData} class="underline font-medium hover:text-red-800">
				Coba lagi
			</button>
		</div>
	{/if}

	<!-- Tabs -->
	<KnowledgeBaseTabs
		{activeSubTab}
		entriesCount={entries.length}
		unansweredCount={questions.length}
		onSelectTab={(tab) => (activeSubTab = tab)}
	/>

	<!-- Action Buttons -->
	<KnowledgeBaseActions
		onAddEntry={openAddModal}
		onImportCsv={() => (isImportModalOpen = true)}
	/>

	<!-- Cards Display -->
	{#if activeSubTab === 'entries'}
		<BusinessEntriesCard
			{entries}
			{isLoading}
			onEditEntry={handleEditEntry}
			onDeleteEntry={handleDeleteRequest}
		/>
		<UnansweredQuestionsCard
			{questions}
			{isLoading}
			onCreateEntry={handleCreateFromQuestion}
		/>
	{:else}
		<UnansweredQuestionsCard
			{questions}
			{isLoading}
			onCreateEntry={handleCreateFromQuestion}
		/>
	{/if}

	<!-- Add / Edit Modal -->
	<AddEntryModal
		isOpen={isAddModalOpen}
		initialTitle={modalInitialTitle}
		initialCategory={modalInitialCategory}
		initialContent={modalInitialContent}
		initialIsInternal={modalInitialInternal}
		onSave={handleSaveEntry}
		onClose={() => (isAddModalOpen = false)}
	/>

	<!-- Delete Confirm Modal -->
	<DeleteConfirmModal
		isOpen={isDeleteModalOpen}
		entryTitle={deletingEntry?.title || ''}
		onConfirm={handleConfirmDelete}
		onClose={() => (isDeleteModalOpen = false)}
	/>

	<!-- Import CSV Modal -->
	<ImportCsvModal
		isOpen={isImportModalOpen}
		onImport={handleImportCsvBatch}
		onClose={() => (isImportModalOpen = false)}
	/>
</div>
