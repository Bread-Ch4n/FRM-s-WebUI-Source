import { Menubar, MenubarMenu } from "@/components/ui/menubar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Factory,
  HeartHandshake,
  Home,
  Map,
  Plane,
  PlugZap,
  Printer,
  Settings,
} from "lucide-react";
import React from "react";

function Navigation() {
  return (
    <Menubar
      className={
        "h-15 z-3 fixed justify-center w-fit left-1/2 -translate-x-1/2 p-5 py-7 rounded-none border-0 border-b top-0"
      }
    >
      <svg
        className={"size-15 text-card ml-[1px] absolute -left-15 scale-[-1]"}
        viewBox="1 0 15 15"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16 15 C8 15 8 0 1 0 V15 H8 H16 Z" fill="currentColor" />

        <path
          d="M16 15 C8 15 8 0 1 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          className={"stroke-border"}
        />
      </svg>
      <MenubarMenu>
        <Link href="/">
          <Button variant="secondary">
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </Link>
        <Link href="/thanks">
          <Button variant="secondary">
            <HeartHandshake className="mr-2 h-4 w-4" />
            Thanks
          </Button>
        </Link>
        <Link href="/resourcesink">
          <Button variant="secondary">
            <Printer className="mr-2 h-4 w-4" /> Resource Sink
          </Button>
        </Link>
        <Link href="/map">
          <Button variant="secondary">
            <Map className="mr-2 h-4 w-4" /> Map
          </Button>
        </Link>
        <Link href="/power">
          <Button variant="secondary">
            <PlugZap className="mr-2 h-4 w-4" />
            Power
          </Button>
        </Link>
        <Link href="/drone">
          <Button variant="secondary">
            <Plane className="mr-2 h-4 w-4" />
            Drone
          </Button>
        </Link>
        <Link href="/overallprod">
          <Button variant="secondary">
            <Factory className="mr-2 h-4 w-4" />
            Overall Prod
          </Button>
        </Link>
        <Link href="/detailedprod">
          <Button variant="secondary">
            <Factory className="mr-2 h-4 w-4" />
            Detailed Prod
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="secondary">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </MenubarMenu>
      <svg
        className={"size-15 text-card mr-[1px] absolute -right-15 scale-y-[-1]"}
        viewBox="1 0 15 15"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16 15 C8 15 8 0 1 0 V15 H8 H16 Z" fill="currentColor" />

        <path
          d="M16 15 C8 15 8 0 1 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.3"
          className={"stroke-border"}
        />
      </svg>
    </Menubar>
  );
}

export default Navigation;
