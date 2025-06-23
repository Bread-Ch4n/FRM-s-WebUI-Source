"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Layers, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import DeckGL, {
  BitmapLayer,
  CompositeLayer,
  COORDINATE_SYSTEM,
  GetPickingInfoParams,
  IconLayer,
  LineLayer,
  OrthographicView,
  PathLayer,
  PickingInfo,
  PolygonLayer,
} from "deck.gl";
import { makePopup } from "@/components/map/popup";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  CalcBoundingBox,
  degreesToRadians,
  layerStuff,
  Point,
  rotatePoint,
  scalePoint,
} from "@/app/map/utils";
import {
  adjustColorShades,
  getMkColor,
  hexToRgb,
  RGB,
  rgbaFloatToRGBA,
  toHex6,
} from "@/lib/helpers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { classNameColors, purityColors } from "@/lib/constants";
import { Artifact } from "@/types/artifacts";
import { ResourceNode } from "@/types/resource-node";
import { Artifacts } from "@/enums/artifacts";
import { DropPod } from "@/types/drop-pod";
import { PowerSlugs } from "@/types/power-slug";
import { Vehicles } from "@/types/vehicles";
import { Player } from "@/types/player";
import axios from "axios";
import { useSettingsStore } from "@/stores/settings";

import {
  BoundingBox,
  CoordinatesWithRotation,
  IDBoundingColorSlotBoxClassObject,
  LocationWithRotation,
} from "@/types/general";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataFilterExtension } from "@deck.gl/extensions";
import { hypertube_junction, hypertube_T } from "@/lib/polygons/hypertube";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { cubicBezier } from "motion";
import Link from "next/link";
import { generateIcons } from "@/public/map/markers";
import { images } from "@/public/map/images";
import { CLASSNAMED_PATH } from "@/public/map/paths";
import { vehicles } from "@/components/map/popup/vehicles";
import { players } from "@/components/map/popup/players";
import { Drone } from "@/types/drone";
import { Train } from "@/types/trains";
import { TrainStatus } from "@/enums/train";
import { CurrentFlyingMode } from "@/enums/drone";
import { Portal } from "@/types/portal";
import { HubTerminal } from "@/types/hub-terminal";
import { buildings } from "@/lib/buildings";
import { SpaceElevator } from "@/types/space-elevator";

const slugClassNames = ["BP_Crystal_C", "BP_Crystal_mk2_C", "BP_Crystal_mk3_C"];

const slugTier = {
  BP_Crystal_C: "MK1",
  BP_Crystal_mk2_C: "MK2",
  BP_Crystal_mk3_C: "MK3",
};

