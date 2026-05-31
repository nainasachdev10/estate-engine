'use client';

import { useState } from 'react';

const GOLD = '#d4af37';

const INPUT = `w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white
  placeholder:text-white/30 focus:border-[#d4af37]/40 focus:outline-none focus:ring-1
  focus:ring-[#d4af37]/20 transition appearance-none`;

const LABEL = 'mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-white/50';

const TIME_SLOTS = [
  { value: 'morning', label: 'Morning · 10 am – 12 pm' },
  { value: 'afternoon', label: 'Afternoon · 2 pm – 5 pm' },
  { value: 'evening', label: 'Evening · 5 pm – 7 pm' },
];

interface Props {
  leadId: string;
  leadName: string;
}

export default function VisitForm({ leadId, leadName }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Today's date in YYYY-MM-DD for the min constraint
  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/visit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_date: date, preferred_time: time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-10">
        {/* Gold checkmark circle */}
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-2"
          style={{ borderColor: GOLD }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: GOLD }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2
          className="mb-3 text-2xl text-white"
          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
        >
          Your visit is confirmed
        </h2>
        <p className="text-sm text-white/50 leading-relaxed">
          Thank you, {leadName}. Our team will reach out shortly to confirm your appointment details.
        </p>
        <p className="mt-4 text-xs text-white/30">
          {TIME_SLOTS.find((s) => s.value === time)?.label} &nbsp;·&nbsp;{' '}
          {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-6"
    >
      <div>
        <label className={LABEL}>Preferred Date</label>
        <input
          type="date"
          required
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={INPUT}
          style={{ colorScheme: 'dark' }}
        />
      </div>

      <div>
        <label className={LABEL}>Preferred Time</label>
        <select
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={INPUT}
        >
          <option value="" disabled>Select a time slot</option>
          {TIME_SLOTS.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !date || !time}
        className="w-full rounded-full py-3.5 text-sm font-semibold text-black transition disabled:opacity-50"
        style={{ backgroundColor: submitting || !date || !time ? '#a08830' : GOLD }}
      >
        {submitting ? 'Booking…' : 'Confirm Site Visit'}
      </button>

      <p className="text-center text-xs text-white/30">
        Our team will call to confirm your slot within 2 hours.
      </p>
    </form>
  );
}
