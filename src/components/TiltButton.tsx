"use client";

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { useTilt } from '@/lib/useTilt';

interface TiltButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tiltOptions?: {
    maxTilt?: number;
    perspective?: number;
    scale?: number;
  };
  children: React.ReactNode;
}

export const TiltButton = forwardRef<HTMLButtonElement, TiltButtonProps>(
  ({ tiltOptions, className = '', children, ...props }, ref) => {
    const tiltRef = useTilt(tiltOptions);

    return (
      <button
        ref={(node) => {
          if (ref) {
            if (typeof ref === 'function') {
              ref(node);
            } else {
              ref.current = node;
            }
          }
          if (tiltRef.current !== node) {
            tiltRef.current = node;
          }
        }}
        className={`transition-transform duration-200 ease-out ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TiltButton.displayName = 'TiltButton';
