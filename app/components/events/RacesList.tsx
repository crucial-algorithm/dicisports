import * as React from 'react';
import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Link, useFetcher } from '@remix-run/react';
import { useState } from 'react';


import DeleteRaceDialog from '~/components/events/DeleteRaceDialog';
import type { Race } from '~/types';

export default function RacesList(props: {
  races: Race[];
  eventId: string;
}) {
  const { races, eventId } = props;
  const fetcher = useFetcher();

  const [deleteModalOpen, setDeleteModalOpen] = useState<{
    show: boolean;
    race?: Race;
  }>({ show: false });

  function handleMoveUp(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/o/event/${eventId}/race/${e.currentTarget.id}/move-up`
      }
    );
  }

  function handleMoveDown(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/o/event/${eventId}/race/${e.currentTarget.id}/move-down`
      }
    );
  }

  function handleDeleteRace(e: React.MouseEvent) {
    const race = races.find((r) => r.id === e.currentTarget.id);

    if (!race) {
      // should never happen
      return;
    }
    setDeleteModalOpen({ show: true, race });
  }

  function handleDeleteRaceClose() {
    setDeleteModalOpen({ show: false });
  }

  return (
    <>
      <div>
        {races
          .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
          .map((r: Race, index) => (
            <div
              key={r.id}
              className="relative flex mb-4 justify-between items-center flex-row flex-wrap border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
            >
              <div className="flex flex-col items-center dark:text-blueGray-500">
                {index === 0 ? null : (
                  <button
                    type="button"
                    id={r.id}
                    onClick={handleMoveUp}
                    className="w-[24px] h-[24px]"
                    name={`move-up-${r.id}`}
                  >
                    <ChevronUpIcon className="mh-6 w-6 m-0 inline-block" />
                  </button>
                )}
                {index === races.length - 1 ? null : (
                  <button
                    type="button"
                    id={r.id}
                    onClick={handleMoveDown}
                    className="w-[24px] h-[24px]"
                    name={`move-down-${r.id}`}
                  >
                    <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
              </div>

              <Link
                className="text-lg font-extrabold pl-3 text-gray-700 dark:text-white w-[calc(100%-(24px+24px))] cursor-pointer"
                id={r.id}
                to={`/o/event/${eventId}/race/${r.id}`}
                data-cy={`race-index-${index}`}
              >
                {r.name}
              </Link>

              <button
                type="button"
                id={r.id}
                onClick={handleDeleteRace}
                className="w-[24px] h-[24px] dark:text-blueGray-500"
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block"></TrashIcon>
              </button>
            </div>
          ))}
      </div>

      <DeleteRaceDialog
        isOpen={deleteModalOpen.show}
        onDismiss={handleDeleteRaceClose}
        race={deleteModalOpen.race}
        eventId={eventId}
      />
    </>
  );
}
