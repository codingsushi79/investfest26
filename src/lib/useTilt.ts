import { useRef, useEffect } from 'react';

interface TiltOptions {
  maxTilt?: number;
  perspective?: number;
  scale?: number;
}

export function useTilt(options: TiltOptions = {}) {
  const {
    maxTilt = 15,
    perspective = 1000,
    scale = 1.05
  } = options;

  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let animationFrame: number;
    let isHovering = false;

    const handleMouseEnter = () => {
      isHovering = true;
      element.style.transition = 'transform 0.1s ease-out';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovering) return;

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;

        // Clamp the rotation values to prevent extreme tilting
        const rotateX = Math.max(-maxTilt, Math.min(maxTilt, (mouseY / (rect.height / 2)) * -maxTilt));
        const rotateY = Math.max(-maxTilt, Math.min(maxTilt, (mouseX / (rect.width / 2)) * maxTilt));

        element.style.transform = `
          perspective(${perspective}px)
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          scale3d(${scale}, ${scale}, ${scale})
        `;
      });
    };

    const handleMouseLeave = () => {
      isHovering = false;

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        element.style.transform = `
          perspective(${perspective}px)
          rotateX(0deg)
          rotateY(0deg)
          scale3d(1, 1, 1)
        `;
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [maxTilt, perspective, scale]);

  return elementRef;
}
