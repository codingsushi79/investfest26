import Link from "next/link";
import { TiltLink } from "@/components/TiltLink";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
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

            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
            <p className="text-slate-700 mb-4">We collect information you provide directly to us, such as when you:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Create an account (username, email, name)</li>
              <li>Participate in trading activities</li>
              <li>Contact us for support</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-slate-700 mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Provide and maintain our service</li>
              <li>Process your transactions and maintain your account</li>
              <li>Send you technical notices and support messages</li>
              <li>Improve our platform and develop new features</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Information Sharing</h2>
            <p className="text-slate-700 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties without your consent,
              except as described in this policy. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>With service providers who assist us in operating our platform</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Data Security</h2>
            <p className="text-slate-700 mb-6">
              We implement appropriate technical and organizational measures to protect your personal information against
              unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the
              internet is 100% secure.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Data Retention</h2>
            <p className="text-slate-700 mb-6">
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes
              outlined in this privacy policy, unless a longer retention period is required by law.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Your Rights</h2>
            <p className="text-slate-700 mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-slate-700 mb-6">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to or restrict certain processing of your information</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Cookies</h2>
            <p className="text-slate-700 mb-6">
              We use cookies and similar technologies to enhance your experience, analyze usage, and assist in our marketing efforts.
              You can control cookie settings through your browser preferences.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Third-Party Services</h2>
            <p className="text-slate-700 mb-6">
              Our service may contain links to third-party websites or services that are not owned or controlled by us.
              We are not responsible for the privacy practices of these third parties.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Children's Privacy</h2>
            <p className="text-slate-700 mb-6">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
              If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-slate-700 mb-6">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new
              privacy policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Contact Us</h2>
            <p className="text-slate-700 mb-6">
              If you have any questions about this Privacy Policy, please contact us at investfest@googlegroups.com.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
