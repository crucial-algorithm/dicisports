import { Role } from '@prisma/client';
import * as React from 'react';
import { Link, useLocation } from '@remix-run/react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useAnimation,
  useReducedMotion
} from 'framer-motion';
import { buildImageUrl } from 'cloudinary-build-url';

import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';
import { IsAdmin, IsNotAnOrganizer } from '~/components/shared/Roles';
import type { Organiser, User } from '~/types';

import { Theme, Themed, useTheme } from '~/utils/theme-provider';

import Logo from '~/components/shared/Logo';

import { useElementState, useRootData } from '~/hooks';

import { SunIcon } from './shared/icons/SunIcon';
import { MoonIcon } from './shared/icons/MoonIcon';
import { TeamCircle } from './shared/icons/TeamCircle';

const LINKS = [
  {
    name: 'Events Menu',
    to: '/o',
    public: false,
    roles: ['ADMIN'],
    id: 'events'
  },
  {
    name: 'Groups Menu',
    to: '/g/groups',
    public: false,
    roles: [],
    id: 'groups'
  }
];

const MOBILE_LINKS = [
  { name: 'Home', to: '/', public: true, roles: [], id: 'home' },
  ...LINKS
];

const links = (
  list: Array<{
    name: string;
    to: string;
    public: boolean;
    roles: string[];
    id: string;
  }>,
  user: User | null
) => {
  return list.filter(
    (l) =>
      l.public ||
      (!l.public &&
        user &&
        (l.roles.length === 0 || l.roles.includes(user.role)))
  );
};

function NavLink({
  to,
  ...rest
}: Omit<Parameters<typeof Link>['0'], 'to'> & { to: string }) {
  const location = useLocation();
  const isSelected =
    to === location.pathname || location.pathname.startsWith(`${to}/`);

  return (
    <li className="px-5 py-2">
      <Link
        prefetch="intent"
        className={clsx(
          'underlined block hover:text-team-current focus:text-team-current whitespace-nowrap text-lg font-medium focus:outline-none',
          {
            'text-team-current active': isSelected,
            'text-secondary': !isSelected
          }
        )}
        to={to}
        {...rest}
      />
    </li>
  );
}

const iconTransformOrigin = { transformOrigin: '50% 100px' };

function DarkModeToggle({
  variant = 'icon',
  onToggle
}: {
  variant?: 'icon' | 'labelled';
  onToggle?: () => void;
}) {
  const [, setTheme] = useTheme();
  const { t } = useTranslation('common');

  function handleOnClick() {
    onToggle && onToggle();
    setTheme((previousTheme) =>
      previousTheme === Theme.DARK ? Theme.LIGHT : Theme.DARK
    );
  }

  return (
    <button
      onClick={handleOnClick}
      className={clsx(
        'border-secondary hover:border-primary focus:border-primary inline-flex items-center justify-center p-1 h-14 border-2 rounded-full focus:outline-none overflow-hidden transition',
        {
          'w-14': variant === 'icon',
          'px-8': variant === 'labelled'
        }
      )}
    >
      {/* note that the duration is longer then the one on body, controlling the bg-color */}
      <div className="relative w-8 h-8">
        <span
          className="motion-reduce:duration-[0s] absolute inset-0 text-black dark:text-white transform dark:rotate-0 rotate-90 transition duration-1000"
          style={iconTransformOrigin}
        >
          <MoonIcon />
        </span>
        <span
          className="motion-reduce:duration-[0s] absolute inset-0 text-black dark:text-white transform dark:-rotate-90 rotate-0 transition duration-1000"
          style={iconTransformOrigin}
        >
          <SunIcon />
        </span>
      </div>
      <span
        className={clsx('ml-4 text-black dark:text-white', {
          'sr-only': variant === 'icon'
        })}
      >
        <Themed
          dark={t('Switch to light mode')}
          light={t('Switch to dark mode')}
        />
      </span>
    </button>
  );
}

