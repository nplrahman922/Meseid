export type FinancialReportTab =
	| 'jurnal'
	| 'buku-besar'
	| 'neraca'
	| 'buku-kas'
	| 'utang-piutang';

export interface JournalEntryItem {
	id: string;
	date: string;
	refCode: string;
	debitAccount: string;
	creditAccount: string;
	debitAmount: number;
	creditAmount: number;
}

export interface GeneralLedgerItem {
	id: string;
	refCode: string;
	changeAmount: number;
	runningBalance: number;
}

export interface TrialBalanceItem {
	id: string;
	accountName: string;
	debit: number | null;
	credit: number | null;
}

export interface CashBookItem {
	id: string;
	date: string;
	description: string;
	type: 'masuk' | 'keluar';
	amount: number;
	isSelected: boolean;
}

export interface SubledgerItem {
	id: string;
	type: 'Utang' | 'Piutang';
	unpaidAmount: number;
	note: string;
}
