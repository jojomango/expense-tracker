/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // UI-SPEC.md §2.1 — 顏色一律透過 CSS 變數（src/index.css 的 :root / .dark）
      // 切換淺深色，元件裡不寫死 hex。
      colors: {
        bg: 'var(--color-bg)',
        card: 'var(--color-card)',
        fg: 'var(--color-fg)',
        fg2: 'var(--color-fg2)',
        fg3: 'var(--color-fg3)',
        sep: 'var(--color-sep)',
        track: 'var(--color-track)',
        barbg: 'var(--color-barbg)',
        sheet: 'var(--color-sheet)',
        keypad: 'var(--color-keypad)',
        key: 'var(--color-key)',
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
        income: 'var(--color-income)',
      },
      // §2.3 字級
      fontSize: {
        balance: ['46px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '600' }],
        'amount-input': ['54px', { lineHeight: '1.1', letterSpacing: '-0.035em', fontWeight: '600' }],
        'title-lg': ['30px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'donut-total': ['27px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'nav-title': ['17px', { fontWeight: '600' }],
        'row-amount': ['17px', { fontWeight: '500' }],
        'row-title': ['16px', { fontWeight: '500' }],
        'card-title': ['15px', { fontWeight: '600' }],
        body: ['14px', {}],
        caption: ['13px', {}],
        label: ['12px', { fontWeight: '500' }],
        tab: ['10px', {}],
      },
      // §2.4 圓角（僅收錄有命名的 token；一次性數值直接在元件用 arbitrary value）
      borderRadius: {
        card: '20px',
        group: '16px',
        chip: '12px',
        pill: '999px',
        toast: '14px',
      },
      // §2.4 陰影
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05)',
        toast: '0 8px 24px rgba(0,0,0,0.25)',
      },
      // §2.3 系統字體堆疊，不載入 webfont
      fontFamily: {
        sans: [
          '-apple-system',
          'SF Pro Text',
          'Helvetica Neue',
          'system-ui',
          'PingFang TC',
          'sans-serif',
        ],
      },
      // §2.5 動畫
      transitionTimingFunction: {
        ios: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-in': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in 180ms ease-out',
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'backdrop-in': 'backdrop-in 260ms ease-out',
      },
    },
  },
  plugins: [],
}
