import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import './styles/tailwind.css'

try {
	const storedTheme = window.localStorage.getItem('avikontex-theme')

	if (storedTheme === 'dark' || storedTheme === 'light') {
		document.documentElement.dataset.theme = storedTheme
	}
} catch {
	// Ignore storage access issues and fall back to the default theme.
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

void import('./App').then(({ default: App }) => {
	root.render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	)
})
