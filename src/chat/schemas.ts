import { z } from 'zod';


export const FeatureSchema = z.object({
key: z.string(),
value: z.union([z.string(), z.number(), z.boolean()])
});


export const ChangeSetSchema = z.object({
model: z.string(),
features: z.array(FeatureSchema).default([]),
impacted_services: z.array(z.string()).default([])
});


export const MetadataSchema = z.object({
intent: z.string().default(''),
confidence: z.number().min(0).max(1).default(0.5),
risk: z.enum(['low','medium','high']).default('medium')
});


export const LLMReplySchema = z.object({
proposal_text: z.string(),
changeset: ChangeSetSchema,
metadata: MetadataSchema
});


export type LLMReply = z.infer<typeof LLMReplySchema>;