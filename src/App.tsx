import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { X, FileText } from "lucide-react";
import { Header } from "./components/Header";
import { PostCreator } from "./components/PostCreator";
import { QueuePanel } from "./components/QueuePanel";
import {
	TokenModal,
	PatternModal,
	BatchModal,
	RevertModal,
	RescheduleModal,
	LightboxModal,
	SettingsModal,
	WallViewerModal,
	DeleteConfirmModal,
	CleanDiskModal,
	ClearDatabaseConfirmModal,
	VkLivePreviewModal,
	NoticeModal,
} from "./components/Modals";
import { api } from "./services/api";
import {
	Account,
	Target,
	Pattern,
	PostItem,
	FilePreview,
	Theme,
	LiveWallPostItem,
} from "./types";
import { Lang, translations } from "./services/i18n";
import { format } from "date-fns";

export default function App() {
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("vk_theme") as Theme) || "pastel",
	);
	const [lang, setLang] = useState<Lang>(
		() => (localStorage.getItem("vk_lang") as Lang) || "ru",
	);
	const [deleteMode, setDeleteMode] = useState<"permanent" | "trash">(() => {
		return (
			(localStorage.getItem("vk_delete_mode") as "permanent" | "trash") ||
			"trash"
		);
	});

	const [cleanFolderHint, setCleanFolderHint] = useState<string>(() => {
		return localStorage.getItem("vk_last_folder") || "";
	});

	const [accounts, setAccounts] = useState<Account[]>([]);
	const [activeAccountId, setActiveAccountId] = useState<number | null>(
		() => {
			const saved = localStorage.getItem("vk_active_acc");
			return saved ? Number(saved) : null;
		},
	);
	const [isTokenExpired, setIsTokenExpired] = useState(false);
	const hasActiveToken =
		accounts.length > 0 && activeAccountId !== null && !isTokenExpired;

	const [targets, setTargets] = useState<Target[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
		() => {
			const saved = localStorage.getItem("vk_selected_target");
			return saved ? Number(saved) : null;
		},
	);

	const [patterns, setPatterns] = useState<Pattern[]>([]);
	const [selectedPatternId, setSelectedPatternId] = useState<number | null>(
		() => {
			const saved = localStorage.getItem("vk_selected_pattern");
			return saved ? Number(saved) : null;
		},
	);

	useEffect(() => {
		if (selectedPatternId !== null) {
			localStorage.setItem(
				"vk_selected_pattern",
				selectedPatternId.toString(),
			);
		} else {
			localStorage.removeItem("vk_selected_pattern");
		}
	}, [selectedPatternId]);

	const [queue, setQueue] = useState<PostItem[]>([]);
	const [historyPosts, setHistoryPosts] = useState<PostItem[]>([]);
	const [activeQueueTab, setActiveQueueTab] = useState<
		"local" | "vk" | "history"
	>("local");
	const [queueViewMode, setQueueViewMode] = useState<"list" | "calendar">(
		"list",
	);
	const [expandedPostIds, setExpandedPostIds] = useState<number[]>([]);
	const [nextSlotDisplay, setNextSlotDisplay] = useState<string>("Расчет...");
	const [isSyncingVk, setIsSyncingVk] = useState(false);
	const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

	const [editingPostId, setEditingPostId] = useState<number | null>(null);
	const [postText, setPostText] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<FilePreview[]>([]);
	const attachedFilesRef = useRef<FilePreview[]>([]);
	attachedFilesRef.current = attachedFiles;

	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [attachmentsViewMode, setAttachmentsViewMode] = useState<
		"grid" | "carousel"
	>("grid");
	const [fullViewImage, setFullViewImage] = useState<string | null>(null);

	const [isManualTime, setIsManualTime] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [pickerHours, setPickerHours] = useState<number>(
		new Date().getHours(),
	);
	const [pickerMinutes, setPickerMinutes] = useState<number>(0);
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);
	const [viewMonth, setViewMonth] = useState<Date>(new Date());
	const [contentCalendarMonth, setContentCalendarMonth] = useState<Date>(
		new Date(),
	);

	const [rescheduleModalPost, setRescheduleModalPost] =
		useState<PostItem | null>(null);
	const [rescheduleDate, setRescheduleDate] = useState<Date>(new Date());
	const [rescheduleHours, setRescheduleHours] = useState<number>(12);
	const [rescheduleMinutes, setRescheduleMinutes] = useState<number>(0);
	const [rescheduleViewMonth, setRescheduleViewMonth] = useState<Date>(
		new Date(),
	);

	const [revertModalPost, setRevertModalPost] = useState<PostItem | null>(
		null,
	);

	const [showBatchModal, setShowBatchModal] = useState(false);
	const showBatchModalRef = useRef(showBatchModal);
	showBatchModalRef.current = showBatchModal;

	const [batchPaths, setBatchPaths] = useState<string[]>([]);
	const [isBatchCreating, setIsBatchCreating] = useState(false);

	const [showLivePreviewModal, setShowLivePreviewModal] = useState(false);

	const [showWallModal, setShowWallModal] = useState(false);
	const [wallPosts, setWallPosts] = useState<LiveWallPostItem[]>([]);
	const [isSyncingWall, setIsSyncingWall] = useState(false);
	const [wallOffset, setWallOffset] = useState<number>(0);

	const [calendarDetailPost, setCalendarDetailPost] =
		useState<PostItem | null>(null);
	const [notice, setNotice] = useState<{
		title: string;
		message: string;
	} | null>(null);

	const [skipDeleteConfirmSession, setSkipDeleteConfirmSession] =
		useState(false);
	const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);

	const [showCleanDiskModal, setShowCleanDiskModal] = useState(false);
	const [cleanedDiskCount, setCleanedDiskCount] = useState<number | null>(
		null,
	);
	const [isCleaningDisk, setIsCleaningDisk] = useState(false);

	const [showClearDbConfirmModal, setShowClearDbConfirmModal] =
		useState(false);

	const [commentsOnPost, setCommentsOnPost] = useState(true);
	const [notifyFollowers, setNotifyFollowers] = useState(true);
	const [authorsName, setAuthorsName] = useState(false);
	const [adFromCreator, setAdFromCreator] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(true);

	const [isTransferring, setIsTransferring] = useState(false);
	const [transferProgress, setTransferProgress] = useState<string | null>(
		null,
	);

	const [showTokenModal, setShowTokenModal] = useState(false);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [newTokenInput, setNewTokenInput] = useState("");
	const [isAddingToken, setIsAddingToken] = useState(false);

	const [showPatternModal, setShowPatternModal] = useState(false);
	const [newPatternName, setNewPatternName] = useState("");
	const [newPatternTimes, setNewPatternTimes] = useState(
		"14:00, 18:00, 21:00",
	);
	const [newPatternIntervalDays, setNewPatternIntervalDays] =
		useState<number>(1);

	const processingDropRef = useRef<Set<string>>(new Set());
	const lastDropTimeRef = useRef<number>(0);

	const handleSetTheme = (newTheme: Theme) => {
		setTheme(newTheme);
		localStorage.setItem("vk_theme", newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
	};

	const handleSetLang = (newLang: Lang) => {
		setLang(newLang);
		localStorage.setItem("vk_lang", newLang);
	};

	const handlePickCleanFolder = async () => {
		const res = await open({ directory: true, multiple: false });
		if (res && typeof res === "string") {
			setCleanFolderHint(res);
			localStorage.setItem("vk_last_folder", res);
		}
	};

	useEffect(() => {
		if (editingPostId === null) {
			const draft = {
				text: postText,
				viewMode: attachmentsViewMode,
				comments: commentsOnPost,
				notify: notifyFollowers,
				authorsName,
				ad: adFromCreator,
				filePaths: attachedFiles
					.map((f) => f.path)
					.filter((p) => Boolean(p)),
			};
			localStorage.setItem("vk_draft", JSON.stringify(draft));
		}
	}, [
		postText,
		attachedFiles,
		attachmentsViewMode,
		commentsOnPost,
		notifyFollowers,
		authorsName,
		adFromCreator,
		editingPostId,
	]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem("vk_draft");
			if (raw) {
				const d = JSON.parse(raw);
				if (d.text) setPostText(d.text);
				if (d.viewMode) setAttachmentsViewMode(d.viewMode);
				if (typeof d.comments === "boolean")
					setCommentsOnPost(d.comments);
				if (typeof d.notify === "boolean") setNotifyFollowers(d.notify);
				if (typeof d.authorsName === "boolean")
					setAuthorsName(d.authorsName);
				if (typeof d.ad === "boolean") setAdFromCreator(d.ad);
				if (Array.isArray(d.filePaths) && d.filePaths.length > 0) {
					appendFiles(d.filePaths);
				}
			}
		} catch {}
	}, []);

	const handleCleanExpiredTokens = async () => {
		try {
			const deleted = await api.cleanExpiredTokens();
			setNotice({
				title: lang === "ru" ? "Очистка токенов" : "Tokens Cleaned",
				message: `${lang === "ru" ? "Удалено недействительных токенов:" : "Removed invalid tokens:"} ${deleted}`,
			});
			loadAccounts();
		} catch (e) {
			setNotice({ title: "Ошибка", message: String(e) });
		}
	};

	const handleExecuteClearDatabase = async () => {
		setShowClearDbConfirmModal(false);
		try {
			await api.clearDatabaseExceptTokens();
			if (selectedTargetId) syncVkQueue(selectedTargetId);
			setNotice({
				title:
					lang === "ru" ? "База данных очищена" : "Database Cleared",
				message:
					lang === "ru"
						? "Все посты и очереди успешно удалены."
						: "All posts and queues have been cleared.",
			});
		} catch (e) {
			setNotice({ title: "Ошибка", message: String(e) });
		}
	};

	useEffect(() => {
		const handleWindowPaste = async (e: ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.type.indexOf("image") !== -1) {
					e.preventDefault();
					const file = item.getAsFile();
					if (file) {
						const ext = file.type.split("/")[1] || "png";
						const buffer = await file.arrayBuffer();
						const bytes = Array.from(new Uint8Array(buffer));
						try {
							const savedPath = await api.savePastedImage(
								bytes,
								ext,
							);
							if (showBatchModalRef.current) {
								setBatchPaths((prev) =>
									Array.from(new Set([...prev, savedPath])),
								);
							} else {
								await appendFiles([savedPath]);
							}
						} catch (err) {
							console.error("Ошибка сохранения из буфера:", err);
							setNotice({
								title:
									lang === "ru"
										? "Ошибка вставки"
										: "Paste Error",
								message:
									lang === "ru"
										? `Не удалось сохранить изображение из буфера обмена: ${String(err)}`
										: `Failed to save image from clipboard: ${String(err)}`,
							});
						}
					}
					break;
				}
			}
		};

		window.addEventListener("paste", handleWindowPaste);
		return () => window.removeEventListener("paste", handleWindowPaste);
	}, [lang]);

	useEffect(() => {
		let isCancelled = false;
		let unDrop: (() => void) | undefined;
		let unEnter: (() => void) | undefined;
		let unLeave: (() => void) | undefined;

		const setupListeners = async () => {
			const d = await listen<any>("tauri://drag-drop", async (event) => {
				if (isCancelled) return;
				setIsDraggingOver(false);

				const now = Date.now();
				if (now - lastDropTimeRef.current < 250) return;
				lastDropTimeRef.current = now;

				const rawPaths: string[] = event.payload?.paths || [];
				if (rawPaths.length === 0) return;

				if (rawPaths[0]) {
					const dir = rawPaths[0].replace(/[\\/][^\\/]+$/, "");
					setCleanFolderHint(dir);
					localStorage.setItem("vk_last_folder", dir);
				}

				if (showBatchModalRef.current) {
					setBatchPaths((prev) =>
						Array.from(new Set([...prev, ...rawPaths])),
					);
				} else {
					await appendFiles(rawPaths);
				}
			});
			if (isCancelled) d();
			else unDrop = d;

			const e = await listen("tauri://drag-enter", () => {
				if (!isCancelled) setIsDraggingOver(true);
			});
			if (isCancelled) e();
			else unEnter = e;

			const l = await listen("tauri://drag-leave", () => {
				if (!isCancelled) setIsDraggingOver(false);
			});
			if (isCancelled) l();
			else unLeave = l;
		};

		setupListeners();

		return () => {
			isCancelled = true;
			unDrop?.();
			unEnter?.();
			unLeave?.();
		};
	}, []);

	useEffect(() => {
		let unProgress: (() => void) | undefined;
		let unFinish: (() => void) | undefined;

		listen<any>("transfer-progress", (event) => {
			const { current, total } = event.payload || {};
			setTransferProgress(`Перенос ${current} из ${total}...`);
		}).then((f) => {
			unProgress = f;
		});

		listen<any>("transfer-finished", (event) => {
			setIsTransferring(false);
			setTransferProgress(null);
			if (selectedTargetId) {
				syncVkQueue(selectedTargetId);
			}
			if (event.payload?.error) {
				setNotice({
					title: "Ошибка отправки",
					message: String(event.payload.error),
				});
			}
		}).then((f) => {
			unFinish = f;
		});

		return () => {
			unProgress?.();
			unFinish?.();
		};
	}, [selectedTargetId]);

	const appendFiles = async (rawPaths: string[]) => {
		const existing = new Set(attachedFilesRef.current.map((f) => f.path));
		const uniqueToProcess: string[] = [];

		for (const p of rawPaths) {
			if (
				!existing.has(p) &&
				!processingDropRef.current.has(p) &&
				!uniqueToProcess.includes(p)
			) {
				uniqueToProcess.push(p);
				processingDropRef.current.add(p);
			}
		}

		if (uniqueToProcess.length === 0) return;

		try {
			const items = await Promise.all(
				uniqueToProcess.map(async (path) => ({
					path,
					name: path.split(/[\\/]/).pop() || "файл",
					isImage: true,
					previewUrl: await api
						.getFilePreview(path)
						.catch(() => undefined),
				})),
			);

			setAttachedFiles((prev) => {
				const currentPaths = new Set(prev.map((f) => f.path));
				const finalItems = items.filter(
					(it) => !currentPaths.has(it.path),
				);
				return [...prev, ...finalItems].slice(0, 10);
			});
		} finally {
			for (const p of uniqueToProcess) {
				processingDropRef.current.delete(p);
			}
		}
	};

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		api.initTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone).then(
			() => {
				loadAccounts();
				loadPatterns();
			},
		);
	}, []);

	const loadAccounts = async () => {
		try {
			const accs = await api.getAccounts();
			setAccounts(accs);
			const active =
				accs.find((a) => a.id === activeAccountId) ??
				accs.find((a) => a.is_active) ??
				accs[0] ??
				null;
			if (active) {
				setActiveAccountId(active.id);
				localStorage.setItem("vk_active_acc", active.id.toString());
				await loadTargetsForAccount(active.id);
			} else {
				setActiveAccountId(null);
				setTargets([]);
				setSelectedTargetId(null);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const loadTargetsForAccount = async (accId: number) => {
		try {
			const tgts = await api.getTargets(accId);
			setTargets(tgts);
			if (tgts.length > 0) {
				setSelectedTargetId((prev) => {
					const match = prev && tgts.find((t) => t.id === prev);
					const communityTarget = tgts.find(
						(t) => t.target_type === "community",
					);
					const chosen = match
						? match.id
						: communityTarget
							? communityTarget.id
							: tgts[0].id;
					localStorage.setItem(
						"vk_selected_target",
						chosen.toString(),
					);
					return chosen;
				});
			} else {
				setSelectedTargetId(null);
			}
		} catch (e) {
			console.error(e);
		}
	};

	const loadPatterns = async () => {
		try {
			const ptrns = await api.getPatterns();
			setPatterns(ptrns);
			if (ptrns.length > 0) {
				setSelectedPatternId((prev) => {
					const saved = localStorage.getItem("vk_selected_pattern");
					const savedId = saved ? Number(saved) : null;
					const targetId = prev ?? savedId;
					const match = ptrns.find((p) => p.id === targetId);
					const chosen = match ? match.id : ptrns[0].id;
					localStorage.setItem(
						"vk_selected_pattern",
						chosen.toString(),
					);
					return chosen;
				});
			} else {
				setSelectedPatternId(null);
				localStorage.removeItem("vk_selected_pattern");
			}
		} catch (e) {
			console.error(e);
		}
	};

	const loadHistory = async (tId: number) => {
		try {
			const hist = await api.getHistory(tId);
			setHistoryPosts(hist);
		} catch (e) {
			console.error(e);
		}
	};

	const syncVkQueue = async (tId: number) => {
		setIsSyncingVk(true);
		const safetyTimer = setTimeout(() => setIsSyncingVk(false), 14000);
		try {
			const res = await api.syncVkQueue(tId);
			setIsTokenExpired(false);
			setQueue(res.posts);
			await loadHistory(tId);
		} catch (e) {
			console.error(e);
			const errStr = String(e || "");
			if (
				errStr.includes("error 5") ||
				errStr.includes("User authorization failed")
			) {
				setIsTokenExpired(true);
				setNotice({
					title:
						lang === "ru"
							? "Требуется обновить токен"
							: "Token Update Required",
					message:
						lang === "ru"
							? "Срок действия токена истёк или сменился IP-адрес. Пожалуйста, обновите токен через кнопку «+ Добавить токен»."
							: "Token expired or IP address changed. Please re-authenticate via '+ Add Token'.",
				});
			}
			try {
				const q = await api.getQueue(tId);
				setQueue(q);
				await loadHistory(tId);
			} catch {}
		} finally {
			clearTimeout(safetyTimer);
			setIsSyncingVk(false);
		}
	};

	const handleScanWall = async (
		targetId: number,
		isLoadMore: boolean = false,
	) => {
		setIsSyncingWall(true);
		const nextOffset = isLoadMore ? wallOffset + 30 : 0;
		try {
			const posts = await api.fetchLiveWallPosts(targetId, nextOffset);
			setWallOffset(nextOffset);
			if (isLoadMore) {
				setWallPosts((prev) => [...prev, ...posts]);
			} else {
				setWallPosts(posts);
			}
		} catch (e) {
			const errStr = String(e || "");
			if (
				errStr.includes("error 5") ||
				errStr.includes("User authorization failed")
			) {
				setIsTokenExpired(true);
				setNotice({
					title:
						lang === "ru"
							? "Требуется обновить токен"
							: "Token Update Required",
					message:
						lang === "ru"
							? "Срок действия токена истёк или сменился IP-адрес. Пожалуйста, обновите токен через кнопку «+ Добавить токен»."
							: "Token expired or IP address changed. Please re-authenticate via '+ Add Token'.",
				});
			} else {
				setNotice({ title: "Ошибка связи с ВК", message: errStr });
			}
		} finally {
			setIsSyncingWall(false);
		}
	};

	useEffect(() => {
		if (selectedTargetId) {
			localStorage.setItem(
				"vk_selected_target",
				selectedTargetId.toString(),
			);
			syncVkQueue(selectedTargetId);
			setWallOffset(0);
			setWallPosts([]);
		}
	}, [selectedTargetId]);

	useEffect(() => {
		if (!selectedTargetId) {
			setNextSlotDisplay(translations[lang].selectTarget);
			return;
		}
		const patId = selectedPatternId || (patterns[0]?.id ?? 1);
		api.getNextSlot(selectedTargetId, patId)
			.then((iso) => {
				const d = new Date(iso);
				setNextSlotDisplay(format(d, "dd/MM/yy - HH:mm"));
				if (!isManualTime) {
					setSelectedDate(d);
					setPickerHours(d.getHours());
					setPickerMinutes(d.getMinutes());
				}
			})
			.catch(() => {
				const fallbackDate = new Date(Date.now() + 2 * 3600 * 1000);
				setNextSlotDisplay(format(fallbackDate, "dd/MM/yy - HH:mm"));
				if (!isManualTime) {
					setSelectedDate(fallbackDate);
					setPickerHours(fallbackDate.getHours());
					setPickerMinutes(fallbackDate.getMinutes());
				}
			});
	}, [selectedTargetId, selectedPatternId, queue, patterns, lang]);

	const handleAddFiles = async () => {
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
			if (paths[0]) {
				const dir = paths[0].replace(/[\\/][^\\/]+$/, "");
				setCleanFolderHint(dir);
				localStorage.setItem("vk_last_folder", dir);
			}
			await appendFiles(paths);
		}
	};

	const handleSavePost = async () => {
		if (!postText.trim() && attachedFiles.length === 0) {
			setNotice({
				title: "Внимание",
				message:
					lang === "ru"
						? "Добавьте текст или медиафайл"
						: "Add text or media",
			});
			return;
		}
		if (!selectedTargetId) {
			setNotice({
				title: "Внимание",
				message:
					lang === "ru" ? "Выберите сообщество" : "Select target",
			});
			return;
		}

		const patId = selectedPatternId || (patterns[0]?.id ?? 1);

		if (editingPostId) {
			const payloadAttachments = attachedFiles.map((f) => ({
				id: f.id,
				local_path: f.path || null,
				file_name: f.name,
				vk_attachment_string: f.vkAttachmentString || null,
				thumb_data: f.previewUrl || null,
			}));

			const targetDate = new Date(selectedDate.getTime());
			targetDate.setHours(pickerHours, pickerMinutes, 0, 0);

			try {
				await api.updatePost({
					postId: editingPostId,
					text: postText.trim(),
					signed: authorsName,
					closeComments: !commentsOnPost,
					muteNotifications: !notifyFollowers,
					markAsAds: adFromCreator,
					attachmentsViewMode,
					attachments: payloadAttachments,
					scheduledAtUtc: targetDate.toISOString(),
				});
				setEditingPostId(null);
				setPostText("");
				setAttachedFiles([]);
				localStorage.removeItem("vk_draft");
				syncVkQueue(selectedTargetId);
			} catch (err) {
				setNotice({
					title:
						lang === "ru" ? "Ошибка сохранения" : "Save Error",
					message: String(err),
				});
				if (
					String(err).includes("не найден") ||
					String(err).includes("not found")
				) {
					setEditingPostId(null);
					setPostText("");
					setAttachedFiles([]);
				}
			}
			return;
		}

		const targetDate = new Date(selectedDate.getTime());
		targetDate.setHours(pickerHours, pickerMinutes, 0, 0);
		const customIso = isManualTime ? targetDate.toISOString() : null;

		await api.addPost({
			targetId: selectedTargetId,
			patternId: patId,
			text: postText.trim(),
			signed: authorsName,
			closeComments: !commentsOnPost,
			muteNotifications: !notifyFollowers,
			markAsAds: adFromCreator,
			attachmentsViewMode,
			customScheduledAt: customIso,
			filePaths: attachedFiles.map((f) => f.path),
		});

		setPostText("");
		setAttachedFiles([]);
		setIsManualTime(false);
		localStorage.removeItem("vk_draft");
		syncVkQueue(selectedTargetId);
	};

	const executeDeletePost = async (post: PostItem) => {
		const pid = post.id;
		if (editingPostId === pid) {
			setEditingPostId(null);
			setPostText("");
			setAttachedFiles([]);
			localStorage.removeItem("vk_draft");
		}
		setQueue((prev: PostItem[]) => prev.filter((p) => p.id !== pid));
		setHistoryPosts((prev: PostItem[]) => prev.filter((p) => p.id !== pid));

		if (post.status === "transferred_to_vk") {
			await api.deleteVkPost(pid).catch(console.error);
		} else if (
			post.status === "archived" ||
			post.status === "published" ||
			post.status === "deleted_in_vk"
		) {
			await api.deleteHistoryPost(pid).catch(console.error);
		} else {
			await api.deleteLocalPost(pid).catch(console.error);
		}

		if (selectedTargetId) syncVkQueue(selectedTargetId);
	};

	const handleDeleteRequest = (post: PostItem) => {
		if (skipDeleteConfirmSession) {
			executeDeletePost(post);
		} else {
			setPostToDelete(post);
		}
	};

	const handleConfirmDeleteDialog = (dontAskAgain: boolean) => {
		if (dontAskAgain) {
			setSkipDeleteConfirmSession(true);
		}
		if (postToDelete) {
			executeDeletePost(postToDelete);
			setPostToDelete(null);
		}
	};

	const handleExecuteCleanDisk = async () => {
		if (!selectedTargetId) return;
		setIsCleaningDisk(true);
		try {
			const toTrash = deleteMode === "trash";
			const count = await api.cleanLocalFiles(
				selectedTargetId,
				toTrash,
				cleanFolderHint || undefined,
			);
			setCleanedDiskCount(count);
			syncVkQueue(selectedTargetId);
		} catch (e) {
			setNotice({ title: "Ошибка", message: String(e) });
		} finally {
			setIsCleaningDisk(false);
		}
	};

	const handleLoadVkPhotos = async (post: PostItem) => {
		if (!post.vk_post_id) return;
		try {
			const photos = await api.fetchVkPhotos(
				post.target_id,
				post.vk_post_id,
			);
			if (photos.length === 0) {
				setNotice({
					title: "Медиа ВКонтакте",
					message:
						lang === "ru"
							? "У поста нет фото вложений"
							: "No photo attachments found",
				});
				return;
			}

			const newAttachments = photos.map((ph, idx) => ({
				id: -(idx + 1),
				file_name: ph.file_name,
				size_bytes: 0,
				thumb_data: ph.data_url,
			}));

			const updater = (prevList: PostItem[]) =>
				prevList.map((p) =>
					p.id === post.id
						? {
								...p,
								attachments: newAttachments,
								attachments_count: newAttachments.length,
							}
						: p,
				);

			setQueue(updater);
			setHistoryPosts(updater);
		} catch (e) {
			setNotice({ title: "Ошибка", message: String(e) });
		}
	};

	const handleDeletePattern = async (id: number) => {
		try {
			await api.deletePattern(id);
			const ptrns = await api.getPatterns();
			setPatterns(ptrns);
			if (selectedPatternId === id) {
				setSelectedPatternId(ptrns[0]?.id ?? null);
			}
		} catch (e) {
			setNotice({ title: "Ошибка", message: String(e) });
		}
	};

	const localPosts = queue.filter(
		(p) => p.status === "queued" || p.status === "failed",
	);
	const vkDelayedPosts = queue.filter(
		(p) => p.status === "transferred_to_vk",
	);
	const displayedPosts =
		activeQueueTab === "local"
			? localPosts
			: activeQueueTab === "vk"
				? vkDelayedPosts
				: historyPosts;
	const currentTarget = targets.find((t) => t.id === selectedTargetId);
	const t = translations[lang];

	return (
		<div
			className="flex flex-col h-screen relative"
			style={{ backgroundColor: "var(--bg-app)" }}
		>
			<Header
				accounts={accounts}
				activeAccountId={activeAccountId}
				targets={targets}
				selectedTargetId={selectedTargetId}
				lang={lang}
				isRightPanelOpen={isRightPanelOpen}
				onSwitchAccount={async (id) => {
					await api.switchAccount(id);
					setActiveAccountId(id);
					localStorage.setItem("vk_active_acc", id.toString());
					loadTargetsForAccount(id);
				}}
				onDeleteAccount={async () => {
					if (!activeAccountId) return;
					await api.deleteAccount(activeAccountId);
					loadAccounts();
				}}
				onOpenTokenModal={() => setShowTokenModal(true)}
				onSelectTarget={(id: number) => {
					setSelectedTargetId(id);
					localStorage.setItem("vk_selected_target", id.toString());
				}}
				onOpenSettings={() => setShowSettingsModal(true)}
				onOpenAllPostsModal={() => {
					setShowWallModal(true);
					if (selectedTargetId && wallPosts.length === 0) {
						handleScanWall(selectedTargetId, false);
					}
				}}
				onToggleRightPanel={() =>
					setIsRightPanelOpen(!isRightPanelOpen)
				}
			/>

			<main
				className="flex flex-1 overflow-hidden relative"
				style={{ backgroundColor: "var(--bg-app)" }}
			>
				<PostCreator
					editingPostId={editingPostId}
					postText={postText}
					attachedFiles={attachedFiles}
					isRightPanelOpen={isRightPanelOpen}
					patterns={patterns}
					selectedPatternId={selectedPatternId}
					attachmentsViewMode={attachmentsViewMode}
					commentsOnPost={commentsOnPost}
					notifyFollowers={notifyFollowers}
					authorsName={authorsName}
					adFromCreator={adFromCreator}
					isSettingsOpen={isSettingsOpen}
					isManualTime={isManualTime}
					selectedDate={selectedDate}
					pickerHours={pickerHours}
					pickerMinutes={pickerMinutes}
					isCalendarOpen={isCalendarOpen}
					viewMonth={viewMonth}
					nextSlotDisplay={nextSlotDisplay}
					selectedTargetId={selectedTargetId}
					hasActiveToken={hasActiveToken}
					isDraggingOver={isDraggingOver && !showBatchModal}
					lang={lang}
					onTextChange={setPostText}
					onSelectPattern={setSelectedPatternId}
					onOpenPatternModal={() => setShowPatternModal(true)}
					onSelectFiles={handleAddFiles}
					onMoveFile={(f, t) => {
						const arr = [...attachedFiles];
						const [moved] = arr.splice(f, 1);
						arr.splice(t, 0, moved);
						setAttachedFiles(arr);
					}}
					onRemoveFile={(i) =>
						setAttachedFiles((prev) =>
							prev.filter((_, idx) => idx !== i),
						)
					}
					onSetFullView={setFullViewImage}
					onOpenBatchModal={() => setShowBatchModal(true)}
					onOpenLivePreview={() => setShowLivePreviewModal(true)}
					onSetViewMode={setAttachmentsViewMode}
					onToggleComments={setCommentsOnPost}
					onToggleNotify={setNotifyFollowers}
					onToggleAuthor={setAuthorsName}
					onToggleAd={setAdFromCreator}
					onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
					onToggleManualTime={setIsManualTime}
					onToggleCalendar={() => setIsCalendarOpen(!isCalendarOpen)}
					onSetViewMonth={setViewMonth}
					onSetSelectedDate={setSelectedDate}
					onSetPickerHours={setPickerHours}
					onSetPickerMinutes={setPickerMinutes}
					onCancelEditing={() => {
						setEditingPostId(null);
						setPostText("");
						setAttachedFiles([]);
					}}
					onSavePost={handleSavePost}
				/>

				<QueuePanel
					isRightPanelOpen={isRightPanelOpen}
					activeQueueTab={activeQueueTab}
					queueViewMode={queueViewMode}
					localPosts={localPosts}
					vkDelayedPosts={vkDelayedPosts}
					historyPosts={historyPosts}
					displayedPosts={displayedPosts}
					expandedPostIds={expandedPostIds}
					contentCalendarMonth={contentCalendarMonth}
					isSyncingVk={isSyncingVk}
					isTransferring={isTransferring}
					transferProgress={transferProgress}
					lang={lang}
					onSetTab={setActiveQueueTab}
					onSetViewMode={setQueueViewMode}
					onSetContentMonth={setContentCalendarMonth}
					onCleanLocalFiles={() => {
						setCleanedDiskCount(null);
						setShowCleanDiskModal(true);
					}}
					onSyncVk={() =>
						selectedTargetId && syncVkQueue(selectedTargetId)
					}
					onStartTransfer={async () => {
						if (!selectedTargetId) return;
						setIsTransferring(true);
						setTransferProgress(
							lang === "ru"
								? "Отправка в VK..."
								: "Sending to VK...",
						);
						try {
							await api.startTransfer(selectedTargetId);
						} catch (e) {
							setNotice({ title: "Ошибка", message: String(e) });
							setIsTransferring(false);
							setTransferProgress(null);
						}
					}}
					onToggleExpand={(id) =>
						setExpandedPostIds((prev) =>
							prev.includes(id)
								? prev.filter((p) => p !== id)
								: [...prev, id],
						)
					}
					onLoadToEditor={(post) => {
						setEditingPostId(post.id);
						setPostText(post.text);
						setAuthorsName(post.signed);
						setCommentsOnPost(!post.close_comments);
						setNotifyFollowers(!post.mute_notifications);
						setAdFromCreator(post.mark_as_ads);
						setAttachmentsViewMode(
							post.attachments_view_mode === "carousel"
								? "carousel"
								: "grid",
						);
						setAttachedFiles(
							post.attachments.map((a) => ({
								id: a.id,
								path: a.local_path || "",
								name: a.file_name,
								isImage: true,
								previewUrl: a.preview_url || a.thumb_data,
								vkAttachmentString: a.vk_attachment_string,
							})),
						);
						if (post.scheduled_at_utc) {
							const d = new Date(post.scheduled_at_utc);
							setSelectedDate(d);
							setViewMonth(d);
							setPickerHours(d.getHours());
							setPickerMinutes(d.getMinutes());
							setIsManualTime(true);
						}
						setIsRightPanelOpen(true);
					}}
					onOpenRevertModal={setRevertModalPost}
					onRescheduleNextSlot={async (id) => {
						const patId =
							selectedPatternId || (patterns[0]?.id ?? 1);
						await api.rescheduleNextSlot(id, patId);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
					}}
					onDeletePost={handleDeleteRequest}
					onOpenFullImage={setFullViewImage}
					onLoadVkPhotos={handleLoadVkPhotos}
					onSelectCalendarPost={(post) => setCalendarDetailPost(post)}
				/>
			</main>

			{calendarDetailPost && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[65] animate-in fade-in duration-150">
					<div
						className="border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<div
							className="flex items-center justify-between pb-2 border-b"
							style={{ borderColor: "var(--border-app)" }}
						>
							<span
								className="font-bold text-sm"
								style={{ color: "var(--text-app)" }}
							>
								{calendarDetailPost.vk_post_id
									? `${lang === "ru" ? "Пост ВКонтакте" : "VK Post"} #${calendarDetailPost.vk_post_id}`
									: `${lang === "ru" ? "Публикация" : "Post"} #${calendarDetailPost.id}`}
							</span>
							<button
								onClick={() => setCalendarDetailPost(null)}
								className="hover:opacity-75 cursor-pointer"
							>
								<X className="h-4 w-4" />
							</button>
						</div>

						<div className="text-xs space-y-2">
							<div
								className="flex items-center justify-between font-mono text-[11px]"
								style={{ color: "var(--accent)" }}
							>
								<span>
									{format(
										new Date(
											calendarDetailPost.scheduled_at_utc,
										),
										"dd/MM/yyyy HH:mm",
									)}
								</span>
								<span
									className="px-2 py-0.5 rounded border"
									style={{
										borderColor: "var(--border-light)",
									}}
								>
									{calendarDetailPost.status === "queued"
										? t.statusLocal
										: calendarDetailPost.status ===
											  "transferred_to_vk"
											? t.statusVk
											: calendarDetailPost.status ===
												  "published"
												? t.statusPublished
												: t.statusArchived}
								</span>
							</div>

							{calendarDetailPost.text && (
								<p
									className="leading-relaxed p-2.5 rounded-xl border max-h-40 overflow-y-auto whitespace-pre-wrap"
									style={{
										backgroundColor:
											"var(--bg-surface-sub)",
										borderColor: "var(--border-light)",
										color: "var(--text-app)",
									}}
								>
									{calendarDetailPost.text}
								</p>
							)}

							{calendarDetailPost.attachments &&
								calendarDetailPost.attachments.length > 0 && (
									<div>
										<span
											className="text-[11px] font-semibold block mb-1.5"
											style={{ color: "var(--text-dim)" }}
										>
											{t.attachedFiles} (
											{
												calendarDetailPost.attachments
													.length
											}
											):
										</span>
										<div className="grid grid-cols-4 gap-2">
											{calendarDetailPost.attachments.map(
												(att, i) => {
													const thumbSrc =
														att.preview_url ||
														att.thumb_data;
													const fullSrc =
														att.full_url ||
														att.thumb_data ||
														att.preview_url;
													return (
														<div
															key={i}
															onClick={() =>
																fullSrc &&
																setFullViewImage(
																	fullSrc,
																)
															}
															className="h-16 rounded-lg border overflow-hidden p-0.5 cursor-pointer hover:border-[var(--accent)]"
															style={{
																backgroundColor:
																	"var(--bg-surface-sub)",
																borderColor:
																	"var(--border-light)",
															}}
														>
															{thumbSrc ? (
																<img
																	src={
																		thumbSrc
																	}
																	alt=""
																	referrerPolicy="no-referrer"
																	className="h-full w-full object-cover rounded"
																/>
															) : (
																<div className="h-full w-full flex items-center justify-center">
																	<FileText
																		className="h-4 w-4"
																		style={{
																			color: "var(--accent)",
																		}}
																	/>
																</div>
															)}
														</div>
													);
												},
											)}
										</div>
									</div>
								)}
						</div>

						<div
							className="flex justify-end pt-2 border-t"
							style={{ borderColor: "var(--border-app)" }}
						>
							<button
								onClick={() => setCalendarDetailPost(null)}
								className="px-4 py-1.5 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
								style={{
									backgroundColor: "var(--btn-primary-bg)",
									color: "var(--btn-primary-text)",
								}}
							>
								{t.cancel}
							</button>
						</div>
					</div>
				</div>
			)}

			<VkLivePreviewModal
				show={showLivePreviewModal}
				lang={lang}
				targetTitle={currentTarget?.title || "Сообщество"}
				postText={postText}
				attachedFiles={attachedFiles}
				viewMode={attachmentsViewMode}
				authorsName={authorsName}
				adFromCreator={adFromCreator}
				commentsOnPost={commentsOnPost}
				slotDisplay={nextSlotDisplay}
				onClose={() => setShowLivePreviewModal(false)}
			/>

			<NoticeModal
				show={notice !== null}
				title={notice?.title || ""}
				message={notice?.message || ""}
				onClose={() => setNotice(null)}
			/>

			<DeleteConfirmModal
				show={postToDelete !== null}
				lang={lang}
				onClose={() => setPostToDelete(null)}
				onConfirm={handleConfirmDeleteDialog}
			/>

			<ClearDatabaseConfirmModal
				show={showClearDbConfirmModal}
				lang={lang}
				onClose={() => setShowClearDbConfirmModal(false)}
				onConfirm={handleExecuteClearDatabase}
			/>

			<CleanDiskModal
				show={showCleanDiskModal}
				lang={lang}
				cleanedCount={cleanedDiskCount}
				isCleaning={isCleaningDisk}
				folderHint={cleanFolderHint}
				onSelectFolder={handlePickCleanFolder}
				onClose={() => setShowCleanDiskModal(false)}
				onConfirmClean={handleExecuteCleanDisk}
			/>

			<WallViewerModal
				show={showWallModal}
				lang={lang}
				wallPosts={wallPosts}
				isSyncingWall={isSyncingWall}
				targets={targets}
				selectedTargetId={selectedTargetId}
				onSelectTarget={(id: number) => {
					setSelectedTargetId(id);
					localStorage.setItem("vk_selected_target", id.toString());
					handleScanWall(id, false);
				}}
				onClose={() => setShowWallModal(false)}
				onOpenFullImage={setFullViewImage}
				onScanWall={() =>
					selectedTargetId && handleScanWall(selectedTargetId, false)
				}
				onLoadMore={() =>
					selectedTargetId && handleScanWall(selectedTargetId, true)
				}
			/>

			<SettingsModal
				show={showSettingsModal}
				theme={theme}
				lang={lang}
				deleteMode={deleteMode}
				onSetDeleteMode={(mode: "permanent" | "trash") => {
					setDeleteMode(mode);
					localStorage.setItem("vk_delete_mode", mode);
				}}
				onClose={() => setShowSettingsModal(false)}
				onSetTheme={handleSetTheme}
				onSetLang={handleSetLang}
				onBackupDb={async () => {
					const path = await api.backupDatabase();
					setNotice({
						title: "Резервная копия",
						message: `${lang === "ru" ? "Бэкап сохранен:" : "Backup saved:"} ${path}`,
					});
				}}
				onCleanExpiredTokens={handleCleanExpiredTokens}
				onRequestClearDatabase={() => setShowClearDbConfirmModal(true)}
			/>

			<TokenModal
				show={showTokenModal}
				tokenInput={newTokenInput}
				isAdding={isAddingToken}
				lang={lang}
				onClose={() => setShowTokenModal(false)}
				onInputChange={setNewTokenInput}
				onOpenBrowser={api.openBrowserAuth}
				onPaste={async () => {
					const t = await navigator.clipboard
						.readText()
						.catch(() => "");
					setNewTokenInput(t);
				}}
				onSubmit={async () => {
					if (!newTokenInput.trim()) return;
					setIsAddingToken(true);
					try {
						const acc = await api.addToken(newTokenInput);
						setNewTokenInput("");
						setShowTokenModal(false);
						await loadAccounts();
						setActiveAccountId(acc.id);
						localStorage.setItem(
							"vk_active_acc",
							acc.id.toString(),
						);
						await loadTargetsForAccount(acc.id);
					} catch (e) {
						setNotice({ title: "Ошибка", message: String(e) });
					} finally {
						setIsAddingToken(false);
					}
				}}
				onCleanExpired={handleCleanExpiredTokens}
			/>

			<PatternModal
				show={showPatternModal}
				patterns={patterns}
				name={newPatternName}
				times={newPatternTimes}
				intervalDays={newPatternIntervalDays}
				lang={lang}
				onClose={() => setShowPatternModal(false)}
				onNameChange={setNewPatternName}
				onTimesChange={setNewPatternTimes}
				onIntervalChange={setNewPatternIntervalDays}
				onSubmit={async () => {
					if (!newPatternName.trim()) {
						setNotice({
							title: "Внимание",
							message:
								lang === "ru" ? "Укажите имя" : "Enter name",
						});
						return;
					}
					const times = newPatternTimes
						.split(",")
						.map((s) => s.trim())
						.filter((s) =>
							/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s),
						);
					if (times.length === 0) {
						setNotice({
							title: "Внимание",
							message:
								lang === "ru"
									? "Укажите время ЧЧ:ММ"
									: "Enter time HH:MM",
						});
						return;
					}
					const created = await api.createPattern(
						newPatternName,
						times,
						Intl.DateTimeFormat().resolvedOptions().timeZone,
						newPatternIntervalDays,
					);
					setPatterns((prev) => [...prev, created]);
					setSelectedPatternId(created.id);
					setShowPatternModal(false);
					setNewPatternName("");
				}}
				onDeletePattern={handleDeletePattern}
			/>

			<BatchModal
				show={showBatchModal}
				lang={lang}
				targets={targets}
				selectedTargetId={selectedTargetId}
				patterns={patterns}
				selectedPatternId={selectedPatternId}
				isCreating={isBatchCreating}
				batchPaths={batchPaths}
				isDraggingOver={isDraggingOver && showBatchModal}
				onSetBatchPaths={setBatchPaths}
				onClose={() => {
					setShowBatchModal(false);
					setBatchPaths([]);
				}}
				onSubmit={async (params) => {
					setIsBatchCreating(true);
					try {
						const count = await api.batchCreate({
							targetId: params.targetId,
							patternId: params.patternId,
							filePaths: params.filePaths,
							itemsPerPost: params.chunkSize,
							text: params.text.trim(),
							signed: authorsName,
							closeComments: !commentsOnPost,
							muteNotifications: !notifyFollowers,
							markAsAds: adFromCreator,
							attachmentsViewMode,
						});
						setShowBatchModal(false);
						setBatchPaths([]);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
						setNotice({
							title:
								lang === "ru"
									? "Пакетная генерация"
									: "Batch Generation",
							message: `${lang === "ru" ? "Создано постов в очередь:" : "Posts generated into queue:"} ${count}`,
						});
					} catch (e) {
						setNotice({ title: "Ошибка", message: String(e) });
					} finally {
						setIsBatchCreating(false);
					}
				}}
			/>

			<RevertModal
				post={revertModalPost}
				lang={lang}
				onClose={() => setRevertModalPost(null)}
				onRevertSameTime={async (id) => {
					await api.revertSameTime(id);
					setRevertModalPost(null);
					if (selectedTargetId) syncVkQueue(selectedTargetId);
					setActiveQueueTab("local");
				}}
				onRevertNextSlot={async (id) => {
					const patId = selectedPatternId || (patterns[0]?.id ?? 1);
					await api.revertNextSlot(id, patId);
					setRevertModalPost(null);
					if (selectedTargetId) syncVkQueue(selectedTargetId);
					setActiveQueueTab("local");
				}}
			/>

			<RescheduleModal
				post={rescheduleModalPost}
				date={rescheduleDate}
				hours={rescheduleHours}
				minutes={rescheduleMinutes}
				viewMonth={rescheduleViewMonth}
				lang={lang}
				onClose={() => setRescheduleModalPost(null)}
				onViewMonthChange={setRescheduleViewMonth}
				onDateSelect={setRescheduleDate}
				onHoursChange={setRescheduleHours}
				onMinutesChange={setRescheduleMinutes}
				onSubmit={async () => {
					if (!rescheduleModalPost) return;
					const targetDate = new Date(rescheduleDate);
					targetDate.setHours(
						rescheduleHours,
						rescheduleMinutes,
						0,
						0,
					);
					await api.rescheduleCustom(
						rescheduleModalPost.id,
						targetDate.toISOString(),
					);
					setRescheduleModalPost(null);
					if (selectedTargetId) syncVkQueue(selectedTargetId);
				}}
			/>

			<LightboxModal
				url={fullViewImage}
				onClose={() => setFullViewImage(null)}
			/>
		</div>
	);
}
