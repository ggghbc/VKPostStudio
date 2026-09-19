import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export interface CustomSelectOption {
	value: string | number;
	label: string;
}

interface CustomSelectProps {
	value: string | number;
	options: CustomSelectOption[];
	onChange: (val: any) => void;
	className?: string;
	maxWidth?: string;
	icon?: React.ReactNode;
	dropUp?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
	value,
	options,
	onChange,
	className = "",
	maxWidth = "280px",
	icon,
	dropUp = false,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.value === value) || options[0];

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div
			ref={ref}
			className={`relative inline-block ${className}`}
			style={{ maxWidth, width: "100%" }}
		>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all focus:outline-none cursor-pointer"
				style={{
					backgroundColor: "var(--bg-surface-sub)",
					color: "var(--text-app)",
					borderColor: "var(--border-light)",
				}}
			>
				<div className="flex items-center gap-1.5 min-w-0 truncate">
					{icon && <span className="flex-shrink-0">{icon}</span>}
					<span className="truncate">
						{selectedOption ? selectedOption.label : ""}
					</span>
				</div>
				<ChevronDown
					className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
					style={{ color: "var(--text-dim)" }}
				/>
			</button>

			{isOpen && (
				<div
					className={`absolute left-0 w-full min-w-[200px] max-h-56 overflow-y-auto rounded-xl border p-1 shadow-2xl z-50 animate-in fade-in duration-100 ${
						dropUp ? "bottom-full mb-1" : "top-full mt-1"
					}`}
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-light)",
						boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
					}}
				>
					{options.map((opt) => {
						const isSelected = opt.value === value;
						return (
							<div
								key={opt.value}
								onClick={() => {
									onChange(opt.value);
									setIsOpen(false);
								}}
								className="px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors truncate"
								style={{
									backgroundColor: isSelected
										? "var(--accent)"
										: "transparent",
									color: isSelected
										? "var(--btn-primary-text)"
										: "var(--text-app)",
								}}
								onMouseEnter={(e) => {
									if (!isSelected) {
										e.currentTarget.style.backgroundColor =
											"var(--accent)";
										e.currentTarget.style.color =
											"var(--btn-primary-text)";
									}
								}}
								onMouseLeave={(e) => {
									if (!isSelected) {
										e.currentTarget.style.backgroundColor =
											"transparent";
										e.currentTarget.style.color =
											"var(--text-app)";
									}
								}}
							>
								{opt.label}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
