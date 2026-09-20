export type Lang = "ru" | "en";

export interface TranslationSchema {
	appTitle: string;
	token: string;
	addToken: string;
	noTokens: string;
	target: string;
	settings: string;
	createPost: string;
	editPost: string;
	editMode: string;
	postTextPlaceholder: string;
	symbols: string;
	dropzoneTitle: string;
	dropzoneSub: string;
	attachedFiles: string;
	mediaLimit: string;
	batchModeBtn: string;
	addMore: string;
	position: string;
	pubSettings: string;
	mediaStyle: string;
	mediaStyleSub: string;
	grid: string;
	carousel: string;
	comments: string;
	notifications: string;
	notificationsSub: string;
	authorSign: string;
	authorSignSub: string;
	adsMark: string;
	adsMarkSub: string;
	manualTimeToggle: string;
	pubTime: string;
	apply: string;
	cancel: string;
	addToQueue: string;
	saveChanges: string;
	noFreeSlots: string;
	selectTarget: string;
	localQueue: string;
	vkDelayed: string;
	history: string;
	allPostsTab: string;
	emptyQueue: string;
	emptyVk: string;
	emptyHistory: string;
	emptyAllPosts: string;
	actions: string;
	toEditor: string;
	revertToLocal: string;
	nextSlot: string;
	setTime: string;
	statusLocal: string;
	statusVk: string;
	statusError: string;
	statusArchived: string;
	statusPublished: string;
	statusDeletedInVk: string;
	noAttachments: string;
	sendToVk: string;
	sending: string;
	cleanDiskFiles: string;
	revertSameTime: string;
	revertNextSlot: string;
	saveTime: string;
	selectPubTime: string;
	savePattern: string;
	patternName: string;
	timesCsv: string;
	intervalDays: string;
	intervalDaysHint: string;
	createPatternTitle: string;
	settingsTitle: string;
	themeTitle: string;
	themePastel: string;
	themeOcean: string;
	themePink: string;
	themeEarthy: string;
	themeSteel: string;
	themeTwilight: string;
	langTitle: string;
	backupDb: string;
	cleanExpiredTokens: string;
	deleteModeTitle: string;
	deleteModeTrash: string;
	deleteModePermanent: string;
	clearDbBtn: string;
	clearDbConfirmTitle: string;
	clearDbConfirmText: string;
	githubBtn: string;
	boostyBtn: string;
	batchTitle: string;
	batchDropzone: string;
	batchDropzoneSub: string;
	batchFilesSelected: string;
	batchScheme: string;
	batchTextLabel: string;
	batchSubmit: string;
	sortBy: string;
	sortIdDesc: string;
	sortIdAsc: string;
	sortDateAsc: string;
	sortDateDesc: string;
	sortStatus: string;
	groupBy: string;
	groupNone: string;
	groupByTarget: string;
	groupByStatus: string;
	targetLabel: string;
	deleteConfirmTitle: string;
	deleteConfirmText: string;
	dontAskSession: string;
	confirmDelete: string;
	cleanSuccess: string;
	cleanExplain: string;
	loadVkPhotos: string;
	livePreview: string;
	previewTitle: string;
	wallViewerTitle: string;
	scanWallBtn: string;
	loadMoreBtn: string;
	wallPostBadge: string;
	mediaFiles: string;
	tabLocalQueue: string;
	tabVkQueue: string;
	tabHistoryQueue: string;
	errorReason: string;
	noActiveToken: string;
}

