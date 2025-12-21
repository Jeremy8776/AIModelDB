import React from 'react'
import AIModelDBPro from './AIModelDBPro'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { TitleBar } from './components/TitleBar';

export default function App() {
	return (
		<GlobalErrorBoundary>
			<TitleBar />
			<AIModelDBPro />
		</GlobalErrorBoundary>
	);
}
