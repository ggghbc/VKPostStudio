import React, { useState, useEffect } from "react";
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

export default function App() {
	const [theme, setTheme] = useState<Theme>(
		() => (localStorage.getItem("vk_theme") as Theme) || "classic",
	);
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
	const [newTokenInput, setNewTokenInput] = useState("");
	const [isAddingToken, setIsAddingToken] = useState(false);

	const [showPatternModal, setShowPatternModal] = useState(false);
	const [newPatternName, setNewPatternName] = useState("");
	const [newPatternTimes, setNewPatternTimes] = useState(
		"14:00, 18:00, 21:00",
	);
	const [newPatternIntervalDays, setNewPatternIntervalDays] =
		useState<number>(1);

	// Смена темы
	const handleSetTheme = (newTheme: Theme) => {
		setTheme(newTheme);
		localStorage.setItem("vk_theme", newTheme);
		document.documentElement.setAttribute("data-theme", newTheme);
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
			console.error(e);
		}
	};

	const loadTargetsForAccount = async (accId: number) => {
		try {
			const tgts = await api.getTargets(accId);
			setTargets(tgts);
			if (tgts.length > 0) {
				setSelectedTargetId((prev) =>
					prev && tgts.some((t) => t.id === prev) ? prev : tgts[0].id,
				);
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
		if (selectedTargetId) syncVkQueue(selectedTargetId);
	}, [selectedTargetId]);

	useEffect(() => {
		if (!selectedTargetId || !selectedPatternId) {
			setNextSlotDisplay("Выберите цель");
			return;
		}
		api.getNextSlot(selectedTargetId, selectedPatternId)
			.then((iso) => {
				const d = new Date(iso);
				setNextSlotDisplay(format(d, "dd/MM/yyyy HH:mm"));
				if (!isManualTime) {
					setSelectedDate(d);
					setPickerHours(d.getHours());
					setPickerMinutes(d.getMinutes());
				}
			})
			.catch(() => setNextSlotDisplay("Нет свободных слотов"));
	}, [selectedTargetId, selectedPatternId, queue]);

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
			const items = await Promise.all(
				paths.map(async (path) => ({
					path,
					name: path.split(/[\\/]/).pop() || "файл",
					isImage: true,
					previewUrl: await api
						.getFilePreview(path)
						.catch(() => undefined),
				})),
			);
			setAttachedFiles((prev) => [...prev, ...items].slice(0, 10));
		}
	};

	const handleSavePost = async () => {
		if (!postText.trim() && attachedFiles.length === 0)
			return alert("Добавьте текст или медиафайл");
		if (!selectedTargetId || !selectedPatternId)
			return alert("Выберите сообщество");

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
			patternId: selectedPatternId,
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
				"Проверить все токены через VK API и удалить те, у которых истек срок действия или сменился IP?",
			)
		)
			return;
		try {
			const deleted = await api.cleanExpiredTokens();
			alert(`Удалено недействительных токенов: ${deleted}`);
			loadAccounts();
		} catch (e) {
			alert("Ошибка: " + e);
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
		<div className="flex flex-col h-screen relative">
			<Header
				accounts={accounts}
				activeAccountId={activeAccountId}
				targets={targets}
				selectedTargetId={selectedTargetId}
				theme={theme}
				isRightPanelOpen={isRightPanelOpen}
				onSwitchAccount={async (id) => {
					await api.switchAccount(id);
					setActiveAccountId(id);
					loadTargetsForAccount(id);
				}}
				onDeleteAccount={async () => {
					if (!activeAccountId || !confirm("Удалить этот токен?"))
						return;
					await api.deleteAccount(activeAccountId);
					loadAccounts();
				}}
				onOpenTokenModal={() => setShowTokenModal(true)}
				onSelectTarget={setSelectedTargetId}
				onSetTheme={handleSetTheme}
				onToggleRightPanel={() =>
					setIsRightPanelOpen(!isRightPanelOpen)
				}
			/>

			<main className="flex flex-1 overflow-hidden relative">
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
					onSetTab={setActiveQueueTab}
					onSetViewMode={setQueueViewMode}
					onSetContentMonth={setContentCalendarMonth}
					onCleanLocalFiles={async () => {
						if (
							!selectedTargetId ||
							!confirm(
								"Удалить с диска оригиналы картинок, которые уже в ВК?",
							)
						)
							return;
						const count =
							await api.cleanLocalFiles(selectedTargetId);
						alert(`Очищено файлов: ${count}`);
						syncVkQueue(selectedTargetId);
					}}
					onSyncVk={() =>
						selectedTargetId && syncVkQueue(selectedTargetId)
					}
					onStartTransfer={async () => {
						if (!selectedTargetId) return;
						setIsTransferring(true);
						setTransferProgress("Отправка в VK...");
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
						if (!selectedPatternId) return;
						await api.rescheduleNextSlot(id, selectedPatternId);
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
						if (!confirm("Удалить отложенный пост со стены ВК?"))
							return;
						await api.deleteVkPost(id);
						if (selectedTargetId) syncVkQueue(selectedTargetId);
					}}
					onDeleteHistoryPost={async (id) => {
						if (!confirm("Удалить запись из истории?")) return;
						await api.deleteHistoryPost(id);
						if (selectedTargetId) loadHistory(selectedTargetId);
					}}
					onOpenFullImage={setFullViewImage}
				/>
			</main>

			<TokenModal
				show={showTokenModal}
				tokenInput={newTokenInput}
				isAdding={isAddingToken}
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
						await loadTargetsForAccount(acc.id);
					} catch (e) {
						alert("Ошибка добавления: " + e);
					} finally {
						setIsAddingToken(false);
					}
				}}
				onCleanExpired={handleCleanExpiredTokens}
			/>

			<PatternModal
				show={showPatternModal}
				name={newPatternName}
				times={newPatternTimes}
				intervalDays={newPatternIntervalDays}
				onClose={() => setShowPatternModal(false)}
				onNameChange={setNewPatternName}
				onTimesChange={setNewPatternTimes}
				onIntervalChange={setNewPatternIntervalDays}
				onSubmit={async () => {
					if (!newPatternName.trim()) return alert("Укажите имя");
					const times = newPatternTimes
						.split(",")
						.map((s) => s.trim())
						.filter((s) =>
							/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s),
						);
					if (times.length === 0) return alert("Укажите время ЧЧ:ММ");
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
			/>

			<BatchModal
				show={showBatchModal}
				totalFiles={attachedFiles.length}
				chunkSize={batchChunkSize}
				isCreating={isBatchCreating}
				onClose={() => setShowBatchModal(false)}
				onSetChunkSize={setBatchChunkSize}
				onSubmit={async () => {
					if (!selectedTargetId || !selectedPatternId) return;
					setIsBatchCreating(true);
					try {
						const count = await api.batchCreate({
							targetId: selectedTargetId,
							patternId: selectedPatternId,
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
						alert(`Создано постов: ${count}`);
					} finally {
						setIsBatchCreating(false);
					}
				}}
			/>

			<RevertModal
				post={revertModalPost}
				onClose={() => setRevertModalPost(null)}
				onRevertSameTime={async (id) => {
					await api.revertSameTime(id);
					setRevertModalPost(null);
					if (selectedTargetId) syncVkQueue(selectedTargetId);
					setActiveQueueTab("local");
				}}
				onRevertNextSlot={async (id) => {
					if (!selectedPatternId) return;
					await api.revertNextSlot(id, selectedPatternId);
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
