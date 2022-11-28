import * as React from 'react';
import { ShareIcon } from '@heroicons/react/24/solid';

import Button from '~/components/shared/Button';

export default function CopyToClipboard({
  text,
  id,
  successMessage,
  className
}: {
  text: string;
  id: string;
  successMessage: () => void;
  className?: string;
}) {
  function handlerClickToCopy() {
    navigator.clipboard.writeText(text).then(() => {
      successMessage();
    });
  }

  return (
    <Button
      size="tiny"
      type="submit"
      name={`share-${id}`}
      onClick={handlerClickToCopy}
      className={className}
    >
      <ShareIcon className="h-6 w-6 m-0 inline-block" />
    </Button>
  );
}
