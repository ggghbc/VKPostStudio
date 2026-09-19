export type Theme =
	| "pastel"
	| "ocean"
	| "pink"
	| "earthy"
	| "steel"
	| "twilight";

export interface Account {
	id: number;
	name: string;
	user_id: number;
	is_active: boolean;
}

export interface Target {
	id: number;
	title: string;
	owner_id: number;
	target_type: string;
}

export interface Pattern {
	id: number;
	name: string;
	timezone: string;
	times_json: string;
	interval_days: number;
}

export interface AttachmentItem {
	id: number;
	file_name: string;
	size_bytes: number;
	local_path?: string;
	vk_attachment_string?: string;
	thumb_data?: string;
}

export interface PostItem {
	id: number;
	text: string;
	scheduled_at_utc: string;
	status: string;
	error_message?: string;
	attachments_count: number;
	attachments_view_mode: string;
	signed: boolean;
	close_comments: boolean;
	mute_notifications: boolean;
	mark_as_ads: boolean;
	target_id: number;
	vk_post_id?: number | null;
	target_title?: string;
	attachments: AttachmentItem[];
}

export interface SyncResult {
	posts: PostItem[];
	group_auth_restricted: boolean;
}

export interface FilePreview {
	id?: number;
	path: string;
	name: string;
	isImage: boolean;
	previewUrl?: string;
	vkAttachmentString?: string;
}
