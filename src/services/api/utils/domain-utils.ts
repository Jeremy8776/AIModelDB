/**
 * Domain classification utilities for determining model domains from tags and topics
 */

import { Domain } from '../../../types';

/**
 * Determine model domain from tags
 */
export function determineDomain(tags: string[]): Domain {
    const tagStr = (tags || []).join(' ').toLowerCase();

    if (tagStr.includes('text-to-image') || tagStr.includes('diffusion') || tagStr.includes('stable-diffusion')) {
        return 'ImageGen';
    } else if (tagStr.includes('text-generation') || tagStr.includes('llm') || tagStr.includes('gpt') || tagStr.includes('chat')) {
        return 'LLM';
    } else if (tagStr.includes('vision') || tagStr.includes('multimodal') || tagStr.includes('vlm')) {
        return 'VLM';
    } else if (tagStr.includes('lora') || tagStr.includes('peft') || tagStr.includes('adapter')) {
        return 'LoRA';
    } else if (tagStr.includes('fine-tune') || tagStr.includes('finetune') || tagStr.includes('fine tuning') || tagStr.includes('fine-tuned') || tagStr.includes('sft')) {
        return 'FineTune';
    } else if (tagStr.includes('text-to-speech')) {
        return 'TTS';
    } else if (tagStr.includes('text-to-video')) {
        return 'VideoGen';
    } else if (tagStr.includes('audio')) {
        return 'Audio';
    } else if (tagStr.includes('asr') || tagStr.includes('speech-recognition')) {
        return 'ASR';
    } else if (tagStr.includes('3d')) {
        return '3D';
    } else if (tagStr.includes('world') || tagStr.includes('simulation')) {
        return 'World/Sim';
    } else if (tagStr.includes('background') && (tagStr.includes('removal') || tagStr.includes('remove') || tagStr.includes('matting'))) {
        return 'BackgroundRemoval';
    } else if (tagStr.includes('upscale') || tagStr.includes('super-resolution') || tagStr.includes('superresolution')) {
        return 'Upscaler';
    }

    return 'Other';
}

/**
 * Determine domain from GitHub repository topics
 */
export function determineDomainFromTopics(topics: string[]): Domain {
    const topicsStr = topics.join(' ').toLowerCase();

    if (topicsStr.includes('text-to-image') || topicsStr.includes('diffusion') || topicsStr.includes('image-generation')) {
        return 'ImageGen';
    } else if (topicsStr.includes('llm') || topicsStr.includes('language-model') || topicsStr.includes('gpt') ||
        topicsStr.includes('chatbot') || topicsStr.includes('transformers')) {
        return 'LLM';
    } else if (topicsStr.includes('computer-vision') || topicsStr.includes('object-detection') ||
        topicsStr.includes('image-recognition') || topicsStr.includes('multimodal') || topicsStr.includes('vlm')) {
        return 'VLM';
    } else if (topicsStr.includes('lora') || topicsStr.includes('peft') || topicsStr.includes('adapter')) {
        return 'LoRA';
    } else if (topicsStr.includes('fine-tune') || topicsStr.includes('finetune') || topicsStr.includes('fine-tuned') || topicsStr.includes('sft')) {
        return 'FineTune';
    } else if (topicsStr.includes('text-to-speech')) {
        return 'TTS';
    } else if (topicsStr.includes('text-to-video') || topicsStr.includes('video-generation')) {
        return 'VideoGen';
    } else if (topicsStr.includes('audio') || topicsStr.includes('music-generation')) {
        return 'Audio';
    } else if (topicsStr.includes('speech-recognition') || topicsStr.includes('asr')) {
        return 'ASR';
    } else if (topicsStr.includes('3d') || topicsStr.includes('3d-generation')) {
        return '3D';
    } else if (topicsStr.includes('world-model') || topicsStr.includes('simulation')) {
        return 'World/Sim';
    }

    return 'Other';
}
