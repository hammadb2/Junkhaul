import Link from 'next/link';
// app/crew-privacy/page.js
export const metadata = {
  title: 'Crew Privacy Policy — Junk Haul Calgary',
  description: 'Crew Privacy Policy for Junk Haul Calgary. Effective July 14, 2026.',
};

export default function CrewPrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <Link href="/" className="text-[#c4810e] hover:underline text-sm">&larr; Back to Junk Haul Calgary</Link>
        </div>
        <div className="mb-2 text-sm font-semibold text-[#c4810e] tracking-wide">JUNK HAUL CALGARY</div>
        <div className="mb-6 text-sm text-gray-500">100% Canadian Owned  |  Calgary&#39;s Junk Removal  |  Donating Back</div>
        <h1 className="text-3xl font-bold text-[#1a3a5c] mb-2">Crew Privacy Policy</h1>
        <p className="mb-4 text-gray-700 leading-relaxed">How We Handle Crew &amp; Employee Personal Information</p>
        <p className="mb-1 text-sm text-gray-500">Effective date: July 14, 2026</p>
        <p className="mb-8 text-sm text-gray-500">Version 1.0  |  Next scheduled review: July 2027</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">1. Purpose &amp; How This Differs From Our Customer Privacy Policy</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">This policy explains how Junk Haul Calgary collects, uses, stores, and protects personal information about our crew members, contractors, and job applicants, separately from the Privacy Policy that covers our customers. It&#39;s written to meet our obligations under Alberta&#39;s Personal Information Protection Act (PIPA), which has a specific set of rules for &quot;personal employee information&quot; that differ from how we handle customer data.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">References: Government of Alberta, &quot;Personal employee information&quot;: https://www.alberta.ca/personal-employee-information ; OIPC of Alberta, &quot;Overview of Privacy Laws&quot;: https://oipc.ab.ca/overview-privacy-laws/</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Under PIPA, an employer does not need an employee&#39;s consent to collect, use, or disclose &quot;personal employee information&quot; where doing so is reasonable and solely for establishing, managing, or ending the employment relationship, or managing it afterward, such as a reference check. What PIPA does require instead is notice: before we collect this information, or before we start a new kind of monitoring, we have to tell current employees what&#39;s being collected and why. This document is that notice.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">2. Who This Applies To</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">This policy applies to every Junk Haul Calgary crew member, driver, and contractor, from the day you apply through onboarding, your time working with us, and after you leave, for legitimate post employment purposes like references or T4 issuance.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">3. Information We Collect During Onboarding</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Identity and contact information, including name, address, phone, and date of birth.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Employment documents required to work legally in Canada.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Federal and Alberta tax forms, TD1 and TD1AB, used to calculate correct payroll withholding.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Signed employment contract and policy acknowledgments, including this one.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Banking information for direct deposit.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Driver&#39;s licence class and, where relevant to the driving role, a driving abstract (see the Vehicle Use Policy).</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Emergency contact information.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">This information is collected because it&#39;s reasonably required to set you up as an employee, pay you correctly and legally, and meet our own tax and employment law obligations, not for any purpose beyond that.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">4. Information Collected While You&#39;re Working With Us</h2>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">4.1 Location tracking</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">While you&#39;re on shift and using a company vehicle or the crew app, your location is tracked live. This is how dispatch knows where every truck is, answers where&#39;s my crew questions, and coordinates the day&#39;s route. This notice is that formal heads up: driving a Junk Haul Calgary vehicle or being clocked in on shift means your location is tracked for the duration of that shift. It is not used to monitor you outside scheduled work hours, and Alberta&#39;s privacy regulator has specifically recognized GPS tracking for safety and dispatch or coordination purposes as a reasonable use under PIPA, provided it&#39;s limited to what the purpose actually requires.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Reference: PII Comm, &quot;Alberta PIPA and Employee Device Monitoring&quot; (summarizing OIPC findings on GPS tracking): https://piicomm.ca/blog/alberta-pipa-and-employee-device-monitoring/ . An independent legal or privacy advisor review is recommended before relying on this as a full compliance assessment.</p>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">4.2 Job, schedule, and performance records</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Job assignments, clock in and clock out times, and truck check records.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Logged issues, incidents, and safety reports you or others file.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Customer feedback or complaints connected to a specific job you worked.</p>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">4.3 Calls and the crew Dispatch line</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Calls to our crew facing Dispatch line, whether answered by a person or, in future, an AI voice agent, may be recorded or summarized to confirm what was discussed, resolve disputes fairly, and improve how Dispatch handles similar calls. This is used for operational and safety purposes, not to monitor personal conversations.</p>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">4.4 Payroll and tax records</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Hours worked, pay rate, deductions, and CRA formula based tax withholding calculations.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Pay stub and T4 records, generated and delivered through the payroll system.</p>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">4.5 Photos taken as part of the job</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">Before and after item photos, load photos, and truck check photos may incidentally include a crew member&#39;s hands, reflection, or presence. These are collected for job completion, dispute resolution, and quality purposes, not to create a personal photo record of you.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">5. Why We Collect and Use This Information</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">To establish, manage, and, if it comes to it, end the employment relationship, including payroll, scheduling, performance, discipline, and legal compliance.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To dispatch, route, and safely coordinate the day&#39;s work.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To meet legal obligations, including CRA tax withholding and reporting, employment standards record keeping, and Alberta OHS incident record keeping.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To investigate incidents, complaints, or safety concerns fairly, using logs and records rather than guesswork.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To manage a post employment relationship where reasonable, for example confirming employment dates for a reference, or issuing a T4 after you&#39;ve left.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">We do not use crew personal information for marketing, and we do not sell it. Access is limited by role. For example, dispatch and crew facing tools are being built to use a scoped credential rather than the same full admin login that can see banking or SIN data, specifically so that a phone based dispatch tool never has more access to sensitive employee data than its job requires.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">6. Who Has Access</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Ownership and admin: full access, as needed to run payroll, resolve escalations, and meet legal obligations.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Dispatch, whether human or, in future, AI assisted: job, schedule, and location data needed to coordinate the day, not banking, SIN, or full payroll detail.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Payroll processing: banking and tax information, limited to what&#39;s needed to pay you correctly and meet CRA obligations.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Service providers who host our systems, such as our cloud database, payroll, and phone or Dispatch platform, bound to use the information only to provide that service to us, not for their own purposes.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">7. How Long We Keep It</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">We keep employment, payroll, and tax records for as long as required by Canada Revenue Agency and Alberta employment standards retention rules, and job, safety, and incident records for as long as reasonably needed for legal, safety, or dispute resolution purposes. Location and GPS data tied to a specific shift is retained only as long as needed for dispatch, payroll, and safety record purposes, then deleted or anonymized.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">8. Your Rights</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">As a current or former Junk Haul Calgary crew member, you have the right, under Alberta PIPA, to:</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Know what personal employee information we hold and why.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Request access to your own personal information.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Request correction of information that&#39;s inaccurate or incomplete.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Make a complaint if you believe we&#39;ve collected, used, or disclosed your information improperly.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">To make a request, talk to ownership or whoever manages HR at Junk Haul Calgary. We aim to respond within the timeframe required under Alberta PIPA, currently 45 days for access requests.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">If you&#39;re not satisfied with our response, you can contact the Office of the Information and Privacy Commissioner (OIPC) of Alberta directly:</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Calgary office: Suite 2460, 801, 6 Avenue SW, Calgary, Alberta T2P 3W2</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Phone: 403 297 2728. Toll free: 1 888 878 4044</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Email: generalinfo@oipc.ab.ca. Website: oipc.ab.ca</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Reference: Service Alberta sample PIPA policy (OIPC Calgary office contact details): https://www.servicealberta.gov.ab.ca/pdf/npsamplepolicy_(4).doc . Confirm current contact details at https://oipc.ab.ca/ before relying on them.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">9. Keeping Your Information Secure</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Sensitive data, such as banking details, SIN, and tax forms, is stored with access limited to the roles that genuinely need it, and is a priority area we are actively working to further restrict (see Section 6).</p>
        <p className="mb-4 text-gray-700 leading-relaxed">We use reasonable technical and administrative safeguards appropriate to the sensitivity of the information, consistent with PIPA&#39;s security requirement.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">If a breach involving your personal information creates a real risk of significant harm, we will notify you and the OIPC of Alberta without unreasonable delay.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">10. Changes to This Policy</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">If we start collecting new categories of information about crew, for example a new monitoring tool or a new AI assisted dispatch feature, we will update this policy and give current employees notice before that collection begins. That&#39;s a legal requirement under PIPA&#39;s notice rule for personal employee information, not just good practice.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Last updated: July 14, 2026</p>
        <h3 className="text-lg font-semibold text-[#1a3a5c] mt-6 mb-2">Acknowledgment</h3>
        <p className="mb-4 text-gray-700 leading-relaxed">I confirm that I have received, read, and understood this policy, and agree to follow it as a condition of working with or on behalf of Junk Haul Calgary.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Employee name (print): _______________________________________</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Signature: _______________________________________     Date: ______________</p>
        <div className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-500">
          <p>Questions about this policy? Contact us at <a href="tel:5873254317" className="text-[#c4810e] hover:underline">(587) 325-4317</a> or <a href="mailto:info@junkhaul.ca" className="text-[#c4810e] hover:underline">info@junkhaul.ca</a></p>
        </div>
      </div>
    </div>
  );
}
