import React, { useState } from 'react';
import { Briefcase, MapPin, Building2, ChevronDown, Sparkles } from 'lucide-react';

// Placement hubs coordinates normalized to the SVG viewBox 0 0 500 580
// Indore (IIT Indore origin): x = 205, y = 300
const ORIGIN = { name: 'IIT Indore', x: 205, y: 300 };

const HUBS = [
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    x: 215,
    y: 440,
    companies: ['Google', 'Microsoft', 'TechNova', 'Infosys'],
    placements: 342,
    avgPackage: '24.5 LPA',
    activeDrives: 14,
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad',
    state: 'Telangana',
    x: 235,
    y: 380,
    companies: ['Amazon', 'DataWorks', 'Oracle', 'Qualcomm'],
    placements: 218,
    avgPackage: '20.8 LPA',
    activeDrives: 9,
  },
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    x: 185,
    y: 355,
    companies: ['NVIDIA', 'Bajaj', 'TCS Research', 'Barclays'],
    placements: 176,
    avgPackage: '17.5 LPA',
    activeDrives: 8,
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    x: 170,
    y: 340,
    companies: ['Morgan Stanley', 'JPMorgan', 'Reliance', 'Tata'],
    placements: 154,
    avgPackage: '22.0 LPA',
    activeDrives: 7,
  },
  {
    id: 'delhi',
    name: 'Delhi-NCR',
    state: 'National Capital',
    x: 205,
    y: 195,
    companies: ['Adobe', 'Zomato', 'Paytm', 'Samsung R&D'],
    placements: 195,
    avgPackage: '19.2 LPA',
    activeDrives: 11,
  },
  {
    id: 'chennai',
    name: 'Chennai',
    state: 'Tamil Nadu',
    x: 250,
    y: 465,
    companies: ['Cisco', 'Hyundai R&D', 'Zoho', 'PayPal'],
    placements: 98,
    avgPackage: '16.4 LPA',
    activeDrives: 5,
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    x: 345,
    y: 290,
    companies: ['PwC', 'ITC Infotech', 'Tata Steel'],
    placements: 64,
    avgPackage: '14.8 LPA',
    activeDrives: 4,
  },
  {
    id: 'ahmedabad',
    name: 'Ahmedabad',
    state: 'Gujarat',
    x: 155,
    y: 285,
    companies: ['Adani', 'Torrent', 'L&T Technology'],
    placements: 58,
    avgPackage: '14.2 LPA',
    activeDrives: 3,
  },
];

// High-fidelity smoothed SVG Path representing the territory of India
const INDIA_MAP_PATH = 
  "M 195 45 " +
  "C 215 45, 230 65, 235 85 " +
  "C 240 100, 260 115, 255 130 " +
  "C 250 140, 270 150, 290 150 " +
  "C 310 150, 330 160, 350 170 " +
  "C 370 180, 400 175, 420 185 " +
  "C 440 195, 455 210, 440 225 " +
  "C 420 235, 395 230, 380 240 " +
  "C 365 250, 360 265, 345 280 " +
  "C 335 295, 330 325, 320 345 " +
  "C 305 375, 280 415, 260 455 " +
  "C 245 485, 230 520, 215 540 " +
  "C 205 520, 195 485, 185 450 " +
  "C 175 415, 165 375, 160 345 " +
  "C 155 320, 130 305, 120 285 " +
  "C 110 265, 130 250, 140 235 " +
  "C 145 220, 135 195, 145 175 " +
  "C 155 155, 175 140, 175 115 " +
  "C 175 90, 185 60, 195 45 Z";

