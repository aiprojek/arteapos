import React from 'react';
import { LOGO_PATH } from '../constants';

// Daftar nama ikon yang digunakan dalam aplikasi
export type IconName = 
  | 'cash' | 'products' | 'reports' | 'settings' | 'logo' | 'plus' | 'trash' | 'edit' 
  | 'download' | 'upload' | 'close' | 'search' | 'printer' | 'share' | 'ingredients' 
  | 'users' | 'logout' | 'camera' | 'star' | 'reset' | 'finance' | 'award' | 'barcode' 
  | 'pay' | 'help' | 'github' | 'donate' | 'telegram' | 'whatsapp' | 'chat' | 'info-circle' 
  | 'book' | 'star-fill' | 'check-circle-fill' | 'menu' | 'tag' | 'trending-up' 
  | 'chevron-down' | 'chevron-up' | 'keyboard' | 'play' | 'wifi' | 'database' 
  | 'warning' | 'question' | 'bluetooth' | 'lock' | 'clipboard' | 'boxes' | 'file-lock' 
  | 'clock-history' | 'eye' | 'cloud' | 'shop' | 'tools' | 'money' | 'lightbulb' | 'cast'
  | 'zoom-in' | 'zoom-out' | 'dash' | 'sync'; 

interface IconProps {
  name: IconName;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

const Icon: React.FC<IconProps> = ({ name, className = '', title, style }) => {
  
  if (name === 'logo') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className={className}
        aria-hidden="true"
        style={style}
      >
        {title && <title>{title}</title>}
          <path transform="translate(-0.124, 1.605) scale(0.152)" d={LOGO_PATH} />
      </svg>
    );
  }

  const iconMap: Record<string, string> = {
    cash: 'bi-cash-coin',
    products: 'bi-box-seam',
    reports: 'bi-bar-chart-line',
    settings: 'bi-gear',
    plus: 'bi-plus-lg',
    trash: 'bi-trash',
    edit: 'bi-pencil',
    download: 'bi-download',
    upload: 'bi-upload',
    close: 'bi-x-lg',
    search: 'bi-search',
    printer: 'bi-printer',
    share: 'bi-share',
    ingredients: 'bi-basket',
    users: 'bi-people',
    logout: 'bi-box-arrow-right',
    camera: 'bi-camera',
    star: 'bi-star',
    'star-fill': 'bi-star-fill',
    reset: 'bi-arrow-counterclockwise',
    finance: 'bi-wallet2',
    award: 'bi-award',
    barcode: 'bi-upc-scan',
    pay: 'bi-credit-card',
    help: 'bi-question-circle',
    github: 'bi-github',
    donate: 'bi-cup-hot',
    telegram: 'bi-telegram',
    whatsapp: 'bi-whatsapp',
    chat: 'bi-chat-dots',
    'info-circle': 'bi-info-circle',
    book: 'bi-book',
    'check-circle-fill': 'bi-check-circle-fill',
    menu: 'bi-list',
    tag: 'bi-tag',
    'trending-up': 'bi-graph-up-arrow',
    'chevron-down': 'bi-chevron-down',
    'chevron-up': 'bi-chevron-up',
    keyboard: 'bi-keyboard',
    play: 'bi-play-fill',
    wifi: 'bi-wifi',
    database: 'bi-database',
    warning: 'bi-exclamation-triangle',
    question: 'bi-question-lg',
    bluetooth: 'bi-bluetooth',
    lock: 'bi-lock',
    clipboard: 'bi-clipboard',
    boxes: 'bi-boxes',
    'file-lock': 'bi-file-earmark-lock',
    'clock-history': 'bi-clock-history',
    eye: 'bi-eye',
    cloud: 'bi-cloud',
    shop: 'bi-shop',
    tools: 'bi-tools',
    money: 'bi-currency-dollar',
    lightbulb: 'bi-lightbulb',
    cast: 'bi-cast',
    'zoom-in': 'bi-zoom-in',
    'zoom-out': 'bi-zoom-out',
    dash: 'bi-dash',
    sync: 'bi-arrow-repeat'
  };

  const biClass = iconMap[name] || 'bi-question-square';

  // FIX: Logika ukuran font yang lebih pintar.
  // Hanya tambahkan sizeClass default jika TIDAK ada class ukuran text (text-xs, text-sm, text-base, text-lg, text-xl, dll)
  // Class warna (text-red-500) TIDAK boleh dianggap sebagai ukuran.
  let sizeClass = '';
  
  // Cek apakah ada class yang diawali 'text-' TAPI diikuti indikator ukuran
  const hasTextSize = /\btext-(xs|sm|base|lg|xl|[2-9]xl|\[\d+)/.test(className);

  if (!hasTextSize) {
      if (className.includes('w-3')) sizeClass = 'text-xs';
      else if (className.includes('w-4')) sizeClass = 'text-base'; // 16px
      else if (className.includes('w-5')) sizeClass = 'text-xl';   // 20px
      else if (className.includes('w-6')) sizeClass = 'text-2xl';  // 24px
      else if (className.includes('w-8')) sizeClass = 'text-3xl';  // 30px
      else if (className.includes('w-10')) sizeClass = 'text-4xl'; // 40px
      else if (className.includes('w-12')) sizeClass = 'text-5xl'; // 48px
      else if (className.includes('w-16')) sizeClass = 'text-6xl';
      else if (className.includes('w-20')) sizeClass = 'text-7xl';
      else if (className.includes('w-24')) sizeClass = 'text-8xl';
      else if (className.includes('w-32')) sizeClass = 'text-9xl';
      else sizeClass = 'text-xl'; // Default fallback agar ikon tidak terlalu kecil
  }

  // Gabungkan kelas base 'bi' agar ikon bootstrap muncul, lalu kelas custom
  return (
    <i 
      className={`bi ${biClass} ${sizeClass} ${className} inline-flex items-center justify-center leading-none shrink-0`} 
      title={title}
      style={style}
      aria-hidden="true"
    />
  );
};

export default Icon;