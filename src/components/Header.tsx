import React from "react";
import {
	Layers,
	Plus,
	Trash2,
	PanelRightClose,
	PanelRightOpen,
	Palette,
} from "lucide-react";
import { Account, Target, Theme } from "../types";

interface HeaderProps {
	accounts: Account[];
	activeAccountId: number | null;
	targets: Target[];
	selectedTargetId: number | null;
	theme: Theme;
	isRightPanelOpen: boolean;
	onSwitchAccount: (id: number) => void;
	onDeleteAccount: () => void;
	onOpenTokenModal: () => void;
	onSelectTarget: (id: number) => void;
	onSetTheme: (theme: Theme) => void;
	onToggleRightPanel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	accounts,
	activeAccountId,
	targets,
	selectedTargetId,
	theme,
	isRightPanelOpen,
	onSwitchAccount,
	onDeleteAccount,
	onOpenTokenModal,
	onSelectTarget,
	onSetTheme,
	onToggleRightPanel,
}) => {
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
						className="p-1.5 rounded-lg text-blue-400"
						style={{ backgroundColor: "var(--accent-glow)" }}
					>
						<Layers className="h-5 w-5" />
					</div>
					<span
						className="font-bold tracking-tight text-base"
						style={{ color: "var(--text-app)" }}
					>
						VK Post Studio
					</span>
				</div>

				<div className="flex items-center gap-2">
					<span
						className="text-xs font-medium"
						style={{ color: "var(--text-dim)" }}
					>
						Токен:
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
									<option
										key={acc.id}
										value={acc.id}
										className="bg-slate-900 text-slate-100"
									>
										{acc.name}
									</option>
								))}
							</select>

							<button
								onClick={onDeleteAccount}
								className="p-1.5 rounded-lg hover:text-rose-400 transition-colors"
								style={{ color: "var(--text-muted)" }}
								title="Удалить этот токен"
							>
								<Trash2 className="h-3.5 w-3.5" />
							</button>
						</div>
					) : (
						<span className="text-xs font-medium text-amber-400">
							Нет токенов
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
						<span>Добавить токен</span>
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
							Цель:
						</span>
						<select
							className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
							style={{ color: "var(--text-app)" }}
							value={selectedTargetId || ""}
							onChange={(e) =>
								onSelectTarget(Number(e.target.value))
							}
						>
							{targets.map((t) => (
								<option
									key={t.id}
									value={t.id}
									className="bg-slate-900 text-slate-100"
								>
									{t.title}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Переключатель тем оформления */}
				<div
					className="flex items-center gap-1.5 border rounded-lg px-2 py-1"
					style={{
						backgroundColor: "var(--bg-surface-sub)",
						borderColor: "var(--border-light)",
					}}
				>
					<Palette
						className="h-3.5 w-3.5"
						style={{ color: "var(--text-dim)" }}
					/>
					<select
						className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer"
						style={{ color: "var(--text-app)" }}
						value={theme}
						onChange={(e) => onSetTheme(e.target.value as Theme)}
					>
						<option
							value="classic"
							className="bg-slate-900 text-slate-100"
						>
							Классическая
						</option>
						<option
							value="dark"
							className="bg-slate-900 text-slate-100"
						>
							Тёмная
						</option>
						<option
							value="light"
							className="bg-white text-slate-900"
						>
							Светлая
						</option>
					</select>
				</div>

				{/* Кнопка сворачивания правой панели */}
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
