import type { ActionFunction, LoaderFunction } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';

import { useActionData } from '@remix-run/react';

import { Form } from '@remix-run/react';

import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

import ProfileFragment from '~/components/ProfileFragment';
import { useRootData } from '~/hooks';

import i18n from '~/server/i18n.server';

import Button from '~/components/shared/Button';

import InputError from '~/components/shared/form/InputError';
import { H2, H4, H6 } from '~/components/shared/typography';
import { getSession, requireUser } from '~/server/auth/session.server';
import { handleFormSubmission } from '~/server/actions.server';
import { updateUser } from '~/server/db/users.server';

import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';

const actionIds = {
  logout: 'logout',
  changeDetails: 'change details'
};

type ActionData = {
  status: 'success' | 'error';
  fields: {
    name?: string | null;
  };
  errors: {
    generalError?: string | null;
    name?: string | null;
  };
};

export const handle = {
  i18n: ['common', 'me']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  await requireUser(request);
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'profile');
  const user = await requireUser(request);
  const form = new URLSearchParams(await request.text());
  const actionId = form.get('actionId');

  if (actionId === actionIds.logout) {
    const session = await getSession(request);

    session.signOut();
    const searchParams = new URLSearchParams({
      message: await t('See you again soon')
    });

    return redirect(`/?${searchParams.toString()}`, {
      headers: await session.getHeaders()
    });
  }

  function getFirstNameError(firstName: string | null) {
    if (!firstName?.length) {
      return t('Required Name');
    }
    return null;
  }

  return await handleFormSubmission<ActionData>({
    form,
    validators: { name: getFirstNameError },
    handleFormValues: async ({ name }) => {
      if (name && user.name !== name) {
        await updateUser(user.id, name);
      }
      const searchParams = new URLSearchParams({
        message: await t('Profile Saved Successfully')
      });

      return redirect(`/me?${searchParams.toString()}`);
    }
  });
};

export default function Me() {
  const { user } = useRootData();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('me');

  return (
    <Main className="w-5/6 m-auto md:w-112">
      <H2>{t("Here's your profile")}</H2>
      <H4 variant="secondary" as="p">
        {t('Edit as you wish')}
      </H4>
      <InputError id="general-error">
        {actionData?.errors.generalError}
      </InputError>

      <div className="col-span-full mt-8 lg:col-span-5 lg:mb-0">
        <Form method="post" className="w-full md:w-96">
          <ProfileFragment
            labelName={t('Name')}
            labelEmail={t('Email')}
            profile={{ name: user?.name, email: user?.email || '' }}
            error={actionData?.errors.name}
          />
          <Button className="mt-8" type="submit" form="profile-form">
            {t('Update Profile')}
          </Button>
        </Form>
      </div>
      <Spacer size="xs" className="border-b mb-8" />
      <Form method="post">
        <input type="hidden" name="actionId" value={actionIds.logout} />
        <Button variant="secondary">
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          <H6 as="span">{t('Logout')}</H6>
        </Button>
      </Form>
    </Main>
  );
}
