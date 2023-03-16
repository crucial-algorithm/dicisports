import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export default function ResultEntryDescription({
  text,
  label,
  more,
  less
}: {
  text: string | null;
  label: string;
  more: string;
  less: string;
}) {
  const innerDiv = useRef<HTMLDivElement>(null);
  const outerDiv = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [heightMetaData, setHeightMetaData] = useState<{
    isTextLonger: boolean;
    computed: boolean;
  }>({ isTextLonger: true, computed: false });

  function handleReadMore() {
    expanded ? setExpanded(false) : setExpanded(true);
  }

  useEffect(() => {
    if (innerDiv.current) {
      setHeightMetaData({
        computed: true,
        isTextLonger: innerDiv.current.offsetHeight > 76
      });
    }
  }, [text]);

  if (!text) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col align-middle mb-4">
        <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
          {label}
        </div>
        <div
          className={clsx({
            'max-h-[76px] overflow-hidden': !expanded
          })}
          ref={outerDiv}
        >
          <div
            ref={innerDiv}
            className={clsx(
              'whitespace-pre-wrap max-w-[90ch] dark:text-white text-gray-500 text-base',
              {
                'break-words line-clamp-3':
                  heightMetaData.computed &&
                  heightMetaData.isTextLonger &&
                  !expanded
              }
            )}
          >
            {text}
          </div>
        </div>
        {heightMetaData.isTextLonger && (
          <label className="w-20" role="button" onClick={handleReadMore}>
            {expanded ? less : more}
          </label>
        )}
      </div>
    </>
  );
}
