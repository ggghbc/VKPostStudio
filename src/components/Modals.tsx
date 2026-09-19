import React, { useState, useMemo } from "react";
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
	UploadCloud,
	Database,
	AlertCircle,
	Check,
	ChevronUp,
	ChevronDown,
	DownloadCloud,
	FileText,
	Eye,
	MoreHorizontal,
	Heart,
	MessageCircle,
	Share2,
	Info,
	RefreshCw,
} from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { PostItem, Theme, Pattern, Target, FilePreview } from "../types";
import { translations, Lang } from "../services/i18n";
import { CustomSelect } from "./CustomSelect";

// Внутреннее окно оповещений вместо системного alert
export const NoticeModal: React.FC<{
	show: boolean;
	title: string;
	message: string;
	onClose: () => void;
}> = ({ show, title, message, onClose }) => {
	if (!show) return null;
	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[75] animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center gap-2">
					<Info
						className="h-5 w-5"
						style={{ color: "var(--accent)" }}
					/>
					<h3
						className="font-semibold text-sm"
						style={{ color: "var(--text-app)" }}
					>
						{title}
					</h3>
				</div>

				<p
					className="text-xs leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					{message}
				</p>

				<div
					className="flex justify-end pt-2 border-t"
					style={{ borderColor: "var(--border-app)" }}
				>
					<button
						onClick={onClose}
						className="px-5 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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

// Окно настроек приложения с очисткой БД и выбором типа удаления
export const SettingsModal: React.FC<{
	show: boolean;
	theme: Theme;
	lang: Lang;
	deleteMode: "permanent" | "trash";
	onClose: () => void;
	onSetTheme: (t: Theme) => void;
	onSetLang: (l: Lang) => void;
	onSetDeleteMode: (mode: "permanent" | "trash") => void;
	onBackupDb: () => void;
	onCleanExpiredTokens: () => void;
	onClearDatabase: () => void;
}> = ({
	show,
	theme,
	lang,
	deleteMode,
	onClose,
	onSetTheme,
	onSetLang,
	onSetDeleteMode,
	onBackupDb,
	onCleanExpiredTokens,
	onClearDatabase,
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
		{
			id: "twilight",
			label: t.themeTwilight,
			colors: ["#000814", "#001d3d", "#003566", "#ffc300", "#ffd60a"],
		},
	];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
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
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Тема оформления */}
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
					<div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
						{themeOptions.map((th) => (
							<button
								key={th.id}
								onClick={() => onSetTheme(th.id)}
								className="flex items-center justify-between py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer"
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

				{/* Язык интерфейса */}
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
								className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
									lang === lg.id
										? "border-transparent"
										: "hover:opacity-80"
								}`}
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

				{/* Режим удаления файлов */}
				<div className="space-y-2">
					<label
						className="flex items-center gap-2 text-xs font-semibold"
						style={{ color: "var(--text-app)" }}
					>
						<Trash2
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
						<span>{t.deleteModeTitle}</span>
					</label>
					<div className="grid grid-cols-2 gap-2">
						{[
							{ id: "trash" as const, label: t.deleteModeTrash },
							{
								id: "permanent" as const,
								label: t.deleteModePermanent,
							},
						].map((mode) => (
							<button
								key={mode.id}
								onClick={() => onSetDeleteMode(mode.id)}
								className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
									deleteMode === mode.id
										? "border-transparent"
										: "hover:opacity-80"
								}`}
								style={{
									backgroundColor:
										deleteMode === mode.id
											? "var(--btn-primary-bg)"
											: "var(--bg-surface-sub)",
									borderColor:
										deleteMode === mode.id
											? "var(--btn-primary-bg)"
											: "var(--border-light)",
									color:
										deleteMode === mode.id
											? "var(--btn-primary-text)"
											: "var(--text-app)",
								}}
							>
								{mode.label}
							</button>
						))}
					</div>
				</div>

				{/* Сервисные действия */}
				<div
					className="pt-2 border-t space-y-2"
					style={{ borderColor: "var(--border-app)" }}
				>
					<button
						onClick={onBackupDb}
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium hover:opacity-80 transition-all cursor-pointer"
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
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-rose-400 hover:bg-rose-500/10 border-rose-500/20 transition-all cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<ShieldAlert className="h-4 w-4" />
							<span>{t.cleanExpiredTokens}</span>
						</div>
					</button>

					{/* Кнопка очистки базы данных */}
					<button
						onClick={onClearDatabase}
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-rose-400 hover:bg-rose-500/10 border-rose-500/20 transition-all cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<Trash2 className="h-4 w-4" />
							<span>
								{lang === "ru"
									? "Очистить базу данных (кроме токенов)"
									: "Clear database (except tokens)"}
							</span>
						</div>
					</button>
				</div>

				<div className="flex justify-end pt-1">
					<button
						onClick={onClose}
						className="px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
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