export const translations: Record<Lang, TranslationSchema> = {
	ru: {
		appTitle: "VK Post Studio",
		token: "Токен:",
		addToken: "Добавить токен",
		noTokens: "Нет токенов",
		target: "Цель:",
		settings: "Настройки",
		createPost: "СОЗДАНИЕ ЗАПИСИ",
		editPost: "РЕДАКТИРОВАНИЕ ПОСТА",
		editMode: "Режим правки",
		postTextPlaceholder: "Текст записи (необязательно)...",
		symbols: "символов",
		dropzoneTitle: "Перетащите изображения сюда",
		dropzoneSub: "или нажмите для выбора файлов (до 10 шт.)",
		attachedFiles: "Прикрепленные файлы",
		mediaLimit: "медиа",
		batchModeBtn: "Пакетный постинг",
		addMore: "Добавить еще",
		position: "позиция",
		pubSettings: "Настройки публикации",
		mediaStyle: "Стиль отображения медиа",
		mediaStyleSub: "Формат отображения в ленте ВК",
		grid: "Сетка",
		carousel: "Карусель",
		comments: "Комментарии к записи",
		notifications: "Уведомление для подписчиков",
		notificationsSub:
			"Отправлять колокольчик тем, у кого включены уведомления",
		authorSign: "Подпись автора",
		authorSignSub: "«Автор: Имя Фамилия» будет указано под постом",
		adsMark: "Метка «Реклама от автора»",
		adsMarkSub: "Нельзя изменить после публикации",
		manualTimeToggle: "Задать время слота вручную",
		pubTime: "Время публикации:",
		apply: "Применить",
		cancel: "Отмена",
		addToQueue: "Добавить в очередь",
		saveChanges: "Сохранить изменения в посте",
		noFreeSlots: "Нет свободных слотов",
		selectTarget: "Выберите цель",
		localQueue: "Локальная",
		vkDelayed: "Отложка ВК",
		history: "История",
		allPostsTab: "Просмотр стены",
		emptyQueue: "Очередь пуста",
		emptyVk: "В отложке ВК нет постов",
		emptyHistory: "История постов пуста",
		emptyAllPosts: "На стене нет постов",
		actions: "Действия:",
		toEditor: "В редактор",
		revertToLocal: "Вернуть в локальную очередь",
		nextSlot: "Следующий слот",
		setTime: "Задать время",
		statusLocal: "Локально",
		statusVk: "В отложке ВК",
		statusError: "Ошибка",
		statusArchived: "Архив",
		statusPublished: "Опубликован в ВК",
		statusDeletedInVk: "Удалён в ВК",
		noAttachments: "Вложений нет",
		sendToVk: "Отправить в ВК",
		sending: "Отправка...",
		cleanDiskFiles: "Очистить файлы с диска",
		revertSameTime: "Вернуть на то же время",
		revertNextSlot: "Добавить в конец очереди (по паттерну)",
		saveTime: "Сохранить время",
		selectPubTime: "Выбор времени публикации",
		savePattern: "Сохранить паттерн",
		patternName: "Название паттерна",
		timesCsv: "Времена публикаций через запятую (ЧЧ:ММ)",
		intervalDays:
			"Интервал в днях (1 = каждый день, 2 = через день, 3 = раз в 3 дня)",
		intervalDaysHint:
			"Следующий пост будет запланирован через указанное количество дней.",
		createPatternTitle: "Создание своего паттерна",
		settingsTitle: "Настройки приложения",
		themeTitle: "Тема оформления",
		themePastel: "Pastel Dreamland Adventure",
		themeOcean: "Ocean Breeze",
		themePink: "Soft Pink Delight",
		themeEarthy: "Earthy Green",
		themeSteel: "Light Steel",
		themeTwilight: "Golden Twilight",
		langTitle: "Язык интерфейса",
		backupDb: "Создать резервную копию базы данных",
		cleanExpiredTokens: "Удалить недействительные токены",
		deleteModeTitle: "Очистка файлов с диска",
		deleteModeTrash: "В корзину",
		deleteModePermanent: "Безвозвратно",
		clearDbBtn: "Очистить базу данных (кроме токенов)",
		clearDbConfirmTitle: "Очистка базы данных",
		clearDbConfirmText:
			"Вы действительно хотите удалить все локальные посты, очереди и историю? Токены и аккаунты сохранятся.",
		githubBtn: "Github проекта",
		boostyBtn: "Поддержать автора (Boosty)",
		batchTitle: "Пакетная генерация очереди",
		batchDropzone: "Перетащите неограниченное число изображений",
		batchDropzoneSub: "или нажмите для выбора сразу десятков файлов",
		batchFilesSelected: "Выбрано файлов:",
		batchScheme: "Схема разделения постов:",
		batchTextLabel: "Общий текст для каждого поста (необязательно):",
		batchSubmit: "Сгенерировать посты в очередь",
		sortBy: "Сортировка:",
		sortIdDesc: "ID (новые)",
		sortIdAsc: "ID (старые)",
		sortDateAsc: "По дате (раньше)",
		sortDateDesc: "По дате (позже)",
		sortStatus: "По статусу",
		groupBy: "Группировка:",
		groupNone: "Без группировки",
		groupByTarget: "По цели",
		groupByStatus: "По статусу",
		targetLabel: "Цель:",
		deleteConfirmTitle: "Подтверждение удаления",
		deleteConfirmText: "Вы действительно хотите удалить этот пост?",
		dontAskSession: "Не спрашивать в текущей сессии",
		confirmDelete: "Удалить",
		cleanSuccess: "Успешно удалено файлов:",
		cleanExplain:
			"Будут удалены исходные локальные файлы картинок с вашего диска только для тех постов, которые уже успешно находятся в отложке ВК. Превью в приложении сохранятся.",
		loadVkPhotos: "Загрузить фото из ВК",
		livePreview: "Предпросмотр",
		previewTitle: "Предпросмотр поста на стене ВКонтакте",
		wallViewerTitle: "Просмотр стены сообщества",
		scanWallBtn: "Сканировать стену",
		loadMoreBtn: "Загрузить ещё",
		wallPostBadge: "Стена ВК",
		mediaFiles: "медиа",
		tabLocalQueue: "Локальная очередь",
		tabVkQueue: "Отложка ВК",
		tabHistoryQueue: "История",
		errorReason: "Причина ошибки:",
		noActiveToken: "Нет актуального токена, добавьте через меню сверху.",
	},
	en: {
		appTitle: "VK Post Studio",
		token: "Token:",
		addToken: "Add Token",
		noTokens: "No tokens",
		target: "Target:",
		settings: "Settings",
		createPost: "CREATE POST",
		editPost: "EDIT POST",
		editMode: "Editing mode",
		postTextPlaceholder: "Post text (optional)...",
		symbols: "characters",
		dropzoneTitle: "Drop images here",
		dropzoneSub: "or click to select files (up to 10)",
		attachedFiles: "Attached files",
		mediaLimit: "media",
		batchModeBtn: "Batch Mode",
		addMore: "Add more",
		position: "pos",
		pubSettings: "Publication Settings",
		mediaStyle: "Media layout style",
		mediaStyleSub: "How images are displayed in VK feed",
		grid: "Grid",
		carousel: "Carousel",
		comments: "Comments on post",
		notifications: "Notify subscribers",
		notificationsSub: "Send bell notification to subscribers",
		authorSign: "Author signature",
		authorSignSub: "'Author: First Last' will be appended",
		adsMark: "Mark as 'Ad by creator'",
		adsMarkSub: "Cannot be changed after publication",
		manualTimeToggle: "Set slot time manually",
		pubTime: "Publication time:",
		apply: "Apply",
		cancel: "Cancel",
		addToQueue: "Add to queue",
		saveChanges: "Save changes in post",
		noFreeSlots: "No available slots",
		selectTarget: "Select target",
		localQueue: "Local",
		vkDelayed: "VK Scheduled",
		history: "History",
		allPostsTab: "Wall Viewer",
		emptyQueue: "Queue is empty",
		emptyVk: "No postponed posts in VK",
		emptyHistory: "Post history is empty",
		emptyAllPosts: "No posts on the wall",
		actions: "Actions:",
		toEditor: "To Editor",
		revertToLocal: "Revert to local queue",
		nextSlot: "Next slot",
		setTime: "Set time",
		statusLocal: "Local",
		statusVk: "VK Scheduled",
		statusError: "Error",
		statusArchived: "Archived",
		statusPublished: "Published in VK",
		statusDeletedInVk: "Deleted in VK",
		noAttachments: "No attachments",
		sendToVk: "Send to VK",
		sending: "Sending...",
		cleanDiskFiles: "Free disk space",
		revertSameTime: "Revert to the same time",
		revertNextSlot: "Add to end of queue (by pattern)",
		saveTime: "Save time",
		selectPubTime: "Select publication time",
		savePattern: "Save pattern",
		patternName: "Pattern name",
		timesCsv: "Posting times separated by commas (HH:MM)",
		intervalDays:
			"Day interval (1 = daily, 2 = every other day, 3 = every 3 days)",
		intervalDaysHint: "Next post will be scheduled after this interval.",
		createPatternTitle: "Create Posting Pattern",
		settingsTitle: "Application Settings",
		themeTitle: "Theme",
		themePastel: "Pastel Dreamland Adventure",
		themeOcean: "Ocean Breeze",
		themePink: "Soft Pink Delight",
		themeEarthy: "Earthy Green",
		themeSteel: "Light Steel",
		themeTwilight: "Golden Twilight",
		langTitle: "Language",
		backupDb: "Create database backup",
		cleanExpiredTokens: "Delete invalid tokens",
		deleteModeTitle: "Disk cleaning mode",
		deleteModeTrash: "Move to Trash",
		deleteModePermanent: "Delete permanently",
		clearDbBtn: "Clear Database (except tokens)",
		clearDbConfirmTitle: "Clear Database",
		clearDbConfirmText:
			"Are you sure you want to delete all local posts, queues, and history? Your tokens will remain.",
		githubBtn: "Github",
		boostyBtn: "Support (Boosty)",
		batchTitle: "Batch Queue Generator",
		batchDropzone: "Drop unlimited images here",
		batchDropzoneSub: "or click to select dozens of files",
		batchFilesSelected: "Files selected:",
		batchScheme: "Split scheme:",
		batchTextLabel: "Shared text for every post (optional):",
		batchSubmit: "Generate Queue",
		sortBy: "Sort:",
		sortIdDesc: "ID (newest)",
		sortIdAsc: "ID (oldest)",
		sortDateAsc: "Date (earliest)",
		sortDateDesc: "Date (latest)",
		sortStatus: "By Status",
		groupBy: "Group:",
		groupNone: "None",
		groupByTarget: "By Target",
		groupByStatus: "By Status",
		targetLabel: "Target:",
		deleteConfirmTitle: "Confirm deletion",
		deleteConfirmText: "Are you sure you want to delete this post?",
		dontAskSession: "Do not ask again in this session",
		confirmDelete: "Delete",
		cleanSuccess: "Successfully freed files:",
		cleanExplain:
			"Original local image files will be removed from your disk only for posts already postponed to VK. Thumbnails in the app will be preserved.",
		loadVkPhotos: "Download photos from VK",
		livePreview: "Preview",
		previewTitle: "VK Wall Post Live Preview",
		wallViewerTitle: "Community Wall Viewer",
		scanWallBtn: "Scan Wall",
		loadMoreBtn: "Load More",
		wallPostBadge: "VK Wall",
		mediaFiles: "media",
		tabLocalQueue: "Local Queue",
		tabVkQueue: "VK Postponed",
		tabHistoryQueue: "History",
		errorReason: "Error reason:",
		noActiveToken: "No valid token, add one via the top menu.",
	},
};

