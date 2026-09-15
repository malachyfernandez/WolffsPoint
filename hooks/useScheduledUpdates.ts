import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { decodeUserValue } from './userValueSerialization';

export type ScheduledTarget =
  | { targetType: 'variable'; key: string }
  | { targetType: 'list'; key: string; itemId: string };

export type ScheduledSetOptions = {
  stage?: boolean;
  scheduleAt?: number;
  batchId?: string;
};

export type ScheduledUpdate<T> = {
  value: T;
  batchId: string;
  status: 'staged' | 'scheduled';
  scheduledTime: number | null;
  schedule: (scheduledTime: number) => Promise<void>;
  publishNow: () => Promise<void>;
  cancel: () => Promise<void>;
};

export type ScheduledValueSetter<T> = (
  value: T,
  options?: ScheduledSetOptions
) => void | Promise<void>;

const getDefaultBatchId = (target: ScheduledTarget) =>
  target.targetType === 'variable'
    ? `variable:${target.key}`
    : `list:${target.key}:${target.itemId}`;

export const useScheduledTarget = <T>(target: ScheduledTarget) => {
  const pendingTarget = useQuery(api.scheduled_updates.getPendingTarget, { target });
  const stageMutation = useMutation(api.scheduled_updates.stageTarget).withOptimisticUpdate(
    (localStore, args) => {
      const existing = localStore.getQuery(api.scheduled_updates.getPendingTarget, {
        target: args.target,
      });
      localStore.setQuery(api.scheduled_updates.getPendingTarget, { target: args.target }, {
        ...(existing ?? {}),
        targetType: args.target.targetType,
        key: args.target.key,
        itemId: args.target.targetType === 'list' ? args.target.itemId : undefined,
        encodedValue: args.encodedValue,
        batchId: args.batchId,
        scheduledTime: existing?.batchId === args.batchId ? existing.scheduledTime : undefined,
        updatedAt: Date.now(),
      } as any);
    }
  );
  const scheduleMutation = useMutation(api.scheduled_updates.scheduleBatch);
  const publishMutation = useMutation(api.scheduled_updates.publishBatchNow);
  const cancelMutation = useMutation(api.scheduled_updates.cancelBatch);

  const batchId = pendingTarget?.batchId;
  const scheduledUpdate: ScheduledUpdate<T> | undefined = pendingTarget
    ? {
        value: decodeUserValue(pendingTarget.encodedValue as T),
        batchId: pendingTarget.batchId,
        status: pendingTarget.scheduledTime === undefined ? 'staged' : 'scheduled',
        scheduledTime: pendingTarget.scheduledTime ?? null,
        schedule: async (scheduledTime) => {
          await scheduleMutation({ batchId: pendingTarget.batchId, scheduledTime });
        },
        publishNow: async () => {
          await publishMutation({ batchId: pendingTarget.batchId });
        },
        cancel: async () => {
          await cancelMutation({ batchId: pendingTarget.batchId });
        },
      }
    : undefined;

  const stageValue = async (encodedValue: unknown, options: ScheduledSetOptions = {}) => {
    const nextBatchId = options.batchId ?? batchId ?? getDefaultBatchId(target);
    await stageMutation({ target, encodedValue, batchId: nextBatchId });
    if (options.scheduleAt !== undefined) {
      await scheduleMutation({ batchId: nextBatchId, scheduledTime: options.scheduleAt });
    }
  };

  return {
    isLoading: pendingTarget === undefined,
    pendingTarget,
    scheduledUpdate,
    stageValue,
  };
};

export const useScheduledBatch = (batchId: string) => {
  const batch = useQuery(api.scheduled_updates.getBatchState, { batchId });
  const scheduleMutation = useMutation(api.scheduled_updates.scheduleBatch);
  const publishMutation = useMutation(api.scheduled_updates.publishBatchNow);
  const cancelMutation = useMutation(api.scheduled_updates.cancelBatch);
  const isActive = Boolean(batch?.targetCount);

  return {
    batch,
    isLoading: batch === undefined,
    isActive,
    isScheduled: isActive && batch?.state === 'scheduled',
    scheduledTime: isActive ? (batch?.scheduledTime ?? null) : null,
    schedule: async (scheduledTime: number) => {
      await scheduleMutation({ batchId, scheduledTime });
    },
    publishNow: async () => {
      await publishMutation({ batchId });
    },
    cancel: async () => {
      await cancelMutation({ batchId });
    },
  };
};
