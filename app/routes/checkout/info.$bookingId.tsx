import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  CheckoutStatus,
  DiscountCodeStatus,
  ParticipantStatus,
  RaceParticipantStatus
} from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';
import type { Race, Participant, ShirtSize, EventTeam } from '@prisma/client';

import { CheckoutInfoActions } from '~/action.keys';
import BookingLoginCTADialog from '~/components/BookingLoginCTADialog';

import type { FormErrors } from '~/components/shared/ParticipantForm';
import ParticipantForm from '~/components/shared/ParticipantForm';
import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import DisplayCart from '~/components/shared/DisplayCart';

import DisplayDate from '~/components/shared/DIsplayDate';
import Main from '~/components/shared/Main';
import { Notification } from '~/components/shared/NotificationMessage';
import { H2, H4, H5, H6 } from '~/components/shared/typography';

import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import {
  applyDiscountCode,
  findBooking,
  findBookingCart,
  checkIfBookingEditionIsLocked,
  removeBooking,
  removeBookingDiscount,
  updateBookingStatus
} from '~/server/db/booking.server';
import type { EventWithRacesDifficultiesAndDocuments } from '~/server/db/events.server';
import { findEventWithRacesAndDocuments } from '~/server/db/events.server';
import type {
  RaceParticipantWithRaceAndParticipant,
  RaceParticipantWithRaceParticipantAndTeam
} from '~/server/db/participant.server';
import {
  findRaceParticipant,
  findUserBookingParticipants,
  findUserParticipants,
  findUserSavedParticipants,
  updateParticipant,
  updateRaceParticipantTeam,
  updateToSelectedParticipant
} from '~/server/db/participant.server';
import { findShirtSizes } from '~/server/db/reference.server';
import i18n from '~/server/i18n.server';

import type { UICartRow } from '~/types';
import {
  badRequest,
  displayTimeOfDay,
  formHelperReadDate,
  validateIdentityCard,
  validatePtVatNumber
} from '~/utils/misc';
import { Unauthorized } from '~/server/utils/misc';
import InputError from '~/components/shared/form/InputError';
import { findOrganizer } from '~/server/db/organizer.server';
import { addEmailToMailingList } from '~/server/db/mailingList.server';
import { findEventTeams } from '~/server/db/teams.server';
import { findDiscountCode } from '~/server/db/discounts.server';
import { FetcherForm } from '~/components/shared/form/UploadForm';

import Config from '~/server/config.server';

type LoaderData = {
  event: EventWithRacesDifficultiesAndDocuments;
  cart: UICartRow[];
  raceParticipants: RaceParticipantWithRaceParticipantAndTeam[];
  userParticipants: Participant[];
  savedParticipants: Participant[] | null;
  shirtSizes: ShirtSize[];
  isAuth: boolean;
  bookingId: string;
  isBookingReadOnly: boolean;
  triggerLogin: boolean;
  organizerName: string;
  eventTeams: EventTeam[];
  discountCode?: string;
  discountValue?: number;
  discountFixed?: boolean;
};

export const handle: { id: string; i18n: string[] } = {
  id: 'participant-form',
  i18n: ['checkout']
};

