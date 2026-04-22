import type { Template } from "./types";
import founderProductIdeation from "@/templates/founder-product-ideation.json";

// Registry of available templates. On Fri we may add 2-3 stub templates
// (non-functional range-demo entries) so the selector looks alive.
const templates: Template[] = [founderProductIdeation as unknown as Template];

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
