'use client';

import { useState } from 'react';

const GOLD = '#d4af37';

const INPUT = `w-full rounded-xl border px-4 py-3 text-[14px] text-white placeholder:text-gray-600 transition focus:outline-none disabled:opacity-50 appearance-none`;

const INPUT_STYLE = { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.10)' };

const LABEL = 'mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600';

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

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = '#D4AF37';
    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(212,175,55,0.3)';
  }
  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
    e.currentTarget.style.boxShadow = 'none';
  }

  if (submitted) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border p-10 text-center"
        style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)' }}
        />
        <div
          className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border"
          style={{ borderColor: 'rgba(212,175,55,0.30)', backgroundColor: 'rgba(212,175,55,0.10)' }}
        >
          <svg
            className="h-7 w-7"
            style={{ color: GOLD }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mb-3 text-2xl font-black tracking-tight text-white">
          Visit confirmed
        </h2>
        <p className="text-[14px] leading-relaxed text-gray-500">
          Thank you, {leadName}. Our team will reach out shortly to confirm your appointment.
        </p>
        <p className="mt-4 text-[12px] text-gray-600">
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
    <div
      className="relative overflow-hidden rounded-2xl border p-8"
      style={{ backgroundColor: '#0a0a0a', borderColor: 'rgba(212,175,55,0.18)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(to right, transparent, rgba(212,175,55,0.6), transparent)' }}
      />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={LABEL}>Preferred Date</label>
          <input
            type="date"
            required
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={INPUT}
            style={{ ...INPUT_STYLE, colorScheme: 'dark' }}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        </div>

        <div>
          <label className={LABEL}>Preferred Time</label>
          <select
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={INPUT}
            style={INPUT_STYLE}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
          <p
            className="rounded-xl border px-3 py-2.5 text-[12px]"
            style={{
              borderColor: 'rgba(248,113,113,0.30)',
              backgroundColor: 'rgba(248,113,113,0.08)',
              color: '#fca5a5',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !date || !time}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-bold transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          {submitting ? 'Booking…' : 'Confirm Site Visit'}
        </button>

        <p className="text-center text-[11px] text-gray-700">
          Our team will call to confirm your slot within 2 hours.
        </p>
      </form>
    </div>
  );
}
