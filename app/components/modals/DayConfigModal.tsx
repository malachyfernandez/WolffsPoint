import React, { useState } from 'react';
import PoppinsText from '../ui/text/PoppinsText';
import PoppinsDateInput from '../ui/forms/PoppinsDateInput';
import PoppinsNumberInput from '../ui/forms/PoppinsNumberInput';
import AppButton from '../ui/buttons/AppButton';
import Column from '../layout/Column';
import ModalHeader from './ModalHeader';

interface DayConfigModalProps {
  closeModal: () => void;
  setStartingDate: (newValue: string) => void;
  setRealDaysPerInGameDay: (newValue: string) => void;
}

const DayConfigModal: React.FC<DayConfigModalProps> = ({ closeModal, setStartingDate, setRealDaysPerInGameDay }) => {
  const [displayDate, setDisplayDate] = useState('');
  const [canonicalDate, setCanonicalDate] = useState<string | null>(null);
  const [isDateValid, setIsDateValid] = useState(false);

  const [realDaysPerInGameDaySTATE, setRealDaysPerInGameDaySTATE] = useState('2');

  const handleSave = () => {
    if (isDateValid && canonicalDate) {
      setStartingDate(canonicalDate);
      setRealDaysPerInGameDay(realDaysPerInGameDaySTATE)
      closeModal();
    }
  };

  const handleDateChange = (displayValue: string, isValid: boolean, canonicalValue: string | null) => {
    setDisplayDate(displayValue);
    setIsDateValid(isValid);
    setCanonicalDate(canonicalValue);
  };

  const handleRealDaysChange = (displayValue: string, _isValid: boolean, _numericValue: number | null) => {
    setRealDaysPerInGameDaySTATE(displayValue);
  };

  const todaysDate = new Date()


  return (
    <Column gap={6}>
      <ModalHeader 
        text="Lets get some basics setup" 
        subtext="This can be changed later." 
      />
      <Column gap={2}>

        <PoppinsText>Starting Date:</PoppinsText>

        <PoppinsDateInput
          placeholder="MM/DD/YYYY"
          className="w-full border border-subtle-border p-2"
          value={displayDate}
          onChangeText={handleDateChange}
          earliestDate={todaysDate}
        />
      </Column>
      <Column gap={2}>
        <PoppinsText>Real Days per In-Game Day</PoppinsText>
        <PoppinsNumberInput
          placeholder="Enter number"
          className="w-full border border-subtle-border p-2"
          value={realDaysPerInGameDaySTATE}
          onChangeText={handleRealDaysChange}
          minValue={1}
        />
      </Column>
      <Column>
        <AppButton variant="black" className="h-10 w-20" onPress={handleSave}>
          <PoppinsText weight='medium' color='white'>Save</PoppinsText>
        </AppButton>
      </Column>
    </Column>
  );
};

export default DayConfigModal;
