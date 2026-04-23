import type { Template } from "./types";
import founderProductIdeation from "@/templates/founder-product-ideation.json";
import postIncidentWitness from "@/templates/post-incident-witness.json";

// Registry of available briefs. Second brief (Post-Incident Witness) shipped
// Thu 2026-04-23 to demonstrate domain-neutrality of the four-call
// architecture — Investor/Founder vs. Investigator/Witness cover very
// different tones, stakes, and success criteria with the same core loop.
const templates: Template[] = [
  founderProductIdeation as unknown as Template,
  postIncidentWitness as unknown as Template,
];

export function listTemplates(): Pick<Template, "template_id" | "name" | "description">[] {
  return templates.map((t) => ({
    template_id: t.template_id,
    name: t.name,
    description: t.description,
  }));
}

export function getTemplate(id: string): Template | null {
  return templates.find((t) => t.template_id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = "founder-product-ideation";
