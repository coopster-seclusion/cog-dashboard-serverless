import type { Property } from "@/types/property";
import hornbyHighSchool from "@/data/properties/hornby-high-school.json";
import manurewaRuralCampus from "@/data/properties/manurewa-rural-campus.json";
import manurewaIntermediateMain from "@/data/properties/manurewa-intermediate-main.json";
import manurewaIntermediateGymnasium from "@/data/properties/manurewa-intermediate-gymnasium.json";
import aquaticCentre from "@/data/properties/aquatic-centre.json";

const PROPERTY_REGISTRY: Record<string, Property> = {
  "hornby-high-school":              hornbyHighSchool as Property,
  "manurewa-rural-campus":           manurewaRuralCampus as Property,
  "manurewa-intermediate-main":      manurewaIntermediateMain as Property,
  "manurewa-intermediate-gymnasium": manurewaIntermediateGymnasium as Property,
  "aquatic-centre":                  aquaticCentre as Property,
};

export function getPropertyById(id: string): Property | null {
  return PROPERTY_REGISTRY[id] ?? null;
}

export function getAllProperties(): Property[] {
  return Object.values(PROPERTY_REGISTRY);
}
