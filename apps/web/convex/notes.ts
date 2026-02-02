import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Query: Get all notes (sorted by creation time, newest first)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notes").order("desc").collect();
  },
});

// Mutation: Add a new note
export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

// Mutation: Delete a note
export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
