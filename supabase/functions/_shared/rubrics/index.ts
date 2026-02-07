/**
 * Rubric Registry
 * 
 * Maps prompt_key to rubric definitions.
 * Add new rubrics here after creating their .ts file.
 */

import { CAR_FRAMEWORK } from './carFramework.ts';
import { ELEVATOR_PITCH } from './elevatorPitch.ts';

export interface RubricDefinition {
  name: string;
  promptKey: string;
  maxScore: number;
  criteria: string[];
  buildPrompt: (transcript: string) => string;
}

// Registry of all available rubrics
export const RUBRIC_REGISTRY: Record<string, RubricDefinition> = {
  'car_framework': CAR_FRAMEWORK,
  'elevator_pitch': ELEVATOR_PITCH,
};

// Get rubric by prompt_key
export function getRubricByKey(promptKey: string): RubricDefinition | null {
  return RUBRIC_REGISTRY[promptKey] || null;
}

// Get all available rubric keys
export function getAvailableRubricKeys(): string[] {
  return Object.keys(RUBRIC_REGISTRY);
}

// Build prompt for a given rubric and transcript
export function buildRubricPrompt(promptKey: string, transcript: string): string | null {
  const rubric = getRubricByKey(promptKey);
  if (!rubric) return null;
  return rubric.buildPrompt(transcript);
}

// Default rubric if none specified
export const DEFAULT_RUBRIC_KEY = 'car_framework';
