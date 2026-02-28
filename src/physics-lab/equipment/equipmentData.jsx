// Equipment Data and SVG Icons

// SVG Icon Components
export const TrackIcon = () => (
  <svg width="64" height="28" viewBox="0 0 64 28">
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8a8a98"/>
        <stop offset="50%" stopColor="#9a9aa8"/>
        <stop offset="100%" stopColor="#6a6a78"/>
      </linearGradient>
    </defs>
    <rect x="2" y="8" width="60" height="10" rx="2" fill="url(#tg)" stroke="#555" strokeWidth="0.5"/>
    <line x1="6" y1="13" x2="58" y2="13" stroke="#555568" strokeWidth="1"/>
    <rect x="2" y="8" width="4" height="10" rx="1" fill="#5a5a68"/>
    <rect x="58" y="8" width="4" height="10" rx="1" fill="#5a5a68"/>
    <line x1="10" y1="18" x2="10" y2="26" stroke="#888" strokeWidth="2"/>
    <circle cx="10" cy="26" r="2.5" fill="#aaa"/>
    <line x1="54" y1="18" x2="54" y2="26" stroke="#888" strokeWidth="2"/>
    <circle cx="54" cy="26" r="2.5" fill="#aaa"/>
    {[0,10,20,30,40,50,60].map(i => (
      <line key={i} x1={5+i*0.9} y1="9" x2={5+i*0.9} y2={i%20===0?11:10} stroke="#555" strokeWidth="0.3"/>
    ))}
  </svg>
);

export const CartIcon = () => (
  <svg width="48" height="36" viewBox="0 0 48 36">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f05050"/>
        <stop offset="100%" stopColor="#a02020"/>
      </linearGradient>
    </defs>
    <rect x="6" y="4" width="36" height="20" rx="3" fill="url(#cg)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
    <rect x="10" y="8" width="28" height="10" rx="1.5" fill="rgba(0,0,0,0.15)"/>
    <text x="24" y="16" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">CART</text>
    <rect x="4" y="8" width="2" height="12" rx="0.5" fill="#888"/>
    <rect x="42" y="8" width="2" height="12" rx="0.5" fill="#888"/>
    <circle cx="14" cy="26" r="4" fill="#1a1a1a"/>
    <circle cx="14" cy="26" r="2.5" fill="#666"/>
    <circle cx="14" cy="26" r="0.8" fill="#aaa"/>
    <circle cx="34" cy="26" r="4" fill="#1a1a1a"/>
    <circle cx="34" cy="26" r="2.5" fill="#666"/>
    <circle cx="34" cy="26" r="0.8" fill="#aaa"/>
  </svg>
);

export const MDIcon = () => (
  <svg width="40" height="42" viewBox="0 0 40 42">
    <defs>
      <linearGradient id="mg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#2a3e55"/>
        <stop offset="50%" stopColor="#344d66"/>
        <stop offset="100%" stopColor="#283a50"/>
      </linearGradient>
    </defs>
    <rect x="4" y="4" width="24" height="34" rx="4" fill="url(#mg)" stroke="rgba(100,160,220,0.3)" strokeWidth="0.5"/>
    <rect x="25" y="10" width="3" height="22" rx="1" fill="#cc9900"/>
    <circle cx="8" cy="8" r="1.5" fill="#44ff88"/>
    <polygon points="28,15 38,8 38,34 28,27" fill="rgba(255,200,0,0.12)"/>
    <polygon points="28,18 34,21 28,24" fill="rgba(255,200,0,0.3)"/>
    <text x="16" y="22" textAnchor="middle" fill="rgba(170,212,255,0.7)" fontSize="5" fontWeight="bold" fontFamily="sans-serif">MOTION</text>
    <text x="16" y="28" textAnchor="middle" fill="rgba(170,212,255,0.7)" fontSize="5" fontWeight="bold" fontFamily="sans-serif">DETECT</text>
  </svg>
);

export const LevelIcon = () => (
  <svg width="64" height="20" viewBox="0 0 64 20">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#6a7a6a"/>
        <stop offset="50%" stopColor="#8a9a8a"/>
        <stop offset="100%" stopColor="#5a6a5a"/>
      </linearGradient>
    </defs>
    <rect x="2" y="4" width="60" height="12" rx="6" fill="url(#lg)" stroke="rgba(0,0,0,0.2)" strokeWidth="0.5"/>
    <rect x="8" y="6" width="48" height="8" rx="4" fill="rgba(200,230,200,0.2)"/>
    <line x1="29" y1="6" x2="29" y2="14" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/>
    <line x1="35" y1="6" x2="35" y2="14" stroke="rgba(0,0,0,0.25)" strokeWidth="0.5"/>
    <ellipse cx="32" cy="10" rx="5" ry="3" fill="rgba(180,240,180,0.6)"/>
    <ellipse cx="31" cy="9.5" rx="1.5" ry="1" fill="rgba(255,255,255,0.4)"/>
  </svg>
);

