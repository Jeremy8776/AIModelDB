
import React, { useState, useContext } from "react";
import { CheckCircle, XCircle, Edit3, X, AlertTriangle, Download } from "lucide-react";
import ThemeContext from "../context/ThemeContext";
import { Model } from "../types";
import { DomainIcon } from "./UI";
import { kfmt, fmtDate } from "../utils/format";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

// Helper function to display cost information
const getCostDisplay = (model: Model): string => {
	const isOpenSource = (model.license?.type === 'OSI' || model.license?.type === 'Copyleft') && model.license?.name && model.license.name !== 'Proprietary';
	if ((!model.pricing || model.pricing.length === 0) && isOpenSource) {
		const vramTag = (model.tags || []).find(t => /vram|gb|gpu/i.test(t));
		return `Free • Local${vramTag ? ` • ${vramTag}` : ''}`;
	}
	if (!model.pricing || model.pricing.length === 0) return '—';

	// Separate API and subscription pricing
	const apiPricing = model.pricing.filter(p => !isSubscriptionPricing(p));
	const subPricing = model.pricing.filter(p => isSubscriptionPricing(p));

	const displays: string[] = [];

	const toPerMillion = (amount: number, unit?: string | null): number => {
		const u = (unit || '').toLowerCase();
		let perM = amount;
		if (u.includes('token')) perM = amount * 1_000_000;
		else if (u.includes('1k') || u.includes('thousand')) perM = amount * 1_000;
		if (perM > 10000) perM = perM / 1_000_000; // heuristic correction
		if (perM > 10000) perM = perM / 1_000;
		return perM;
	};
	// Process API pricing (enterprise-friendly format)
	if (apiPricing.length > 0) {
		const pricing = apiPricing[0];
		const currency = pricing.currency || '$';

		if (pricing.flat != null) {
			const val = toPerMillion(Number(pricing.flat), pricing.unit);
			const per1K = val / 1000;
			displays.push(`API • ~${currency}${per1K.toFixed(3)}/1K requests`);
		} else if (pricing.input != null && pricing.output != null) {
			const i = toPerMillion(Number(pricing.input), pricing.unit);
			const o = toPerMillion(Number(pricing.output), pricing.unit);
			// Blended cost (3:1 ratio)
			const blended = ((i / 1000) * 3 + (o / 1000)) / 4;
			displays.push(`API • ~${currency}${blended.toFixed(3)}/1K requests`);
		} else if (pricing.input != null) {
			const i = toPerMillion(Number(pricing.input), pricing.unit);
			const per1K = i / 1000;
			displays.push(`API • ~${currency}${per1K.toFixed(3)}/1K requests`);
		}
	}

	// Process subscription pricing
	if (subPricing.length > 0) {
		const pricing = subPricing[0];
		if (pricing.flat != null) {
			const unit = pricing.unit || 'month';
			const period = unit.toLowerCase().includes('year') || unit.toLowerCase().includes('annual') ? '/yr' : '/mo';
			displays.push(`Sub: ${pricing.currency || '$'}${pricing.flat}${period}`);
		}
	}

	return displays.length > 0 ? displays.join(' • ') : 'Varies';
};

// Check if pricing is subscription-based
const isSubscriptionPricing = (pricing: any): boolean => {
	if (!pricing.unit) return false;
	const unit = pricing.unit.toLowerCase();
	return unit.includes('month') ||
		unit.includes('year') ||
		unit.includes('annual') ||
		unit.includes('subscription') ||
		unit.includes('plan') ||
		(pricing.flat != null && !unit.includes('token') && !unit.includes('request') && !unit.includes('call'));
};

interface FlaggedModelsModalProps {
	flagged: Model[];
	isOpen: boolean;
	onApprove: (model: Model) => void;
	onDeny: (model: Model) => void;
	onEdit: (model: Model) => void;
	onClose: () => void;
	addConsoleLog: (msg: string) => void;
}

