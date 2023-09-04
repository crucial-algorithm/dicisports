import * as React from 'react';
import { useEffect, useRef } from 'react';
import type {
  ActionFunction,
  LoaderFunction,
  UploadHandler
} from '@remix-run/node';
import {
  json,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from '@remix-run/node';
import { Toast } from 'primereact/toast';

import { useActionData, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import Main from '~/components/shared/Main';
import { getUser, requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import { badRequest, getDomainUrl } from '~/utils/misc';
import {
  createOrganizer,
  findOrganizer,
  updateOrganizer
} from '~/server/db/organizer.server';
import type { Organizer, OrganizerInput, OrganizerType, ResponseFeedback } from '~/types';
import { H2, H4, Paragraph } from '~/components/shared/typography';
import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import Id from '~/server/utils/Id.server';
import {
  sendSubmittedOrganizerProfileConfirmation,
  sendSubmittedOrganizerProfileNotification
} from '~/server/email.server';
import OrganizerForm from '~/components/shared/OrganizerForm';
import Config from '~/server/config.server';
import { findOrganizerTypes } from '~/server/db/reference.server';

type ActionData = {
  feedback?: ResponseFeedback;
  errors?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    logo?: string;
    description?: string;
    terms?: string;
  };
};

type LoaderData = {
  organizer: Organizer;
  organizerTypes: OrganizerType[];
};

export const handle = {
  i18n: ['organizer-form']
};

function processImageField(
  value: string | null | File,
  isUpdate: boolean,
  organizer: Organizer | null
) {
  if ((isUpdate && !value) || value instanceof File) {
    return organizer ? organizer.logo : '';
  }

  return value || '';
}

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'organizer-form');

  const user = await getUser(request);
  const organizer = await findOrganizer(user?.id as string);
  const isUpdate: boolean = !!organizer;

  const organizerId = organizer ? organizer.id : Id();

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (!name.startsWith('/file/image') || !filename) {
        return undefined;
      }

      const uploadedImage = await uploadImageToCloudinary(
        data,
        organizerId || null
      );

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const logo = form.get('/file/image/0');
  const terms: boolean = (form.get('terms') as string) === 'on';

  const data: OrganizerInput = {
    id: organizerId,
    name: form.get('name') as string,
    email: form.get('email') as string,
    logo: processImageField(logo, isUpdate, organizer),
    phoneNumber:
      (form.get('phone-number') as string).length > 0
        ? Number(form.get('phone-number'))
        : null,
    taxNumber: Number(form.get('tax-number')),
    contactName: form.get('contact-name') as string,
    typeId: Number(form.get('type')),
    address: form.get('address') as string,
    postalCode: form.get('postal-code') as string,
    city: form.get('city') as string,
    description: form.get('description') as string,
    userId: user?.id as string
  };

  let feedback: ResponseFeedback | undefined;

  const OrganizerSchema = z.object({
    name: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    email: z.string().email({ message: t('Valid E-mail') }),
    logo: z
      .string({
        required_error: t('Field Required'),
        invalid_type_error: t('Field Required')
      })
      .min(1, { message: t('Field Required') }),
    phoneNumber: z
      .number({
        invalid_type_error: t('Field Required')
      })
      .refine((val) => val.toString().length === 9, t('9 Digits'))
      .refine(
        (val) =>
          val.toString().startsWith('91') ||
          val.toString().startsWith('92') ||
          val.toString().startsWith('93') ||
          val.toString().startsWith('96'),
        t('Invalid number')
      )
      .nullable(),
    taxNumber: z
      .number({ required_error: t('Field Required') })
      .refine((val) => val.toString().length === 9, t('9 Digits')),
    contactName: z
        .string({ required_error: t('Field Required') })
        .min(2, { message: t('Min 2 Chars') }),
    typeId: z
      .number({ required_error: t('Field Required') })
      .min(1, t('Invalid Organizer Type'))
      .max(5, t('Invalid Organizer Type')),
    address: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    postalCode: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    city: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    description: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') })
  });

  try {
    OrganizerSchema.parse(data);

    if (isUpdate) {
      await updateOrganizer(data);
      feedback = { severity: 'success', message: t('Organizer Saved') };
    } else {
      z.object({
        terms: z
          .boolean({ required_error: t('Accept Dici Terms') })
          .refine((v) => v, { message: t('Accept Dici Terms') })
      }).parse({ terms });

      const domainUrl = getDomainUrl(request);

      await createOrganizer(data);
      feedback = { severity: 'success', message: t('Organizer Created') };

      await sendSubmittedOrganizerProfileConfirmation({
        emailAddress: data.email,
        organizerName: data.email,
        domainUrl
      });

      const { ORGANIZER_REVIEWERS_EMAILS: organizerReviewersEmails } = Config();

      await sendSubmittedOrganizerProfileNotification({
        emailAddress: organizerReviewersEmails,
        organizerId,
        domainUrl
      });
    }

    return json({ feedback });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors });
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const organizer = await findOrganizer(user.id as string);
  const organizerTypes = await findOrganizerTypes();

  return json({
    organizer,
    organizerTypes: organizerTypes.map((o) => {
      return {   id: o.id, name: o.name };
    })
  });
};

export default function UsRoute() {
  const { t } = useTranslation('organizer-form');
  const { organizer, organizerTypes } =
    useLoaderData<LoaderData>() as LoaderData;
  const actionData = useActionData<ActionData>() as ActionData;

  const feedback = actionData?.feedback;
  const toast = useRef<Toast>(null);

  useEffect(() => {
    const main = window.document.querySelector('#organizer-main-container');

    if (!toast.current) {
      return;
    }

    if (actionData?.errors) {
      toast.current.show({
        severity: 'error',
        detail: t('Remaining Form Errors'),
        life: 3000
      });

      main && main.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!feedback) {
      return;
    }

    toast.current.show({
      severity: feedback.severity,
      detail: feedback.message,
      life: 3000
    });

    main && main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [feedback, actionData, t]);

  if (organizer && organizer.status === 'PENDING') {
    return <PendingOrganizerMessage />;
  }

  return (
    <Main>
      <div className="mb-12 lg:mb-20">
        <Toast ref={toast} />
        <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
          <div>
            <H2>{t('Organizer Profile')}</H2>
            {(!organizer || organizer.status !== 'APPROVED') && (
              <H4 variant="secondary" as="p">
                {t('Organizer Profile - Description')}
              </H4>
            )}
          </div>
        </div>
      </div>
      <OrganizerForm
        organizer={organizer}
        errors={actionData?.errors}
        organizerTypes={organizerTypes}
      />
    </Main>
  );
}

function PendingOrganizerMessage() {
  const { t } = useTranslation('organizer-form');

  return (
    <Main>
      <Paragraph data-cy="pending-validation">
        {t('Pending Validation')}
      </Paragraph>
      <a href="/">{t('Pending Validation Action')}</a>
    </Main>
  );
}
