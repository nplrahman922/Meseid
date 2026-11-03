export interface OwnerProfile {
	ownerName: string;
	email: string;
	role: string;
}

export interface BusinessProfile {
	businessName: string;
	businessType: string;
	address: string;
	timezone: string;
}

export type ExportRequestStatus = 'not_requested' | 'processing' | 'ready';
