import { useEffect, useMemo } from 'react';
import { useFindValues } from './useData';

export const useSharedVariableValue = <T,>({
    key,
    defaultValue,
    userIds,
}: {
    key: string;
    defaultValue: T;
    userIds?: string[];
}) => {
    const records = useFindValues<T>(key, { userIds, returnTop: 1 });

    useEffect(() => {
        console.log(`[YourEyesOnly][PROD-DIAG][SharedVar] key=${key} userIds=${userIds ? userIds.join(',') : 'none'} records=${records === undefined ? 'undefined' : records.length}`);
    }, [records]);

    return useMemo(() => {
        const record = records?.[0];
        return {
            record,
            value: (record?.value ?? defaultValue) as T,
            isLoading: records === undefined,
        };
    }, [defaultValue, records]);
};
