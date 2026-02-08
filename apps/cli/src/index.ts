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
	InputRenderableEvents
} from '@opentui/core';
import { ConvexClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { MODELS, DEFAULT_MODEL, getModelName } from '@my-tanstack-app/shared';
import hljs from 'highlight.js';

// ── Theme ──────────────────────────────────────────────────────────
const THEME = {
	bgMain: '#1a1a2e',
	bgSidebar: '#141424',
	bgSurface: '#242438',
	bgInput: '#2a2a40',
	bgUserBubble: '#2d2854',
	bgCode: '#1e1e30',
	border: '#2e2e44',
	accent: '#8b7ec8',
	accentHover: '#9d92d4',
	accentDim: '#6b5f9e',
	textPrimary: '#e2e0ea',
	textSecondary: '#9896a8',
	textMuted: '#5e5c6e',
	aiLabel: '#6ec9a0'
} as const;

// ── Helpers ────────────────────────────────────────────────────────
function findById<T extends Renderable>(parent: Renderable, id: string): T | null {
	const found = parent.findDescendantById(id);
	return (found as T) ?? null;
}

/** Parse message content into segments of plain text and fenced code blocks */
function parseCodeBlocks(
	content: string
): Array<{ type: 'text' | 'code'; content: string; lang?: string }> {
	const segments: Array<{
		type: 'text' | 'code';
		content: string;
		lang?: string;
	}> = [];
	const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
	let lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = codeBlockRegex.exec(content)) !== null) {
		// Text before this code block
		if (match.index > lastIndex) {
			const text = content.slice(lastIndex, match.index).trim();
			if (text) segments.push({ type: 'text', content: text });
		}
		segments.push({
			type: 'code',
			content: match[2].trimEnd(),
			lang: match[1] || undefined
		});
		lastIndex = match.index + match[0].length;
	}

	// Remaining text after last code block
	const remaining = content.slice(lastIndex).trim();
	if (remaining) segments.push({ type: 'text', content: remaining });

	return segments;
}

// ── Syntax highlighting (github-dark-dimmed via highlight.js) ───────
interface ColoredSegment {
	text: string;
	fg: string;
}

/** github-dark-dimmed class → hex color mapping */
const HLJS_COLORS: Record<string, string> = {
	'hljs-keyword': '#f47067',
	'hljs-doctag': '#f47067',
	'hljs-template-tag': '#f47067',
	'hljs-template-variable': '#f47067',
	'hljs-type': '#f47067',
	'hljs-variable language_': '#f47067',
	'hljs-title': '#dcbdfb',
	'hljs-title class_': '#dcbdfb',
	'hljs-title function_': '#dcbdfb',
	'hljs-attr': '#6cb6ff',
	'hljs-attribute': '#6cb6ff',
	'hljs-literal': '#6cb6ff',
	'hljs-meta': '#6cb6ff',
	'hljs-number': '#6cb6ff',
	'hljs-operator': '#6cb6ff',
	'hljs-variable': '#6cb6ff',
	'hljs-selector-attr': '#6cb6ff',
	'hljs-selector-class': '#6cb6ff',
	'hljs-selector-id': '#6cb6ff',
	'hljs-regexp': '#96d0ff',
	'hljs-string': '#96d0ff',
	'hljs-built_in': '#f69d50',
	'hljs-symbol': '#f69d50',
	'hljs-comment': '#768390',
	'hljs-code': '#768390',
	'hljs-formula': '#768390',
	'hljs-name': '#8ddb8c',
	'hljs-quote': '#8ddb8c',
	'hljs-selector-tag': '#8ddb8c',
	'hljs-selector-pseudo': '#8ddb8c',
	'hljs-section': '#316dca',
	'hljs-bullet': '#eac55f',
	'hljs-addition': '#b4f1b4',
	'hljs-deletion': '#ffd8d3'
};

function classToColor(cls: string): string | undefined {
	if (HLJS_COLORS[cls]) return HLJS_COLORS[cls];
	// Try partial matches for compound classes like "title function_"
	for (const [key, val] of Object.entries(HLJS_COLORS)) {
		if (cls.includes(key.replace('hljs-', ''))) return val;
	}
	return undefined;
}