function errorMessage(code: string) {
  const mapping: { [key: string]: string } = {
    P2002: 'Existing Race Participant',
    P2003: 'Participant does not exist',
    P2025: 'Participant does not exist'
  };

  return mapping[code] ?? 'Unknown error';
}

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authedUser = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBooking(bookingId);

  if (!booking || booking.status === CheckoutStatus.deleted) {
    return redirect('/');
  }
  const eventId = booking.eventId;
  const event = await findEventWithRacesAndDocuments(eventId);

  if (!event) {
    return redirect('/');
  }

  const userId =
    authedUser !== null
      ? authedUser.id
      : anonymousClient.getClientId();

  if (booking.userId !== userId) {
    throw Unauthorized(t('Not authorized'));
  }

  if (booking && booking.status === CheckoutStatus.confirmed) {
    if (booking.userId === userId) {
      return redirect(`/checkout/confirmation/${booking.id}`);
    }

    return redirect('/');
  }

  const actionId = form.get('actionId');
  const hash = form.get('hash') as string;
  const regulation: boolean = (form.get('regulation') as string) === 'on';
  const terms: boolean = (form.get('terms') as string) === 'on';
  const enrollInMailingList: boolean =
    (form.get('add-to-mail-list') as string) === 'on';
  const teamName = (form.get('creatable-team') as string) || null;

  try {
    if (actionId === 'apply-discount') {
      const discountCode = form.get('discount-code') as string;
      const organizer = await findOrganizer(event.createdById);
      const dbDiscountCode = await findDiscountCode(
        discountCode,
        organizer?.id as string
      );

      if (
        !dbDiscountCode ||
        dbDiscountCode.status !== DiscountCodeStatus.active
      ) {
        return badRequest({ errors: { discountError: t('No Discount Code') } });
      }
      const cart = await findBookingCart(bookingId);

      await applyDiscountCode(
        booking.id,
        dbDiscountCode.code,
        dbDiscountCode.value,
        dbDiscountCode.fixed,
        cart
      );

      return json({ ok: true });
    }

    if (actionId === 'remove-discount') {
      await removeBookingDiscount(booking.id);

      return json({ ok: true });
    }

    const birthDate = formHelperReadDate(form, 'birthdate');

    const data = {
      id: form.get('participant-id') as string,
      firstName: form.get('first-name') as string,
      lastName: form.get('last-name') as string,
      gender: form.get('gender') as string,
      birthdate: birthDate,
      phone: form.get('phone-number') as string,
      identityCard: (form.get('identity-card') as string) || '',
      vatNumber: (form.get('vat-number') as string) || '',
      federationNumber: Number(form.get('federation-number') as string) || null,
      nationality: Number(form.get('nationality') as string) || null,
      postalCode: form.get('postal-code') as string
    };

    const PT_NATIONALITY_ID = 188;

    const ParticipantSchema = z
      .object({
        firstName: z
          .string({ required_error: t('Field Required') })
          .min(2, { message: t('Min 2 Chars') }),
        lastName: z
          .string({ required_error: t('Field Required') })
          .min(2, { message: t('Min 2 Chars') }),
        gender: z
          .string({ required_error: t('Field Required') })
          .min(1, { message: t('Field Required') }),
        birthdate: z
          .date({
            required_error: t('Field Required'),
            invalid_type_error: t('Invalid Date Format')
          })
          .max(new Date(), t('Date Must Be In The Past')),
        identityCard: z
          .string()
          .optional()
          .refine(
            // require identity card for portuguese citizens
            (idCard) =>
              (Number(data.nationality) === PT_NATIONALITY_ID &&
                Boolean(idCard)) ||
              Number(data.nationality) !== PT_NATIONALITY_ID,
            t('Field Required')
          ).refine(
            // validate identity card for portuguese citizens
            (idCard) =>
              Number(data.nationality) !== PT_NATIONALITY_ID
                ? true
                : !idCard || validateIdentityCard(idCard),
            t('Invalid CC')
          ),
        federationNumber: z.number().nullable(),
        vatNumber: z
          .string()
          .optional()
          .refine(
            // require VAT number for portuguese citizens
            (vatNumber) =>
              (Number(data.nationality) === PT_NATIONALITY_ID &&
                Boolean(vatNumber)) ||
              Number(data.nationality) !== PT_NATIONALITY_ID,
            t('Field Required')
          )
          .refine(
            // validate VAT number for portuguese citizens
            (vatNumber) =>
              Number(data.nationality) !== PT_NATIONALITY_ID
                ? true
                : !vatNumber || validatePtVatNumber(vatNumber),
            t('Invalid VAT')
          ),
        nationality: z.number({
          required_error: t('Field Required'),
          invalid_type_error: t('Field Required')
        }),
        phone: z
          .string({
            required_error: t('Field Required'),
            invalid_type_error: t('Field Required')
          })
          .refine(
            (val) =>
              (Number(data.nationality) === PT_NATIONALITY_ID &&
                val.toString().length === 9) ||
              Number(data.nationality) !== PT_NATIONALITY_ID,
            t('9 Digits')
          )
          .refine(
            // require proper phone number for portuguese citizens
            (number) =>
              (Number(data.nationality) === PT_NATIONALITY_ID &&
                (number.toString().startsWith('91') ||
                  number.toString().startsWith('92') ||
                  number.toString().startsWith('93') ||
                  number.toString().startsWith('96'))) ||
              Number(data.nationality) !== PT_NATIONALITY_ID,
            t('Invalid number')
          ),
        postalCode: z.string().optional()
      })
      .refine(
        // Foreign citizens must still fill either identity card or vat number
        ({ identityCard, vatNumber, nationality }) =>
          Number(nationality) === PT_NATIONALITY_ID
            ? true
            : Boolean(identityCard) || Boolean(vatNumber),
        {
          message: t('VAT or National Citizen Card required'),
          path: ['submit']
        }
      )
      .refine(
        // require identity card for portuguese citizens
        ({ identityCard, nationality }) =>
          (Number(nationality) === PT_NATIONALITY_ID && !!identityCard) ||
          Number(nationality) !== PT_NATIONALITY_ID,
        {
          message: t('Field Required'),
          path: ['identityCard']
        }
      )
      .refine(
        // require VAT number for portuguese citizens
        ({ vatNumber, nationality }) =>
          (Number(nationality) === PT_NATIONALITY_ID && !!vatNumber) ||
          Number(nationality) !== PT_NATIONALITY_ID,
        {
          message: t('Field Required'),
          path: ['vatNumber']
        }
      );

    const TermsAndRegulationSchema = z.object({
      terms: z
        .boolean({ required_error: t('Accept Dici Terms') })
        .refine((v) => v, { message: t('Accept Dici Terms') }),
      regulation: z
        .boolean({ required_error: t('Accept Event Regulation') })
        .refine((v) => v, { message: t('Accept Event Regulation') })
    });

    if (actionId === CheckoutInfoActions.updateAndSave) {
      const selectedParticipantId = form.get(
        'selected-participant-id'
      ) as string;
      const raceId = form.get('raceId') as string;

      try {
        await updateToSelectedParticipant(
          data.id as string,
          selectedParticipantId,
          raceId,
          bookingId
        );
        data.id = selectedParticipantId;
      } catch (e) {
        console.error(e);

        return badRequest({
          // TS1196: Catch clause variable type annotation must be 'any' or 'unknown' if specified.
          //@ts-ignore
          errors: { submit: t(errorMessage(e.code)) },
          hash: parseInt(hash)
        });
      }
    }

    // Also save user on checkout, so that if user checks out before saving participant
    // It won't return an error
    if (
      actionId === CheckoutInfoActions.update ||
      actionId === CheckoutInfoActions.checkout ||
      actionId === CheckoutInfoActions.updateAndSave
    ) {
      ParticipantSchema.parse(data);

      await updateParticipant(data);
      const raceId = form.get('raceId') as string;

      const raceParticipant = await findRaceParticipant(
        data.id as string,
        raceId,
        bookingId
      );

      if (
        !raceParticipant ||
        raceParticipant.status === RaceParticipantStatus.deleted
      ) {
        return badRequest({
          errors: {
            selectedParticipant: t('Race Participant does not exist')
          },
          hash: parseInt(hash)
        });
      }

      await updateRaceParticipantTeam(teamName, eventId, raceParticipant);
      const raceParticipants = await findUserBookingParticipants(bookingId);

      if (
        (actionId === CheckoutInfoActions.update ||
          actionId === CheckoutInfoActions.updateAndSave) &&
        raceParticipants?.length !== 1
      ) {
        return json({ ok: true, action: actionId, raceParticipant });
      }
    }

    const raceParticipants = await findUserBookingParticipants(bookingId);

    // if user is booking for himself (aka, registering a single participant in a single race,
    // try checkout automatically)
    if (
      actionId === CheckoutInfoActions.checkout ||
      raceParticipants?.length === 1
    ) {
      TermsAndRegulationSchema.parse({ regulation, terms });
      const raceParticipants = await findUserBookingParticipants(bookingId);

      if (!raceParticipants) {
        return badRequest({ error: t('No Race Participants') });
      }

      // Draft participants are empty; Save participants are validated ensuring all required is filed in
      // Testing for firstName === null finds participants that haven't yet been saved successfully
      const draftParticipants = raceParticipants.filter(
        (rp) => rp.participant.status !== ParticipantStatus.saved
      );

      if (draftParticipants.length) {
        return badRequest({
          errors: {
            missingFilledParticipants: t('Participant Not Filled')
          },
          hash: parseInt(hash),
          missingParticipants: JSON.stringify(draftParticipants)
        });
      }

      if (enrollInMailingList && authedUser) {
        const organizer = await findOrganizer(event.createdById);

        if (organizer) {
          try {
            await addEmailToMailingList(
              authedUser.email,
              organizer.id
            );
          } catch (e) {
            console.log(
              `failed to add ${authedUser.email} to mailing list of ${organizer.name}`,
              e
            );
          }
        }
      }

      await updateBookingStatus(bookingId, CheckoutStatus.pending);

      return redirect(`/checkout/payment/${bookingId}`);
    }

    return json({ ok: true, action: actionId });
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

    await fetch(Config().SLACK_ERRORS_WEBHOOK_URL, {
      method: 'POST',
      body: JSON.stringify({
        text: `Participant form validation (\`booking = ${bookingId}\`): \`\`\`${JSON.stringify(
          errors
        )}\`\`\``
      })
    });
    return badRequest({ errors, hash: parseInt(hash) });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authedUser = await getUser(request);
  const bookingId = params.bookingId as string;
  const lng = await i18n.getLocale(request);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const userId =
    authedUser !== null
      ? authedUser.id
      : anonymousClient.getClientId();

  const booking = await findBooking(bookingId);

  if (!booking || booking?.status === CheckoutStatus.deleted) {
    console.log('no booking or deleted booking', bookingId);
    return redirect('/');
  }

  if (booking.userId !== userId) {
    console.log(`User not authorized to access booking with owner = ${booking.userId}; Attempt by ${userId}`);
    return redirect('/');
  }

  const eventId = booking.eventId;
  const event = await findEventWithRacesAndDocuments(eventId);

  if (!event) {
    console.log('no event', eventId);
    return redirect('/');
  }

  const cart = await findBookingCart(bookingId);
  const organizer = await findOrganizer(event.createdById);
  const raceParticipants = await findUserBookingParticipants(bookingId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    // If, for some reason, there are no race participants, we shouldn't keep this booking
    await removeBooking(bookingId);

    return redirect(`/${lng}/event/${event.slug}`);
  }

  //EVAL: implicitely giving visibility over user stored data to visitor which may have accessed with a PIN - very weak security 
  const userParticipants = await findUserParticipants(booking.userId);
  const savedParticipants = await findUserSavedParticipants(booking.userId);
  const shirtSizes = await findShirtSizes();

  const eventTeams = await findEventTeams(eventId);

  return json({
    event,
    cart,
    raceParticipants,
    userParticipants,
    savedParticipants:
      savedParticipants?.length !== 0 ? savedParticipants : null,
    shirtSizes,
    isAuth: Boolean(authedUser),
    bookingId,
    isBookingReadOnly: checkIfBookingEditionIsLocked(booking),
    triggerLogin: !authedUser,
    organizerName: organizer?.name as string,
    eventTeams,
    discountCode: booking.discountCode,
    discountValue: booking.discountValue,
    discountFixed: booking.discountFixed
  });
};

