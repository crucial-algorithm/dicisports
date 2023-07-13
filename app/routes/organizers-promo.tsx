import { Role } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';
import DisplayImg from '~/components/shared/DisplayImg';
import Main from '~/components/shared/Main';
import {
  IsUserAuthenticated,
  IsUserUnAuthenticated
} from '~/components/shared/Roles';
import { H3 } from '~/components/shared/typography';
import { getUser } from '~/server/auth/session.server';
import { findUserEvents } from '~/server/db/events.server';

export const handle = {
  i18n: ['organizer-promo']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);

  if (!user) {
    return json({});
  }

  const events = await findUserEvents(user.id);

  if (user.role === Role.ORGANIZER) {
    return redirect('/o');
  }

  if (events.length > 0) {
    return redirect(`/o/event/${events[0].id}`);
  }

  return json({});
};

export default function OrganizersLandingPage() {
  const { t } = useTranslation('organizer-promo');

  return (
    <Main className="mx-auto max-w-7xl">
      <div className="relative grid grid-cols-4 gap-x-4 md:grid-cols-8 lg:grid-cols-12 lg:gap-x-6">
        <H3 className="mb-8 col-span-full"> {t('Organizer Promo Header')} </H3>
      </div>

      <div className="flex justify-start mb-8">
        <IsUserAuthenticated>
          <ButtonLink to="/o/event/create">
            {t('Organizer Promo CTA')}
          </ButtonLink>
        </IsUserAuthenticated>
        <IsUserUnAuthenticated>
          <ButtonLink to="/login?a=create-event">
            {t('Organizer Promo CTA')}
          </ButtonLink>
        </IsUserUnAuthenticated>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 lg:grid-cols-12 lg:gap-x-6">
        <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark mb-8 col-span-full">
          {t('Organizer Promo Intro')}
        </p>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 lg:grid-cols-12 lg:gap-x-6 mb-10 lg:mb-16">
        <div className="col-span-full flex items-center justify-center lg:justify-start lg:col-span-6">
          <DisplayImg imageId="product/organizers-1" dontMessWithImgSize={true} className="max-h-96 max-w-lg w-full" />
        </div>
        <div className="col-span-full lg:col-span-5 lg:col-start-7">
          <p className="text-xl font-medium md:text-2xl text-black dark:text-white mb-3 mt-3 md:mt-0">
            {t('Why DiciSports')}
          </p>
          <div className="flex flex-col gap-8">
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>{t('Increase Your Reach')}</strong>&nbsp;
              {t('Increase Your Reach Detail')}
            </p>
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>{t('Simplify Event Management')}</strong>&nbsp;
              {t('Simplify Event Management Detail')}
            </p>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-4 gap-x-4 lg:grid-cols-12 lg:gap-x-6 mx-auto max-w-7xl mb-16">
        <div className="col-span-full lg:mb-0 flex lg:justify-end items-center justify-center lg:justify-end lg:col-span-6 lg:col-start-6">
          <DisplayImg imageId="product/organizers-2c" dontMessWithImgSize={true} className="max-h-96 max-w-lg w-full" />
        </div>
        <div className="col-span-full pt-6 lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:col-span-5">
          <div className="flex flex-auto flex-col opacity-100 gap-8">
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>{t('Boost Event Visibility')}</strong>&nbsp;
              {t('Boost Event Visibility Detail')}
            </p>
            <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark">
              <strong>{t('Communicate With Your Audience')}</strong>&nbsp;
              {t('Communicate With Your Audience Detail')}
            </p>
          </div>
        </div>
      </div>

      <p className="max-w-full text-lg text-secondary prose prose-light dark:prose-dark mb-8">
        {t('Organizer Promo CTA Prefix')}
      </p>
      <IsUserAuthenticated>
        <ButtonLink to="/o/event/create">{t('Organizer Promo CTA')}</ButtonLink>
      </IsUserAuthenticated>
      <IsUserUnAuthenticated>
        <ButtonLink to="/login?a=create-event">
          {t('Organizer Promo CTA')}
        </ButtonLink>
      </IsUserUnAuthenticated>
    </Main>
  );
}
