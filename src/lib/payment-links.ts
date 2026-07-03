import type { User } from "./types";

function stripHandle(v: string): string {
  return v.trim().replace(/^[@$]/, "").replace(/^https?:\/\/[^/]+\//, "");
}

export function venmoPayLink(handle: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    txn: "pay",
    amount: amount.toFixed(2),
    note,
  });
  return `https://venmo.com/${stripHandle(handle)}?${params.toString()}`;
}

export function paypalPayLink(handle: string, amount: number): string {
  return `https://paypal.me/${stripHandle(handle)}/${amount.toFixed(2)}`;
}

export function cashAppPayLink(handle: string, amount: number): string {
  return `https://cash.app/$${stripHandle(handle)}/${amount.toFixed(2)}`;
}

export interface PayOption {
  label: string;
  url: string;
}

/** Build the list of pay options available for a user based on which handles they've set. */
export function payOptionsFor(
  user: Pick<User, "venmo" | "paypal" | "cashapp">,
  amount: number,
  note: string,
): PayOption[] {
  const options: PayOption[] = [];
  if (user.venmo) {
    options.push({ label: "Pay with Venmo", url: venmoPayLink(user.venmo, amount, note) });
  }
  if (user.paypal) {
    options.push({ label: "Pay with PayPal", url: paypalPayLink(user.paypal, amount) });
  }
  if (user.cashapp) {
    options.push({ label: "Pay with Cash App", url: cashAppPayLink(user.cashapp, amount) });
  }
  return options;
}
