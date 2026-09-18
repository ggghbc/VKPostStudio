import React, { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
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
} from "./components/Modals";
import { api } from "./services/api";
import {
	Account,
	Target,
	Pattern,
	PostItem,
	FilePreview,
	Theme,
} from "./types";
import { Lang, translations } from "./services/i18n";

export default function App() {
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("vk_theme") as Theme) || "classic",
	);
	const [lang, setLang] = useState<Lang>(
		() => (localStorage.getItem("vk_lang") as Lang) || "ru",
	);

	const [accounts, setAccounts] = useState<Account[]>([]);
	const [activeAccountId, setActiveAccountId] = useState<number | null>(
		() => {
			const saved = localStorage.getItem("vk_active_acc");
			return saved ? Number(saved) : null;
		},
	);

	const [targets, setTargets] = useState<Target[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
		() => {
			const saved = localStorage.getItem("vk_selected_target");
			return saved ? Number(saved) : null;
		},
	);

	const [patterns, setPatterns] = useState<Pattern[]>([]);
	const [selectedPatternId, setSelectedPatternId] = useState<number | null>(
		null,
	);

	const [queue, setQueue] = useState<PostItem[]>([]);
	const [historyPosts, setHistoryPosts] = useState<PostItem[]>([]);
	const [activeQueueTab, setActiveQueueTab] = useState<
		"local" | "vk" | "history"
	>("local");
	const [queueViewMode, setQueueViewMode] = useState<"list" | "calendar">(
		"list",
	);
	const [expandedPostIds, setExpandedPostIds] = useState<number[]>([]);
	const [nextSlotDisplay, setNextSlotDisplay] = useState<string>("14:00");
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
	const [batchChunkSize, setBatchChunkSize] = useState<number>(1);
	const [isBatchCreating, setIsBatchCreating] = useState(false);

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

	// Перетаскивание файлов: защита от дублей событий WebView2
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
				if (now - lastDropTimeRef.current < 250) {
					return;
				}
				lastDropTimeRef.current = now;

				const rawPaths: string[] = event.payload?.paths || [];
				if (rawPaths.length > 0) {
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

	// Добавление файлов с дедупликацией по пути
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
			if (ptrns.length > 0)
				setSelectedPatternId((prev) => prev ?? ptrns[0].id);
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
		try {
			const res = await api.syncVkQueue(tId);
			setQueue(res.posts);
			loadHistory(tId);
		} catch (e) {
			console.error(e);
			try {
				const q = await api.getQueue(tId);
				setQueue(q);
				loadHistory(tId);
			} catch {}
		} finally {
			setIsSyncingVk(false);
		}
	};

	useEffect(() => {
		if (selectedTargetId) {
			localStorage.setItem(
				"vk_selected_target",
				selectedTargetId.toString(),
			);
			syncVkQueue(selectedTargetId);
		}
	}, [selectedTargetId]);

	// Расчет следующего времени постинга
	useEffect(() => {
		if (!selectedTargetId) {
			setNextSlotDisplay(translations[lang].selectTarget);
			return;
		}
		const patId = selectedPatternId || (patterns[0]?.id ?? 1);
		api.getNextSlot(selectedTargetId, patId)
			.then((iso) => {
				const d = new Date(iso);
				setNextSlotDisplay(format(d, "dd/MM/yyyy HH:mm"));
				if (!isManualTime) {
					setSelectedDate(d);
					setPickerHours(d.getHours());
					setPickerMinutes(d.getMinutes());
				}
			})
			.catch(() => {
				const fallbackDate = new Date(Date.now() + 2 * 3600 * 1000);
				setNextSlotDisplay(format(fallbackDate, "dd/MM/yyyy HH:mm"));
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
			await appendFiles(paths);
		}
	};

	const handleSavePost = async () => {
		if (!postText.trim() && attachedFiles.length === 0)
			return alert(
				lang === "ru"
					? "Добавьте текст или медиафайл"
					: "Add text or media",
			);
		if (!selectedTargetId)
			return alert(
				lang === "ru" ? "Выберите сообщество" : "Select target",
			);

		const patId = selectedPatternId || (patterns[0]?.id ?? 1);

		if (editingPostId) {
			await api.updatePost({
				postId: editingPostId,
				text: postText.trim(),
				signed: authorsName,
				closeComments: !commentsOnPost,
				muteNotifications: !notifyFollowers,
				markAsAds: adFromCreator,
				attachmentsViewMode,
				filePaths: attachedFiles
					.map((f) => f.path)
					.filter((p) => p.length > 0),
			});
			setEditingPostId(null);
			setPostText("");
			setAttachedFiles([]);
			syncVkQueue(selectedTargetId);
			return;
		}

		const customIso = isManualTime
			? new Date(
					selectedDate.setHours(pickerHours, pickerMinutes, 0, 0),
				).toISOString()
			: null;
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
		syncVkQueue(selectedTargetId);
	};

	const handleCleanExpiredTokens = async () => {
		if (
			!confirm(
				lang === "ru"
					? "Проверить все токены и удалить просроченные?"
					: "Check all tokens and delete expired ones?",
			)
		)
			return;
		try {
			const deleted = await api.cleanExpiredTokens();
			alert(
				`${lang === "ru" ? "Удалено недействительных токенов:" : "Removed invalid tokens:"} ${deleted}`,
			);
			loadAccounts();
		} catch (e) {
			alert("Error: " + e);
		}
	};

	const handleDeletePattern = async (id: number) => {
		if (
			!confirm(
				lang === "ru"
					? "Удалить этот паттерн?"
					: "Delete this pattern?",
			)
		)
			return;
		try {
			await api.deletePattern(id);
			const ptrns = await api.getPatterns();
			setPatterns(ptrns);
			if (selectedPatternId === id) {
				setSelectedPatternId(ptrns[0]?.id ?? null);
			}
		} catch (e) {
			alert("Error: " + e);
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
					if (
						!activeAccountId ||
						!confirm(
							lang === "ru"
								? "Удалить этот токен?"
								: "Delete this token?",
						)
					)
						return;
					await api.deleteAccount(activeAccountId);
					loadAccounts();
				}}
				onOpenTokenModal={() => setShowTokenModal(true)}
				onSelectTarget={(id) => {
					setSelectedTargetId(id);
					localStorage.setItem("vk_selected_target", id.toString());
				}}
				onOpenSettings={() => setShowSettingsModal(true)}
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
					isDraggingOver={isDraggingOver}
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
					onCleanLocalFiles={async () => {
						if (
							!selectedTargetId ||
							!confirm(
								lang === "ru"
									? "Удалить с диска оригиналы картинок, которые уже в ВК?"
									: "Delete uploaded image files from disk?",
							)
						)
							return;
						const count =
							await api.cleanLocalFiles(selectedTargetId);
						alert(
							`${lang === "ru" ? "Очищено файлов:" : "Files cleaned:"} ${count}`,
						);
						syncVkQueue(selectedTargetId);
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
						await api.startTransfer(selectedTargetId).catch((e) => {
							alert(e);
							setIsTransferring(false);
						});
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
								path: a.local_path || "",
								name: a.file_name,
								isImage: true,
								previewUrl: a.thumb_data,
							})),
						);
						setIsRightPanelOpen(true);
					}}
					onOpenRevertModal={setRevertModalPost}
					onRescheduleNextSlot={async (id) => {
						const patId =
							selectedPatternId || (patterns[0]?.id ?? 1);
						await api.rescheduleNextSlot(id, patId);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
					}}
					onOpenRescheduleModal={(post) => {
						const d = new Date(post.scheduled_at_utc);
						setRescheduleModalPost(post);
						setRescheduleDate(d);
						setRescheduleHours(d.getHours());
						setRescheduleMinutes(d.getMinutes());
						setRescheduleViewMonth(d);
					}}
					onDeleteLocalPost={async (id) => {
						await api.deleteLocalPost(id);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
					}}
					onDeleteVkPost={async (id) => {
						if (
							!confirm(
								lang === "ru"
									? "Удалить отложенный пост со стены ВК?"
									: "Delete postponed post from VK wall?",
							)
						)
							return;
						await api.deleteVkPost(id);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
					}}
					onDeleteHistoryPost={async (id) => {
						if (
							!confirm(
								lang === "ru"
									? "Удалить запись из истории?"
									: "Delete record from history?",
							)
						)
							return;
						await api.deleteHistoryPost(id);
						if (selectedTargetId) loadHistory(selectedTargetId);
					}}
					onOpenFullImage={setFullViewImage}
				/>
			</main>

			<SettingsModal
				show={showSettingsModal}
				theme={theme}
				lang={lang}
				onClose={() => setShowSettingsModal(false)}
				onSetTheme={handleSetTheme}
				onSetLang={handleSetLang}
				onBackupDb={async () => {
					const path = await api.backupDatabase();
					alert(
						`${lang === "ru" ? "Бэкап сохранен:" : "Backup saved:"} ${path}`,
					);
				}}
				onCleanExpiredTokens={handleCleanExpiredTokens}
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
						alert("Error: " + e);
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
					if (!newPatternName.trim())
						return alert(
							lang === "ru" ? "Укажите имя" : "Enter name",
						);
					const times = newPatternTimes
						.split(",")
						.map((s) => s.trim())
						.filter((s) =>
							/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s),
						);
					if (times.length === 0)
						return alert(
							lang === "ru"
								? "Укажите время ЧЧ:ММ"
								: "Enter time HH:MM",
						);
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
				totalFiles={attachedFiles.length}
				chunkSize={batchChunkSize}
				isCreating={isBatchCreating}
				lang={lang}
				onClose={() => setShowBatchModal(false)}
				onSetChunkSize={setBatchChunkSize}
				onSubmit={async () => {
					if (!selectedTargetId) return;
					const patId = selectedPatternId || (patterns[0]?.id ?? 1);
					setIsBatchCreating(true);
					try {
						const count = await api.batchCreate({
							targetId: selectedTargetId,
							patternId: patId,
							filePaths: attachedFiles.map((f) => f.path),
							itemsPerPost: batchChunkSize,
							text: postText.trim(),
							signed: authorsName,
							closeComments: !commentsOnPost,
							muteNotifications: !notifyFollowers,
							markAsAds: adFromCreator,
							attachmentsViewMode,
						});
						setShowBatchModal(false);
						setPostText("");
						setAttachedFiles([]);
						syncVkQueue(selectedTargetId);
						alert(
							`${lang === "ru" ? "Создано постов:" : "Posts created:"} ${count}`,
						);
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
				viewMonth={viewMonth}
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
