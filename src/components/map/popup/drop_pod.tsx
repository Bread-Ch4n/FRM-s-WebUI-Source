import React from "react";
import { colors } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { DropPod } from "@/types/drop-pod";
import { BoolBadge } from "@/components/map/popup";

export function drop_pod(data: DropPod) {
  const isOpen = data.Opened;
  const isLooted = data.Looted;
  const requiresPower = data["RequiredPower"] !== 0;

  let popup_color = isOpen
    ? isLooted
      ? colors.green
      : colors.white
    : requiresPower
      ? colors.yellow
      : colors.red;
  let popup = {
    title: "Drop Pod",
    description: (
      <div>
        <div className={"flex flex-col items-center " + "gap-1"}>
          {!isOpen && !requiresPower && data.RequiredItem.Name != "N/A" && (
            <Badge
              style={{
                backgroundColor: `hsla(${popup_color}, 0.2)`,
                borderColor: `hsl(${popup_color})`,
                color: `hsl(${popup_color})`,
              }}
              className="w-full justify-center border relative mt-1"
              variant="outline"
            >
              {`${data.RequiredItem.Name} ${data.RequiredItem.Amount}`}
            </Badge>
          )}

          {!isOpen && requiresPower && (
            <Badge
              style={{
                backgroundColor: "hsla(40deg, 62%, 73%, 0.2)",
                borderColor: "hsl(40deg, 62%, 73%)",
                color: "hsl(40deg, 62%, 73%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              className={"w-full justify-center border relative"}
              variant={"outline"}
            >
              <Zap className="absolute left-[5px]" />
              {data["RequiredPower"]} MW
            </Badge>
          )}

          <BoolBadge
            bool={isLooted}
            text={data["Looted"] ? "Looted" : "Not Looted"}
          />
          <BoolBadge
            bool={isOpen}
            text={data["Opened"] ? "Open" : "Not Open"}
          />
        </div>
      </div>
    ),
  };

  return {
    popup: popup,
    popup_color: popup_color,
  };
}
