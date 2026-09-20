import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface CyclicTimeInputProps {
	value: number;
	max: number; // 23 for hours, 59 for minutes
	onChange: (val: number) => void;
	disabled?: boolean;
}

export const CyclicTimeInput: React.FC<CyclicTimeInputProps> = ({
	value,
	max,
	onChange,
	disabled = false,
}) => {
	const [textValue, setTextValue] = useState<string>(
		value.toString().padStart(2, "0"),
	);

	useEffect(() => {
		setTextValue(value.toString().padStart(2, "0"));
	}, [value]);

	const stepUp = () => {
		const next = value >= max ? 0 : value + 1;
		onChange(next);
	};

	const stepDown = () => {
		const next = value <= 0 ? max : value - 1;
		onChange(next);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowUp") {
			e.preventDefault();
			stepUp();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			stepDown();
		}
	};

	const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
		e.preventDefault();
		if (e.deltaY < 0) {
			stepUp();
		} else if (e.deltaY > 0) {
			stepDown();
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
		setTextValue(digits);
		if (digits !== "") {
			const num = parseInt(digits, 10);
			if (!isNaN(num)) {
				const clamped = Math.min(Math.max(0, num), max);
				onChange(clamped);
			}
		}
	};

	const handleBlur = () => {
		const num = parseInt(textValue, 10);
		if (isNaN(num)) {
			setTextValue(value.toString().padStart(2, "0"));
		} else {
			const clamped = Math.min(Math.max(0, num), max);
			onChange(clamped);
			setTextValue(clamped.toString().padStart(2, "0"));
		}
	};

	return (
		<div
			className="inline-flex items-center border rounded-lg overflow-hidden transition-colors focus-within:border-[var(--accent)]"
			style={{
				backgroundColor: "var(--bg-surface-sub)",
				borderColor: "var(--border-light)",
			}}
		>
			<input
				type="text"
				inputMode="numeric"
				pattern="[0-9]*"
				maxLength={2}
				disabled={disabled}
				value={textValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onWheel={handleWheel}
				onBlur={handleBlur}
				className="w-7 py-1 text-center font-mono text-xs focus:outline-none bg-transparent select-all"
				style={{ color: "var(--text-app)" }}
			/>
			<div
				className="flex flex-col border-l"
				style={{ borderColor: "var(--border-light)" }}
			>
				<button
					type="button"
					tabIndex={-1}
					disabled={disabled}
					onClick={stepUp}
					className="px-1 py-0.5 hover:opacity-80 active:opacity-60 transition-opacity flex items-center justify-center cursor-pointer"
					style={{ color: "var(--text-dim)" }}
					title="Вверх"
				>
					<ChevronUp className="h-2.5 w-2.5" />
				</button>
				<button
					type="button"
					tabIndex={-1}
					disabled={disabled}
					onClick={stepDown}
					className="px-1 py-0.5 hover:opacity-80 active:opacity-60 transition-opacity flex items-center justify-center border-t cursor-pointer"
					style={{
						borderColor: "var(--border-light)",
						color: "var(--text-dim)",
					}}
					title="Вниз"
				>
					<ChevronDown className="h-2.5 w-2.5" />
				</button>
			</div>
		</div>
	);
};