/** Decode HTML entities from highlight.js output */
function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/&#39;/g, "'");
}

/** Parse highlight.js HTML output into colored segments */
function parseHljsHtml(html: string, defaultFg: string): ColoredSegment[] {
	const segments: ColoredSegment[] = [];
	const colorStack: string[] = [defaultFg];

	const tagRegex = /<span class="([^"]*?)">|<\/span>|([^<]+)/g;
	let m: RegExpExecArray | null;

	while ((m = tagRegex.exec(html)) !== null) {
		if (m[1] !== undefined) {
			// Opening <span class="...">
			const color = classToColor(m[1]) ?? colorStack[colorStack.length - 1];
			colorStack.push(color);
		} else if (m[0] === '</span>') {
			// Closing </span>
			if (colorStack.length > 1) colorStack.pop();
		} else if (m[2] !== undefined) {
			// Text content
			const text = decodeEntities(m[2]);
			if (text) segments.push({ text, fg: colorStack[colorStack.length - 1] });
		}
	}

	return segments;
}

/** Highlight code and return per-line arrays of colored segments */
function highlightCodeToLines(code: string, lang?: string): ColoredSegment[][] {
	let html: string;
	try {
		if (lang && hljs.getLanguage(lang)) {
			html = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
		} else {
			html = hljs.highlightAuto(code).value;
		}
	} catch {
		html = code;
	}
	return html.split('\n').map((line) => {
		const segs = parseHljsHtml(line, THEME.textSecondary);
		return segs.length > 0 ? segs : [{ text: '', fg: THEME.textSecondary }];
	});
}

/** Inline segment with optional background */
interface InlineSegment {
	text: string;
	fg: string;
	bg?: string;
}

/** Parse inline formatting: `code`, **bold**, *italic* */
function parseInlineFormatting(text: string, defaultFg: string): InlineSegment[] {
	const segments: InlineSegment[] = [];
	// Match: `code`, **bold**, *italic* (in priority order)
	const regex = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
	let lastIndex = 0;
	let m: RegExpExecArray | null;

	while ((m = regex.exec(text)) !== null) {
		if (m.index > lastIndex) {
			segments.push({ text: text.slice(lastIndex, m.index), fg: defaultFg });
		}
		if (m[1] !== undefined) {
			// Inline code
			segments.push({ text: ` ${m[1]} `, fg: THEME.accentHover, bg: THEME.bgInput });
		} else if (m[2] !== undefined) {
			// Bold — render brighter
			segments.push({ text: m[2], fg: '#ffffff' });
		} else if (m[3] !== undefined) {
			// Italic — render dimmer
			segments.push({ text: m[3], fg: THEME.textSecondary });
		}
		lastIndex = m.index + m[0].length;
	}

	if (lastIndex < text.length) {
		segments.push({ text: text.slice(lastIndex), fg: defaultFg });
	}

	return segments;
}

/** Parsed markdown line with type info */
interface MarkdownLine {
	type: 'heading' | 'bullet' | 'numbered' | 'paragraph' | 'blank';
	level?: number; // heading level (1-4) or list number
	content: string;
}

/** Parse a text block into structured markdown lines */
function parseMarkdownLines(text: string): MarkdownLine[] {
	const lines = text.split('\n');
	const result: MarkdownLine[] = [];

	for (const raw of lines) {
		const trimmed = raw.trim();

		if (trimmed === '') {
			result.push({ type: 'blank', content: '' });
		} else if (trimmed.startsWith('#### ')) {
			result.push({ type: 'heading', level: 4, content: trimmed.slice(5) });
		} else if (trimmed.startsWith('### ')) {
			result.push({ type: 'heading', level: 3, content: trimmed.slice(4) });
		} else if (trimmed.startsWith('## ')) {
			result.push({ type: 'heading', level: 2, content: trimmed.slice(3) });
		} else if (trimmed.startsWith('# ')) {
			result.push({ type: 'heading', level: 1, content: trimmed.slice(2) });
		} else if (/^[-*]\s/.test(trimmed)) {
			result.push({ type: 'bullet', content: trimmed.slice(2) });
		} else if (/^\d+\.\s/.test(trimmed)) {
			const match = trimmed.match(/^(\d+)\.\s(.*)$/);
			if (match) {
				result.push({ type: 'numbered', level: parseInt(match[1]), content: match[2] });
			} else {
				result.push({ type: 'paragraph', content: trimmed });
			}
		} else {
			result.push({ type: 'paragraph', content: trimmed });
		}
	}

	return result;
}

