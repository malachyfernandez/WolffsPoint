import React from 'react';
import { View } from 'react-native';
import Column from '../layout/Column';

interface PrintRuleProps {
  className?: string;
  /** Flip the thick/thin order — use for rules at the bottom of a block. */
  flip?: boolean;
}

/**
 * Letterpress-style double rule (heavy line paired with a hairline), used to
 * bracket datelines and page headers like a printed document.
 */
const PrintRule = ({ className = '', flip = false }: PrintRuleProps) => (
  <Column className={`gap-[3px] ${className}`.trim()}>
    {flip ? (
      <>
        <View className="bg-border/40 h-px w-full" />
        <View className="bg-border/60 h-[2px] w-full" />
      </>
    ) : (
      <>
        <View className="bg-border/60 h-[2px] w-full" />
        <View className="bg-border/40 h-px w-full" />
      </>
    )}
  </Column>
);

export default PrintRule;
