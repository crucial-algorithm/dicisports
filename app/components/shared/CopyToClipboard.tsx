import * as React from 'react';
import { ShareIcon } from '@heroicons/react/24/solid';

import Button from '~/components/shared/Button';

export default function CopyToClipboard({
  text,
  id,
  showMessage,
  className
}: {
  text: string;
  id: string;
  showMessage: () => void;
  className?: string
}) {
  function handlerClickToCopy() {
    navigator.clipboard.writeText(text).then(() => {
      showMessage();
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