export default function CheckoutInfoRoute() {
  const fetcher = useFetcher();
  const { t, i18n } = useTranslation('checkout');
  const {
    event,
    cart,
    raceParticipants,
    userParticipants,
    savedParticipants,
    isAuth,
    bookingId,
    isBookingReadOnly,
    triggerLogin,
    organizerName,
    eventTeams,
    discountCode,
    discountValue,
    discountFixed
  } = useLoaderData<LoaderData>() as unknown as LoaderData;
  const [raceParticipant, setRaceParticipant] = useState<{
    id: string;
    participant: Participant;
    team: string | null;
    raceId: string;
  }>({
    id: raceParticipants[0].id,
    participant: raceParticipants[0].participant,
    team: raceParticipants[0].team?.name ? raceParticipants[0].team.name : null,
    raceId: raceParticipants[0].raceId
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hash, setHash] = useState<number>(Date.now());
  const [message, setMessage] = useState<string>('');
  let showNotification: any = null;
  const [showAddRacesDialog, setShowAddRacesDialog] = useState<boolean>(false);
  const [isReset, setIsReset] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(
      savedParticipants?.length === 1 ? savedParticipants[0] : null
    );
  const [missingParticipants, setMissingParticipants] = useState<
    RaceParticipantWithRaceAndParticipant[]
  >([]);
  const [checkedTermsAndRegulation, setCheckedTermsAndRegulation] = useState<{
    terms: boolean;
    regulation: boolean;
  }>({ terms: false, regulation: false });
  const [checkedAddToMailingList, setCheckedAddToMailingList] = useState(false);
  const initialVisitedParticipants = raceParticipants
    .filter((p) => p.participant.status === 'saved')
    .map((p) => p.participant);
  const isFirstParticipantVisited = initialVisitedParticipants.some(
    (p) => p.id === raceParticipants[0].participantId
  );
  const isInlineRegulation = event.regulationContent && true;

  if (!isFirstParticipantVisited) {
    initialVisitedParticipants.push(raceParticipants[0].participant);
  }

  const [visitedParticipants, setVisitedParticipants] = useState<Participant[]>(
    initialVisitedParticipants
  );

  const resetForm = useCallback(() => {
    setErrors({});
    setHash(Date.now());
  }, []);

  const reset = useCallback(
    (raceParticipant?: RaceParticipantWithRaceParticipantAndTeam) => {
      setHash(Date.now());

      if (raceParticipant) {
        setRaceParticipant({
          id: raceParticipant.id,
          participant: raceParticipant.participant,
          raceId: raceParticipant.raceId,
          team: raceParticipant.team?.name ? raceParticipant.team.name : null
        });
      }

      setErrors({});
      setSelectedParticipant(
        savedParticipants?.length === 1 ? savedParticipants[0] : null
      );
      setMissingParticipants([]);
    },
    [savedParticipants]
  );

  function handleSetParticipant(e: React.MouseEvent) {
    const [, raceId, raceParticipantId] = e.currentTarget.id.split('|');
    const index = raceParticipants.findIndex(
      (rp) => rp.id === raceParticipantId
    );
    const newRaceParticipant = raceParticipants[index];
    const isVisited = visitedParticipants.some(
      (v) => v.id === newRaceParticipant.participantId
    );

    setRaceParticipant({
      id: raceParticipantId,
      participant: newRaceParticipant.participant,
      raceId,
      team: null
    });
    handleSetParticipantTeam(raceParticipantId);
    setErrors({});
    setHash(Date.now());
    setSelectedParticipant(null);

    if (!isVisited) {
      setVisitedParticipants((p) => [...p, newRaceParticipant.participant]);
    }
  }

  function handleSetParticipantTeam(raceParticipantId: string) {
    const index = raceParticipants.findIndex(
      (rp) => rp.id === raceParticipantId
    );
    const rParticipant = raceParticipants[index];

    setRaceParticipant((p) => {
      return {
        ...p,
        team: rParticipant.team ? (rParticipant.team.name as string) : null
      };
    });
  }

  function handlerSetShowNotificationFunction(callback: () => void) {
    showNotification = callback;
  }

  function handleRemoveRaceParticipant() {
    fetcher.submit(
      {
        actionId: CheckoutInfoActions.removeParticipant,
        participantId: raceParticipant.participant.id,
        raceId: raceParticipant.raceId
      },
      {
        method: 'post',
        action: `/checkout/manage/${bookingId}`
      }
    );
  }

  function handleOpenAddRaces() {
    setShowAddRacesDialog(true);
    setIsReset(false);
  }

  function handleCloseAddRaces() {
    setShowAddRacesDialog(false);
    setIsReset(true);
  }

  function handleSetSelectedParticipant(v: string | number) {
    const participant: Participant =
      userParticipants[
        userParticipants.findIndex((p: Participant) => p.id === v)
      ];

    setHash(Date.now());
    setSelectedParticipant(participant);
  }

  function handleCheckRegulation() {
    setCheckedTermsAndRegulation({
      regulation: !checkedTermsAndRegulation.regulation,
      terms: checkedTermsAndRegulation.terms
    });
  }

  function handleCheckTerms() {
    setCheckedTermsAndRegulation({
      regulation: checkedTermsAndRegulation.regulation,
      terms: !checkedTermsAndRegulation.terms
    });
  }

  function handleCheckAddToMailingList() {
    setCheckedAddToMailingList(!checkedAddToMailingList);
  }

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === CheckoutInfoActions.removeParticipant &&
      fetcher.data.raceParticipant
    ) {
      setMessage(t('Participant Removed'));
      showNotification();

      return reset(fetcher.data.raceParticipant);
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === CheckoutInfoActions.update &&
      fetcher.data.raceParticipant
    ) {
      setMessage(t('Participant Saved'));
      showNotification();

      return reset(fetcher.data.raceParticipant);
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === CheckoutInfoActions.updateAndSave
    ) {
      setMessage(t('Participant Saved and Updated'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash &&
      fetcher.data?.missingParticipants
    ) {
      setMissingParticipants(JSON.parse(fetcher.data.missingParticipants));

      return setErrors(fetcher.data.errors as FormErrors);
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [reset, resetForm, fetcher, t, showNotification, hash, errors, setErrors]);


  return (
    <Main>
      <div data-cy="login" data-show-login={triggerLogin}>
        {triggerLogin && <BookingLoginCTADialog bookingId={bookingId} t={t} />}
      </div>
      <div className="flex flex-col justify-start space-y-1 mb-8">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt || 0)} />
        </H6>
        <H6>{event.placeName}</H6>
      </div>

      {raceParticipants.length > 1 && (
        <div className="w-full mb-8 flex flex-row scroll-mx-2 items-center items-start flex-nowrap overflow-x-auto snap-x">
          {raceParticipants
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((p, index) => (
              <div className="flex flex-col items-center mt-4" key={p.id}>
                <div
                  className={clsx(
                    'flex flex-col gap-y-2 border-2 border-b p-2 mx-2 items-center w-[200px] snap-center cursor-pointer relative',

                    {
                      'opacity-100':
                        p.participantId === raceParticipant.participant.id &&
                        p.race.id === raceParticipant.raceId,
                      'opacity-50': !(
                        p.participantId === raceParticipant.participant.id &&
                        p.race.id === raceParticipant.raceId
                      ),
                      'border-blaze-orange-500': missingParticipants.some(
                        (v) => v.participantId === p.participantId
                      ),
                      'border-gray-500': !missingParticipants.some(
                        (v) => v.participantId === p.participantId
                      )
                    }
                  )}
                  id={`${p.participantId}|${p.race.id}|${p.id}`}
                  onClick={handleSetParticipant}
                  data-cy={`participant-${index + 1}`}
                >
                  {!visitedParticipants.some(
                    (v) => v.id === p.participantId
                  ) && (
                    <span className="flex absolute h-4 w-4 top-0 right-0 -mt-[0.3rem] -mr-[0.7rem]">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blaze-orange-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blaze-orange-500"></span>
                    </span>
                  )}

                  {!isBookingReadOnly &&
                    p.participantId === raceParticipant.participant.id &&
                    p.race.id === raceParticipant.raceId && (
                      <button
                        type="button"
                        onClick={handleRemoveRaceParticipant}
                        name="remove"
                        className="absolute top-[6px] right-[6px]"
                        data-cy={`remove-participant-${index + 1}`}
                      >
                        <XMarkIcon className="dark:text-blueGray-500 md:h-6 w-6 m-0 inline-block" />
                      </button>
                    )}
                  <H5 data-cy="participant">{p.race.name}</H5>
                  <H6
                    className="dark:text-blueGray-500"
                    data-cy={`participant-name-${index + 1}`}
                  >
                    {p.participant.firstName
                      ? p.participant.firstName
                      : t('Participant') + ' ' + (index + 1)}
                  </H6>
                </div>
              </div>
            ))}
          {!isBookingReadOnly && (
            <div className="flex flex-col items-center snap-center mt-4">
              <div
                className="flex flex-col gap-y-2 border-2 border-b border-gray-500 p-2 mx-2 items-center w-[200px]"
                onClick={handleOpenAddRaces}
              >
                <PlusIcon className="h-7 w-7 dark:text-blueGray-500" />
                <H6 className="dark:text-blueGray-500">{t('Add Race')}</H6>
              </div>
            </div>
          )}
        </div>
      )}

      <FetcherForm
        form={fetcher.Form}
        method="post"
        className={clsx('w-full', {
          'opacity-100': raceParticipant,
          'opacity-50': !raceParticipant
        })}
        key={hash}
        readOnly={isBookingReadOnly}
      >
        <div className="flex flex-col lg:flex-row">
          <div className="flex-col w-full lg:pr-8 xl:w-[calc(100%-(480px))] xl:pr-48">
            <ParticipantForm
              participant={raceParticipant.participant}
              hash={hash}
              errors={errors}
              userSavedParticipants={savedParticipants}
              raceId={raceParticipant.raceId}
              selectedParticipant={selectedParticipant}
              setSelectedParticipant={handleSetSelectedParticipant}
              resetForm={resetForm}
              isUserBookingOnlyForHimself={raceParticipants.length === 1}
              isReadOnly={isBookingReadOnly}
              eventTeams={eventTeams}
              participantTeam={raceParticipant.team}
            >
              {!isBookingReadOnly && (
                <>
                  <div className="flex items-center mb-2">
                    <input
                      name="regulation"
                      type="checkbox"
                      defaultChecked={checkedTermsAndRegulation.regulation}
                      onClick={handleCheckRegulation}
                      className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      data-cy="regulation"
                    />
                    <label
                      className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                      htmlFor="regulation"
                    >
                      {t('Read and Accepted')}
                      <Link
                        target="_blank"
                        to={
                          isInlineRegulation
                            ? `/${i18n.language}/event/${event.slug}/regulation`
                            : `/${i18n.language}/event/${event.id}/regulation/view`
                        }
                        data-cy="regulation-link"
                      >
                        {t('Event Regulation')}
                      </Link>
                    </label>
                  </div>

                  <div
                    className={clsx('flex items-center', {
                      'mb-2': isAuth,
                      'mb-8': !isAuth
                    })}
                  >
                    <input
                      name="terms"
                      type="checkbox"
                      defaultChecked={checkedTermsAndRegulation.terms}
                      onClick={handleCheckTerms}
                      className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      data-cy="terms"
                    />
                    <label
                      className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                      htmlFor="terms"
                    >
                      {t('Read and Accepted')}
                      <Link target="_blank" to="/terms" data-cy="terms-link">
                        {t('Terms and Conditions')}
                      </Link>
                    </label>
                  </div>

                  {isAuth && (
                    <div className="flex items-center mb-8">
                      <input
                        name="add-to-mail-list"
                        type="checkbox"
                        defaultChecked={checkedAddToMailingList}
                        onClick={handleCheckAddToMailingList}
                        className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        data-cy="mail-list"
                      />
                      <label
                        className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                        htmlFor="add-to-mail-list"
                      >
                        {t('Add to X Mailing List', {
                          organizer: organizerName
                        })}
                      </label>
                    </div>
                  )}

                  <InputError
                    id="form-submission-error"
                    className="mb-8"
                    size="lg"
                  >
                    {errors?.submit || errors?.terms || errors?.regulation}
                  </InputError>
                </>
              )}
            </ParticipantForm>
            <Notification show={handlerSetShowNotificationFunction}>
              {message}
            </Notification>
          </div>
          <div className="w-full mt-8 lg:w-[370px] xl:w-[480px] lg:mt-0">
            <DisplayCart
              cart={cart}
              event={event}
              error={
                errors.missingFilledParticipants ||
                errors?.submit ||
                errors?.terms ||
                errors?.regulation
              }
              showDiscountCodeInput={!isBookingReadOnly}
              discountCode={discountCode}
              discountValue={discountValue}
              discountFixed={discountFixed}
            >
              {!isBookingReadOnly && (
                <>
                  <div className="flex flex-col items-center w-full">
                    <Button
                      type="submit"
                      name="actionId"
                      value="checkout"
                      disabled={cart.length === 0}
                      className="mt-4 w-full"
                      id="checkout"
                    >
                      {t('Finish Registration')}
                    </Button>
                  </div>
                  <div className="flex justify-end mt-4">
                    <a
                      href={`/checkout/cart/${bookingId}`}
                      data-cy="update-cart"
                      className="font-medium underline text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {t('Update Cart')}
                    </a>
                  </div>
                </>
              )}
            </DisplayCart>
          </div>
        </div>
        <input
          type="hidden"
          name="regulation"
          value={checkedTermsAndRegulation.regulation ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="terms"
          value={checkedTermsAndRegulation.terms ? 'on' : 'off'}
        />
        <input
          type="hidden"
          name="add-to-mail-list"
          value={checkedAddToMailingList ? 'on' : 'off'}
        />
        <input type="hidden" name="hash" value={hash} />
      </FetcherForm>
      <AddRacesDialog
        isOpen={showAddRacesDialog}
        triggerModalClose={handleCloseAddRaces}
        eventRaces={event.races}
        reset={isReset}
        bookingId={bookingId}
      />
    </Main>
  );
}

function AddRacesDialog({
  isOpen,
  triggerModalClose,
  eventRaces,
  bookingId,
  reset
}: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventRaces: Race[];
  bookingId: string;
  reset: boolean;
}) {
  const fetcher = useFetcher();
  const { t } = useTranslation('checkout');
  const [addedRaces, setAddedRaces] = useState<string[]>([]);

  const close = useCallback(() => {
    setAddedRaces([]);
    triggerModalClose();
  }, [triggerModalClose]);

  function handleAddRace(raceId: string) {
    setAddedRaces((p) => [...p, raceId]);
  }

  function handleRemoveRace(raceId: string) {
    const newArray = [...addedRaces];
    const index = addedRaces.indexOf(raceId);

    if (index !== -1) {
      newArray.splice(index, 1);
      setAddedRaces(newArray);
    }
  }

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data?.action === CheckoutInfoActions.addParticipants
    ) {
      return close;
    }
  });

  return (
    <fetcher.Form method="post" action={`/checkout/manage/${bookingId}`}>
      <div
        data-reach-dialog-overlay={true}
        className={clsx({
          'hidden ': !isOpen,
          'z-50 flex h-screen': isOpen
        })}
      >
        <div
          aria-modal={true}
          aria-label={t('Add Race Modal')}
          className={clsx(
            'lg:w-[500px] w-full',
            'bg-white dark:bg-gray-900 font-extrabold',
            'lg:border-2 lg:border-black dark:lg:border-white lg:rounded-lg p-8',
            {
              'hidden ': !isOpen,
              'm-auto': isOpen
            }
          )}
        >
          {eventRaces
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((r) => (
              <DisplayRace
                race={r}
                key={r.id}
                addRace={handleAddRace}
                removeRace={handleRemoveRace}
                reset={reset}
              />
            ))}
          <ButtonGroup className="flex justify-end mt-4">
            <Button type="button" variant="secondary" onClick={close}>
              {t('Discard')}
            </Button>
            <Button
              type="submit"
              name="actionId"
              value={CheckoutInfoActions.addParticipants}
            >
              {t('Add')}
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <input type="hidden" name="races" value={JSON.stringify(addedRaces)} />
    </fetcher.Form>
  );
}