function MobileMenuList({
  isExpanded,
  linkClicked
}: {
  isExpanded: boolean;
  linkClicked: () => void;
}) {
  const { t } = useTranslation('common');
  const shouldReduceMotion = useReducedMotion();
  const { user } = useRootData();

  useEffect(() => {
    if (isExpanded) {
      // don't use overflow-hidden, as that toggles the scrollbar and causes layout shift
      document.body.classList.add('fixed');
      document.body.classList.add('overflow-y-scroll');
      // alternatively, get bounding box of the menu, and set body height to that.
      document.body.style.height = '100vh';
    } else {
      document.body.classList.remove('fixed');
      document.body.classList.remove('overflow-y-scroll');
      document.body.style.removeProperty('height');
    }
  }, [isExpanded]);

  return (
    // @ts-ignore
    <AnimatePresence>
      {isExpanded && (
        <div className="fixed top-28 left-0 z-50 w-full h-[calc(100vh-7rem)]">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.15,
              ease: 'linear'
            }}
            className="bg-primary flex flex-col pb-12 h-full border-t border-gray-200 dark:border-gray-600 overflow-y-scroll"
          >
            <div className="p-0 bg-transparent border-none flex flex-col">
              {links(MOBILE_LINKS, user).map((link) => (
                <Link
                  className="hover:bg-secondary focus:bg-secondary text-primary px-5vw py-9 hover:text-team-current border-b border-gray-200 dark:border-gray-600"
                  key={link.to}
                  to={link.to}
                  onClick={linkClicked}
                  data-cy={`m-${link.id}`}
                >
                  {t(link.name)}
                </Link>
              ))}
              <div className="noscript-hidden py-9 text-center">
                <DarkModeToggle variant="labelled" onToggle={linkClicked} />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const topVariants = {
  open: { rotate: 45, y: 7 },
  closed: { rotate: 0, y: 0 }
};

const centerVariants = {
  open: { opacity: 0 },
  closed: { opacity: 1 }
};

const bottomVariants = {
  open: { rotate: -45, y: -5 },
  closed: { rotate: 0, y: 0 }
};

function MobileMenu() {
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : {};
  const [opened, setOpened] = useState(false);

  function handleTriggerMenu(e: unknown) {
    setOpened(!opened);
  }

  function handleLinkClicked() {
    setOpened(false);
  }

  const state = opened ? 'open' : 'closed';

  return (
    <>
      <button
        data-cy="mobile-menu"
        onClick={handleTriggerMenu}
        className={clsx(
          'w-14 h-14 p-1 rounded-full border-2 border-secondary text-primary transition',
          'inline-flex items-center justify-center',
          'focus:border-primary focus:outline-none hover:border-primary'
        )}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.rect
            animate={state}
            variants={topVariants}
            transition={transition}
            x="6"
            y="9"
            width="20"
            height="2"
            rx="1"
            fill="currentColor"
          />
          <motion.rect
            animate={state}
            variants={centerVariants}
            transition={transition}
            x="6"
            y="15"
            width="20"
            height="2"
            rx="1"
            fill="currentColor"
          />
          <motion.rect
            animate={state}
            variants={bottomVariants}
            transition={transition}
            x="6"
            y="21"
            width="20"
            height="2"
            rx="1"
            fill="currentColor"
          />
        </svg>
      </button>
      <MobileMenuList isExpanded={opened} linkClicked={handleLinkClicked} />
    </>
  );
}

// Timing durations used to control the speed of the team ring in the profile button.
// Time is seconds per full rotation
const durations = {
  initial: 40,
  hover: 3,
  focus: 3,
  active: 0.25
};

function to(user: User | null) {
  if (!user) {
    return '/login';
  }

  if (user.role === Role.ORGANIZER) {
    return '/o';
  }

  return 'me';
}

function ProfileButton({ user }: { user: User | null }) {
  const controls = useAnimation();
  const [ref, state] = useElementState();
  const shouldReduceMotion = useReducedMotion();
  const organiser: Organiser | null = user?.organiser || null;

  React.useEffect(() => {
    void controls.start((_, { rotate = 0 }) => {
      const target =
        typeof rotate === 'number'
          ? state === 'initial'
            ? rotate - 360
            : rotate + 360
          : 360;

      return shouldReduceMotion
        ? {}
        : {
            rotate: [rotate, target],
            transition: {
              duration: durations[state],
              repeat: Infinity,
              ease: 'linear'
            }
          };
    });
  }, [state, controls, shouldReduceMotion]);

  return (
    <Link
      prefetch="intent"
      to={to(user)}
      aria-label={user ? 'My Account' : 'Login'}
      className={clsx(
        'inline-flex items-center justify-center ml-4 w-14 h-14 rounded-full focus:outline-none'
      )}
      ref={ref}
    >
      <motion.div className="absolute" animate={controls}>
        <TeamCircle size={56} />
      </motion.div>
      {organiser ? (
        <img
          src={buildImageUrl(organiser.logo, {
            transformations: { resize: { type: 'fill', width: 30, height: 30 } }
          })}
          className="inline w-10 rounded-full select-none"
          alt={organiser.name}
        />
      ) : (
        <img
          className={clsx('inline w-10 rounded-full select-none ', {
            'scale-150': !user
          })}
          src={buildImageUrl(user ? 'product/logo' : 'product/login', {})}
          alt={user ? 'logo' : 'login'}
        />
      )}
    </Link>
  );
}

function Navbar() {
  const { t } = useTranslation('common');
  const { user } = useRootData();
  const [isRoot, setIsRoot] = useState<boolean>(true);
  const location = useLocation();

  // hacky stuff: we don't want to show the logo for the home page, because we
  // have the logo centered in the screen
  useEffect(() => {
    setIsRoot(location.pathname === '/');
  }, [location]);

  return (
    <div className="px-5vw py-9 lg:py-12">
      <nav className="text-primary flex items-center justify-between mx-auto max-w-8xl">
        <div>
          {!isRoot ? (
            <Link
              prefetch="intent"
              to="/"
              className="text-primary underlined block whitespace-nowrap text-2xl font-medium focus:outline-none transition"
            >
              <Logo className="w-32 md:w-64" />
            </Link>
          ) : (
            <>&nbsp;</>
          )}
        </div>

        <div className="flex items-center justify-center">
          <ul className="hidden lg:flex">
            <IsNotAnOrganizer>
              {location.pathname !== '/organizers-promo' && (
                <li className="px-5 py-2">
                  <CTALandingPublishYourEvent
                    cta={t('CTA Publish Your Event')}
                  />
                </li>
              )}
            </IsNotAnOrganizer>
          </ul>
          <div className="block lg:hidden">
            <MobileMenu />
          </div>
          <div className="noscript-hidden hidden lg:block">
            <DarkModeToggle />
          </div>

          <ProfileButton user={user} />
        </div>
      </nav>
    </div>
  );
}

function CTALandingPublishYourEvent({ cta }: { cta: string }) {
  return (
    <ButtonLink to="/organizers-promo" size="x-small" className="py-1">
      {cta}
    </ButtonLink>
  );
}

export { Navbar };
