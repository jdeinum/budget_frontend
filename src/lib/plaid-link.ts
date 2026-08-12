const SCRIPT_URL = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

export interface PlaidLinkSuccessMetadata {
	institution: { name: string; institution_id: string } | null;
	accounts: Array<{ id: string; name: string; mask: string | null; type: string; subtype: string | null }>;
	link_session_id: string;
}

export interface PlaidLinkExitError {
	error_type: string;
	error_code: string;
	error_message: string;
	display_message: string | null;
}

export interface PlaidLinkExitMetadata {
	institution: { name: string; institution_id: string } | null;
	status: string | null;
	link_session_id: string;
	request_id: string;
}

export interface PlaidLinkConfig {
	token: string;
	onSuccess: (publicToken: string, metadata: PlaidLinkSuccessMetadata) => void;
	onExit?: (error: PlaidLinkExitError | null, metadata: PlaidLinkExitMetadata) => void;
}

export interface PlaidLinkHandler {
	open(): void;
	exit(options?: { force: boolean }): void;
	destroy(): void;
}

declare global {
	interface Window {
		Plaid?: {
			create(config: PlaidLinkConfig): PlaidLinkHandler;
		};
	}
}

let loadPromise: Promise<void> | null = null;

/** Injects Plaid's Link SDK script once and resolves once `window.Plaid` is ready. */
export function loadPlaidLink(): Promise<void> {
	if (typeof window === 'undefined') {
		return Promise.reject(new Error('Plaid Link can only be loaded in the browser'));
	}
	if (window.Plaid) {
		return Promise.resolve();
	}
	if (!loadPromise) {
		loadPromise = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = SCRIPT_URL;
			script.onload = () => resolve();
			script.onerror = () => {
				loadPromise = null;
				reject(new Error('Failed to load Plaid Link script'));
			};
			document.head.appendChild(script);
		});
	}
	return loadPromise;
}