function DisplayRace({
  race,
  addRace,
  removeRace,
  reset
}: {
  race: Race;
  addRace: (raceId: string) => void;
  removeRace: (raceId: string) => void;
  reset: boolean;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);
  const [raceQty, setRaceQty] = useState<number>(0);

  function handleAddRace() {
    setRaceQty((c) => c + 1);
    addRace(race.id);
  }

  function handleRemoveRace() {
    if (raceQty !== 0) {
      setRaceQty((c) => c - 1);
      removeRace(race.id);
    }
  }

  useEffect(() => {
    if (reset) {
      setRaceQty(0);
    }
  }, [reset]);

  return (
    <div className="flex flex-col mt-8 w-full">
      <div className="flex flex-row items-center justify-between">
        <H4>{race.name}</H4>
        <H5>{race.price / 1000}€</H5>
      </div>
      <div className="flex flex-row mt-2 justify-between items-center">
        <div className="flex flex-row">
          <div>
            <H6 className="dark:text-blueGray-500">{t('Distance')}</H6>
            <H5>{race.distance}km</H5>
          </div>

          <div className="ml-8">
            <H6 className="dark:text-blueGray-500">{t('Hour')}</H6>
            <H5>{raceTime}</H5>
          </div>
        </div>

        <div className="flex flex-row items-center dark:text-blueGray-500 w-[80px] justify-between">
          <button
            type="button"
            className="w-[24px] h-[24px]"
            onClick={handleRemoveRace}
          >
            <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>

          <H6 className="dark:text-blueGray-500">{raceQty}</H6>
          <button
            type="button"
            className="w-[24px] h-[24px]"
            onClick={handleAddRace}
          >
            <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>
        </div>
      </div>
    </div>
  );
}