export const VkLivePreviewModal: React.FC<{
	show: boolean;
	lang: Lang;
	targetTitle: string;
	postText: string;
	attachedFiles: FilePreview[];
	viewMode: "grid" | "carousel";
	authorsName: boolean;
	adFromCreator: boolean;
	commentsOnPost: boolean;
	slotDisplay: string;
	onClose: () => void;
}> = ({
	show,
	lang,
	targetTitle,
	postText,
	attachedFiles,
	viewMode,
	authorsName,
	adFromCreator,
	commentsOnPost,
	slotDisplay,
	onClose,
}) => {
	if (!show) return null;
	const t = translations[lang];

	const stats = useMemo(
		() => ({
			likes: Math.floor(Math.random() * 45) + 3,
			comments: commentsOnPost ? Math.floor(Math.random() * 6) : 0,
			shares: Math.floor(Math.random() * 8),
			views: `${(Math.random() * 1.5 + 0.5).toFixed(1)}K`,
		}),
		[show, commentsOnPost],
	);

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div
					className="flex items-center justify-between pb-2 border-b"
					style={{ borderColor: "var(--border-app)" }}
				>
					<div className="flex items-center gap-2">
						<Eye
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							{t.previewTitle}
						</h3>
					</div>
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div
					className="border rounded-xl p-3.5 space-y-3 overflow-y-auto flex-1 shadow-inner"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
					}}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div
								className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0"
								style={{
									backgroundColor: "var(--accent)",
									color: "var(--btn-primary-text)",
								}}
							>
								{targetTitle
									? targetTitle.charAt(0).toUpperCase()
									: "VK"}
							</div>
							<div className="flex flex-col min-w-0">
								<span
									className="font-bold text-xs truncate max-w-[220px]"
									style={{ color: "var(--text-app)" }}
								>
									{targetTitle || "Сообщество"}
								</span>
								<span
									className="text-[10px] font-medium opacity-70"
									style={{ color: "var(--text-dim)" }}
								>
									{slotDisplay}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<span
								className="text-[10px] px-2 py-0.5 rounded-full border opacity-75"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--text-dim)",
								}}
							>
								Promote
							</span>
							<button
								type="button"
								className="p-1 opacity-60 hover:opacity-100 cursor-default"
								style={{ color: "var(--text-dim)" }}
							>
								<MoreHorizontal className="h-4 w-4" />
							</button>
						</div>
					</div>

					{postText && (
						<p
							className="text-xs leading-relaxed whitespace-pre-wrap break-words px-1"
							style={{ color: "var(--text-app)" }}
						>
							{postText}
						</p>
					)}

					{attachedFiles.length > 0 && (
						<div
							className={`gap-1 rounded-xl overflow-hidden ${
								viewMode === "carousel"
									? "flex overflow-x-auto pb-1"
									: attachedFiles.length === 1
										? "grid grid-cols-1"
										: attachedFiles.length === 2
											? "grid grid-cols-2"
											: "grid grid-cols-2 sm:grid-cols-3"
							}`}
						>
							{attachedFiles.map((f, i) => (
								<div
									key={i}
									className={`relative overflow-hidden rounded-lg ${viewMode === "carousel" ? "h-40 w-52 flex-shrink-0" : "h-36"}`}
								>
									{f.previewUrl ? (
										<img
											src={f.previewUrl}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : (
										<div
											className="h-full w-full flex items-center justify-center border"
											style={{
												backgroundColor:
													"var(--bg-surface)",
											}}
										>
											<FileText
												className="h-6 w-6"
												style={{
													color: "var(--accent)",
												}}
											/>
										</div>
									)}
								</div>
							))}
						</div>
					)}

					<div
						className="flex items-center justify-between text-[11px] px-1 font-medium"
						style={{ color: "var(--text-dim)" }}
					>
						{authorsName && <span>Автор: Администратор</span>}
						{adFromCreator && (
							<span
								className="px-2 py-0.5 rounded border text-[10px]"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
								}}
							>
								Реклама в сообществе
							</span>
						)}
					</div>

					<div
						className="pt-2 border-t flex items-center justify-between text-xs select-none"
						style={{ borderColor: "var(--border-light)" }}
					>
						<div className="flex items-center gap-2">
							<div
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-85 transition-opacity"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<Heart className="h-3.5 w-3.5" />
								<span className="font-mono text-[11px] font-semibold">
									{stats.likes}
								</span>
							</div>

							<div
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-85 transition-opacity"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<MessageCircle className="h-3.5 w-3.5" />
								<span className="font-mono text-[11px] font-semibold">
									{stats.comments}
								</span>
							</div>

							<div
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-pointer hover:opacity-85 transition-opacity"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
							>
								<Share2 className="h-3.5 w-3.5" />
								<span className="font-mono text-[11px] font-semibold">
									{stats.shares}
								</span>
							</div>
						</div>

						<div
							className="flex items-center gap-1 text-[11px]"
							style={{ color: "var(--text-dim)" }}
						>
							<Eye className="h-3.5 w-3.5" />
							<span className="font-mono">{stats.views}</span>
						</div>
					</div>
				</div>

				<div className="flex justify-end pt-1">
					<button
						onClick={onClose}
						className="px-5 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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

