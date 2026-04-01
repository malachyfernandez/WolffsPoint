import { useMemo } from 'react';
import { useUserListGet } from './useUserListGet';

export const useSharedListValue = <T,>({
    key,
    itemId,
    defaultValue,
}: {
    key: string;
    itemId: string;
    defaultValue: T;
}) => {
    const records = useUserListGet<T>({ key, itemId });

    return useMemo(() => {
        const record = records?.[0];
        return {
            record,
            value: (record?.value ?? defaultValue) as T,
            isLoading: records === undefined,
        };
    }, [defaultValue, records]);
};
