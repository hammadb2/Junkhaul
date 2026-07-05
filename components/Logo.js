import Image from 'next/image';

// Header/inline logo: Stampede edition logo (truck with hat + wordmark).
export default function Logo({ className = 'h-9', showWordmark = true }) {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo/stampede-alt.png"
        alt="Junk Haul Calgary"
        width={128}
        height={128}
        priority
        className="h-full w-auto object-contain"
      />
    </div>
  );
}
