/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Carton paper ground — cool, faintly green, readable under stockroom light.
        paper: '#EFF1EA',
        card: '#FBFCF8',
        // Date-stamp ink.
        ink: '#16201B',
        muted: '#5E6B62',
        line: '#D6DACE',
        // Stage colors. Always paired with a text label, never color alone.
        expired: '#8E1F2F',
        urgent: '#C24E00',
        soon: '#8A6D0B',
        ok: '#2F6B4F',
        expiredSoft: '#F3DEE0',
        urgentSoft: '#F8E4D3',
        soonSoft: '#F3EBD1',
        okSoft: '#DDEAE2',
      },
      fontFamily: {
        display: ['Archivo_700Bold'],
        semibold: ['Archivo_600SemiBold'],
        body: ['Archivo_400Regular'],
        medium: ['Archivo_500Medium'],
        stamp: ['IBMPlexMono_500Medium'],
        stampBold: ['IBMPlexMono_600SemiBold'],
      },
    },
  },
  plugins: [],
};
