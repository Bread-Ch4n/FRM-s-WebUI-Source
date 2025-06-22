import React from "react";
import { LizardDoggo } from "@/types/lizard_doggo";

export function unlock_items(data: any) {
  let popup = {
    title:
      data.features.properties.type == "Player Customization"
        ? "Player Customization"
        : data.features.properties.type == "Cassette Tape"
          ? data.features.properties.name
          : "Unlock Item",
    description: (
      <ul className="my-2 ml-6 list-disc [&>li]:mt-2">
        {data["Unlocks"].map((item: { Name: string; ClassName: string }) => {
          return <li key={item.Name}>{item.Name}</li>;
        })}
      </ul>
    ),
  };

  return {
    popup: popup,
  };
}
