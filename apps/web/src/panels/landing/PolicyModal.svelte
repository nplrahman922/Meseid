<script lang="ts">
	import Button from '../../components/Button.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
		role="dialog"
		aria-modal="true"
		aria-labelledby="policy-modal-title"
	>
		<!-- Backdrop overlay with blur -->
		<button
			type="button"
			class="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300"
			onclick={onClose}
			aria-label="Close modal backdrop"
		></button>

		<!-- Modal Container -->
		<div
			class="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-neutral-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-10"
		>
			<!-- Modal Header -->
			<div class="px-6 sm:px-8 py-5 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/70">
				<div class="space-y-1">
					<div class="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#1dd205]/15 text-[#189b05] text-[11px] font-intel font-medium border border-[#1dd205]/25">
						<span>Official Policy</span>
						<span>&bull;</span>
						<span>Terms of Service</span>
					</div>
					<h3 id="policy-modal-title" class="text-xl sm:text-2xl font-intel font-semibold text-neutral-900">
						Terms of Service
					</h3>
					<p class="text-xs font-intel text-neutral-500">
						AI Helper Bisnis, operated by Meseid.company &bull; Last updated: October 2026
					</p>
				</div>

				<button
					type="button"
					onclick={onClose}
					class="p-2 -mr-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded-full transition-colors focus:outline-hidden"
					aria-label="Close dialog"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Scrollable Modal Content -->
			<div class="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 text-sm text-neutral-700 font-inter leading-relaxed">
				<!-- Preamble / Summary -->
				<div class="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200 text-xs sm:text-sm text-neutral-700 font-intel leading-relaxed">
					These Terms of Service ("Terms") are an agreement between you and <strong>Meseid.company</strong> ("we", "us") about your use of <strong>AI Helper Bisnis</strong> (the "Service"). Please read them together with our Privacy Policy. By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
				</div>

				<!-- 1. The Service -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						1. The Service
					</h4>
					<p>
						AI Helper Bisnis is an AI assistant that works inside WhatsApp and Telegram. It helps business owners record transactions, generate reports, analyze documents, manage schedules, and answer customer questions from a knowledge base the owner provides. Features depend on your subscription plan and may change over time.
					</p>
				</section>

				<!-- 2. Who can use it -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						2. Who can use it
					</h4>
					<p>
						You must be at least 18 years old and able to enter a binding agreement. If you use the Service for a business, you confirm that you have the authority to act for that business.
					</p>
				</section>

				<!-- 3. Your account -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						3. Your account
					</h4>
					<ul class="list-disc list-inside space-y-1.5 pl-2 text-neutral-600">
						<li>You sign in with your Google account. You are responsible for keeping that account and the phone that runs your WhatsApp and Telegram secure.</li>
						<li>The information you give us must be accurate and kept up to date.</li>
						<li>You are responsible for everything that happens through your account.</li>
						<li>You may link one number to one account.</li>
					</ul>
				</section>

				<!-- 4. Your responsibilities -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						4. Your responsibilities
					</h4>
					<p class="font-medium text-neutral-800">You agree to:</p>
					<ul class="list-disc list-inside space-y-1 pl-2 text-neutral-600">
						<li>Use the Service only for lawful business purposes;</li>
						<li>Tell your customers that an AI assistant handles their messages, and have a lawful basis to process their data;</li>
						<li>Check the assistant's output before relying on it;</li>
						<li>Keep your knowledge base accurate, so customers do not receive wrong information.</li>
					</ul>
					<p class="font-medium text-neutral-800 pt-2">You agree not to:</p>
					<ul class="list-disc list-inside space-y-1 pl-2 text-neutral-600">
						<li>Send spam, unsolicited bulk messages, or deceptive, harassing, or illegal content;</li>
						<li>Use the Service to break the terms of WhatsApp, Telegram, Google, or any other connected platform;</li>
						<li>Attempt to access other users' data, probe or disrupt the Service, or bypass quotas and security controls;</li>
						<li>Copy, resell, or reverse engineer the Service, except where the law allows it;</li>
						<li>Upload content you do not have the right to use.</li>
					</ul>
				</section>

				<!-- 5. AI-generated output -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						5. AI-generated output
					</h4>
					<p>
						The assistant uses artificial intelligence and can be wrong, incomplete, or out of date. Reports, financial summaries, document analysis, and tax templates are working aids only. They are not accounting, tax, financial, or legal advice, and they do not replace a licensed professional or an official filing. You are solely responsible for decisions you make and filings you submit based on them.
					</p>
				</section>

				<!-- 6. WhatsApp connection and its risks (SPECIAL HIGHLIGHT) -->
				<section class="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300/80 space-y-4">
					<div class="flex items-center gap-2.5 text-amber-900 font-intel font-semibold text-base">
						<span class="text-xl">⚠️</span>
						<span>6. WhatsApp connection and its risks</span>
					</div>
					<p class="text-xs sm:text-sm text-amber-950 leading-relaxed">
						<em>Please read this section carefully.</em> The Service connects to WhatsApp through <strong>Baileys</strong>, an open-source library that works with the WhatsApp Web protocol. It is not the official WhatsApp Business Platform, and it is not made, approved, or supported by WhatsApp or Meta.
					</p>

					<p class="text-xs font-semibold uppercase tracking-wider text-amber-900 font-intel">
						By connecting WhatsApp, you understand and accept the following risks:
					</p>

					<ol class="list-decimal list-inside space-y-2 text-xs sm:text-sm text-amber-950 pl-1">
						<li><strong>Possible violation of WhatsApp's terms:</strong> Third-party and unofficial clients may go against WhatsApp's terms of service, and WhatsApp can act against accounts that use them.</li>
						<li><strong>Number restrictions or bans:</strong> WhatsApp may restrict, temporarily suspend, or permanently ban a phone number connected this way, sometimes without warning and without a way to appeal that we can control. Precautions such as rate limits and human-like delays can reduce this risk, but they cannot remove it.</li>
						<li><strong>Loss of access:</strong> If a number is banned, you can lose its chats, contacts, groups, and the ability to reach your customers on that number. WhatsApp's own backup features may not restore a banned number.</li>
						<li><strong>Unstable connection:</strong> WhatsApp can change its protocol at any time. The connection may disconnect, need re-pairing, or stop working until we update the Service. Messages may be delayed, duplicated, or not delivered.</li>
						<li><strong>Access to the linked number:</strong> A linked session lets the Service send and read messages on that number. If session credentials were exposed, someone else could act as your number. We protect them, but no system is completely secure.</li>
						<li><strong>Customer impact:</strong> If your WhatsApp channel fails, your customers may not receive replies. Do not rely on it as your only way to serve customers.</li>
					</ol>

					<div class="p-3 bg-white/80 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
						<div class="font-bold font-intel">What we recommend:</div>
						<ul class="list-disc list-inside space-y-0.5">
							<li>Use a <strong>dedicated number for the assistant</strong>, not your personal number or your only business number.</li>
							<li>Avoid sending bulk or unsolicited messages.</li>
							<li>Keep another way for customers to reach you, such as Telegram, phone, or email.</li>
						</ul>
					</div>

					<p class="text-xs text-amber-900 italic">
						<strong>What this means for liability:</strong> To the fullest extent the law allows, we are not responsible for number bans, restrictions, lost chats, missed customers, or business interruption that result from WhatsApp's actions or from your use of the WhatsApp connection. You use this connection at your own risk.
					</p>
				</section>

				<!-- 7. Plans, quotas, and payment -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						7. Plans, quotas, and payment
					</h4>
					<ul class="list-disc list-inside space-y-1 pl-2 text-neutral-600">
						<li>The Service is offered under plans with limits on AI usage ("tokens") and features. Current plans and prices are shown in your dashboard.</li>
						<li>Fees are paid in advance through our official payment gateway. Prices may include taxes where required.</li>
						<li>If you reach your quota, AI features may pause until the next period or until you upgrade.</li>
						<li>Subscriptions renew each period unless cancelled, and fees already paid are non-refundable except where the law requires.</li>
						<li>We may change prices or plans with reasonable notice, applying from your next billing period.</li>
					</ul>
				</section>

				<!-- 8. Third-party services -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						8. Third-party services
					</h4>
					<p>
						The Service relies on third parties such as Google, WhatsApp, Telegram, our AI model provider, our payment gateway, and hosting providers. Their terms also apply to you when you use them through the Service. We do not control them and are not responsible for their outages, changes, or actions.
					</p>
				</section>

				<!-- 9. Your content and our rights -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						9. Your content and our rights
					</h4>
					<p>
						<strong>Your content</strong> (messages, documents, knowledge base, reports) stays yours. You give us a limited permission to store, process, and display it only as needed to run the Service for you, as described in the Privacy Policy.
					</p>
					<p>
						<strong>Our Service,</strong> including its software, design, and branding, belongs to us or our licensors. These Terms give you a limited, non-exclusive, non-transferable right to use the Service, and nothing more.
					</p>
				</section>

				<!-- 10. Availability and changes -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						10. Availability and changes
					</h4>
					<p>
						We aim to keep the Service running, but we do not promise it will be uninterrupted or error-free. We may perform maintenance, and we may add, change, or remove features. If we make a change that significantly reduces what you paid for, we will tell you in advance where we reasonably can.
					</p>
				</section>

				<!-- 11. Suspension and termination -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						11. Suspension and termination
					</h4>
					<p>
						<strong>You</strong> can stop using the Service and request deletion of your account at any time.
						<strong>We</strong> may suspend or end your account if you break these Terms, put the Service or other users at risk, do not pay, or if the law requires it. When we suspend an account, we will record the reason and, where possible, tell you why.
					</p>
				</section>

				<!-- 12. Disclaimer of warranties -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						12. Disclaimer of warranties
					</h4>
					<p class="text-xs text-neutral-600">
						The Service is provided "as is" and "as available." To the fullest extent the law allows, we do not give any warranty, express or implied, including about accuracy of AI output, fitness for a particular purpose, uninterrupted operation, or that any connected platform will keep working.
					</p>
				</section>

				<!-- 13. Limitation of liability -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						13. Limitation of liability
					</h4>
					<p class="text-xs text-neutral-600">
						To the fullest extent the law allows, we are not liable for indirect, incidental, special, or consequential losses, including lost profits, lost revenue, lost data, or loss of goodwill. Our total liability for any claim relating to the Service will not exceed the amount you paid us in the 12 months before the claim.
					</p>
				</section>

				<!-- 14. Indemnity -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						14. Indemnity
					</h4>
					<p class="text-xs text-neutral-600">
						You agree to defend and compensate us against claims and losses arising from your content, your customers' data that you provide, your breach of these Terms, or your violation of the law or a third party's rights, to the extent the law allows.
					</p>
				</section>

				<!-- 15. Changes to these Terms -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						15. Changes to these Terms
					</h4>
					<p>
						We may update these Terms. We will post the new version with a new "Last updated" date and, for significant changes, notify you in the dashboard or by email. If you keep using the Service after the changes take effect, you accept them.
					</p>
				</section>

				<!-- 16. Governing law and disputes -->
				<section class="space-y-2">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						16. Governing law and disputes
					</h4>
					<p>
						These Terms are governed by the laws of the Republic of Indonesia. We will first try to resolve any dispute through good-faith discussion. If that fails, the dispute will be brought to the courts of Balikpapan / Jakarta, unless the law says otherwise.
					</p>
				</section>

				<!-- 17. Contact us -->
				<section class="p-4 rounded-2xl bg-neutral-100/70 border border-neutral-200/80 space-y-1">
					<h4 class="font-intel font-semibold text-neutral-900 text-base">
						17. Contact us
					</h4>
					<p class="text-xs sm:text-sm font-intel text-neutral-700">
						<strong>Meseid.company</strong><br />
						Email: <a href="mailto:11241071@student.itk.ac.id" class="text-[#189b05] hover:underline">11241071@student.itk.ac.id</a>
					</p>
				</section>
			</div>

			<!-- Modal Footer -->
			<div class="px-6 sm:px-8 py-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between">
				<span class="text-xs font-intel text-neutral-400">
					Press Esc to close
				</span>
				<Button variant="primary" size="sm" pill={true} onclick={onClose}>
					I Understand
				</Button>
			</div>
		</div>
	</div>
{/if}