export default function MapPage() {
  const [icons, setIcons] = useState<any>({});

  useEffect(() => {
    const load = async () => {
      const allIcons = await generateIcons();
      setIcons(allIcons);
    };
    load();
  }, []);

  const MAP_VIEW = new OrthographicView({
    id: "2d-scene",
    flipY: false,
    controller: {
      dragRotate: false,
      // scrollZoom: { speed: 0.5}, TODO: Currently is broken (breaks the popups 🥲)
    },
  });

  const mapImg = new BitmapLayer({
    id: "map",
    image: "/map/map.avif",
    bounds: [-375e3 + 50301.83203125, -375e3, 375e3 + 50301.83203125, 375e3],
  });

  const [mapZoom, setZoomValue] = useState<any>(-10);
  const defaultZRange = [-25000, 200000];
  const [zRange, setZRange] = useState<any>(defaultZRange);

  const [dataVersion, setDataVersion] = useState<number>(0);
  const {
    baseURL,
    mapUseInGameColors,
    _hasHydrated,
    mapFetchSpeed,
    authToken,
    username,
  } = useSettingsStore();

  async function buildFilters() {
    let rawData;
    try {
      rawData = await (
        await axios.get(baseURL + layerStuff.resource_node.url)
      ).data;
    } catch {}
    if (rawData == null) return;

    const filters = new Map<string, { Name: string; extra: Set<string> }>();

    rawData.forEach((item: any) => {
      if (item.ClassName && item.Purity) {
        if (!filters.has(item.ClassName)) {
          filters.set(item.ClassName, {
            Name: item.Name || "",
            extra: new Set(),
          });
        }
        filters.get(item.ClassName)!.extra.add(item.Purity);
      }
    });

    const sortedFilters = Array.from(filters.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([className, { Name, extra }]) => ({
        layerId: "resource_node",
        className,
        name: Name,
        extra: Array.from(extra).sort(),
      }));

    const slugFilters = slugClassNames.map((slugClassName) => ({
      layerId: "slugs",
      className: slugClassName,
      name: `Slug ${slugTier[slugClassName as keyof typeof slugTier]}`,
      extra: [slugTier[slugClassName as keyof typeof slugTier]],
    }));

    const artifacts = [
      {
        layerId: "artifacts",
        className: Artifacts.MercerSphere,
        name: `Mercer Sphere`,
        extra: ["NoExtra"],
      },
      {
        layerId: "artifacts",
        className: Artifacts.Somersloop,
        name: "Somersloop",
        extra: ["NoExtra"],
      },
    ];

    const combinedFilters = [...sortedFilters, ...slugFilters, ...artifacts];

    const filterKeys = combinedFilters.map((item) =>
      item.extra.map((extra) => `${item.layerId}-${item.className}-${extra}`),
    );

    return [combinedFilters, filterKeys];
  }

  useEffect(() => {
    const nextUpdate = setTimeout(
      () => setDataVersion(dataVersion + 1),
      mapFetchSpeed,
    );
    return () => clearTimeout(nextUpdate);
  }, [dataVersion]);

  const [new_nyaa_filters, setNewNyaaFilters] = useState<string[]>([]);
  const [built_nyaa_filters, setBuiltNyaaFilters] = useState<any[]>([]);

  useEffect(() => {
    async function run() {
      if (!_hasHydrated) return null;
      const filters = await buildFilters();
      if (filters) setBuiltNyaaFilters(filters[0]);
    }

    run();
  }, [_hasHydrated]);

  const [nyaa, setUwU] = useState(() => structuredClone(layerStuff));

  function MakeRotationLayer(id: string) {
    const visible = nyaa[id].visible;
    return new IconLayer({
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: visible ? baseURL + nyaa[id].url + `#${dataVersion}` : [],
      getIcon: () => ({
        height: 92,
        url: images.Utils.Rotation,
        width: 72,
        anchorY: 66,
      }),
      getPosition: (d: any) => [d.location.x, d.location.y * -1],
      getAngle: (d) => -d.location.rotation,

      getSize: 72,
      id: `${id}_rotation`,
      updateTriggers: {
        visible: visible,
      },
      visible: visible,
    });
  }

  function MakeIconLayer({
    id,
    visible,
    getFilterValue,
    filterRange,
    getIconFunc,
    iconUrl,
  }: {
    id: string;
    visible: boolean;
    getFilterValue?: any;
    filterRange?: any;
    getIconFunc?: (d: any) => any;
    iconUrl?: string;
  }): any {
    let options: any = {
      autoHighlight: true,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: visible ? baseURL + nyaa[id].url + `#${dataVersion}` : [],
      getIcon: getIconFunc
        ? getIconFunc
        : () => ({
            height: 72,
            url: iconUrl,
            width: 72,
          }),
      getPosition: (d: any) => [d.location.x, d.location.y * -1],
      getSize: 70,
      highlightColor: [255, 255, 255, 20],
      id: id,
      pickable: true,
      updateTriggers: {
        visible: visible,
      },
      visible: visible,
    };
    if (getFilterValue != null && filterRange != null) {
      options = {
        ...options,
        getFilterValue: getFilterValue,
        filterRange: filterRange,
        extensions: [new DataFilterExtension({ filterSize: 1 })],
      };
    }
    return new IconLayer(options);
  }

  function MakePolygonLayer(
    id: string,
    visible: boolean,
    getLineWidth: number,
    getFillColor: any,
    getLineColor: any,
    getPolygon?: any,
  ) {
    return new PolygonLayer({
      autoHighlight: true,
      data: visible ? baseURL + nyaa[id].url + `#${dataVersion}` : [],
      getFillColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : getFillColor,

      getLineColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : getLineColor,
      getLineWidth: getLineWidth,
      getPolygon: getPolygon ? getPolygon : (d: any) => CalcBoundingBox(d),
      highlightColor: [255, 255, 255, 20],
      id: id,
      lineWidthMinPixels: 1,
      pickable: true,
      positionFormat: "XY",
      updateTriggers: {
        visible: visible,
      },
      visible: visible,
      getFilterValue: (d: any) => [Math.round(d.location.z)],
      filterRange: zRange,
      extensions: [new DataFilterExtension({ filterSize: 1 })],
    });
  }

  class IconPolygonLayer extends CompositeLayer<{
    id: string;
    visible: boolean;
    getLineWidth: number;
    iconUrl?: string;
    getFillColor?: any;
    getLineColor?: any;
    getIconFunc?: any;
  }> {
    renderLayers() {
      const {
        id,
        visible,
        iconUrl,
        getIconFunc,
        getFillColor,
        getLineColor,
        getLineWidth,
      } = this.props;

      const zoomedIn = this.context.viewport.zoom > -8;
      const data = visible ? baseURL + nyaa[id].url + `#${dataVersion}` : [];
      return [
        new IconLayer({
          autoHighlight: true,
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          data: data,
          getIcon: getIconFunc
            ? getIconFunc
            : () => ({
                height: 70,
                url: iconUrl,
                width: 70,
              }),
          getPosition: (d: any) => [d.location.x, d.location.y * -1],
          getSize: 70,
          highlightColor: [255, 255, 255, 20],
          id: `${id}-icon`,
          pickable: true,
          updateTriggers: {
            visible: visible && !zoomedIn,
          },
          visible: visible && !zoomedIn,
          getFilterValue: (d: any) => [Math.round(d.location.z)],
          filterRange: zRange,
          extensions: [new DataFilterExtension({ filterSize: 1 })],
        }),
        new PolygonLayer({
          autoHighlight: true,
          data: data,
          getFillColor: mapUseInGameColors
            ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
            : getFillColor,

          getLineColor: mapUseInGameColors
            ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
            : getLineColor,
          getLineWidth: getLineWidth,
          getPolygon: (d) => CalcBoundingBox(d),
          highlightColor: [255, 255, 255, 20],
          id: `${id}-polygon`,
          lineWidthMinPixels: 1,
          pickable: true,
          positionFormat: "XY",
          updateTriggers: {
            visible: visible && zoomedIn,
          },
          visible: visible && zoomedIn,
          getFilterValue: (d: any) => [Math.round(d.location.z)],
          filterRange: zRange,
          extensions: [new DataFilterExtension({ filterSize: 1 })],
        }),
      ];
    }
  }

  function MakePathLayer(id: string, getColor: any, visible: boolean) {
    return new PathLayer({
      id: id,
      data: visible ? baseURL + nyaa[id].url + `#${dataVersion}` : [],
      getPath: (d) =>
        d.SplineData.flatMap((point: CoordinatesWithRotation) => [
          point.x,
          point.y * -1,
        ]),
      getColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : getColor,
      positionFormat: "XY",
      visible: visible,
      updateTriggers: {
        visible: visible,
      },
      getWidth: (d) => {
        const baseWidth = 100;
        const calculatedWidth = baseWidth * (mapZoom > -8 ? 1 : 8);
        return calculatedWidth;
      },
      jointRounded: true,
      capRounded: true,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 20],
    });
  }

  class BeltLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["belts"].visible;

      return [
        MakePathLayer(
          "belts",
          (d: any) => {
            return getMkColor(d.Name, [153, 209, 219], 5);
          },
          visible,
        ),
        MakePolygonLayer(
          "belt_lifts",
          visible,
          20,
          (d: any) => {
            return getMkColor(d.Name, [153, 209, 219], 5);
          },
          (d: any) => {
            return getMkColor(d.Name, [153, 209, 219], 6);
          },
          (
            d: IDBoundingColorSlotBoxClassObject &
              BoundingBox &
              LocationWithRotation,
          ) => {
            let lift = d;
            let bbox = lift.BoundingBox;
            let location = lift.location;
            const rotation = -location.rotation % 360;
            const corners: Point[] = [
              [bbox.min.x, bbox.min.y * -1],
              [bbox.max.x, bbox.min.y * -1],
              [bbox.max.x, bbox.min.y * -1 - 20],
              [bbox.max.x + 200, bbox.min.y * -1 - 20],

              [bbox.max.x + 200, bbox.max.y * -1 + 20],
              [bbox.max.x, bbox.max.y * -1 + 20],
              [bbox.max.x, bbox.max.y * -1],
              [bbox.min.x, bbox.max.y * -1],
            ];

            const center: Point = [location.x, location.y * -1];

            const rotationInRadians = degreesToRadians(rotation + 90);

            return corners.map((corner) =>
              rotatePoint(corner, center, rotationInRadians),
            );
          },
        ),
        MakePolygonLayer(
          "splitter_merger",
          visible,
          20,
          (d: any) => {
            const colors = adjustColorShades([153, 209, 219], 5) as RGB[];
            const classNames = [
              "Build_ConveyorAttachmentMerger_C",
              "Build_ConveyorAttachmentSplitter_C",
              "Build_ConveyorAttachmentMergerPriority_C",
              "Build_ConveyorAttachmentSplitterSmart_C",
              "Build_ConveyorAttachmentSplitterProgrammable_C",
            ];

            return colors[classNames.indexOf(d.ClassName) ?? 5];
          },
          [41, 44, 60],
          (
            d: IDBoundingColorSlotBoxClassObject &
              BoundingBox &
              LocationWithRotation,
          ) => {
            let lift = d;
            let bbox = lift.BoundingBox;
            let location = lift.location;
            const rotation = -location.rotation % 360;

            let corners: Point[] = [
              [bbox.min.x, bbox.min.y * -1],
              [bbox.max.x, bbox.min.y * -1],
              [bbox.max.x, bbox.max.y * -1],
              [bbox.min.x, bbox.max.y * -1],
            ];

            if (
              d.ClassName.includes("Merger") ||
              d.ClassName.includes("Splitter")
            ) {
              let num1 = 20;
              let num2 = 20;
              let num3 = 60;
              let west: any = [];
              let north: any;
              let east: any = [];
              let south: any;

              if (d.ClassName.includes("Merger")) {
                num1 = 20;
                num2 = 20;
                num3 = 60;

                west = [
                  [bbox.min.x + num1, bbox.min.y * -1],
                  [bbox.min.x + num1, bbox.min.y * -1 + num2],
                  [bbox.max.x - num1, bbox.min.y * -1 + num2],
                  [bbox.max.x - num1, bbox.min.y * -1],
                ];
                east = [
                  [bbox.max.x - num1, bbox.max.y * -1],
                  [bbox.max.x - num1, bbox.max.y * -1 - num2],
                  [bbox.min.x + num1, bbox.max.y * -1 - num2],
                  [bbox.min.x + num1, bbox.max.y * -1],
                ];
              } else if (d.ClassName.includes("Splitter")) {
                num1 = 20;
                num2 = 20;
                num3 = 60;

                west = [
                  [bbox.min.x + num1, bbox.min.y * -1],
                  [bbox.min.x + num1, bbox.min.y * -1 + num3],
                  [bbox.max.x - num1, bbox.min.y * -1 + num3],
                  [bbox.max.x - num1, bbox.min.y * -1],
                ];
                east = [
                  [bbox.max.x - num1, bbox.max.y * -1],
                  [bbox.max.x - num1, bbox.max.y * -1 - num3],
                  [bbox.min.x + num1, bbox.max.y * -1 - num3],
                  [bbox.min.x + num1, bbox.max.y * -1],
                ];
              }
              north = [
                [bbox.max.x, bbox.min.y * -1 - num1],
                [bbox.max.x + num3, bbox.min.y * -1 - num1],
                [bbox.max.x + num3, bbox.max.y * -1 + num1],
                [bbox.max.x, bbox.max.y * -1 + num1],
              ];

              south = [
                [bbox.min.x, bbox.max.y * -1 + num1],
                [bbox.min.x - num2, bbox.max.y * -1 + num1],
                [bbox.min.x - num2, bbox.min.y * -1 - num1],
                [bbox.min.x, bbox.min.y * -1 - num1],
              ];

              corners = [
                ...west,
                [bbox.max.x, bbox.min.y * -1],
                ...north,
                [bbox.max.x, bbox.max.y * -1],
                ...east,
                [bbox.min.x, bbox.max.y * -1],
                ...south,
                [bbox.min.x, bbox.min.y * -1],
              ];
            }

            const center: Point = [location.x, location.y * -1];

            const rotationInRadians = degreesToRadians(rotation + 90);

            return corners.map((corner) =>
              rotatePoint(corner, center, rotationInRadians),
            );
          },
        ),
      ];
    }
  }

  class PipeLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["pipes"].visible;

      return [
        MakePathLayer(
          "pipes",
          (d: any) => {
            return getMkColor(d.Name, [255, 204, 153], 1);
          },
          visible,
        ),
        MakePolygonLayer(
          "pipe_junctions",
          visible,
          20,
          () => [255, 204, 153],
          () => adjustColorShades([255, 204, 153], 6)[6],
          (
            d: IDBoundingColorSlotBoxClassObject &
              BoundingBox &
              LocationWithRotation,
          ) => {
            let junction = d;
            let bbox = junction.BoundingBox;
            let location = junction.location;
            const rotation = -location.rotation % 360;

            let west = [
              [bbox.min.x + 20, bbox.min.y * -1],
              [bbox.min.x + 20, bbox.min.y * -1 + 40],
              [bbox.max.x - 20, bbox.min.y * -1 + 40],
              [bbox.max.x - 20, bbox.min.y * -1],
            ];
            let north = [
              [bbox.max.x, bbox.min.y * -1 - 20],
              [bbox.max.x + 40, bbox.min.y * -1 - 20],
              [bbox.max.x + 40, bbox.max.y * -1 + 20],
              [bbox.max.x, bbox.max.y * -1 + 20],
            ];
            let east = [
              [bbox.max.x - 20, bbox.max.y * -1],
              [bbox.max.x - 20, bbox.max.y * -1 - 40],
              [bbox.min.x + 20, bbox.max.y * -1 - 40],
              [bbox.min.x + 20, bbox.max.y * -1],
            ];
            let south = [
              [bbox.min.x, bbox.max.y * -1 + 20],
              [bbox.min.x - 40, bbox.max.y * -1 + 20],
              [bbox.min.x - 40, bbox.min.y * -1 - 20],
              [bbox.min.x, bbox.min.y * -1 - 20],
            ];

            let corners: Point[] = [
              ...west,
              [bbox.max.x, bbox.min.y * -1],
              ...north,
              [bbox.max.x, bbox.max.y * -1],
              ...east,
              [bbox.min.x, bbox.max.y * -1],
              ...south,
              [bbox.min.x, bbox.min.y * -1],
            ];

            const center: Point = [location.x, location.y * -1];

            const rotationInRadians = degreesToRadians(rotation + 90);

            return corners.map((corner) =>
              rotatePoint(corner, center, rotationInRadians),
            );
          },
        ),
      ];
    }
  }

  class HypertubeLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["hypertubes"].visible;

      return [
        MakePathLayer("hypertubes", () => [255, 100, 153], visible),
        MakePolygonLayer(
          "hypertube_entrances",
          visible,
          20,
          () => [255, 100, 153],
          () => adjustColorShades([255, 100, 153], 6)[6],
          (
            d: IDBoundingColorSlotBoxClassObject &
              BoundingBox &
              LocationWithRotation,
          ) => {
            let entrance = d;
            let bbox = entrance.BoundingBox;
            let location = entrance.location;
            const rotation = -location.rotation % 360;

            const corners: Point[] = [
              [bbox.min.x - 80, bbox.min.y * -1 + 120],
              [bbox.max.x - 80, bbox.min.y * -1 - 120],
              [bbox.max.x - 240, bbox.max.y * -1 - 120],
              [bbox.min.x - 240, bbox.max.y * -1 + 120],
            ];

            const center: Point = [location.x, location.y * -1];

            const rotationInRadians = degreesToRadians(rotation + 90);

            return corners.map((corner) =>
              rotatePoint(corner, center, rotationInRadians),
            );
          },
        ),
        MakePolygonLayer(
          "hypertube_junctions",
          visible,
          20,
          () => [255, 100, 153],
          () => adjustColorShades([255, 100, 153], 6)[6],
          (
            d: IDBoundingColorSlotBoxClassObject &
              BoundingBox &
              LocationWithRotation,
          ) => {
            let junction = d;
            let bbox = junction.BoundingBox;
            let location = junction.location;
            const rotation = -location.rotation % 360;

            let polygonScaled: Point[];
            let center: Point;
            let rotationInRadians;
            if (junction.ClassName === "Build_HypertubeTJunction_C") {
              const scaleFactor = 2;
              center = [location.x, -location.y];
              rotationInRadians = degreesToRadians(rotation);

              const polygonPositioned: Point[] = hypertube_T.map(
                (point: Point) => [
                  location.x + point[0] - 50,
                  -location.y + point[1],
                ],
              );

              const polygonFlipped: Point[] = polygonPositioned.map((p) => [
                2 * center[0] - p[0],
                p[1],
              ]);

              polygonScaled = polygonFlipped.map((p) =>
                scalePoint(p, center, scaleFactor),
              );
            } else {
              const scaleFactor = 0.8;
              center = [location.x, -location.y - 18];
              rotationInRadians = degreesToRadians(rotation + 270);

              const polygonPositioned: Point[] = hypertube_junction.map(
                (point: Point) => [
                  location.x + point[0],
                  -location.y + point[1],
                ],
              );

              polygonScaled = polygonPositioned.map((p) =>
                scalePoint(p, center, scaleFactor),
              );
            }
            return polygonScaled.map((p) =>
              rotatePoint(p, center, rotationInRadians),
            );
          },
        ),
      ];
    }
  }

  class VehicleLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["vehicles"].visible;

      return [
        new IconPolygonLayer({
          id: "truck_station",
          visible: visible,
          iconUrl: icons?.Buildings?.Build_TruckStation_C ?? images.Empty,
          getLineWidth: 20,
          getFillColor: hexToRgb("#91d7e3"),
          getLineColor: [41, 44, 60],
        }),
        MakeRotationLayer("vehicles"),
        MakeIconLayer({
          id: "vehicles",
          visible: visible,
          getIconFunc: (d: Vehicles) => {
            let img = images.Empty;
            const v = icons?.Vehicles?.[d.ClassName];

            if (v) {
              if (!d.HasFuelForRoundtrip) img = v.RunningOutOfFuel;
              else if (!d.HasFuel) img = v.OutOfFuel;
              else if (d.Autopilot) img = v.Auto;
              else if (!d.Autopilot && d.CurrentGear != 0) img = v.Manual;
              else if (
                !d.Autopilot &&
                d.CurrentGear == 0 &&
                Math.round(d.ForwardSpeed) == 0
              )
                img = v.Parked;
            }
            return {
              height: 70,
              width: 70,
              url: img,
            };
          },
        }),
      ];
    }
  }

  class TrainLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["train"].visible;

      return [
        MakePathLayer("train_rails", () => hexToRgb("#8839ef"), visible),
        new IconPolygonLayer({
          id: "train_station",
          visible: visible,
          getIconFunc: () => ({
            height: 70,
            url: icons?.Buildings?.Build_TrainStation_C ?? images.Empty,
            width: 70,
          }),
          getLineWidth: 20,
          getFillColor: hexToRgb("#8aadf4"),
          getLineColor: [41, 44, 60],
        }),
        MakeRotationLayer("train"),
        MakeIconLayer({
          id: "train",
          visible: visible,
          getIconFunc: (d: Train) => {
            let img = images.Empty;
            const v = icons?.Vehicles?.BP_Train_C;
            if (v) {
              if (d.Derailed) img = v.Derailed;
              else if (
                d.Status == TrainStatus.Parked ||
                (d.Status == TrainStatus.SelfDriving && !d.TimeTable.length)
              )
                img = v.Parked;
              else if (d.Status == TrainStatus.SelfDriving) img = v.Auto;
              else if (d.Status == TrainStatus.ManualDriving) img = v.Manual;
            }
            return { height: 70, width: 70, url: img };
          },
        }),
      ];
    }
  }

  class DroneLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      const visible = nyaa["drone"].visible;

      return [
        new IconPolygonLayer({
          id: "drone_station",
          visible: visible,
          iconUrl: icons?.Buildings?.Build_DroneStation_C ?? images.Empty,
          getLineWidth: 20,
          getFillColor: hexToRgb("#b7bdf8"),
          getLineColor: [41, 44, 60],
        }),
        MakeRotationLayer("drone"),
        MakeIconLayer({
          id: "drone",
          visible: visible,
          getIconFunc: (d: Drone) => {
            let img = images.Empty;
            const v = icons?.Vehicles?.BP_DroneTransport_C;

            if (v) {
              if (d.CurrentFlyingMode == CurrentFlyingMode.Flying)
                img = v.Flying;
              else if (d.CurrentFlyingMode == CurrentFlyingMode.Travelling)
                img = v.Travelling;
              else if (d.CurrentDestination == "No Destination")
                img = v.No_Destination;
              else if (!d.HasPairedStation) img = v.No_Route;
              else if (
                d.CurrentFlyingMode == CurrentFlyingMode.None ||
                d.CurrentFlyingMode == CurrentFlyingMode.Unknown
              )
                img = v.No_Route;
            }
            return {
              height: 70,
              width: 70,
              url: v && typeof v === "string" ? v : img,
            };
          },
        }),
      ];
    }
  }

  class PlayerLayer extends CompositeLayer<{
    uwu: string;
    ThisIsForUpdating: Function;
  }> {
    getPickingInfo({ info }: GetPickingInfoParams) {
      if (!info.layer || !info.sourceLayer) return info;
      info.layer = info.sourceLayer;
      return info;
    }
    renderLayers() {
      return [
        new IconLayer({
          coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
          data: nyaa["players"].visible
            ? baseURL + nyaa["players"].url + `#${dataVersion}`
            : [],
          getIcon: () => ({
            height: 92,
            url: images.Utils.Rotation,
            width: 72,
            anchorY: 66,
          }),
          getPosition: (d: any) => [d.location.x, d.location.y * -1],
          getAngle: (d) => -d.location.rotation,

          getSize: 72,
          id: "players_rotation",
          updateTriggers: {
            visible: nyaa["players"].visible,
          },
          visible: nyaa["players"].visible,
        }),
        MakeIconLayer({
          id: "players",
          visible: nyaa["players"].visible,
          getIconFunc: (d: Player) => ({
            url: d.Dead
              ? (icons?.Players?.Dead ?? images.Empty)
              : (d.Online as boolean)
                ? (icons?.Players?.Alive ?? images.Empty)
                : (icons?.Players?.Offline ?? images.Empty),
            width: 72,
            height: 72,
          }),
        }),
      ];
    }
  }

  const master = [
    MakeIconLayer({
      id: "slugs",
      visible: nyaa["slugs"].visible,
      getIconFunc: (d: PowerSlugs) => ({
        url: icons?.Slugs?.[d.ClassName] ?? images.Empty,
        width: 70,
        height: 70,
      }),
      filterRange: [1, 1],
      getFilterValue: (d: any) => {
        const layerFilters = new_nyaa_filters.filter((filter) =>
          filter.startsWith("slugs"),
        );
        const isInFilters =
          layerFilters.filter((filter) =>
            filter.split("-").includes(d.ClassName),
          ).length != 0;
        return layerFilters.length != 0 ? (isInFilters ? 1 : 0) : 1;
      },
    }),
    MakeIconLayer({
      id: "artifacts",
      visible: nyaa["artifacts"].visible,
      getIconFunc: (d: Artifact) => ({
        url: icons?.Artifacts?.[d.ClassName] ?? images.Empty,
        height: 70,
        width: 70,
      }),
      filterRange: [1, 1],
      getFilterValue: (d: any) => {
        const layerFilters = new_nyaa_filters.filter((filter) =>
          filter.startsWith("artifacts"),
        );
        const isInFilters =
          layerFilters.filter((filter) =>
            filter.split("-").includes(d.ClassName),
          ).length != 0;
        return layerFilters.length != 0 ? (isInFilters ? 1 : 0) : 1;
      },
    }),
    MakeIconLayer({
      id: "lizard_doggos",
      visible: nyaa["lizard_doggos"].visible,
      getIconFunc: (d: any) => ({
        url: icons?.Creatures?.[d.ClassName] ?? images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    MakeIconLayer({
      id: "drop_pod",
      visible: nyaa["drop_pod"].visible,
      getIconFunc: (d: DropPod) => ({
        url: icons?.Drop_Pods
          ? d.Opened
            ? d.Looted
              ? icons.Drop_Pods.Looted
              : icons.Drop_Pods.Not_Looted
            : d.RequiredPower != 0
              ? icons.Drop_Pods.Power
              : icons.Drop_Pods.Not_Open
          : images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    MakeIconLayer({
      id: "unlock_items",
      visible: nyaa["unlock_items"].visible,
      getIconFunc: (d: any) => ({
        url: icons?.Unlock_Items
          ? d.ClassName.includes("Tape")
            ? icons.Unlock_Items.Tape
            : d.ClassName.includes("Customization")
              ? icons.Unlock_Items.Customization
              : icons.Unlock_Items.Unlock
          : images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    MakeIconLayer({
      id: "resource_node",
      visible: nyaa["resource_node"].visible,
      getIconFunc: (d: ResourceNode) => ({
        url:
          icons?.Resources?.[d.ClassName][d.Purity][d.Exploited ? "v" : "x"] ??
          images.Empty,
        width: 70,
        height: 70,
      }),
      filterRange: [1, 1],
      getFilterValue: (d: any) => {
        const layerFilters = new_nyaa_filters.filter((filter) =>
          filter.startsWith("resource_node"),
        );
        const isInFilters =
          layerFilters.filter((filter) => {
            const stuff = filter.split("-");
            return stuff[1] == d.ClassName && stuff[2] == d.Purity;
          }).length != 0;
        return layerFilters.length != 0 ? (isInFilters ? 1 : 0) : 1;
      },
    }),

    new LineLayer({
      pickable: true,
      id: "cables",
      data: nyaa["cables"].visible
        ? baseURL + nyaa["cables"].url + `#${dataVersion}`
        : [],
      getColor: [44, 117, 255],
      getSourcePosition: (d: any) => [d["location0"].x, d["location0"].y * -1],
      getTargetPosition: (d: any) => [d["location1"].x, d["location1"].y * -1],
      getWidth: 2,
      visible: nyaa["cables"].visible,
      updateTriggers: {
        visible: nyaa["cables"].visible,
      },
    }),

    new BeltLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
    new PipeLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
    new TrainLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
    new VehicleLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
    new DroneLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
    new HypertubeLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),

    MakePolygonLayer(
      "factory",
      nyaa["factory"].visible,
      20,
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : (d: any) => {
            if ((d["ClassName"] as string).includes("Smelter"))
              return new Uint8Array(buildings.smelter.color);
            if ((d["ClassName"] as string).includes("Assembler"))
              return new Uint8Array(buildings.assembler.color);
            if ((d["ClassName"] as string).includes("Constructor"))
              return new Uint8Array(buildings.constructor.color);
            if ((d["ClassName"] as string).includes("Manufacturer"))
              return new Uint8Array(buildings.manufacturer.color);
            if ((d["ClassName"] as string).includes("HadronCollider"))
              return new Uint8Array(buildings.particle_accelerator.color);
            if ((d["ClassName"] as string).includes("Packager"))
              return new Uint8Array(buildings.packager.color);
            if ((d["ClassName"] as string).includes("Refinery"))
              return new Uint8Array(buildings.refinery.color);
            if ((d["ClassName"] as string).includes("Converter"))
              return new Uint8Array(buildings.converter.color);
            if ((d["ClassName"] as string).includes("Foundry"))
              return new Uint8Array(buildings.foundry.color);
            return [100, 100, 100, 100];
          },
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    ),
    MakePolygonLayer(
      "generators",
      nyaa["generators"].visible,
      20,
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : (d: any) => {
            if ((d["ClassName"] as string).includes("Coal"))
              return new Uint8Array(buildings.coal_generator.color);
            if ((d["ClassName"] as string).includes("GeneratorBiomass"))
              return new Uint8Array(buildings.biomass_generator.color);
            if ((d["ClassName"] as string).includes("IntegratedBiomass"))
              return new Uint8Array(
                buildings.biomass_generator_integrated.color,
              );
            if ((d["ClassName"] as string).includes("Fuel"))
              return new Uint8Array(buildings.fuel_generator.color);
            if ((d["ClassName"] as string).includes("Nuclear"))
              return new Uint8Array(buildings.nuclear_generator.color);
            return [100, 100, 100, 100];
          },
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    ),
    MakePolygonLayer(
      "extractors",
      nyaa["extractors"].visible,
      20,
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : () => [100, 100, 100, 100],
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    ),
    MakePolygonLayer(
      "fracking_activators",
      nyaa["extractors"].visible,
      20,
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : () => [100, 100, 100, 100],
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    ),
    MakePolygonLayer(
      "storage_inv",
      nyaa["storage_inv"].visible,
      20,
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : () => hexToRgb("#c6a0f6"),
      mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    ),
    new IconPolygonLayer({
      id: "space_elevator",
      visible: nyaa["space_elevator"].visible,
      getLineWidth: 20,
      getFillColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.PrimaryColor))
        : () => hexToRgb("#eed49f"),
      getLineColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
      getIconFunc: (d: SpaceElevator) => ({
        url:
          icons?.Buildings?.Build_SpaceElevator_C[
            d.FullyUpgraded
              ? "Fully_Upgraded"
              : d.UpgradeReady
                ? "Upgrade_Ready"
                : "Upgrade_Not_Ready"
          ] ?? images.Empty,
        height: 70,
        width: 70,
      }),
    }),

    new IconPolygonLayer({
      id: "radar",
      visible: nyaa["radar"].visible,
      getLineWidth: 20,
      getFillColor: () => hexToRgb("#f0c6c6"),
      getLineColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
      getIconFunc: (d: Portal) => ({
        url: icons?.Buildings?.Build_RadarTower_C ?? images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    new IconPolygonLayer({
      id: "switches",
      visible: nyaa["switches"].visible,
      iconUrl: images.Markers.Power,
      getLineWidth: 20,
      getFillColor: () => hexToRgb("#f0c6c6"),
      getLineColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
    }),
    MakeIconLayer({
      id: "hub",
      visible: nyaa["hub"].visible,
      getIconFunc: (d: HubTerminal) => ({
        url:
          icons?.Buildings?.Build_HubTerminal_C[
            !d.ShipDock
              ? "Ship_Returning"
              : !d.HasActiveMilestone
                ? "No_Milestone"
                : "Normal"
          ] ?? images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    new IconPolygonLayer({
      id: "portals",
      visible: nyaa["portals"].visible,
      getLineWidth: 20,
      getFillColor: () => hexToRgb("#f0c6c6"),
      getLineColor: mapUseInGameColors
        ? (d: any) => hexToRgb(toHex6(d.ColorSlot.SecondaryColor))
        : [41, 44, 60],
      getIconFunc: (d: Portal) => ({
        url: icons?.Buildings?.[d.ClassName] ?? images.Empty,
        width: 70,
        height: 70,
      }),
    }),
    new PlayerLayer({
      uwu: "uwu",
      ThisIsForUpdating: () => {},
    }),
  ];

  const [filterElement, setFilterElement] = useState<any>(null);

  useEffect(
    () =>
      setFilterElement(
        <table className="w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="text-left">
              <th className="p-1">Icon</th>
              <th className="p-1">Name</th>
              <th className="p-1 text-center">Options</th>
            </tr>
          </thead>
          <tbody>
            {built_nyaa_filters.map(
              ({
                className,
                name,
                extra,
                layerId,
              }: {
                className: string;
                name: string;
                extra: string[];
                layerId: string;
              }) => {
                const icon = `${CLASSNAMED_PATH}${className}.avif`;

                const visibleBadges = extra.filter((tier: string) =>
                  new_nyaa_filters.includes(`${layerId}-${className}-${tier}`),
                );

                const changedMark = visibleBadges.length > 0 && (
                  <div className="absolute right-[-2px] top-[-2px]">
                    <div
                      className="relative"
                      style={{
                        width: `${visibleBadges.length * 3}px`,
                        height: "8px",
                      }}
                    >
                      {visibleBadges.map((tier: string, i) => {
                        const color =
                          classNameColors[
                            className as keyof typeof classNameColors
                          ] ?? purityColors[tier];
                        return (
                          <div
                            key={tier}
                            className="rounded-full size-2 absolute border bg-card"
                            style={{
                              borderColor: `hsl(${color})`,
                              top: 0,
                              left: `${i * 3}px`,
                              zIndex: i,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );

                return (
                  <tr key={className} className="text-center border-t">
                    <td className="p-1">
                      <img src={icon} alt={className} className="size-6" />
                    </td>
                    <td className="p-1 text-left truncate max-w-[120px]">
                      {name}
                    </td>
                    <td className="p-1 relative w-auto">
                      {extra.length === 1 ? (
                        (() => {
                          const tier = extra[0];
                          const color =
                            classNameColors[
                              className as keyof typeof classNameColors
                            ] ?? purityColors[tier];
                          const filterKey = `${layerId}-${className}-${tier}`;
                          const isChecked =
                            new_nyaa_filters.includes(filterKey);
                          const toggle = () =>
                            setNewNyaaFilters((prev) =>
                              prev.includes(filterKey)
                                ? prev.filter((f) => f !== filterKey)
                                : [...prev, filterKey],
                            );

                          return (
                            <div
                              onClick={toggle}
                              className="inline-flex items-center justify-center size-5 rounded-full border cursor-pointer relative"
                              style={{
                                backgroundColor: `hsla(${color}, 0.2)`,
                                borderColor: `hsl(${color})`,
                              }}
                              title={tier}
                            >
                              {isChecked ? (
                                <Check className="size-4" />
                              ) : (
                                <X className="size-4" />
                              )}
                              {changedMark}
                            </div>
                          );
                        })()
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="inline-flex items-center justify-center size-5 rounded-full border cursor-pointer bg-muted hover:bg-muted/80 relative">
                              <p>+</p>
                              {changedMark}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="p-2 gap-2 inline-flex w-auto">
                            {extra.map((tier: string) => {
                              const color =
                                classNameColors[
                                  className as keyof typeof classNameColors
                                ] ?? purityColors[tier];
                              const filterKey = `${layerId}-${className}-${tier}`;
                              const isChecked =
                                new_nyaa_filters.includes(filterKey);
                              const toggle = () =>
                                setNewNyaaFilters((prev) =>
                                  prev.includes(filterKey)
                                    ? prev.filter((f) => f !== filterKey)
                                    : [...prev, filterKey],
                                );

                              return (
                                <div
                                  key={tier}
                                  onClick={toggle}
                                  className="inline-flex flex-col items-center gap-1 cursor-pointer text-sm px-2 w-[50px]"
                                >
                                  <div
                                    className="size-5 rounded-full border"
                                    style={{
                                      backgroundColor: `hsla(${color}, 0.2)`,
                                      borderColor: `hsl(${color})`,
                                    }}
                                  >
                                    {isChecked ? (
                                      <Check className="size-4 m-auto" />
                                    ) : (
                                      <X className="size-4 m-auto" />
                                    )}
                                  </div>
                                  <p>{tier}</p>
                                </div>
                              );
                            })}
                          </PopoverContent>
                        </Popover>
                      )}
                    </td>
                  </tr>
                );
              },
            )}
          </tbody>
        </table>,
      ),
    [built_nyaa_filters, new_nyaa_filters],
  );

  type ChatMessage = {
    ServerTimeStamp: number;
    Sender: string;
    Type: "System" | "Player";
    Message: string;
    Color: {
      R: number;
      G: number;
      B: number;
      A: number;
    };
  };

  const [chatData, setChatData] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!_hasHydrated) return;
    const interval = setInterval(async () => {
      try {
        let data: ChatMessage[] = (
          await axios.get(baseURL + "/getChatMessages")
        ).data;
        data = data.map((message) => {
          return message.Type == "System"
            ? {
                ...message,
                Sender: "System",
                Message: message.Message.replace(
                  "<PlayerName/>",
                  message.Sender,
                ),
              }
            : message;
        });
        setChatData(data);
      } catch {}
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [_hasHydrated]);

  const [message, setMessage] = useState("");
  const [isChatOpen, setChatOpen] = useState(false);

  const sendMessage = React.useCallback(async () => {
    if (username.trim() == "" || authToken.trim() == "") return;
    if (!message.trim()) return;
    try {
      const response = await axios.post(
        baseURL + "/sendChatMessage",
        {
          message,
          sender: username,
        },
        {
          headers: {
            "X-FRM-Authorization": authToken,
            "Content-Type": "application/json",
          },
        },
      );
      if (response.status === 200) setMessage("");
      return response.status === 200
        ? { status: "OK", message: "Message Sent!" }
        : { status: "Error", message: response.data.error };
    } catch (error: any) {
      return {
        status: "Error",
        message: error.message || "Failed to send message",
      };
    }
  }, [baseURL, authToken, username, message]);

  const [isLayersFiltersOpen, setLayersFiltersOpen] = useState(false);

  return (
    <div>
      <div className="absolute bottom-0 left-1/2 w-1/2 -translate-x-1/2 flex flex-col z-20">
        <div className={"relative h-10"}>
          <div className="flex absolute h-10 left-0 z-2 w-65">
            <div
              className="bg-card border-t border-l p-1 text-sm whitespace-nowrap w-55 rounded-tl-md border-b-0 flex items-center"
              style={{ fontSize: "initial" }}
            >
              <p className={"ml-3 w-full"}>Zoom: {mapZoom}</p>
              <Separator orientation={"vertical"} className={"mx-1"} />
              <Button
                variant={"secondary"}
                className={`h-8 w-1/2 ${isLayersFiltersOpen ? "bg-input/60" : "bg-card"} border inline-flex`}
                onClick={() => setLayersFiltersOpen(!isLayersFiltersOpen)}
              >
                <Layers /> Layers
              </Button>
            </div>
            <svg
              className={"h-10 text-card -ml-[1px]  w-10"}
              viewBox="1 0 15 15"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 15 C8 15 8 0 1 0 V15 H8 H16 Z" fill="currentColor" />

              <path
                d="M16 15 C8 15 8 0 1 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className={"stroke-border"}
              />
            </svg>
          </div>

          <div className="flex absolute h-10 right-0 z-2 w-35">
            <svg
              className="h-10 text-card -mr-[1px] transform -scale-x-100"
              viewBox="1 0 15 15"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M16 15 C8 15 8 0 1 0 V15 H8 H16 Z" fill="currentColor" />
              <path
                d="M16 15 C8 15 8 0 1 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="stroke-border"
              />
            </svg>

            <div
              className="bg-card border-t border-r p-1 text-sm whitespace-nowrap w-fit rounded-tr-md border-b-0 flex justify-center items-center"
              style={{ fontSize: "initial" }}
            >
              {username.trim() == "" || authToken.trim() == "" ? (
                <Tooltip>
                  <TooltipTrigger
                    className={"h-8 w-20 mr-3 rounded-md overflow-hidden"}
                  >
                    <Link
                      href={
                        _hasHydrated
                          ? location.origin +
                            `/settings${username.trim() == "" || authToken.trim() == "" ? (username.trim() == "" ? "#username" : "#authorization") : ""}`
                          : ""
                      }
                    >
                      <Button
                        variant={"secondary"}
                        className={`h-8 w-20 mr-3 bg-card border`}
                        disabled={
                          username.trim() == "" || authToken.trim() == ""
                        }
                        asChild
                      >
                        <span>
                          <MessageCircle className="text-muted-foreground" />
                        </span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className={"bg-card text-primary border"}>
                    <p>
                      To use chat feature please go to settings and set it up!
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant={"secondary"}
                  className={`h-8 w-20 mr-3 ${isChatOpen ? "bg-input/60" : "bg-card"} border`}
                  onClick={() => setChatOpen(() => !isChatOpen)}
                  disabled={username.trim() == "" || authToken.trim() == ""}
                >
                  <MessageCircle />
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isChatOpen && (
              <div
                className={
                  "absolute overflow-hidden w-full h-150 left-1/2 bottom-0 -translate-x-1/2"
                }
              >
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{
                    y: 0,
                  }}
                  transition={{
                    type: "spring",
                    bounce: 0,
                  }}
                  exit={{ y: "100%" }}
                  className={
                    "absolute bg-card w-full h-150 left-1/2 bottom-0 -translate-x-1/2 rounded-t-md border overflow-hidden flex flex-col pointer-events-auto border-b-0"
                  }
                >
                  <ScrollArea
                    className="p-3 flex-1 overflow-y-auto flex flex-col gap-1 scrollarea-child-target border-b"
                    type={"always"}
                  >
                    {chatData.map((message, index) => {
                      const isUser = message.Sender == username;
                      const [r, g, b, a] = rgbaFloatToRGBA(message.Color);
                      return (
                        <motion.div
                          initial={{ x: isUser ? "105%" : "-105%" }}
                          animate={{ x: 0 }}
                          transition={{
                            ease: "anticipate",
                            duration: 1.5,
                            delay: 0.1 * index,
                          }}
                          key={message.ServerTimeStamp + message.Sender}
                          className={`max-w-[80%] p-3 rounded-md shadow-sm border space-y-1 right-0 my-1 overflow-hidden  ${
                            isUser
                              ? "self-end rounded-br-none"
                              : `self-start rounded-bl-none`
                          }`}
                          style={{
                            borderColor:
                              message.Sender === "System"
                                ? "var(--color-blue-400)"
                                : `rgb(${r},${g},${b})`,
                            color:
                              message.Sender === "System"
                                ? "var(--color-blue-400)"
                                : `rgb(${r},${g},${b})`,
                            backgroundColor:
                              message.Sender === "System"
                                ? "color-mix(in oklab, var(--color-blue-400) /* oklch(70.7% 0.165 254.624) */ 10%, transparent)"
                                : `rgb(${r},${g},${b},0.1)`,
                          }}
                        >
                          <p className="font-semibold text-sm mb-1 ">
                            {message.Type == "System"
                              ? message.Sender
                              : message.Sender
                                ? message.Sender
                                : "FRM"}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-all">
                            {message.Message}
                          </p>
                        </motion.div>
                      );
                    })}
                  </ScrollArea>
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                    }}
                    transition={{
                      ease: "anticipate",
                      duration: 1.5,
                    }}
                    className="flex p-3 space-x-2 ml-65 mr-35"
                  >
                    <Input
                      placeholder="Type your message..."
                      className="flex-1 rounded-md border px-3 py-2"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendMessage();
                      }}
                    />
                    <Button
                      className="px-5 py-2 rounded-md transition"
                      onClick={sendMessage}
                      disabled={message.trim() == ""}
                    >
                      Send
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-card border p-4 flex flex-col items-center gap-2">
          <div className="flex w-full gap-6 items-center">
            <Input
              type="number"
              min={defaultZRange[0]}
              max={zRange[1]}
              value={zRange[0]}
              className="text-center"
              onChange={(e) => {
                const newValue = Math.max(
                  defaultZRange[0],
                  Math.min(Number(e.currentTarget.value), zRange[1]),
                );
                setZRange([newValue, zRange[1]]);
              }}
            />
            <Slider
              defaultValue={defaultZRange}
              min={defaultZRange[0]}
              max={defaultZRange[1]}
              step={1}
              value={zRange}
              onValueChange={(value) => setZRange(value)}
            />
            <Input
              type="number"
              min={zRange[0]}
              max={defaultZRange[1]}
              value={zRange[1]}
              className="text-center"
              onChange={(e) => {
                const newValue = Math.min(
                  defaultZRange[1],
                  Math.max(Number(e.currentTarget.value), zRange[0]),
                );
                setZRange([zRange[0], newValue]);
              }}
            />
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isLayersFiltersOpen && (
          <motion.div
            className={
              "absolute left-0 top-0 z-10 h-[100vh] bg-card border-r p-2"
            }
            initial={{ x: "-100%" }}
            animate={{
              x: 0,
            }}
            exit={{
              x: "-100%",
            }}
            transition={{
              ease: cubicBezier(0.36, 1, 0, 1),
              duration: 1,
            }}
          >
            <h1 className={"text-2xl font-semibold text-center"}>
              Layers & Filters
            </h1>
            <ScrollArea className={"h-[90vh] mt-1"} type={"scroll"}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 bg-card rounded-2xl shadow-inner max-h-[80vh] overflow-y-auto border">
                {Object.entries(nyaa).map(([key, value]) => {
                  // @ts-ignore
                  if (layerStuff[key].with != null) return null;
                  const uwuLayer = layerStuff[key];
                  return (
                    <Tooltip key={key}>
                      <TooltipTrigger>
                        <Toggle
                          asChild
                          defaultPressed={value.visible}
                          onPressedChange={(pressed) => {
                            value.visible = pressed;
                            setUwU(nyaa);
                          }}
                          pressed={value.visible}
                          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl border border-[hsl(29,75%,65%)] data-[state=on]:bg-[hsla(29,75%,65%,0.2)] hover:bg-[hsla(29,75%,65%,0.1)] p-5"
                        >
                          <div>
                            <Avatar className="size-8">
                              <AvatarImage src={uwuLayer.icon} />
                              <AvatarFallback>
                                {key.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent className="bg-card text-primary border">
                        <p>{uwuLayer.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              <Separator className={"my-[15px]"} />

              <div className={"gap-2 flex-col flex w-full"}>
                {filterElement}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      <DeckGL
        layers={[mapImg, ...master]}
        views={MAP_VIEW}
        initialViewState={{
          target: [0, 0, 0],
          zoom: -10,
          maxZoom: 0,
          minZoom: -10,
        }}
        onViewStateChange={({ viewState }) => {
          setZoomValue(Math.round(viewState.zoom as number));
        }}
        style={{
          height: "100%",
          width: "100%",
          position: "fixed",
          backgroundColor: "transparent",
          overflow: "hidden",
        }}
        getTooltip={useCallback(
          ({ object, layer }: PickingInfo) =>
            object && {
              html: makePopup(layer, object),
              style: {
                backgroundColor: "transparent",
              },
            },
          [],
        )}
      />
    </div>
  );
}
