import React, { useState } from 'react';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';
import { getInnerTextWidth } from './playerTableColumnSizing';

interface NightlyTitleRowProps {
  onEditStart?: () => void;
  onEditEnd?: () => void;
  isEditing?: boolean;
  extraUserColumns?: string[];
  extraUserColumnWidths?: number[];
}

const NightlyTitleRow = ({
  onEditStart,
  onEditEnd,
  isEditing,
  extraUserColumns = [],
  extraUserColumnWidths = [],
}: NightlyTitleRowProps) => {
  return (
    <Row
      className={`bg-background border-border h-12 w-min gap-0 rounded-t-lg border-b-2 ${isEditing ? 'z-50' : ''}`}>
      <Column className="h-full w-12 items-center justify-center gap-4">
        <FontText weight="medium" className="text-center">
          D/A
        </FontText>
      </Column>
      <Column className="h-full w-28 items-center justify-center gap-0">
        <FontText weight="medium" className="text-center">
          Player
        </FontText>
      </Column>
      {extraUserColumns.map((title, index) => {
        const width = extraUserColumnWidths[index] ?? 112;
        return (
          <Column
            key={index}
            className="h-full items-center justify-center gap-0 px-2"
            style={{ width }}>
            <FontText
              weight="medium"
              className="overflow-hidden text-nowrap text-center"
              style={{ width: getInnerTextWidth(width) }}>
              {title || 'UNSET'}
            </FontText>
          </Column>
        );
      })}
    </Row>
  );
};

export default NightlyTitleRow;
