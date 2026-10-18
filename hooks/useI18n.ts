import { useState, useEffect } from "react";
import {
  t,
  getCurrentLocale,
  getSupportedLocales,
  setLocale,
  isRTL,
  formatNumber,
  formatDate,
  formatCurrency,
  type Locale,
  initI18n,
} from "@/lib/i18n";

export function useI18n() {
  const [locale, setLocalLocale] = useState<Locale>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initI18n().then(() => {
      setLocalLocale(getCurrentLocale());
      setIsInitialized(true);
    });
  }, []);

  // Apply dir attribute to <html> for RTL support
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr";
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const changeLocale = async (newLocale: Locale) => {
    await setLocale(newLocale);
    setLocalLocale(newLocale);
    // Broadcast locale change so Providers (and any other listeners) can sync
    // document-level dir/lang without requiring a full re-render of layout.
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("locale-changed", { detail: { locale: newLocale } })
      );
    }
  };

  return {
    t,
    locale,
    setLocale: changeLocale,
    supportedLocales: getSupportedLocales(),
    isInitialized,
    isRTL: isRTL(locale),
    formatNumber,
    formatDate,
    formatCurrency,
  };
}
