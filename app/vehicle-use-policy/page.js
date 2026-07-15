import Link from 'next/link';
// app/vehicle-use-policy/page.js
export const metadata = {
  title: 'Vehicle Use Policy — Junk Haul Calgary',
  description: 'Vehicle Use Policy for Junk Haul Calgary. Effective July 14, 2026.',
};

export default function VehicleUsePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8 pb-6 border-b border-gray-200">
          <Link href="/" className="text-[#c4810e] hover:underline text-sm">&larr; Back to Junk Haul Calgary</Link>
        </div>
        <div className="mb-2 text-sm font-semibold text-[#c4810e] tracking-wide">JUNK HAUL CALGARY</div>
        <div className="mb-6 text-sm text-gray-500">100% Canadian Owned  |  Calgary&#39;s Junk Removal  |  Donating Back</div>
        <h1 className="text-3xl font-bold text-[#1a3a5c] mb-2">Vehicle Use Policy</h1>
        <p className="mb-4 text-gray-700 leading-relaxed">Company Vehicle Standards for Crew and Contractors</p>
        <p className="mb-1 text-sm text-gray-500">Effective date: July 14, 2026</p>
        <p className="mb-8 text-sm text-gray-500">Version 1.0  |  Next scheduled review: July 2027</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">1. Purpose</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Junk Haul Calgary&#39;s trucks are both a piece of equipment and a moving advertisement for the brand. Every truck carries the Junk Haul look and is often parked in a customer&#39;s driveway for the length of a job, in full view of neighbours. This policy covers who can drive a company vehicle, how it must be inspected and used, and what happens if something goes wrong.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">2. Who Can Drive a Company Vehicle</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">You must hold a valid Alberta Class 5 driver&#39;s licence (or the equivalent class required for the specific vehicle) at all times you are scheduled to drive.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">You must tell dispatch or ownership immediately if your licence is suspended, restricted, or revoked for any reason. Driving on a suspended licence is a serious offence under Alberta&#39;s Traffic Safety Act and ends your ability to drive for Junk Haul immediately.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">A clean driving record is a condition of the driving role; a driver&#39;s abstract may be requested periodically.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Only scheduled crew may drive a company vehicle. No unauthorized passengers or drivers, ever.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">3. Before You Drive: Pre Trip Inspection</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">A quick pre trip check catches problems before they become breakdowns or safety incidents, and feeds the truck check records already tracked in the crew app.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Walk around: tires, lights, mirrors, visible damage.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Dashboard warning lights, fuel level, and fluid levels look normal.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Load area is secure and empty of the previous job&#39;s debris before starting a new one.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Anything wrong gets logged and reported to dispatch before the truck leaves the lot. Don&#39;t drive a vehicle you believe is unsafe.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">4. End of Day Truck Check</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Every truck completes an end of day return check before crew clock out: dashboard photo, odometer reading, fuel level, and gas receipt if refuelled. This is not optional paperwork. It&#39;s how we catch mechanical issues, fuel discrepancies, and mileage questions early, and it&#39;s the same check dispatch confirms was completed each night.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">5. Distracted Driving &amp; Phone Use</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Alberta&#39;s distracted driving law prohibits using a hand held phone or other hand held electronic device while driving, including texting, dialing, or holding it to your ear.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Use hands free or Bluetooth for calls only if truly necessary while driving; pull over safely for anything requiring you to look at or hold the phone.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Navigation should be set before you start moving, not adjusted while driving.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Never read or send job updates, texts, or app notifications while the vehicle is in motion.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">6. Safe Operation on Job Sites</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Use hazard lights and, where the truck partially blocks a driveway or lane, appropriate cones or signage.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Back up slowly and use a spotter (your partner) whenever visibility is limited, including driveways, alleys, and tight residential streets.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Never leave the vehicle running and unattended with the load area open and accessible on a public street.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Respect posted parking, loading zone, and residential parking restrictions. A parking ticket on a company vehicle is the driver&#39;s responsibility unless caused by circumstances outside their control (a customer&#39;s blocked driveway, for example); flag this to dispatch the same day.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">7. Fuel, Mileage &amp; Wear</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Refuel using the company account or method provided; keep receipts as instructed.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Report any unusual noises, warning lights, or handling issues immediately rather than waiting for a scheduled check.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Routine maintenance is scheduled by dispatch or ownership. Flag anything that feels overdue.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">8. Personal Use</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Company vehicles are for Junk Haul Calgary business only: job sites, landfill and donation runs, and depot pickups and drop offs. Personal errands, side jobs, or lending the vehicle to anyone (including other crew members off the schedule) are not permitted.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">9. GPS &amp; Location Tracking</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Company vehicles are tracked live while on shift. This location data, updated roughly every 5 seconds, is what lets dispatch confirm where every truck is against the day&#39;s plan, answer where&#39;s my crew questions, and route nearby opportunistic pickups. This is a working condition of driving a company vehicle, not a surprise: by driving a Junk Haul Calgary vehicle you acknowledge that its location is tracked while on shift. See the Crew Privacy Policy for how this data is stored and who can access it.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">10. If You&#39;re Involved in an Accident</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Stop the vehicle safely; check that everyone is okay.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Call 911 immediately if anyone is injured or the situation is unsafe.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Call dispatch or ownership right away. A vehicle accident is always an immediate, escalate now situation, no matter how minor it looks.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Exchange information with any other party involved, following normal Alberta collision reporting practice (contact the Calgary Police non emergency line for collisions that don&#39;t need emergency response but do need a report, per current City of Calgary and Alberta guidance at the time).</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Do not admit fault, negotiate with the other party, or agree to a cash settlement on the spot. That&#39;s a decision for ownership and insurance, not the driver.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Photograph the scene and any damage before the vehicle is moved, if safe to do so.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">11. Truck Wrap &amp; Vehicle Appearance</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Do not alter, cover, or damage the Junk Haul Calgary vehicle wrap or branding.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Keep the vehicle reasonably clean. It&#39;s parked in customers&#39; driveways in full view of their neighbours, and it&#39;s one of our biggest sources of free local advertising.</p>
        <p className="mb-4 text-gray-700 leading-relaxed">Report any wrap damage (peeling, scratches, vandalism) to dispatch so it can be repaired promptly.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">12. Breakdown Mid Route</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">A truck breakdown mid route affects every remaining job that day, so it&#39;s treated as an immediate escalation. Call dispatch right away so the rest of the day&#39;s schedule, and any customers waiting, can be adjusted.</p>
        <h2 className="text-xl font-bold text-[#1a3a5c] mt-10 mb-4 pb-2 border-b border-gray-200">13. Consequences of Policy Violations</h2>
        <p className="mb-4 text-gray-700 leading-relaxed">Driving on a suspended or invalid licence, unauthorized personal use, leaving the scene of an accident, or repeated unsafe driving are serious violations that can result in loss of driving privileges or termination. Minor, first time issues (a missed pre trip check, a small parking violation) are handled as a coaching conversation, not automatic discipline. The goal is safety and consistency, not punishment.</p>
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
