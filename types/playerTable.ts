import { PlayerActionValue } from './multiplayer';

export type PlayerData = {
    livingState: 'alive' | 'dead';
    extraColumns?: string[];
};

export type DayData = {
    vote?: string;
    action?: PlayerActionValue;
    extraColumns?: string[];
};

export type UserTableItem = {
    realName: string;
    email: string;
    userId: string | "NOT-JOINED";
    role: string;
    playerData: PlayerData;
    days: DayData[];
};

export type UserTableTitle = {
    extraUserColumns: string[];
    extraDayColumns: string[];
};

export type UserTableColumnVisibility = {
    extraUserColumns: boolean[];
    extraDayColumns: boolean[];
};
