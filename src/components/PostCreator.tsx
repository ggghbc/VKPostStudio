import React, { useRef } from "react";
import {
	Clock,
	Settings2,
	UploadCloud,
	ImagePlus,
	ArrowLeft,
	ArrowRight,
	X,
	FileText,
	LayoutGrid,
	SlidersHorizontal,
	ChevronUp,
	ChevronDown,
	Calendar,
	ChevronRight as CR,
	ChevronLeft as CL,
	Save,
	Plus,
	Layers3,
} from "lucide-react";
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
import { Pattern, FilePreview } from "../types";

interface PostCreatorProps {
	editingPostId: number | null;
	postText: string;
	attachedFiles: FilePreview[];
	isRightPanelOpen: boolean;
	patterns: Pattern[];
	selectedPatternId: number | null;
	attachmentsViewMode: "grid" | "carousel";
	commentsOnPost: boolean;
	notifyFollowers: boolean;
	authorsName: boolean;
	adFromCreator: boolean;
	isSettingsOpen: boolean;
	isManualTime: boolean;
	selectedDate: Date;
	pickerHours: number;
	pickerMinutes: number;
	isCalendarOpen: boolean;
	viewMonth: Date;
	nextSlotDisplay: string;
	selectedTargetId: number | null;
	onTextChange: (text: string) => void;
	onSelectPattern: (id: number) => void;
	onOpenPatternModal: () => void;
	onSelectFiles: () => void;
	onMoveFile: (from: number, to: number) => void;
	onRemoveFile: (idx: number) => void;
	onSetFullView: (url: string) => void;
	onOpenBatchModal: () => void;
	onSetViewMode: (mode: "grid" | "carousel") => void;
	onToggleComments: (v: boolean) => void;
	onToggleNotify: (v: boolean) => void;
	onToggleAuthor: (v: boolean) => void;
	onToggleAd: (v: boolean) => void;
	onToggleSettings: () => void;
	onToggleManualTime: (v: boolean) => void;
	onToggleCalendar: () => void;
	onSetViewMonth: (d: Date) => void;
	onSetSelectedDate: (d: Date) => void;
	onSetPickerHours: (h: number) => void;
	onSetPickerMinutes: (m: number) => void;
	onCancelEditing: () => void;
	onSavePost: () => void;
}

