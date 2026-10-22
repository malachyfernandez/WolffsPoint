import type { UserTableItem } from '../types/playerTable';
import type { FieldProvenance } from './fieldProvenance';

export const isPlayerTableKey = (key: string) =>
  key === 'userTable' || (key.startsWith('sim:') && key.endsWith(':userTable'));
export const isMorningMessagesKey = (key: string) =>
  key === 'morningMessagesList' || (key.startsWith('sim:') && key.endsWith(':morningMessagesList'));
export const fieldStorageKey = (key: string) => `private-fields:${key}`;
export type StoredFieldProvenance = {
  playerId?: string;
  email: string;
  fields?: FieldProvenance;
  days: { id?: string; fields?: FieldProvenance }[];
}[];

/** Publish projections, not the old values needed for rollback or override review. */
export const splitFieldProvenance = (users: UserTableItem[]) => ({
  users: users.map((user) => {
    const { fieldProvenance, ...playerData } = user.playerData;
    return {
      ...user,
      playerData,
      days: user.days.map(({ fieldProvenance: fields, ...day }) => day),
    };
  }),
  fields: users.map((user) => ({
    playerId: user.id,
    email: user.email,
    fields: user.playerData.fieldProvenance,
    days: user.days.map((day) => ({ id: day.id, fields: day.fieldProvenance })),
  })) as StoredFieldProvenance,
});

export const joinFieldProvenance = (
  users: UserTableItem[],
  fields: StoredFieldProvenance = []
): UserTableItem[] =>
  users.map((user) => {
    const stored = fields.find((row) =>
      user.id ? row.playerId === user.id : row.email === user.email
    );
    if (!stored) return user;
    return {
      ...user,
      playerData: { ...user.playerData, fieldProvenance: stored.fields },
      days: user.days.map((day, index) => ({
        ...day,
        fieldProvenance: (day.id
          ? stored.days.find((item) => item.id === day.id)
          : stored.days[index]
        )?.fields,
      })),
    };
  });
