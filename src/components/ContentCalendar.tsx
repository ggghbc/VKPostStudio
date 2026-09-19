import React from "react";
import {
	format,
	subMonths,
	addMonths,
	startOfMonth,
	endOfMonth,
	startOfWeek,
	endOfWeek,
	eachDayOfInterval,
	isSameMonth,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { PostItem } from "../types";

interface ContentCalendarProps {
	month: Date;
	posts: PostItem[];
	onMonthChange: (date: Date) => void;
	onSelectPost: (post: PostItem) => void;
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

	const getPostsForDay = (day: Date) => {
		const dayStr = format(day, "yyyy-MM-dd");
		return posts.filter((p) => p.scheduled_at_utc.startsWith(dayStr));
	};

	return (
		<div
			className="flex-1 flex flex-col border rounded-2xl p-4 overflow-hidden"
			style={{
				backgroundColor: "var(--bg-surface)",
				borderColor: "var(--border-app)",
			}}
		>
			<div className="flex items-center justify-between mb-3 text-xs flex-shrink-0">
				<span
					className="font-bold text-sm capitalize"
					style={{ color: "var(--text-app)" }}
				>
					{format(month, "LLLL yyyy", { locale: ru })}
				</span>
				<div className="flex items-center gap-1">
					<button
						onClick={() => onMonthChange(subMonths(month, 1))}
						className="p-1 rounded-lg border hover:opacity-80 transition-colors cursor-pointer"
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
						className="p-1 rounded-lg border hover:opacity-80 transition-colors cursor-pointer"
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
				className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold mb-1.5 flex-shrink-0"
				style={{ color: "var(--text-dim)" }}
			>
				<span>Пн</span>
				<span>Вт</span>
				<span>Ср</span>
				<span>Чт</span>
				<span>Пт</span>
				<span className="opacity-75">Сб</span>
				<span className="opacity-75">Вс</span>
			</div>

			<div className="flex-1 grid grid-cols-7 gap-1 auto-rows-fr overflow-hidden">
				{days.map((day, idx) => {
					const isCurrMonth = isSameMonth(day, month);
					const dayPosts = getPostsForDay(day);

					return (
						<div
							key={idx}
							className="rounded-xl border p-1 flex flex-col justify-between overflow-hidden transition-all"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								opacity: isCurrMonth ? 1 : 0.35,
							}}
						>
							<div className="flex items-center justify-between px-1 flex-shrink-0">
								<span
									className="font-mono text-[10px] font-bold"
									style={{ color: "var(--text-dim)" }}
								>
									{format(day, "d")}
								</span>
							</div>

							<div className="flex-1 overflow-y-auto space-y-1 my-0.5 pr-0.5 scrollbar-none">
								{dayPosts.map((p) => {
									const isQueued = p.status === "queued";
									const isVk =
										p.status === "transferred_to_vk";
									const isPublished =
										p.status === "published";
									const hoverTooltip = `${p.text || "Без сопроводительного текста"}\nВложений: ${p.attachments_count}`;

									return (
										<button
											key={p.id}
											type="button"
											onClick={() => onSelectPost(p)}
											className="w-full truncate text-[9px] font-mono px-1 py-0.5 rounded border flex items-center justify-between gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
											style={{
												backgroundColor:
													"var(--bg-surface)",
												borderColor: isPublished
													? "var(--accent)"
													: "var(--border-light)",
												color: "var(--text-app)",
											}}
											title={hoverTooltip}
										>
											<div className="flex items-center gap-0.5 min-w-0 truncate">
												<Clock
													className="h-2.5 w-2.5 flex-shrink-0"
													style={{
														color: "var(--accent)",
													}}
												/>
												<span className="truncate">
													{format(
														new Date(
															p.scheduled_at_utc,
														),
														"HH:mm",
													)}
												</span>
											</div>
											<span className="text-[8px] opacity-70 flex-shrink-0">
												{isQueued
													? "лок"
													: isVk
														? "отл"
														: isPublished
															? "вк"
															: "ош"}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
