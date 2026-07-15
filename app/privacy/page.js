import Link from 'next/link';
// app/privacy/page.js
export const metadata = {
  title: 'Privacy Policy — Junk Haul Calgary',
  description: 'Privacy Policy for Junk Haul Calgary. Effective July 14, 2026.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <Link href="/" className="text-[#f97316] hover:underline text-sm">&larr; Back to Junk Haul Calgary</Link>
        </div>
        <div className="mb-2 text-sm font-semibold text-[#f97316] tracking-wide">JUNK HAUL CALGARY</div>
        <div className="mb-6 text-sm text-gray-500">100% Canadian Owned  |  Calgary&#39;s Junk Removal  |  Donating Back</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="mb-4 text-gray-700 leading-relaxed">How We Collect, Use, and Protect Your Information</p>
        <p className="mb-1 text-sm text-gray-500">Effective date: July 14, 2026</p>
        <p className="mb-8 text-sm text-gray-500">Version 1.0  |  Next scheduled review: July 2027</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">1. Who We Are</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Junk Haul Calgary (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a 100% Canadian owned, same day junk removal business operating in Calgary, Alberta. This Privacy Policy explains what personal information we collect through our website, booking flow, crew app, and phone lines, why we collect it, how we protect it, and the rights you have over it.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">This policy is written to meet our obligations under Alberta&#39;s Personal Information Protection Act (PIPA), the private sector privacy law that applies to organizations doing business in Alberta, and, where applicable to activity that crosses provincial or national borders, Canada&#39;s federal Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
        <p className="mb-4 text-gray-700 leading-relaxed">References: Office of the Information and Privacy Commissioner of Alberta, PIPA overview: https://oipc.ab.ca/legislation/pipa/ ; Government of Alberta, &quot;Personal Information Protection Act&quot;: https://www.alberta.ca/personal-information-protection-act</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">2. What Information We Collect</h2>
        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.1 When you request a quote or book a job</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Phone number, required at the start of our online booking flow before a price is shown, so that a real contact method is confirmed before we quote a job.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Service address.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Photos of the items you want removed, which may be analyzed automatically, including by AI assisted tools, to help generate an instant, itemized price estimate.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Details about the items and preferred load size or tier.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Your preferred schedule and arrival window.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Payment information, processed by our payment provider (see Section 5). We do not store full card numbers ourselves.</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.2 When you call, text, or interact with us by phone</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Call recordings and automated call summaries or sentiment notes, generated when you speak with one of our phone lines, including our AI assisted sales, service, refunds, or complaints lines, used to route your call correctly and improve service quality.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Text and SMS messages, including payment links, review requests, and job updates.</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.3 After a job is completed</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Star ratings, written reviews, and feedback you choose to submit.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Records of the job itself, including what was picked up, when, and by which crew, kept for service history and billing purposes.</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2.4 Website and app usage</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Standard website analytics and advertising identifiers, for example through Meta/Facebook advertising, used to measure and improve our marketing.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Basic technical information, such as device or browser type and general location inferred from IP address, used for security and site functionality.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">3. Why We Collect It</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">To provide you an accurate, transparent quote and to schedule and complete your job.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To contact you about your booking, including confirmations, arrival windows, delays, and payment links.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To process payment for services rendered.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To follow up for reviews and feedback and to resolve any complaint or service issue.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To route jobs efficiently to the right truck and crew, including live GPS tracking of company vehicles while a crew is en route to or performing your job. This is about knowing where our trucks are, not tracking you as a customer.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To advertise our services to people likely to need them in Calgary, and to measure whether that advertising is working.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To meet legal, tax, and accounting obligations.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">We collect and use personal information only for purposes that a reasonable person would consider appropriate in the circumstances, consistent with PIPA&#39;s core standard, and we do not sell your personal information to third parties.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">4. Consent</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">By submitting your phone number, address, and photos through our booking flow, or by speaking with our phone lines, you consent to the collection, use, and disclosure of that information as described in this policy. Where we ask for anything beyond what&#39;s needed to provide the service, for example using your job photos in marketing, we will ask for your separate, explicit permission first.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">5. Who We Share Information With</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">We share personal information only with service providers who help us run the business, and only to the extent needed for them to do that job:</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Payment processing providers, to securely process card payments.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Cloud hosting and database providers, to store booking, job, and account data securely.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Our phone system provider, to power call handling, routing, and the automated phone agents referenced in Section 2.2.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">SMS and text messaging providers, to send booking confirmations, payment links, and review requests.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Advertising platforms such as Meta/Facebook, to run and measure our ad campaigns, governed by that platform&#39;s own privacy terms as well as ours.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Donation partners such as Habitat for Humanity ReStore and the Salvation Army, where an item you&#39;re donating requires basic drop off logistics. We do not share full customer records with donation partners, only what&#39;s operationally necessary.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">We do not sell personal information, and we only disclose it beyond the above where required by law, such as a valid legal request, or to protect someone&#39;s safety in an emergency.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">6. How Long We Keep Information</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">We keep booking, job, and payment records for as long as needed to provide the service, meet tax and accounting retention requirements, and resolve any dispute, after which it is securely deleted or de identified. Call recordings and quote photos are retained only as long as reasonably needed for service quality, dispute resolution, and legal record keeping purposes.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">7. How We Protect Your Information</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Access to customer and booking data is limited to what a given role, such as crew, dispatch, or admin, actually needs to do its job.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Payment data is handled by our payment processor&#39;s secure systems rather than stored directly by us in raw form.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">We use reasonable technical and administrative safeguards, including access controls, encrypted connections, and monitoring, appropriate to the sensitivity of the information involved, consistent with PIPA&#39;s requirement to protect personal information with security appropriate to its sensitivity.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">8. Your Rights</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Under Alberta PIPA, you have the right to:</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Know why we&#39;re collecting your personal information.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Expect that we only collect, use, and disclose it for purposes a reasonable person would consider appropriate.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Request access to the personal information we hold about you.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Request that we correct inaccurate personal information.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Make a complaint if you believe we&#39;ve handled your information improperly.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To make a request, contact us using the details in Section 11. We will respond to access requests within the timeframe required by Alberta PIPA, currently 45 days.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Reference: ClearBreach, Alberta PIPA compliance overview (access request timelines): https://clearbreach.ca/guides/alberta-pipa-compliance-requirements/ . Verify current timelines directly with the OIPC Alberta at https://oipc.ab.ca/ before relying on this for a specific legal deadline, as Alberta PIPA reform is under active discussion in 2026.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">If you&#39;re not satisfied with our response, you may complain directly to the Office of the Information and Privacy Commissioner (OIPC) of Alberta at oipc.ab.ca.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">9. Cookies &amp; Online Advertising</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Our website uses standard cookies and analytics and advertising pixels, including Meta/Facebook, to understand how people find us and to measure ad performance. You can control cookies through your browser settings, and you can opt out of personalized advertising through the ad platform&#39;s own settings, for example Meta&#39;s ad preferences.</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">10. Changes to This Policy</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">We may update this policy as our services, tools, or legal obligations change, including as Alberta&#39;s PIPA reform, expected to be considered by the legislature in 2026 and 2027, progresses. The last updated date below will always reflect the current version, and we&#39;ll post material changes here before they take effect.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Last updated: July 14, 2026</p>
        <h2 className="text-xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b border-gray-200">11. Contact Us</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">If you have a question, request, or complaint about how we handle your personal information, contact us at:</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Email: [insert Junk Haul Calgary privacy contact email]</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Phone: [insert Junk Haul Calgary phone number]</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Mail: Junk Haul Calgary, Coventry Hills NE, Calgary, Alberta</p>
        <p className="mb-4 text-gray-700 leading-relaxed">For unresolved concerns, you may also contact the Office of the Information and Privacy Commissioner of Alberta at oipc.ab.ca.</p>
        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>Questions about this policy? Contact us at <a href="tel:5873254317" className="text-[#f97316] hover:underline">(587) 325-4317</a> or <a href="mailto:info@junkhaul.ca" className="text-[#f97316] hover:underline">info@junkhaul.ca</a></p>
        </div>
      </div>
    </div>
  );
}
