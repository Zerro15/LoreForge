import { MapPinned } from "lucide-react";
import type { Location, LocationPreview } from "@/lib/types";
import { Badge, Card, SecretBlock } from "./ui";

export function LocationCard({
  location,
  parentName
}: {
  location: Location | LocationPreview;
  parentName?: string;
}) {
  const full = location as Location;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{location.name}</h3>
          <p className="mt-1 text-sm text-[#9CA3AF]">
            {location.location_type ?? "Локация"}
            {parentName ? ` / ${parentName}` : ""}
          </p>
        </div>
        <Badge tone={location.visibility === "public" ? "green" : "gold"}>
          <MapPinned size={13} />
          {location.visibility}
        </Badge>
      </div>

      <p className="text-sm leading-6 text-[#c7ccd6]">
        {location.public_description ?? "Описание локации пока пустое."}
      </p>

      {location.state_text ? (
        <div className="mt-4 rounded-2xl border border-[#273244] bg-[#171A26]/70 p-3 text-sm text-[#9CA3AF]">
          {location.state_text}
        </div>
      ) : null}

      {"secret_description" in full && full.secret_description ? (
        <div className="mt-5">
          <SecretBlock>{full.secret_description}</SecretBlock>
        </div>
      ) : null}
    </Card>
  );
}
