const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export interface BackupCode {
  value: string;
  consumed: boolean;
}

export function generateSecret(length: number = 32): string {
  let secret = "";
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[Math.floor(Math.random() * BASE32_CHARS.length)];
  }
  return secret;
}

export function buildOtpAuthUri(
  secret: string,
  account: string,
  issuer: string = "StellarSwipe"
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    account
  )}?${params.toString()}`;
}

export function buildQrImageUrl(otpAuthUri: string): string {
  const encoded = encodeURIComponent(otpAuthUri);
  return `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encoded}`;
}

export function generateBackupCodes(count: number = 8): BackupCode[] {
  const codes: BackupCode[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = Math.floor(10000 + Math.random() * 90000).toString();
    const part2 = Math.floor(10000 + Math.random() * 90000).toString();
    codes.push({ value: `${part1}-${part2}`, consumed: false });
  }
  return codes;
}

/**
 * Attempts to consume a backup code. Returns success=false if the input does not
 * match any unused code (wrong value, already consumed, or exhausted).
 */
export function consumeBackupCode(
  codes: BackupCode[],
  input: string
): { success: boolean; updatedCodes: BackupCode[] } {
  const normalised = input.trim();
  const idx = codes.findIndex((c) => !c.consumed && c.value === normalised);
  if (idx === -1) return { success: false, updatedCodes: codes };
  const updatedCodes = codes.map((c, i) =>
    i === idx ? { ...c, consumed: true } : c
  );
  return { success: true, updatedCodes };
}

export function formatBackupCodesText(
  codes: BackupCode[],
  account: string
): string {
  const lines = [
    "StellarSwipe — 2FA Backup Codes",
    `Account: ${account}`,
    `Generated: ${new Date().toISOString().split("T")[0]}`,
    "",
    "Keep these codes in a safe place. Each code can only be used once.",
    "",
    ...codes.map(
      (code, i) =>
        `${String(i + 1).padStart(2, "0")}. ${code.value}${
          code.consumed ? " (used)" : ""
        }`
    ),
    "",
    "If you lose access to your authenticator, use one of these codes to sign in.",
  ];
  return lines.join("\n");
}

export function isValidSixDigitCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `•••-•••-${digits.slice(-4)}`;
}

export function isValidPhoneNumber(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,15}$/.test(phone.trim());
}

export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