/** Render a markdown text block into OpenTUI children */
function renderMarkdownText(text: string, idPrefix: string): any[] {
	const mdLines = parseMarkdownLines(text);
	const children: any[] = [];

	for (let ln = 0; ln < mdLines.length; ln++) {
		const line = mdLines[ln];
		const lineId = `${idPrefix}-ln-${ln}`;

		if (line.type === 'blank') {
			children.push(Text({ id: lineId, content: '', height: 1, width: '100%' }));
			continue;
		}

		let prefix = '';
		let fg: string = THEME.textPrimary;
		let indent = 2;

		switch (line.type) {
			case 'heading':
				fg = THEME.accent;
				prefix = '';
				indent = 2;
				break;
			case 'bullet':
				prefix = '  • ';
				indent = 2;
				break;
			case 'numbered':
				prefix = `  ${line.level}. `;
				indent = 2;
				break;
			case 'paragraph':
				break;
		}

		const inlineSegs = parseInlineFormatting(line.content, fg);

		if (prefix) {
			children.push(
				Box(
					{
						id: lineId,
						width: '100%',
						flexDirection: 'row',
						paddingLeft: indent,
						flexWrap: 'wrap'
					},
					Text({ content: prefix, fg: line.type === 'heading' ? THEME.accent : THEME.textMuted }),
					...inlineSegs.map((tok, t) =>
						Text({
							id: `${lineId}-t-${t}`,
							content: tok.text,
							fg: tok.fg,
							...(tok.bg ? { backgroundColor: tok.bg } : {})
						})
					)
				)
			);
		} else {
			children.push(
				Box(
					{
						id: lineId,
						width: '100%',
						flexDirection: 'row',
						paddingLeft: indent,
						flexWrap: 'wrap'
					},
					...inlineSegs.map((tok, t) =>
						Text({
							id: `${lineId}-t-${t}`,
							content: tok.text,
							fg: tok.fg,
							...(tok.bg ? { backgroundColor: tok.bg } : {})
						})
					)
				)
			);
		}
	}

	return children;
}

// ── Configuration ──────────────────────────────────────────────────
const CONVEX_URL = process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
	console.error('Missing VITE_CONVEX_URL environment variable.');
	console.error('Add it to .env.local at the repo root.');
	process.exit(1);
}

// ── State ──────────────────────────────────────────────────────────
let currentConversationId: Id<'conversations'> | null = null;
let selectedModel = DEFAULT_MODEL;
let conversations: any[] = [];
let messages: any[] = [];
let messageUnsubscribe: (() => void) | null = null;
let openModal: 'conversations' | 'models' | null = null;

// ── Convex Client ──────────────────────────────────────────────────
const client = new ConvexClient(CONVEX_URL);

// ── Key matching (supports CSI u + legacy) ─────────────────────────
function isKey(sequence: string, char: string, modifier: 'ctrl' | 'alt'): boolean {
	const code = char.charCodeAt(0);
	const mod = modifier === 'ctrl' ? 5 : 3;
	// CSI u format — always safe
	if (sequence === `\x1b[${code};${mod}u`) return true;
	// Legacy ctrl format — skip codes that collide with Enter(\r), Tab(\t), Backspace(\b), Newline(\n)
	if (modifier === 'ctrl') {
		const ctrlByte = code & 0x1f;
		if (ctrlByte !== 0x0d && ctrlByte !== 0x09 && ctrlByte !== 0x08 && ctrlByte !== 0x0a) {
			if (sequence === String.fromCharCode(ctrlByte)) return true;
		}
	}
	if (
		modifier === 'alt' &&
		(sequence === `\x1b${char}` || sequence === `\x1b${char.toUpperCase()}`)
	)
		return true;
	return false;
}

