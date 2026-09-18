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
import {
	X,
	Key,
	ExternalLink,
	ClipboardCheck,
	Layers3,
	CheckCircle2,
	Undo2,
	Calendar,
	ChevronLeft,
	ChevronRight,
	ShieldAlert,
} from "lucide-react";
import { PostItem } from "../types";

interface TokenModalProps {
	show: boolean;
	tokenInput: string;
	isAdding: boolean;
	onClose: () => void;
	onInputChange: (val: string) => void;
	onOpenBrowser: () => void;
	onPaste: () => void;
	onSubmit: () => void;
	onCleanExpired: () => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
	show,
	tokenInput,
	isAdding,
	onClose,
	onInputChange,
	onOpenBrowser,
	onPaste,
	onSubmit,
	onCleanExpired,
}) => {
	if (!show) return null;

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 text-blue-400">
						<Key className="h-5 w-5" />
						<h3
							className="font-semibold text-base"
							style={{ color: "var(--text-app)" }}
						>
							Управление токенами
						</h3>
					</div>
					<button
						onClick={onClose}
						className="hover:opacity-70"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4">
					<div className="p-3.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 leading-relaxed">
						1. Нажмите синюю кнопку ниже, чтобы открыть страницу ВК
						в браузере.
						<br />
						2. Нажмите <strong>«Разрешить»</strong> и скопируйте
						ссылку из адресной строки.
						<br />
						3. Вставьте ссылку в поле (токен вырежется
						автоматически) и нажмите <strong>«Подтвердить»</strong>.
					</div>

					<div className="flex gap-2">
						<button
							onClick={onOpenBrowser}
							className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-xs shadow-md transition-all"
						>
							<ExternalLink className="h-3.5 w-3.5" />
							<span>Открыть окно входа в браузере</span>
						</button>

						<button
							onClick={onPaste}
							className="flex items-center gap-1.5 border px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-80 transition-opacity"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
							title="Вставить из буфера обмена"
						>
							<ClipboardCheck className="h-4 w-4 text-emerald-400" />
							<span>Вставить</span>
						</button>
					</div>

					<div>
						<label
							className="block text-[11px] font-medium mb-1.5"
							style={{ color: "var(--text-dim)" }}
						>
							Токен или скопированная ссылка из адресной строки:
						</label>
						<textarea
							rows={2}
							placeholder="Вставьте ссылку или токен..."
							className="w-full rounded-xl p-3 text-xs border focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
							value={tokenInput}
							onChange={(e) => onInputChange(e.target.value)}
						/>
					</div>

					{/* Логичная кнопка очистки недействительных токенов */}
					<div
						className="pt-2 border-t flex justify-between items-center"
						style={{ borderColor: "var(--border-app)" }}
					>
						<button
							onClick={onCleanExpired}
							className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium py-1"
							title="Проверить все токены и удалить те, чей срок жизни истек"
						>
							<ShieldAlert className="h-3.5 w-3.5" />
							<span>Удалить просроченные токены</span>
						</button>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-xs font-medium hover:opacity-70"
						style={{ color: "var(--text-muted)" }}
					>
						Отмена
					</button>
					<button
						onClick={onSubmit}
						disabled={isAdding || !tokenInput.trim()}
						className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-md"
					>
						{isAdding ? "Проверка..." : "Подтвердить"}
					</button>
				</div>
			</div>
		</div>
	);
};

