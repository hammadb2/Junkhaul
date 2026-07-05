import Image from 'next/image';

// Header/inline logo: truck mark + official JUNKHAUL wordmark.
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
        <Image
          src="/logo/wordmark.png"
          alt="JUNKHAUL"
          width={120}
          height={40}
          priority
          className="h-full w-auto object-contain"
        />
      )}
    </div>
  );
}