export const DeleteConfirmModal: React.FC<{
	show: boolean;
	lang: Lang;
	onClose: () => void;
	onConfirm: (dontAskAgain: boolean) => void;
}> = ({ show, lang, onClose, onConfirm }) => {
	const [dontAskAgain, setDontAskAgain] = useState(false);
	if (!show) return null;
	const t = translations[lang];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div className="flex items-center gap-2 text-rose-400">
					<AlertCircle className="h-5 w-5" />
					<h3
						className="font-semibold text-sm"
						style={{ color: "var(--text-app)" }}
					>
						{t.deleteConfirmTitle}
					</h3>
				</div>

				<p
					className="text-xs leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					{t.deleteConfirmText}
				</p>

				<label
					className="flex items-center gap-2 text-xs cursor-pointer select-none"
					style={{ color: "var(--text-app)" }}
				>
					<input
						type="checkbox"
						checked={dontAskAgain}
						onChange={(e) => setDontAskAgain(e.target.checked)}
						className="rounded cursor-pointer"
					/>
					<span>{t.dontAskSession}</span>
				</label>

				<div
					className="flex justify-end gap-2 pt-2 border-t"
					style={{ borderColor: "var(--border-app)" }}
				>
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70 cursor-pointer"
					>
						{t.cancel}
					</button>
					<button
						onClick={() => onConfirm(dontAskAgain)}
						className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
					>
						{t.confirmDelete}
					</button>
				</div>
			</div>
		</div>
	);
};

export const CleanDiskModal: React.FC<{
	show: boolean;
	lang: Lang;
	cleanedCount: number | null;
	isCleaning: boolean;
	onClose: () => void;
	onConfirmClean: () => void;
}> = ({ show, lang, cleanedCount, isCleaning, onClose, onConfirmClean }) => {
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
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<HardDrive className="h-5 w-5" />
						<h3
							className="font-semibold text-sm"
							style={{ color: "var(--text-app)" }}
						>
							{t.cleanDiskFiles}
						</h3>
					</div>
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{cleanedCount !== null ? (
					<div className="space-y-4 py-2 text-center">
						<div
							className="p-3 rounded-xl border text-xs flex items-center justify-center gap-2"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--accent)",
							}}
						>
							<Check className="h-4 w-4" />
							<span>
								{t.cleanSuccess} <strong>{cleanedCount}</strong>
							</span>
						</div>
						<div className="flex justify-center">
							<button
								onClick={onClose}
								className="px-5 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
								style={{
									backgroundColor: "var(--btn-primary-bg)",
									color: "var(--btn-primary-text)",
								}}
							>
								OK
							</button>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						<p
							className="text-xs leading-relaxed"
							style={{ color: "var(--text-muted)" }}
						>
							{t.cleanExplain}
						</p>
						<div
							className="flex justify-end gap-2.5 pt-2 border-t"
							style={{ borderColor: "var(--border-app)" }}
						>
							<button
								onClick={onClose}
								className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70 cursor-pointer"
							>
								{t.cancel}
							</button>
							<button
								onClick={onConfirmClean}
								disabled={isCleaning}
								className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
								style={{
									backgroundColor: "var(--btn-primary-bg)",
									color: "var(--btn-primary-text)",
								}}
							>
								{isCleaning ? "..." : t.cleanDiskFiles}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

