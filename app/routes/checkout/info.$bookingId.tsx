import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { CheckoutStatus, ParticipantStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { Link, useFetcher, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import { CheckoutInfoActions } from '~/action.keys';

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
  findBookingById,
  findBookingCart,
  updateBookingStatus
} from '~/server/db/booking.server';
import type { EventWithRacesDifficultiesAndDocuments } from '~/server/db/events.server';
import { findEvent } from '~/server/db/events.server';
import {
  findRaceParticipant,
  findUserBookingParticipants,
  findUserEventRaceParticipants,
  findUserParticipants,
  findUserSavedParticipants,
  updateParticipant,
  updateRaceParticipantTeam,
  updateToSelectedParticipant
} from '~/server/db/participant.server';
import { findShirtSizes } from '~/server/db/reference.server';
import i18n from '~/server/i18n.server';

import type {
  EventTeam,
  Participant,
  ParticipantInput,
  Race,
  RaceParticipant,
  ShirtSize,
  UICartRow
} from '~/types';
import { badRequest, displayTimeOfDay } from '~/utils/misc';
import { Unauthorized } from '~/server/utils/misc';
import InputError from '~/components/shared/form/InputError';
import { findEventTeams } from '~/server/db/teams.server';

type LoaderData = {
  event: EventWithRacesDifficultiesAndDocuments;
  cart: UICartRow[];
  raceParticipants: RaceParticipant[];
  userParticipants: Participant[];
  savedParticipants: Participant[] | null;
  shirtSizes: ShirtSize[];
  isAuth: boolean;
  isGuest: boolean;
  bookingId: string;
  eventTeams: EventTeam[];
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  if (booking.userId !== clientId) {
    throw Unauthorized(t('Not authorized'));
  }

  if (booking && booking.status === CheckoutStatus.confirmed) {
    if (booking.userId === clientId) {
      return redirect(`/checkout/confirmation/${booking.id}`);
    }

    return redirect('/');
  }

  const actionId = form.get('actionId');
  const hash = form.get('hash') as string;
  const regulation: boolean = (form.get('regulation') as string) === 'on';
  const terms: boolean = (form.get('terms') as string) === 'on';
  const teamName = (form.get('team-name') as string) || null;

  try {
    const phoneNumber = form.get('phone-number') as string;
    const data: ParticipantInput = {
      id: form.get('participant-id') as string,
      firstName: form.get('first-name') as string,
      lastName: form.get('last-name') as string,
      gender: form.get('gender') as string,
      birthdate: new Date(form.get('birthdate') as string),
      phoneNumber: parseInt(phoneNumber),
      identityCard: form.get('identity-card') as string,
      federationNumber:
        parseInt(form.get('federation-number') as string) || null,
      shirtSize: parseInt(form.get('shirt') as string),
      nationality: parseInt(form.get('nationality') as string) || null,
      postalCode: form.get('postal-code') as string
    };

    const ParticipantSchema = z.object({
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
        .date({ required_error: t('Field Required') })
        .max(new Date(), t('Past Date')),
      phoneNumber: z
        .number({
          required_error: t('Field Required'),
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
        ),
      identityCard: z
        .string({ required_error: t('Field Required') })
        .length(8, { message: t('Invalid CC Length') }),
      federationNumber: z.number().nullable(),
      shirtSize: z.number({
        required_error: t('Field Required'),
        invalid_type_error: t('Field Required')
      }),
      nationality: z.number().nullable(),
      postalCode: z
        .string({ required_error: t('Field Required') })
        .min(1, { message: t('Field Required') })
    });

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
          data.id,
          selectedParticipantId,
          raceId
        );
      } catch (e) {
        console.log(e);

        return badRequest({
          errors: { selectedParticipant: t('Existing Race Participant') },
          hash: parseInt(hash)
        });
      }

      data.id = selectedParticipantId;
      ParticipantSchema.parse(data);
      await updateParticipant(data);
      if (teamName !== null && teamName.length > 0) {
        const raceParticipant = await findRaceParticipant(data.id, raceId);

        if (!raceParticipant) {
          return badRequest({
            errors: {
              selectedParticipant: t('Race Participant Doest no Exist')
            },
            hash: parseInt(hash)
          });
        }

        await updateRaceParticipantTeam(teamName, eventId, raceParticipant);
      }
    }

    if (
      actionId === CheckoutInfoActions.update ||
      actionId === CheckoutInfoActions.updateAndCheckout
    ) {
      ParticipantSchema.parse(data);
      await updateParticipant(data);
      const raceId = form.get('raceId') as string;

      if (teamName !== null && teamName.length > 0) {
        const raceParticipant = await findRaceParticipant(data.id, raceId);

        if (!raceParticipant) {
          return badRequest({
            errors: {
              selectedParticipant: t('Race Participant Doest no Exist')
            },
            hash: parseInt(hash)
          });
        }

        await updateRaceParticipantTeam(teamName, eventId, raceParticipant);
      }
    }

    if (
      actionId === CheckoutInfoActions.checkout ||
      actionId === CheckoutInfoActions.updateAndCheckout
    ) {
      TermsAndRegulationSchema.parse({ regulation, terms });
      const raceParticipants = await findUserEventRaceParticipants(
        clientId,
        eventId
      );

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

    return badRequest({ errors, hash: parseInt(hash) });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;
  const { searchParams } = new URL(request.url);

  const pin = searchParams.get('p');

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBookingById(bookingId);
  const isGuest = pin && Number(pin) === booking?.pin;

  if (!booking || (booking.userId !== clientId && !isGuest)) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  const event = await findEvent(eventId);
  const cart = await findBookingCart(
    isGuest ? booking.userId : clientId,
    eventId
  );
  const raceParticipants = await findUserBookingParticipants(bookingId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  // cant use clientId when user is a guest - accesses this route with booking PIN
  // TODO: refactor these functions to use bookingId when we decide to have multiple bookings
  const userParticipants = await findUserParticipants(
    isGuest ? booking.userId : clientId
  );
  const savedParticipants = await findUserSavedParticipants(
    isGuest ? booking.userId : clientId
  );
  const shirtSizes = await findShirtSizes();

  return json({
    event,
    cart,
    raceParticipants,
    userParticipants,
    savedParticipants:
      savedParticipants?.length !== 0 ? savedParticipants : null,
    shirtSizes,
    isAuth: !!authenticatedClient,
    isGuest,
    bookingId,
    eventTeams: await findEventTeams(eventId)
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
    shirtSizes,
    isAuth,
    isGuest,
    bookingId,
    eventTeams
  } = useLoaderData<LoaderData>() as LoaderData;
  const [participantTeam, setParticipantTeam] = useState<string | null>(
    raceParticipants[0].team?.name || null
  );
  const [participant, setParticipant] = useState<Participant | null>(
    raceParticipants[0].participant
  );
  const [selectedRace, setSelectedRace] = useState<string | null>(
    raceParticipants[0].raceId
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [hash, setHash] = useState<number>(Date.now());
  const [message, setMessage] = useState<string>('');
  let showNotification: any = null;
  const [showAddRacesDialog, setShowAddRacesDialog] = useState<boolean>(false);
  const [isReset, setIsReset] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [missingParticipants, setMissingParticipants] = useState<
    RaceParticipant[]
  >([]);
  const [checkedTermsAndRegulation, setCheckedTermsAndRegulation] = useState<{
    terms: boolean;
    regulation: boolean;
  }>({ terms: false, regulation: false });
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

  const reset = useCallback(() => {
    setErrors({});
    setSelectedParticipant(null);
    setMissingParticipants([]);
  }, []);

  function handleSetParticipant(e: React.MouseEvent) {
    const [newParticipant, raceId, raceParticipantId] =
      e.currentTarget.id.split('|');
    const index = userParticipants.findIndex(
      (a: Participant) => a.id === newParticipant
    );
    const participant = userParticipants[index];
    const isVisited = visitedParticipants.some((v) => v.id === participant.id);

    handleSetParticipantTeam(raceParticipantId);

    setParticipant(participant);
    setSelectedRace(raceId);
    setErrors({});
    setHash(Date.now());
    setSelectedParticipant(null);

    if (!isVisited) {
      setVisitedParticipants((p) => [...p, participant]);
    }
  }

  function handleSetParticipantTeam(raceParticipantId: string) {
    const index = raceParticipants.findIndex(
      (rp) => rp.id === raceParticipantId
    );
    const rParticipant = raceParticipants[index];

    if (rParticipant.team !== null) {
      setParticipantTeam(rParticipant.team.name);
    }
  }

  function handlerSetShowNotificationFunction(callback: () => void) {
    showNotification = callback;
  }

  function handleRemoveRaceParticipant() {
    fetcher.submit(
      {
        actionId: CheckoutInfoActions.removeParticipant,
        participantId: participant?.id as string,
        raceId: selectedRace as string
      },
      {
        method: 'post',
        action: '/checkout/manage'
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

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === CheckoutInfoActions.removeParticipant
    ) {
      setMessage(t('Participant Removed'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === CheckoutInfoActions.update
    ) {
      setMessage(t('Participant Saved'));
      showNotification();

      return reset;
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
      <div className="flex flex-col justify-start space-y-1 mb-8">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt || 0)} />
        </H6>
        <H6>{event.location}</H6>
      </div>

      {raceParticipants.length > 1 && (
        <div className="w-full mb-8 flex flex-row scroll-mx-2 items-center items-start flex-nowrap overflow-x-auto snap-x">
          {raceParticipants
            .sort(
              (a: RaceParticipant, b: RaceParticipant) =>
                a.displayOrder - b.displayOrder
            )
            .map((p: RaceParticipant, index: number) => (
              <div className="flex flex-col items-center mt-4" key={p.id}>
                <div
                  className={clsx(
                    'flex flex-col gap-y-2 border-2 border-b p-2 mx-2 items-center w-[200px] snap-center cursor-pointer relative',

                    {
                      'opacity-100':
                        p.participantId === participant?.id &&
                        p.race.id === selectedRace,
                      'opacity-50': !(
                        p.participantId === participant?.id &&
                        p.race.id === selectedRace
                      ),
                      'border-red-500': missingParticipants.some(
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
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}

                  {!isGuest &&
                    p.participantId === participant?.id &&
                    p.race.id === selectedRace && (
                      <button
                        type="button"
                        onClick={handleRemoveRaceParticipant}
                        name="remove"
                        className="absolute top-[6px] right-[6px]"
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
          {!isGuest && (
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

      {!isAuth && !isGuest && (
        <div className="flex flex-row items-center justify-end gap-x-2">
          <H6>{t('Already Have An Account ?')}</H6>
          <a href={`/login?a=checkout&b=${bookingId}`} data-cy="authenticate">
            <H6 className="dark:text-blueGray-500 cursor-pointer">
              {t('Login')}
            </H6>
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div className="flex-col w-full lg:pr-8 xl:w-[calc(100%-(480px))] xl:pr-48">
          <ParticipantForm
            participant={participant}
            hash={hash}
            errors={errors}
            userSavedParticipants={savedParticipants}
            raceId={selectedRace}
            fetcher={fetcher}
            selectedParticipant={selectedParticipant}
            setSelectedParticipant={handleSetSelectedParticipant}
            shirtSizes={shirtSizes}
            resetForm={resetForm}
            isSingleParticipant={raceParticipants.length === 1}
            isReadOnly={isGuest}
            eventTeams={eventTeams}
            participantTeam={participantTeam}
          >
            {!isGuest && (
              <>
                <div className="flex items-center mb-2">
                  <input
                    name="regulation"
                    type="checkbox"
                    checked={checkedTermsAndRegulation.regulation}
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

                <div className="flex items-center mb-8">
                  <input
                    name="terms"
                    type="checkbox"
                    checked={checkedTermsAndRegulation.terms}
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

                <InputError id="terms-error" className="mb-2">
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
            error={errors.missingFilledParticipants}
            fetcher={fetcher}
            hash={hash}
          >
            {!isGuest && (
              <>
                <div className="flex flex-col items-center w-full">
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
                  <input type="hidden" name="hash" value={hash} />
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
                    href={`/checkout/cart/${event.id}?a=update`}
                    data-cy="update-cart"
                  >
                    <H6 className="dark:text-blueGray-500 cursor-pointer">
                      {t('Update Cart')}
                    </H6>
                  </a>
                </div>
              </>
            )}
          </DisplayCart>
        </div>
      </div>

      <AddRacesDialog
        isOpen={showAddRacesDialog}
        triggerModalClose={handleCloseAddRaces}
        eventRaces={event.races}
        reset={isReset}
      />
    </Main>
  );
}

function AddRacesDialog({
  isOpen,
  triggerModalClose,
  eventRaces,
  reset
}: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventRaces: Race[];
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
    <fetcher.Form method="post" action="/checkout/manage">
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
        <H5>{race.price + '€'}</H5>
      </div>
      <div className="flex flex-row mt-2 justify-between items-center">
        <div className="flex flex-row">
          <div>
            <H6 className="dark:text-blueGray-500">{t('Distance')}</H6>
            <H5>{race.distance + ' km'}</H5>
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
