// Driver traits: small strengths and quirks. Effects are applied in engine/development.ts (traitEffects).

export type TraitId =
  | 'tyreWhisperer' | 'strongStarter' | 'hotHeaded' | 'qualifyingAce' | 'streetSpecialist'
  | 'calm' | 'mechanicalSympathy' | 'fastLearner';

export interface TraitDef { id: TraitId; name: string; blurb: string; good: boolean }

export const TRAITS: Record<TraitId, TraitDef> = {
  tyreWhisperer: { id: 'tyreWhisperer', name: 'Tyre whisperer', blurb: 'Tyres last about 10% longer.', good: true },
  strongStarter: { id: 'strongStarter', name: 'Strong starter', blurb: 'Gains time on the opening lap.', good: true },
  hotHeaded: { id: 'hotHeaded', name: 'Hot-headed', blurb: 'Fierce in fights but crashes 50% more often.', good: false },
  qualifyingAce: { id: 'qualifyingAce', name: 'Qualifying ace', blurb: 'Finds an extra 0.15s on a single fast lap.', good: true },
  streetSpecialist: { id: 'streetSpecialist', name: 'Street specialist', blurb: 'At home between the walls of street circuits.', good: true },
  calm: { id: 'calm', name: 'Calm', blurb: 'Rarely makes mistakes under pressure.', good: true },
  mechanicalSympathy: { id: 'mechanicalSympathy', name: 'Mechanical sympathy', blurb: 'Kind to the car: fewer breakdowns.', good: true },
  fastLearner: { id: 'fastLearner', name: 'Fast learner', blurb: 'Gains 50% more from training.', good: true },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** Track ids that count as street circuits. */
export const STREET_TRACKS = ['monaco', 'lagoon'];
