export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');

  // Domestic trunk prefix — "09876543210" is how many Indians write their
  // number. Strip the leading 0 before length checks.
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // "00919876543210" (international dialing prefix form)
  if (cleaned.length === 14 && cleaned.startsWith('0091')) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.length === 10) {
    // Indian mobile numbers start with 6-9; anything else is not callable.
    if (!/^[6-9]/.test(cleaned)) {
      throw new Error(`Invalid Indian phone number: ${phone}`);
    }
    return `+91${cleaned}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]/.test(cleaned.slice(2))) {
    return `+${cleaned}`;
  }

  // "91 09876543210" — country code followed by trunk-prefixed number.
  if (cleaned.length === 13 && cleaned.startsWith('910')) {
    const subscriber = cleaned.slice(3);
    if (/^[6-9]/.test(subscriber)) return `+91${subscriber}`;
  }

  throw new Error(`Invalid Indian phone number: ${phone}`);
}

export function maskPhoneNumber(phone: string): string {
  if (!phone.match(/^\+91\d{10}$/)) {
    throw new Error('Invalid E.164 phone number');
  }
  return `+91****${phone.slice(-4)}`;
}
