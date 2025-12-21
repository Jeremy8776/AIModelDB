import { useState } from 'react';
import { Model } from '../types';
import { dedupe } from '../utils/format';

export function useModelCRUD(setModels: React.Dispatch<React.SetStateAction<Model[]>>) {
    const [selectedModelForEdit, setSelectedModelForEdit] = useState<Model | null>(null);
    const [showModelEditor, setShowModelEditor] = useState(false);

    // Function to add a new model
    const addModel = (model: Model) => {
        setModels(prev => dedupe([...prev, model]));
    };

    // Function to update a model
    const updateModel = (updatedModel: Model) => {
        setModels(prev =>
            prev.map(model => model.id === updatedModel.id ? updatedModel : model)
        );
    };

    // Function to delete a model
    const deleteModel = (modelId: string) => {
        setModels(prev => prev.filter(model => model.id !== modelId));
    };

    // Functions for model editing
    const openModelEditor = (model: Model) => {
        setSelectedModelForEdit(model);
        setShowModelEditor(true);
    };

    const closeModelEditor = () => {
        setSelectedModelForEdit(null);
        setShowModelEditor(false);
    };

    const saveModelEdit = (editedModel: Model) => {
        updateModel(editedModel);
        closeModelEditor();
    };

    return {
        addModel,
        updateModel,
        deleteModel,
        selectedModelForEdit,
        showModelEditor,
        openModelEditor,
        closeModelEditor,
        saveModelEdit
    };
}
