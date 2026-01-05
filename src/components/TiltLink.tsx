"use client";

import Link, { LinkProps } from 'next/link';
import { ReactNode, CSSProperties } from 'react';
import { useTilt } from '@/lib/useTilt';

interface TiltLinkProps extends LinkProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tiltOptions?: {
    maxTilt?: number;
    perspective?: number;
    scale?: number;
  };
}

export function TiltLink({
  children,
  className = '',
  style,
  tiltOptions,
  ...linkProps
}: TiltLinkProps) {
  const tiltRef = useTilt(tiltOptions);

  return (
    <Link
      {...linkProps}
      className={`inline-block transition-transform duration-200 ease-out ${className}`}
      style={style}
      ref={(node) => {
        if (tiltRef.current !== node) {
          tiltRef.current = node as HTMLElement;
        }
      }}
    >
      {children}
    </Link>
  );
}
