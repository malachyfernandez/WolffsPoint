import { useEffect, useMemo } from 'react';
import { useFindListItems } from './useData';

export const useSharedListValue = <T,>({
    key,
    itemId,
    defaultValue,
    userIds,
}: {
    key: string;
    itemId: string;
    defaultValue: T;
    userIds?: string[];
}) => {
    const records = useFindListItems<T>(key, { itemId, userIds, returnTop: 1 });

    useEffect(() => {
        console.log(`[YourEyesOnly][PROD-DIAG][SharedList] key=${key} itemId=${itemId} userIds=${userIds ? userIds.join(',') : 'none'} records=${records === undefined ? 'undefined' : records.length}`);
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
