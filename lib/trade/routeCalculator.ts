

export default function getLocationString(loc: {
  starSystem?: string;
  planet?: string;
  orbit?: string;
}): string {
  return [loc.starSystem, loc.planet, loc.orbit]
    .filter(Boolean)
    .join(" / ");
}


// Ensure UEXRoute is imported or defined. Example definition:
interface UEXRoute {
  scu_reachable?: number;
  scu_origin?: number;
  price_origin: number;
  price_destination: number;
  distance: number;
  origin_terminal_name: string;
  origin_star_system_name: string;
  origin_planet_name: string;
  origin_orbit_name: string;
  destination_terminal_name: string;
  destination_star_system_name: string;
  destination_planet_name: string;
  destination_orbit_name: string;
}

export interface EvaluatedTradeRoute extends UEXRoute {
  profit: number;
  roi: number;
  score: number;

  origin: {
    terminal: string;
    starSystem: string;
    planet: string;
    orbit: string;
  };

  destination: {
    terminal: string;
    starSystem: string;
    planet: string;
    orbit: string;
  };
}

export function scoreTradeRoute(route: {
  profit: number;
  roi: number;
  distance: number;
}) {
  const PROFIT_WEIGHT = 0.55;
  const ROI_WEIGHT = 0.35;
  const DISTANCE_PENALTY_WEIGHT = 0.10;

  const profitScore = Math.log10(route.profit + 1);
  const roiScore = Math.log10(route.roi + 1);
  const distancePenalty = Math.log10(route.distance + 1);

  return (
    profitScore * PROFIT_WEIGHT +
    roiScore * ROI_WEIGHT -
    distancePenalty * DISTANCE_PENALTY_WEIGHT
  );
}

export function calculateRouteForShip(
  route: UEXRoute,
  shipScu: number
): EvaluatedTradeRoute {
  const maxScu =
    route.scu_reachable || route.scu_origin || shipScu;

  const usableScu = Math.min(shipScu, maxScu);

  const buyPricePerScu = route.price_origin;
  const sellPricePerScu = route.price_destination;

  const investment = buyPricePerScu * usableScu;
  const revenue = sellPricePerScu * usableScu;
  const profit = revenue - investment;

  const roi =
    investment > 0 ? (profit / investment) * 100 : 0;

  const score = scoreTradeRoute({
    profit,
    roi,
    distance: route.distance,
  });

  return {
    ...route,

    profit,
    roi,
    score,

    origin: {
      terminal: route.origin_terminal_name,
      starSystem: route.origin_star_system_name,
      planet: route.origin_planet_name,
      orbit: route.origin_orbit_name,
    },

    destination: {
      terminal: route.destination_terminal_name,
      starSystem: route.destination_star_system_name,
      planet: route.destination_planet_name,
      orbit: route.destination_orbit_name,
    },
  };
}
