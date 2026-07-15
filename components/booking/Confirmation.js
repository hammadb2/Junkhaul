'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { checkVariants } from '@/components/motion';
import { formatDateLong, formatTime } from '@/lib/dates';

export default function Confirmation({ booking }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
      >
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <motion.path
            d="M14 27 L23 36 L39 18"
            stroke="#16a34a"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={checkVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>
      </motion.div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h1>
        <p className="text-gray-500 mt-1">
          A confirmation text is on its way to {booking.phone}.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-gray-200 p-5 text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-500">Reference</span>
          <span className="font-mono font-semibold">{booking.booking_ref}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">When</span>
          <span className="font-semibold">
            {formatDateLong(booking.job_date)} · {formatTime(booking.job_time)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Where</span>
          <span className="font-semibold text-right">{booking.address}</span>
        </div>
        <div className="border-t border-gray-100 my-1" />
        <div className="flex justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold">${booking.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Deposit paid</span>
          <span className="font-semibold text-green-600">$50</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Balance on day</span>
          <span className="font-semibold">${booking.balance_due}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        On pickup day, you&apos;ll get a live tracking link — watch your crew on
        the map in real time, just like a rideshare.
      </p>

      <p className="text-sm text-gray-500">
        We&apos;ll text you the morning of your pickup. Need to change something?
        Just reply to that text.
      </p>

      <Link href="/" className="text-orange-600 font-semibold text-sm">
        ← Back to home
      </Link>
    </div>
  );
}
