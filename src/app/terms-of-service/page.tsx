import Link from "next/link";
import { TiltLink } from "@/components/TiltLink";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
            <TiltLink
              href="/"
              className="rounded-lg bg-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              ← Back to Home
            </TiltLink>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="prose prose-slate max-w-none">
            <p className="text-sm text-slate-600 mb-6">
              Last updated: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 mb-6">
              By accessing and using InvestFest26, you accept and agree to be bound by the terms and provision of this agreement.
              If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-700 mb-6">
              InvestFest26 is a simulated stock trading platform for educational and entertainment purposes only.
              All trading activities are conducted with virtual currency and have no real financial value.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Accounts</h2>
            <p className="text-slate-700 mb-6">
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account or password.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. User Conduct</h2>
            <p className="text-slate-700 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Share your account credentials with others</li>
              <li>Engage in any form of harassment or abusive behavior</li>
              <li>Manipulate or interfere with the platform's operation</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Virtual Currency and Trading</h2>
            <p className="text-slate-700 mb-6">
              All currency and trades on this platform are virtual and for entertainment purposes only.
              No real money or financial transactions are involved. Results do not guarantee real-world investment outcomes.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-700 mb-6">
              The service and its original content, features, and functionality are and will remain the exclusive property of InvestFest26.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Termination</h2>
            <p className="text-slate-700 mb-6">
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever,
              including without limitation if you breach the Terms.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Limitation of Liability</h2>
            <p className="text-slate-700 mb-6">
              In no event shall InvestFest26, nor its directors, employees, partners, agents, suppliers, or affiliates,
              be liable for any indirect, incidental, special, consequential, or punitive damages.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Changes to Terms</h2>
            <p className="text-slate-700 mb-6">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Contact Information</h2>
            <p className="text-slate-700 mb-6">
              If you have any questions about these Terms of Service, please contact us at support@investfest26.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
