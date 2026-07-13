'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useReducedMotionPref } from '@/components/motion';

export default function Home() {
  const reduced = useReducedMotionPref();
  const anim = (props) => (reduced ? {} : props);

  return (
    <main className="min-h-dvh flex flex-col px-6 py-6 max-w-md mx-auto">
      <motion.div
        initial={anim({ y: -20, opacity: 0 })}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex justify-center pt-2"
      >
        <Image
          src="/logo/stampede-alt.png"
          alt="Junk Haul Calgary. Same Day. Calgary."
          width={256}
          height={256}
          priority
          className="w-48 h-auto object-contain"
        />
      </motion.div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        <div>
          <h1 className="text-[48px] leading-[1.05] font-bold text-gray-900">
            Your junk.
            <br />
            Gone today.
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Book in 60 seconds. Instant price. No hidden fees.
          </p>
        </div>

        <motion.div
          initial={anim({ y: 20, opacity: 0 })}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            href="/book"
            className="flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-bold py-4 rounded-2xl text-lg tracking-wide active:scale-97"
          >
            📷 GET INSTANT PRICE →
          </Link>
        </motion.div>

        <motion.div
          initial={anim({ opacity: 0 })}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-2 text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-semibold">Canadian Owned.</span>
            <span className="text-gray-300">|</span>
            <span>Calgary Run.</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600 text-sm font-medium">
            <span>✅ Fully Licensed & Insured</span>
            <span>⚡ Same Day Available</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
            <span>📷 Photo quote</span>
            <span>🔒 No hidden fees</span>
            <span>🧹 We sweep up after</span>
          </div>
        </motion.div>
      </div>

      <div className="text-center mt-6 space-y-1">
        <a
          href="tel:+15873250751"
          className="block text-sm font-semibold text-orange-500"
        >
          📞 (587) 325-0751 — Call or text anytime
        </a>
        <p className="text-xs text-gray-400">
          <Link href="/faq" className="underline">What do we haul?</Link> · Same Day. Calgary.
        </p>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-2">
          <Link href="/commercial-junk-removal" className="underline">Commercial</Link>
          <Link href="/garage-cleanouts" className="underline">Garage Cleanouts</Link>
          <Link href="/estate-cleanouts" className="underline">Estate Cleanouts</Link>
          <Link href="/furniture-removal" className="underline">Furniture Removal</Link>
          <Link href="/appliance-removal" className="underline">Appliance Removal</Link>
        </div>
      </div>
    </main>
  );
}