// ── Global key handler ─────────────────────────────────────────────
function globalInputHandler(sequence: string): boolean {
	if (isKey(sequence, 'c', 'ctrl')) {
		cleanup();
		return true;
	}
	// Tab — toggle conversations modal
	if (sequence === '\t') {
		toggleModal(openModal === 'conversations' ? null : 'conversations');
		return true;
	}
	// Ctrl+K — toggle models modal
	if (isKey(sequence, 'k', 'ctrl')) {
		toggleModal(openModal === 'models' ? null : 'models');
		return true;
	}
	// Esc — close any open modal
	if (openModal !== null) {
		if (sequence === '\x1b' || sequence === '\x1b[27u' || sequence === '\x1b[27;1u') {
			toggleModal(null);
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
	prependInputHandlers: [globalInputHandler]
});

// ── Layout ─────────────────────────────────────────────────────────

// Header
const header = Box(
	{
		width: '100%',
		height: 1,
		backgroundColor: THEME.accent,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingLeft: 1,
		paddingRight: 1
	},
	Text({ content: 'AI Chat', fg: '#ffffff' }),
	Text({
		id: 'model-label',
		content: `Model: ${getModelName(selectedModel)}`,
		fg: '#ffffff'
	})
);

// Status bar
const statusBar = Box(
	{
		id: 'status-bar',
		width: '100%',
		height: 1,
		backgroundColor: THEME.bgSidebar,
		paddingLeft: 1,
		paddingRight: 1,
		flexDirection: 'row',
		justifyContent: 'space-between'
	},
	Text({
		id: 'status-text',
		content: 'Tab: conversations | Ctrl+K: models | Esc: close | Ctrl+C: quit',
		fg: THEME.textMuted
	}),
	Text({
		id: 'conv-label',
		content: 'No conversation',
		fg: THEME.textMuted
	})
);

// ── Chat panel ─────────────────────────────────────────────────────
const chatPanel = Box(
	{
		id: 'chat-panel',
		width: '100%',
		flexGrow: 1,
		flexDirection: 'column'
	},
	ScrollBox({
		id: 'messages-scroll',
		width: '100%',
		flexGrow: 1,
		stickyScroll: true,
		stickyStart: 'bottom',
		scrollY: true,
		backgroundColor: THEME.bgMain,
		contentOptions: { flexDirection: 'column', width: '100%' }
	}),
	Box(
		{
			width: '100%',
			height: 1,
			backgroundColor: THEME.bgInput,
			flexDirection: 'row',
			paddingLeft: 1
		},
		Text({ content: '> ', fg: THEME.accent }),
		Input({
			id: 'chat-input',
			flexGrow: 1,
			backgroundColor: THEME.bgInput,
			textColor: THEME.textPrimary,
			focusedBackgroundColor: THEME.bgInput,
			focusedTextColor: '#ffffff',
			placeholder: 'Type a message...',
			placeholderColor: THEME.textMuted
		})
	)
);

// ── Conversations modal (absolute overlay) ─────────────────────────
const conversationsModal = Box(
	{
		id: 'conversations-modal',
		position: 'absolute',
		width: '50%',
		height: '50%',
		top: '20%',
		left: '25%',
		zIndex: 10,
		flexDirection: 'column',
		backgroundColor: THEME.bgSurface,
		padding: 1,
		visible: false,
	},
	Box(
		{
			width: '100%',
			height: 1,
			flexDirection: 'row',
			paddingLeft: 1,
			marginBottom: 1,
		},
		Text({ content: 'Conversations  ', fg: THEME.accent }),
		Text({ content: '(Esc to close)', fg: THEME.textMuted }),
	),
	Select({
		id: 'conversation-select',
		width: '100%',
		flexGrow: 1,
		backgroundColor: THEME.bgSurface,
		textColor: THEME.textSecondary,
		focusedBackgroundColor: THEME.bgSurface,
		focusedTextColor: THEME.textPrimary,
		selectedBackgroundColor: THEME.accent,
		selectedTextColor: '#ffffff',
		showDescription: true,
		descriptionColor: THEME.textMuted,
		options: [{ name: '+ New Conversation', description: 'Create a new chat' }],
	})
);

// ── Models modal (absolute overlay) ────────────────────────────────
const modelsModal = Box(
	{
		id: 'models-modal',
		position: 'absolute',
		width: '50%',
		height: '50%',
		top: '20%',
		left: '25%',
		zIndex: 10,
		flexDirection: 'column',
		backgroundColor: THEME.bgSurface,
		padding: 1,
		visible: false,
	},
	Box(
		{
			width: '100%',
			height: 1,
			flexDirection: 'row',
			paddingLeft: 1,
			marginBottom: 1,
		},
		Text({ content: 'Models  ', fg: THEME.accent }),
		Text({ content: '(Esc to close)', fg: THEME.textMuted }),
	),
	Select({
		id: 'model-select',
		width: '100%',
		flexGrow: 1,
		backgroundColor: THEME.bgSurface,
		textColor: THEME.textSecondary,
		focusedBackgroundColor: THEME.bgSurface,
		focusedTextColor: THEME.textPrimary,
		selectedBackgroundColor: THEME.accent,
		selectedTextColor: '#ffffff',
		showDescription: true,
		descriptionColor: THEME.textMuted,
		options: MODELS.map((m) => ({
			name: m.name,
			description: m.provider,
			value: m.id,
		})),
	})
);

// ── Main container ─────────────────────────────────────────────────
const mainContainer = Box(
	{
		id: 'main',
		width: '100%',
		height: '100%',
		flexDirection: 'column',
	},
	header,
	chatPanel,
	statusBar,
	conversationsModal,
	modelsModal,
);

renderer.root.add(mainContainer);

// ── Modal toggle ───────────────────────────────────────────────────
function toggleModal(target: 'conversations' | 'models' | null) {
	// Close both modals
	const cm = findById<BoxRenderable>(renderer.root, 'conversations-modal');
	const mm = findById<BoxRenderable>(renderer.root, 'models-modal');
	if (cm) cm.visible = false;
	if (mm) mm.visible = false;

	openModal = target;

	if (target === null) {
		// Refocus chat input
		const input = findById<InputRenderable>(renderer.root, 'chat-input');
		if (input) input.focus();
		return;
	}

	if (target === 'conversations') {
		if (cm) cm.visible = true;
		const sel = findById<SelectRenderable>(renderer.root, 'conversation-select');
		if (sel) {
			// Pre-highlight the active conversation
			if (currentConversationId) {
				const idx = sel.options.findIndex(
					(o: any) => o.value === currentConversationId
				);
				if (idx >= 0) sel.selectedIndex = idx;
			}
			sel.focus();
		}
	} else if (target === 'models') {
		if (mm) mm.visible = true;
		const sel = findById<SelectRenderable>(renderer.root, 'model-select');
		if (sel) {
			// Pre-highlight the active model
			const idx = sel.options.findIndex(
				(o: any) => o.value === selectedModel
			);
			if (idx >= 0) sel.selectedIndex = idx;
			sel.focus();
		}
	}
}

// ── Message rendering ──────────────────────────────────────────────
function renderMessages() {
	const scroll = findById<ScrollBoxRenderable>(renderer.root, 'messages-scroll');
	if (!scroll) return;

	const children = scroll.getChildren();
	for (const child of [...children]) {
		scroll.remove(child.id);
	}

	if (messages.length === 0) {
		scroll.add(
			Text({
				content: '  No messages yet. Type something to start chatting!',
				fg: THEME.textMuted,
				paddingTop: 1,
				width: '100%'
			})
		);
		return;
	}

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		const isUser = msg.role === 'user';
		const streamingIndicator = msg.isStreaming ? ' ...' : '';
		const modelTag = !isUser && msg.model ? ` [${getModelName(msg.model)}]` : '';

		if (isUser) {
			// User messages: boxed with distinct background
			const roleLabel = ` You `;

			// Spacing before user message (except first message)
			if (i > 0) {
				scroll.add(Text({ id: `spacer-${i}`, content: '', height: 1, width: '100%' }));
			}

			scroll.add(
				Box(
					{
						id: `msg-${i}`,
						width: '100%',
						flexDirection: 'column',
						backgroundColor: THEME.bgUserBubble,
						paddingLeft: 1,
						paddingRight: 1
					},
					Text({ content: roleLabel, fg: THEME.accent }),
					Text({
						content: msg.content || '(empty)',
						fg: THEME.textPrimary,
						width: '100%',
						paddingLeft: 2
					})
				)
			);
		} else {
			// AI messages: no box, just content on main background
			const roleLabel = ` AI ${modelTag}${streamingIndicator}`;

			// Spacing before AI message
			if (i > 0) {
				scroll.add(Text({ id: `spacer-${i}`, content: '', height: 1, width: '100%' }));
			}

			// Parse content for code blocks
			const content = msg.content || (msg.isStreaming ? '' : '(empty)');
			const segments = parseCodeBlocks(content);

			if (segments.length <= 1 && segments[0]?.type !== 'code') {
				// Simple message without code blocks — render as markdown
				const mdChildren = renderMarkdownText(content, `msg-${i}`);

				scroll.add(
					Box(
						{
							id: `msg-${i}`,
							width: '100%',
							flexDirection: 'column',
							paddingLeft: 1,
							paddingRight: 1
						},
						Text({ content: roleLabel, fg: THEME.aiLabel }),
						...mdChildren
					)
				);
			} else {
				// Message with code blocks — render segments
				const msgChildren: any[] = [Text({ content: roleLabel, fg: THEME.aiLabel })];

				for (let s = 0; s < segments.length; s++) {
					const seg = segments[s];
					if (seg.type === 'text') {
						// Render text as markdown
						const mdChildren = renderMarkdownText(seg.content, `msg-${i}-text-${s}`);
						msgChildren.push(...mdChildren);
					} else {
						// Code block with syntax highlighting via native Text colors
						const langLabel = seg.lang ? ` ${seg.lang} ` : '';
						const lines = highlightCodeToLines(seg.content, seg.lang);

						const codeChildren: any[] = [];
						if (langLabel) {
							codeChildren.push(Text({ content: langLabel, fg: THEME.textMuted }));
						}
						for (let ln = 0; ln < lines.length; ln++) {
							const lineSegs = lines[ln];
							codeChildren.push(
								Box(
									{
										id: `msg-${i}-code-${s}-ln-${ln}`,
										width: '100%',
										flexDirection: 'row'
									},
									...lineSegs.map((tok, t) =>
										Text({
											id: `msg-${i}-code-${s}-ln-${ln}-t-${t}`,
											content: tok.text,
											fg: tok.fg
										})
									)
								)
							);
						}

						msgChildren.push(
							Box(
								{
									id: `msg-${i}-code-${s}`,
									width: '100%',
									flexDirection: 'column',
									backgroundColor: THEME.bgCode,
									paddingLeft: 2,
									paddingRight: 1,
									marginLeft: 2
								},
								...codeChildren
							)
						);
					}
				}

				scroll.add(
					Box(
						{
							id: `msg-${i}`,
							width: '100%',
							flexDirection: 'column',
							paddingLeft: 1,
							paddingRight: 1
						},
						...msgChildren
					)
				);
			}
		}
	}
}

