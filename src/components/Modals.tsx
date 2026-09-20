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
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	PostItem,
	Theme,
	Pattern,
	Target,
	FilePreview,
	LiveWallPostItem,
} from "../types";
import { translations, Lang } from "../services/i18n";
import { CustomSelect } from "./CustomSelect";

// Внутреннее всплывающее окно поверх всех окон
export const NoticeModal: React.FC<{
	show: boolean;
	title: string;
	message: string;
	onClose: () => void;
}> = ({ show, title, message, onClose }) => {
	if (!show) return null;
	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
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
					className="text-xs leading-relaxed break-words"
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
	onRequestClearDatabase: () => void;
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
	onRequestClearDatabase,
}) => {
	if (!show) return null;
	const t = translations[lang];

	const handleOpenExternal = async (url: string) => {
		try {
			await openUrl(url);
		} catch {
			window.open(url, "_blank");
		}
	};

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
					<div className="flex items-center gap-2">
						<h3
							className="font-semibold text-base"
							style={{ color: "var(--text-app)" }}
						>
							{t.settingsTitle}
						</h3>
						<span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-black/10 opacity-70 bg-black/10">
							release 1.0.0
						</span>
					</div>
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

					<button
						onClick={onRequestClearDatabase}
						className="w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium text-rose-400 hover:bg-rose-500/10 border-rose-500/20 transition-all cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<Trash2 className="h-4 w-4" />
							<span>{t.clearDbBtn}</span>
						</div>
					</button>
				</div>

				{/* Ссылки FAQ и Boosty с переводом */}
				<div
					className="pt-3 border-t space-y-2.5 pb-1"
					style={{ borderColor: "var(--border-app)" }}
				>
					<button
						type="button"
						onClick={() =>
							handleOpenExternal(
								"https://github.com/ggghbc/VKPostingTool",
							)
						}
						className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all text-center cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
					>
						<ExternalLink
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
						<span>{t.githubBtn}</span>
					</button>

					<button
						type="button"
						onClick={() =>
							handleOpenExternal("https://boosty.to/ggghbc")
						}
						className="w-full flex items-center justify-center gap-2.5 p-3 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer border-0"
						style={{ backgroundColor: "#f15f22" }}
					>
						<svg
							className="h-4 w-4 fill-white flex-shrink-0"
							viewBox="0 0 24 24"
						>
							<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.87 8.16l-3.23 4.22h3.04L9.12 19.2l1.63-5.26H7.98l4.47-5.78h3.42z" />
						</svg>
						<span>{t.boostyBtn}</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export const ClearDatabaseConfirmModal: React.FC<{
	show: boolean;
	lang: Lang;
	onClose: () => void;
	onConfirm: () => void;
}> = ({ show, lang, onClose, onConfirm }) => {
	if (!show) return null;
	const t = translations[lang];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150">
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
						{t.clearDbConfirmTitle}
					</h3>
				</div>

				<p
					className="text-xs leading-relaxed"
					style={{ color: "var(--text-muted)" }}
				>
					{t.clearDbConfirmText}
				</p>

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
						onClick={onConfirm}
						className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
					>
						{t.confirmDelete}
					</button>
				</div>
			</div>
		</div>
	);
};

