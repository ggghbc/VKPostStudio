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
	Trash2,
	Palette,
	Globe,
	HardDrive,
} from "lucide-react";
import { PostItem, Theme, Pattern } from "../types";
import { translations, Lang } from "../services/i18n";

export const SettingsModal: React.FC<{
	show: boolean;
	theme: Theme;
	lang: Lang;
	onClose: () => void;
	onSetTheme: (t: Theme) => void;
	onSetLang: (l: Lang) => void;
	onBackupDb: () => void;
	onCleanExpiredTokens: () => void;
}> = ({
	show,
	theme,
	lang,
	onClose,
	onSetTheme,
	onSetLang,
	onBackupDb,
	onCleanExpiredTokens,
}) => {
	if (!show) return null;
	const t = translations[lang];

	const themeOptions: { id: Theme; label: string; colors: string[] }[] = [
		{
			id: "pastel",
			label: t.themePastel,
			colors: ["#cdb4db", "#ffc8dd", "#ffafcc", "#bde0fe", "#a2d2ff"],
		},
		{
			id: "ocean",
			label: t.themeOcean,
			colors: ["#03045e", "#0077b6", "#00b4d8", "#90e0ef", "#caf0f8"],
		},
		{
			id: "pink",
			label: t.themePink,
			colors: ["#ffe5ec", "#ffc2d1", "#ffb3c6", "#ff8fab", "#fb6f92"],
		},
		{
			id: "earthy",
			label: t.themeEarthy,
			colors: ["#cad2c5", "#84a98c", "#52796f", "#354f52", "#2f3e46"],
		},
		{
			id: "steel",
			label: t.themeSteel,
			colors: ["#f8f9fa", "#dee2e6", "#adb5bd", "#495057", "#212529"],
		},
	];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div
					className="flex items-center justify-between pb-3 border-b"
					style={{ borderColor: "var(--border-app)" }}
				>
					<h3
						className="font-semibold text-base"
						style={{ color: "var(--text-app)" }}
					>
						{t.settingsTitle}
					</h3>
					<button
						onClick={onClose}
						className="hover:opacity-70"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-2">
					<label
						className="flex items-center gap-2 text-xs font-semibold"
						style={{ color: "var(--text-app)" }}
					>
						<Palette
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
						<span>{t.themeTitle}</span>
					</label>
					<div className="flex flex-col gap-2">
						{themeOptions.map((th) => (
							<button
								key={th.id}
								onClick={() => onSetTheme(th.id)}
								className="flex items-center justify-between py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all"
								style={{
									backgroundColor:
										theme === th.id
											? "var(--btn-primary-bg)"
											: "var(--bg-surface-sub)",
									borderColor:
										theme === th.id
											? "var(--btn-primary-bg)"
											: "var(--border-light)",
									color:
										theme === th.id
											? "var(--btn-primary-text)"
											: "var(--text-app)",
								}}
							>
								<span>{th.label}</span>
								<div className="flex items-center gap-1">
									{th.colors.map((c, i) => (
										<span
											key={i}
											className="h-3.5 w-3.5 rounded-full border border-black/20"
											style={{ backgroundColor: c }}
										/>
									))}
								</div>
							</button>
						))}
					</div>
				</div>

				<div className="space-y-2">
					<label
						className="flex items-center gap-2 text-xs font-semibold"
						style={{ color: "var(--text-app)" }}
					>
						<Globe
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
						<span>{t.langTitle}</span>
					</label>
					<div className="grid grid-cols-2 gap-2">
						{[
							{ id: "ru" as Lang, label: "Русский" },
							{ id: "en" as Lang, label: "English" },
						].map((lg) => (
							<button
								key={lg.id}
								onClick={() => onSetLang(lg.id)}
								className="py-2 px-3 rounded-xl border text-xs font-medium transition-all"
								style={{
									backgroundColor:
										lang === lg.id
											? "var(--btn-primary-bg)"
											: "var(--bg-surface-sub)",
									borderColor:
										lang === lg.id
											? "var(--btn-primary-bg)"
											: "var(--border-light)",
									color:
										lang === lg.id
											? "var(--btn-primary-text)"
											: "var(--text-app)",
								}}
							>
								{lg.label}
							</button>
						))}
					</div>
				</div>

				<div
					className="pt-3 border-t space-y-2.5"
					style={{ borderColor: "var(--border-app)" }}
				>
					<button
						onClick={onBackupDb}
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium hover:opacity-80 transition-all"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						<div className="flex items-center gap-2">
							<HardDrive
								className="h-4 w-4"
								style={{ color: "var(--accent)" }}
							/>
							<span>{t.backupDb}</span>
						</div>
					</button>

					<button
						onClick={onCleanExpiredTokens}
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-rose-400 hover:bg-rose-500/10 border-rose-500/20 transition-all"
					>
						<div className="flex items-center gap-2">
							<ShieldAlert className="h-4 w-4" />
							<span>{t.cleanExpiredTokens}</span>
						</div>
					</button>
				</div>

				<div className="flex justify-end pt-2">
					<button
						onClick={onClose}
						className="px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						OK
					</button>
				</div>
			</div>
		</div>
	);
};