export const PulleyIcon = () => (
  <svg width="40" height="44" viewBox="0 0 40 44">
    <circle cx="20" cy="16" r="12" fill="none" stroke="#888" strokeWidth="3"/>
    <circle cx="20" cy="16" r="3" fill="#aaa"/>
    <circle cx="20" cy="16" r="1" fill="#666"/>
    <line x1="20" y1="4" x2="20" y2="0" stroke="#555" strokeWidth="2"/>
    <rect x="16" y="0" width="8" height="4" rx="1" fill="#666"/>
    <path d="M8,16 L8,40" stroke="#aa8844" strokeWidth="1.5"/>
    <path d="M32,16 L32,40" stroke="#aa8844" strokeWidth="1.5"/>
    <line x1="8" y1="16" x2="8" y2="28" stroke="#aa8844" strokeWidth="1.5" strokeDasharray="3,2"/>
    <line x1="32" y1="16" x2="32" y2="28" stroke="#aa8844" strokeWidth="1.5" strokeDasharray="3,2"/>
  </svg>
);

export const StringIcon = () => (
  <svg width="50" height="30" viewBox="0 0 50 30">
    <path d="M4,15 Q12,4 20,14 Q28,24 36,14 Q42,6 48,15" fill="none" stroke="#aa8844" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="4" cy="15" r="2" fill="#997733"/>
    <circle cx="48" cy="15" r="2" fill="#997733"/>
  </svg>
);

export const MassHangerIcon = () => (
  <svg width="36" height="48" viewBox="0 0 36 48">
    <line x1="18" y1="0" x2="18" y2="10" stroke="#888" strokeWidth="1.5"/>
    <path d="M8,10 L28,10 L28,14 L8,14 Z" fill="#666" stroke="#555" strokeWidth="0.5"/>
    <circle cx="18" cy="6" r="3" fill="none" stroke="#888" strokeWidth="1"/>
    <rect x="6" y="18" width="24" height="8" rx="1" fill="#7a7a88" stroke="#666" strokeWidth="0.5"/>
    <text x="18" y="24" textAnchor="middle" fill="#ddd" fontSize="5" fontFamily="sans-serif">50g</text>
    <rect x="6" y="28" width="24" height="8" rx="1" fill="#8a8a98" stroke="#666" strokeWidth="0.5"/>
    <text x="18" y="34" textAnchor="middle" fill="#ddd" fontSize="5" fontFamily="sans-serif">100g</text>
    <rect x="10" y="38" width="16" height="6" rx="1" fill="#6a6a78" stroke="#555" strokeWidth="0.5"/>
    <text x="18" y="43" textAnchor="middle" fill="#ccc" fontSize="4" fontFamily="sans-serif">200g</text>
  </svg>
);

export const MeterStickIcon = () => (
  <svg width="70" height="16" viewBox="0 0 70 16">
    <defs>
      <linearGradient id="msg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ccaa55"/>
        <stop offset="50%" stopColor="#ddbb66"/>
        <stop offset="100%" stopColor="#bb9944"/>
      </linearGradient>
    </defs>
    <rect x="1" y="3" width="68" height="10" rx="1" fill="url(#msg)" stroke="#997733" strokeWidth="0.5"/>
    {[0,7,14,21,28,35,42,49,56,63,68].map((x,i) => (
      <line key={i} x1={1+x} y1="3" x2={1+x} y2={i%2===0?8:6} stroke="#664422" strokeWidth={i%2===0?0.6:0.3}/>
    ))}
    <text x="8" y="11" fill="#664422" fontSize="4" fontFamily="monospace">10</text>
    <text x="22" y="11" fill="#664422" fontSize="4" fontFamily="monospace">30</text>
    <text x="36" y="11" fill="#664422" fontSize="4" fontFamily="monospace">50</text>
    <text x="50" y="11" fill="#664422" fontSize="4" fontFamily="monospace">70</text>
    <text x="62" y="11" fill="#664422" fontSize="4" fontFamily="monospace">90</text>
  </svg>
);

