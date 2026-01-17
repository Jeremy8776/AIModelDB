import React from 'react'
import AIModelDB from './AIModelDB'
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

export default function App() {
	return (
		<GlobalErrorBoundary>
			<AIModelDB />
		</GlobalErrorBoundary>
	);
}
