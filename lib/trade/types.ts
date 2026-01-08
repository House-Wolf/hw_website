export type TradeShip = {
  id: number;
  name: string;
  scu: number;
};

export type EvaluatedTradeRoute = {
  id: string;
  commodityName: string;
  isIllegal: boolean;
  origin: string;
  destination: string;
  profit: number;
  roi: number;
  distance: string;
  riskLevel: "Low" | "Medium" | "High" | "Unknown";
  escortRecommendation: "Not Needed" | "Optional" | "Recommended";
  usableScu: number;
};

export type TradeRoutesResponse = {
  shipScu: number;
  legal: EvaluatedTradeRoute[];
  illegal: EvaluatedTradeRoute[];
  timestamp: number;
};
