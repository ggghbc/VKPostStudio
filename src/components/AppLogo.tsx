import React from "react";

export const AppLogo: React.FC<{ className?: string }> = ({
	className = "h-5 w-5",
}) => {
	return (
		<svg
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
		>
			<defs>
				<linearGradient
					id="vkLogoGrad"
					x1="2"
					y1="2"
					x2="30"
					y2="30"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="var(--accent)" />
					<stop offset="1" stopColor="var(--btn-primary-bg)" />
				</linearGradient>
			</defs>
			{/* Фоновый скруглённый щит */}
			<rect
				x="2"
				y="2"
				width="28"
				height="28"
				rx="8"
				fill="url(#vkLogoGrad)"
				fillOpacity="0.2"
				stroke="var(--accent)"
				strokeWidth="1.5"
			/>

			{/* Стилизованные слои постов */}
			<path
				d="M8 12L16 7L24 12L16 17L8 12Z"
				fill="var(--accent)"
				fillOpacity="0.85"
			/>
			<path
				d="M8 16.5L16 21.5L24 16.5"
				stroke="var(--accent)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M8 21L16 26L24 21"
				stroke="var(--btn-primary-bg)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* Индикатор времени/слота */}
			<circle
				cx="23"
				cy="9"
				r="3.5"
				fill="var(--btn-primary-bg)"
				stroke="var(--bg-header)"
				strokeWidth="1.5"
			/>
		</svg>
	);
};