export const ProtractorIcon = () => (
  <svg width="50" height="30" viewBox="0 0 50 30">
    <defs>
      <linearGradient id="prtg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(200,220,255,0.9)"/>
        <stop offset="100%" stopColor="rgba(160,180,220,0.9)"/>
      </linearGradient>
    </defs>
    <path d="M5,28 A22,22 0 0,1 45,28 L45,28 L5,28 Z" fill="url(#prtg)" stroke="#667788" strokeWidth="0.5"/>
    <line x1="25" y1="28" x2="25" y2="8" stroke="#445566" strokeWidth="0.3"/>
    {[0,30,60,90,120,150,180].map((deg,i) => {
      const rad = (180 - deg) * Math.PI / 180;
      const x1 = 25 + Math.cos(rad) * 20;
      const y1 = 28 - Math.sin(rad) * 20;
      const x2 = 25 + Math.cos(rad) * 22;
      const y2 = 28 - Math.sin(rad) * 22;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#445566" strokeWidth="0.4"/>;
    })}
    <text x="25" y="10" textAnchor="middle" fill="#445566" fontSize="4">90°</text>
    <text x="8" y="26" fill="#445566" fontSize="3">180</text>
    <text x="40" y="26" fill="#445566" fontSize="3">0</text>
  </svg>
);

// Icon map for easy lookup
export const ICON_MAP = {
  track: TrackIcon,
  cart: CartIcon,
  motionDetector: MDIcon,
  bubbleLevel: LevelIcon,
  pulley: PulleyIcon,
  string: StringIcon,
  massHanger: MassHangerIcon,
  meterStick: MeterStickIcon,
  protractor: ProtractorIcon
};

// Equipment data
export const EQUIPMENT = [
  {
    type: "track",
    name: "Frictionless Track",
    category: "Mechanics",
    description: "A 1.2m low-friction aluminum track with adjustable leveling feet. Very small kinetic friction remains (mu ~ 0.002). Level it carefully before collecting data.",
    usage: "Place on table, adjust screw-feet by dragging up/down. Track starts with random tilt - leveling is part of the procedure.",
    defaultProps: { width: 480, height: 18, leftFootHeight: 0, rightFootHeight: 0, friction: 0.002 }
  },
  {
    type: "cart",
    name: "Dynamics Cart",
    category: "Mechanics",
    description: "A 0.5kg low-friction cart for the dynamics track. Give it a push or release on a tilt to study acceleration.",
    usage: "Place on track. Shift+click and drag to push. Falls off track ends - real physics!",
    defaultProps: { width: 48, height: 28, mass: 0.5, velocity: 0, velocityY: 0 }
  },
  {
    type: "pulley",
    name: "Pulley",
    category: "Mechanics",
    description: "A low-friction pulley that can be clamped to the end of a track or table edge. Thread string over it to redirect force - for example, to connect a hanging mass to a cart on the track.",
    usage: "Place at the edge of the table. Attach string over the pulley to connect equipment on the table to hanging masses.",
    defaultProps: { width: 28, height: 28 }
  },
  {
    type: "string",
    name: "String",
    category: "Accessories",
    description: "A lightweight, inextensible string for connecting objects. Negligible mass - ideal for transmitting tension between a cart and a hanging mass over a pulley.",
    usage: "Place in lab to connect two objects. In a future version, click two items to attach the string between them.",
    defaultProps: { width: 60, height: 6 }
  },
  {
    type: "massHanger",
    name: "Mass Hanger + Weights",
    category: "Mechanics",
    description: "A 50g mass hanger with a set of slotted weights. Adjust the total hanging mass using the slider (50g-500g). Hang from a string over a pulley to apply a known force.",
    usage: "Place in lab. Use the slider on the item to adjust total mass from 50g (hanger only) up to 500g.",
    defaultProps: { width: 24, height: 50, totalMass: 0.1 }
  },
  {
    type: "motionDetector",
    name: "Motion Detector",
    category: "Sensors",
    description: "Ultrasonic motion detector measuring position of the nearest object. Connects to LabQuest display for live or recorded data.",
    usage: "Place at track end facing cart. Read live values or press Start to record position, velocity, and acceleration.",
    defaultProps: { width: 32, height: 38, direction: "right" }
  },
  {
    type: "bubbleLevel",
    name: "Bubble Level",
    category: "Tools",
    description: "Precision bubble level. Bubble drifts toward lower side to show tilt direction and magnitude.",
    usage: "Place on track. Adjust feet until bubble is centered between the marks.",
    defaultProps: { width: 72, height: 14 }
  },
  {
    type: "meterStick",
    name: "Meter Stick",
    category: "Tools",
    description: "A 1-meter wooden ruler with centimeter and millimeter markings. Use it to measure distances, heights, or positions of objects in the lab.",
    usage: "Place anywhere in the lab to measure. Drag ends to rotate. Each marking represents 1 cm. The full stick is 100 cm.",
    defaultProps: { width: 400, height: 10, rotation: 0 }
  },
  {
    type: "protractor",
    name: "Protractor",
    category: "Tools",
    description: "A transparent semicircular protractor for measuring angles from 0° to 180°. Use it to measure the tilt of the track or any other angle in the lab.",
    usage: "Place anywhere in the lab. Drag ends to rotate. Align the baseline with one edge and read the angle on the scale.",
    defaultProps: { width: 100, height: 55, rotation: 0 }
  },
];
