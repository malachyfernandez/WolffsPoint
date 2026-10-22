import { useState, type ReactNode } from 'react';

// Native controls retain accessible labels without importing a DOM renderer.
// Metro selects useTooltip.web.ts for the shared cursor-following tooltip.
export const useTooltip = (_id: string, _content: ReactNode | undefined) => {
  const [hovered, setHovered] = useState(false);
  return { hovered, setHovered };
};
