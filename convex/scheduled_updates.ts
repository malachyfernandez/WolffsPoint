import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query, MutationCtx } from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { setUserVarForToken } from './user_vars';
import { setUserListForToken } from './user_lists';

const MAX_BATCH_TARGETS = 50;

const targetValidator = v.union(
  v.object({ targetType: v.literal('variable'), key: v.string() }),
  v.object({ targetType: v.literal('list'), key: v.string(), itemId: v.string() })
);

async function requireOwner(ctx: { auth: MutationCtx['auth'] }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');
  return identity.subject;
}

async function cancelSchedulerJob(ctx: MutationCtx, schedulerJobId?: Id<'_scheduled_functions'>) {
  if (!schedulerJobId) return;
  try {
    await ctx.scheduler.cancel(schedulerJobId);
  } catch {
    return;
  }
}

async function getBatch(ctx: MutationCtx, ownerUserToken: string, batchId: string) {
  const [batch, ...duplicates] = await ctx.db
    .query('scheduled_update_batches')
    .withIndex('by_ownerUserToken_and_batchId', (q) =>
      q.eq('ownerUserToken', ownerUserToken).eq('batchId', batchId)
    )
    .order('desc')
    .take(2);
  for (const duplicate of duplicates) await ctx.db.delete(duplicate._id);
  return batch ?? null;
}

async function publishBatch(
  ctx: MutationCtx,
  batchDocumentId: Id<'scheduled_update_batches'>,
  expectedScheduleToken?: string
) {
  const batch = await ctx.db.get(batchDocumentId);
  if (!batch) return { published: 0 };
  if (expectedScheduleToken && batch.scheduleToken !== expectedScheduleToken) {
    return { published: 0 };
  }
  const targets = await ctx.db
    .query('scheduled_update_targets')
    .withIndex('by_ownerUserToken_and_batchId', (q) =>
      q.eq('ownerUserToken', batch.ownerUserToken).eq('batchId', batch.batchId)
    )
    .take(MAX_BATCH_TARGETS + 1);
  if (targets.length > MAX_BATCH_TARGETS) {
    throw new Error(`A scheduled batch may contain at most ${MAX_BATCH_TARGETS} targets`);
  }
  for (const target of targets) {
    if (target.targetType === 'variable') {
      await setUserVarForToken(ctx, batch.ownerUserToken, {
        key: target.key,
        value: target.encodedValue,
      });
    } else {
      if (!target.itemId) throw new Error('List target is missing itemId');
      await setUserListForToken(ctx, batch.ownerUserToken, {
        key: target.key,
        itemId: target.itemId,
        value: target.encodedValue,
      });
    }
  }
  for (const target of targets) await ctx.db.delete(target._id);
  await ctx.db.delete(batch._id);
  return { published: targets.length };
}

export const getPendingTarget = query({
  args: { target: targetValidator },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('scheduled_update_targets')
      .withIndex('by_ownerUserToken_and_targetType_and_key_and_itemId', (q) =>
        q
          .eq('ownerUserToken', identity.subject)
          .eq('targetType', args.target.targetType)
          .eq('key', args.target.key)
          .eq('itemId', args.target.targetType === 'list' ? args.target.itemId : undefined)
      )
      .order('desc')
      .first();
  },
});

export const getBatchState = query({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const batch = await ctx.db
      .query('scheduled_update_batches')
      .withIndex('by_ownerUserToken_and_batchId', (q) =>
        q.eq('ownerUserToken', identity.subject).eq('batchId', args.batchId)
      )
      .order('desc')
      .first();
    if (!batch) return null;
    const targets = await ctx.db
      .query('scheduled_update_targets')
      .withIndex('by_ownerUserToken_and_batchId', (q) =>
        q.eq('ownerUserToken', identity.subject).eq('batchId', args.batchId)
      )
      .take(MAX_BATCH_TARGETS + 1);
    return { ...batch, targetCount: targets.length };
  },
});

