"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { formatCep, formatDistance, formatDuration } from "@router-map/shared";
import { GripVerticalIcon, PackageIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type Stop, addressLine, cityLine } from "@/lib/types";

type Props = {
  stops: Stop[];
  legsByStop: Map<string, { distance: number; duration: number }>;
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
  activeId: string | null;
  onHover: (id: string | null) => void;
};

export function StopList({ stops, legsByStop, onMove, onRemove, activeId, onHover }: Props) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return;
    onMove(result.source.index, result.destination.index);
  }

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-muted-foreground">
        <PackageIcon className="size-6 opacity-60" />
        <p className="text-sm">Nenhuma entrega ainda.</p>
        <p className="text-xs">Digite um CEP acima para adicionar paradas.</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="stops">
        {(provided) => (
          <ol ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col">
            {stops.map((stop, index) => {
              const leg = legsByStop.get(stop.id);
              return (
                <Draggable key={stop.id} draggableId={stop.id} index={index}>
                  {(drag, snapshot) => (
                    <li
                      ref={drag.innerRef}
                      {...drag.draggableProps}
                      onMouseEnter={() => onHover(stop.id)}
                      onMouseLeave={() => onHover(null)}
                      className="pb-2"
                    >
                      <div
                        className={cn(
                          "group flex items-center gap-2 rounded-xl border bg-card p-2 pr-1 transition-shadow",
                          snapshot.isDragging && "shadow-lg ring-2 ring-primary/30",
                          activeId === stop.id && !snapshot.isDragging && "border-primary/40 bg-primary/5",
                        )}
                      >
                        <span
                          {...drag.dragHandleProps}
                          aria-label={`Arrastar entrega ${index + 1}`}
                          className="cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        >
                          <GripVerticalIcon className="size-4" />
                        </span>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{addressLine(stop.address)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            <span className="font-mono">{formatCep(stop.address.cep)}</span> · {cityLine(stop.address)}
                          </p>
                          {leg && (
                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                              +{formatDistance(leg.distance)} · {formatDuration(leg.duration)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remover entrega"
                          onClick={() => onRemove(stop.id)}
                          className="text-muted-foreground opacity-60 group-hover:opacity-100"
                        >
                          <XIcon />
                        </Button>
                      </div>
                    </li>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </ol>
        )}
      </Droppable>
    </DragDropContext>
  );
}