export const PostCreator: React.FC<PostCreatorProps> = ({
	editingPostId,
	postText,
	attachedFiles,
	isRightPanelOpen,
	patterns,
	selectedPatternId,
	attachmentsViewMode,
	commentsOnPost,
	notifyFollowers,
	authorsName,
	adFromCreator,
	isSettingsOpen,
	isManualTime,
	selectedDate,
	pickerHours,
	pickerMinutes,
	isCalendarOpen,
	viewMonth,
	nextSlotDisplay,
	selectedTargetId,
	onTextChange,
	onSelectPattern,
	onOpenPatternModal,
	onSelectFiles,
	onMoveFile,
	onRemoveFile,
	onSetFullView,
	onOpenBatchModal,
	onSetViewMode,
	onToggleComments,
	onToggleNotify,
	onToggleAuthor,
	onToggleAd,
	onToggleSettings,
	onToggleManualTime,
	onToggleCalendar,
	onSetViewMonth,
	onSetSelectedDate,
	onSetPickerHours,
	onSetPickerMinutes,
	onCancelEditing,
	onSavePost,
}) => {
	const calendarRef = useRef<HTMLDivElement>(null);

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
	const daysInCal = eachDayOfInterval({ start: calStart, end: calEnd });

	const getCustomDisplayString = () => {
		const d = new Date(selectedDate);
		d.setHours(pickerHours, pickerMinutes, 0, 0);
		return format(d, "dd/MM/yyyy HH:mm");
	};

	return (
		<section
			className={`flex flex-col border-r p-6 overflow-y-auto transition-all duration-300 ease-in-out ${
				isRightPanelOpen
					? "w-1/2"
					: "w-full max-w-4xl mx-auto border-r-0"
			}`}
			style={{ borderColor: "var(--border-app)" }}
		>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h2
						className="text-sm font-semibold tracking-wide"
						style={{ color: "var(--text-app)" }}
					>
						{editingPostId
							? `РЕДАКТИРОВАНИЕ ПОСТА #${editingPostId}`
							: "СОЗДАНИЕ ЗАПИСИ"}
					</h2>
					{editingPostId && (
						<span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-[10px] font-semibold text-blue-300">
							Режим правки
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<div
						className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<Clock
							className="h-3.5 w-3.5"
							style={{ color: "var(--text-dim)" }}
						/>
						<select
							className="bg-transparent text-xs focus:outline-none cursor-pointer"
							style={{ color: "var(--text-app)" }}
							value={selectedPatternId || ""}
							onChange={(e) =>
								onSelectPattern(Number(e.target.value))
							}
						>
							{patterns.map((p) => (
								<option
									key={p.id}
									value={p.id}
									className="bg-slate-900 text-slate-100"
								>
									{p.name}{" "}
									{p.interval_days > 1
										? `(раз в ${p.interval_days} дн.)`
										: ""}
								</option>
							))}
						</select>
					</div>

					<button
						onClick={onOpenPatternModal}
						className="p-1 rounded-lg border hover:opacity-80 transition-colors"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-muted)",
						}}
						title="Настроить паттерн"
					>
						<Settings2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="mb-3">
				<textarea
					className="w-full h-16 min-h-[4rem] max-h-32 rounded-xl p-3 text-xs border focus:outline-none focus:border-blue-500 transition-colors resize-none overflow-y-auto leading-relaxed"
					style={{
						backgroundColor: "var(--bg-surface)",
						color: "var(--text-app)",
						borderColor: "var(--border-app)",
					}}
					placeholder="Текст записи (необязательно)..."
					value={postText}
					maxLength={15895}
					onChange={(e) => onTextChange(e.target.value)}
				/>
				<div className="flex justify-end mt-1 px-1">
					<span
						className={`text-[10px] font-mono ${postText.length > 14000 ? "text-amber-400" : ""}`}
						style={{ color: "var(--text-dim)" }}
					>
						{postText.length} / 15 895 символов
					</span>
				</div>
			</div>

			<div className="flex-1 flex flex-col min-h-[190px]">
				{attachedFiles.length === 0 ? (
					<div
						onClick={onSelectFiles}
						className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer p-6 hover:opacity-80 transition-all"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
						}}
					>
						<div
							className="p-3.5 rounded-2xl mb-3 shadow-inner text-blue-400"
							style={{ backgroundColor: "var(--bg-surface)" }}
						>
							<UploadCloud className="h-7 w-7" />
						</div>
						<span
							className="text-xs font-semibold"
							style={{ color: "var(--text-app)" }}
						>
							Перетащите изображения сюда
						</span>
						<span
							className="text-[11px] mt-1"
							style={{ color: "var(--text-dim)" }}
						>
							или нажмите для выбора файлов (до 10 шт.)
						</span>
					</div>
				) : (
					<div
						className="flex-1 flex flex-col border rounded-2xl p-3.5 overflow-hidden"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<div
							className="flex items-center justify-between pb-2 mb-2 border-b text-xs"
							style={{ borderColor: "var(--border-app)" }}
						>
							<div className="flex items-center gap-2">
								<span
									className="font-semibold"
									style={{ color: "var(--text-app)" }}
								>
									Прикрепленные файлы
								</span>
								<span
									className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${attachedFiles.length >= 10 ? "bg-amber-500/20 text-amber-300" : "opacity-70"}`}
								>
									{attachedFiles.length} / 10 медиа
								</span>
							</div>

							<div className="flex items-center gap-2">
								{!editingPostId && attachedFiles.length > 1 && (
									<button
										onClick={onOpenBatchModal}
										className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
										title="Разбить эти файлы на несколько постов"
									>
										<Layers3 className="h-3.5 w-3.5" />
										<span>Пакетная генерация</span>
									</button>
								)}

								<button
									onClick={onSelectFiles}
									disabled={attachedFiles.length >= 10}
									className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium disabled:opacity-40"
								>
									<ImagePlus className="h-3.5 w-3.5" />
									<span>Добавить еще</span>
								</button>
							</div>
						</div>

						<div
							className={`flex-1 overflow-y-auto grid gap-3 pr-1 select-none ${isRightPanelOpen ? "grid-cols-3" : "grid-cols-4"}`}
						>
							{attachedFiles.map((file, idx) => (
								<div
									key={idx}
									className="group relative h-28 rounded-xl border overflow-hidden shadow-md flex items-center justify-center transition-all"
									style={{
										backgroundColor:
											"var(--bg-surface-sub)",
										borderColor: "var(--border-light)",
									}}
								>
									{file.isImage && file.previewUrl ? (
										<img
											src={file.previewUrl}
											alt={file.name}
											onClick={() =>
												file.previewUrl &&
												onSetFullView(file.previewUrl)
											}
											className="h-full w-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
										/>
									) : (
										<div
											onClick={() =>
												file.previewUrl &&
												onSetFullView(file.previewUrl)
											}
											className="flex flex-col items-center p-2 text-center cursor-pointer"
										>
											<FileText className="h-7 w-7 text-blue-400 mb-1" />
											<span
												className="text-[10px] truncate max-w-[90px]"
												style={{
													color: "var(--text-muted)",
												}}
											>
												{file.name}
											</span>
										</div>
									)}

									<span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white font-bold backdrop-blur-sm">
										#{idx + 1}
									</span>

									<div className="absolute inset-x-0 bottom-0 py-1 bg-black/80 backdrop-blur-sm flex items-center justify-between px-1.5 border-t border-white/10">
										<button
											disabled={idx === 0}
											onClick={(e) => {
												e.stopPropagation();
												onMoveFile(idx, idx - 1);
											}}
											className="p-1 rounded hover:bg-white/20 text-white disabled:opacity-20 transition-colors"
											title="Сдвинуть влево"
										>
											<ArrowLeft className="h-3 w-3" />
										</button>
										<span className="text-[9px] font-mono text-white/70">
											позиция
										</span>
										<button
											disabled={
												idx === attachedFiles.length - 1
											}
											onClick={(e) => {
												e.stopPropagation();
												onMoveFile(idx, idx + 1);
											}}
											className="p-1 rounded hover:bg-white/20 text-white disabled:opacity-20 transition-colors"
											title="Сдвинуть вправо"
										>
											<ArrowRight className="h-3 w-3" />
										</button>
									</div>

									<button
										onClick={(e) => {
											e.stopPropagation();
											onRemoveFile(idx);
										}}
										className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white shadow-lg backdrop-blur-sm transition-colors z-10"
										title="Удалить"
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<div
				className="mt-3 rounded-2xl border overflow-hidden select-none"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<button
					onClick={onToggleSettings}
					className="w-full flex items-center justify-between p-3 text-xs font-semibold hover:opacity-80 transition-opacity"
					style={{ color: "var(--text-app)" }}
				>
					<span>Настройки публикации</span>
					{isSettingsOpen ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</button>

				{isSettingsOpen && (
					<div
						className="p-3 pt-0 space-y-3.5 border-t"
						style={{ borderColor: "var(--border-app)" }}
					>
						<div className="flex items-center justify-between pt-2">
							<div className="flex flex-col">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-app)" }}
								>
									Стиль отображения медиа
								</span>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									Формат отображения в ленте ВК
								</span>
							</div>
							<div
								className="flex items-center border rounded-lg p-0.5"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
								}}
							>
								<button
									onClick={() => onSetViewMode("grid")}
									className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
										attachmentsViewMode === "grid"
											? "bg-blue-600 text-white shadow-sm font-semibold"
											: "opacity-70 hover:opacity-100"
									}`}
								>
									<LayoutGrid className="h-3.5 w-3.5" />
									<span>Сетка</span>
								</button>
								<button
									onClick={() => onSetViewMode("carousel")}
									className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
										attachmentsViewMode === "carousel"
											? "bg-blue-600 text-white shadow-sm font-semibold"
											: "opacity-70 hover:opacity-100"
									}`}
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									<span>Карусель</span>
								</button>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<span
								className="text-xs font-medium"
								style={{ color: "var(--text-app)" }}
							>
								Комментарии к записи
							</span>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={commentsOnPost}
									onChange={(e) =>
										onToggleComments(e.target.checked)
									}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
							</label>
						</div>

						<div className="flex items-start justify-between">
							<div className="flex flex-col pr-4">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-app)" }}
								>
									Уведомление для подписчиков
								</span>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									Колокольчик подписчикам
								</span>
							</div>
							<label className="relative inline-flex items-center cursor-pointer mt-0.5">
								<input
									type="checkbox"
									checked={notifyFollowers}
									onChange={(e) =>
										onToggleNotify(e.target.checked)
									}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
							</label>
						</div>

						<div className="flex items-start justify-between">
							<div className="flex flex-col pr-4">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-app)" }}
								>
									Подпись автора
								</span>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									«Автор: Имя Фамилия»
								</span>
							</div>
							<label className="relative inline-flex items-center cursor-pointer mt-0.5">
								<input
									type="checkbox"
									checked={authorsName}
									onChange={(e) =>
										onToggleAuthor(e.target.checked)
									}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
							</label>
						</div>

						<div className="flex items-start justify-between">
							<div className="flex flex-col pr-4">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-app)" }}
								>
									Метка «Реклама от автора»
								</span>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									Нельзя изменить после публикации
								</span>
							</div>
							<label className="relative inline-flex items-center cursor-pointer mt-0.5">
								<input
									type="checkbox"
									checked={adFromCreator}
									onChange={(e) =>
										onToggleAd(e.target.checked)
									}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
							</label>
						</div>
					</div>
				)}
			</div>

			{!editingPostId && (
				<div
					className="mt-3 p-3.5 rounded-2xl border flex flex-col gap-3 text-xs select-none relative"
					ref={calendarRef}
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-app)",
					}}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-blue-400" />
							<span
								className="font-medium"
								style={{ color: "var(--text-app)" }}
							>
								Задать время слота вручную
							</span>
						</div>
						<label className="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								checked={isManualTime}
								onChange={(e) =>
									onToggleManualTime(e.target.checked)
								}
								className="sr-only peer"
							/>
							<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
						</label>
					</div>

					{isManualTime && (
						<div
							className="pt-2.5 border-t flex items-center justify-between gap-3"
							style={{ borderColor: "var(--border-app)" }}
						>
							<span
								className="text-[11px]"
								style={{ color: "var(--text-dim)" }}
							>
								Время публикации:
							</span>
							<button
								onClick={onToggleCalendar}
								className="flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none transition-colors"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<Clock className="h-3.5 w-3.5 text-blue-400" />
								<span>{getCustomDisplayString()}</span>
							</button>
						</div>
					)}

					{isCalendarOpen && isManualTime && (
						<div
							className="absolute bottom-full left-0 mb-2 w-72 border rounded-2xl shadow-2xl p-3.5 z-50"
							style={{
								backgroundColor: "var(--bg-surface)",
								borderColor: "var(--border-light)",
							}}
						>
							<div className="flex items-center justify-between mb-3 text-xs">
								<span
									className="font-semibold capitalize"
									style={{ color: "var(--text-app)" }}
								>
									{format(viewMonth, "LLLL yyyy", {
										locale: ru,
									})}
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() =>
											onSetViewMonth(
												subMonths(viewMonth, 1),
											)
										}
										className="p-1 rounded-lg hover:opacity-80"
									>
										<CL className="h-4 w-4" />
									</button>
									<button
										onClick={() =>
											onSetViewMonth(
												addMonths(viewMonth, 1),
											)
										}
										className="p-1 rounded-lg hover:opacity-80"
									>
										<CR className="h-4 w-4" />
									</button>
								</div>
							</div>

							<div
								className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium mb-1"
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

							<div className="grid grid-cols-7 gap-1 text-center text-xs">
								{daysInCal.map((day, idx) => {
									const isSelected = isSameDay(
										day,
										selectedDate,
									);
									const isCurrentMonth =
										day.getMonth() === viewMonth.getMonth();
									return (
										<button
											key={idx}
											onClick={() =>
												onSetSelectedDate(day)
											}
											className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-mono text-[11px] transition-colors ${
												isSelected
													? "bg-blue-600 text-white font-semibold shadow-md"
													: isCurrentMonth
														? "hover:opacity-80"
														: "opacity-30"
											}`}
										>
											{format(day, "d")}
										</button>
									);
								})}
							</div>

							<div
								className="mt-3 pt-3 border-t flex items-center justify-between text-xs"
								style={{ borderColor: "var(--border-app)" }}
							>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									Время (24h):
								</span>
								<div className="flex items-center gap-1 font-mono">
									<select
										value={pickerHours}
										onChange={(e) =>
											onSetPickerHours(
												Number(e.target.value),
											)
										}
										className="border rounded-lg px-2 py-1 text-xs focus:outline-none"
										style={{
											backgroundColor:
												"var(--bg-surface-sub)",
											color: "var(--text-app)",
											borderColor: "var(--border-light)",
										}}
									>
										{Array.from({ length: 24 }).map(
											(_, i) => (
												<option
													key={i}
													value={i}
													className="bg-slate-900 text-slate-100"
												>
													{i
														.toString()
														.padStart(2, "0")}
												</option>
											),
										)}
									</select>
									<span>:</span>
									<select
										value={pickerMinutes}
										onChange={(e) =>
											onSetPickerMinutes(
												Number(e.target.value),
											)
										}
										className="border rounded-lg px-2 py-1 text-xs focus:outline-none"
										style={{
											backgroundColor:
												"var(--bg-surface-sub)",
											color: "var(--text-app)",
											borderColor: "var(--border-light)",
										}}
									>
										{Array.from({ length: 12 }).map(
											(_, i) => {
												const m = i * 5;
												return (
													<option
														key={m}
														value={m}
														className="bg-slate-900 text-slate-100"
													>
														{m
															.toString()
															.padStart(2, "0")}
													</option>
												);
											},
										)}
									</select>
								</div>
							</div>

							<div className="mt-3 flex justify-end">
								<button
									onClick={onToggleCalendar}
									className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
								>
									Применить
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			<div
				className="mt-4 pt-3 border-t flex items-center gap-3"
				style={{ borderColor: "var(--border-app)" }}
			>
				{editingPostId && (
					<button
						onClick={onCancelEditing}
						className="px-4 py-3.5 rounded-xl border font-semibold text-sm hover:opacity-80 transition-opacity"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						Отмена
					</button>
				)}

				<button
					onClick={onSavePost}
					disabled={!selectedTargetId}
					className={`flex-1 flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${
						editingPostId
							? "bg-emerald-600 hover:bg-emerald-500"
							: "bg-blue-600 hover:bg-blue-500"
					}`}
				>
					{editingPostId ? (
						<>
							<Save className="h-4 w-4" />
							<span>
								Сохранить изменения в посте #{editingPostId}
							</span>
						</>
					) : (
						<>
							<Plus className="h-4 w-4" />
							<span>
								{isManualTime
									? `Добавить на выбранное время — ${getCustomDisplayString()}`
									: `Добавить в очередь — ${nextSlotDisplay}`}
							</span>
						</>
					)}
				</button>
			</div>
		</section>
	);
};
