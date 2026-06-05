import { enUS, ru, uz } from 'date-fns/locale';

export function resolveIntlLocale(language: string): string {
  if (language === 'ru' || language.startsWith('ru-')) {
    return 'ru-RU';
  }

  if (language === 'en' || language.startsWith('en-')) {
    return 'en-US';
  }

  return 'uz-UZ';
}

export function resolveDateFnsLocale(language: string) {
  if (language === 'ru' || language.startsWith('ru-')) {
    return ru;
  }

  if (language === 'en' || language.startsWith('en-')) {
    return enUS;
  }

  return uz;
}
