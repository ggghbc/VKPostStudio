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
	return (
		<section
			className={`flex flex-col p-6 overflow-hidden transition-all duration-300 ease-in-out ${
				isRightPanelOpen
					? "w-1/2 opacity-100 translate-x-0"
					: "w-0 p-0 opacity-0 translate-x-12 pointer-events-none"
			}`}
			style={{ backgroundColor: "var(--bg-surface-sub)" }}
		>
			<div className="mb-4 flex items-center justify-between">
				<div
					className="flex items-center border rounded-xl p-1 gap-1"
					style={{
						backgroundColor: "var(--bg-surface)",
						borderColor: "var(--border-app)",
					}}
				>
					<button
						onClick={() => onSetTab("local")}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeQueueTab === "local"
								? "bg-blue-600 text-white shadow-md"
								: "opacity-70 hover:opacity-100"
						}`}
					>
						<Clock className="h-3.5 w-3.5" />
						<span>Локальная ({localPosts.length})</span>
					</button>

					<button
						onClick={() => onSetTab("vk")}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeQueueTab === "vk"
								? "bg-emerald-600 text-white shadow-md"
								: "opacity-70 hover:opacity-100"
						}`}
					>
						<Cloud className="h-3.5 w-3.5" />
						<span>Отложка ВК ({vkDelayedPosts.length})</span>
					</button>

					<button
						onClick={() => onSetTab("history")}
						className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
							activeQueueTab === "history"
								? "bg-purple-600 text-white shadow-md"
								: "opacity-70 hover:opacity-100"
						}`}
					>
						<History className="h-3.5 w-3.5" />
						<span>История ({historyPosts.length})</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					<div
						className="flex items-center border rounded-xl p-0.5"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
						}}
					>
						<button
							onClick={() => onSetViewMode("list")}
							className={`p-1.5 rounded-lg text-xs transition-colors ${queueViewMode === "list" ? "bg-blue-600 text-white" : "opacity-70"}`}
							title="Вид списком"
						>
							<ListFilter className="h-4 w-4" />
						</button>
						<button
							onClick={() => onSetViewMode("calendar")}
							className={`p-1.5 rounded-lg text-xs transition-colors ${queueViewMode === "calendar" ? "bg-blue-600 text-white" : "opacity-70"}`}
							title="Визуальный календарь контента"
						>
							<CalendarDays className="h-4 w-4" />
						</button>
					</div>

					{activeQueueTab === "vk" && vkDelayedPosts.length > 0 && (
						<button
							onClick={onCleanLocalFiles}
							className="p-2 rounded-xl border hover:text-emerald-400 transition-colors"
							style={{
								backgroundColor: "var(--bg-surface)",
								borderColor: "var(--border-app)",
								color: "var(--text-muted)",
							}}
							title="Очистить с диска ПК оригиналы уже загруженных в ВК файлов"
						>
							<HardDriveDownload className="h-4 w-4" />
						</button>
					)}

					<button
						onClick={onSyncVk}
						disabled={isSyncingVk}
						className="p-2 rounded-xl border hover:text-blue-400 transition-colors"
						style={{
							backgroundColor: "var(--bg-surface)",
							borderColor: "var(--border-app)",
							color: "var(--text-muted)",
						}}
						title="Синхронизировать с отложкой ВК (без диалоговых окон)"
					>
						<RefreshCw
							className={`h-4 w-4 ${isSyncingVk ? "animate-spin text-blue-400" : ""}`}
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
							className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-all shadow-lg"
						>
							{isTransferring ? (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									<span>
										{transferProgress || "Отправка..."}
									</span>
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									<span>Отправить в ВК</span>
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
									? "Локальная очередь пуста"
									: activeQueueTab === "vk"
										? "В отложке ВК нет постов"
										: "История постов пуста"}
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
												<span className="font-semibold text-blue-400 font-mono">
													{format(
														new Date(
															post.scheduled_at_utc,
														),
														"dd/MM/yyyy HH:mm",
													)}
												</span>

												{post.status === "queued" && (
													<span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
														Локально
													</span>
												)}
												{isVkPost && (
													<span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
														<CheckCircle2 className="h-3 w-3" />{" "}
														В отложке ВК
													</span>
												)}
												{post.status === "failed" && (
													<span className="flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
														<AlertCircle className="h-3 w-3" />{" "}
														Ошибка
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
														Архив
													</span>
												)}

												{post.attachments_count > 0 && (
													<span className="text-[11px] opacity-70">
														•{" "}
														{post.attachments_count}{" "}
														влож. (
														{post.attachments_view_mode ===
														"carousel"
															? "карусель"
															: "сетка"}
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
														Без сопроводительного
														текста
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
													title="Удалить запись из истории"
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
													title="Удалить пост из отложки ВК"
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
													title="Удалить из локальной очереди"
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
														Причина ошибки:
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
													Действия:
												</span>

												{!isVkPost && (
													<button
														onClick={(e) => {
															e.stopPropagation();
															onLoadToEditor(
																post,
															);
														}}
														className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
														title="Загрузить пост в редактор"
													>
														<Edit3 className="h-3.5 w-3.5" />
														<span>В редактор</span>
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
														className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
														title="Отозвать пост из ВК в локальную очередь"
													>
														<Undo2 className="h-3.5 w-3.5" />
														<span>
															Вернуть в локальную
															очередь
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
															title="Следующий свободный слот"
														>
															<RotateCcw className="h-3.5 w-3.5" />
															<span>
																Следующий слот
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
															title="Задать время вручную"
														>
															<Calendar className="h-3.5 w-3.5 text-blue-400" />
															<span>
																Задать время
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
														Прикрепленные вложения:
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
																	className={`h-20 rounded-lg border flex flex-col items-center justify-center overflow-hidden p-1 relative ${
																		att.thumb_data
																			? "cursor-pointer hover:border-blue-500"
																			: ""
																	}`}
																	style={{
																		backgroundColor:
																			"var(--bg-surface)",
																		borderColor:
																			"var(--border-app)",
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
																			<FileText className="h-5 w-5 text-blue-400 mb-1" />
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
			)}
		</section>
	);
};
