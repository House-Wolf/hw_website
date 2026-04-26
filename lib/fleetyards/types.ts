export interface FleetYardsManufacturer {
  name?: string | null;
  slug?: string | null;
  code?: string | null;
}

export interface FleetYardsModel {
  id?: string;
  name?: string;
  slug?: string;
  classification?: string | null;
  classificationLabel?: string | null;
  focus?: string | null;
  size?: string | null;
  sizeLabel?: string | null;
  productionStatus?: string | null;
  productionStatusLabel?: string | null;
  manufacturer?: FleetYardsManufacturer | null;
  storeImage?: string | null;
  storeImageMedium?: string | null;
  storeImageLarge?: string | null;
  fleetchartImage?: string | null;
  backgroundImage?: string | null;
}

export interface FleetYardsVehicle {
  id?: string;
  name?: string | null;
  serial?: string | null;
  model?: FleetYardsModel | null;
}

export interface FleetStatItem {
  name?: string;
  label?: string;
  count?: number;
  value?: number;
}

export interface HouseWolfFleetPayload {
  fleetSlug: string;
  vehicles: FleetYardsVehicle[];
  modelCounts: FleetStatItem[];
  manufacturers: FleetStatItem[];
  classifications: FleetStatItem[];
  sizes: FleetStatItem[];
  productionStatuses: FleetStatItem[];
}