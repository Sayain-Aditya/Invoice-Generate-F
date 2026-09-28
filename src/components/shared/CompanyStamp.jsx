export default function CompanyStamp({ size = 220, opacity = 0.9, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ opacity, overflow: "visible" }}
    >
      <defs>
        <path id="topStampText" d="M 92 245 A 158 158 0 0 1 408 245" fill="none" />
        <path id="bottomStampText" d="M 126 270 A 125 125 0 0 0 374 270" fill="none" />
        <filter id="stampRoughness" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="inkTexture">
          <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" seed="4" result="noise" />
          <feComposite in="noise" in2="SourceGraphic" operator="in" result="texture" />
          <feBlend in="SourceGraphic" in2="texture" mode="multiply" />
        </filter>
      </defs>

      <g fill="none" stroke="#07589D" strokeLinecap="round" strokeLinejoin="round" filter="url(#stampRoughness)">
        <circle cx="250" cy="250" r="220" strokeWidth="5" />
        <circle cx="250" cy="250" r="207" strokeWidth="3" />
        <circle cx="250" cy="250" r="145" strokeWidth="3.5" />
      </g>

      <g fill="#07589D" fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" filter="url(#stampRoughness)">
        <text fontSize="31" letterSpacing="2">
          <textPath href="#topStampText" startOffset="50%" textAnchor="middle">
            M. K. S. ALLIANCE LLP
          </textPath>
        </text>
      </g>

      <text x="78" y="322" fill="#07589D" fontSize="34" fontFamily="Arial, sans-serif" textAnchor="middle" filter="url(#stampRoughness)">★</text>
      <text x="250" y="426" fill="#07589D" fontSize="32" fontFamily="Arial, sans-serif" textAnchor="middle" filter="url(#stampRoughness)">★</text>

      <g transform="translate(250 250) rotate(-25)" fill="#07589D" fontFamily="Arial, Helvetica, sans-serif" fontWeight="500" filter="url(#stampRoughness)">
        <text x="0" y="0" fontSize="28" letterSpacing="1" textAnchor="middle" dominantBaseline="middle">
          ESCORTS KUBOTA
        </text>
      </g>

      <g fill="#07589D" opacity="0.25">
        <circle cx="104" cy="160" r="1.5" />
        <circle cx="128" cy="108" r="1.2" />
        <circle cx="374" cy="119" r="1.5" />
        <circle cx="407" cy="185" r="1.1" />
        <circle cx="385" cy="347" r="1.4" />
        <circle cx="153" cy="394" r="1.2" />
        <circle cx="208" cy="425" r="1" />
        <circle cx="331" cy="400" r="1.3" />
      </g>
    </svg>
  );
}
