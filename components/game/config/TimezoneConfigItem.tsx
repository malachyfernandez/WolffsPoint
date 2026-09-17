import React, { useEffect, useMemo } from 'react';
import { useValue } from 'hooks/useData';
import { GameSchedule } from 'types/multiplayer';
import {
    getGameScopedKey,
    normalizeGameSchedule,
    defaultGameSchedule,
} from 'utils/multiplayer';
import { getDeviceTimeZone, isValidTimeZone } from 'utils/timezone';
import ConfigSectionRow from '../../ui/forms/ConfigSectionRow';
import AppDropdown, { AppDropdownOption } from '../../ui/forms/AppDropdown';

const COMMON_TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix',
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
    'America/Toronto', 'America/Vancouver', 'America/Mexico_City',
    'America/Sao_Paulo', 'Europe/London', 'Europe/Dublin', 'Europe/Paris',
    'Europe/Berlin', 'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Stockholm',
    'Europe/Athens', 'Africa/Lagos', 'Africa/Johannesburg', 'Asia/Dubai',
    'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai',
    'Asia/Tokyo', 'Asia/Seoul', 'Australia/Perth', 'Australia/Sydney',
    'Pacific/Auckland', 'UTC',
];

interface TimezoneConfigItemProps {
    gameId: string;
}

/**
 * Configuration item for the game's timezone.
 * Every player shares this zone — all schedule wall-clock times (wake-up,
 * deadlines) are interpreted in it regardless of device timezone. Defaults to
 * the operator's device zone, which is stamped into the schedule on first open.
 */
const TimezoneConfigItem = ({ gameId }: TimezoneConfigItemProps) => {
    const [gameSchedule, setGameSchedule] = useValue<GameSchedule>(getGameScopedKey('gameSchedule', gameId), {
        defaultValue: defaultGameSchedule,
        privacy: 'PUBLIC',
    });

    const schedule = normalizeGameSchedule(gameSchedule.value);
    const deviceTimeZone = getDeviceTimeZone();
    const storedZone = schedule.timezone;
    const effectiveZone = storedZone && isValidTimeZone(storedZone) ? storedZone : deviceTimeZone;

    // Seed the operator's device zone into the schedule the first time the
    // config page loads — from then on every player shares the stored value.
    useEffect(() => {
        if (gameSchedule.state.isSyncing) return;
        if ((!storedZone || !isValidTimeZone(storedZone)) && isValidTimeZone(deviceTimeZone)) {
            setGameSchedule({ ...schedule, timezone: deviceTimeZone });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameSchedule.state.isSyncing, storedZone, deviceTimeZone]);

    const options: AppDropdownOption[] = useMemo(() => {
        const zones = COMMON_TIMEZONES.includes(effectiveZone)
            ? COMMON_TIMEZONES
            : [effectiveZone, ...COMMON_TIMEZONES];
        return zones.map((zone) => ({
            value: zone,
            label:
                zone === deviceTimeZone
                    ? `${zone.replace(/_/g, ' ')} (this device)`
                    : zone.replace(/_/g, ' '),
        }));
    }, [effectiveZone, deviceTimeZone]);

    return (
        <ConfigSectionRow
            title='Game timezone'
            subtext={`All players share this zone — deadlines and wake-up times use ${effectiveZone.replace(/_/g, ' ')}.`}
        >
            <AppDropdown
                options={options}
                value={effectiveZone}
                allowUnselect={false}
                onValueChange={(value) => {
                    if (!isValidTimeZone(value)) {
                        return;
                    }
                    setGameSchedule({ ...schedule, timezone: value });
                }}
                triggerClassName='w-full min-w-[280px] max-w-[320px]'
            />
        </ConfigSectionRow>
    );
};

export default TimezoneConfigItem;
