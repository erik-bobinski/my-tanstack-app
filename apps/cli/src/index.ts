import {
  createCliRenderer,
  Text,
  Box,
  ScrollBox,
  Input,
  Select,
  type InputRenderable,
  type ScrollBoxRenderable,
  type TextRenderable,
  type SelectRenderable,
  type Renderable,
  type BoxRenderable,
  SelectRenderableEvents,
  InputRenderableEvents,
} from "@opentui/core";
import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MODELS, DEFAULT_MODEL, getModelName } from "@my-tanstack-app/shared";

// ── Helpers ────────────────────────────────────────────────────────
function findById<T extends Renderable>(
  parent: Renderable,
  id: string
): T | null {
  const found = parent.findDescendantById(id);
  return (found as T) ?? null;
}

// ── Configuration ──────────────────────────────────────────────────
const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Missing VITE_CONVEX_URL environment variable.");
  console.error("Add it to .env.local at the repo root.");
  process.exit(1);
}

// ── State ──────────────────────────────────────────────────────────
let currentConversationId: Id<"conversations"> | null = null;
let selectedModel = DEFAULT_MODEL;
let conversations: any[] = [];
let messages: any[] = [];
let messageUnsubscribe: (() => void) | null = null;
let mode: "chat" | "conversations" | "models" = "chat";

// ── Convex Client ──────────────────────────────────────────────────
const client = new ConvexClient(CONVEX_URL);

// ── Key matching (supports CSI u + legacy) ─────────────────────────
function isKey(sequence: string, char: string, modifier: "ctrl" | "alt"): boolean {
  const code = char.charCodeAt(0);
  const mod = modifier === "ctrl" ? 5 : 3;
  if (sequence === `\x1b[${code};${mod}u`) return true;
  if (modifier === "ctrl" && sequence === String.fromCharCode(code & 0x1f)) return true;
  if (modifier === "alt" && (sequence === `\x1b${char}` || sequence === `\x1b${char.toUpperCase()}`)) return true;
  return false;
}

// ── Global key handler ─────────────────────────────────────────────
function globalInputHandler(sequence: string): boolean {
  if (isKey(sequence, "c", "ctrl")) {
    cleanup();
    return true;
  }
  if (isKey(sequence, "c", "alt")) {
    if (mode === "conversations") showMode("chat");
    else showMode("conversations");
    return true;
  }
  if (isKey(sequence, "m", "alt")) {
    if (mode === "models") showMode("chat");
    else showMode("models");
    return true;
  }
  if (mode !== "chat") {
    if (isKey(sequence, "q", "alt") || sequence === "q") {
      showMode("chat");
      return true;
    }
  }
  return false;
}

// ── Renderer ───────────────────────────────────────────────────────
const renderer = await createCliRenderer({
  useAlternateScreen: true,
  useMouse: true,
  useKittyKeyboard: null,
  exitOnCtrlC: false,
  prependInputHandlers: [globalInputHandler],
});

// ── Layout ─────────────────────────────────────────────────────────

// Header
const header = Box(
  {
    width: "100%",
    height: 1,
    backgroundColor: "#7c3aed",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 1,
    paddingRight: 1,
  },
  Text({ content: "AI Chat", fg: "#ffffff" }),
  Text({
    id: "model-label",
    content: `Model: ${getModelName(selectedModel)}`,
    fg: "#e0e0e0",
  })
);

