export const LANGUAGES = [
  { code: "uz", label: "O‘zbekcha" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

const LANG_KEY = "lazzat_lang";

export function readLang(): LangCode {
  if (typeof window === "undefined") return "uz";
  const stored = window.localStorage.getItem(LANG_KEY);
  return (LANGUAGES.find((l) => l.code === stored)?.code ?? "uz") as LangCode;
}

export function saveLang(code: LangCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANG_KEY, code);
  document.documentElement.lang = code;
}