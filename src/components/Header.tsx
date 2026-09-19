import React from "react";
import {
	Layers,
	Plus,
	Trash2,
	PanelRightClose,
	PanelRightOpen,
	Settings,
	Database,
} from "lucide-react";
import { Account, Target } from "../types";
import { translations, Lang } from "../services/i18n";
import { CustomSelect } from "./CustomSelect";

interface HeaderProps {
	accounts: Account[];
	activeAccountId: number | null;
	targets: Target[];
	selectedTargetId: number | null;
	lang: Lang;
	isRightPanelOpen: boolean;
	onSwitchAccount: (id: number) => void;
	onDeleteAccount: () => void;
	onOpenTokenModal: () => void;
	onSelectTarget: (id: number) => void;
	onOpenSettings: () => void;
	onOpenAllPostsModal: () => void;
	onToggleRightPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	accounts,
	activeAccountId,
	targets,
	selectedTargetId,
	lang,
	isRightPanelOpen,
	onSwitchAccount,
	onDeleteAccount,
	onOpenTokenModal,
	onSelectTarget,
	onOpenSettings,
	onOpenAllPostsModal,
	onToggleRightPanel,
}) => {
	const t = translations[lang];

	return (
		<header
			className="flex items-center justify-between px-5 py-2.5 border-b select-none transition-colors"
			style={{
				backgroundColor: "var(--bg-header)",
				borderColor: "var(--border-app)",
			}}
		>
			<div className="flex items-center gap-5">
				<div className="flex items-center gap-2.5">
					<div
						className="p-1.5 rounded-lg"
						style={{
							backgroundColor: "var(--accent-glow)",
							color: "var(--accent)",
						}}
					>
						<Layers className="h-5 w-5" />
					</div>
					<span
						className="font-bold tracking-tight text-base"
						style={{ color: "var(--text-app)" }}
					>
						{t.appTitle}
					</span>
				</div>

				{/* Список токенов */}
				<div className="flex items-center gap-2">
					<span
						className="text-xs font-medium"
						style={{ color: "var(--text-dim)" }}
					>
						{t.token}
					</span>
					{accounts.length > 0 ? (
						<div className="flex items-center gap-1">
							<CustomSelect
								value={activeAccountId || ""}
								options={accounts.map((a) => ({
									value: a.id,
									label: a.name,
								}))}
								onChange={(val) => onSwitchAccount(Number(val))}
								maxWidth="260px"
							/>

							<button
								onClick={onDeleteAccount}
								className="p-1.5 rounded-lg hover:opacity-75 transition-colors cursor-pointer"
								style={{ color: "var(--text-dim)" }}
								title={
									lang === "ru"
										? "Удалить этот токен"
										: "Delete this token"
								}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</div>
					) : (
						<span
							className="text-xs font-medium"
							style={{ color: "var(--accent)" }}
						>
							{t.noTokens}
						</span>
					)}

					<button
						onClick={onOpenTokenModal}
						className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:opacity-80 cursor-pointer"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							color: "var(--text-app)",
							borderColor: "var(--border-light)",
						}}
					>
						<Plus className="h-3.5 w-3.5" />
						<span>{t.addToken}</span>
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2.5">
				{targets.length > 1 && (
					<div className="flex items-center gap-1.5">
						<span
							className="text-xs font-medium"
							style={{ color: "var(--text-dim)" }}
						>
							{t.target}
						</span>
						<CustomSelect
							value={selectedTargetId || ""}
							options={targets.map((tgt) => ({
								value: tgt.id,
								label: tgt.title,
							}))}
							onChange={(val) => onSelectTarget(Number(val))}
							maxWidth="230px"
						/>
					</div>
				)}

				<button
					onClick={onOpenAllPostsModal}
					className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
						color: "var(--text-app)",
					}}
					title={t.allPostsTab}
				>
					<Database
						className="h-4 w-4"
						style={{ color: "var(--accent)" }}
					/>
				</button>

				<button
					onClick={onOpenSettings}
					className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
						color: "var(--text-app)",
					}}
					title={t.settings}
				>
					<Settings className="h-4 w-4" />
				</button>

				<button
					onClick={onToggleRightPanel}
					className="p-2 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
						color: "var(--text-app)",
					}}
					title={
						isRightPanelOpen
							? "Свернуть панель"
							: "Развернуть панель"
					}
				>
					{isRightPanelOpen ? (
						<PanelRightClose className="h-4 w-4" />
					) : (
						<PanelRightOpen className="h-4 w-4" />
					)}
				</button>
			</div>
		</header>
	);
};
