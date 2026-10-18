"use client";

import { useI18n } from "@/hooks/useI18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useState } from "react";
import { isRTL } from "@/lib/i18n";

const LOCALE_LABELS: Record<string, { label: string; native: string }> = {
  en: { label: "English", native: "English" },
  ng: { label: "Yoruba (Nigeria)", native: "Yorùbá" },
  es: { label: "Spanish", native: "Español" },
  fr: { label: "French", native: "Français" },
  de: { label: "German", native: "Deutsch" },
  zh: { label: "Chinese", native: "中文" },
  ar: { label: "Arabic (RTL)", native: "العربية" },
};

export function LanguageSelector() {
  const { locale, setLocale, supportedLocales, isInitialized } = useI18n();
  const [showMenu, setShowMenu] = useState(false);

  if (!isInitialized) return null;

  const current = LOCALE_LABELS[locale] ?? { label: locale, native: locale };

  return (
    <div className="relative inline-block">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Change language"
        aria-expanded={showMenu}
        aria-haspopup="listbox"
        className="gap-1"
      >
        <Globe size={16} />
        {current.native}
      </Button>

      {showMenu && (
        <div
          className="absolute end-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-20 min-w-[180px] p-1"
          role="listbox"
          aria-label="Select language"
        >
          {supportedLocales.map((loc) => {
            const info = LOCALE_LABELS[loc] ?? { label: loc, native: loc };
            const rtl = isRTL(loc);
            return (
              <button
                key={loc}
                role="option"
                aria-selected={locale === loc}
                onClick={() => {
                  setLocale(loc);
                  setShowMenu(false);
                }}
                dir={rtl ? "rtl" : "ltr"}
                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between gap-2 ${
                  locale === loc
                    ? "bg-blue-500/20 text-blue-500"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <span>{info.native}</span>
                <span className="text-xs text-muted-foreground">
                  {info.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
