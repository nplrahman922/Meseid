export type ReportType = 'laba_rugi' | 'neraca';
export type ExportFormat = 'pdf' | 'word' | 'excel';

export interface DocumentItem {
	id: string;
	fileName: string;
	contentPeriod: string;
	latestVersion: string;
	fileSize: string;
	format: ExportFormat;
	updatedAt: string;
}

export interface RecentDownloadItem {
	id: string;
	fileName: string;
	fileSize: string;
	updatedAt: string;
	version: string;
	format: ExportFormat;
	downloadUrl?: string;
}

export interface ReportGeneratorForm {
	reportType: ReportType;
	periodText: string;
	exportFormat: ExportFormat;
}
