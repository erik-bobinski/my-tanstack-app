import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: { title: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("conversations", {
      title: args.title,
      model: args.model,
      createdAt: Date.now(),
    });
  },
});

export const updateModel = mutation({
  args: { id: v.id("conversations"), model: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { model: args.model });
  },
});

export const remove = mutation({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    // Delete all messages in this conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    await ctx.db.delete(args.id);
  },
});
