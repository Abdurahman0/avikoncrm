import React from 'react'
import ReactDOM from 'react-dom/client'
import { lazyRoute } from './app/routes/lazy-route'
import './i18n'
import './styles/tailwind.css'

const App = lazyRoute(() => import('./App'), 'root-app')

try {
	const storedTheme = window.localStorage.getItem('avikontex-theme')

	if (storedTheme === 'dark' || storedTheme === 'light') {
		document.documentElement.dataset.theme = storedTheme
	}
} catch {
	// Ignore storage access issues and fall back to the default theme.
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

root.render(
	<React.StrictMode>
		<React.Suspense fallback={null}>
			<App />
		</React.Suspense>
	</React.StrictMode>,
)
