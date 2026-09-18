import React from "react";
import {
	Layers,
	Plus,
	Trash2,
	PanelRightClose,
	PanelRightOpen,
	Settings,
} from "lucide-react";
import { Account, Target } from "../types";
import { translations, Lang } from "../services/i18n";

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
	onToggleRightPanel,
}) => {
	const t = translations[lang];

	return (
		<header
			className="flex items-center justify-between px-6 py-3 border-b select-none transition-colors"
			style={{
				backgroundColor: "var(--bg-header)",
				borderColor: "var(--border-app)",
			}}
		>
			<div className="flex items-center gap-6">
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

				<div className="flex items-center gap-2">
					<span
						className="text-xs font-medium"
						style={{ color: "var(--text-dim)" }}
					>
						{t.token}
					</span>
					{accounts.length > 0 ? (
						<div className="flex items-center gap-1.5">
							<select
								className="rounded-lg px-3 py-1.5 text-xs font-semibold border cursor-pointer max-w-[280px] truncate focus:outline-none"
								style={{
									backgroundColor: "var(--bg-surface-sub)",
									color: "var(--text-app)",
									borderColor: "var(--border-light)",
								}}
								value={activeAccountId || ""}
								onChange={(e) =>
									onSwitchAccount(Number(e.target.value))
								}
							>
								{accounts.map((acc) => (
									<option key={acc.id} value={acc.id}>
										{acc.name}
									</option>
								))}
							</select>

							<button
								onClick={onDeleteAccount}
								className="p-1.5 rounded-lg hover:text-rose-400 transition-colors"
								style={{ color: "var(--text-muted)" }}
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
						<span className="text-xs font-medium text-amber-400">
							{t.noTokens}
						</span>
					)}

					<button
						onClick={onOpenTokenModal}
						className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
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

			<div className="flex items-center gap-3">
				{targets.length > 1 && (
					<div
						className="flex items-center gap-2 rounded-lg px-2.5 py-1 border"
						style={{
							backgroundColor: "var(--bg-surface-sub)",
							borderColor: "var(--border-light)",
						}}
					>
						<span
							className="text-xs"
							style={{ color: "var(--text-dim)" }}
						>
							{t.target}
						</span>
						<select
							className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
							style={{ color: "var(--text-app)" }}
							value={selectedTargetId || ""}
							onChange={(e) =>
								onSelectTarget(Number(e.target.value))
							}
						>
							{targets.map((tgt) => (
								<option key={tgt.id} value={tgt.id}>
									{tgt.title}
								</option>
							))}
						</select>
					</div>
				)}

				<button
					onClick={onOpenSettings}
					className="p-1.5 rounded-lg border transition-colors hover:opacity-80"
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
					className="p-1.5 rounded-lg border transition-colors"
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
