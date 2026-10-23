import { redirect } from 'next/navigation';

// The Accounts desk was removed (out of product scope) — bookings live on
// Inventory now. Keeps old bookmarks and deep links working.
export default function AccountsRedirect() {
  redirect('/inventory');
}
