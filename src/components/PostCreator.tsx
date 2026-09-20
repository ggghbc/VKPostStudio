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
	Eye,
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
import { translations, Lang } from "../services/i18n";
import { CustomSelect } from "./CustomSelect";

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
	isDraggingOver: boolean;
	lang: Lang;
	onTextChange: (text: string) => void;
	onSelectPattern: (id: number) => void;
	onOpenPatternModal: () => void;
	onSelectFiles: () => void;
	onMoveFile: (from: number, to: number) => void;
	onRemoveFile: (idx: number) => void;
	onSetFullView: (url: string) => void;
	onOpenBatchModal: () => void;
	onOpenLivePreview: () => void;
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
	isDraggingOver,
	lang,
	onTextChange,
	onSelectPattern,
	onOpenPatternModal,
	onSelectFiles,
	onMoveFile,
	onRemoveFile,
	onSetFullView,
	onOpenBatchModal,
	onOpenLivePreview,
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
	const t = translations[lang];
	const calendarRef = useRef<HTMLDivElement>(null);

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
	const daysInCal = eachDayOfInterval({ start: calStart, end: calEnd });

	const getCustomDisplayString = () => {
		const d = new Date(selectedDate);
		d.setHours(pickerHours, pickerMinutes, 0, 0);
		return format(d, "dd/MM/yy - HH:mm");
	};

	return (
		<section
			className={`flex flex-col border-r p-4 sm:p-5 overflow-y-auto overflow-x-hidden relative z-10 transition-all duration-300 ease-in-out ${
				isRightPanelOpen
					? "w-1/2"
					: "w-full max-w-4xl mx-auto border-r-0"
			}`}
			style={{
				backgroundColor: "var(--bg-surface)",
				borderColor: "var(--border-app)",
			}}
		>
			<div className="mb-2 flex items-center justify-between flex-shrink-0 relative z-20">
				<div className="flex items-center gap-2">
					<h2
						className="text-sm font-semibold tracking-wide"
						style={{ color: "var(--text-app)" }}
					>
						{editingPostId
							? `${t.editPost} #${editingPostId}`
							: t.createPost}
					</h2>
					{editingPostId ? (
						<span
							className="px-2 py-0.5 rounded border text-[10px] font-semibold"
							style={{
								backgroundColor: "var(--accent-glow)",
								borderColor: "var(--accent)",
								color: "var(--accent)",
							}}
						>
							{t.editMode}
						</span>
					) : (
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={onOpenBatchModal}
								className="p-1.5 rounded-lg border hover:opacity-80 transition-all cursor-pointer"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
									color: "var(--accent)",
								}}
								title={t.batchTitle}
							>
								<Layers3 className="h-4 w-4" />
							</button>

							<button
								type="button"
								onClick={onOpenLivePreview}
								className="p-1.5 rounded-lg border hover:opacity-80 transition-all cursor-pointer"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
									color: "var(--accent)",
								}}
								title={t.previewTitle}
							>
								<Eye className="h-4 w-4" />
							</button>
						</div>
					)}
				</div>

				{/* Выпадающий список паттернов с привязкой по правому краю */}
				<div className="flex items-center gap-1.5">
					<CustomSelect
						value={selectedPatternId || ""}
						options={patterns.map((p) => ({
							value: p.id,
							label: `${p.name}${p.interval_days > 1 ? ` (раз в ${p.interval_days} дн.)` : ""}`,
						}))}
						onChange={(val) => onSelectPattern(Number(val))}
						maxWidth="200px"
						alignRight={true}
						icon={
							<Clock
								className="h-3.5 w-3.5"
								style={{ color: "var(--text-dim)" }}
							/>
						}
					/>

					<button
						type="button"
						onClick={onOpenPatternModal}
						className="p-1.5 rounded-lg border hover:opacity-80 transition-colors cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-muted)",
						}}
						title="Настроить паттерн"
					>
						<Settings2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="mb-2 flex-shrink-0">
				<textarea
					className="w-full h-14 min-h-[3.5rem] max-h-24 rounded-xl p-2.5 text-xs border focus:outline-none transition-colors resize-none overflow-y-auto leading-relaxed"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						color: "var(--text-app)",
						borderColor: "var(--border-light)",
					}}
					placeholder={t.postTextPlaceholder}
					value={postText}
					maxLength={15895}
					onChange={(e) => onTextChange(e.target.value)}
				/>
				<div className="flex justify-end px-1">
					<span
						className="text-[10px] font-mono font-medium"
						style={{ color: "var(--text-dim)" }}
					>
						{postText.length} / 15 895 {t.symbols}
					</span>
				</div>
			</div>

			<div className="flex-1 flex flex-col min-h-[140px] max-h-[220px] mb-2 flex-shrink-0">
				{attachedFiles.length === 0 ? (
					<div
						onClick={onSelectFiles}
						onDragOver={(e) => e.preventDefault()}
						onDragEnter={(e) => e.preventDefault()}
						className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer p-4 transition-all ${
							isDraggingOver ? "scale-[0.99]" : "hover:opacity-80"
						}`}
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: isDraggingOver
								? "var(--accent)"
								: "var(--border-light)",
						}}
					>
						<div
							className="p-2.5 rounded-2xl mb-2 shadow-inner"
							style={{
								backgroundColor: "var(--bg-surface)",
								color: "var(--accent)",
							}}
						>
							<UploadCloud className="h-6 w-6" />
						</div>
						<span
							className="text-xs font-semibold"
							style={{ color: "var(--text-app)" }}
						>
							{t.dropzoneTitle}
						</span>
						<span
							className="text-[11px] mt-0.5"
							style={{ color: "var(--text-dim)" }}
						>
							{t.dropzoneSub}
						</span>
					</div>
				) : (
					<div
						className="flex-1 flex flex-col border rounded-2xl p-2.5 overflow-hidden"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
						}}
					>
						<div
							className="flex items-center justify-between pb-1.5 mb-1.5 border-b text-xs"
							style={{ borderColor: "var(--border-light)" }}
						>
							<div className="flex items-center gap-2">
								<span
									className="font-semibold"
									style={{ color: "var(--text-app)" }}
								>
									{t.attachedFiles}
								</span>
								<span
									className="text-[11px] font-mono px-2 py-0.5 rounded-md border"
									style={{
										backgroundColor: "var(--bg-surface)",
										borderColor: "var(--border-light)",
										color: "var(--text-app)",
									}}
								>
									{attachedFiles.length} / 10 {t.mediaLimit}
								</span>
							</div>

							<button
								type="button"
								onClick={onSelectFiles}
								disabled={attachedFiles.length >= 10}
								className="flex items-center gap-1 text-[11px] font-medium disabled:opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
								style={{ color: "var(--accent)" }}
							>
								<ImagePlus className="h-3.5 w-3.5" />
								<span>{t.addMore}</span>
							</button>
						</div>

						<div
							className={`flex-1 overflow-y-auto grid gap-2.5 pr-1 select-none ${isRightPanelOpen ? "grid-cols-3" : "grid-cols-4"}`}
						>
							{attachedFiles.map((file, idx) => (
								<div
									key={`${file.path}_${idx}`}
									className="group relative h-24 rounded-xl border overflow-hidden shadow-md flex items-center justify-center transition-all"
									style={{
										backgroundColor: "var(--bg-surface)",
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
											<FileText
												className="h-6 w-6 mb-1"
												style={{
													color: "var(--accent)",
												}}
											/>
											<span
												className="text-[10px] truncate max-w-[80px]"
												style={{
													color: "var(--text-muted)",
												}}
											>
												{file.name}
											</span>
										</div>
									)}

									<span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white font-bold backdrop-blur-sm">
										#{idx + 1}
									</span>

									<div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/80 backdrop-blur-sm flex items-center justify-between px-1 border-t border-white/10">
										<button
											type="button"
											disabled={idx === 0}
											onClick={(e) => {
												e.stopPropagation();
												onMoveFile(idx, idx - 1);
											}}
											className="p-0.5 rounded hover:bg-white/20 text-white disabled:opacity-20 transition-colors cursor-pointer"
											title="Move left"
										>
											<ArrowLeft className="h-3 w-3" />
										</button>
										<span className="text-[9px] font-mono text-white/70">
											{t.position}
										</span>
										<button
											type="button"
											disabled={
												idx === attachedFiles.length - 1
											}
											onClick={(e) => {
												e.stopPropagation();
												onMoveFile(idx, idx + 1);
											}}
											className="p-0.5 rounded hover:bg-white/20 text-white disabled:opacity-20 transition-colors cursor-pointer"
											title="Move right"
										>
											<ArrowRight className="h-3 w-3" />
										</button>
									</div>

									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onRemoveFile(idx);
										}}
										className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white shadow-lg backdrop-blur-sm transition-colors z-10 cursor-pointer"
										title="Delete"
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
				className="rounded-2xl border overflow-hidden select-none mb-2 flex-shrink-0"
				style={{
					backgroundColor: "var(--bg-surface-sub)",
					borderColor: "var(--border-light)",
				}}
			>
				<button
					type="button"
					onClick={onToggleSettings}
					className="w-full flex items-center justify-between p-2.5 text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
					style={{ color: "var(--text-app)" }}
				>
					<span>{t.pubSettings}</span>
					{isSettingsOpen ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</button>

				{isSettingsOpen && (
					<div
						className="p-2.5 pt-0 space-y-2 border-t"
						style={{ borderColor: "var(--border-light)" }}
					>
						<div className="flex items-center justify-between pt-1">
							<div className="flex flex-col">
								<span
									className="text-xs font-medium"
									style={{ color: "var(--text-app)" }}
								>
									{t.mediaStyle}
								</span>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									{t.mediaStyleSub}
								</span>
							</div>
							<div
								className="flex items-center border rounded-lg p-0.5"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
								}}
							>
								<button
									type="button"
									onClick={() => onSetViewMode("grid")}
									className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer"
									style={{
										backgroundColor:
											attachmentsViewMode === "grid"
												? "var(--btn-primary-bg)"
												: "transparent",
										color:
											attachmentsViewMode === "grid"
												? "var(--btn-primary-text)"
												: "var(--text-muted)",
									}}
								>
									<LayoutGrid className="h-3.5 w-3.5" />
									<span>{t.grid}</span>
								</button>
								<button
									type="button"
									onClick={() => onSetViewMode("carousel")}
									className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-all cursor-pointer"
									style={{
										backgroundColor:
											attachmentsViewMode === "carousel"
												? "var(--btn-primary-bg)"
												: "transparent",
										color:
											attachmentsViewMode === "carousel"
												? "var(--btn-primary-text)"
												: "var(--text-muted)",
									}}
								>
									<SlidersHorizontal className="h-3.5 w-3.5" />
									<span>{t.carousel}</span>
								</button>
							</div>
						</div>

						{[
							{
								label: t.comments,
								sub: "",
								val: commentsOnPost,
								toggle: onToggleComments,
							},
							{
								label: t.notifications,
								sub: t.notificationsSub,
								val: notifyFollowers,
								toggle: onToggleNotify,
							},
							{
								label: t.authorSign,
								sub: t.authorSignSub,
								val: authorsName,
								toggle: onToggleAuthor,
							},
							{
								label: t.adsMark,
								sub: t.adsMarkSub,
								val: adFromCreator,
								toggle: onToggleAd,
							},
						].map((item, idx) => (
							<div
								key={idx}
								className="flex items-start justify-between"
							>
								<div className="flex flex-col pr-4">
									<span
										className="text-xs font-medium"
										style={{ color: "var(--text-app)" }}
									>
										{item.label}
									</span>
									{item.sub && (
										<span
											className="text-[10px]"
											style={{ color: "var(--text-dim)" }}
										>
											{item.sub}
										</span>
									)}
								</div>
								<label className="relative inline-flex items-center cursor-pointer mt-0.5">
									<input
										type="checkbox"
										checked={item.val}
										onChange={(e) =>
											item.toggle(e.target.checked)
										}
										className="sr-only peer"
									/>
									<div
										className="w-8 h-4 rounded-full border transition-all relative flex items-center px-0.5"
										style={{
											backgroundColor: item.val
												? "var(--btn-primary-bg)"
												: "var(--bg-surface)",
											borderColor: "var(--border-light)",
										}}
									>
										<div
											className={`h-3 w-3 rounded-full transition-transform ${
												item.val
													? "translate-x-3.5 shadow-sm"
													: ""
											}`}
											style={{
												backgroundColor: item.val
													? "var(--btn-primary-text)"
													: "var(--text-dim)",
											}}
										/>
									</div>
								</label>
							</div>
						))}
					</div>
				)}
			</div>

			{!editingPostId && (
				<div
					className="p-2.5 rounded-2xl border flex flex-col gap-2 text-xs select-none relative mb-2 flex-shrink-0"
					ref={calendarRef}
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
					}}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Calendar
								className="h-4 w-4"
								style={{ color: "var(--accent)" }}
							/>
							<span
								className="font-medium"
								style={{ color: "var(--text-app)" }}
							>
								{t.manualTimeToggle}
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
							<div
								className="w-8 h-4 rounded-full border transition-all relative flex items-center px-0.5"
								style={{
									backgroundColor: isManualTime
										? "var(--btn-primary-bg)"
										: "var(--bg-surface)",
									borderColor: "var(--border-light)",
								}}
							>
								<div
									className={`h-3 w-3 rounded-full transition-transform ${
										isManualTime
											? "translate-x-3.5 shadow-sm"
											: ""
									}`}
									style={{
										backgroundColor: isManualTime
											? "var(--btn-primary-text)"
											: "var(--text-dim)",
									}}
								/>
							</div>
						</label>
					</div>

					{isManualTime && (
						<div
							className="pt-2 border-t flex items-center justify-between gap-3"
							style={{ borderColor: "var(--border-light)" }}
						>
							<span
								className="text-[11px]"
								style={{ color: "var(--text-dim)" }}
							>
								{t.pubTime}
							</span>
							<button
								type="button"
								onClick={onToggleCalendar}
								className="flex items-center gap-2 border rounded-xl px-2.5 py-1 text-xs font-mono focus:outline-none transition-colors cursor-pointer"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<Clock
									className="h-3.5 w-3.5"
									style={{ color: "var(--accent)" }}
								/>
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
										type="button"
										onClick={() =>
											onSetViewMonth(
												subMonths(viewMonth, 1),
											)
										}
										className="p-1 rounded-lg border hover:opacity-80 cursor-pointer"
									>
										<CL className="h-4 w-4" />
									</button>
									<button
										type="button"
										onClick={() =>
											onSetViewMonth(
												addMonths(viewMonth, 1),
											)
										}
										className="p-1 rounded-lg border hover:opacity-80 cursor-pointer"
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
								<span className="opacity-70">Сб</span>
								<span className="opacity-70">Вс</span>
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
											type="button"
											onClick={() =>
												onSetSelectedDate(day)
											}
											className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-mono text-[11px] transition-colors cursor-pointer ${
												isSelected
													? "shadow-md font-bold"
													: isCurrentMonth
														? "hover:opacity-80"
														: "opacity-30"
											}`}
											style={{
												backgroundColor: isSelected
													? "var(--btn-primary-bg)"
													: "transparent",
												color: isSelected
													? "var(--btn-primary-text)"
													: "var(--text-app)",
											}}
										>
											{format(day, "d")}
										</button>
									);
								})}
							</div>

							<div
								className="mt-3 pt-3 border-t flex items-center justify-between text-xs"
								style={{ borderColor: "var(--border-light)" }}
							>
								<span
									className="text-[11px]"
									style={{ color: "var(--text-dim)" }}
								>
									{lang === "ru"
										? "Время (24h):"
										: "Time (24h):"}
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
													style={{
														backgroundColor:
															"var(--bg-surface)",
														color: "var(--text-app)",
													}}
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
														style={{
															backgroundColor:
																"var(--bg-surface)",
															color: "var(--text-app)",
														}}
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
									type="button"
									onClick={onToggleCalendar}
									className="w-full py-1.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
									style={{
										backgroundColor:
											"var(--btn-primary-bg)",
										color: "var(--btn-primary-text)",
									}}
								>
									{t.apply}
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Кнопка добавления / сохранения */}
			<div
				className="pt-2 border-t flex items-center gap-2.5 mt-auto flex-shrink-0"
				style={{ borderColor: "var(--border-app)" }}
			>
				{editingPostId && (
					<button
						type="button"
						onClick={onCancelEditing}
						className="px-3.5 py-3 rounded-xl border font-semibold text-xs hover:opacity-80 transition-opacity cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						{t.cancel}
					</button>
				)}

				<button
					type="button"
					onClick={onSavePost}
					disabled={!selectedTargetId}
					className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
					style={{
						backgroundColor: "var(--btn-primary-bg)",
						color: "var(--btn-primary-text)",
					}}
				>
					{editingPostId ? (
						<>
							<Save className="h-4 w-4" />
							<span>
								{t.saveChanges} #{editingPostId}
							</span>
						</>
					) : (
						<>
							<Plus className="h-4 w-4" />
							<span>
								{isManualTime
									? `${t.addToQueue} — ${getCustomDisplayString()}`
									: `${t.addToQueue} — ${nextSlotDisplay}`}
							</span>
						</>
					)}
				</button>
			</div>
		</section>
	);
};
