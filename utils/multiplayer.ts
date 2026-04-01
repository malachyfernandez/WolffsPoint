import { GameSchedule } from '../types/multiplayer';

const DEFAULT_SCHEDULE: GameSchedule = {
    newspaperReleaseTime: '08:00',
    nightlyDeadlineTime: '22:00',
    nightlyResponseReleaseTime: '23:00',
};

export const defaultGameSchedule = DEFAULT_SCHEDULE;

export const getGameScopedKey = (baseKey: string, gameId: string) => {
    return `${baseKey}-${gameId}`;
};

export const createClientId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const parseStoredDayDates = (dayDates: string[]) => {
    return dayDates.map((dateStr) => {
        const [month, day, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    });
};

export const formatTimeLabel = (time24: string) => {
    const [hoursString, minutesString] = time24.split(':');
    const hours = Number(hoursString || '0');
    const minutes = Number(minutesString || '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const normalizedHours = hours % 12 || 12;
    const normalizedMinutes = `${minutes}`.padStart(2, '0');
    return `${normalizedHours}:${normalizedMinutes} ${suffix}`;
};

export const buildScheduledDate = (baseDate: Date, time24: string) => {
    const [hoursString, minutesString] = time24.split(':');
    const scheduledDate = new Date(baseDate);
    scheduledDate.setHours(Number(hoursString || '0'), Number(minutesString || '0'), 0, 0);
    return scheduledDate;
};

export const getCurrentPlayableDayIndex = (dayDates: Date[], now: Date = new Date()) => {
    if (dayDates.length === 0) {
        return 0;
    }

    const normalizedToday = new Date(now);
    normalizedToday.setHours(0, 0, 0, 0);

    const normalizedDays = dayDates.map((dayDate) => {
        const nextDate = new Date(dayDate);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate;
    });

    const todayIndex = normalizedDays.findIndex((date) => date.getTime() === normalizedToday.getTime());
    if (todayIndex >= 0) {
        return todayIndex;
    }

    const latestPastIndex = normalizedDays.reduce((bestIndex, date, index) => {
        if (date.getTime() <= normalizedToday.getTime()) {
            return index;
        }
        return bestIndex;
    }, -1);

    if (latestPastIndex >= 0) {
        return latestPastIndex;
    }

    return 0;
};

export const isDayReleasedAtTime = (dayDate: Date, time24: string, now: Date = new Date()) => {
    return now.getTime() >= buildScheduledDate(dayDate, time24).getTime();
};

export const isNightWindowOpen = (dayDate: Date, deadlineTime24: string, now: Date = new Date()) => {
    const deadline = buildScheduledDate(dayDate, deadlineTime24);
    return now.getTime() <= deadline.getTime();
};