// Status bar
const statusBar = Box(
  {
    id: "status-bar",
    width: "100%",
    height: 1,
    backgroundColor: "#1e1e2e",
    paddingLeft: 1,
    paddingRight: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  Text({
    id: "status-text",
    content: "Alt+C: conversations | Alt+M: models | Ctrl+C: quit",
    fg: "#888888",
  }),
  Text({
    id: "conv-label",
    content: "No conversation",
    fg: "#888888",
  })
);

// ── Chat panel ─────────────────────────────────────────────────────
const chatPanel = Box(
  {
    id: "chat-panel",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
  },
  ScrollBox({
    id: "messages-scroll",
    width: "100%",
    flexGrow: 1,
    stickyScroll: true,
    stickyStart: "bottom",
    scrollY: true,
    backgroundColor: "#1e1e2e",
    contentOptions: { flexDirection: "column", width: "100%" },
  }),
  Box(
    {
      width: "100%",
      height: 1,
      backgroundColor: "#2a2a3e",
      flexDirection: "row",
      paddingLeft: 1,
    },
    Text({ content: "> ", fg: "#7c3aed" }),
    Input({
      id: "chat-input",
      flexGrow: 1,
      backgroundColor: "#2a2a3e",
      textColor: "#e0e0e0",
      focusedBackgroundColor: "#2a2a3e",
      focusedTextColor: "#ffffff",
      placeholder: "Type a message...",
      placeholderColor: "#555555",
    })
  )
);

// ── Conversations panel ────────────────────────────────────────────
const conversationsPanel = Box(
  {
    id: "conversations-panel",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
    visible: false,
  },
  Box(
    {
      width: "100%",
      height: 1,
      backgroundColor: "#2a2a3e",
      paddingLeft: 1,
    },
    Text({ content: "Select a conversation (q to go back):", fg: "#e0e0e0" })
  ),
  Select({
    id: "conversation-select",
    width: "100%",
    flexGrow: 1,
    backgroundColor: "#1e1e2e",
    textColor: "#e0e0e0",
    focusedBackgroundColor: "#7c3aed",
    focusedTextColor: "#ffffff",
    selectedBackgroundColor: "#3a3a5e",
    selectedTextColor: "#ffffff",
    showDescription: true,
    descriptionColor: "#888888",
    options: [{ name: "+ New Conversation", description: "Create a new chat" }],
  })
);

// ── Models panel ───────────────────────────────────────────────────
const modelsPanel = Box(
  {
    id: "models-panel",
    width: "100%",
    flexGrow: 1,
    flexDirection: "column",
    visible: false,
  },
  Box(
    {
      width: "100%",
      height: 1,
      backgroundColor: "#2a2a3e",
      paddingLeft: 1,
    },
    Text({ content: "Select a model (q to go back):", fg: "#e0e0e0" })
  ),
  Select({
    id: "model-select",
    width: "100%",
    flexGrow: 1,
    backgroundColor: "#1e1e2e",
    textColor: "#e0e0e0",
    focusedBackgroundColor: "#7c3aed",
    focusedTextColor: "#ffffff",
    selectedBackgroundColor: "#3a3a5e",
    selectedTextColor: "#ffffff",
    showDescription: true,
    descriptionColor: "#888888",
    options: MODELS.map((m) => ({
      name: m.name,
      description: m.provider,
      value: m.id,
    })),
  })
);

// ── Main container (all panels live here permanently) ──────────────
const mainContainer = Box(
  {
    id: "main",
    width: "100%",
    height: "100%",
    flexDirection: "column",
  },
  header,
  chatPanel,
  conversationsPanel,
  modelsPanel,
  statusBar
);

renderer.root.add(mainContainer);

// ── Mode switching (visibility toggle, no add/remove) ──────────────
function showMode(newMode: "chat" | "conversations" | "models") {
  mode = newMode;

  const cp = findById<BoxRenderable>(renderer.root, "chat-panel");
  const cvp = findById<BoxRenderable>(renderer.root, "conversations-panel");
  const mp = findById<BoxRenderable>(renderer.root, "models-panel");
  const statusText = findById<TextRenderable>(renderer.root, "status-text");

  if (cp) cp.visible = newMode === "chat";
  if (cvp) cvp.visible = newMode === "conversations";
  if (mp) mp.visible = newMode === "models";

  if (newMode === "chat") {
    if (statusText) statusText.content = "Alt+C: conversations | Alt+M: models | Ctrl+C: quit";
    const input = findById<InputRenderable>(renderer.root, "chat-input");
    if (input) input.focus();
  } else if (newMode === "conversations") {
    if (statusText) statusText.content = "Enter: select | q: back | Alt+C: back | Ctrl+C: quit";
    const sel = findById<SelectRenderable>(renderer.root, "conversation-select");
    if (sel) sel.focus();
  } else {
    if (statusText) statusText.content = "Enter: select | q: back | Alt+M: back | Ctrl+C: quit";
    const sel = findById<SelectRenderable>(renderer.root, "model-select");
    if (sel) sel.focus();
  }
}

// ── Message rendering ──────────────────────────────────────────────
function renderMessages() {
  const scroll = findById<ScrollBoxRenderable>(renderer.root, "messages-scroll");
  if (!scroll) return;

  const children = scroll.getChildren();
  for (const child of [...children]) {
    scroll.remove(child.id);
  }

  if (messages.length === 0) {
    scroll.add(
      Text({
        content: "  No messages yet. Type something to start chatting!",
        fg: "#555555",
        paddingTop: 1,
        width: "100%",
      })
    );
    return;
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isUser = msg.role === "user";
    const roleLabel = isUser ? " You " : " AI ";
    const roleColor = isUser ? "#7c3aed" : "#10b981";
    const streamingIndicator = msg.isStreaming ? " ..." : "";
    const modelTag = !isUser && msg.model ? ` [${getModelName(msg.model)}]` : "";

    scroll.add(
      Box(
        { id: `msg-${i}`, width: "100%", flexDirection: "column", paddingLeft: 1, paddingRight: 1 },
        Text({ content: `${roleLabel}${modelTag}${streamingIndicator}`, fg: roleColor }),
        Text({ content: msg.content || (msg.isStreaming ? "" : "(empty)"), fg: "#e0e0e0", width: "100%", paddingLeft: 2 })
      )
    );
  }
}

// ── Update conversation list UI ────────────────────────────────────
function updateConversationSelectOptions() {
  const sel = findById<SelectRenderable>(renderer.root, "conversation-select");
  if (!sel) return;

  sel.options = [
    { name: "+ New Conversation", description: "Create a new chat", value: "__new__" },
    ...conversations.map((c: any) => ({
      name: c.title,
      description: `Model: ${getModelName(c.model)} | ${new Date(c.createdAt).toLocaleString()}`,
      value: c._id,
    })),
  ];
}

// ── Convex subscriptions ───────────────────────────────────────────
client.onUpdate(api.conversations.list, {}, (result: any) => {
  conversations = result ?? [];
  updateConversationSelectOptions();

  const label = findById<TextRenderable>(renderer.root, "conv-label");
  if (label && currentConversationId) {
    const conv = conversations.find((c: any) => c._id === currentConversationId);
    if (conv) label.content = conv.title;
  }
});

function subscribeToMessages(conversationId: Id<"conversations">) {
  if (messageUnsubscribe) messageUnsubscribe();
  messageUnsubscribe = client.onUpdate(
    api.messages.list,
    { conversationId },
    (result: any) => {
      messages = result ?? [];
      if (mode === "chat") renderMessages();
    }
  );
}

// ── Select conversation ────────────────────────────────────────────
async function selectConversation(conversationId: Id<"conversations">) {
  currentConversationId = conversationId;
  const conv = conversations.find((c: any) => c._id === conversationId);
  if (conv) {
    selectedModel = conv.model;
    const modelLabel = findById<TextRenderable>(renderer.root, "model-label");
    if (modelLabel) modelLabel.content = `Model: ${getModelName(selectedModel)}`;
    const convLabel = findById<TextRenderable>(renderer.root, "conv-label");
    if (convLabel) convLabel.content = conv.title;
  }
  subscribeToMessages(conversationId);
  showMode("chat");
}

// ── Send message ───────────────────────────────────────────────────
async function sendMessage(content: string) {
  if (!content.trim()) return;

  if (!currentConversationId) {
    const title = content.length > 30 ? content.substring(0, 30) + "..." : content;
    currentConversationId = await client.mutation(api.conversations.create, {
      title,
      model: selectedModel,
    });
    subscribeToMessages(currentConversationId);
    const convLabel = findById<TextRenderable>(renderer.root, "conv-label");
    if (convLabel) convLabel.content = title;
  }

  client.action(api.chat.send, {
    conversationId: currentConversationId,
    content: content.trim(),
    model: selectedModel,
  });
}

// ── Wire up events ONCE (all elements are in the tree from the start) ──
setTimeout(() => {
  // Chat input
  const inputEl = findById<InputRenderable>(renderer.root, "chat-input");
  if (inputEl) {
    inputEl.on(InputRenderableEvents.ENTER, () => {
      const value = inputEl.value;
      if (value.trim()) {
        sendMessage(value);
        inputEl.value = "";
      }
    });
  }

  // Conversation select
  const convSel = findById<SelectRenderable>(renderer.root, "conversation-select");
  if (convSel) {
    convSel.on(SelectRenderableEvents.ITEM_SELECTED, () => {
      const selected = convSel.getSelectedOption();
      if (!selected) return;
      if (selected.value === "__new__") {
        currentConversationId = null;
        messages = [];
        showMode("chat");
        const convLabel = findById<TextRenderable>(renderer.root, "conv-label");
        if (convLabel) convLabel.content = "New conversation";
      } else {
        selectConversation(selected.value as Id<"conversations">);
      }
    });
  }

  // Model select
  const modSel = findById<SelectRenderable>(renderer.root, "model-select");
  if (modSel) {
    modSel.on(SelectRenderableEvents.ITEM_SELECTED, () => {
      const selected = modSel.getSelectedOption();
      if (!selected?.value) return;
      selectedModel = selected.value;
      const modelLabel = findById<TextRenderable>(renderer.root, "model-label");
      if (modelLabel) modelLabel.content = `Model: ${getModelName(selectedModel)}`;
      if (currentConversationId) {
        client.mutation(api.conversations.updateModel, {
          id: currentConversationId,
          model: selectedModel,
        });
      }
      showMode("chat");
    });
  }
}, 50);

// ── Cleanup ────────────────────────────────────────────────────────
function cleanup() {
  if (messageUnsubscribe) messageUnsubscribe();
  client.close();
  renderer.destroy();
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// ── Start ──────────────────────────────────────────────────────────
showMode("chat");