export function formatNormalizedError(
	rawError: string | undefined | null,
	lang: Lang,
): string {
	if (!rawError) return "";
	const clean = rawError
		.trim()
		.replace(/^Ошибка:\s*/i, "")
		.replace(/^Ошибка:\s*/i, "")
		.trim();

	const isRu = lang === "ru";

	if (clean.includes("error 5") || clean.includes("User authorization failed")) {
		return isRu
			? "Требуется повторный вход: токен устарел или изменился IP/VPN (код ошибки 5)."
			: "Authorization required: token expired or IP/VPN changed (error code 5).";
	}
	if (clean.includes("error 27")) {
		return isRu
			? "Недостаточно прав: для публикации от имени группы требуется токен пользователя-администратора (код ошибки 27)."
			: "Insufficient permissions: admin user token required (error code 27).";
	}
	if (clean.includes("error 15") || clean.includes("Access denied")) {
		return isRu
			? "Доступ запрещен: проверьте права доступа вашего аккаунта к сообществу (код ошибки 15)."
			: "Access denied: check account permissions for this community (error code 15).";
	}
	if (clean.includes("error 214")) {
		return isRu
			? "Публикация на стене запрещена настройками сообщества (код ошибки 214)."
			: "Wall posting denied by community settings (error code 214).";
	}
	if (clean.includes("error 219")) {
		return isRu
			? "Достигнут суточный лимит рекламных записей в сообществе (код ошибки 219)."
			: "Daily advertisement post limit reached (error code 219).";
	}
	if (clean.includes("error 223")) {
		return isRu
			? "Превышен суточный лимит отложенных записей ВКонтакте (максимум 250 постов) (код ошибки 223)."
			: "VK postponed posts limit reached (maximum 250 posts) (error code 223).";
	}
	if (clean.includes("error 100")) {
		return isRu
			? "Один из параметров публикации передан некорректно (код ошибки 100)."
			: "One of the post parameters is invalid (error code 100).";
	}
	if (
		clean.includes("error sending request") ||
		clean.includes("connection closed") ||
		clean.includes("timed out")
	) {
		return isRu
			? "Сбой соединения с серверами ВКонтакте (ошибка сети/таймаут). Проверьте интернет-подключение."
			: "Failed to connect to VK servers (network timeout). Please check your internet connection.";
	}
	if (clean.includes("Файл не найден") || clean.includes("not found")) {
		return isRu
			? clean
			: "Original attachment file was not found on local disk.";
	}

	return clean;
}

