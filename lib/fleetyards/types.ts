export interface FleetYardsMediaImage {
  url: string;
  smallUrl?: string;
  mediumUrl?: string;
  largeUrl?: string;
  xlargeUrl?: string;
  name?: string;
  contentType?: string;
  width?: number;
  height?: number;
}

export interface FleetYardsMedia {
  storeImage?: FleetYardsMediaImage | null;
  fleetchartImage?: string | null; // direct URL string, not an object
  angledView?: FleetYardsMediaImage | null;
  frontView?: FleetYardsMediaImage | null;
  sideView?: FleetYardsMediaImage | null;
  topView?: FleetYardsMediaImage | null;
}

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
  media?: FleetYardsMedia | null;
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