import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import React, { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { colors, dev } from "@/lib/constants";
import { Layer } from "deck.gl";
import { IDClassObject } from "@/types/general";
import { Player } from "@/types/player";
import { TruckStation, Vehicles } from "@/types/vehicles";
import { Drone, DroneStation } from "@/types/drone";
import { Train, TrainStation } from "@/types/trains";
import { DropPod } from "@/types/drop-pod";
import { PowerSlugs } from "@/types/power-slug";
import { RadarTower } from "@/types/radar-tower";
import { SpaceElevator } from "@/types/space-elevator";
import { ResourceNode } from "@/types/resource-node";
import { HubTerminal } from "@/types/hub-terminal";
import { Artifact } from "@/types/artifacts";
import { players } from "@/components/map/popup/players";
import { truck_station, vehicles } from "@/components/map/popup/vehicles";
import { drone, drone_station } from "@/components/map/popup/drone";
import { train, train_station } from "@/components/map/popup/train";
import { radio_tower } from "@/components/map/popup/radio_tower";
import { slugs } from "@/components/map/popup/slugs";
import { space_elevator } from "@/components/map/popup/space_elevator";
import { drop_pod } from "@/components/map/popup/drop_pod";
import { resources } from "@/components/map/popup/resources";
import { factory } from "@/components/map/popup/factory";
import { generators } from "@/components/map/popup/generators";
import { hub } from "@/components/map/popup/hub";
import { artifacts } from "@/components/map/popup/artifacts";
import { belts, splitter_merger } from "@/components/map/popup/belts";
import { pipe_junctions, pipes } from "@/components/map/popup/pipes";
import { storage_inv } from "@/components/map/popup/storage";
import { lizard_doggos } from "@/components/map/popup/lizard_doggos";
import { LizardDoggo } from "@/types/lizard_doggo";
import { unlock_items } from "@/components/map/popup/unlock_items";
import { extractors } from "@/components/map/popup/extractors";

export const BoolBadge = ({
  bool,
  text,
  removeIcons,
}: {
  bool: boolean;
  text: string;
  removeIcons?: boolean;
}) => (
  <Badge
    style={{
      backgroundColor: `hsla(${bool ? colors.green : colors.red}, 0.2)`,
      borderColor: `hsl(${bool ? colors.green : colors.red})`,
      color: `hsl(${bool ? colors.green : colors.red})`,
    }}
    className="w-full justify-center items-center border relative inline-flex"
    variant="outline"
  >
    {removeIcons != true &&
      (bool ? (
        <Check className="size-4 absolute left-[5px]" />
      ) : (
        <X className="size-4 absolute left-[5px]" />
      ))}
    {text}
  </Badge>
);

export const makePopup = (layer: Layer | any, json: IDClassObject) => {
  const layerId: string = layer.id;
  let popup: {
    title: string | ReactElement<any>;
    description: string | ReactElement<any>;
  } = {
    title: "",
    description: <></>,
  };

  let popup_color = "229deg,13%,52%";

  const original_text_color = popup_color;
  let text_color = popup_color;

  switch (layerId) {
    case "players": {
      const result = players(json as Player);
      popup.title = result.popup.title;
      popup_color = result.popup_color;
      break;
    }
    case "vehicles": {
      const result = vehicles(json as Vehicles);
      popup = result.popup;
      break;
    }
    case "truck_station": {
      const result = truck_station(json as TruckStation);
      popup = result.popup;
      break;
    }
    case "drone": {
      const result = drone(json as Drone);
      popup = result.popup;
      break;
    }
    case "drone_station": {
      const result = drone_station(json as DroneStation);
      popup = result.popup;
      break;
    }
    case "train": {
      const result = train(json as Train);
      popup = result.popup;
      break;
    }
    case "train_station": {
      const result = train_station(json as TrainStation);
      popup = result.popup;
      break;
    }
    case "radio_tower": {
      const result = radio_tower(json as RadarTower);
      popup.title = result.popup.title;
      break;
    }
    case "slugs": {
      const result = slugs(json as PowerSlugs);
      popup.title = result.popup.title;
      popup_color = result.popup_color;
      break;
    }
    case "space_elevator": {
      const result = space_elevator(json as SpaceElevator);
      popup = result.popup;
      popup_color = result.popup_color;
      break;
    }
    case "drop_pod": {
      const result = drop_pod(json as unknown as DropPod);
      popup = result.popup;
      popup_color = result.popup_color;
      break;
    }
    case "resource_node": {
      const result = resources(json as ResourceNode);
      popup = result.popup;
      popup_color = result.popup_color;
      break;
    }
    case "factory": {
      const result = factory(json as any); // TODO: Add factory type
      popup = result.popup;
      break;
    }
    case "generators": {
      const result = generators(json as any); // TODO: Add generators type
      popup = result.popup;
      break;
    }
    case "hub": {
      const result = hub(json as HubTerminal);
      popup = result.popup;
      break;
    }
    case "artifacts": {
      const result = artifacts(json as Artifact);
      popup.title = result.popup.title;
      popup_color = result.popup_color;
      break;
    }
    case "belts": {
      const result = belts(json as any, layer); // TODO: Add belts type
      popup = result.popup;
      popup_color = result.popup_color;
      text_color = result.text_color;
      break;
    }
    case "splitter_merger": {
      const result = splitter_merger(json as any); // TODO: Add splitter_merger type
      popup = result.popup;
      popup_color = result.popup_color;
      text_color = result.text_color;
      break;
    }
    case "pipes": {
      const result = pipes(json as any, layer); // TODO: Add pipes type
      popup = result.popup;
      popup_color = result.popup_color;
      text_color = result.text_color;
      break;
    }
    case "pipe_junctions": {
      const result = pipe_junctions(json as any); // TODO: Add pipe_junctions type
      popup.title = result.popup.title;
      popup_color = result.popup_color;
      text_color = result.text_color;
      break;
    }
    case "storage_inv": {
      const result = storage_inv(json as any); // TODO: Add storage inv type
      popup = result.popup;
      break;
    }
    case "lizard_doggos": {
      const result = lizard_doggos(json as LizardDoggo);
      popup = result.popup;
      break;
    }
    case "unlock_items": {
      const result = unlock_items(json as any);
      popup = result.popup;
      break;
    }
    case "extractors": {
      const result = extractors(json as any);
      popup = result.popup;
      break;
    }
    default: {
      let data = json as any;
      popup = {
        title: data.Name ?? data.ClassName ?? "Unknown",
        description: `ID: ${data["ID"]}`,
      };
      break;
    }
  }

  if (original_text_color == text_color && text_color != popup_color)
    text_color = popup_color;

  return renderToString(
    <Card
      className="relative backdrop-blur-md bg-card border overflow-hidden"
      style={{
        borderColor: `hsl(${popup_color})`,
        color: `hsl(${text_color})`,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-inherit"
        style={{
          backgroundColor: `hsla(${popup_color}, 0.4)`,
          zIndex: 0,
        }}
      />
      <div className="relative z-10">
        <CardContent>
          <Badge
            className="w-full justify-center items-center border relative inline-flex text-xl py-1 mb-1"
            style={{
              backgroundColor: `hsla(${text_color},0.2)`,
              borderColor: `hsl(${text_color})`,
              color: `hsl(${text_color})`,
            }}
            variant={"outline"}
          >
            {typeof popup.title === "string" ? (
              <CardTitle>{popup.title}</CardTitle>
            ) : (
              popup.title
            )}
          </Badge>
          {typeof popup.description === "string" ? (
            <CardDescription>{popup.description}</CardDescription>
          ) : (
            popup.description
          )}
          {dev && <CardDescription>{json.ClassName}</CardDescription>}
          {dev && <CardDescription>{layerId}</CardDescription>}
          {dev && (
            <CardDescription>
              <p>X: {(json as any).location.x}</p>
              <p>Y: {(json as any).location.y}</p>
              <p>Z: {(json as any).location.z}</p>
              {(json as any).location.rotation && (
                <p>Rotation: {(json as any).location.rotation}</p>
              )}
            </CardDescription>
          )}
        </CardContent>
      </div>
    </Card>,
  );
};
