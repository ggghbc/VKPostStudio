import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
	Send,
	Plus,
	Trash2,
	Key,
	Image as ImageIcon,
	Layers,
	Clock,
	RefreshCw,
	CheckCircle2,
	AlertCircle,
	User,
} from "lucide-react";
import { format } from "date-fns";

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

interface PostItem {
	id: number;
	text: string;
	scheduled_at_utc: string;
	status: string;
	author_name?: string;
	attachments_count: number;
}

export default function App() {
	const [token, setToken] = useState("");
	const [userName, setUserName] = useState<string | null>(null);
	const [targets, setTargets] = useState<Target[]>([]);
	const [selectedTargetId, setSelectedTargetId] = useState<number | null>(
		null,
	);
	const [patterns, setPatterns] = useState<Pattern[]>([]);
	const [selectedPatternId, setSelectedPatternId] = useState<number | null>(
		null,
	);
	const [queue, setQueue] = useState<PostItem[]>([]);
	const [nextSlotDisplay, setNextSlotDisplay] = useState<string>("Расчет...");

	const [postText, setPostText] = useState("");
	const [authorName, setAuthorName] = useState("");
	const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
	const [isTransferring, setIsTransferring] = useState(false);
	const [transferProgress, setTransferProgress] = useState<string | null>(
		null,
	);

	const loadInitialData = async () => {
		try {
			const tgts = await invoke<Target[]>("get_targets");
			setTargets(tgts);
			if (tgts.length > 0 && !selectedTargetId) {
				setSelectedTargetId(tgts[0].id);
			}

			const ptrns = await invoke<Pattern[]>("get_patterns");
			setPatterns(ptrns);
			if (ptrns.length > 0 && !selectedPatternId) {
				setSelectedPatternId(ptrns[0].id);
			}
		} catch (e) {
			console.error("Ошибка загрузки данных:", e);
		}
	};

	const loadQueue = async () => {
		if (!selectedTargetId) return;
		try {
			const q = await invoke<PostItem[]>("get_queue", {
				targetId: selectedTargetId,
			});
			setQueue(q);
		} catch (e) {
			console.error("Ошибка загрузки очереди:", e);
		}
	};

	const updateNextSlotPreview = async () => {
		if (!selectedTargetId || !selectedPatternId) return;
		try {
			const isoSlot = await invoke<string>("get_next_slot_preview", {
				targetId: selectedTargetId,
				patternId: selectedPatternId,
			});
			const date = new Date(isoSlot);
			setNextSlotDisplay(format(date, "dd.MM HH:mm"));
		} catch {
			setNextSlotDisplay("Слот не найден");
		}
	};

	useEffect(() => {
		loadInitialData();
	}, []);

	useEffect(() => {
		if (selectedTargetId) {
			loadQueue();
		}
	}, [selectedTargetId]);

	useEffect(() => {
		updateNextSlotPreview();
	}, [selectedTargetId, selectedPatternId, queue]);

	useEffect(() => {
		const unlistenProgress = listen("transfer-progress", (event: any) => {
			const { current, total } = event.payload;
			setTransferProgress(`Перенос ${current} из ${total}...`);
		});

		const unlistenFinish = listen("transfer-finished", () => {
			setIsTransferring(false);
			setTransferProgress(null);
			loadQueue();
		});

		return () => {
			unlistenProgress.then((f) => f());
			unlistenFinish.then((f) => f());
		};
	}, [selectedTargetId]);

	const handleSaveToken = async () => {
		if (!token.trim()) return;
		try {
			const name = await invoke<string>("set_access_token", {
				token: token.trim(),
			});
			setUserName(name);
			setToken("");
			await loadInitialData();
		} catch (e) {
			alert("Ошибка привязки токена: " + e);
		}
	};

	const handleSelectFiles = async () => {
		const res = await open({
			multiple: true,
			filters: [
				{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] },
			],
		});
		if (res) {
			const paths = Array.isArray(res) ? res : [res];
			setAttachedFiles((prev) => [...prev, ...paths]);
		}
	};

	const handleCreatePost = async () => {
		if (!postText.trim() && attachedFiles.length === 0) {
			alert("Добавьте текст или прикрепите файлы");
			return;
		}
		if (!selectedTargetId || !selectedPatternId) {
			alert("Выберите направление и паттерн");
			return;
		}

		try {
			await invoke("add_post_to_queue", {
				targetId: selectedTargetId,
				patternId: selectedPatternId,
				text: postText.trim(),
				authorName: authorName.trim() || null,
				filePaths: attachedFiles,
			});

			setPostText("");
			setAttachedFiles([]);
			loadQueue();
		} catch (e) {
			alert("Ошибка добавления в очередь: " + e);
		}
	};

	const handleDeletePost = async (id: number) => {
		await invoke("delete_post", { postId: id });
		loadQueue();
	};

	const handleStartTransfer = async () => {
		if (!selectedTargetId) return;
		setIsTransferring(true);
		setTransferProgress("Запуск отправки в VK...");
		try {
			await invoke("start_transfer_pipeline", {
				targetId: selectedTargetId,
			});
		} catch (e) {
			alert("Не удалось запустить отправку: " + e);
			setIsTransferring(false);
			setTransferProgress(null);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-slate-950 text-slate-100">
			<header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-3">
				<div className="flex items-center gap-6">
					<div className="flex items-center gap-2">
						<Layers className="h-5 w-5 text-blue-500" />
						<span className="font-bold tracking-wide">
							VK Post Studio
						</span>
					</div>

					{targets.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-xs text-slate-400">
								Направление:
							</span>
							<select
								className="rounded bg-slate-800 px-3 py-1.5 text-sm border border-slate-700 focus:outline-none focus:border-blue-500"
								value={selectedTargetId || ""}
								onChange={(e) =>
									setSelectedTargetId(Number(e.target.value))
								}
							>
								{targets.map((t) => (
									<option key={t.id} value={t.id}>
										{t.title}{" "}
										{t.target_type === "community"
											? "(Сообщество)"
											: "(Профиль)"}
									</option>
								))}
							</select>
						</div>
					)}
				</div>

				<div className="flex items-center gap-3">
					{userName ? (
						<div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-emerald-400 border border-slate-700">
							<User className="h-3.5 w-3.5" />
							<span>{userName}</span>
						</div>
					) : (
						<div className="flex items-center gap-2">
							<input
								type="password"
								placeholder="Вставьте VK Access Token"
								className="w-56 rounded bg-slate-800 px-2.5 py-1 text-xs border border-slate-700 focus:outline-none focus:border-blue-500"
								value={token}
								onChange={(e) => setToken(e.target.value)}
							/>
							<button
								onClick={handleSaveToken}
								className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-500"
							>
								<Key className="h-3.5 w-3.5" />
								<span>Войти</span>
							</button>
						</div>
					)}
				</div>
			</header>

			<main className="flex flex-1 overflow-hidden">
				<section className="flex flex-col w-1/2 border-r border-slate-800 p-6 overflow-y-auto">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-base font-semibold">Новый пост</h2>
						{patterns.length > 0 && (
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-slate-400" />
								<select
									className="rounded bg-slate-900 px-2 py-1 text-xs border border-slate-800"
									value={selectedPatternId || ""}
									onChange={(e) =>
										setSelectedPatternId(
											Number(e.target.value),
										)
									}
								>
									{patterns.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					<textarea
						className="w-full flex-1 min-h-[160px] rounded-lg bg-slate-900 p-3.5 text-sm text-slate-100 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						placeholder="Текст будущей записи..."
						value={postText}
						onChange={(e) => setPostText(e.target.value)}
					/>

					<div className="mt-4 flex gap-3">
						<input
							type="text"
							placeholder="Авторская подпись (напр. Иван)"
							className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm border border-slate-800 focus:outline-none focus:border-blue-500"
							value={authorName}
							onChange={(e) => setAuthorName(e.target.value)}
						/>

						<button
							onClick={handleSelectFiles}
							className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
						>
							<ImageIcon className="h-4 w-4 text-blue-400" />
							<span>Фото ({attachedFiles.length})</span>
						</button>
					</div>

					{attachedFiles.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{attachedFiles.map((f, i) => (
								<div
									key={i}
									className="flex items-center gap-2 rounded bg-slate-900 px-2 py-1 text-xs border border-slate-800 text-slate-300"
								>
									<span className="max-w-[140px] truncate">
										{f.split(/[\\/]/).pop()}
									</span>
									<button
										onClick={() =>
											setAttachedFiles((prev) =>
												prev.filter(
													(_, idx) => idx !== i,
												),
											)
										}
										className="text-rose-400 hover:text-rose-300"
									>
										×
									</button>
								</div>
							))}
						</div>
					)}

					<div className="mt-6 pt-4 border-t border-slate-800">
						<button
							onClick={handleCreatePost}
							className="flex items-center justify-center gap-2 w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.99] transition-all"
						>
							<Plus className="h-4 w-4" />
							<span>Добавить в очередь — {nextSlotDisplay}</span>
						</button>
					</div>
				</section>

				<section className="flex flex-col w-1/2 p-6 overflow-hidden">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h2 className="text-base font-semibold">
								Локальная очередь
							</h2>
							<p className="text-xs text-slate-400">
								Постов готово к выгрузке: {queue.length}
							</p>
						</div>

						<button
							onClick={handleStartTransfer}
							disabled={isTransferring || queue.length === 0}
							className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-600/20"
						>
							{isTransferring ? (
								<>
									<RefreshCw className="h-4 w-4 animate-spin" />
									<span>
										{transferProgress || "Перенос..."}
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

					<div className="flex-1 overflow-y-auto space-y-2 pr-1">
						{queue.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-48 border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
								<span>Очередь пуста</span>
								<span className="mt-1 text-slate-600">
									Создайте пост слева, и он займет ближайший
									слот
								</span>
							</div>
						) : (
							queue.map((post) => (
								<div
									key={post.id}
									className="flex items-start justify-between gap-4 rounded-lg bg-slate-900/80 p-3.5 border border-slate-800 text-sm"
								>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 text-xs mb-1.5">
											<span className="font-semibold text-blue-400">
												{format(
													new Date(
														post.scheduled_at_utc,
													),
													"dd.MM.yyyy HH:mm",
												)}
											</span>

											{post.status === "queued" && (
												<span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
													Локально
												</span>
											)}
											{post.status ===
												"transferred_to_vk" && (
												<span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
													<CheckCircle2 className="h-3 w-3" />{" "}
													В отложке ВК
												</span>
											)}
											{post.status === "failed" && (
												<span className="flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
													<AlertCircle className="h-3 w-3" />{" "}
													Ошибка
												</span>
											)}

											{post.attachments_count > 0 && (
												<span className="text-slate-500 text-[11px]">
													• {post.attachments_count}{" "}
													фото
												</span>
											)}
										</div>

										<p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
											{post.text || (
												<span className="italic text-slate-500">
													Без текста
												</span>
											)}
										</p>

										{post.author_name && (
											<span className="inline-block mt-1 text-[11px] text-slate-500">
												— {post.author_name}
											</span>
										)}
									</div>

									<button
										onClick={() =>
											handleDeletePost(post.id)
										}
										className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
									>
										<Trash2 className="h-4 w-4" />
									</button>
								</div>
							))
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
