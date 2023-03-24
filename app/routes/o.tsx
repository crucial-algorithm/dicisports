import {
  UsersIcon,
  EnvelopeIcon,
  Bars3Icon
} from '@heroicons/react/20/solid';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, Outlet, useLocation } from '@remix-run/react';
import { buildImageUrl } from 'cloudinary-build-url';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CollapseMenuIcon from '~/components/shared/icons/CollapseMenuIcon';
import CollectionIcon from '~/components/shared/icons/Collection';
import DiscountCodeIcon from '~/components/shared/icons/DiscountCodeIcon';

import Logo from '~/components/shared/Logo';

import { requireUser } from '~/server/auth/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  // TODO: this should be restricted to organisers
  await requireUser(request);

  return json({});
};

export default function OrganizerLayout() {
  const [collapsed, setCollapsed] = useState<null | boolean>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const handleToggleMenu = useCallback(() => {
    window.localStorage.setItem('side-menu-collapsed', !collapsed ? 'false' : 'true');
    setCollapsed(!collapsed);
  }, [collapsed]);
  const location = useLocation();

  useEffect(() => {
    const collapsed = window.localStorage.getItem('side-menu-collapsed') === 'true';

    setCollapsed(collapsed);
  }, []);

  const handleMobileMenuClick = useCallback(() => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  }, [isMobileMenuOpen]);

  if (collapsed === null) {
    return null;
  }

  return (
    <div className="flex flex-auto">
      <OrganizerSideBar
        sideBarCollapsed={collapsed}
        handleToggleMenu={handleToggleMenu}
      />
      <MobileMenuButton onClick={handleMobileMenuClick} />
      <MobileMenu isExpanded={isMobileMenuOpen} linkClicked={handleMobileMenuClick} pathname={location.pathname} />
      <div className="grow p-2 h-screen overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

type OrganizerSideBarProps = {
  sideBarCollapsed: boolean,
  handleToggleMenu: () => void
}

function OrganizerSideBar({ sideBarCollapsed, handleToggleMenu }: OrganizerSideBarProps) {
  const location = useLocation();

  return (
    <>
      <div
        className={clsx(
          'relative hidden h-screen duration-300 bg-gray-100 border-r border-gray-200 dark:border-gray-600 p-5 dark:bg-gray-800',
          {
            'w-fit md:flex flex-col justify-start items-center': sideBarCollapsed,
            'w-60 md:block': !sideBarCollapsed
          }
        )}
      >
        <Link to="/" className="h-fit">
          <div
            className={clsx('flex items-center justify-center', {
              'gap-x-4': !sideBarCollapsed
            })}
          >
            {sideBarCollapsed && (
              <img
                className="inline w-10 rounded-full select-none scale-100"
                src={buildImageUrl('product/logo', {})}
                alt="DiciSports"
              />
            )}

            {!sideBarCollapsed && <Logo className="w-44" />}
          </div>
        </Link>

        <Menu
          sideBarCollapsed={sideBarCollapsed}
          pathname={location.pathname}
          handleToggleMenu={handleToggleMenu}
          allowCollapse={true}
        />
      </div>
    </>
  );
}


type MenuProps = {
  sideBarCollapsed: boolean;
  pathname: string;
  handleToggleMenu?: () => void;
  allowCollapse: boolean
} & React.ComponentProps<'li'>

function Menu({ handleToggleMenu, pathname, sideBarCollapsed, allowCollapse, className, onClick }: MenuProps) {
  const [t] = useTranslation('common');

  return (
    <>
      <ul
        className={clsx(className, 'pt-6', {
          'w-full md:w-52': !sideBarCollapsed
        })}
      >
        <MenuEntry
          icon={<CollectionIcon className="w-6" />}
          title={t('Events Menu')}
          to="/o"
          pathname={pathname}
          sideBarCollapsed={sideBarCollapsed}
          onClick={onClick}
        />
        <MenuEntry
          icon={<EnvelopeIcon className="w-6" />}
          title={t('Campaigns Menu')}
          to="/o/campaigns"
          pathname={pathname}
          sideBarCollapsed={sideBarCollapsed}
          onClick={onClick}
        />
        <MenuEntry
          icon={
            <DiscountCodeIcon className="w-6 dark:stroke-black dark:fill-white" />
          }
          title={t('Promo Codes Menu')}
          to="/o/discount-codes"
          pathname={pathname}
          sideBarCollapsed={sideBarCollapsed}
          onClick={onClick}
        />
        <MenuEntry
          icon={<UsersIcon className="w-6" />}
          title={t('Users Menu')}
          to="/o/users"
          pathname={pathname}
          sideBarCollapsed={sideBarCollapsed}
          onClick={onClick}
        />
      </ul>

      {allowCollapse && (
        <ul
          className={clsx('flex absolute bottom-8', {
            'w-52': !sideBarCollapsed
          })}
        >
          <li
            className={clsx(
              'flex items-center gap-x-6 p-3 text-base font-bold rounded-lg cursor-pointer dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 mt-2',
              className,
              'w-full select-none',
              {
                'rotate-180': sideBarCollapsed,
                'right-4': !sideBarCollapsed
              }
            )}
            onClick={handleToggleMenu}
          >
            <span className="text-2xl">
              <CollapseMenuIcon className="w-6" />
            </span>
            <span
              className={clsx('origin-left duration-300 hover:block', {
                hidden: sideBarCollapsed
              })}
            >
              {t('Switch Collapse Menu')}
            </span>
          </li>
        </ul>
      )}
    </>
  );
}

type MenuEntryProps = {
  icon: ReactNode;
  title: string;
  pathname?: string;
  to?: string;
  sideBarCollapsed: boolean;
} & React.ComponentProps<'li'>

function MenuEntry({
  to,
  pathname,
  icon,
  sideBarCollapsed,
  title,
  className,
  onClick
}: MenuEntryProps) {
  return (
    <Link to={to || ''} className="text-gray-900 dark:text-white w-full">
      <li
        className={clsx(
          'flex items-center gap-x-6 p-3 text-base font-bold rounded-lg cursor-pointer dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 mt-2',
          className,
          'select-none',
          {
            'bg-gray-200 dark:bg-gray-700': pathname === to
          }
        )}
        onClick={onClick}
      >
        <span className="text-2xl">{icon}</span>
        <span
          className={clsx('origin-left duration-300 hover:block', {
            hidden: sideBarCollapsed
          })}
        >
          {title}
        </span>
      </li>
    </Link>
  );
}

type MobileMenuButtonProps = {

} & React.ComponentProps<'button'>

function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden fixed bottom-2 left-2 w-11 h-11 bg-black dark:bg-white rounded-full z-10"
    >
      <Bars3Icon className="h-6 w-6 m-0 inline-block fill-white dark:fill-black" />
    </button>
  );
}

type MobileMenuProps = {
  isExpanded: boolean;
  linkClicked: () => void;
  pathname: string;
}

function MobileMenu({ isExpanded, linkClicked, pathname }: MobileMenuProps) {
  const shouldReduceMotion = useReducedMotion();

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
        <div className="fixed top-0 left-0 z-50 w-full h-full">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.15,
              ease: 'linear'
            }}
            className="bg-primary flex flex-col pb-12 h-full border-gray-200 dark:border-gray-600 overflow-y-scroll"
          >
            <Menu
              allowCollapse={false}
              sideBarCollapsed={false}
              pathname={pathname}
              onClick={linkClicked}
              className="w-11/12 m-auto"
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
