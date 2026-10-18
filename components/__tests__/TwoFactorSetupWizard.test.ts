import {
  generateSecret,
  buildOtpAuthUri,
  buildQrImageUrl,
  generateBackupCodes,
  formatBackupCodesText,
  isValidSixDigitCode,
  isValidPhoneNumber,
  maskPhoneNumber,
  formatSecretForDisplay,
} from "@/lib/twoFactorUtils";

describe("generateSecret", () => {
  it("returns a string of the default length (32)", () => {
    const secret = generateSecret();
    expect(secret.length).toBe(32);
  });

  it("returns a string of the requested length", () => {
    expect(generateSecret(16).length).toBe(16);
    expect(generateSecret(64).length).toBe(64);
  });

  it("only contains base32 characters (A-Z and 2-7)", () => {
    const secret = generateSecret(100);
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  it("generates different secrets on successive calls", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});

describe("buildOtpAuthUri", () => {
  it("starts with otpauth://totp/", () => {
    const uri = buildOtpAuthUri("ABCDEFGH", "user@test.com");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
  });

  it("includes the secret in the query string", () => {
    const uri = buildOtpAuthUri("TESTKEY1234", "user@test.com");
    expect(uri).toContain("secret=TESTKEY1234");
  });

  it("includes the issuer in both label and query string", () => {
    const uri = buildOtpAuthUri("SECRET", "user@test.com", "MyApp");
    expect(uri).toContain("MyApp");
    expect(uri).toContain("issuer=MyApp");
  });

  it("defaults issuer to StellarSwipe", () => {
    const uri = buildOtpAuthUri("SECRET", "user@test.com");
    expect(uri).toContain("StellarSwipe");
  });

  it("encodes the account in the label", () => {
    const uri = buildOtpAuthUri("SECRET", "user+test@example.com");
    expect(uri).toContain(encodeURIComponent("user+test@example.com"));
  });
});

describe("buildQrImageUrl", () => {
  it("returns a URL containing the encoded otpauth URI", () => {
    const otpUri = "otpauth://totp/StellarSwipe:user@test.com?secret=ABC";
    const url = buildQrImageUrl(otpUri);
    expect(url).toContain(encodeURIComponent(otpUri));
  });

  it("is a non-empty string", () => {
    const url = buildQrImageUrl("otpauth://totp/test");
    expect(url.length).toBeGreaterThan(0);
  });
});

describe("generateBackupCodes", () => {
  it("generates the default count of 8 codes", () => {
    expect(generateBackupCodes().length).toBe(8);
  });

  it("generates the specified count of codes", () => {
    expect(generateBackupCodes(5).length).toBe(5);
    expect(generateBackupCodes(12).length).toBe(12);
  });

  it("each code matches the XXXXX-XXXXX pattern", () => {
    const codes = generateBackupCodes(20);
    codes.forEach((code) => {
      expect(/^\d{5}-\d{5}$/.test(code.value)).toBe(true);
    });
  });

  it("generates unique codes", () => {
    const codes = generateBackupCodes(8);
    const unique = new Set(codes.map((c) => c.value));
    expect(unique.size).toBe(8);
  });
});

describe("formatBackupCodesText", () => {
  const codes = [
    { value: "11111-22222", consumed: false },
    { value: "33333-44444", consumed: false },
  ];

  it("includes a header mentioning StellarSwipe", () => {
    const text = formatBackupCodesText(codes, "user@test.com");
    expect(text).toContain("StellarSwipe");
  });

  it("includes the account email", () => {
    const text = formatBackupCodesText(codes, "user@test.com");
    expect(text).toContain("user@test.com");
  });

  it("lists all provided backup codes", () => {
    const text = formatBackupCodesText(codes, "user@test.com");
    codes.forEach((code) => expect(text).toContain(code.value));
  });

  it("numbers the codes starting from 01", () => {
    const text = formatBackupCodesText(codes, "user@test.com");
    expect(text).toContain("01.");
    expect(text).toContain("02.");
  });
});

describe("isValidSixDigitCode", () => {
  it("returns true for a 6-digit code", () => {
    expect(isValidSixDigitCode("123456")).toBe(true);
  });

  it("returns true for a code with surrounding spaces", () => {
    expect(isValidSixDigitCode(" 654321 ")).toBe(true);
  });

  it("returns false for codes with fewer than 6 digits", () => {
    expect(isValidSixDigitCode("12345")).toBe(false);
  });

  it("returns false for codes with more than 6 digits", () => {
    expect(isValidSixDigitCode("1234567")).toBe(false);
  });

  it("returns false for codes containing letters", () => {
    expect(isValidSixDigitCode("12345a")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidSixDigitCode("")).toBe(false);
  });
});

describe("isValidPhoneNumber", () => {
  it("returns true for a standard US number", () => {
    expect(isValidPhoneNumber("+1 555 000 0000")).toBe(true);
  });

  it("returns true for a number with dashes", () => {
    expect(isValidPhoneNumber("+44-7911-123456")).toBe(true);
  });

  it("returns false for a string too short to be a phone number", () => {
    expect(isValidPhoneNumber("123")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidPhoneNumber("")).toBe(false);
  });

  it("returns false for a string with letters", () => {
    expect(isValidPhoneNumber("abc-defg-hijk")).toBe(false);
  });
});

describe("maskPhoneNumber", () => {
  it("shows only the last 4 digits", () => {
    const masked = maskPhoneNumber("+1 555 000 1234");
    expect(masked).toContain("1234");
    expect(masked).not.toContain("555");
  });

  it("replaces leading digits with bullets", () => {
    const masked = maskPhoneNumber("+1 555 000 1234");
    expect(masked).toContain("•");
  });

  it("returns the original value for very short strings", () => {
    expect(maskPhoneNumber("123")).toBe("123");
  });
});

describe("formatSecretForDisplay", () => {
  it("inserts spaces every 4 characters", () => {
    const formatted = formatSecretForDisplay("ABCDEFGHIJKLMNOP");
    expect(formatted).toBe("ABCD EFGH IJKL MNOP");
  });

  it("handles secrets not divisible by 4", () => {
    const formatted = formatSecretForDisplay("ABCDE");
    expect(formatted).toBe("ABCD E");
  });

  it("returns the original secret when empty", () => {
    expect(formatSecretForDisplay("")).toBe("");
  });
});
