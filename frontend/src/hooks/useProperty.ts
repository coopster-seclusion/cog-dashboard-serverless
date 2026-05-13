import type { Property } from "@/types/property";
import hornbyHighSchool from "@/data/properties/hornby-high-school.json";

const PROPERTY_REGISTRY: Record<string, Property> = {
  "hornby-high-school": hornbyHighSchool as Property,
};

export function getPropertyById(id: string): Property | null {
  return PROPERTY_REGISTRY[id] ?? null;
}

export function getAllProperties(): Property[] {
  return Object.values(PROPERTY_REGISTRY);
}
