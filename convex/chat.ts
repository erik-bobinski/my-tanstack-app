"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

export const send = action({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Save the user message
    await ctx.runMutation(internal.messages.createUserMessage, {
      conversationId: args.conversationId,
      content: args.content,
    });

    // 2. Create an empty assistant message placeholder
    const assistantMessageId = await ctx.runMutation(
      internal.messages.createAssistantMessage,
      {
        conversationId: args.conversationId,
        model: args.model,
      }
    );

    // 3. Fetch all messages for context
    const messages = await ctx.runQuery(internal.messages.listInternal, {
      conversationId: args.conversationId,
    });

    const chatMessages = messages
      .filter((m) => !m.isStreaming)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // 4. Stream from OpenRouter
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      await ctx.runMutation(internal.messages.finishStreaming, {
        id: assistantMessageId,
        content: "Error: OPENROUTER_API_KEY not configured.",
      });
      return;
    }

    try {
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: args.model,
            messages: chatMessages,
            stream: true,
            max_tokens: 512,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internal.messages.finishStreaming, {
          id: assistantMessageId,
          content: `Error from OpenRouter (${response.status}): ${errorText}`,
        });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let lastUpdateTime = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }

        // Throttle DB updates to ~100ms intervals
        const now = Date.now();
        if (now - lastUpdateTime > 100) {
          await ctx.runMutation(internal.messages.updateStreaming, {
            id: assistantMessageId,
            content: fullContent,
          });
          lastUpdateTime = now;
        }
      }

      // 5. Final update - mark streaming complete
      await ctx.runMutation(internal.messages.finishStreaming, {
        id: assistantMessageId,
        content: fullContent,
      });
    } catch (error: any) {
      await ctx.runMutation(internal.messages.finishStreaming, {
        id: assistantMessageId,
        content: `Error: ${error.message ?? "Unknown error occurred"}`,
      });
    }
  },
});
