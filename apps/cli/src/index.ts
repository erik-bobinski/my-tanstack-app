import { createCliRenderer, Text } from '@opentui/core';

const renderer = await createCliRenderer({
	useAlternateScreen: false,
	useMouse: false,
	useKittyKeyboard: null
});

renderer.root.add(
	Text({
		content: "Hello from OpenTUI! Press 'q' to quit.",
		fg: '#7c3aed'
	})
);

if (process.stdin.isTTY) {
	const stdin = process.stdin;

	const cleanup = () => {
		try {
			renderer.destroy();
		} catch {
			// Ignore if renderer already destroyed
		}
		try {
			// Best-effort terminal reset for macOS
			Bun.spawn(['/bin/stty', 'sane'], {
				stdin: 'ignore',
				stdout: 'ignore',
				stderr: 'ignore'
			});
		} catch {
			// Ignore if stty isn't available
		}
	};

	const exit = (code = 0) => {
		cleanup();
		process.exit(code);
	};

	process.on('SIGINT', () => exit(0));
	process.on('SIGTERM', () => exit(0));
	process.on('uncaughtException', () => exit(1));
	process.on('unhandledRejection', () => exit(1));
	process.on('exit', cleanup);

	stdin.on('data', (data) => {
		const key = data.toString('utf8');
		if (key === 'q' || key === '\u0003') {
			exit(0);
		}
	});
}