export const TokenModal: React.FC<{
	show: boolean;
	tokenInput: string;
	isAdding: boolean;
	lang: Lang;
	onClose: () => void;
	onInputChange: (val: string) => void;
	onOpenBrowser: () => void;
	onPaste: () => void;
	onSubmit: () => void;
	onCleanExpired: () => void;
}> = ({
	show,
	tokenInput,
	isAdding,
	lang,
	onClose,
	onInputChange,
	onOpenBrowser,
	onPaste,
	onSubmit,
	onCleanExpired,
}) => {
	if (!show) return null;
	const t = translations[lang];

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
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<Key className="h-5 w-5" />
						<h3
							className="font-semibold text-base"
							style={{ color: "var(--text-app)" }}
						>
							{lang === "ru" ? "Вход ВКонтакте" : "VK Login"}
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
					<div
						className="p-3.5 border rounded-xl text-xs leading-relaxed"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						1.{" "}
						{lang === "ru"
							? "Нажмите кнопку ниже, чтобы открыть страницу ВК в браузере."
							: "Click below to open VK login page in browser."}
						<br />
						2.{" "}
						{lang === "ru"
							? "Нажмите «Разрешить» и скопируйте адресную строку целиком."
							: "Click 'Allow' and copy the entire address bar URL."}
						<br />
						3.{" "}
						{lang === "ru"
							? "Вставьте ссылку в поле ниже и подтвердите."
							: "Paste URL below and confirm."}
					</div>

					<div className="flex gap-2">
						<button
							onClick={onOpenBrowser}
							className="flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95"
							style={{
								backgroundColor: "var(--btn-primary-bg)",
								color: "var(--btn-primary-text)",
							}}
						>
							<ExternalLink className="h-3.5 w-3.5" />
							<span>
								{lang === "ru"
									? "Открыть окно входа в браузере"
									: "Open login window in browser"}
							</span>
						</button>

						<button
							onClick={onPaste}
							className="flex items-center gap-1.5 border px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-80 transition-opacity"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
							title="Paste"
						>
							<ClipboardCheck
								className="h-4 w-4"
								style={{ color: "var(--accent)" }}
							/>
							<span>{lang === "ru" ? "Вставить" : "Paste"}</span>
						</button>
					</div>

					<div>
						<label
							className="block text-[11px] font-medium mb-1.5"
							style={{ color: "var(--text-dim)" }}
						>
							{lang === "ru"
								? "Токен или ссылка из адресной строки:"
								: "Token or address bar URL:"}
						</label>
						<textarea
							rows={2}
							placeholder="blank.html#access_token=..."
							className="w-full rounded-xl p-3 text-xs border focus:outline-none font-mono resize-none leading-relaxed"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								color: "var(--text-app)",
								borderColor: "var(--border-light)",
							}}
							value={tokenInput}
							onChange={(e) => onInputChange(e.target.value)}
						/>
					</div>

					<div
						className="pt-2 border-t flex justify-between items-center"
						style={{ borderColor: "var(--border-app)" }}
					>
						<button
							onClick={onCleanExpired}
							className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium py-1"
						>
							<ShieldAlert className="h-3.5 w-3.5" />
							<span>{t.cleanExpiredTokens}</span>
						</button>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-xs font-medium hover:opacity-70"
						style={{ color: "var(--text-muted)" }}
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						disabled={isAdding || !tokenInput.trim()}
						className="px-5 py-2 font-bold rounded-xl text-xs disabled:opacity-50 transition-all shadow-md active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						{isAdding
							? "..."
							: lang === "ru"
								? "Подтвердить"
								: "Confirm"}
					</button>
				</div>
			</div>
		</div>
	);
};

