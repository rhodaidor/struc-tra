export interface LanguageOption {
  code: string;
  name: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', name: 'English (United States)', locale: 'en-US' },
  { code: 'en-GB', name: 'English (United Kingdom)', locale: 'en-GB' },
];

export const DEFAULT_LANGUAGE = 'English (United States)';
