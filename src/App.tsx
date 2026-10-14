import React, { useEffect } from 'react'
import AIModelDB from './AIModelDB'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

export default function App() {
	// Tell the Electron main process the first React commit has happened so it can
	// reveal the window (it stays hidden until then, so there is no empty page).
	useEffect(() => {
		window.electronAPI?.signalReady?.();
	}, []);

	return (
		<GlobalErrorBoundary>
			<AIModelDB />
		</GlobalErrorBoundary>
	);
}
