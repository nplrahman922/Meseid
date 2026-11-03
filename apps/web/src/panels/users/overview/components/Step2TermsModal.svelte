<script lang="ts">
	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onAgree?: () => void;
	}

	let { isOpen, onClose, onAgree }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleAgree() {
		if (onAgree) {
			onAgree();
		} else {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
		role="dialog"
		aria-modal="true"
		aria-labelledby="terms-modal-title"
	>
		<!-- Backdrop click to close -->
		<button
			type="button"
			class="fixed inset-0 w-full h-full cursor-default bg-transparent -z-10"
			onclick={onClose}
			aria-label="Close modal backdrop"
		></button>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-[28px] shadow-2xl border border-neutral-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10 font-intel select-none"
		>
			<!-- Modal Header -->
			<div class="px-6 sm:px-8 py-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/70">
				<div class="space-y-1">
					<div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#5FD068]/15 text-[#189b05] text-[11px] font-intel font-medium border border-[#5FD068]/25">
						<span>Official Terms</span>
						<span>&bull;</span>
						<span>Terms of Service &amp; Usage Policy</span>
					</div>
					<h3 id="terms-modal-title" class="text-xl sm:text-2xl font-intel font-semibold text-neutral-900 tracking-tight">
						Terms of Service &amp; Bot Integration Policy
					</h3>
					<p class="text-xs font-intel text-neutral-500">
						AI Helper Bisnis by Meseid.company &bull; Last updated: October 2026
					</p>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-2 -mr-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full transition-colors cursor-pointer"
					aria-label="Close dialog"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Scrollable Modal Content -->
			<div class="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-sm text-neutral-700 leading-relaxed font-intel select-text">
				<!-- Preamble / Summary -->
				<div class="p-4 rounded-2xl bg-neutral-100/80 border border-neutral-200 text-xs sm:text-sm text-neutral-700 leading-relaxed">
					These Terms of Service ("Terms") govern your use of <strong>Meseid</strong> and its <strong>AI Helper Bisnis</strong> platform ("Service"), operated by <strong>Meseid.company</strong>. By connecting your bot, accessing the platform, or checking the agreement box, you confirm that you have read, understood, and agreed to these Terms. If you do not agree, please do not proceed.
				</div>

				<!-- 1. The Service & Scope -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						1. The Service &amp; Capabilities
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						Meseid provides an AI-powered assistant designed for small and medium businesses (MSMEs/UMKM). It operates seamlessly through messaging channels (WhatsApp &amp; Telegram) to assist business owners with bookkeeping, financial transaction recording, report generation, customer inquiries based on your knowledge base, and automated scheduled business reminders.
					</p>
				</section>

				<!-- 2. Eligibility & Business Authority -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						2. Eligibility &amp; Representation
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						You must be at least 18 years of age or possess legal capacity under the laws of your jurisdiction. When using the Service on behalf of a business, company, or legal entity, you confirm that you have full authorization to bind that entity to these Terms.
					</p>
				</section>

				<!-- 3. Account & Bot Credential Security -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						3. Account Security &amp; Credentials
					</h4>
					<ul class="list-disc list-inside space-y-1.5 pl-2 text-neutral-600 text-xs sm:text-sm">
						<li>You sign in using your authenticated Google account. You are responsible for preserving its confidentiality.</li>
						<li>You are strictly responsible for safeguarding your Telegram Bot API tokens and the device linked to your WhatsApp session.</li>
						<li>Never share, publish, or leak your bot credentials. If a token is compromised, you must immediately revoke it via @BotFather.</li>
					</ul>
				</section>

				<!-- 4. Acceptable Use & User Obligations -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						4. Acceptable Use &amp; User Conduct
					</h4>
					<p class="font-medium text-neutral-800 text-xs sm:text-sm">You agree to:</p>
					<ul class="list-disc list-inside space-y-1 pl-2 text-neutral-600 text-xs sm:text-sm">
						<li>Use the Service exclusively for legitimate business and operational tasks;</li>
						<li>Inform your customers that an automated AI assistant may handle initial customer service inquiries;</li>
						<li>Keep your custom Knowledge Base accurate, relevant, and respectful to avoid misleading customer communications;</li>
						<li>Independently review and verify AI-generated financial ledgers and business summaries before official filings.</li>
					</ul>
					<p class="font-medium text-neutral-800 text-xs sm:text-sm pt-2">You strictly agree NOT to:</p>
					<ul class="list-disc list-inside space-y-1 pl-2 text-neutral-600 text-xs sm:text-sm">
						<li>Send unsolicited bulk spam, deceptive promotions, or harassment messages to customer lists;</li>
						<li>Violate WhatsApp’s Commerce Policy, Meta’s Terms of Service, or Telegram’s Bot Platform Guidelines;</li>
						<li>Attempt to reverse-engineer, exploit vulnerabilities, probe API endpoints, or bypass quota allocations.</li>
					</ul>
				</section>

				<!-- 5. WhatsApp Connection & Special Risk Acknowledgment -->
				<section class="p-5 rounded-2xl bg-amber-50/80 border-2 border-amber-300/80 space-y-3">
					<div class="flex items-center gap-2 text-amber-900 font-semibold text-base">
						<span class="text-xl">⚠️</span>
						<span>5. WhatsApp Unofficial Integration Risk Notice</span>
					</div>
					<p class="text-xs sm:text-sm text-amber-950 leading-relaxed">
						<em>Important disclosure:</em> Meseid connects to WhatsApp via an open-source WhatsApp Web protocol implementation (such as Baileys). This is an unofficial integration and is not created, sponsored, endorsed, or officially supported by WhatsApp or Meta Platforms, Inc.
					</p>
					<ul class="list-disc list-inside space-y-1.5 text-xs sm:text-sm text-amber-950 pl-1">
						<li><strong>Account Restriction / Ban Risk:</strong> WhatsApp actively scans for automated activity and may restrict or permanently ban numbers using unofficial integrations without prior warning.</li>
						<li><strong>Connection Stability:</strong> Upstream protocol changes by WhatsApp may temporarily disrupt message receipt or delivery until updates are applied.</li>
						<li><strong>Recommended Mitigation:</strong> Always use a dedicated business phone number rather than your private personal number, avoid sending bulk cold messages, and maintain secondary contact channels (such as Telegram or email).</li>
					</ul>
					<p class="text-xs text-amber-900 italic pt-1">
						Meseid is not liable for account suspensions, chat loss, or business downtime caused by third-party platform actions or policy enforcement.
					</p>
				</section>

				<!-- 6. AI Output & Financial Advisory Disclaimer -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						6. AI Output &amp; Financial Advisory Disclaimer
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						Output produced by Meseid (including automated book entries, cash-flow categorizations, summary charts, and draft responses) is generated using machine learning and natural language processing. <strong>Meseid is not a certified public accountant (CPA), tax advisor, or legal firm.</strong> AI outputs are advisory working aids and must not replace professional financial or legal consultation. You bear sole responsibility for verifying figures before submitting official tax or regulatory declarations.
					</p>
				</section>

				<!-- 7. Data Privacy & Ownership -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						7. Data Privacy &amp; Ownership
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						<strong>Your data belongs to you:</strong> Your business records, financial figures, customer inquiries, and knowledge base remain your exclusive property. Meseid only accesses, stores, and processes your data to deliver the requested assistant functionality and generate your business reports. We do not sell your proprietary business data or customer information to third parties.
					</p>
				</section>

				<!-- 8. Service Modification & Maintenance -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						8. Availability &amp; Modifications
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						We strive to maintain high availability and reliability. However, the Service is provided on an "as is" and "as available" basis. We reserve the right to deploy updates, enhance models, or perform routine infrastructure maintenance with minimal disruption.
					</p>
				</section>

				<!-- 9. Governing Law & Dispute Resolution -->
				<section class="space-y-2">
					<h4 class="font-semibold text-neutral-900 text-base">
						9. Governing Law
					</h4>
					<p class="text-neutral-600 text-xs sm:text-sm leading-relaxed">
						These Terms are governed by and construed in accordance with the laws of the Republic of Indonesia. Any disputes arising under these Terms shall initially be resolved amicably through good-faith deliberation between the parties.
					</p>
				</section>

				<!-- 10. Contact Us -->
				<section class="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200/80 space-y-1">
					<h4 class="font-semibold text-neutral-900 text-sm">
						10. Contact &amp; Support
					</h4>
					<p class="text-xs sm:text-sm text-neutral-700">
						<strong>Meseid.company</strong><br />
						Customer &amp; Technical Support: <a href="mailto:11241071@student.itk.ac.id" class="text-[#189b05] hover:underline">11241071@student.itk.ac.id</a>
					</p>
				</section>
			</div>

			<!-- Modal Footer -->
			<div class="px-6 sm:px-8 py-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
				<span class="text-xs font-intel text-neutral-400 hidden sm:inline">
					Press Esc to close
				</span>

				<div class="flex items-center gap-3 w-full sm:w-auto justify-end">
					<button
						type="button"
						onclick={onClose}
						class="px-5 py-2.5 rounded-full text-xs sm:text-sm font-intel text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer"
					>
						Close
					</button>
					<button
						type="button"
						onclick={handleAgree}
						class="px-6 py-2.5 rounded-full text-xs sm:text-sm font-intel font-normal bg-[#5FD068] hover:bg-[#4ebb57] text-white shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
					>
						<span>I Agree to Terms</span>
						<span>✓</span>
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

