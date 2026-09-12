import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
	Send,
	Plus,
	Trash2,
	Key,
	Layers,
	Clock,
	RefreshCw,
	CheckCircle2,
	AlertCircle,
	FileText,
	X,
	Settings2,
	UploadCloud,
	ChevronDown,
	ChevronUp,
	ImagePlus,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Maximize2,
	RotateCcw,
	ExternalLink,
	ClipboardCheck,
	GripVertical,
} from "lucide-react";
import {
	format,
	addMonths,
	subMonths,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameDay,
	startOfWeek,
	endOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";

interface Account {
	id: number;
	name: string;
	user_id: number;
	is_active: boolean;
}

interface Target {
	id: number;
	title: string;
	owner_id: number;
	target_type: string;
}

interface Pattern {
	id: number;
	name: string;
	timezone: string;
	times_json: string;
}

interface AttachmentItem {
	id: number;
	file_name: string;
	size_bytes: number;
	local_path?: string;
	vk_attachment_string?: string;
}

interface PostItem {
	id: number;
	text: string;
	scheduled_at_utc: string;
	status: string;
	error_message?: string;
	attachments_count: number;
	attachments: AttachmentItem[];
}

interface SyncResult {
	posts: PostItem[];
	group_auth_restricted: boolean;
}

interface FilePreview {
	path: string;
	name: string;
	isImage: boolean;
	previewUrl?: string;
}

function cleanTokenInput(raw: string): string {
	let s = raw.trim();
	if (s.includes("access_token=")) {
		const after = s.substring(
			s.indexOf("access_token=") + "access_token=".length,
		);
		s = after.split("&")[0].split("#")[0].trim();
	}
	return s.replace(/["';&]/g, "").trim();
}

export default function App() {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [activeAccountId, setActiveAccountId] = useState<number | null>(null);

	const [targets, setTargets] = useState<Target[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
		null,
	);
	const [patterns, setPatterns] = useState<Pattern[]>([]);
	const [selectedPatternId, setSelectedPatternId] = useState<number | null>(
		null,
	);

	const [queue, setQueue] = useState<PostItem[]>([]);
	const [expandedPostIds, setExpandedPostIds] = useState<number[]>([]);
	const [nextSlotDisplay, setNextSlotDisplay] = useState<string>("Расчет...");
	const [isSyncingVk, setIsSyncingVk] = useState(false);
	const [isGroupTokenAuth, setIsGroupTokenAuth] = useState(false);

	// Текст и медиа
	const [postText, setPostText] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<FilePreview[]>([]);
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(
		null,
	);

	// Модалка полноразмерного просмотра изображения (Lightbox)
	const [fullViewImage, setFullViewImage] = useState<string | null>(null);

	// Календарь для создания поста
	const [isManualTime, setIsManualTime] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [pickerHours, setPickerHours] = useState<number>(
		new Date().getHours(),
	);
	const [pickerMinutes, setPickerMinutes] = useState<number>(0);
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [viewMonth, setViewMonth] = useState<Date>(new Date());
	const calendarRef = useRef<HTMLDivElement>(null);

	// Модальное окно изменения времени поста в очереди
	const [rescheduleModalPost, setRescheduleModalPost] =
		useState<PostItem | null>(null);
	const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
	const [rescheduleHours, setRescheduleHours] = useState<number>(12);
	const [rescheduleMinutes, setRescheduleMinutes] = useState<number>(0);
	const [rescheduleViewMonth, setRescheduleViewMonth] = useState<Date>(
		new Date(),
	);

	// Настройки публикации
	const [commentsOnPost, setCommentsOnPost] = useState(true);
	const [notifyFollowers, setNotifyFollowers] = useState(true);
	const [authorsName, setAuthorsName] = useState(false);
	const [adFromCreator, setAdFromCreator] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(true);

	// Состояние отправки
	const [isTransferring, setIsTransferring] = useState(false);
	const [transferProgress, setTransferProgress] = useState<string | null>(
		null,
	);

	// Модальные окна
	const [showTokenModal, setShowTokenModal] = useState(false);
	const [newTokenInput, setNewTokenInput] = useState("");
	const [isAddingToken, setIsAddingToken] = useState(false);
	const [isAutoListeningClipboard, setIsAutoListeningClipboard] =
		useState(false);

	const [showPatternModal, setShowPatternModal] = useState(false);
	const [newPatternName, setNewPatternName] = useState("");
	const [newPatternTimes, setNewPatternTimes] = useState(
		"12:00, 16:00, 20:00",
	);

	const syncClientTimezone = async () => {
		try {
			const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			await invoke("init_client_timezone", { timezone: clientTz });
		} catch (e) {
			console.error("Ошибка таймзоны:", e);
		}
	};

	const loadAccounts = async () => {
		try {
			const accs = await invoke<Account[]>("get_accounts");
			setAccounts(accs);
			const active = accs.find((a) => a.is_active) ?? accs[0] ?? null;
			if (active) {
				setActiveAccountId(active.id);
				await loadTargetsForAccount(active.id);
			} else {
				setActiveAccountId(null);
				setTargets([]);
				setSelectedTargetId(null);
			}
		} catch (e) {
			console.error("Ошибка загрузки аккаунтов:", e);
		}
	};

	const loadTargetsForAccount = async (accId: number) => {
		try {
			const tgts = await invoke<Target[]>("get_targets", {
				accountId: accId,
			});
			setTargets(tgts);
			if (tgts.length > 0) {
				setSelectedTargetId(tgts[0].id);
			} else {
				setSelectedTargetId(null);
			}
		} catch (e) {
			console.error("Ошибка загрузки целей:", e);
		}
	};

	const loadPatterns = async () => {
		try {
			const ptrns = await invoke<Pattern[]>("get_patterns");
			setPatterns(ptrns);
			if (ptrns.length > 0) {
				setSelectedPatternId((prev) => prev ?? ptrns[0].id);
			}
		} catch (e) {
			console.error("Ошибка паттернов:", e);
		}
	};

	const syncVkQueue = async (targetId: number, isManual = false) => {
		setIsSyncingVk(true);
		try {
			const res = await invoke<SyncResult>("sync_vk_delayed_posts", {
				targetId,
			});
			setQueue(res.posts);
			setIsGroupTokenAuth(res.group_auth_restricted);

			if (isManual) {
				if (res.group_auth_restricted) {
					alert(
						"VK запрещает чтение стены для токена сообщества (код 27). Отложка сохраняется локально в приложении. Для непрерывности очереди укажите дату первого поста вручную.",
					);
				} else {
					const vkCount = res.posts.filter(
						(p) => p.status === "transferred_to_vk",
					).length;
					alert(`Синхронизировано. В отложке VK: ${vkCount} шт.`);
				}
			}
		} catch (e) {
			console.error("Ошибка синхронизации:", e);
			try {
				const q = await invoke<PostItem[]>("get_queue", { targetId });
				setQueue(q);
			} catch {}
		} finally {
			setIsSyncingVk(false);
		}
	};

	const updateNextSlotPreview = async () => {
		if (!selectedTargetId || !selectedPatternId) {
			setNextSlotDisplay("Выберите цель");
			return;
		}
		try {
			const isoSlot = await invoke<string>("get_next_slot_preview", {
				targetId: selectedTargetId,
				patternId: selectedPatternId,
			});
			const date = new Date(isoSlot);
			setNextSlotDisplay(format(date, "dd/MM/yyyy HH:mm"));
			if (!isManualTime) {
				setSelectedDate(date);
				setPickerHours(date.getHours());
				setPickerMinutes(date.getMinutes());
			}
		} catch {
			setNextSlotDisplay("Нет свободных слотов");
		}
	};

	useEffect(() => {
		syncClientTimezone().then(() => {
			loadAccounts();
			loadPatterns();
		});
	}, []);

	useEffect(() => {
		if (selectedTargetId) {
			syncVkQueue(selectedTargetId, false);
		}
	}, [selectedTargetId]);

	useEffect(() => {
		updateNextSlotPreview();
	}, [selectedTargetId, selectedPatternId, queue]);

	// Фоновый слушатель буфера обмена для автоматического обновления токена в 1 клик
	useEffect(() => {
		let timer: any = null;
		if (isAutoListeningClipboard) {
			timer = setInterval(async () => {
				try {
					const text = await navigator.clipboard.readText();
					if (text && text.includes("access_token=")) {
						const token = cleanTokenInput(text);
						if (token.length > 20) {
							setIsAutoListeningClipboard(false);
							setIsAddingToken(true);
							const created = await invoke<Account>("add_token", {
								rawToken: token,
							});
							setNewTokenInput("");
							setShowTokenModal(false);
							await loadAccounts();
							setActiveAccountId(created.id);
							await loadTargetsForAccount(created.id);
							alert("Токен успешно обновлен!");
						}
					}
				} catch {}
			}, 800);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [isAutoListeningClipboard]);

	const appendFiles = async (paths: string[]) => {
		const newItems: FilePreview[] = await Promise.all(
			paths.map(async (path) => {
				const name = path.split(/[\\/]/).pop() || "файл";
				const ext = name.split(".").pop()?.toLowerCase() || "";
				const isImage = [
					"jpg",
					"jpeg",
					"png",
					"webp",
					"gif",
					"bmp",
				].includes(ext);
				let previewUrl: string | undefined = undefined;

				if (isImage) {
					try {
						previewUrl = await invoke<string>(
							"get_file_preview_base64",
							{ path },
						);
					} catch (e) {
						console.error("Ошибка превью:", e);
					}
				}

				return { path, name, isImage, previewUrl };
			}),
		);

		setAttachedFiles((prev) => [...prev, ...newItems]);
	};

	useEffect(() => {
		const unlistenDrop = listen<any>("tauri://drag-drop", (event) => {
			setIsDraggingOver(false);
			const paths: string[] = event.payload?.paths || [];
			if (paths.length > 0) {
				appendFiles(paths);
			}
		});

		const unlistenEnter = listen("tauri://drag-enter", () =>
			setIsDraggingOver(true),
		);
		const unlistenLeave = listen("tauri://drag-leave", () =>
			setIsDraggingOver(false),
		);

		const unlistenProgress = listen("transfer-progress", (event: any) => {
			const { current, total } = event.payload;
			setTransferProgress(`Перенос ${current} из ${total}...`);
		});

		const unlistenFinish = listen("transfer-finished", (event: any) => {
			setIsTransferring(false);
			setTransferProgress(null);
			if (selectedTargetId) {
				syncVkQueue(selectedTargetId, false);
			}
			if (event.payload?.error) {
				alert(event.payload.error);
			}
		});

		return () => {
			unlistenDrop.then((f) => f());
			unlistenEnter.then((f) => f());
			unlistenLeave.then((f) => f());
			unlistenProgress.then((f) => f());
			unlistenFinish.then((f) => f());
		};
	}, [selectedTargetId]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				calendarRef.current &&
				!calendarRef.current.contains(event.target as Node)
			) {
				setIsCalendarOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Запуск браузера для авторизации
	const handleOpenBrowserForLogin = async () => {
		try {
			await invoke("open_vk_auth_browser");
			setIsAutoListeningClipboard(true);
		} catch (e) {
			alert("Не удалось открыть браузер: " + e);
		}
	};

	const handlePasteFromClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText();
			setNewTokenInput(cleanTokenInput(text));
		} catch (e) {
			alert("Не удалось прочитать буфер обмена: " + e);
		}
	};

	const handleSwitchAccount = async (accId: number) => {
		try {
			await invoke("switch_account", { accountId: accId });
			setActiveAccountId(accId);
			await loadTargetsForAccount(accId);
		} catch (e) {
			alert("Ошибка: " + e);
		}
	};

	const handleAddToken = async () => {
		const token = cleanTokenInput(newTokenInput);
		if (!token) return;
		setIsAddingToken(true);
		try {
			const created = await invoke<Account>("add_token", {
				rawToken: token,
			});
			setNewTokenInput("");
			setShowTokenModal(false);
			setIsAutoListeningClipboard(false);
			await loadAccounts();
			setActiveAccountId(created.id);
			await loadTargetsForAccount(created.id);
		} catch (e) {
			alert("Не удалось добавить токен: " + e);
		} finally {
			setIsAddingToken(false);
		}
	};

	const handleDeleteAccount = async () => {
		if (!activeAccountId) return;
		const current = accounts.find((a) => a.id === activeAccountId);
		if (!confirm(`Отключить аккаунт "${current?.name}"?`)) return;

		try {
			await invoke("delete_account", { accountId: activeAccountId });
			await loadAccounts();
		} catch (e) {
			alert("Ошибка удаления: " + e);
		}
	};

	const handleSelectFiles = async () => {
		const res = await open({
			multiple: true,
			filters: [
				{
					name: "Изображения",
					extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp"],
				},
				{
					name: "Документы",
					extensions: ["pdf", "zip", "doc", "docx"],
				},
			],
		});

		if (res) {
			const paths = Array.isArray(res) ? res : [res];
			appendFiles(paths);
		}
	};

	// Drag & Drop сортировка прикрепленных файлов
	const handleDragStartItem = (index: number) => {
		setDraggedFileIndex(index);
	};

	const handleDragOverItem = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (draggedFileIndex === null || draggedFileIndex === index) return;

		setAttachedFiles((prev) => {
			const updated = [...prev];
			const [movedItem] = updated.splice(draggedFileIndex, 1);
			updated.splice(index, 0, movedItem);
			return updated;
		});
		setDraggedFileIndex(index);
	};

	const handleDragEndItem = () => {
		setDraggedFileIndex(null);
	};

	const handleCreatePattern = async () => {
		if (!newPatternName.trim()) {
			alert("Укажите название");
			return;
		}
		const timesArray = newPatternTimes
			.split(",")
			.map((t) => t.trim())
			.filter((t) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(t));

		if (timesArray.length === 0) {
			alert("Укажите время ЧЧ:ММ (напр. 14:00, 18:00)");
			return;
		}

		try {
			const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const created = await invoke<Pattern>("create_pattern", {
				name: newPatternName.trim(),
				times: timesArray,
				timezone: clientTz,
			});
			setPatterns((prev) => [...prev, created]);
			setSelectedPatternId(created.id);
			setShowPatternModal(false);
			setNewPatternName("");
		} catch (e) {
			alert("Ошибка создания: " + e);
		}
	};

	const handleCreatePost = async () => {
		if (!postText.trim() && attachedFiles.length === 0) {
			alert("Добавьте текст или медиафайл");
			return;
		}
		if (!selectedTargetId || !selectedPatternId) {
			alert("Выберите сообщество");
			return;
		}

		let customIso: string | null = null;
		if (isManualTime) {
			const targetDate = new Date(selectedDate);
			targetDate.setHours(pickerHours, pickerMinutes, 0, 0);
			customIso = targetDate.toISOString();
		}

		try {
			// Порядок filePaths в точности совпадает с визуальным порядком карточек
			await invoke("add_post_to_queue", {
				targetId: selectedTargetId,
				patternId: selectedPatternId,
				text: postText.trim(),
				signed: authorsName,
				closeComments: !commentsOnPost,
				muteNotifications: !notifyFollowers,
				markAsAds: adFromCreator,
				customScheduledAt: customIso,
				filePaths: attachedFiles.map((f) => f.path),
			});

			setPostText("");
			setAttachedFiles([]);
			setIsManualTime(false);
			if (selectedTargetId) {
				syncVkQueue(selectedTargetId, false);
			}
		} catch (e) {
			alert("Ошибка добавления поста: " + e);
		}
	};

	const handleDeletePost = async (id: number) => {
		await invoke("delete_post", { postId: id });
		if (selectedTargetId) {
			syncVkQueue(selectedTargetId, false);
		}
	};

	const handleRescheduleNextSlot = async (postId: number) => {
		if (!selectedPatternId) {
			alert("Выберите паттерн");
			return;
		}
		try {
			await invoke("reschedule_post_next_slot", {
				postId,
				patternId: selectedPatternId,
			});
			if (selectedTargetId) {
				syncVkQueue(selectedTargetId, false);
			}
		} catch (e) {
			alert("Ошибка переноса: " + e);
		}
	};

	const openRescheduleModal = (post: PostItem) => {
		const postDate = new Date(post.scheduled_at_utc);
		const validDate =
			isNaN(postDate.getTime()) || postDate <= new Date()
				? new Date()
				: postDate;
		setRescheduleModalPost(post);
		setRescheduleDate(validDate);
		setRescheduleHours(validDate.getHours());
		setRescheduleMinutes(validDate.getMinutes());
		setRescheduleViewMonth(validDate);
	};

	const confirmRescheduleCustom = async () => {
		if (!rescheduleModalPost) return;
		const targetDate = new Date(rescheduleDate);
		targetDate.setHours(rescheduleHours, rescheduleMinutes, 0, 0);

		try {
			await invoke("reschedule_post_custom", {
				postId: rescheduleModalPost.id,
				customTimeUtc: targetDate.toISOString(),
			});
			setRescheduleModalPost(null);
			if (selectedTargetId) {
				syncVkQueue(selectedTargetId, false);
			}
		} catch (e) {
			alert("Ошибка установки времени: " + e);
		}
	};

	const handleStartTransfer = async () => {
		if (!selectedTargetId) return;
		setIsTransferring(true);
		setTransferProgress("Отправка в VK...");
		try {
			await invoke("start_transfer_pipeline", {
				targetId: selectedTargetId,
			});
		} catch (e) {
			alert("Ошибка запуска: " + e);
			setIsTransferring(false);
			setTransferProgress(null);
		}
	};

	const toggleExpandPost = (id: number) => {
		setExpandedPostIds((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
		);
	};

	const monthStart = startOfMonth(viewMonth);
	const monthEnd = endOfMonth(viewMonth);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
	const daysInCalendar = eachDayOfInterval({
		start: calendarStart,
		end: calendarEnd,
	});

	const getCustomDisplayString = () => {
		const d = new Date(selectedDate);
		d.setHours(pickerHours, pickerMinutes, 0, 0);
		return format(d, "dd/MM/yyyy HH:mm");
	};

	const resMonthStart = startOfMonth(rescheduleViewMonth);
	const resMonthEnd = endOfMonth(rescheduleViewMonth);
	const resCalendarStart = startOfWeek(resMonthStart, { weekStartsOn: 1 });
	const resCalendarEnd = endOfWeek(resMonthEnd, { weekStartsOn: 1 });
	const resDaysInCalendar = eachDayOfInterval({
		start: resCalendarStart,
		end: resCalendarEnd,
	});

	return (
		<div className="flex flex-col h-screen bg-slate-950 text-slate-100">
			{/* Шапка */}
			<header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-3 select-none">
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2.5">
						<div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
							<Layers className="h-5 w-5" />
						</div>
						<span className="font-bold tracking-tight text-base">
							VK Post Studio
						</span>
					</div>

					<div className="flex items-center gap-2">
						<span className="text-xs text-slate-400 font-medium">
							Аккаунт:
						</span>
						{accounts.length > 0 ? (
							<div className="flex items-center gap-1.5">
								<select
									className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[240px] truncate"
									value={activeAccountId || ""}
									onChange={(e) =>
										handleSwitchAccount(
											Number(e.target.value),
										)
									}
								>
									{accounts.map((acc) => (
										<option key={acc.id} value={acc.id}>
											{acc.name}
										</option>
									))}
								</select>

								{/* Быстрое обновление токена в 1 клик */}
								<button
									onClick={handleOpenBrowserForLogin}
									className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
									title="Обновить токен в браузере"
								>
									<RefreshCw className="h-3.5 w-3.5" />
								</button>

								<button
									onClick={handleDeleteAccount}
									className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
									title="Отключить этот аккаунт"
								>
									<Trash2 className="h-3.5 w-3.5" />
								</button>
							</div>
						) : (
							<span className="text-xs text-amber-400/90 font-medium">
								Нет подключений
							</span>
						)}

						{/* Кнопка входа видна ТОЛЬКО если вход еще не совершен */}
						{accounts.length === 0 && (
							<button
								onClick={() => setShowTokenModal(true)}
								className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors shadow-md shadow-blue-600/20"
							>
								<ExternalLink className="h-3.5 w-3.5" />
								<span>Войти через VK</span>
							</button>
						)}

						{/* Кнопка добавления токена (аккуратный плюс) */}
						<button
							onClick={() => {
								setIsAutoListeningClipboard(false);
								setShowTokenModal(true);
							}}
							className="flex items-center gap-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-1.5 text-xs font-medium hover:bg-slate-750 transition-colors"
						>
							<Plus className="h-3.5 w-3.5 text-slate-400" />
							<span>Добавить токен</span>
						</button>
					</div>
				</div>

				{targets.length > 1 && (
					<div className="flex items-center gap-2 bg-slate-800/80 rounded-lg px-2.5 py-1 border border-slate-700/60">
						<span className="text-xs text-slate-400">Цель:</span>
						<select
							className="bg-transparent text-xs font-medium text-slate-200 focus:outline-none cursor-pointer"
							value={selectedTargetId || ""}
							onChange={(e) =>
								setSelectedTargetId(Number(e.target.value))
							}
						>
							{targets.map((t) => (
								<option
									key={t.id}
									value={t.id}
									className="bg-slate-900 text-slate-100"
								>
									{t.title}
								</option>
							))}
						</select>
					</div>
				)}
			</header>

			{/* Основное пространство */}
			<main className="flex flex-1 overflow-hidden">
				{/* Левая панель: Создание записи */}
				<section className="flex flex-col w-1/2 border-r border-slate-800 p-6 overflow-y-auto">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-sm font-semibold tracking-wide text-slate-300">
							СОЗДАНИЕ ЗАПИСИ
						</h2>

						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
								<Clock className="h-3.5 w-3.5 text-slate-400" />
								<select
									className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
									value={selectedPatternId || ""}
									onChange={(e) =>
										setSelectedPatternId(
											Number(e.target.value),
										)
									}
								>
									{patterns.map((p) => (
										<option
											key={p.id}
											value={p.id}
											className="bg-slate-900"
										>
											{p.name}
										</option>
									))}
								</select>
							</div>

							<button
								onClick={() => setShowPatternModal(true)}
								className="p-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
								title="Настроить паттерн"
							>
								<Settings2 className="h-4 w-4" />
							</button>
						</div>
					</div>

					<div className="mb-3">
						<textarea
							className="w-full h-16 min-h-[4rem] max-h-32 rounded-xl bg-slate-900/90 p-3 text-xs text-slate-100 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors resize-none overflow-y-auto leading-relaxed"
							placeholder="Текст записи (необязательно)..."
							value={postText}
							onChange={(e) => setPostText(e.target.value)}
						/>
					</div>

					{/* Зона загрузки медиа с сортировкой перетаскиванием */}
					<div className="flex-1 flex flex-col min-h-[190px]">
						{attachedFiles.length === 0 ? (
							<div
								onClick={handleSelectFiles}
								className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer p-6 transition-all duration-200 ${
									isDraggingOver
										? "border-blue-500 bg-blue-500/10 scale-[0.99]"
										: "border-slate-800 bg-slate-900/40 hover:bg-slate-900/70 hover:border-slate-700"
								}`}
							>
								<div className="p-3.5 rounded-2xl bg-slate-800/80 text-blue-400 mb-3 shadow-inner">
									<UploadCloud className="h-7 w-7" />
								</div>
								<span className="text-xs font-semibold text-slate-200">
									Перетащите изображения сюда
								</span>
								<span className="text-[11px] text-slate-500 mt-1">
									или нажмите для выбора файлов
								</span>
							</div>
						) : (
							<div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 overflow-hidden">
								<div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
									<span className="font-semibold text-slate-300">
										Прикрепленные файлы (
										{attachedFiles.length}) • перетаскивайте
										для изменения порядка
									</span>
									<button
										onClick={handleSelectFiles}
										className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium"
									>
										<ImagePlus className="h-3.5 w-3.5" />
										<span>Добавить еще</span>
									</button>
								</div>

								<div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 pr-1">
									{attachedFiles.map((file, idx) => (
										<div
											key={idx}
											draggable
											onDragStart={() =>
												handleDragStartItem(idx)
											}
											onDragOver={(e) =>
												handleDragOverItem(e, idx)
											}
											onDragEnd={handleDragEndItem}
											onClick={() =>
												file.previewUrl &&
												setFullViewImage(
													file.previewUrl,
												)
											}
											className={`group relative h-28 rounded-xl bg-slate-950 border overflow-hidden shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-all ${
												draggedFileIndex === idx
													? "opacity-40 border-blue-500 scale-95"
													: "border-slate-800 hover:border-slate-600"
											}`}
										>
											{file.isImage && file.previewUrl ? (
												<img
													src={file.previewUrl}
													alt={file.name}
													className="h-full w-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-200"
												/>
											) : (
												<div className="flex flex-col items-center p-2 text-center pointer-events-none">
													<FileText className="h-7 w-7 text-blue-400 mb-1" />
													<span className="text-[10px] text-slate-400 truncate max-w-[90px]">
														{file.name}
													</span>
												</div>
											)}

											{/* Индикатор позиции */}
											<span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-300 pointer-events-none backdrop-blur-sm">
												#{idx + 1}
											</span>

											<div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
												<GripVertical className="h-5 w-5 text-white/80 drop-shadow" />
											</div>

											<button
												onClick={(e) => {
													e.stopPropagation();
													setAttachedFiles((prev) =>
														prev.filter(
															(_, i) => i !== idx,
														),
													);
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

					{/* Настройки публикации */}
					<div className="mt-3 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden select-none">
						<button
							onClick={() => setIsSettingsOpen(!isSettingsOpen)}
							className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-300 hover:bg-slate-800/40 transition-colors"
						>
							<span>Настройки публикации</span>
							{isSettingsOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</button>

						{isSettingsOpen && (
							<div className="p-3 pt-0 space-y-3 border-t border-slate-800/60">
								<div className="flex items-center justify-between pt-2">
									<span className="text-xs font-medium text-slate-200">
										Комментарии к записи
									</span>
									<label className="relative inline-flex items-center cursor-pointer">
										<input
											type="checkbox"
											checked={commentsOnPost}
											onChange={(e) =>
												setCommentsOnPost(
													e.target.checked,
												)
											}
											className="sr-only peer"
										/>
										<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
									</label>
								</div>

								<div className="flex items-start justify-between">
									<div className="flex flex-col pr-4">
										<span className="text-xs font-medium text-slate-200">
											Уведомление для подписчиков
										</span>
										<span className="text-[11px] text-slate-500">
											Отправлять колокольчик тем, у кого
											включены уведомления
										</span>
									</div>
									<label className="relative inline-flex items-center cursor-pointer mt-0.5">
										<input
											type="checkbox"
											checked={notifyFollowers}
											onChange={(e) =>
												setNotifyFollowers(
													e.target.checked,
												)
											}
											className="sr-only peer"
										/>
										<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
									</label>
								</div>

								<div className="flex items-start justify-between">
									<div className="flex flex-col pr-4">
										<span className="text-xs font-medium text-slate-200">
											Подпись автора
										</span>
										<span className="text-[11px] text-slate-500">
											«Автор: Имя Фамилия» будет указано
											под постом
										</span>
									</div>
									<label className="relative inline-flex items-center cursor-pointer mt-0.5">
										<input
											type="checkbox"
											checked={authorsName}
											onChange={(e) =>
												setAuthorsName(e.target.checked)
											}
											className="sr-only peer"
										/>
										<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
									</label>
								</div>

								<div className="flex items-start justify-between">
									<div className="flex flex-col pr-4">
										<span className="text-xs font-medium text-slate-200">
											Метка «Реклама от автора»
										</span>
										<span className="text-[11px] text-slate-500">
											Не добавлена. Метку нельзя изменить
											после публикации
										</span>
									</div>
									<label className="relative inline-flex items-center cursor-pointer mt-0.5">
										<input
											type="checkbox"
											checked={adFromCreator}
											onChange={(e) =>
												setAdFromCreator(
													e.target.checked,
												)
											}
											className="sr-only peer"
										/>
										<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
									</label>
								</div>
							</div>
						)}
					</div>

					{/* Блок ручного выбора времени слота */}
					<div
						className="mt-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col gap-3 text-xs select-none relative"
						ref={calendarRef}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-blue-400" />
								<span className="text-slate-200 font-medium">
									Задать время слота вручную
								</span>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={isManualTime}
									onChange={(e) => {
										setIsManualTime(e.target.checked);
										if (!e.target.checked)
											setIsCalendarOpen(false);
									}}
									className="sr-only peer"
								/>
								<div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 border border-slate-700"></div>
							</label>
						</div>

						{isManualTime && (
							<div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-3">
								<span className="text-[11px] text-slate-400">
									Время публикации:
								</span>
								<button
									onClick={() =>
										setIsCalendarOpen(!isCalendarOpen)
									}
									className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-blue-500 transition-colors"
								>
									<Clock className="h-3.5 w-3.5 text-blue-400" />
									<span>{getCustomDisplayString()}</span>
								</button>
							</div>
						)}

						{isCalendarOpen && isManualTime && (
							<div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 z-50">
								<div className="flex items-center justify-between mb-3 text-xs">
									<span className="font-semibold capitalize text-slate-200">
										{format(viewMonth, "LLLL yyyy", {
											locale: ru,
										})}
									</span>
									<div className="flex items-center gap-1">
										<button
											onClick={() =>
												setViewMonth(
													subMonths(viewMonth, 1),
												)
											}
											className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
										>
											<ChevronLeft className="h-4 w-4" />
										</button>
										<button
											onClick={() =>
												setViewMonth(
													addMonths(viewMonth, 1),
												)
											}
											className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
										>
											<ChevronRight className="h-4 w-4" />
										</button>
									</div>
								</div>

								<div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 font-medium mb-1">
									<span>Пн</span>
									<span>Вт</span>
									<span>Ср</span>
									<span>Чт</span>
									<span>Пт</span>
									<span className="text-amber-500/80">
										Сб
									</span>
									<span className="text-amber-500/80">
										Вс
									</span>
								</div>

								<div className="grid grid-cols-7 gap-1 text-center text-xs">
									{daysInCalendar.map((day, idx) => {
										const isSelected = isSameDay(
											day,
											selectedDate,
										);
										const isCurrentMonth =
											day.getMonth() ===
											viewMonth.getMonth();
										return (
											<button
												key={idx}
												onClick={() =>
													setSelectedDate(day)
												}
												className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-mono text-[11px] transition-colors ${
													isSelected
														? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
														: isCurrentMonth
															? "text-slate-200 hover:bg-slate-800"
															: "text-slate-600 hover:bg-slate-800/40"
												}`}
											>
												{format(day, "d")}
											</button>
										);
									})}
								</div>

								<div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
									<span className="text-slate-400 text-[11px]">
										Время (24h):
									</span>
									<div className="flex items-center gap-1 font-mono">
										<select
											value={pickerHours}
											onChange={(e) =>
												setPickerHours(
													Number(e.target.value),
												)
											}
											className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
										>
											{Array.from({ length: 24 }).map(
												(_, i) => (
													<option key={i} value={i}>
														{i
															.toString()
															.padStart(2, "0")}
													</option>
												),
											)}
										</select>
										<span className="text-slate-500 font-bold">
											:
										</span>
										<select
											value={pickerMinutes}
											onChange={(e) =>
												setPickerMinutes(
													Number(e.target.value),
												)
											}
											className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
										>
											{Array.from({ length: 12 }).map(
												(_, i) => {
													const m = i * 5;
													return (
														<option
															key={m}
															value={m}
														>
															{m
																.toString()
																.padStart(
																	2,
																	"0",
																)}
														</option>
													);
												},
											)}
										</select>
									</div>
								</div>

								<div className="mt-3 flex justify-end">
									<button
										onClick={() => setIsCalendarOpen(false)}
										className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
									>
										Применить
									</button>
								</div>
							</div>
						)}
					</div>

					<div className="mt-4 pt-3 border-t border-slate-800">
						<button
							onClick={handleCreatePost}
							disabled={!selectedTargetId}
							className="flex items-center justify-center gap-2.5 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all"
						>
							<Plus className="h-4 w-4" />
							<span>
								{isManualTime
									? `Добавить на выбранное время — ${getCustomDisplayString()}`
									: `Добавить в очередь — ${nextSlotDisplay}`}
							</span>
						</button>
					</div>
				</section>

				{/* Правая панель: Очередь публикаций */}
				<section className="flex flex-col w-1/2 p-6 overflow-hidden bg-slate-950/40">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div>
								<h2 className="text-sm font-semibold tracking-wide text-slate-300">
									ОЧЕРЕДЬ ПУБЛИКАЦИИ
								</h2>
								<p className="text-xs text-slate-500 mt-0.5">
									В списке: {queue.length} шт.{" "}
									{isGroupTokenAuth && (
										<span className="text-blue-400/80">
											• (локальный учет отложки)
										</span>
									)}
								</p>
							</div>
							<button
								onClick={() =>
									selectedTargetId &&
									syncVkQueue(selectedTargetId, true)
								}
								disabled={isSyncingVk}
								className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
								title="Синхронизировать с отложкой ВК"
							>
								<RefreshCw
									className={`h-4 w-4 ${isSyncingVk ? "animate-spin text-blue-400" : ""}`}
								/>
							</button>
						</div>

						<button
							onClick={handleStartTransfer}
							disabled={
								isTransferring ||
								queue.filter((p) => p.status === "queued")
									.length === 0
							}
							className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-600/20"
						>
							{isTransferring ? (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									<span>
										{transferProgress || "Синхронизация..."}
									</span>
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									<span>Отправить в очередь ВК</span>
								</>
							)}
						</button>
					</div>

					<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
						{queue.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-56 border border-dashed border-slate-800/80 rounded-2xl text-slate-500 text-xs">
								<Clock className="h-8 w-8 text-slate-700 mb-2" />
								<span className="font-medium text-slate-400">
									Очередь чиста
								</span>
								<span className="mt-1 text-slate-600">
									Созданные посты займут свободные слоты
								</span>
							</div>
						) : (
							queue.map((post, index) => {
								const isExpanded = expandedPostIds.includes(
									post.id,
								);
								return (
									<div
										key={post.id}
										className="flex flex-col rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors overflow-hidden"
									>
										<div
											onClick={() =>
												toggleExpandPost(post.id)
											}
											className="flex items-start justify-between gap-4 p-4 cursor-pointer select-none"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2.5 text-xs mb-2">
													<span className="text-[11px] font-mono text-slate-500">
														#{index + 1}
													</span>
													<span className="font-semibold text-blue-400 font-mono">
														{format(
															new Date(
																post.scheduled_at_utc,
															),
															"dd/MM/yyyy HH:mm",
														)}
													</span>

													{post.status ===
														"queued" && (
														<span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
															Локально
														</span>
													)}
													{post.status ===
														"transferred_to_vk" && (
														<span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
															<CheckCircle2 className="h-3 w-3" />{" "}
															В отложке ВК
														</span>
													)}
													{post.status ===
														"failed" && (
														<span className="flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
															<AlertCircle className="h-3 w-3" />{" "}
															Ошибка
														</span>
													)}

													{post.attachments_count >
														0 && (
														<span className="text-slate-400 text-[11px]">
															•{" "}
															{
																post.attachments_count
															}{" "}
															влож.
														</span>
													)}
												</div>

												<p
													className={`text-xs text-slate-200 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
												>
													{post.text || (
														<span className="italic text-slate-500">
															Без
															сопроводительного
															текста
														</span>
													)}
												</p>
											</div>

											<div className="flex items-center gap-1">
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDeletePost(
															post.id,
														);
													}}
													className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
													title="Удалить"
												>
													<Trash2 className="h-4 w-4" />
												</button>
												<div className="p-1 text-slate-500">
													{isExpanded ? (
														<ChevronUp className="h-4 w-4" />
													) : (
														<ChevronDown className="h-4 w-4" />
													)}
												</div>
											</div>
										</div>

										{/* Раскрытый блок с кнопками переноса времени и вложениями */}
										{isExpanded && (
											<div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/30">
												{post.error_message && (
													<div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 leading-relaxed">
														<strong>
															Причина ошибки:
														</strong>{" "}
														{post.error_message}
													</div>
												)}

												{post.status !==
													"transferred_to_vk" && (
													<div className="flex items-center gap-2 mb-3 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
														<span className="text-xs text-slate-400 font-medium">
															Перенести:
														</span>
														<button
															onClick={(e) => {
																e.stopPropagation();
																handleRescheduleNextSlot(
																	post.id,
																);
															}}
															className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
															title="Занять следующий доступный слот по расписанию"
														>
															<RotateCcw className="h-3.5 w-3.5" />
															<span>
																Следующий слот
															</span>
														</button>
														<button
															onClick={(e) => {
																e.stopPropagation();
																openRescheduleModal(
																	post,
																);
															}}
															className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
															title="Выбрать точную дату и время вручную"
														>
															<Calendar className="h-3.5 w-3.5 text-blue-400" />
															<span>
																Задать время
															</span>
														</button>
													</div>
												)}

												{post.attachments &&
												post.attachments.length > 0 ? (
													<div>
														<span className="text-[11px] font-semibold text-slate-400 block mb-2">
															Прикрепленные
															вложения:
														</span>
														<div className="grid grid-cols-4 gap-2">
															{post.attachments.map(
																(
																	att,
																	attIdx,
																) => (
																	<QueueAttachmentThumbnail
																		key={
																			attIdx
																		}
																		att={
																			att
																		}
																		onOpenFull={
																			setFullViewImage
																		}
																	/>
																),
															)}
														</div>
													</div>
												) : (
													<span className="text-[11px] text-slate-500 italic">
														Вложений нет
													</span>
												)}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>
				</section>
			</main>

			{/* Модальное окно изменения времени поста в очереди */}
			{rescheduleModalPost && (
				<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2 text-blue-400">
								<Calendar className="h-5 w-5" />
								<h3 className="font-semibold text-sm text-slate-100">
									Выбор времени публикации
								</h3>
							</div>
							<button
								onClick={() => setRescheduleModalPost(null)}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="flex items-center justify-between mb-3 text-xs">
							<span className="font-semibold capitalize text-slate-200">
								{format(rescheduleViewMonth, "LLLL yyyy", {
									locale: ru,
								})}
							</span>
							<div className="flex items-center gap-1">
								<button
									onClick={() =>
										setRescheduleViewMonth(
											subMonths(rescheduleViewMonth, 1),
										)
									}
									className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
								>
									<ChevronLeft className="h-4 w-4" />
								</button>
								<button
									onClick={() =>
										setRescheduleViewMonth(
											addMonths(rescheduleViewMonth, 1),
										)
									}
									className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
								>
									<ChevronRight className="h-4 w-4" />
								</button>
							</div>
						</div>

						<div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 font-medium mb-1">
							<span>Пн</span>
							<span>Вт</span>
							<span>Ср</span>
							<span>Чт</span>
							<span>Пт</span>
							<span className="text-amber-500/80">Сб</span>
							<span className="text-amber-500/80">Вс</span>
						</div>

						<div className="grid grid-cols-7 gap-1 text-center text-xs">
							{resDaysInCalendar.map((day, idx) => {
								const isSelected = isSameDay(
									day,
									rescheduleDate,
								);
								const isCurrentMonth =
									day.getMonth() ===
									rescheduleViewMonth.getMonth();
								return (
									<button
										key={idx}
										onClick={() => setRescheduleDate(day)}
										className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center font-mono text-[11px] transition-colors ${
											isSelected
												? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30"
												: isCurrentMonth
													? "text-slate-200 hover:bg-slate-800"
													: "text-slate-600 hover:bg-slate-800/40"
										}`}
									>
										{format(day, "d")}
									</button>
								);
							})}
						</div>

						<div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
							<span className="text-slate-400 text-[11px]">
								Время (24h):
							</span>
							<div className="flex items-center gap-1 font-mono">
								<select
									value={rescheduleHours}
									onChange={(e) =>
										setRescheduleHours(
											Number(e.target.value),
										)
									}
									className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
								>
									{Array.from({ length: 24 }).map((_, i) => (
										<option key={i} value={i}>
											{i.toString().padStart(2, "0")}
										</option>
									))}
								</select>
								<span className="text-slate-500 font-bold">
									:
								</span>
								<select
									value={rescheduleMinutes}
									onChange={(e) =>
										setRescheduleMinutes(
											Number(e.target.value),
										)
									}
									className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
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
								onClick={() => setRescheduleModalPost(null)}
								className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200"
							>
								Отмена
							</button>
							<button
								onClick={confirmRescheduleCustom}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md"
							>
								Сохранить время
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Модальное окно полноразмерного просмотра изображения */}
			{fullViewImage && (
				<div
					onClick={() => setFullViewImage(null)}
					className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 z-50 cursor-zoom-out animate-in fade-in duration-150"
				>
					<div className="relative max-w-5xl max-h-[90vh] flex items-center justify-center">
						<img
							src={fullViewImage}
							alt="Полный размер"
							className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
						/>
						<button
							onClick={() => setFullViewImage(null)}
							className="absolute -top-4 -right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-rose-600 transition-colors shadow-lg"
							title="Закрыть"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</div>
			)}

			{/* Модальное окно входа / добавления токена */}
			{showTokenModal && (
				<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2 text-blue-400">
								<Key className="h-5 w-5" />
								<h3 className="font-semibold text-base text-slate-100">
									Вход ВКонтакте
								</h3>
							</div>
							<button
								onClick={() => {
									setIsAutoListeningClipboard(false);
									setShowTokenModal(false);
								}}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div className="p-3.5 bg-blue-600/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 leading-relaxed">
								Нажмите кнопку ниже, разрешите доступ в
								браузере, затем скопируйте адресную строку
								(Ctrl+C). Приложение автоматически распознает
								ссылку или нажмите кнопку «Вставить».
							</div>

							<div className="flex gap-2">
								<button
									onClick={handleOpenBrowserForLogin}
									className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-md transition-all text-xs"
								>
									<ExternalLink className="h-3.5 w-3.5" />
									<span>Открыть окно входа в браузере</span>
								</button>

								<button
									onClick={handlePasteFromClipboard}
									className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
									title="Вставить из буфера обмена"
								>
									<ClipboardCheck className="h-4 w-4 text-emerald-400" />
									<span>Вставить</span>
								</button>
							</div>

							{isAutoListeningClipboard && (
								<div className="flex items-center gap-2 text-[11px] text-blue-400">
									<RefreshCw className="h-3 w-3 animate-spin" />
									<span>
										Ожидание копирования адресной строки из
										браузера...
									</span>
								</div>
							)}

							<div>
								<label className="block text-[11px] font-medium text-slate-400 mb-1.5">
									Токен или ссылка из адресной строки:
								</label>
								<textarea
									rows={2}
									placeholder="Вставьте ссылку или токен..."
									className="w-full rounded-xl bg-slate-800 p-3 text-xs border border-slate-700 focus:outline-none focus:border-blue-500 font-mono resize-none leading-relaxed"
									value={newTokenInput}
									onChange={(e) =>
										setNewTokenInput(
											cleanTokenInput(e.target.value),
										)
									}
								/>
							</div>
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={() => {
									setIsAutoListeningClipboard(false);
									setShowTokenModal(false);
								}}
								className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
							>
								Отмена
							</button>
							<button
								onClick={handleAddToken}
								disabled={
									isAddingToken || !newTokenInput.trim()
								}
								className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors shadow-md"
							>
								{isAddingToken
									? "Проверка..."
									: "Сохранить токен"}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Модальное окно создания паттерна */}
			{showPatternModal && (
				<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
					<div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold text-base">
								Создание своего паттерна
							</h3>
							<button
								onClick={() => setShowPatternModal(false)}
								className="text-slate-400 hover:text-slate-200"
							>
								<X className="h-5 w-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<label className="block text-xs font-medium text-slate-400 mb-1.5">
									Название паттерна
								</label>
								<input
									type="text"
									placeholder="Например: 4 раза в день"
									className="w-full rounded-xl bg-slate-800 px-3.5 py-2 text-sm border border-slate-700 focus:outline-none focus:border-blue-500"
									value={newPatternName}
									onChange={(e) =>
										setNewPatternName(e.target.value)
									}
								/>
							</div>

							<div>
								<label className="block text-xs font-medium text-slate-400 mb-1.5">
									Времена публикаций через запятую (ЧЧ:ММ)
								</label>
								<input
									type="text"
									placeholder="10:00, 14:00, 18:00, 21:00"
									className="w-full rounded-xl bg-slate-800 px-3.5 py-2 text-sm border border-slate-700 focus:outline-none focus:border-blue-500 font-mono"
									value={newPatternTimes}
									onChange={(e) =>
										setNewPatternTimes(e.target.value)
									}
								/>
							</div>
						</div>

						<div className="mt-6 flex justify-end gap-3">
							<button
								onClick={() => setShowPatternModal(false)}
								className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
							>
								Отмена
							</button>
							<button
								onClick={handleCreatePattern}
								className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white hover:bg-blue-500"
							>
								Сохранить паттерн
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function QueueAttachmentThumbnail({
	att,
	onOpenFull,
}: {
	att: AttachmentItem;
	onOpenFull: (url: string) => void;
}) {
	const [imgSrc, setImgSrc] = useState<string | null>(null);

	useEffect(() => {
		if (att.local_path) {
			invoke<string>("get_file_preview_base64", { path: att.local_path })
				.then(setImgSrc)
				.catch(() => setImgSrc(null));
		}
	}, [att.local_path]);

	return (
		<div
			onClick={() => imgSrc && onOpenFull(imgSrc)}
			className={`h-20 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center overflow-hidden p-1 relative ${
				imgSrc ? "cursor-pointer hover:border-slate-600" : ""
			}`}
		>
			{imgSrc ? (
				<img
					src={imgSrc}
					alt={att.file_name}
					className="h-full w-full object-cover rounded"
				/>
			) : (
				<>
					<FileText className="h-5 w-5 text-blue-400 mb-1" />
					<span className="text-[9px] text-slate-400 truncate max-w-full text-center">
						{att.file_name}
					</span>
				</>
			)}
		</div>
	);
}
