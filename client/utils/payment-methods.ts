export const CANONICAL_PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "check",
  "direct_deposit",
  "ach",
  "wire",
  "zelle",
] as const;

export type PaymentMethod = (typeof CANONICAL_PAYMENT_METHODS)[number];

// Legacy values that exist in older records/UI
export type LegacyPaymentMethod = "bank_transfer" | "wire_transfer";

export type PaymentMethodAny = PaymentMethod | LegacyPaymentMethod;

export const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "💵 Cash" },
  { value: "credit_card", label: "💳 Credit Card" },
  { value: "debit_card", label: "💳 Debit Card" },
  { value: "check", label: "🧾 Check" },
  { value: "direct_deposit", label: "📥 Direct Deposit" },
  { value: "ach", label: "🏦 Bank Transfer (ACH)" },
  { value: "wire", label: "🏦 Wire Transfer" },
  { value: "zelle", label: "⚡ Zelle" },
];

export function normalizePaymentMethod(
  method: string | null | undefined,
): PaymentMethod | null {
  if (!method) return null;

  switch (method) {
    case "bank_transfer":
      return "ach";
    case "wire_transfer":
      return "wire";
    default:
      return (CANONICAL_PAYMENT_METHODS as readonly string[]).includes(method)
        ? (method as PaymentMethod)
        : null;
  }
}

export function paymentMethodEmojiLabel(method: string | null | undefined): string {
  const normalized = normalizePaymentMethod(method) ?? method;

  switch (normalized) {
    case "cash":
      return "💵 Cash";
    case "credit_card":
      return "💳 Credit Card";
    case "debit_card":
      return "💳 Debit Card";
    case "check":
      return "🧾 Check";
    case "direct_deposit":
      return "📥 Direct Deposit";
    case "ach":
      return "🏦 Bank Transfer (ACH)";
    case "wire":
      return "🏦 Wire Transfer";
    case "zelle":
      return "⚡ Zelle";
    case "bank_transfer":
      return "🏦 Bank Transfer";
    case "wire_transfer":
      return "🏦 Wire Transfer";
    default:
      return normalized ? String(normalized).replace(/_/g, " ") : "-";
  }
}

export function paymentMethodPlainLabel(method: string | null | undefined): string {
  const emojiLabel = paymentMethodEmojiLabel(method);
  // Strip leading emoji + space if present
  return emojiLabel.replace(/^[^A-Za-z0-9]+\s*/, "").trim();
}

export function isCardPaymentMethod(method: string | null | undefined): boolean {
  const normalized = normalizePaymentMethod(method);
  return normalized === "credit_card" || normalized === "debit_card";
}

export function isBankTransferMethod(method: string | null | undefined): boolean {
  const normalized = normalizePaymentMethod(method) ?? method;
  return normalized === "ach" || normalized === "bank_transfer";
}

export function isWireTransferMethod(method: string | null | undefined): boolean {
  const normalized = normalizePaymentMethod(method) ?? method;
  return normalized === "wire" || normalized === "wire_transfer";
}
