"use client";
import Link from "next/link";
import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { MagicCard } from "@/components/magicui/magic-card";

const cards = [
  {
    title: "Documentation",
    link: "https://docs.ficsit.app/ficsitremotemonitoring/latest/index.html",
    description: "FRM Documentation",
  },
  {
    title: "GitHub",
    link: "https://github.com/porisius/FicsitRemoteMonitoring",
    description: "FRM's source code on GitHub",
  },
  {
    title: "Discord",
    link: "https://discord.com/invite/c6446HTHpu",
    description: "The official discord server",
  },
];

export default function Home() {
  return (
    <div className={"size-full"}>
      <div
        className={
          "grid grid-cols-3 gap-[5px] m-[5px] mt-[25px] justify-center"
        }
      >
        {cards.map((card, i) => (
          <Link
            href={card.link}
            className={"text-center w-full h-full p-0 relative z-1 "}
            key={i}
          >
            <MagicCard
              className={"rounded-md"}
              gradientFrom={"#e8a361"}
              gradientTo={"#ca6d35"}
            >
              <div className="p-4">
                <h1 className={"leading-none font-semibold"}>{card.title}</h1>
                <span className={"text-muted-foreground text-sm"}>
                  {card.description}
                </span>
              </div>
            </MagicCard>
          </Link>
        ))}
      </div>
      <div className={"absolute inset-0 w-[100vw] overflow-hidden"}>
        <AnimatedGridPattern
          color={"#e8a361"}
          numSquares={100}
          duration={0.2}
          repeatDelay={1}
          className={"skew-y-12 inset-y-[-20%] h-[140vh]"}
        />
      </div>
    </div>
  );
}
