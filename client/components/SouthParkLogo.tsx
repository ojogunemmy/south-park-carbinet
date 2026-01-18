export const SouthParkLogo = ({ size = 40 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cabinet outline - main shape */}
      <rect x="35" y="50" width="130" height="110" fill="#8B6F47" stroke="#5D4A2F" strokeWidth="2" rx="4" />
      
      {/* Cabinet door left */}
      <rect x="40" y="60" width="55" height="90" fill="#A0826D" stroke="#5D4A2F" strokeWidth="1.5" rx="2" />
      
      {/* Cabinet door right */}
      <rect x="105" y="60" width="55" height="90" fill="#9D7E67" stroke="#5D4A2F" strokeWidth="1.5" rx="2" />
      
      {/* Door handle left */}
      <circle cx="95" cy="105" r="3.5" fill="#D4A574" />
      
      {/* Door handle right */}
      <circle cx="160" cy="105" r="3.5" fill="#D4A574" />
      
      {/* Wood grain detail - vertical lines for texture */}
      <line x1="52" y1="65" x2="52" y2="145" stroke="#5D4A2F" strokeWidth="0.5" opacity="0.4" />
      <line x1="70" y1="65" x2="70" y2="145" stroke="#5D4A2F" strokeWidth="0.5" opacity="0.4" />
      <line x1="117" y1="65" x2="117" y2="145" stroke="#5D4A2F" strokeWidth="0.5" opacity="0.4" />
      <line x1="135" y1="65" x2="135" y2="145" stroke="#5D4A2F" strokeWidth="0.5" opacity="0.4" />
      
      {/* Top panel - drawer */}
      <rect x="40" y="155" width="120" height="12" fill="#9D7E67" stroke="#5D4A2F" strokeWidth="1.5" rx="1" />
      
      {/* Drawer handle */}
      <rect x="95" y="158" width="10" height="6" fill="#D4A574" stroke="#5D4A2F" strokeWidth="0.5" rx="1" />
      
      {/* Base feet */}
      <rect x="45" y="168" width="8" height="6" fill="#5D4A2F" />
      <rect x="147" y="168" width="8" height="6" fill="#5D4A2F" />
      
      {/* Decorative line - premium look */}
      <line x1="35" y1="52" x2="165" y2="52" stroke="#D4A574" strokeWidth="1.5" />
    </svg>
  );
};
