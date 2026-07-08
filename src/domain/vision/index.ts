export type VisionLayerType = "fog" | "revealed_area" | "blocked_area";

export type VisionLayerVisibility = "public" | "gm_only";

export type VisionArea = {
  type?: "rect" | "polygon";
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{
    x: number;
    y: number;
  }>;
};

export type RevealedData = {
  mode?: "none" | "partial" | "all" | "public";
  areas?: VisionArea[];
  hiddenAreas?: VisionArea[];
};
