import React from "react";
import {
	format,
	subMonths,
	addMonths,
	isSameDay,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { PostItem } from "../types";

interface ContentCalendarProps {
	month: Date;
	posts: PostItem[];
	onMonthChange: (date: Date) => void;
	onSelectPost: (id: number) => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
	month,
	posts,
	onMonthChange,
	onSelectPost,
}) => {
	const monthStart = startOfMonth(month);
	const monthEnd = endOfMonth(month);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
	const days = eachDayOfInterval({ start: calStart, end: calEnd });

	return (
		<div
			className="flex-1 flex flex-col border rounded-2xl p-4 overflow-hidden"
			style={{
				backgroundColor: "var(--bg-surface)",
				borderColor: "var(--border-app)",
			}}
		>
			<div className="flex items-center justify-between mb-3 text-xs">
				<span
					className="font-semibold capitalize"
					style={{ color: "var(--text-app)" }}
				>
					{format(month, "LLLL yyyy", { locale: ru })}
				</span>
				<div className="flex items-center gap-1">
					<button
						onClick={() => onMonthChange(subMonths(month, 1))}
						className="p-1 rounded-lg border hover:opacity-80"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<button
						onClick={() => onMonthChange(addMonths(month, 1))}
						className="p-1 rounded-lg border hover:opacity-80"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div
				className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium mb-1.5"
				style={{ color: "var(--text-dim)" }}
			>
				<span>Пн</span>
				<span>Вт</span>
				<span>Ср</span>
				<span>Чт</span>
				<span>Пт</span>
				<span className="text-amber-500/80">Сб</span>
				<span className="text-amber-500/80">Вс</span>
			</div>

			<div className="flex-1 grid grid-cols-7 gap-1.5 overflow-y-auto">
				{days.map((day, idx) => {
					const dayPosts = posts.filter((p) =>
						isSameDay(new Date(p.scheduled_at_utc), day),
					);
					const isCurrentMonth = day.getMonth() === month.getMonth();

					return (
						<div
							key={idx}
							className={`min-h-[70px] rounded-xl border p-1.5 flex flex-col transition-colors ${
								isCurrentMonth ? "opacity-100" : "opacity-40"
							}`}
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-app)",
							}}
						>
							<span
								className="text-[10px] font-mono font-semibold mb-1"
								style={{ color: "var(--text-dim)" }}
							>
								{format(day, "d")}
							</span>

							<div className="flex-1 space-y-1 overflow-y-auto">
								{dayPosts.map((p) => (
									<div
										key={p.id}
										onClick={() => onSelectPost(p.id)}
										className="p-1 rounded text-[9px] font-mono truncate cursor-pointer flex items-center gap-1 border hover:border-blue-500 transition-colors"
										style={{
											backgroundColor:
												"var(--bg-surface)",
											color: "var(--text-app)",
											borderColor: "var(--border-light)",
										}}
									>
										<Clock className="h-2.5 w-2.5 flex-shrink-0 text-blue-400" />
										<span>
											{format(
												new Date(p.scheduled_at_utc),
												"HH:mm",
											)}
										</span>
										{p.attachments_count > 0 && (
											<span className="opacity-70">
												({p.attachments_count})
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
