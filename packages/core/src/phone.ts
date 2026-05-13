export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 13 && cleaned.startsWith('91')) {
    if (phone.includes('+')) {
      return `+${cleaned}`;
    }
  }

  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  throw new Error(`Invalid Indian phone number: ${phone}`);
}

export function maskPhoneNumber(phone: string): string {
  if (!phone.match(/^\+91\d{10}$/)) {
    throw new Error('Invalid E.164 phone number');
  }
  return `+91****${phone.slice(-4)}`;
}
