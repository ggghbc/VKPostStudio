import React, { useState } from "react";
import { format } from "date-fns";
import {
	Clock,
	Cloud,
	History,
	ListFilter,
	CalendarDays,
	HardDriveDownload,
	RefreshCw,
	Send,
	CheckCircle2,
	AlertCircle,
	Trash2,
	ChevronUp,
	ChevronDown,
	Edit3,
	Undo2,
	RotateCcw,
	Calendar,
	FileText,
	DownloadCloud,
	ArrowDownNarrowWide,
	ArrowUpWideNarrow,
	Hash,
	Check,
} from "lucide-react";
import { PostItem } from "../types";
import { ContentCalendar } from "./ContentCalendar";
import { translations, Lang } from "../services/i18n";

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

	// Сортировка для правой панели
	const [sortField, setSortField] = useState<"date" | "id" | "status">(
		"date",
	);
	const [sortAsc, setSortAsc] = useState<boolean>(true);

	const sortedPosts = [...displayedPosts].sort((a, b) => {
		if (sortField === "id") {
			return sortAsc ? a.id - b.id : b.id - a.id;
		}
		if (sortField === "status") {
			return sortAsc
				? a.status.localeCompare(b.status)
				: b.status.localeCompare(a.status);
		}
		const tA = new Date(a.scheduled_at_utc).getTime();
		const tB = new Date(b.scheduled_at_utc).getTime();
		return sortAsc ? tA - tB : tB - tA;
	});

	return (
		<section
			className={`flex flex-col p-6 overflow-hidden transition-all duration-300 ease-in-out ${
				isRightPanelOpen
					? "w-1/2 opacity-100 translate-x-0"
					: "w-0 p-0 opacity-0 translate-x-12 pointer-events-none"
			}`}
			style={{ backgroundColor: "var(--bg-surface-sub)" }}
		>
			<div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
				{/* Компактные вкладки */}
				<div
					className="inline-flex items-center rounded-xl p-1 border gap-1 shadow-inner flex-shrink-0"
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-app)",
					}}
				>
					<button
						onClick={() => onSetTab("local")}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "local"
									? "var(--tab-active-bg)"
									: "transparent",
							color:
								activeQueueTab === "local"
									? "var(--tab-active-text)"
									: "var(--text-muted)",
						}}
						title={t.localQueue}
					>
						<Clock className="h-3.5 w-3.5" />
						<span className="text-[10px] font-mono px-1 rounded-full border border-black/10 opacity-85 font-bold">
							{localPosts.length}
						</span>
					</button>

					<button
						onClick={() => onSetTab("vk")}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "vk"
									? "var(--tab-active-bg)"
									: "transparent",
							color:
								activeQueueTab === "vk"
									? "var(--tab-active-text)"
									: "var(--text-muted)",
						}}
						title={t.vkDelayed}
					>
						<Cloud className="h-3.5 w-3.5" />
						<span className="text-[10px] font-mono px-1 rounded-full border border-black/10 opacity-85 font-bold">
							{vkDelayedPosts.length}
						</span>
					</button>

					<button
						onClick={() => onSetTab("history")}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
						style={{
							backgroundColor:
								activeQueueTab === "history"
									? "var(--tab-active-bg)"
									: "transparent",
							color:
								activeQueueTab === "history"
									? "var(--tab-active-text)"
									: "var(--text-muted)",
						}}
						title={t.history}
					>
						<History className="h-3.5 w-3.5" />
						<span className="text-[10px] font-mono px-1 rounded-full border border-black/10 opacity-85 font-bold">
							{historyPosts.length}
						</span>
					</button>
				</div>

				{/* Правый блок управления с сегментированными кнопками сортировки */}
				<div className="flex items-center gap-1.5 ml-auto flex-wrap">
					{/* Склеенные кнопки сортировки без текста */}
					<div
						className="flex items-center border rounded-xl p-0.5 overflow-hidden shadow-sm"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<button
							onClick={() => {
								if (sortField === "date") setSortAsc(!sortAsc);
								else {
									setSortField("date");
									setSortAsc(true);
								}
							}}
							className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
							style={{
								backgroundColor:
									sortField === "date"
										? "var(--tab-active-bg)"
										: "transparent",
								color:
									sortField === "date"
										? "var(--tab-active-text)"
										: "var(--text-muted)",
							}}
							title={
								sortField === "date"
									? sortAsc
										? "По дате (раньше)"
										: "По дате (позже)"
									: "Сортировка по дате"
							}
						>
							{sortField === "date" && !sortAsc ? (
								<ArrowDownNarrowWide className="h-4 w-4" />
							) : (
								<ArrowUpWideNarrow className="h-4 w-4" />
							)}
						</button>

						<button
							onClick={() => {
								if (sortField === "id") setSortAsc(!sortAsc);
								else {
									setSortField("id");
									setSortAsc(false);
								}
							}}
							className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
							style={{
								backgroundColor:
									sortField === "id"
										? "var(--tab-active-bg)"
										: "transparent",
								color:
									sortField === "id"
										? "var(--tab-active-text)"
										: "var(--text-muted)",
							}}
							title={
								sortField === "id"
									? sortAsc
										? "По ID (старые)"
										: "По ID (новые)"
									: "Сортировка по ID"
							}
						>
							<Hash className="h-4 w-4" />
						</button>

						<button
							onClick={() => {
								setSortField("status");
								setSortAsc(!sortAsc);
							}}
							className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
							style={{
								backgroundColor:
									sortField === "status"
										? "var(--tab-active-bg)"
										: "transparent",
								color:
									sortField === "status"
										? "var(--tab-active-text)"
										: "var(--text-muted)",
							}}
							title="Сортировка по статусу"
						>
							<Check className="h-4 w-4" />
						</button>
					</div>

					{/* Переключение вида */}
					<div
						className="flex items-center border rounded-xl p-0.5 shadow-sm"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<button
							onClick={() => onSetViewMode("list")}
							className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
							style={{
								backgroundColor:
									queueViewMode === "list"
										? "var(--tab-active-bg)"
										: "transparent",
								color:
									queueViewMode === "list"
										? "var(--tab-active-text)"
										: "var(--text-muted)",
							}}
							title="Список"
						>
							<ListFilter className="h-4 w-4" />
						</button>
						<button
							onClick={() => onSetViewMode("calendar")}
							className="p-1.5 rounded-lg text-xs transition-colors cursor-pointer"
							style={{
								backgroundColor:
									queueViewMode === "calendar"
										? "var(--tab-active-bg)"
										: "transparent",
								color:
									queueViewMode === "calendar"
										? "var(--tab-active-text)"
										: "var(--text-muted)",
							}}
							title="Календарь"
						>
							<CalendarDays className="h-4 w-4" />
						</button>
					</div>

					<button
						onClick={onCleanLocalFiles}
						className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-app)",
						}}
						title={t.cleanDiskFiles}
					>
						<HardDriveDownload
							className="h-4 w-4"
							style={{ color: "var(--accent)" }}
						/>
					</button>

					<button
						onClick={onSyncVk}
						disabled={isSyncingVk}
						className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-app)",
						}}
						title={lang === "ru" ? "Синхронизация" : "Sync"}
					>
						<RefreshCw
							className={`h-4 w-4 ${isSyncingVk ? "animate-spin" : ""}`}
							style={{ color: "var(--accent)" }}
						/>
					</button>

					{activeQueueTab === "local" && (
						<button
							onClick={onStartTransfer}
							disabled={
								isTransferring ||
								localPosts.filter(
									(p) =>
										p.status === "queued" ||
										p.status === "failed",
								).length === 0
							}
							className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
							style={{
								backgroundColor: "var(--btn-primary-bg)",
								color: "var(--btn-primary-text)",
							}}
						>
							{isTransferring ? (
								<>
									<RefreshCw className="h-3.5 w-3.5 animate-spin" />
									<span>{transferProgress || t.sending}</span>
								</>
							) : (
								<>
									<Send className="h-3.5 w-3.5" />
									<span>{t.sendToVk}</span>
								</>
							)}
						</button>
					)}
				</div>
			</div>

			{queueViewMode === "calendar" ? (
				<ContentCalendar
					month={contentCalendarMonth}
					posts={sortedPosts}
					onMonthChange={onSetContentMonth}
					onSelectPost={onSelectCalendarPost}
				/>
			) : (
				<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
					{sortedPosts.length === 0 ? (
						<div
							className="flex flex-col items-center justify-center h-56 border border-dashed rounded-2xl text-xs opacity-60"
							style={{ borderColor: "var(--border-light)" }}
						>
							<Clock className="h-8 w-8 mb-2 opacity-50" />
							<span className="font-medium">
								{activeQueueTab === "local"
									? t.emptyQueue
									: activeQueueTab === "vk"
										? t.emptyVk
										: t.emptyHistory}
							</span>
						</div>
					) : (
						sortedPosts.map((post) => {
							const isExpanded = expandedPostIds.includes(
								post.id,
							);
							const isVkPost =
								post.status === "transferred_to_vk";
							const isPublished = post.status === "published";
							const isDeletedInVk =
								post.status === "deleted_in_vk";
							const isAppCreated = post.is_app_created !== false;

							return (
								<div
									key={post.id}
									className="flex flex-col rounded-xl border transition-colors overflow-hidden"
									style={{
										backgroundColor: "var(--bg-surface)",
										borderColor: "var(--border-app)",
									}}
								>
									<div
										onClick={() => onToggleExpand(post.id)}
										className="flex items-start justify-between gap-4 p-4 cursor-pointer select-none"
									>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
												{/* Выводим номер только если пост создан в приложении */}
												{isAppCreated ? (
													<span className="text-[11px] font-mono opacity-60 font-bold">
														#{post.id}
													</span>
												) : (
													<span
														className="text-[10px] px-1.5 py-0.2 rounded border font-semibold opacity-80"
														style={{
															backgroundColor:
																"var(--bg-surface-sub)",
															borderColor:
																"var(--border-light)",
															color: "var(--accent)",
														}}
														title="Пост обнаружен на стене ВКонтакте"
													>
														ВК
													</span>
												)}

												<span
													className="font-semibold font-mono"
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

												{post.status === "queued" && (
													<span
														className="rounded-md px-2 py-0.5 text-[10px] font-semibold border"
														style={{
															backgroundColor:
																"var(--bg-surface-sub)",
															borderColor:
																"var(--border-light)",
															color: "var(--text-muted)",
														}}
													>
														{t.statusLocal}
													</span>
												)}
												{isVkPost && (
													<span
														className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border"
														style={{
															backgroundColor:
																"var(--accent-glow)",
															borderColor:
																"var(--accent)",
															color: "var(--accent)",
														}}
													>
														<CheckCircle2 className="h-3 w-3" />{" "}
														{t.statusVk}
													</span>
												)}
												{post.status === "failed" && (
													<span className="flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
														<AlertCircle className="h-3 w-3" />{" "}
														{t.statusError}
													</span>
												)}
												{isPublished && (
													<span
														className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border"
														style={{
															backgroundColor:
																"var(--accent-glow)",
															borderColor:
																"var(--accent)",
															color: "var(--accent)",
														}}
													>
														<CheckCircle2 className="h-3 w-3" />{" "}
														{t.statusPublished}
													</span>
												)}
												{isDeletedInVk && (
													<span className="flex items-center gap-1 rounded-md bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold opacity-70 border border-slate-500/30">
														{t.statusDeletedInVk}
													</span>
												)}

												{post.attachments_count > 0 && (
													<span className="text-[11px] opacity-70">
														•{" "}
														{post.attachments_count}{" "}
														{t.mediaLimit} (
														{post.attachments_view_mode ===
														"carousel"
															? t.carousel.toLowerCase()
															: t.grid.toLowerCase()}
														)
													</span>
												)}
											</div>

											<p
												className={`text-xs leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}
												style={{
													color: "var(--text-app)",
												}}
											>
												{post.text || (
													<span className="italic opacity-50">
														{lang === "ru"
															? "Без сопроводительного текста"
															: "No accompanying text"}
													</span>
												)}
											</p>
										</div>

										<div className="flex items-center gap-1">
											<button
												onClick={(e) => {
													e.stopPropagation();
													onDeletePost(post);
												}}
												className="p-1.5 hover:text-rose-400 transition-colors cursor-pointer"
												style={{
													color: "var(--text-muted)",
												}}
												title="Delete"
											>
												<Trash2 className="h-4 w-4" />
											</button>

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
											className="px-4 pb-4 pt-1 border-t"
											style={{
												borderColor:
													"var(--border-app)",
												backgroundColor:
													"var(--bg-surface-sub)",
											}}
										>
											{/* Обертка с break-words и break-all для длинных ошибок */}
											{post.error_message && (
												<div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 leading-relaxed break-words break-all whitespace-pre-wrap overflow-hidden">
													<strong>
														{t.statusError}:
													</strong>{" "}
													{post.error_message}
												</div>
											)}

											<div
												className="flex items-center gap-2 mb-3 p-2.5 rounded-xl border flex-wrap"
												style={{
													backgroundColor:
														"var(--bg-surface)",
													borderColor:
														"var(--border-app)",
												}}
											>
												<span
													className="text-xs font-medium"
													style={{
														color: "var(--text-dim)",
													}}
												>
													{t.actions}
												</span>

												{/* Кнопка "В редактор" только для неопубликованных локальных постов */}
												{!isVkPost && !isPublished && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onLoadToEditor(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all cursor-pointer"
														style={{
															backgroundColor:
																"var(--bg-surface-sub)",
															borderColor:
																"var(--border-light)",
															color: "var(--text-app)",
														}}
													>
														<Edit3
															className="h-3.5 w-3.5"
															style={{
																color: "var(--accent)",
															}}
														/>
														<span>
															{t.toEditor}
														</span>
													</button>
												)}

												{/* Кнопка загрузки картинок из ВК (для отложенных и опубликованных) */}
												{post.vk_post_id && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onLoadVkPhotos(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all cursor-pointer"
														style={{
															backgroundColor:
																"var(--bg-surface-sub)",
															borderColor:
																"var(--border-light)",
															color: "var(--accent)",
														}}
													>
														<DownloadCloud className="h-3.5 w-3.5" />
														<span>
															{t.loadVkPhotos}
														</span>
													</button>
												)}

												{isVkPost && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onOpenRevertModal(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all cursor-pointer"
														style={{
															backgroundColor:
																"var(--bg-surface-sub)",
															borderColor:
																"var(--border-light)",
															color: "var(--text-app)",
														}}
													>
														<Undo2
															className="h-3.5 w-3.5"
															style={{
																color: "var(--accent)",
															}}
														/>
														<span>
															{t.revertToLocal}
														</span>
													</button>
												)}

												{activeQueueTab === "local" && (
													<>
														<button
															onClick={(e) => {
																e.stopPropagation();
																onRescheduleNextSlot(
																	post.id,
																);
															}}
															className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface-sub)",
																borderColor:
																	"var(--border-light)",
																color: "var(--text-app)",
															}}
														>
															<RotateCcw
																className="h-3.5 w-3.5"
																style={{
																	color: "var(--accent)",
																}}
															/>
															<span>
																{t.nextSlot}
															</span>
														</button>
														<button
															onClick={(e) => {
																e.stopPropagation();
																onOpenRescheduleModal(
																	post,
																);
															}}
															className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer"
															style={{
																backgroundColor:
																	"var(--bg-surface-sub)",
																borderColor:
																	"var(--border-light)",
																color: "var(--text-app)",
															}}
														>
															<Calendar
																className="h-3.5 w-3.5"
																style={{
																	color: "var(--accent)",
																}}
															/>
															<span>
																{t.setTime}
															</span>
														</button>
													</>
												)}
											</div>

											{post.attachments &&
											post.attachments.length > 0 ? (
												<div>
													<span
														className="text-[11px] font-semibold block mb-2"
														style={{
															color: "var(--text-dim)",
														}}
													>
														{t.attachedFiles}:
													</span>
													<div className="grid grid-cols-4 gap-2">
														{post.attachments.map(
															(att, attIdx) => (
																<div
																	key={attIdx}
																	onClick={() =>
																		att.thumb_data &&
																		onOpenFullImage(
																			att.thumb_data,
																		)
																	}
																	className="h-20 rounded-lg border flex flex-col items-center justify-center overflow-hidden p-1 relative hover:border-[var(--accent)] transition-colors cursor-pointer"
																	style={{
																		backgroundColor:
																			"var(--bg-surface)",
																		borderColor:
																			"var(--border-light)",
																	}}
																>
																	{att.thumb_data ? (
																		<img
																			src={
																				att.thumb_data
																			}
																			alt={
																				att.file_name
																			}
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
																				{
																					att.file_name
																				}
																			</span>
																		</div>
																	)}
																</div>
															),
														)}
													</div>
												</div>
											) : (
												<span className="text-[11px] italic opacity-50">
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
			)}
		</section>
	);
};
