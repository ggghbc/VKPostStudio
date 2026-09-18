import React from "react";
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
	onDeleteLocalPost: (id: number) => void;
	onDeleteVkPost: (id: number) => void;
	onDeleteHistoryPost: (id: number) => void;
	onOpenFullImage: (url: string) => void;
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
	onDeleteLocalPost,
	onDeleteVkPost,
	onDeleteHistoryPost,
	onOpenFullImage,
}) => {
	const t = translations[lang];

	return (
		<section
			className={`flex flex-col p-6 overflow-hidden transition-all duration-300 ease-in-out ${
				isRightPanelOpen
					? "w-1/2 opacity-100 translate-x-0"
					: "w-0 p-0 opacity-0 translate-x-12 pointer-events-none"
			}`}
			style={{ backgroundColor: "var(--bg-surface-sub)" }}
		>
			<div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
				<div
					className="inline-flex items-center rounded-xl p-1 border gap-1 shadow-inner"
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-app)",
					}}
				>
					<button
						onClick={() => onSetTab("local")}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
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
					>
						<Clock className="h-3.5 w-3.5" />
						<span>{t.localQueue}</span>
						<span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-black/10 opacity-80">
							{localPosts.length}
						</span>
					</button>

					<button
						onClick={() => onSetTab("vk")}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
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
					>
						<Cloud className="h-3.5 w-3.5" />
						<span>{t.vkDelayed}</span>
						<span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-black/10 opacity-80">
							{vkDelayedPosts.length}
						</span>
					</button>

					<button
						onClick={() => onSetTab("history")}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
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
					>
						<History className="h-3.5 w-3.5" />
						<span>{t.history}</span>
						<span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-black/10 opacity-80">
							{historyPosts.length}
						</span>
					</button>
				</div>

				<div className="flex items-center gap-2 ml-auto">
					<div
						className="flex items-center border rounded-xl p-0.5"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<button
							onClick={() => onSetViewMode("list")}
							className="p-1.5 rounded-lg text-xs transition-colors"
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
							title="List"
						>
							<ListFilter className="h-4 w-4" />
						</button>
						<button
							onClick={() => onSetViewMode("calendar")}
							className="p-1.5 rounded-lg text-xs transition-colors"
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
							title="Calendar"
						>
							<CalendarDays className="h-4 w-4" />
						</button>
					</div>

					<button
						onClick={onCleanLocalFiles}
						className="p-2 rounded-xl border hover:opacity-80 transition-all"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-app)",
						}}
						title={t.cleanDiskFiles}
					>
						<HardDriveDownload className="h-4 w-4" />
					</button>

					<button
						onClick={onSyncVk}
						disabled={isSyncingVk}
						className="p-2 rounded-xl border hover:opacity-80 transition-all"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-app)",
						}}
						title="Sync"
					>
						<RefreshCw
							className={`h-4 w-4 ${isSyncingVk ? "animate-spin" : ""}`}
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
							className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-40"
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
					posts={displayedPosts}
					onMonthChange={onSetContentMonth}
					onSelectPost={onToggleExpand}
				/>
			) : (
				<div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
					{displayedPosts.length === 0 ? (
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
						displayedPosts.map((post, index) => {
							const isExpanded = expandedPostIds.includes(
								post.id,
							);
							const isVkPost =
								post.status === "transferred_to_vk";
							const isHistoryTab = activeQueueTab === "history";

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
											<div className="flex items-center gap-2.5 text-xs mb-2">
												<span className="text-[11px] font-mono opacity-50">
													#{index + 1}
												</span>
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
												{post.status === "archived" && (
													<span
														className="rounded-md px-2 py-0.5 text-[10px] font-semibold opacity-70 border"
														style={{
															borderColor:
																"var(--border-light)",
														}}
													>
														{t.statusArchived}
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
											{isHistoryTab ? (
												<button
													onClick={(e) => {
														e.stopPropagation();
														onDeleteHistoryPost(
															post.id,
														);
													}}
													className="p-1.5 hover:text-rose-400 transition-colors"
													style={{
														color: "var(--text-muted)",
													}}
													title="Delete"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											) : isVkPost ? (
												<button
													onClick={(e) => {
														e.stopPropagation();
														onDeleteVkPost(post.id);
													}}
													className="p-1.5 hover:text-rose-400 transition-colors"
													style={{
														color: "var(--text-muted)",
													}}
													title="Delete from VK"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											) : (
												<button
													onClick={(e) => {
														e.stopPropagation();
														onDeleteLocalPost(
															post.id,
														);
													}}
													className="p-1.5 hover:text-rose-400 transition-colors"
													style={{
														color: "var(--text-muted)",
													}}
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
											{post.error_message && (
												<div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 leading-relaxed">
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

												{!isVkPost && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onLoadToEditor(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all"
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

												{isVkPost && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onOpenRevertModal(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-all"
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
															className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
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
															className="px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:opacity-80 transition-opacity"
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
																	className="h-20 rounded-lg border flex flex-col items-center justify-center overflow-hidden p-1 relative hover:border-[var(--accent)] transition-colors"
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