// Меню "Все посты" с поддержкой дублированного выпадающего списка цели и кнопкой "Загрузить ещё"
export const AllPostsModal: React.FC<{
	show: boolean;
	lang: Lang;
	posts: PostItem[];
	isSyncingWall: boolean;
	targets: Target[];
	selectedTargetId: number | null;
	onSelectTarget: (id: number) => void;
	onClose: () => void;
	onDeletePost: (post: PostItem) => void;
	onOpenFullImage: (url: string) => void;
	onLoadVkPhotos: (post: PostItem) => void;
	onSyncWallPosts: () => void;
	onLoadMoreWallPosts: () => void;
}> = ({
	show,
	lang,
	posts,
	isSyncingWall,
	targets,
	selectedTargetId,
	onSelectTarget,
	onClose,
	onDeletePost,
	onOpenFullImage,
	onLoadVkPhotos,
	onSyncWallPosts,
	onLoadMoreWallPosts,
}) => {
	if (!show) return null;
	const t = translations[lang];

	// Сортировка по умолчанию: "По дате (позже)"
	const [sortCriteria, setSortCriteria] = useState<
		"id_desc" | "id_asc" | "date_asc" | "date_desc" | "status"
	>("date_desc");
	const [groupByCriteria, setGroupByCriteria] = useState<
		"none" | "target" | "status"
	>("none");
	const [filterTargetTitle, setFilterTargetTitle] = useState<string | null>(
		null,
	);
	const [expandedIds, setExpandedIds] = useState<number[]>([]);

	const filteredPosts = filterTargetTitle
		? posts.filter((p) => p.target_title === filterTargetTitle)
		: posts;

	const sortedPosts = [...filteredPosts].sort((a, b) => {
		if (sortCriteria === "id_desc") return b.id - a.id;
		if (sortCriteria === "id_asc") return a.id - b.id;
		if (sortCriteria === "date_asc")
			return (
				new Date(a.scheduled_at_utc).getTime() -
				new Date(b.scheduled_at_utc).getTime()
			);
		if (sortCriteria === "date_desc")
			return (
				new Date(b.scheduled_at_utc).getTime() -
				new Date(a.scheduled_at_utc).getTime()
			);
		if (sortCriteria === "status") return a.status.localeCompare(b.status);
		return 0;
	});

	const toggleExpand = (id: number) => {
		setExpandedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const renderCard = (post: PostItem) => {
		const isExpanded = expandedIds.includes(post.id);
		const isVkPublished = post.status === "published";
		const isDeletedInVk = post.status === "deleted_in_vk";

		return (
			<div
				key={post.id}
				className="rounded-xl border transition-colors overflow-hidden"
				style={{
					backgroundColor: "var(--bg-surface-sub)",
					borderColor: "var(--border-light)",
				}}
			>
				<div
					onClick={() => toggleExpand(post.id)}
					className="p-2.5 flex items-center justify-between gap-2 text-xs cursor-pointer select-none"
				>
					<div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
						{/* Номер показывается только для созданных в приложении постов */}
						{post.is_app_created !== false ? (
							<span className="font-mono font-bold text-[11px] opacity-60 w-8 text-right flex-shrink-0">
								#{post.id}
							</span>
						) : (
							<span
								className="text-[10px] px-1.5 py-0.2 rounded border font-semibold opacity-80 w-8 text-center flex-shrink-0"
								style={{
									backgroundColor: "var(--bg-surface)",
									borderColor: "var(--border-light)",
									color: "var(--accent)",
								}}
								title="Пост обнаружен на стене ВКонтакте"
							>
								ВК
							</span>
						)}

						{/* Цель (фиксированная ширина для ровного выравнивания колонок) */}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setFilterTargetTitle(post.target_title || null);
							}}
							className="text-[10px] px-2 py-0.5 rounded-md font-semibold border truncate w-[130px] text-center flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer"
							style={{
								backgroundColor: "var(--bg-surface)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
							title={post.target_title || "Без цели"}
						>
							{post.target_title || "Без цели"}
						</button>

						{/* Дата и время (фиксированная ширина) */}
						<span
							className="font-mono font-semibold w-[120px] text-center flex-shrink-0"
							style={{ color: "var(--accent)" }}
						>
							{format(
								new Date(post.scheduled_at_utc),
								"dd/MM/yyyy HH:mm",
							)}
						</span>

						{/* Статус публикации (фиксированная ширина) */}
						<span
							className="text-[10px] px-2 py-0.5 rounded border w-[115px] text-center flex-shrink-0 truncate"
							style={{
								backgroundColor: isVkPublished
									? "var(--accent-glow)"
									: "var(--bg-surface)",
								borderColor: isVkPublished
									? "var(--accent)"
									: "var(--border-light)",
								color: isVkPublished
									? "var(--accent)"
									: "var(--text-app)",
							}}
						>
							{post.status === "queued"
								? t.statusLocal
								: post.status === "transferred_to_vk"
									? t.statusVk
									: isVkPublished
										? t.statusPublished
										: isDeletedInVk
											? t.statusDeletedInVk
											: t.statusError}
						</span>

						{/* Текст поста */}
						<span
							className="text-xs truncate flex-1 min-w-0 opacity-80 pl-2"
							style={{ color: "var(--text-app)" }}
						>
							{post.text || (
								<em className="opacity-50">
									{lang === "ru" ? "Без текста" : "No text"}
								</em>
							)}
						</span>
					</div>

					<div className="flex items-center gap-1 flex-shrink-0">
						{/* Кнопка удаления скрыта для уже опубликованных постов */}
						{!isVkPublished && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onDeletePost(post);
								}}
								className="p-1.5 hover:text-rose-400 transition-colors cursor-pointer"
								style={{ color: "var(--text-dim)" }}
								title="Delete"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						)}

						<div className="p-1 opacity-70">
							{isExpanded ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</div>
					</div>
				</div>

				{/* Раскрывающийся подробный блок */}
				{isExpanded && (
					<div
						className="px-4 pb-4 pt-2 border-t space-y-3"
						style={{
							borderColor: "var(--border-light)",
							backgroundColor: "var(--bg-surface)",
						}}
					>
						{post.text && (
							<p
								className="text-xs leading-relaxed"
								style={{ color: "var(--text-app)" }}
							>
								{post.text}
							</p>
						)}

						<div className="flex items-center gap-2 flex-wrap">
							{post.vk_post_id && (
								<button
									type="button"
									onClick={() => onLoadVkPhotos(post)}
									className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all cursor-pointer"
									style={{
										backgroundColor:
											"var(--bg-surface-sub)",
										borderColor: "var(--border-light)",
										color: "var(--accent)",
									}}
								>
									<DownloadCloud className="h-3.5 w-3.5" />
									<span>{t.loadVkPhotos}</span>
								</button>
							)}
						</div>

						{post.attachments && post.attachments.length > 0 ? (
							<div>
								<span
									className="text-[11px] font-semibold block mb-1.5"
									style={{ color: "var(--text-dim)" }}
								>
									{t.attachedFiles} ({post.attachments.length}
									):
								</span>
								<div className="grid grid-cols-4 gap-2">
									{post.attachments.map((att, attIdx) => (
										<div
											key={attIdx}
											onClick={() =>
												att.thumb_data &&
												onOpenFullImage(att.thumb_data)
											}
											className="h-20 rounded-lg border flex flex-col items-center justify-center overflow-hidden p-1 relative hover:border-[var(--accent)] transition-colors cursor-pointer"
											style={{
												backgroundColor:
													"var(--bg-surface-sub)",
												borderColor:
													"var(--border-light)",
											}}
										>
											{att.thumb_data ? (
												<img
													src={att.thumb_data}
													alt={att.file_name}
													className="h-full w-full object-cover rounded"
												/>
											) : (
												<div className="flex flex-col items-center p-1 text-center">
													<FileText
														className="h-5 w-5 mb-1"
														style={{
															color: "var(--accent)",
														}}
													/>
													<span
														className="text-[9px] truncate max-w-full"
														style={{
															color: "var(--text-muted)",
														}}
													>
														{att.file_name}
													</span>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						) : (
							<span className="text-[11px] italic opacity-50 block">
								{t.noAttachments}
							</span>
						)}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div
					className="flex items-center justify-between pb-3 border-b flex-shrink-0"
					style={{ borderColor: "var(--border-app)" }}
				>
					<div className="flex items-center gap-2">
						<Database
							className="h-5 w-5"
							style={{ color: "var(--accent)" }}
						/>
						<h3
							className="font-semibold text-base"
							style={{ color: "var(--text-app)" }}
						>
							{t.allPostsTab} ({posts.length})
						</h3>
					</div>

					<div className="flex items-center gap-2">
						{/* Кнопка первого сканирования */}
						<button
							onClick={onSyncWallPosts}
							disabled={isSyncingWall}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer disabled:opacity-50"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--accent)",
							}}
							title="Загрузить свежие посты со стены выбранного сообщества"
						>
							<DownloadCloud
								className={`h-3.5 w-3.5 ${isSyncingWall ? "animate-spin" : ""}`}
							/>
							<span>
								{isSyncingWall
									? "..."
									: lang === "ru"
										? "Сканировать стену ВК"
										: "Sync Wall"}
							</span>
						</button>

						{/* Кнопка пагинации (Загрузить ещё) */}
						<button
							onClick={onLoadMoreWallPosts}
							disabled={isSyncingWall}
							className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer disabled:opacity-50"
							style={{
								backgroundColor: "var(--bg-surface-sub)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
							title="Загрузить следующую порцию старых постов"
						>
							<RefreshCw
								className={`h-3.5 w-3.5 ${isSyncingWall ? "animate-spin" : ""}`}
							/>
							<span>
								{lang === "ru" ? "Загрузить ещё" : "Load More"}
							</span>
						</button>

						<button
							onClick={onClose}
							className="hover:opacity-70 cursor-pointer"
							style={{ color: "var(--text-muted)" }}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				{/* Панель фильтров на CustomSelect с дублированием выбора цели */}
				<div
					className="flex items-center justify-between gap-3 text-xs flex-wrap flex-shrink-0 p-2 rounded-xl border"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
					}}
				>
					<div className="flex items-center gap-3 flex-wrap">
						{/* Продублированный селектор цели */}
						{targets.length > 1 && (
							<div className="flex items-center gap-1.5">
								<span style={{ color: "var(--text-dim)" }}>
									{t.target}:
								</span>
								<CustomSelect
									value={selectedTargetId || ""}
									options={targets.map((tgt) => ({
										value: tgt.id,
										label: tgt.title,
									}))}
									onChange={(val) =>
										onSelectTarget(Number(val))
									}
									maxWidth="180px"
								/>
							</div>
						)}

						<div className="flex items-center gap-1.5">
							<span style={{ color: "var(--text-dim)" }}>
								{t.sortBy}
							</span>
							<CustomSelect
								value={sortCriteria}
								options={[
									{
										value: "date_desc",
										label: t.sortDateDesc,
									},
									{ value: "date_asc", label: t.sortDateAsc },
									{ value: "id_desc", label: t.sortIdDesc },
									{ value: "id_asc", label: t.sortIdAsc },
									{ value: "status", label: t.sortStatus },
								]}
								onChange={(val) => setSortCriteria(val)}
								maxWidth="160px"
							/>
						</div>

						<div className="flex items-center gap-1.5">
							<span style={{ color: "var(--text-dim)" }}>
								{t.groupBy}
							</span>
							<CustomSelect
								value={groupByCriteria}
								options={[
									{ value: "none", label: t.groupNone },
									{ value: "target", label: t.groupByTarget },
									{ value: "status", label: t.groupByStatus },
								]}
								onChange={(val) => setGroupByCriteria(val)}
								maxWidth="160px"
							/>
						</div>
					</div>

					{filterTargetTitle && (
						<div
							className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold"
							style={{
								backgroundColor: "var(--bg-surface)",
								borderColor: "var(--accent)",
								color: "var(--accent)",
							}}
						>
							<span>
								{t.targetLabel} {filterTargetTitle}
							</span>
							<button
								type="button"
								onClick={() => setFilterTargetTitle(null)}
								className="p-0.5 hover:opacity-75 cursor-pointer"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					)}
				</div>

				<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
					{sortedPosts.length === 0 ? (
						<div className="text-center py-12 text-xs opacity-50">
							{t.emptyAllPosts}
						</div>
					) : groupByCriteria === "none" ? (
						sortedPosts.map(renderCard)
					) : (
						Object.entries(
							sortedPosts.reduce(
								(acc, p) => {
									const groupKey =
										groupByCriteria === "target"
											? p.target_title || "Без цели"
											: p.status === "queued"
												? t.statusLocal
												: p.status ===
													  "transferred_to_vk"
													? t.statusVk
													: p.status === "published"
														? t.statusPublished
														: p.status ===
															  "deleted_in_vk"
															? t.statusDeletedInVk
															: t.statusError;
									if (!acc[groupKey]) acc[groupKey] = [];
									acc[groupKey].push(p);
									return acc;
								},
								{} as Record<string, PostItem[]>,
							),
						).map(([groupTitle, groupedPosts]) => (
							<div key={groupTitle} className="space-y-1.5">
								<div
									className="text-xs font-bold px-2 py-1 rounded border sticky top-0"
									style={{
										backgroundColor:
											"var(--bg-surface-sub)",
										borderColor: "var(--border-light)",
										color: "var(--accent)",
									}}
								>
									{groupTitle} ({groupedPosts.length})
								</div>
								{groupedPosts.map(renderCard)}
							</div>
						))
					)}
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
						className="hover:opacity-70 cursor-pointer"
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
							className="flex-1 flex items-center justify-center gap-2 font-bold py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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
							className="flex items-center gap-1.5 border px-3 py-2.5 rounded-xl text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
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
							className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium py-1 cursor-pointer"
						>
							<ShieldAlert className="h-3.5 w-3.5" />
							<span>{t.cleanExpiredTokens}</span>
						</button>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-xs font-medium hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						disabled={isAdding || !tokenInput.trim()}
						className="px-5 py-2 font-bold rounded-xl text-xs disabled:opacity-50 transition-all shadow-md active:scale-95 cursor-pointer"
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
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
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
										className="p-1 hover:text-rose-400 transition-colors cursor-pointer"
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
						className="px-4 py-2 text-xs font-medium hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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
	lang: Lang;
	targets: Target[];
	selectedTargetId: number | null;
	patterns: Pattern[];
	selectedPatternId: number | null;
	isCreating: boolean;
	batchPaths: string[];
	isDraggingOver: boolean;
	onSetBatchPaths: React.Dispatch<React.SetStateAction<string[]>>;
	onClose: () => void;
	onSubmit: (params: {
		targetId: number;
		patternId: number;
		filePaths: string[];
		chunkSize: number;
		text: string;
	}) => void;
}> = ({
	show,
	lang,
	targets,
	selectedTargetId,
	patterns,
	selectedPatternId,
	isCreating,
	batchPaths,
	isDraggingOver,
	onSetBatchPaths,
	onClose,
	onSubmit,
}) => {
	if (!show) return null;
	const t = translations[lang];

	const [chunkSize, setChunkSize] = useState<number>(1);
	const [batchText, setBatchText] = useState("");
	const [targetId, setTargetId] = useState<number>(
		selectedTargetId || targets[0]?.id || 0,
	);
	const [patternId, setPatternId] = useState<number>(
		selectedPatternId || patterns[0]?.id || 0,
	);

	const handlePickBatchFiles = async () => {
		const res = await open({
			multiple: true,
			filters: [
				{
					name: "Изображения",
					extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"],
				},
			],
		});
		if (res) {
			const paths = Array.isArray(res) ? res : [res];
			onSetBatchPaths((prev) => Array.from(new Set([...prev, ...paths])));
		}
	};

	const handleCreate = () => {
		if (batchPaths.length === 0) return;
		if (!targetId || !patternId) return;
		onSubmit({
			targetId,
			patternId,
			filePaths: batchPaths,
			chunkSize,
			text: batchText,
		});
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
			<div
				className="border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
				style={{
					backgroundColor: "var(--bg-surface)",
					borderColor: "var(--border-app)",
				}}
			>
				<div
					className="flex items-center justify-between pb-2 border-b"
					style={{ borderColor: "var(--border-app)" }}
				>
					<div
						className="flex items-center gap-2"
						style={{ color: "var(--accent)" }}
					>
						<Layers3 className="h-5 w-5" />
						<h3
							className="font-semibold text-base"
							style={{ color: "var(--text-app)" }}
						>
							{t.batchTitle}
						</h3>
					</div>
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<div
					onClick={handlePickBatchFiles}
					onDragOver={(e) => e.preventDefault()}
					onDragEnter={(e) => e.preventDefault()}
					className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
						isDraggingOver ? "scale-[0.99]" : "hover:opacity-85"
					}`}
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: isDraggingOver
							? "var(--accent)"
							: "var(--border-light)",
					}}
				>
					<UploadCloud
						className="h-8 w-8 mb-2"
						style={{ color: "var(--accent)" }}
					/>
					<span
						className="text-xs font-semibold"
						style={{ color: "var(--text-app)" }}
					>
						{t.batchDropzone}
					</span>
					<span
						className="text-[11px] mt-0.5"
						style={{ color: "var(--text-dim)" }}
					>
						{t.batchDropzoneSub}
					</span>
				</div>

				{batchPaths.length > 0 && (
					<div className="flex items-center justify-between text-xs px-1">
						<span style={{ color: "var(--text-app)" }}>
							{t.batchFilesSelected}{" "}
							<strong>{batchPaths.length}</strong>
						</span>
						<button
							onClick={() => onSetBatchPaths([])}
							className="text-[11px] hover:underline cursor-pointer"
							style={{ color: "var(--accent)" }}
						>
							{lang === "ru" ? "Очистить список" : "Clear list"}
						</button>
					</div>
				)}

				<div>
					<label
						className="block text-xs font-medium mb-1"
						style={{ color: "var(--text-dim)" }}
					>
						{t.batchTextLabel}
					</label>
					<textarea
						rows={2}
						value={batchText}
						onChange={(e) => setBatchText(e.target.value)}
						className="w-full rounded-xl p-2.5 text-xs border focus:outline-none resize-none"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							color: "var(--text-app)",
							borderColor: "var(--border-light)",
						}}
						placeholder={
							lang === "ru"
								? "Текст для каждого поста..."
								: "Text for each post..."
						}
					/>
				</div>

				<div>
					<label
						className="block text-xs font-medium mb-1.5"
						style={{ color: "var(--text-dim)" }}
					>
						{t.batchScheme}
					</label>
					<div className="grid grid-cols-3 gap-2">
						{[1, 2, 4].map((num) => (
							<button
								key={num}
								onClick={() => setChunkSize(num)}
								className="py-2 px-3 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
								style={{
									backgroundColor:
										chunkSize === num
											? "var(--btn-primary-bg)"
											: "var(--bg-surface-sub)",
									borderColor:
										chunkSize === num
											? "var(--btn-primary-bg)"
											: "var(--border-light)",
									color:
										chunkSize === num
											? "var(--btn-primary-text)"
											: "var(--text-app)",
								}}
							>
								<span>
									{num}{" "}
									{lang === "ru" ? "фото/пост" : "img/post"}
								</span>
								{chunkSize === num && (
									<CheckCircle2 className="h-3.5 w-3.5" />
								)}
							</button>
						))}
					</div>
					{batchPaths.length > 0 && (
						<span
							className="block text-[11px] mt-1.5 font-mono text-center"
							style={{ color: "var(--text-dim)" }}
						>
							{lang === "ru"
								? `Будет создано ${Math.ceil(batchPaths.length / chunkSize)} постов`
								: `Will create ${Math.ceil(batchPaths.length / chunkSize)} posts`}
						</span>
					)}
				</div>

				{/* Списки цели и паттерна раскрываются вверх (dropUp) */}
				<div
					className="grid grid-cols-2 gap-3 pt-2 border-t"
					style={{ borderColor: "var(--border-app)" }}
				>
					<div>
						<label
							className="block text-xs font-medium mb-1"
							style={{ color: "var(--text-dim)" }}
						>
							{t.targetLabel}
						</label>
						<CustomSelect
							value={targetId}
							options={targets.map((tgt) => ({
								value: tgt.id,
								label: tgt.title,
							}))}
							onChange={(val) => setTargetId(Number(val))}
							maxWidth="100%"
							dropUp={true}
						/>
					</div>

					<div>
						<label
							className="block text-xs font-medium mb-1"
							style={{ color: "var(--text-dim)" }}
						>
							{lang === "ru" ? "Расписание:" : "Pattern:"}
						</label>
						<CustomSelect
							value={patternId}
							options={patterns.map((p) => ({
								value: p.id,
								label: p.name,
							}))}
							onChange={(val) => setPatternId(Number(val))}
							maxWidth="100%"
							dropUp={true}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2.5 pt-2">
					<button
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						{t.cancel}
					</button>
					<button
						onClick={handleCreate}
						disabled={isCreating || batchPaths.length === 0}
						className="px-5 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						{isCreating ? "..." : t.batchSubmit}
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
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
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
						className="w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all text-left cursor-pointer"
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
						className="w-full flex items-center justify-between p-3 rounded-xl font-bold text-xs shadow-md text-left transition-all active:scale-95 cursor-pointer"
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
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
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
					<button
						onClick={onClose}
						className="hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
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
							className="p-1 rounded-lg border hover:opacity-80 cursor-pointer"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							onClick={() =>
								onViewMonthChange(addMonths(viewMonth, 1))
							}
							className="p-1 rounded-lg border hover:opacity-80 cursor-pointer"
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
								<option key={i} value={i}>
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
									<option key={m} value={m}>
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
						className="px-4 py-2 rounded-xl text-xs font-medium hover:opacity-70 cursor-pointer"
						style={{ color: "var(--text-muted)" }}
					>
						{t.cancel}
					</button>
					<button
						onClick={onSubmit}
						className="px-4 py-2 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
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
					className="absolute -top-4 -right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-lg cursor-pointer"
				>
					<X className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
};