// ── Update conversation list UI ────────────────────────────────────
function updateConversationSelectOptions() {
	const sel = findById<SelectRenderable>(renderer.root, 'conversation-select');
	if (!sel) return;

	sel.options = [
		{
			name: '+ New Conversation',
			description: 'Create a new chat',
			value: '__new__'
		},
		...conversations.map((c: any) => ({
			name: c.title,
			description: `Model: ${getModelName(c.model)} | ${new Date(c.createdAt).toLocaleString()}`,
			value: c._id
		}))
	];
}

// ── Convex subscriptions ───────────────────────────────────────────
client.onUpdate(api.conversations.list, {}, (result: any) => {
	conversations = result ?? [];
	updateConversationSelectOptions();

	const label = findById<TextRenderable>(renderer.root, 'conv-label');
	if (label && currentConversationId) {
		const conv = conversations.find((c: any) => c._id === currentConversationId);
		if (conv) label.content = conv.title;
	}
});

function subscribeToMessages(conversationId: Id<'conversations'>) {
	if (messageUnsubscribe) messageUnsubscribe();
	messageUnsubscribe = client.onUpdate(api.messages.list, { conversationId }, (result: any) => {
		messages = result ?? [];
		renderMessages();
	});
}

// ── Select conversation ────────────────────────────────────────────
async function selectConversation(conversationId: Id<'conversations'>) {
	currentConversationId = conversationId;
	const conv = conversations.find((c: any) => c._id === conversationId);
	if (conv) {
		selectedModel = conv.model;
		const modelLabel = findById<TextRenderable>(renderer.root, 'model-label');
		if (modelLabel) modelLabel.content = `Model: ${getModelName(selectedModel)}`;
		const convLabel = findById<TextRenderable>(renderer.root, 'conv-label');
		if (convLabel) convLabel.content = conv.title;
	}
	subscribeToMessages(conversationId);
	toggleModal(null);
}

