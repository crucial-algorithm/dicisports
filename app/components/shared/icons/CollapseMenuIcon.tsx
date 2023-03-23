import React from 'react';

export default function CollapseMenuIcon({ className, onClick }: { className: string } & React.ComponentProps<'svg'>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      viewBox="0 0 1080 1080"
      onClick={onClick}
    >
      <g>
        <rect
          strokeWidth="100"
          stroke="#000"
          height="980"
          width="980"
          y="50"
          x="50"
          fill="#fff"
        />
        <rect
          height="880"
          width="460"
          y="100"
          x="100"
          strokeWidth="0"
          stroke="#ff7f00"
          fill="#ff7f00"
        />
      </g>
    </svg>
  );
}
