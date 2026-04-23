import { useUserVariable } from './useUserVariable';
import { useIsPlayerDead } from './useIsPlayerDead';

export type GuildedFrameVariant = 'ghostly' | 'gold';

export function useDialogGuildedVariant(): GuildedFrameVariant {
    const [activeGameId] = useUserVariable<string>({
        key: 'activeGameId',
        defaultValue: '',
    });

    const isPlayerDead = useIsPlayerDead(activeGameId.value);
    return isPlayerDead ? 'ghostly' : 'gold';
}
