import Image from 'next/image';

// Header/inline logo: real truck mark + JUNKHAUL wordmark.
export default function Logo({ className = 'h-9', showWordmark = true }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo/truck.png"
        alt="Junk Haul Calgary"
        width={72}
        height={48}
        priority
        className="h-full w-auto object-contain"
      />
      {showWordmark && (
        <span className="font-bold tracking-tight text-gray-900 leading-none text-lg">
          JUNK<span className="text-orange-500">HAUL</span>
        </span>
      )}
    </div>
  );
}