export const PatternModal: React.FC<{
	show: boolean;
	name: string;
	times: string;
	intervalDays: number;
	onClose: () => void;
	onNameChange: (v: string) => void;
	onTimesChange: (v: string) => void;
	onIntervalChange: (v: number) => void;
	onSubmit: () => void;
}> = ({
	show,
	name,
	times,
	intervalDays,
	onClose,
	onNameChange,
	onTimesChange,
	onIntervalChange,
	onSubmit,
}) => {
	if (!show) return null;
	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<h3
						className="font-semibold text-base"
						style={{ color: "var(--text-app)" }}
					>
						Создание своего паттерна
					</h3>
					<button onClick={onClose} className="hover:opacity-70">
						<X className="h-5 w-5" />
					</button>
				</div>
				<div className="space-y-4">
					<div>
						<label
							className="block text-xs font-medium mb-1.5"
							style={{ color: "var(--text-dim)" }}
						>
							Название паттерна
						</label>
						<input
							type="text"
							placeholder="Например: 1 пост раз в 3 дня"
							className="w-full rounded-xl px-3.5 py-2 text-sm border focus:outline-none"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
							value={name}
							onChange={(e) => onNameChange(e.target.value)}
						/>
					</div>
					<div>
						<label
							className="block text-xs font-medium mb-1.5"
							style={{ color: "var(--text-dim)" }}
						>
							Времена публикаций через запятую (ЧЧ:ММ)
						</label>
						<input
							type="text"
							placeholder="14:00, 18:00, 21:00"
							className="w-full rounded-xl px-3.5 py-2 text-sm border font-mono focus:outline-none"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
							value={times}
							onChange={(e) => onTimesChange(e.target.value)}
						/>
					</div>
					<div>
						<label
							className="block text-xs font-medium mb-1.5"
							style={{ color: "var(--text-dim)" }}
						>
							Интервал в днях (1 = каждый день, 2 = через день, 3
							= раз в 3 дня)
						</label>
						<input
							type="number"
							min={1}
							max={30}
							className="w-full rounded-xl px-3.5 py-2 text-sm border font-mono focus:outline-none"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
							value={intervalDays}
							onChange={(e) =>
								onIntervalChange(
									Math.max(1, Number(e.target.value)),
								)
							}
						/>
					</div>
				</div>
				<div className="mt-6 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-xs font-medium hover:opacity-70"
					>
						Отмена
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white hover:bg-blue-500"
					>
						Сохранить паттерн
					</button>
				</div>
			</div>
		</div>
	);
};

