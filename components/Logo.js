import Image from 'next/image';

// Header/inline logo: Stampede edition logo.
export default function Logo({ className = 'h-9', showWordmark = true }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo/stampede-logo.png"
        alt="Junk Haul Calgary"
        width={64}
        height={64}
        priority
        className="h-full w-auto object-contain"
      />
      {showWordmark && (
        <Image
          src="/logo/stampede-banner.png"
          alt="Junk Haul Calgary Stampede"
          width={160}
          height={107}
          priority
          className="h-full w-auto object-contain"
        />
      )}
    </div>
  );
}
