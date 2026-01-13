import { create } from 'zustand';

type Language = 'en' | 'zh';

interface LanguageState {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (en: string, zh: string) => string;
}

export const useLanguage = create<LanguageState>((set, get) => ({
  language: 'en',
  toggleLanguage: () => set((state) => ({ language: state.language === 'en' ? 'zh' : 'en' })),
  setLanguage: (lang) => set({ language: lang }),
  t: (en, zh) => (get().language === 'en' ? en : zh),
}));
