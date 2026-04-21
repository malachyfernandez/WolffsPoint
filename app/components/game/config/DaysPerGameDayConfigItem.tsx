import React from 'react';
import { useUserList } from '../../../../hooks/useUserList';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import FontNumberInput from '../../ui/forms/FontNumberInput';
import FontText from '../../ui/text/FontText';
import Row from '../../layout/Row';

interface DaysPerGameDayConfigItemProps {
    gameId: string;
}

/**
 * Configuration item for setting days per game day.
 * Controls how many real-world days each in-game day spans by default.
 */
const DaysPerGameDayConfigItem = ({ gameId }: DaysPerGameDayConfigItemProps) => {
    const [numberOfRealDaysPerInGameDay, setNumberOfRealDaysPerInGameDay] = useUserList<number>({
        key: 'numberOfRealDaysPerInGameDay',
        itemId: gameId,
        privacy: 'PUBLIC',
        defaultValue: 2,
    });

    return (
        <ConfigSectionRow
            title='Days per game day'
            subtext='Controls how many real-world days each in-game day spans by default.'
            showDivider={true}
        >
            <Row className='gap-4 items-center'>
                <FontNumberInput
                    value={numberOfRealDaysPerInGameDay.value}
                    onChangeText={(displayValue, isValid, numericValue) => {
                        if (isValid && numericValue !== null) {
                            setNumberOfRealDaysPerInGameDay(numericValue);
                        }
                    }}
                    minValue={1}
                    maxValue={30}
                    inline={true}
                    useDefaultStyling={true}
                    className='border-border/15 bg-text/5'
                />
                <FontText variant='subtext'>days</FontText>
            </Row>
        </ConfigSectionRow>
    );
};

export default DaysPerGameDayConfigItem;