export const BatchModal: React.FC<{
	show: boolean;
	totalFiles: number;
	chunkSize: number;
	isCreating: boolean;
	onClose: () => void;
	onSetChunkSize: (s: number) => void;
	onSubmit: () => void;
}> = ({
	show,
	totalFiles,
	chunkSize,
	isCreating,
	onClose,
	onSetChunkSize,
	onSubmit,
}) => {
	if (!show) return null;
	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 text-amber-400">
						<Layers3 className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							Пакетная генерация очереди
						</h3>
					</div>
					<button onClick={onClose} className="hover:opacity-70">
						<X className="h-5 w-5" />
					</button>
				</div>
				<p
					className="text-xs mb-4 leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					Вы выбрали <strong>{totalFiles}</strong> изображений.
					Выберите схему разделения:
				</p>
				<div className="space-y-2 mb-5">
					{[
						{
							size: 1,
							label: `По 1 фото на пост (${totalFiles} постов)`,
						},
						{
							size: 2,
							label: `По 2 фото на пост (${Math.ceil(totalFiles / 2)} постов)`,
						},
						{
							size: 4,
							label: `По 4 фото на пост (${Math.ceil(totalFiles / 4)} постов)`,
						},
					].map((opt) => (
						<button
							key={opt.size}
							onClick={() => onSetChunkSize(opt.size)}
							className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
								chunkSize === opt.size
									? "bg-amber-500/20 border-amber-500/40 text-amber-300"
									: "hover:opacity-80"
							}`}
							style={{
								backgroundColor:
									chunkSize === opt.size
										? undefined
										: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
						>
							<span>{opt.label}</span>
							{chunkSize === opt.size && (
								<CheckCircle2 className="h-4 w-4 text-amber-400" />
							)}
						</button>
					))}
				</div>
				<div className="flex justify-end gap-2.5">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70"
					>
						Отмена
					</button>
					<button
						onClick={onSubmit}
						disabled={isCreating}
						className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md"
					>
						{isCreating ? "Создание..." : "Сформировать очередь"}
					</button>
				</div>
			</div>
		</div>
	);
};

export const RevertModal: React.FC<{
	post: PostItem | null;
	onClose: () => void;
	onRevertSameTime: (id: number) => void;
	onRevertNextSlot: (id: number) => void;
}> = ({ post, onClose, onRevertSameTime, onRevertNextSlot }) => {
	if (!post) return null;
	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 text-amber-400">
						<Undo2 className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							Вернуть пост в локальную очередь
						</h3>
					</div>
					<button onClick={onClose} className="hover:opacity-70">
						<X className="h-5 w-5" />
					</button>
				</div>
				<p
					className="text-xs mb-5 leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					Пост удалится со стены ВК и вернётся в локальную очередь для
					правок. Выберите слот:
				</p>
				<div className="space-y-2.5">
					<button
						onClick={() => onRevertSameTime(post.id)}
						className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all text-left"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						<span>Вернуть на то же время</span>
						<span className="font-mono text-[11px] text-blue-400">
							{format(
								new Date(post.scheduled_at_utc),
								"dd/MM/yyyy HH:mm",
							)}
						</span>
					</button>
					<button
						onClick={() => onRevertNextSlot(post.id)}
						className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md text-left"
					>
						<span>Добавить в конец очереди (по паттерну)</span>
					</button>
				</div>
				<div className="mt-5 flex justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70"
					>
						Отмена
					</button>
				</div>
			</div>
		</div>
	);
};

export const RescheduleModal: React.FC<{
	post: PostItem | null;
	date: Date;
	hours: number;
	minutes: number;
	viewMonth: Date;
	onClose: () => void;
	onViewMonthChange: (d: Date) => void;
	onDateSelect: (d: Date) => void;
	onHoursChange: (h: number) => void;
	onMinutesChange: (m: number) => void;
	onSubmit: () => void;
}> = ({
	post,
	date,
	hours,
	minutes,
	viewMonth,
	onClose,
	onViewMonthChange,
	onDateSelect,
	onHoursChange,
	onMinutesChange,
	onSubmit,
}) => {
	if (!post) return null;

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
	const days = eachDayOfInterval({ start: calStart, end: calEnd });

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center justify-between mb-4">
					<div className="flex items-center gap-2 text-blue-400">
						<Calendar className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							Выбор времени публикации
						</h3>
					</div>
					<button onClick={onClose} className="hover:opacity-70">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="flex items-center justify-between mb-3 text-xs">
					<span
						className="font-semibold capitalize"
						style={{ color: "var(--text-app)" }}
					>
						{format(viewMonth, "LLLL yyyy", { locale: ru })}
					</span>
					<div className="flex items-center gap-1">
						<button
							onClick={() =>
								onViewMonthChange(subMonths(viewMonth, 1))
							}
							className="p-1 rounded-lg border hover:opacity-80"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							onClick={() =>
								onViewMonthChange(addMonths(viewMonth, 1))
							}
							className="p-1 rounded-lg border hover:opacity-80"
						>
							<ChevronRight className="h-4 w-4" />
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
					{days.map((day, idx) => {
						const isSelected = isSameDay(day, date);
						const isCurrentMonth =
							day.getMonth() === viewMonth.getMonth();
						return (
							<button
								key={idx}
								onClick={() => onDateSelect(day)}
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
					className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
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
							value={hours}
							onChange={(e) =>
								onHoursChange(Number(e.target.value))
							}
							className="border rounded-lg px-2 py-1 text-xs focus:outline-none"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
						>
							{Array.from({ length: 24 }).map((_, i) => (
								<option
									key={i}
									value={i}
									className="bg-slate-900 text-slate-100"
								>
									{i.toString().padStart(2, "0")}
								</option>
							))}
						</select>
						<span>:</span>
						<select
							value={minutes}
							onChange={(e) =>
								onMinutesChange(Number(e.target.value))
							}
							className="border rounded-lg px-2 py-1 text-xs focus:outline-none"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
						>
							{Array.from({ length: 12 }).map((_, i) => {
								const m = i * 5;
								return (
									<option
										key={m}
										value={m}
										className="bg-slate-900 text-slate-100"
									>
										{m.toString().padStart(2, "0")}
									</option>
								);
							})}
						</select>
					</div>
				</div>

				<div className="mt-5 flex justify-end gap-2.5">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70"
					>
						Отмена
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
					>
						Сохранить время
					</button>
				</div>
			</div>
		</div>
	);
};

export const LightboxModal: React.FC<{
	url: string | null;
	onClose: () => void;
}> = ({ url, onClose }) => {
	if (!url) return null;
	return (
		<div
			onClick={onClose}
			className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50 cursor-zoom-out animate-in fade-in duration-150"
		>
			<div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
				<img
					src={url}
					alt="Full preview"
					className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
				/>
				<button
					onClick={onClose}
					className="absolute -top-4 -right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-lg"
				>
					<X className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
};
