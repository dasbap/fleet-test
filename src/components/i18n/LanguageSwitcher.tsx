import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { analytics, syncAnalyticsLanguage } from "@/lib/analytics";
import { SUPPORTED_LANGS } from "@/i18n";
import { cn } from "@/lib/utils";

const LANGS = [
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ln", label: "Lingala", flag: "🇨🇩" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "wo", label: "Wolof", flag: "🇸🇳" },
  { code: "sw", label: "Kiswahili", flag: "🇹🇿" },
  { code: "es", label: "Español", flag: "🇪🇸" },
] as const;

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation("common");
  const resolved = (i18n.resolvedLanguage ?? i18n.language).split("-")[0] ?? "fr";
  const current = LANGS.find((l) => l.code === resolved) ?? LANGS[0];
  const selectableLangs = LANGS.filter((lang) =>
    SUPPORTED_LANGS.includes(lang.code as (typeof SUPPORTED_LANGS)[number])
  );

  return (
    <Select
      value={current.code}
      onValueChange={(next) => {
        const prev = i18n.language;
        void i18n.changeLanguage(next).then(() => {
          analytics.languageChanged(prev, next);
          syncAnalyticsLanguage();
        });
      }}
    >
      <SelectTrigger
        className={cn("w-full max-w-xs", className)}
        aria-label={t("languageSwitcher.ariaLabel")}
      >
        <SelectValue placeholder={`${current.flag} ${current.label}`} />
      </SelectTrigger>
      <SelectContent>
        {selectableLangs.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="mr-2" aria-hidden>
              {lang.flag}
            </span>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
