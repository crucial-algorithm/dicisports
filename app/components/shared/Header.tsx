import React from 'react';

type Props = {
  size?: number
} & React.ComponentProps<'p'>
const Header: React.FC<Props> = ({ size, children }) => (
  <p className="text-4xl">{children}</p>
);

export default Header;