export const stageTarget = mutation({
  args: {
    target: targetValidator,
    encodedValue: v.any(),
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerUserToken = await requireOwner(ctx);
    const now = Date.now();
    let batch: Doc<'scheduled_update_batches'> | null = await getBatch(
      ctx,
      ownerUserToken,
      args.batchId
    );
    if (!batch) {
      const batchDocumentId = await ctx.db.insert('scheduled_update_batches', {
        ownerUserToken,
        batchId: args.batchId,
        state: 'staged',
        createdAt: now,
        updatedAt: now,
      });
      batch = await ctx.db.get(batchDocumentId);
    }
    if (!batch) throw new Error('Failed to resolve scheduled batch');
    const itemId = args.target.targetType === 'list' ? args.target.itemId : undefined;
    const [existing, ...duplicates] = await ctx.db
      .query('scheduled_update_targets')
      .withIndex('by_ownerUserToken_and_targetType_and_key_and_itemId', (q) =>
        q
          .eq('ownerUserToken', ownerUserToken)
          .eq('targetType', args.target.targetType)
          .eq('key', args.target.key)
          .eq('itemId', itemId)
      )
      .order('desc')
      .take(2);
    for (const duplicate of duplicates) await ctx.db.delete(duplicate._id);
    if (!existing || existing.batchId !== args.batchId) {
      const targets = await ctx.db
        .query('scheduled_update_targets')
        .withIndex('by_ownerUserToken_and_batchId', (q) =>
          q.eq('ownerUserToken', ownerUserToken).eq('batchId', args.batchId)
        )
        .take(MAX_BATCH_TARGETS);
      if (targets.length >= MAX_BATCH_TARGETS) {
        throw new Error(`A scheduled batch may contain at most ${MAX_BATCH_TARGETS} targets`);
      }
    }
    const value = {
      ownerUserToken,
      targetType: args.target.targetType,
      key: args.target.key,
      itemId,
      encodedValue: args.encodedValue,
      batchId: args.batchId,
      scheduledTime: batch.scheduledTime,
      updatedAt: now,
    };
    if (existing) {
      const previousBatchId = existing.batchId;
      await ctx.db.patch(existing._id, value);
      if (previousBatchId !== args.batchId) {
        const remainingTargets = await ctx.db
          .query('scheduled_update_targets')
          .withIndex('by_ownerUserToken_and_batchId', (q) =>
            q.eq('ownerUserToken', ownerUserToken).eq('batchId', previousBatchId)
          )
          .take(1);
        if (remainingTargets.length === 0) {
          const previousBatch = await getBatch(ctx, ownerUserToken, previousBatchId);
          if (previousBatch) {
            await cancelSchedulerJob(ctx, previousBatch.schedulerJobId);
            await ctx.db.delete(previousBatch._id);
          }
        }
      }
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert('scheduled_update_targets', value);
    return await ctx.db.get(id);
  },
});

export const scheduleBatch = mutation({
  args: { batchId: v.string(), scheduledTime: v.number() },
  handler: async (
    ctx,
    args
  ): Promise<{
    schedulerJobId: Id<'_scheduled_functions'>;
    scheduledTime: number;
  }> => {
    const ownerUserToken = await requireOwner(ctx);
    if (args.scheduledTime <= Date.now()) throw new Error('Scheduled time must be in the future');
    const batch = await getBatch(ctx, ownerUserToken, args.batchId);
    if (!batch) throw new Error('Scheduled batch not found');
    const targets = await ctx.db
      .query('scheduled_update_targets')
      .withIndex('by_ownerUserToken_and_batchId', (q) =>
        q.eq('ownerUserToken', ownerUserToken).eq('batchId', args.batchId)
      )
      .take(MAX_BATCH_TARGETS + 1);
    if (targets.length === 0) throw new Error('Cannot schedule an empty batch');
    if (targets.length > MAX_BATCH_TARGETS) throw new Error('Scheduled batch is too large');
    await cancelSchedulerJob(ctx, batch.schedulerJobId);
    const scheduleToken = `${Date.now()}:${args.scheduledTime}`;
    const schedulerJobId: Id<'_scheduled_functions'> = await ctx.scheduler.runAt(
      args.scheduledTime,
      internal.scheduled_updates.publishScheduledBatch,
      { batchDocumentId: batch._id, scheduleToken }
    );
    const now = Date.now();
    await ctx.db.patch(batch._id, {
      state: 'scheduled',
      scheduledTime: args.scheduledTime,
      schedulerJobId,
      scheduleToken,
      updatedAt: now,
    });
    for (const target of targets) {
      await ctx.db.patch(target._id, { scheduledTime: args.scheduledTime, updatedAt: now });
    }
    return { schedulerJobId, scheduledTime: args.scheduledTime };
  },
});

export const publishBatchNow = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const ownerUserToken = await requireOwner(ctx);
    const batch = await getBatch(ctx, ownerUserToken, args.batchId);
    if (!batch) throw new Error('Scheduled batch not found');
    await cancelSchedulerJob(ctx, batch.schedulerJobId);
    return await publishBatch(ctx, batch._id);
  },
});

export const cancelBatch = mutation({
  args: { batchId: v.string() },
  handler: async (ctx, args) => {
    const ownerUserToken = await requireOwner(ctx);
    const batch = await getBatch(ctx, ownerUserToken, args.batchId);
    if (!batch) return { canceled: 0 };
    await cancelSchedulerJob(ctx, batch.schedulerJobId);
    const targets = await ctx.db
      .query('scheduled_update_targets')
      .withIndex('by_ownerUserToken_and_batchId', (q) =>
        q.eq('ownerUserToken', ownerUserToken).eq('batchId', args.batchId)
      )
      .take(MAX_BATCH_TARGETS + 1);
    if (targets.length > MAX_BATCH_TARGETS) throw new Error('Scheduled batch is too large');
    for (const target of targets) await ctx.db.delete(target._id);
    await ctx.db.delete(batch._id);
    return { canceled: targets.length };
  },
});

export const publishScheduledBatch = internalMutation({
  args: {
    batchDocumentId: v.id('scheduled_update_batches'),
    scheduleToken: v.string(),
  },
  handler: async (ctx, args) => {
    return await publishBatch(ctx, args.batchDocumentId, args.scheduleToken);
  },
});
