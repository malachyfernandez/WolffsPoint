import React from 'react';
import { View } from 'react-native';
import FontText from '../ui/text/FontText';
import Column from '../layout/Column';
import Row from '../layout/Row';

interface ActionPill {
    label: string;
    value: string;
}

interface ActionPillsProps {
    actionText: string;
    maxWidth?: number;
}

export const parseActionPills = (actionText: string): ActionPill[] => {
    if (!actionText.trim()) return [];

    // Split by bullet character
    const segments = actionText.split('•');

    return segments.map(segment => {
        const trimmed = segment.trim();
        // Check if segment has a colon to separate label and value
        const colonIndex = trimmed.indexOf(':');

        if (colonIndex > 0) {
            const label = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            return { label, value };
        }

        // If no colon, treat the whole thing as value with no label
        return { label: '', value: trimmed };
    }).filter(pill => pill.label || pill.value);
};

const ActionPill = ({ label, value }: ActionPill) => {
    return (
        <View className="bg-text rounded-full px-3 py-1.5">
            <Column className="gap-0 items-center">
                {label ? (
                    <FontText color="white" className="text-xs text-center opacity-70 leading-none">
                        {label}
                    </FontText>
                ) : null}
                <FontText color="white" weight="medium" className="text-sm text-center leading-none">
                    {value}
                </FontText>
            </Column>
        </View>
    );
};

export const ActionPills = ({ actionText, maxWidth }: ActionPillsProps) => {
    const pills = parseActionPills(actionText);

    if (pills.length === 0) {
        return (
            <FontText className="opacity-50 text-center">
                No action...
            </FontText>
        );
    }

    // Row layout - overflow is clipped, no wrapping
    return (
        <Row className="gap-2 items-center justify-center overflow-hidden">
            {pills.map((pill, index) => (
                <ActionPill key={index} label={pill.label} value={pill.value} />
            ))}
        </Row>
    );
};

export default ActionPills;