export default function IndiaPlacementMap({ totalCompanies = 238, totalCities = 28, totalHubs = 12 }) {
  const [activeHub, setActiveHub] = useState(HUBS[0]);
  const [hoveredHub, setHoveredHub] = useState(null);

  // Helper to create a curved quadratic bezier curve between two points
  const createCurvedArc = (start, end) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    // Calculate perpendicular offset for curve bow
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = dist * 0.18;
    const normX = -dy / dist;
    const normY = dx / dist;
    const controlX = midX + normX * offset;
    const controlY = midY + normY * offset;
    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  };

  const currentDisplayHub = hoveredHub || activeHub;

  return (
    <div className="relative cyber-card p-5 overflow-hidden flex flex-col justify-between h-full group">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-cyan-500/15 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
            India — Placement Opportunities
          </h3>
        </div>
        <select aria-label="Highlight placement city" value={activeHub.id}
          onChange={(event) => { setActiveHub(HUBS.find((hub) => hub.id === event.target.value)); setHoveredHub(null); }}
          className="max-w-32 rounded-lg bg-slate-900 border border-slate-700 text-xs text-cyan-300 px-2 py-1">
          {HUBS.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
        </select>
      </div>

      {/* Main Map SVG Container */}
      <div className="relative flex-1 flex items-center justify-center my-2 min-h-[340px]">
        <svg
          viewBox="100 30 360 520"
          className="w-full h-full max-h-[380px] overflow-visible"
          style={{ filter: 'drop-shadow(0 0 25px rgba(6,182,212,0.15))' }}
        >
          <defs>
            {/* Map gradient fill */}
            <linearGradient id="indiaCyberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B152B" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#071022" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#040A18" stopOpacity="0.95" />
            </linearGradient>

            {/* Glowing Neon Arc Gradient */}
            <linearGradient id="arcCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
            </linearGradient>

            {/* Active Arc Gradient */}
            <linearGradient id="activeArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67E8F9" stopOpacity="1" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* India Boundary Outline */}
          <path
            d={INDIA_MAP_PATH}
            fill="url(#indiaCyberGrad)"
            stroke="#06B6D4"
            strokeWidth="1.8"
            strokeOpacity="0.55"
            className="transition-all duration-300"
          />

          {/* Topographic Grid Accents inside Map */}
          <circle cx="205" cy="300" r="45" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="3,3" strokeOpacity="0.25" />
          <circle cx="205" cy="300" r="90" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="4,4" strokeOpacity="0.15" />
          <circle cx="205" cy="300" r="140" fill="none" stroke="#06B6D4" strokeWidth="0.5" strokeDasharray="5,5" strokeOpacity="0.1" />

          {/* Radiating Curved Transit Arcs */}
          {HUBS.map((hub) => {
            const isSelected = currentDisplayHub?.id === hub.id;
            const pathData = createCurvedArc(ORIGIN, hub);
            return (
              <g key={`arc-${hub.id}`}>
                {/* Background glow path */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#22D3EE' : 'url(#arcCyanGrad)'}
                  strokeWidth={isSelected ? '2.5' : '1.2'}
                  strokeOpacity={isSelected ? 0.9 : 0.4}
                  className={isSelected ? 'flow-arc' : ''}
                />
              </g>
            );
          })}

          {/* Origin: IIT Indore Center Beacon */}
          <g transform={`translate(${ORIGIN.x}, ${ORIGIN.y})`}>
            {/* Outer radiating ripples */}
            <circle cx="0" cy="0" r="14" fill="none" stroke="#06B6D4" strokeWidth="1" strokeOpacity="0.4" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="0" cy="0" r="8" fill="#06B6D4" fillOpacity="0.25" />
            {/* Center dot */}
            <circle cx="0" cy="0" r="4.5" fill="#22D3EE" stroke="#FFFFFF" strokeWidth="1.5" className="shadow-lg" />
            
            {/* Origin Badge Label */}
            <g transform="translate(10, -8)">
              <rect x="0" y="0" width="62" height="18" rx="4" fill="#040916" fillOpacity="0.85" stroke="#06B6D4" strokeWidth="0.8" />
              <text x="6" y="12" fill="#22D3EE" fontSize="8" fontWeight="bold" fontFamily="sans-serif">
                IIT INDORE
              </text>
            </g>
          </g>

          {/* Destination Placement Hubs */}
          {HUBS.map((hub) => {
            const isSelected = currentDisplayHub?.id === hub.id;
            return (
              <g
                key={hub.id}
                transform={`translate(${hub.x}, ${hub.y})`}
                className="cursor-pointer"
                onClick={() => setActiveHub(hub)}
                onMouseEnter={() => setHoveredHub(hub)}
                onMouseLeave={() => setHoveredHub(null)}
              >
                {/* Hover ring */}
                {isSelected && (
                  <circle
                    cx="0"
                    cy="0"
                    r="10"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                    className="animate-spin"
                    style={{ animationDuration: '8s' }}
                  />
                )}
                {/* Pin core */}
                <circle
                  cx="0"
                  cy="0"
                  r={isSelected ? '5.5' : '3.8'}
                  fill={isSelected ? '#38BDF8' : '#0891B2'}
                  stroke={isSelected ? '#FFFFFF' : '#22D3EE'}
                  strokeWidth="1.2"
                  className="transition-all duration-200"
                />

                {/* City name label */}
                <text
                  x="8"
                  y="3"
                  fill={isSelected ? '#FFFFFF' : '#94A3B8'}
                  fontSize={isSelected ? '9' : '7.5'}
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fontFamily="sans-serif"
                  style={{ textShadow: isSelected ? '0 0 8px rgba(6,182,212,0.8)' : 'none' }}
                >
                  {hub.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Interactive Hub Details Tooltip Card */}
        {currentDisplayHub && (
          <div className="absolute top-2 right-2 bg-[#090F20]/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.2)] max-w-[210px] animate-fadeInUp">
            <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {currentDisplayHub.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 font-semibold border border-cyan-500/30">
                {currentDisplayHub.activeDrives} Drives
              </span>
            </div>
            
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Total Placements:</span>
                <span className="font-bold text-cyan-300">{currentDisplayHub.placements}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Avg Package:</span>
                <span className="font-bold text-teal-300">₹{currentDisplayHub.avgPackage}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                <span className="text-slate-400 block mb-0.5">Top Companies:</span>
                <span className="text-slate-200 font-medium truncate block">
                  {currentDisplayHub.companies.slice(0, 3).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating 3 Metric Badges matching reference screenshot */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-cyan-500/15 relative z-10">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#091124]/80 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-white leading-tight block truncate">
              {totalCompanies}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight block truncate">
              Active Companies
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#091124]/80 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-teal-950/70 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-[0_0_10px_rgba(20,184,166,0.15)]">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-white leading-tight block truncate">
              {totalCities}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight block truncate">
              Cities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#091124]/80 border border-slate-800/80">
          <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-[0_0_10px_rgba(37,99,235,0.15)]">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-white leading-tight block truncate">
              {totalHubs}
            </span>
            <span className="text-[10px] text-slate-400 leading-tight block truncate">
              Hiring Hubs
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
