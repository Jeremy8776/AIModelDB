import React from 'react'
import AIModelDBPro from './AIModelDBPro'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

export default function App() {
	return (
		<GlobalErrorBoundary>
			<AIModelDBPro />
		</GlobalErrorBoundary>
	);
}
