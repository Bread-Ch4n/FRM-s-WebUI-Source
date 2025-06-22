import { images } from "@/public/map/images";

type Point = number[] | [number, number];

function rotatePoint(point: Point, center: Point, angle: number): Point {
  const [px, py] = point;
  const [cx, cy] = center;

  const dx = px - cx;
  const dy = py - cy;

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

function scalePoint(point: Point, center: Point, scale: number): Point {
  const [px, py] = point;
  const [cx, cy] = center;

  const dx = px - cx;
  const dy = py - cy;

  return [cx + dx * scale, cy + dy * scale];
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function CalcBoundingBox({ BoundingBox, location }: any): Point[] {
  const bbox = BoundingBox;
  const rotation = -location.rotation % 360;
  const corners: Point[] = [
    [bbox.min.x, bbox.min.y * -1],
    [bbox.max.x, bbox.min.y * -1],
    [bbox.max.x, bbox.max.y * -1],
    [bbox.min.x, bbox.max.y * -1],
  ];

  const center: Point = [location.x, location.y * -1];

  const rotationInRadians = degreesToRadians(rotation + 90);

  return corners.map((corner) =>
    rotatePoint(corner, center, rotationInRadians),
  );
}

interface layerStuffType {
  [key: string]: {
    data?: any;
    filters?: string[];
    icon: string;
    id: string;
    label: string;
    url: string;
    visible: boolean;
    with?: string;
  };
}

const layerStuff: layerStuffType = {
  artifacts: {
    icon: images.Artifacts.Somersloop,
    id: "artifacts",
    label: "Artifacts",
    url: "/getArtifacts",
    visible: false,
  },
  belts: {
    icon: images.Buildings.Conveyor_Belt_MK1,
    id: "belts",
    label: "Belts",
    url: "/getBelts",
    visible: true,
  },
  belt_lifts: {
    icon: images.Buildings.Conveyor_Belt_MK1,
    id: "belt_lifts",
    label: "Belt Lifts",
    url: "/getLifts",
    with: "belts",
    visible: true,
  },
  splitter_merger: {
    icon: images.Buildings.Conveyor_Belt_MK1,
    id: "splitter_merger",
    label: "Splitter & Merger",
    url: "/getSplitterMerger",
    with: "belts",
    visible: true,
  },
  cables: {
    icon: images.Markers.Power,
    id: "cables",
    label: "Cables",
    url: "/getCables",
    visible: true,
  },
  drone: {
    icon: images.Markers.Drone,
    id: "drone",
    label: "Drones",
    url: "/getDrone",
    visible: true,
  },
  drone_station: {
    icon: images.Markers.Drone_Station,
    id: "drone_station",
    label: "Drone Stations",
    url: "/getDroneStation",
    visible: true,
    with: "drone",
  },
  drop_pod: {
    icon: images.Markers.Drop_Pod,
    id: "drop_pod",
    label: "Drop Pods",
    url: "/getDropPod",
    visible: false,
  },
  factory: {
    icon: images.Markers.Question_Mark,
    id: "factory",
    label: "Factory",
    url: "/getFactory",
    visible: true,
  },
  generators: {
    icon: images.Markers.Power,
    id: "generators",
    label: "Power Generators",
    url: "/getGenerators",
    visible: true,
  },
  hub: {
    icon: images.Markers.Hub,
    id: "hub",
    label: "Hubs",
    url: "/getHUBTerminal",
    visible: true,
  },
  pipes: {
    icon: images.Buildings.Build_Pipeline_MK1,
    id: "pipes",
    label: "Pipes",
    url: "/getPipes",
    visible: true,
  },
  pipe_junctions: {
    icon: images.Buildings.Build_Pipeline_MK1,
    id: "pipe_junctions",
    label: "Pipe Junctions",
    url: "/getPipeJunctions",
    visible: true,
    with: "pipes",
  },
  hypertubes: {
    icon: images.Markers.Question_Mark,
    id: "hypertubes",
    label: "Hypertubes",
    url: "/getHypertube",
    visible: true,
  },
  hypertube_entrances: {
    icon: images.Markers.Question_Mark,
    id: "hypertube_entrances",
    label: "Hypertube Entrances",
    url: "/getHyperEntrance",
    visible: true,
    with: "hypertubes",
  },
  hypertube_junctions: {
    icon: images.Markers.Question_Mark,
    id: "hypertube_junctions",
    label: "Hypertube Junctions",
    url: "/getHyperJunctions",
    visible: true,
    with: "hypertubes",
  },
  players: {
    icon: images.Markers.Player,
    id: "players",
    label: "Players",
    url: "/getPlayer",
    visible: true,
  },
  radar: {
    icon: images.Markers.Radar_Tower,
    id: "radio_tower",
    label: "Radar Towers",
    url: "/getRadarTower",
    visible: true,
  },
  resource_node: {
    icon: images.Markers.Question_Mark,
    id: "resource_node",
    label: "Resource Node",
    url: "/getResourceNode",
    visible: false,
  },
  slugs: {
    icon: images.Slugs.MK1,
    id: "slugs",
    label: "Slug",
    url: "/getPowerSlug",
    visible: false,
  },
  space_elevator: {
    icon: images.Markers.Space_Elevator,
    id: "space_elevator",
    label: "Space Elevator",
    url: "/getSpaceElevator",
    visible: true,
  },
  storage_inv: {
    icon: images.Markers.Crate_Loot,
    id: "storage_inv",
    label: "Storage Inv",
    url: "/getStorageInv",
    visible: true,
  },
  train: {
    icon: images.Markers.Train,
    id: "train",
    label: "Trains",
    url: "/getTrains",
    visible: true,
  },
  train_station: {
    icon: images.Markers.Train_Station,
    id: "train_station",
    label: "Train Stations",
    url: "/getTrainStation",
    visible: true,
    with: "train",
  },
  truck_station: {
    icon: images.Markers.Truck_Station,
    id: "truck_station",
    label: "Truck Stations",
    url: "/getTruckStation",
    visible: true,
    with: "vehicles",
  },
  vehicles: {
    icon: images.Markers.Explorer,
    id: "vehicles",
    label: "Vehicles",
    url: "/getVehicles",
    visible: true,
  },
  train_rails: {
    icon: images.Markers.Train,
    id: "train_rails",
    label: "Train Rails",
    url: "/getTrainRails",
    visible: true,
    with: "train",
  },
  switches: {
    icon: images.Markers.Power,
    id: "switches",
    label: "Switches",
    url: "/getSwitches",
    visible: true,
  },
  extractor: {
    icon: images.Markers.Question_Mark,
    id: "extractor",
    label: "Extractors",
    url: "/getExtractor",
    visible: true,
  },
  lizard_doggos: {
    icon: images.Creatures.Space_Rabbit,
    id: "lizard_doggos",
    label: "Lizard Doggos",
    url: "/getDoggo",
    visible: false,
  },
  portals: {
    icon: images.Markers.Portal,
    id: "portals",
    label: "Portals",
    url: "/getPortal",
    visible: true,
  },
  unlock_items: {
    icon: images.Markers.Tape,
    id: "unlock_items",
    label: "Unlock Items",
    url: "/getUnlockItems",
    visible: true,
  },
};

export {
  rotatePoint,
  CalcBoundingBox,
  layerStuff,
  degreesToRadians,
  scalePoint,
};
export type { Point };
export type { layerStuffType };
