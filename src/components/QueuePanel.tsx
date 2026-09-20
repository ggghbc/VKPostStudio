import React, { useState, useMemo } from "react";
import {
	Clock,
	Cloud,
	History,
	Trash2,
	Edit3,
	Undo2,
	Calendar,
	RotateCcw,
	ChevronDown,
	ChevronUp,
	DownloadCloud,
	HardDrive,
	Send,
	ArrowUpDown,
	Hash,
	CheckCircle2,
	List,
	CalendarDays,
	FileText,
} from "lucide-react";
import { format } from "date-fns";
import { PostItem } from "../types";
import { translations, Lang } from "../services/i18n";
import { ContentCalendar } from "./ContentCalendar";

interface QueuePanelProps {
	isRightPanelOpen: boolean;
	activeQueueTab: "local" | "vk" | "history";
	queueViewMode: "list" | "calendar";
	localPosts: PostItem[];
	vkDelayedPosts: PostItem[];
	historyPosts: PostItem[];
	displayedPosts: PostItem[];
	expandedPostIds: number[];
	contentCalendarMonth: Date;
	isSyncingVk: boolean;
	isTransferring: boolean;
	transferProgress: string | null;
	lang: Lang;
	onSetTab: (tab: "local" | "vk" | "history") => void;
	onSetViewMode: (mode: "list" | "calendar") => void;
	onSetContentMonth: (d: Date) => void;
	onCleanLocalFiles: () => void;
	onSyncVk: () => void;
	onStartTransfer: () => void;
	onToggleExpand: (id: number) => void;
	onLoadToEditor: (post: PostItem) => void;
	onOpenRevertModal: (post: PostItem) => void;
	onRescheduleNextSlot: (id: number) => void;
	onOpenRescheduleModal: (post: PostItem) => void;
	onDeletePost: (post: PostItem) => void;
	onOpenFullImage: (url: string) => void;
	onLoadVkPhotos: (post: PostItem) => void;
	onSelectCalendarPost: (post: PostItem) => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
	isRightPanelOpen,
	activeQueueTab,
	queueViewMode,
	localPosts,
	vkDelayedPosts,
	historyPosts,
	displayedPosts,
	expandedPostIds,
	contentCalendarMonth,
	isSyncingVk,
	isTransferring,
	transferProgress,
	lang,
	onSetTab,
	onSetViewMode,
	onSetContentMonth,
	onCleanLocalFiles,
	onSyncVk,
	onStartTransfer,
	onToggleExpand,
	onLoadToEditor,
	onOpenRevertModal,
	onRescheduleNextSlot,
	onOpenRescheduleModal,
	onDeletePost,
	onOpenFullImage,
	onLoadVkPhotos,
	onSelectCalendarPost,
}) => {
	const t = translations[lang];

	// Сортировка: "date" | "id" | "status"
	const [sortKey, setSortKey] = useState<"date" | "id" | "status">("date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const handleToggleSort = (key: "date" | "id" | "status") => {
		if (sortKey === key) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortKey(key);
			setSortOrder("desc");
		}
	};

	const sortedPosts = useMemo(() => {
		const list = [...displayedPosts];
		list.sort((a, b) => {
			if (sortKey === "id") {
				return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
			}
			if (sortKey === "status") {
				const sA = a.status || "";
				const sB = b.status || "";
				return sortOrder === "asc"
					? sA.localeCompare(sB)
					: sB.localeCompare(sA);
			}
			// date
			const tA = new Date(a.scheduled_at_utc).getTime();
			const tB = new Date(b.scheduled_at_utc).getTime();
			return sortOrder === "asc" ? tA - tB : tB - tA;
		});
		return list;
	}, [displayedPosts, sortKey, sortOrder]);

	if (!isRightPanelOpen) return null;

	return (
		<aside
			className="w-1/2 flex flex-col p-4 sm:p-5 overflow-hidden transition-all duration-300 ease-in-out"
			style={{ backgroundColor: "var(--bg-surface-sub)" }}
		>
			{/* Верхний бар переключения вкладок, сортировки и действий */}
			<div
				className="flex items-center justify-between pb-3 mb-3 border-b flex-shrink-0"
				style={{ borderColor: "var(--border-light)" }}
			>
				{/* Переключатель очередей */}
				<div
					className="flex items-center gap-1.5 p-1 rounded-xl border"
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-light)",
					}}
				>
					<button
						type="button"
						onClick={() => onSetTab("local")}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "local"
									? "var(--btn-primary-bg)"
									: "transparent",
							color:
								activeQueueTab === "local"
									? "var(--btn-primary-text)"
									: "var(--text-muted)",
						}}
					>
						<Clock className="h-3.5 w-3.5" />
						<span>{localPosts.length}</span>
					</button>

					<button
						type="button"
						onClick={() => onSetTab("vk")}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "vk"
									? "var(--btn-primary-bg)"
									: "transparent",
							color:
								activeQueueTab === "vk"
									? "var(--btn-primary-text)"
									: "var(--text-muted)",
						}}
					>
						<Cloud className="h-3.5 w-3.5" />
						<span>{vkDelayedPosts.length}</span>
					</button>

					<button
						type="button"
						onClick={() => onSetTab("history")}
						className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "history"
									? "var(--btn-primary-bg)"
									: "transparent",
							color:
								activeQueueTab === "history"
									? "var(--btn-primary-text)"
									: "var(--text-muted)",
						}}
					>
						<History className="h-3.5 w-3.5" />
						<span>{historyPosts.length}</span>
					</button>
				</div>

				{/* Правый блок: сортировка, переключение вида (список/календарь), очистка диска, синк */}
				<div className="flex items-center gap-2">
					{/* Склеенные кнопки быстрой сортировки */}
					<div
						className="flex items-center border rounded-xl p-0.5"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-light)",
						}}
					>
						<button
							type="button"
							onClick={() => handleToggleSort("date")}
							className="p-1.5 rounded-lg transition-all cursor-pointer"
							style={{
								backgroundColor:
									sortKey === "date"
										? "var(--btn-primary-bg)"
										: "transparent",
								color:
									sortKey === "date"
										? "var(--btn-primary-text)"
										: "var(--text-muted)",
							}}
							title={`${t.sortBy} ${sortOrder === "asc" ? t.sortDateAsc : t.sortDateDesc}`}
						>
							<ArrowUpDown className="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onClick={() => handleToggleSort("id")}
							className="p-1.5 rounded-lg transition-all cursor-pointer"
							style={{
								backgroundColor:
									sortKey === "id"
										? "var(--btn-primary-bg)"
										: "transparent",
								color:
									sortKey === "id"
										? "var(--btn-primary-text)"
										: "var(--text-muted)",
							}}
							title={`${t.sortBy} ${sortOrder === "asc" ? t.sortIdAsc : t.sortIdDesc}`}
						>
							<Hash className="h-3.5 w-3.5" />
						</button>

						<button
							type="button"
							onClick={() => handleToggleSort("status")}
							className="p-1.5 rounded-lg transition-all cursor-pointer"
							style={{
								backgroundColor:
									sortKey === "status"
										? "var(--btn-primary-bg)"
										: "transparent",
								color:
									sortKey === "status"
										? "var(--btn-primary-text)"
										: "var(--text-muted)",
							}}
							title={t.sortStatus}
						>
							<CheckCircle2 className="h-3.5 w-3.5" />
						</button>
					</div>

					{/* Переключение Список / Календарь */}
					<div
						className="flex items-center border rounded-xl p-0.5"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-light)",
						}}
					>
						<button
							type="button"
							onClick={() => onSetViewMode("list")}
							className="p-1.5 rounded-lg transition-all cursor-pointer"
							style={{
								backgroundColor:
									queueViewMode === "list"
										? "var(--btn-primary-bg)"
										: "transparent",
								color:
									queueViewMode === "list"
										? "var(--btn-primary-text)"
										: "var(--text-muted)",
							}}
							title="Список"
						>
							<List className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onClick={() => onSetViewMode("calendar")}
							className="p-1.5 rounded-lg transition-all cursor-pointer"
							style={{
								backgroundColor:
									queueViewMode === "calendar"
										? "var(--btn-primary-bg)"
										: "transparent",
								color:
									queueViewMode === "calendar"
										? "var(--btn-primary-text)"
										: "var(--text-muted)",
							}}
							title="Календарь"
						>
							<CalendarDays className="h-3.5 w-3.5" />
						</button>
					</div>

					{activeQueueTab === "vk" && (
						<button
							type="button"
							onClick={onCleanLocalFiles}
							className="p-2 rounded-xl border hover:opacity-80 transition-colors cursor-pointer"
							style={{
								backgroundColor: "var(--bg-surface)",
								borderColor: "var(--border-light)",
								color: "var(--text-app)",
							}}
							title={t.cleanDiskFiles}
						>
							<HardDrive className="h-3.5 w-3.5" />
						</button>
					)}

					<button
						type="button"
						onClick={onSyncVk}
						disabled={isSyncingVk}
						className="p-2 rounded-xl border hover:opacity-80 transition-colors cursor-pointer disabled:opacity-50"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-light)",
							color: "var(--text-app)",
						}}
						title="Синхронизировать с ВК"
					>
						<RotateCcw
							className={`h-3.5 w-3.5 ${isSyncingVk ? "animate-spin" : ""}`}
						/>
					</button>
				</div>
			</div>

			{/* Отображение контента: Календарь или Список */}
			{queueViewMode === "calendar" ? (
				<ContentCalendar
					month={contentCalendarMonth}
					posts={displayedPosts}
					onMonthChange={onSetContentMonth}
					onSelectPost={onSelectCalendarPost}
				/>
			) : (
				<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
					{sortedPosts.length === 0 ? (
						<div className="text-center py-16 text-xs opacity-50 select-none">
							{activeQueueTab === "local"
								? t.emptyQueue
								: activeQueueTab === "vk"
									? t.emptyVk
									: t.emptyHistory}
						</div>
					) : (
						sortedPosts.map((post) => {
							const isExpanded = expandedPostIds.includes(
								post.id,
							);
							const isLocal =
								post.status === "queued" ||
								post.status === "failed";
							const isVk = post.status === "transferred_to_vk";
							const isPublished = post.status === "published";

							// Проверка наличия загруженного превью через preview_url или thumb_data
							const hasLoadedAllPhotos =
								post.attachments &&
								post.attachments.length > 0 &&
								post.attachments.every((a) =>
									Boolean(
										a.preview_url ||
										a.thumb_data ||
										a.local_path,
									),
								);

							return (
								<div
									key={post.id}
									className="rounded-2xl border transition-all overflow-hidden"
									style={{
										backgroundColor: "var(--bg-surface)",
										borderColor:
											post.status === "failed"
												? "rgba(244, 63, 94, 0.4)"
												: "var(--border-light)",
									}}
								>
									<div
										onClick={() => onToggleExpand(post.id)}
										className="p-3 flex items-center justify-between gap-2 text-xs cursor-pointer select-none"
									>
										<div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
											{/* BUG-18: Единый номер ID без ошибочного бейджа «Стена ВК» */}
											<span className="font-mono font-bold text-[11px] opacity-60 w-8 text-right flex-shrink-0">
												#{post.id}
											</span>

											{/* Время публикации */}
											<span
												className="font-mono font-semibold w-[120px] text-center flex-shrink-0"
												style={{
													color: "var(--accent)",
												}}
											>
												{format(
													new Date(
														post.scheduled_at_utc,
													),
													"dd/MM/yyyy HH:mm",
												)}
											</span>

											{/* Статус */}
											<span
												className="text-[10px] px-2 py-0.5 rounded-full border text-center flex-shrink-0 truncate"
												style={{
													backgroundColor: isLocal
														? "var(--bg-surface-sub)"
														: "var(--accent-glow)",
													borderColor: isLocal
														? "var(--border-light)"
														: "var(--accent)",
													color: isLocal
														? "var(--text-app)"
														: "var(--accent)",
												}}
											>
												{isLocal
													? post.status === "failed"
														? t.statusError
														: t.statusLocal
													: isVk
														? t.statusVk
														: isPublished
															? t.statusPublished
															: t.statusArchived}
											</span>

											{post.attachments_count > 0 && (
												<span className="text-[11px] opacity-70 flex-shrink-0 font-medium">
													• {post.attachments_count}{" "}
													{t.mediaFiles || "медиа"} (
													{post.attachments_view_mode ===
													"carousel"
														? t.carousel.toLowerCase()
														: t.grid.toLowerCase()}
													)
												</span>
											)}
										</div>

										<div className="flex items-center gap-1 flex-shrink-0">
											{!isPublished && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onDeletePost(post);
													}}
													className="p-1 hover:text-rose-400 opacity-60 hover:opacity-100 transition-colors cursor-pointer"
													title={t.confirmDelete}
												>
													<Trash2 className="h-3.5 w-3.5" />
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

									{!isExpanded && (
										<div
											className="px-3.5 pb-2.5 text-xs truncate opacity-80"
											style={{ color: "var(--text-app)" }}
										>
											{post.text ? (
												post.text
											) : (
												<em className="opacity-50">
													{lang === "ru"
														? "Без сопроводительного текста"
														: "No accompanying text"}
												</em>
											)}
										</div>
									)}

									{isExpanded && (
										<div
											className="px-4 pb-4 pt-2 border-t space-y-3"
											style={{
												borderColor:
													"var(--border-light)",
												backgroundColor:
													"var(--bg-surface-sub)",
											}}
										>
											{post.text && (
												<p
													className="text-xs leading-relaxed whitespace-pre-wrap break-words"
													style={{
														color: "var(--text-app)",
													}}
												>
													{post.text}
												</p>
											)}

											<div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
												<span
													className="font-semibold text-[11px] opacity-70"
													style={{
														color: "var(--text-dim)",
													}}
												>
													{t.actions}
												</span>

												{isLocal && (
													<>
														<button
															type="button"
															onClick={() =>
																onLoadToEditor(
																	post,
																)
															}
															className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface)",
																borderColor:
																	"var(--border-light)",
																color: "var(--text-app)",
															}}
														>
															<Edit3 className="h-3 w-3" />
															<span>
																{t.toEditor}
															</span>
														</button>

														<button
															type="button"
															onClick={() =>
																onRescheduleNextSlot(
																	post.id,
																)
															}
															className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface)",
																borderColor:
																	"var(--border-light)",
																color: "var(--accent)",
															}}
														>
															<Clock className="h-3 w-3" />
															<span>
																{t.nextSlot}
															</span>
														</button>

														<button
															type="button"
															onClick={() =>
																onOpenRescheduleModal(
																	post,
																)
															}
															className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface)",
																borderColor:
																	"var(--border-light)",
																color: "var(--text-app)",
															}}
														>
															<Calendar className="h-3 w-3" />
															<span>
																{t.setTime}
															</span>
														</button>
													</>
												)}

												{isVk && (
													<>
														{!hasLoadedAllPhotos &&
															Boolean(
																post.vk_post_id,
															) && (
																<button
																	type="button"
																	onClick={() =>
																		onLoadVkPhotos(
																			post,
																		)
																	}
																	className="p-1.5 rounded-lg border hover:opacity-80 transition-all cursor-pointer"
																	style={{
																		backgroundColor:
																			"var(--bg-surface)",
																		borderColor:
																			"var(--border-light)",
																		color: "var(--accent)",
																	}}
																	title={
																		t.loadVkPhotos
																	}
																>
																	<DownloadCloud className="h-3.5 w-3.5" />
																</button>
															)}

														<button
															type="button"
															onClick={() =>
																onOpenRevertModal(
																	post,
																)
															}
															className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold hover:opacity-80 transition-all cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface)",
																borderColor:
																	"var(--border-light)",
																color: "var(--text-app)",
															}}
														>
															<Undo2 className="h-3 w-3" />
															<span>
																{
																	t.revertToLocal
																}
															</span>
														</button>
													</>
												)}
											</div>

											{/* Сетка миниатюр вложений */}
											{post.attachments &&
												post.attachments.length > 0 && (
													<div>
														<span
															className="text-[11px] font-semibold block mb-1.5"
															style={{
																color: "var(--text-dim)",
															}}
														>
															{t.attachedFiles}:
														</span>
														<div className="grid grid-cols-4 gap-2">
															{post.attachments.map(
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
																			key={
																				att.id ||
																				i
																			}
																			onClick={() =>
																				fullSrc &&
																				onOpenFullImage(
																					fullSrc,
																				)
																			}
																			className="h-20 rounded-xl border overflow-hidden p-0.5 cursor-pointer hover:border-[var(--accent)] transition-all shadow-sm"
																			style={{
																				backgroundColor:
																					"var(--bg-surface)",
																				borderColor:
																					"var(--border-light)",
																			}}
																		>
																			{thumbSrc ? (
																				<img
																					src={
																						thumbSrc
																					}
																					alt={
																						att.file_name
																					}
																					className="h-full w-full object-cover rounded-lg"
																				/>
																			) : (
																				<div className="h-full w-full flex flex-col items-center justify-center p-1 text-center">
																					<FileText
																						className="h-5 w-5 mb-1"
																						style={{
																							color: "var(--accent)",
																						}}
																					/>
																					<span className="text-[9px] truncate max-w-full opacity-70">
																						{
																							att.file_name
																						}
																					</span>
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
									)}
								</div>
							);
						})
					)}
				</div>
			)}

			{/* Кнопка запуска отправки в VK (видна на вкладке локальной очереди) */}
			{activeQueueTab === "local" && localPosts.length > 0 && (
				<div
					className="pt-3 border-t mt-auto flex-shrink-0"
					style={{ borderColor: "var(--border-light)" }}
				>
					<button
						type="button"
						onClick={onStartTransfer}
						disabled={isTransferring}
						className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold shadow-lg transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
						style={{
							backgroundColor: "var(--btn-primary-bg)",
							color: "var(--btn-primary-text)",
						}}
					>
						<Send className="h-3.5 w-3.5" />
						<span>
							{isTransferring
								? transferProgress || t.sending
								: `${t.sendToVk} (${localPosts.length})`}
						</span>
					</button>
				</div>
			)}
		</aside>
	);
};
