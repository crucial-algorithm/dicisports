import { createCookieSessionStorage } from 'remix';

import { Theme, isTheme } from '~/utils/theme-provider';
import Config from '~/server/config.server';

const { SESSION_SECRET } = Config();

const themeStorage = createCookieSessionStorage({
  cookie: {
    name: 'ds_theme',
    secure: true,
    secrets: [SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    // no theme for you on my 100th birthday! 😂
    expires: new Date('2082-09-13'),
    httpOnly: true
  }
});

async function getThemeSession(request: Request) {
  const session = await themeStorage.getSession(request.headers.get('Cookie'));

  return {
    getTheme: () => {
      const themeValue = session.get('theme');

      return isTheme(themeValue) ? themeValue : Theme.LIGHT;
    },
    setTheme: (theme: Theme) => session.set('theme', theme),
    commit: () => themeStorage.commitSession(session)
  };
}

export { getThemeSession };