export const PatternModal: React.FC<{
	show: boolean;
	patterns: Pattern[];
	name: string;
	times: string;
	intervalDays: number;
	lang: Lang;
	onClose: () => void;
	onNameChange: (v: string) => void;
	onTimesChange: (v: string) => void;
	onIntervalChange: (v: number) => void;
	onSubmit: () => void;
	onDeletePattern: (id: number) => void;
}> = ({
	show,
	patterns,
	name,
	times,
	intervalDays,
	lang,
	onClose,
	onNameChange,
	onTimesChange,
	onIntervalChange,
	onSubmit,
	onDeletePattern,
}) => {
	if (!show) return null;
	const t = translations[lang];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div
					className="flex items-center justify-between pb-2 border-b"
					style={{ borderColor: "var(--border-app)" }}
				>
					<h3
						className="font-semibold text-base"
						style={{ color: "var(--text-app)" }}
					>
						{t.createPatternTitle}
					</h3>
					<button onClick={onClose} className="hover:opacity-70">
						<X className="h-5 w-5" />
					</button>
				</div>

				{patterns.length > 0 && (
					<div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
						<span
							className="text-[11px] font-semibold"
							style={{ color: "var(--text-dim)" }}
						>
							{lang === "ru"
								? "Текущие паттерны:"
								: "Existing patterns:"}
						</span>
						{patterns.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between p-2 rounded-lg border text-xs"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<div className="flex flex-col truncate pr-2">
									<span className="font-semibold truncate">
										{p.name}
									</span>
									<span className="text-[10px] opacity-70">
										{p.interval_days > 1
											? `раз в ${p.interval_days} дн. • `
											: ""}
										{p.times_json}
									</span>
								</div>
								{patterns.length > 1 && (
									<button
										onClick={() => onDeletePattern(p.id)}
										className="p-1 hover:text-rose-400 transition-colors"
										title={
											lang === "ru"
												? "Удалить этот паттерн"
												: "Delete this pattern"
										}
									>
										<Trash2 className="h-3.5 w-3.5" />
									</button>
								)}
							</div>
						))}
					</div>
				)}

				<div
					className="space-y-3 pt-2 border-t"
					style={{ borderColor: "var(--border-app)" }}
				>
					<div>
						<label
							className="block text-xs font-medium mb-1"
							style={{ color: "var(--text-dim)" }}
						>
							{t.patternName}
						</label>
						<input
							type="text"
							placeholder={
								lang === "ru"
									? "Например: 1 пост раз в 3 дня"
									: "e.g. 1 post every 3 days"
							}
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
							className="block text-xs font-medium mb-1"
							style={{ color: "var(--text-dim)" }}
						>
							{t.timesCsv}
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
							className="block text-xs font-medium mb-1"
							style={{ color: "var(--text-dim)" }}
						>
							{t.intervalDays}
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

				<div className="mt-4 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-xs font-medium hover:opacity-70"
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						{t.savePattern}
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
	lang: Lang;
	onClose: () => void;
	onSetChunkSize: (s: number) => void;
	onSubmit: () => void;
}> = ({
	show,
	totalFiles,
	chunkSize,
	isCreating,
	lang,
	onClose,
	onSetChunkSize,
	onSubmit,
}) => {
	if (!show) return null;
	const t = translations[lang];

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
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<Layers3 className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							{t.batchGen}
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
					{lang === "ru"
						? `Вы выбрали ${totalFiles} изображений. Выберите схему:`
						: `You selected ${totalFiles} images. Choose chunk size:`}
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
							className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all"
							style={{
								backgroundColor:
									chunkSize === opt.size
										? "var(--btn-primary-bg)"
										: "var(--bg-surface-sub)",
								borderColor:
									chunkSize === opt.size
										? "var(--btn-primary-bg)"
										: "var(--border-light)",
								color:
									chunkSize === opt.size
										? "var(--btn-primary-text)"
										: "var(--text-app)",
							}}
						>
							<span>{opt.label}</span>
							{chunkSize === opt.size && (
								<CheckCircle2 className="h-4 w-4" />
							)}
						</button>
					))}
				</div>
				<div className="flex justify-end gap-2.5">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70"
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						disabled={isCreating}
						className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						{isCreating
							? "..."
							: lang === "ru"
								? "Сформировать очередь"
								: "Generate Queue"}
					</button>
				</div>
			</div>
		</div>
	);
};

export const RevertModal: React.FC<{
	post: PostItem | null;
	lang: Lang;
	onClose: () => void;
	onRevertSameTime: (id: number) => void;
	onRevertNextSlot: (id: number) => void;
}> = ({ post, lang, onClose, onRevertSameTime, onRevertNextSlot }) => {
	if (!post) return null;
	const t = translations[lang];

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
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<Undo2 className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							{t.revertToLocal}
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
					{lang === "ru"
						? "Пост удалится из ВК и вернётся в локальную очередь:"
						: "Post will be removed from VK and moved to local queue:"}
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
						<span>{t.revertSameTime}</span>
						<span
							className="font-mono text-[11px]"
							style={{ color: "var(--accent)" }}
						>
							{format(
								new Date(post.scheduled_at_utc),
								"dd/MM/yyyy HH:mm",
							)}
						</span>
					</button>
					<button
						onClick={() => onRevertNextSlot(post.id)}
						className="w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs shadow-md text-left transition-all active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						<span>{t.revertNextSlot}</span>
					</button>
				</div>
				<div className="mt-5 flex justify-end">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70"
					>
						{t.cancel}
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
	lang: Lang;
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
	lang,
	onClose,
	onViewMonthChange,
	onDateSelect,
	onHoursChange,
	onMinutesChange,
	onSubmit,
}) => {
	if (!post) return null;
	const t = translations[lang];

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
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<Calendar className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							{t.selectPubTime}
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
					<span className="opacity-70">Сб</span>
					<span className="opacity-70">Вс</span>
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
					className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
					style={{ borderColor: "var(--border-app)" }}
				>
					<span
						className="text-[11px]"
						style={{ color: "var(--text-dim)" }}
					>
						{lang === "ru" ? "Время (24h):" : "Time (24h):"}
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
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						{t.saveTime}
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
