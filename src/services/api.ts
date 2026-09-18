import { invoke } from "@tauri-apps/api/core";
import { Account, Target, Pattern, PostItem, SyncResult } from "../types";

export const api = {
	// Системные и профиль
	initTimezone: (timezone: string) =>
		invoke("init_client_timezone", { timezone }),
	backupDatabase: () => invoke<string>("backup_database"),
	getFilePreview: (path: string) =>
		invoke<string>("get_file_preview_base64", { path }),
	openBrowserAuth: () => invoke("open_vk_auth_browser"),

	// Токены и цели
	getAccounts: () => invoke<Account[]>("get_accounts"),
	switchAccount: (accountId: number) =>
		invoke("switch_account", { accountId }),
	deleteAccount: (accountId: number) =>
		invoke("delete_account", { accountId }),
	addToken: (rawToken: string) => invoke<Account>("add_token", { rawToken }),
	cleanExpiredTokens: () => invoke<number>("clean_expired_tokens"),
	getTargets: (accountId?: number | null) =>
		invoke<Target[]>("get_targets", { accountId }),

	// Паттерны
	getPatterns: () => invoke<Pattern[]>("get_patterns"),
	createPattern: (
		name: string,
		times: string[],
		timezone: string,
		intervalDays: number,
	) =>
		invoke<Pattern>("create_pattern", {
			name,
			times,
			timezone,
			intervalDays,
		}),
	getNextSlot: (targetId: number, patternId: number) =>
		invoke<string>("get_next_slot_preview", { targetId, patternId }),

	// Очереди и посты
	getQueue: (targetId: number) =>
		invoke<PostItem[]>("get_queue", { targetId }),
	getHistory: (targetId: number) =>
		invoke<PostItem[]>("get_post_history", { targetId }),
	syncVkQueue: (targetId: number) =>
		invoke<SyncResult>("sync_vk_delayed_posts", { targetId }),
	addPost: (params: any) => invoke<number>("add_post_to_queue", params),
	updatePost: (params: any) => invoke("update_post", params),
	batchCreate: (params: any) => invoke<number>("batch_create_posts", params),
	cleanLocalFiles: (targetId: number) =>
		invoke<number>("clean_uploaded_local_files", { targetId }),

	// Управление статусами
	rescheduleNextSlot: (postId: number, patternId: number) =>
		invoke<string>("reschedule_post_next_slot", { postId, patternId }),
	rescheduleCustom: (postId: number, customTimeUtc: string) =>
		invoke("reschedule_post_custom", { postId, customTimeUtc }),
	revertSameTime: (postId: number) =>
		invoke("revert_vk_post_to_local_same_time", { postId }),
	revertNextSlot: (postId: number, patternId: number) =>
		invoke<string>("revert_vk_post_to_local_next_slot", {
			postId,
			patternId,
		}),
	deleteLocalPost: (postId: number) =>
		invoke("delete_local_post", { postId }),
	deleteVkPost: (postId: number) => invoke("delete_vk_post", { postId }),
	deleteHistoryPost: (postId: number) =>
		invoke("delete_history_post", { postId }),
	startTransfer: (targetId: number) =>
		invoke("start_transfer_pipeline", { targetId }),
};
