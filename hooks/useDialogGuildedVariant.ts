import { usePlayerStatus } from '../contexts/PlayerStatusContext';

export type GuildedFrameVariant = 'ghostly' | 'gold';

export function useDialogGuildedVariant(): GuildedFrameVariant {
    const { isPlayerDead } = usePlayerStatus();
    return isPlayerDead ? 'ghostly' : 'gold';
}
