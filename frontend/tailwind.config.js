/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0f111a',
                    800: '#1a1d27',
                    700: '#2b2f3a',
                    600: '#3d4455'
                },
                primary: {
                    500: '#3b82f6',
                    400: '#60a5fa'
                },
                success: '#10b981',
                error: '#ef4444',
            }
        },
    },
    plugins: [],
}
