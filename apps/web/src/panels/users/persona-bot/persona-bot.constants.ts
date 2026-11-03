import type { AiModelItem } from './persona-bot.types';

/**
 * Katalog master model AI teruji hasil benchmark empiris Vercel AI Gateway.
 * Digunakan sebagai state awal atau fallback offline untuk UI Pemilihan Model AI.
 */
export const DEFAULT_TESTED_MODELS: AiModelItem[] = [
	{
		id: 'google/gemini-2.5-flash',
		model_id: 'google/gemini-2.5-flash',
		name: 'Google Gemini 2.5 Flash',
		provider: 'Google',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'LMM',
		score: 97.9,
		badge: 'Rekomendasi Utama',
		isAccessible: true,
		isSelected: true
	},
	{
		id: 'openai/gpt-4o-mini',
		model_id: 'openai/gpt-4o-mini',
		name: 'OpenAI GPT-4o Mini',
		provider: 'OpenAI',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'LMM',
		score: 96.1,
		badge: 'Tercepat & Hemat',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'reflection/beam-free',
		model_id: 'reflection/beam-free',
		name: 'Reflection Beam Free',
		provider: 'Reflection',
		jenis: 'Gratis',
		tier: 'free',
		tipe: 'LMM',
		score: 95.5,
		badge: 'Juara Gratis',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'anthropic/claude-haiku-4.5',
		model_id: 'anthropic/claude-haiku-4.5',
		name: 'Claude 3.5 Haiku',
		provider: 'Anthropic',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'LMM',
		score: 97.1,
		badge: 'Akurat & Cepat',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'openai/gpt-4o',
		model_id: 'openai/gpt-4o',
		name: 'OpenAI GPT-4o Omni',
		provider: 'OpenAI',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'VLM',
		score: 97.9,
		badge: 'Multimodal Vision',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'deepseek/deepseek-r1',
		model_id: 'deepseek/deepseek-r1',
		name: 'DeepSeek R1',
		provider: 'DeepSeek',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'LLM',
		score: 96.7,
		badge: 'Penalaran Mendalam',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'nvidia/nemotron-3.5-lightning-free',
		model_id: 'nvidia/nemotron-3.5-lightning-free',
		name: 'NVIDIA Nemotron 3.5 Free',
		provider: 'NVIDIA',
		jenis: 'Gratis',
		tier: 'free',
		tipe: 'LLM',
		score: 94.0,
		badge: 'Gratis Percakapan',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'alibaba/qwen3-vl-instruct',
		model_id: 'alibaba/qwen3-vl-instruct',
		name: 'Qwen 3 VL Instruct',
		provider: 'Alibaba',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'VLM',
		score: 90.0,
		badge: 'Vision Multimodal',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'anthropic/claude-sonnet-4.6',
		model_id: 'anthropic/claude-sonnet-4.6',
		name: 'Claude 3.7 Sonnet',
		provider: 'Anthropic',
		jenis: 'Berbayar',
		tier: 'pro',
		tipe: 'VLM',
		score: 90.2,
		badge: 'Hybrid Reasoning',
		isAccessible: true,
		isSelected: false
	},
	{
		id: 'reflection/beam',
		model_id: 'reflection/beam',
		name: 'Reflection Beam',
		provider: 'Reflection',
		jenis: 'Gratis',
		tier: 'free',
		tipe: 'LLM',
		score: 92.0,
		badge: 'Cadangan Gratis',
		isAccessible: true,
		isSelected: false
	}
];
