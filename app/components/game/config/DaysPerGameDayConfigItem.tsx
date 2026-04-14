import React from 'react';
import { useUserList } from '../../../../hooks/useUserList';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import PoppinsNumberInput from '../../ui/forms/PoppinsNumberInput';
import PoppinsText from '../../ui/text/PoppinsText';
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
            showDivider={false}
        >
            <Row className='items-center gap-3'>
                <PoppinsNumberInput
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
                <PoppinsText varient='subtext'>days</PoppinsText>
            </Row>
        </ConfigSectionRow>
    );
};

export default DaysPerGameDayConfigItem;