// Аутентичный рендер сетки ВКонтакте (VK Smart Grid)
const VkSmartPhotoGrid: React.FC<{
	files: FilePreview[];
	viewMode: "grid" | "carousel";
}> = ({ files, viewMode }) => {
	if (files.length === 0) return null;

	if (viewMode === "carousel") {
		return (
			<div className="flex overflow-x-auto gap-1.5 pb-1 rounded-xl">
				{files.map((f, i) => (
					<div
						key={i}
						className="h-44 w-56 flex-shrink-0 overflow-hidden rounded-lg bg-black/20"
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
								style={{ backgroundColor: "var(--bg-surface)" }}
							>
								<FileText
									className="h-6 w-6"
									style={{ color: "var(--accent)" }}
								/>
							</div>
						)}
					</div>
				))}
			</div>
		);
	}

	const count = files.length;

	const renderImg = (f?: FilePreview, extraClass = "") => {
		if (!f) return null;
		return (
			<div
				className={`relative overflow-hidden bg-black/10 ${extraClass}`}
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
						style={{ backgroundColor: "var(--bg-surface)" }}
					>
						<FileText
							className="h-6 w-6"
							style={{ color: "var(--accent)" }}
						/>
					</div>
				)}
			</div>
		);
	};

	// 1 фото: крупно на всю ширину
	if (count === 1) {
		return (
			<div className="rounded-xl overflow-hidden h-72">
				{renderImg(files[0], "h-full w-full")}
			</div>
		);
	}

	// 2 фото: 2 равные колонки (Скриншот 4)
	if (count === 2) {
		return (
			<div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden h-56">
				{renderImg(files[0], "h-full w-full")}
				{renderImg(files[1], "h-full w-full")}
			</div>
		);
	}

	// 3 фото: 1 крупное слева, 2 маленьких справа друг под другом (Скриншот 3)
	if (count === 3) {
		return (
			<div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden h-64">
				<div className="col-span-2 h-full">
					{renderImg(files[0], "h-full w-full")}
				</div>
				<div className="grid grid-rows-2 gap-1 h-full">
					{renderImg(files[1], "h-full w-full")}
					{renderImg(files[2], "h-full w-full")}
				</div>
			</div>
		);
	}

	// 4 фото: ровная сетка 2 на 2 квадрата (Скриншот 2)
	if (count === 4) {
		return (
			<div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-xl overflow-hidden h-64">
				{renderImg(files[0], "h-full w-full")}
				{renderImg(files[1], "h-full w-full")}
				{renderImg(files[2], "h-full w-full")}
				{renderImg(files[3], "h-full w-full")}
			</div>
		);
	}

	// 6 фото: 2 больших сверху, 4 маленьких снизу (Скриншот 6)
	if (count === 6) {
		return (
			<div className="space-y-1 rounded-xl overflow-hidden">
				<div className="grid grid-cols-2 gap-1 h-44">
					{renderImg(files[0], "h-full w-full")}
					{renderImg(files[1], "h-full w-full")}
				</div>
				<div className="grid grid-cols-4 gap-1 h-24">
					{renderImg(files[2], "h-full w-full")}
					{renderImg(files[3], "h-full w-full")}
					{renderImg(files[4], "h-full w-full")}
					{renderImg(files[5], "h-full w-full")}
				</div>
			</div>
		);
	}

	// 7 фото: 2 больших сверху, 5 маленьких снизу (Скриншот 5)
	if (count === 7) {
		return (
			<div className="space-y-1 rounded-xl overflow-hidden">
				<div className="grid grid-cols-2 gap-1 h-44">
					{renderImg(files[0], "h-full w-full")}
					{renderImg(files[1], "h-full w-full")}
				</div>
				<div className="grid grid-cols-5 gap-1 h-20">
					{files.slice(2, 7).map((f, i) => (
						<div key={i} className="h-full w-full">
							{renderImg(f, "h-full w-full")}
						</div>
					))}
				</div>
			</div>
		);
	}

	// 9 фото: ровная сетка 3 на 3 (Скриншот 8)
	if (count === 9) {
		return (
			<div className="grid grid-cols-3 grid-rows-3 gap-1 rounded-xl overflow-hidden h-72">
				{files.map((f, i) => (
					<div key={i} className="h-full w-full">
						{renderImg(f, "h-full w-full")}
					</div>
				))}
			</div>
		);
	}

	// 5, 8 и 10 фото: общая аккуратная адаптивная сетка
	return (
		<div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden auto-rows-[90px]">
			{files.map((f, i) => (
				<div key={i} className="h-full w-full">
					{renderImg(f, "h-full w-full")}
				</div>
			))}
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
								className="text-[10px] px-2 py-0.5 rounded-full border opacity-75 cursor-default select-none"
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
								className="p-1 opacity-60 cursor-default"
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

					{/* Интеллектуальная сетка ВК */}
					<VkSmartPhotoGrid
						files={attachedFiles}
						viewMode={viewMode}
					/>

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
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-default"
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
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-default"
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
								className="flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-default"
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
							className="flex items-center gap-1 text-[11px] cursor-default"
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

// Меню «Просмотр стены» (Wall Viewer)
export const WallViewerModal: React.FC<{
	show: boolean;
	lang: Lang;
	wallPosts: LiveWallPostItem[];
	isSyncingWall: boolean;
	targets: Target[];
	selectedTargetId: number | null;
	onSelectTarget: (id: number) => void;
	onClose: () => void;
	onOpenFullImage: (url: string) => void;
	onScanWall: () => void;
	onLoadMore: () => void;
}> = ({
	show,
	lang,
	wallPosts,
	isSyncingWall,
	targets,
	selectedTargetId,
	onSelectTarget,
	onClose,
	onOpenFullImage,
	onScanWall,
	onLoadMore,
}) => {
	if (!show) return null;
	const t = translations[lang];

	const [sortCriteria, setSortCriteria] = useState<"date_desc" | "date_asc">(
		"date_desc",
	);
	const [expandedIds, setExpandedIds] = useState<number[]>([]);

	const sortedPosts = useMemo(() => {
		return [...wallPosts].sort((a, b) => {
			const tA = new Date(a.date_utc).getTime();
			const tB = new Date(b.date_utc).getTime();
			return sortCriteria === "date_desc" ? tB - tA : tA - tB;
		});
	}, [wallPosts, sortCriteria]);

	const toggleExpand = (id: number) => {
		setExpandedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
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
							{t.wallViewerTitle} ({wallPosts.length})
						</h3>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={onScanWall}
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
							<span>{isSyncingWall ? "..." : t.scanWallBtn}</span>
						</button>

						{wallPosts.length > 0 && (
							<button
								onClick={onLoadMore}
								disabled={isSyncingWall}
								className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer disabled:opacity-50"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									borderColor: "var(--border-light)",
									color: "var(--text-app)",
								}}
								title="Загрузить следующие 30 постов"
							>
								<RefreshCw
									className={`h-3.5 w-3.5 ${isSyncingWall ? "animate-spin" : ""}`}
								/>
								<span>{t.loadMoreBtn}</span>
							</button>
						)}

						<button
							onClick={onClose}
							className="hover:opacity-70 cursor-pointer"
							style={{ color: "var(--text-muted)" }}
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>

				<div
					className="flex items-center justify-between gap-3 text-xs flex-wrap flex-shrink-0 p-2 rounded-xl border"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
					}}
				>
					<div className="flex items-center gap-3 flex-wrap">
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
									maxWidth="220px"
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
								]}
								onChange={(val) => setSortCriteria(val)}
								maxWidth="160px"
							/>
						</div>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
					{sortedPosts.length === 0 ? (
						<div className="text-center py-12 text-xs opacity-50">
							{t.emptyAllPosts}
						</div>
					) : (
						sortedPosts.map((post) => {
							const isExpanded = expandedIds.includes(
								post.vk_post_id,
							);

							return (
								<div
									key={post.vk_post_id}
									className="rounded-xl border transition-colors overflow-hidden"
									style={{
										backgroundColor:
											"var(--bg-surface-sub)",
										borderColor: "var(--border-light)",
									}}
								>
									<div
										onClick={() =>
											toggleExpand(post.vk_post_id)
										}
										className="p-2.5 flex items-center justify-between gap-2 text-xs cursor-pointer select-none"
									>
										<div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
											{post.app_post_id ? (
												<span className="font-mono font-bold text-[11px] opacity-60 w-8 text-right flex-shrink-0">
													#{post.app_post_id}
												</span>
											) : (
												<span
													className="text-[10px] px-1.5 py-0.2 rounded border font-semibold opacity-80 w-16 text-center flex-shrink-0"
													style={{
														backgroundColor:
															"var(--bg-surface)",
														borderColor:
															"var(--border-light)",
														color: "var(--accent)",
													}}
												>
													{t.wallPostBadge}
												</span>
											)}

											<span
												className="font-mono font-semibold w-[120px] text-center flex-shrink-0"
												style={{
													color: "var(--accent)",
												}}
											>
												{format(
													new Date(post.date_utc),
													"dd/MM/yyyy HH:mm",
												)}
											</span>

											<span
												className="text-[10px] px-2 py-0.5 rounded border w-[115px] text-center flex-shrink-0 truncate"
												style={{
													backgroundColor:
														"var(--accent-glow)",
													borderColor:
														"var(--accent)",
													color: "var(--accent)",
												}}
											>
												{t.statusPublished}
											</span>

											<span
												className="text-xs truncate flex-1 min-w-0 opacity-80 pl-2"
												style={{
													color: "var(--text-app)",
												}}
											>
												{post.text || (
													<em className="opacity-50">
														{lang === "ru"
															? "Без текста"
															: "No text"}
													</em>
												)}
											</span>
										</div>

										<div className="flex items-center gap-1 flex-shrink-0">
											<div className="p-1 opacity-70">
												{isExpanded ? (
													<ChevronUp className="h-4 w-4" />
												) : (
													<ChevronDown className="h-4 w-4" />
												)}
											</div>
										</div>
									</div>

									{isExpanded && (
										<div
											className="px-4 pb-4 pt-2 border-t space-y-3"
											style={{
												borderColor:
													"var(--border-light)",
												backgroundColor:
													"var(--bg-surface)",
											}}
										>
											{post.text && (
												<p
													className="text-xs leading-relaxed"
													style={{
														color: "var(--text-app)",
													}}
												>
													{post.text}
												</p>
											)}

											{post.preview_urls.length > 0 ? (
												<div>
													<span
														className="text-[11px] font-semibold block mb-1.5"
														style={{
															color: "var(--text-dim)",
														}}
													>
														{t.attachedFiles} (
														{
															post.preview_urls
																.length
														}
														):
													</span>
													<div className="grid grid-cols-4 gap-2">
														{post.preview_urls.map(
															(url, i) => (
																<div
																	key={i}
																	onClick={() =>
																		onOpenFullImage(
																			url,
																		)
																	}
																	className="h-20 rounded-lg border overflow-hidden p-0.5 cursor-pointer hover:border-[var(--accent)] transition-colors"
																	style={{
																		backgroundColor:
																			"var(--bg-surface-sub)",
																		borderColor:
																			"var(--border-light)",
																	}}
																>
																	<img
																		src={
																			url
																		}
																		alt=""
																		className="h-full w-full object-cover rounded"
																	/>
																</div>
															),
														)}
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
						})
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
		const res = await openDialog({
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
				className="border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4"
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

				{/* Раскрытие списков цели и паттерна вверх (dropUp) */}
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