// ── Send message ───────────────────────────────────────────────────
async function sendMessage(content: string) {
	if (!content.trim()) return;

	if (!currentConversationId) {
		const title = content.length > 30 ? content.substring(0, 30) + '...' : content;
		currentConversationId = await client.mutation(api.conversations.create, {
			title,
			model: selectedModel
		});
		subscribeToMessages(currentConversationId);
		const convLabel = findById<TextRenderable>(renderer.root, 'conv-label');
		if (convLabel) convLabel.content = title;
	}

	client.action(api.chat.send, {
		conversationId: currentConversationId,
		content: content.trim(),
		model: selectedModel
	});
}

// ── Wire up events ONCE (all elements are in the tree from the start) ──
setTimeout(() => {
	// Chat input
	const inputEl = findById<InputRenderable>(renderer.root, 'chat-input');
	if (inputEl) {
		inputEl.on(InputRenderableEvents.ENTER, () => {
			const value = inputEl.value;
			if (value.trim()) {
				sendMessage(value);
				inputEl.value = '';
			}
		});
	}

	// Conversation select
	const convSel = findById<SelectRenderable>(renderer.root, 'conversation-select');
	if (convSel) {
		convSel.on(SelectRenderableEvents.ITEM_SELECTED, () => {
			const selected = convSel.getSelectedOption();
			if (!selected) return;
			if (selected.value === '__new__') {
				currentConversationId = null;
				messages = [];
				toggleModal(null);
				const convLabel = findById<TextRenderable>(renderer.root, 'conv-label');
				if (convLabel) convLabel.content = 'New conversation';
			} else {
				selectConversation(selected.value as Id<'conversations'>);
			}
		});
	}

	// Model select
	const modSel = findById<SelectRenderable>(renderer.root, 'model-select');
	if (modSel) {
		modSel.on(SelectRenderableEvents.ITEM_SELECTED, () => {
			const selected = modSel.getSelectedOption();
			if (!selected?.value) return;
			selectedModel = selected.value;
			const modelLabel = findById<TextRenderable>(renderer.root, 'model-label');
			if (modelLabel) modelLabel.content = `Model: ${getModelName(selectedModel)}`;
			if (currentConversationId) {
				client.mutation(api.conversations.updateModel, {
					id: currentConversationId,
					model: selectedModel
				});
			}
			toggleModal(null);
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

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// ── Start ──────────────────────────────────────────────────────────
// Focus chat input on startup
setTimeout(() => {
	const input = findById<InputRenderable>(renderer.root, 'chat-input');
	if (input) input.focus();
}, 50);
