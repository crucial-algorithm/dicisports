import { ArrowDownTrayIcon, ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useFetcher } from '@remix-run/react';
import { useState } from 'react';
import * as React from 'react';

import DeleteDocumentDialog from '~/components/events/DeleteDocumentDialog';
import type { Document } from '~/types';

export default function DocumentsList(props: {
  documents: Document[];
  eventId: string;
  handleUpdateDocument: (e: React.MouseEvent) => void;
}) {
  const { documents, eventId, handleUpdateDocument } = props;
  const fetcher = useFetcher();
  const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] = useState<{
    show: boolean;
    document?: Document;
  }>({ show: false });

  function handleMoveUp(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/o/document/${e.currentTarget.id}/move-up`
      }
    );
  }

  function handleMoveDown(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/o/document/${e.currentTarget.id}/move-down`
      }
    );
  }

  function handleOpenDeleteDocumentDialog(e: React.MouseEvent) {
    const document = documents.find((d) => d.id === e.currentTarget.id);

    if (!document) {
      return;
    }

    setShowDeleteDocumentDialog({ show: true, document });
  }

  function handleCloseDeleteDocumentDialog() {
    setShowDeleteDocumentDialog({ show: false });
  }

  return (
    <>
      <div>
        {documents
          .sort((a: Document, b: Document) => a.position - b.position)
          .map((d: Document, index) => (
            <div
              key={d.id}
              className="relative flex mb-4 justify-between items-center flex-row border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
            >
              <div className="flex flex-col items-center dark:text-blueGray-500">
                {index === 0 ? null : (
                  <button
                    type="button"
                    id={d.id}
                    onClick={handleMoveUp}
                    className="w-[24px] h-[24px]"
                    name={`move-up-${d.id}`}
                  >
                    <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
                {index === documents.length - 1 ? null : (
                  <button
                    type="button"
                    id={d.id}
                    onClick={handleMoveDown}
                    className="w-[24px] h-[24px]"
                    name={`move-down-${d.id}`}
                  >
                    <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
              </div>

              <div
                className="text-lg text-left font-extrabold pl-3 dark:text-white w-[calc(100%-(24px+24px+24px))] cursor-pointer"
                id={d.id}
                onClick={handleUpdateDocument}
                data-cy={`document-index-${index}`}
              >
                {d.label}
              </div>

              <a
                href={`/o/document/${d.id}`}
                target="_blank"
                rel="noreferrer"
                data-cy={`download-${d.id}`}
              >
                <ArrowDownTrayIcon className="md:h-6 w-6 m-0 inline-block text-black dark:text-blueGray-500" />
              </a>
              <button
                type="button"
                id={d.id}
                onClick={handleOpenDeleteDocumentDialog}
                className="ml-3 w-[24px] h-[24px] dark:text-blueGray-500"
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block" />
              </button>
            </div>
          ))}
      </div>

      <DeleteDocumentDialog
        isOpen={showDeleteDocumentDialog.show}
        onDismiss={handleCloseDeleteDocumentDialog}
        document={showDeleteDocumentDialog.document as Document}
        eventId={eventId}
      />
    </>
  );
}
