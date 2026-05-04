const DEFAULT_LOCALE = 'fr';

type LifecycleEvent = {
  params?: {
    data?: {
      locale?: unknown;
      [key: string]: unknown;
    };
  };
};

const ensureDefaultLocale = (event: LifecycleEvent) => {
  const data = event.params?.data;

  if (!data) {
    return;
  }

  if (data.locale == null || data.locale === '' || data.locale === 'null') {
    data.locale = DEFAULT_LOCALE;
  }
};

export default {
  beforeCreate(event: LifecycleEvent) {
    ensureDefaultLocale(event);
  },
  beforeUpdate(event: LifecycleEvent) {
    ensureDefaultLocale(event);
  },
};