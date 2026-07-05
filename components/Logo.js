import Image from 'next/image';

// Header/inline logo: Stampede edition logo.
export default function Logo({ className = 'h-9', showWordmark = true }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo/stampede-banner.png"
        alt="Junk Haul Calgary"
        width={160}
        height={107}
        priority
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
