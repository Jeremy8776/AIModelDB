
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Edit3, X, AlertTriangle, Download } from "lucide-react";
import ThemeContext from "../context/ThemeContext";
import { Model } from "../types";
import { DomainIcon } from "./ui";
import { kfmt, fmtDate } from "../utils/format";
import { formatReleaseDate, isSubscriptionPricing, toPerMillion, formatEnterprisePricing } from "../utils/pricing";
import { formatCurrency, detectCurrency, convertCurrency } from "../utils/currency";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useSettings } from "../context/SettingsContext";


interface FlaggedModelsModalProps {
	flagged: Model[];
	isOpen: boolean;
	onApprove: (model: Model) => void;
	onDeny: (model: Model) => void;
	onApproveAll?: () => void;
	onDenyAll?: () => void;
	onEdit: (model: Model) => void;
	onClose: () => void;
	addConsoleLog: (msg: string) => void;
}

export const FlaggedModelsModal: React.FC<FlaggedModelsModalProps> = ({ flagged, isOpen, onApprove, onDeny, onApproveAll, onDenyAll, onEdit, onClose, addConsoleLog }) => {
	const { theme } = useContext(ThemeContext);
	const { settings } = useSettings();
	const { t } = useTranslation();
	const [editingModel, setEditingModel] = useState<Model | null>(null);

	const getCostDisplayLocal = (model: Model): string => {
		if (!model.pricing || model.pricing.length === 0) return '—';
		const p = model.pricing[0];
		const targetCurrency = settings.currency;
		const sourceCurrency = detectCurrency(p);

		try {
			if (p.input != null && p.output != null) {
				const inputPerM = toPerMillion(Number(p.input), p.unit);
				const outputPerM = toPerMillion(Number(p.output), p.unit);
				const inputConverted = convertCurrency(inputPerM, sourceCurrency, targetCurrency);
				const outputConverted = convertCurrency(outputPerM, sourceCurrency, targetCurrency);
				return formatEnterprisePricing(inputConverted, outputConverted, targetCurrency);
			}
			if (p.flat != null) {
				const amount = isSubscriptionPricing(p) ? Number(p.flat) : toPerMillion(Number(p.flat), p.unit);
				const converted = convertCurrency(amount, sourceCurrency, targetCurrency);
				return formatCurrency(converted, targetCurrency) + (isSubscriptionPricing(p) ? ` ${p.unit || ''}` : '');
			}
		} catch (e) {
			console.error('Error formatting cost in flagged modal:', e);
		}
		return '—';
	};

	// Lock body scroll when modal is open
	useBodyScrollLock(isOpen);
	const [editData, setEditData] = useState<Partial<Model>>({});

	if (!isOpen) return null;

	// Theme-aware styling
	const bgInput = "border border-border bg-input text-text";
	const bgCard = "border border-border bg-card text-text";
	const textSubtle = "text-text-secondary";
	const textMain = "text-text";

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
				className={`w-full max-w-6xl h-[90vh] rounded-2xl border border-border bg-bg text-text shadow-2xl flex flex-col`}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-border">
					<div className="flex items-center gap-3">
						<AlertTriangle className="size-6 text-violet-500" />
						<h2 className={`text-xl font-semibold ${textMain}`}>
							{t('flagged.title')} ({flagged.length})
						</h2>
					</div>
					<div className="flex items-center gap-3">
						{flagged.length > 0 && (
							<>
								<button
									onClick={() => {
										addConsoleLog(`FlaggedModelsModal: Approved all ${flagged.length} models`);
										if (onApproveAll) {
											onApproveAll();
										} else {
											// Fallback (though unreliable as noted)
											flagged.forEach(model => onApprove(model));
										}
									}}
									className="flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
									title={t('flagged.approveAll')}
								>
									<CheckCircle className="size-4" />
									{t('flagged.approveAll')}
								</button>
								<button
									onClick={() => {
										addConsoleLog(`FlaggedModelsModal: Rejected all ${flagged.length} models`);
										if (onDenyAll) {
											onDenyAll();
										} else {
											// Fallback
											flagged.forEach(model => onDeny(model));
										}
									}}
									className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors"
									title={t('flagged.rejectAll')}
								>
									<XCircle className="size-4" />
									{t('flagged.rejectAll')}
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
							<p className={`text-lg ${textSubtle}`}>{t('flagged.noFlagged')}</p>
							<p className={`text-sm ${textSubtle} mt-2`}>{t('flagged.allProcessed')}</p>
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
														{model.name || t('common.unnamed') + " Model"}
													</h3>
													<span className={`px-2 py-1 rounded-full text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400`}>
														{model.source}
													</span>
												</div>

												{/* Model Details Grid */}
												<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('table.provider')}</span>
														<span className={textMain}>{model.provider || t('common.unknown')}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('table.domain')}</span>
														<span className={textMain}>{model.domain}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('table.license')}</span>
														<span className={textMain}>{model.license?.name || t('common.unknown')}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('table.downloads')}</span>
														<span className={textMain}>{kfmt(model.downloads || 0)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('modelDetail.pricing')}</span>
														<span className={textMain}>{getCostDisplayLocal(model)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('modelDetail.releaseDate')}</span>
														<span className={textMain}>{fmtDate(model.release_date)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('modelDetail.lastUpdated')}</span>
														<span className={textMain}>{fmtDate(model.updated_at)}</span>
													</div>
													<div>
														<span className={`block ${textSubtle} mb-1`}>{t('modelDetail.contextWindow')}</span>
														<span className={textMain}>{model.context_window || t('common.unknown')}</span>
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
													title={t('flagged.approveTooltip')}
												>
													<CheckCircle className="size-4" />
													{t('common.approve')}
												</button>
												<button
													onClick={() => {
														addConsoleLog(`FlaggedModelsModal: Edit model ${model.name}`);
														setEditingModel(model);
														setEditData({});
													}}
													className={`flex items-center gap-2 rounded-xl ${bgInput} hover:opacity-80 px-4 py-2 text-sm font-medium transition-opacity`}
													title={t('flagged.editTooltip')}
												>
													<Edit3 className="size-4" />
													{t('common.edit')}
												</button>
												<button
													onClick={() => {
														addConsoleLog(`FlaggedModelsModal: Denied model ${model.name}`);
														onDeny(model);
													}}
													className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm font-medium transition-colors"
													title={t('flagged.rejectTooltip')}
												>
													<XCircle className="size-4" />
													{t('common.deny')}
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
					<div className="flex-shrink-0 border-t p-6 border-border">
						<h3 className={`text-lg font-semibold ${textMain} mb-4`}>{t('flagged.editModelDetails')}</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('table.name')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder={t('addModel.modelNamePlaceholder')}
									value={editData.name ?? editingModel.name ?? ""}
									onChange={e => handleEditChange("name", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('table.provider')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder={t('addModel.providerPlaceholder')}
									value={editData.provider ?? editingModel.provider ?? ""}
									onChange={e => handleEditChange("provider", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('table.domain')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder="Model domain"
									value={editData.domain ?? editingModel.domain ?? ""}
									onChange={e => handleEditChange("domain", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('modelDetail.parameters')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder={t('addModel.parametersPlaceholder')}
									value={editData.parameters ?? editingModel.parameters ?? ""}
									onChange={e => handleEditChange("parameters", e.target.value)}
								/>
							</div>
							<div className="md:col-span-2">
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('addModel.modelUrl')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder={t('addModel.modelUrlPlaceholder')}
									value={editData.url ?? editingModel.url ?? ""}
									onChange={e => handleEditChange("url", e.target.value)}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('table.license')}</label>
								<input
									className={`w-full rounded-xl ${bgInput} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
									placeholder={t('addModel.licenseNamePlaceholder')}
									value={editData.license?.name ?? editingModel.license?.name ?? ""}
									onChange={e => handleEditChange("license", { ...editingModel.license, name: e.target.value })}
								/>
							</div>
							<div>
								<label className={`block text-sm font-medium ${textSubtle} mb-2`}>{t('modelDetail.releaseDate')}</label>
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
								{t('common.saveAndApprove')}
							</button>
							<button
								onClick={() => { setEditingModel(null); setEditData({}); }}
								className={`rounded-xl ${bgInput} hover:opacity-80 px-6 py-2 font-medium transition-opacity`}
							>
								{t('common.cancel')}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