export const FlaggedModelsModal: React.FC<FlaggedModelsModalProps> = ({ flagged, isOpen, onApprove, onDeny, onEdit, onClose, addConsoleLog }) => {
	const { theme } = useContext(ThemeContext);
	const [editingModel, setEditingModel] = useState<Model | null>(null);

	// Lock body scroll when modal is open
	useBodyScrollLock(isOpen);
	const [editData, setEditData] = useState<Partial<Model>>({});

	if (!isOpen) return null;

	// Theme-aware styling
	const bgInput = theme === "dark" ? "border-zinc-800 bg-zinc-900/60" : "border-zinc-300 bg-white";
	const bgCard = theme === "dark" ? "border-zinc-800 bg-zinc-950/40" : "border-zinc-200 bg-white";
	const textSubtle = theme === "dark" ? "text-zinc-400" : "text-zinc-600";
	const textMain = theme === "dark" ? "text-zinc-100" : "text-zinc-900";

	const handleEditChange = (field: keyof Model, value: any) => {
		setEditData((prev: Partial<Model>) => ({ ...prev, [field]: value }));
	};

	const handleEditSave = () => {
		if (editingModel) {
			onEdit({ ...editingModel, ...editData });
			setEditingModel(null);
			setEditData({});
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
			<div
				className={`w-full max-w-6xl h-[90vh] rounded-2xl border ${theme === "dark" ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"} shadow-2xl flex flex-col`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
					<div className="flex items-center gap-3">
						<AlertTriangle className="size-6 text-violet-500" />
						<h2 className={`text-xl font-semibold ${textMain}`}>
							Flagged Models for Approval ({flagged.length})
						</h2>
					</div>
					<div className="flex items-center gap-3">
						{flagged.length > 0 && (
							<>
								<button
									onClick={() => {
										addConsoleLog(`FlaggedModelsModal: Approved all ${flagged.length} models`);
										flagged.forEach(model => onApprove(model));
									}}
									className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
									title="Approve all flagged models"
								>
									<CheckCircle className="size-4" />
									Approve All
								</button>
								<button
									onClick={() => {
										addConsoleLog(`FlaggedModelsModal: Rejected all ${flagged.length} models`);
										flagged.forEach(model => onDeny(model));
									}}
									className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors"
									title="Reject all flagged models"
								>
									<XCircle className="size-4" />
									Reject All
								</button>
							</>
						)}
						<button
							onClick={onClose}
							className={`rounded-xl ${bgInput} p-2 hover:opacity-80 transition-opacity`}
							title="Close"
						>
							<X className="size-5" />
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 min-h-0 overflow-hidden">
					{flagged.length === 0 ? (
						<div className="flex flex-col items-center justify-center h-full">
							<CheckCircle className="size-16 text-green-500 mb-4" />
							<p className={`text-lg ${textSubtle}`}>No flagged models to review</p>
							<p className={`text-sm ${textSubtle} mt-2`}>All models have been processed successfully</p>
						</div>
					) : (
						<div className="h-full overflow-y-auto">
							<div className="p-6 space-y-4">
								{flagged.map((model: Model) => (
									<div key={model.id} className={`rounded-xl border ${bgCard} p-5 transition-all hover:shadow-md`}>
										<div className="flex items-start justify-between">
											{/* Model Info */}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-3 mb-3">
													<DomainIcon d={model.domain} className="size-5 flex-shrink-0" />
													<h3 className={`text-lg font-medium ${textMain} truncate`} title={model.name}>
														{model.name || "Unnamed Model"}
													</h3>
													<span className={`px-2 py-1 rounded-full text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400`}>
														{model.source}
													</span>
												</div>

												{/* Model Details Grid */}
												<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
													<div>
														<span className={`block ${textSubtle} mb-1`}>Provider</span>
														<span className={textMain}>{model.provider || "Unknown"}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Domain</span>
														<span className={textMain}>{model.domain}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>License</span>
														<span className={textMain}>{model.license?.name || "Unknown"}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Downloads</span>
														<span className={textMain}>{kfmt(model.downloads || 0)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Cost</span>
														<span className={textMain}>{getCostDisplay(model)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Released</span>
														<span className={textMain}>{fmtDate(model.release_date)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Updated</span>
														<span className={textMain}>{fmtDate(model.updated_at)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>Context</span>
														<span className={textMain}>{model.context_window || "Unknown"}</span>
													</div>
												</div>

												{/* URL */}
												{model.url && (
													<div className="mt-3">
														<a
															href={model.url}
															target="_blank"
															rel="noopener noreferrer"
															className={`text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate block`}
															title={model.url}
														>
															{model.url}
														</a>
													</div>
												)}
											</div>

											{/* Actions */}
											<div className="flex gap-2 ml-4 flex-shrink-0">
												<button
													onClick={() => {
														addConsoleLog(`FlaggedModelsModal: Approved model ${model.name}`);
														onApprove(model);
													}}
													className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
													title="Approve model"
												>
													<CheckCircle className="size-4" />
													Approve
												</button>
												<button
													onClick={() => {
														addConsoleLog(`FlaggedModelsModal: Edit model ${model.name}`);
														setEditingModel(model);
														setEditData({});
													}}
													className={`flex items-center gap-2 rounded-xl ${bgInput} hover:opacity-80 px-4 py-2 text-sm font-medium transition-opacity`}
													title="Edit model details"
												>
													<Edit3 className="size-4" />
													Edit
												</button>
												<button
													onClick={() => {
														addConsoleLog(`FlaggedModelsModal: Denied model ${model.name}`);
														onDeny(model);
													}}
													className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors"
													title="Deny model"
												>
													<XCircle className="size-4" />
													Deny
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Edit Panel */}
				{editingModel && (
					<div className="flex-shrink-0 border-t p-6" style={{ borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7' }}>
						<h3 className={`text-lg font-semibold ${textMain} mb-4`}>Edit Model Details</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>Name</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="Model name"
									value={editData.name ?? editingModel.name ?? ""}
									onChange={e => handleEditChange("name", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>Provider</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="Provider/Author"
									value={editData.provider ?? editingModel.provider ?? ""}
									onChange={e => handleEditChange("provider", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>Domain</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="Model domain"
									value={editData.domain ?? editingModel.domain ?? ""}
									onChange={e => handleEditChange("domain", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>Parameters</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="e.g., 7B, 70B"
									value={editData.parameters ?? editingModel.parameters ?? ""}
									onChange={e => handleEditChange("parameters", e.target.value)}
								/>
							</div>
							<div className="md:col-span-2">
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>URL</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="Model URL"
									value={editData.url ?? editingModel.url ?? ""}
									onChange={e => handleEditChange("url", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>License</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="License name"
									value={editData.license?.name ?? editingModel.license?.name ?? ""}
									onChange={e => handleEditChange("license", { ...editingModel.license, name: e.target.value })}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>Release Date</label>
								<input
									type="date"
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									value={editData.release_date?.split('T')[0] ?? editingModel.release_date?.split('T')[0] ?? ""}
									onChange={e => handleEditChange("release_date", e.target.value)}
								/>
							</div>
						</div>
						<div className="flex gap-3 mt-6">
							<button
								onClick={handleEditSave}
								className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-2 font-medium transition-colors"
							>
								<CheckCircle className="size-4" />
								Save & Approve
							</button>
							<button
								onClick={() => { setEditingModel(null); setEditData({}); }}
								className={`rounded-xl ${bgInput} hover:opacity-80 px-6 py-2 font-medium transition-opacity`}
							>
								Cancel
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
