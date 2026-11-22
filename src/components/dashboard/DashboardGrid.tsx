"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { blockLabel, type BlockSize, type LayoutItem } from "@/lib/dashboardLayout";

// Static classes so Tailwind keeps them
const SPAN: Record<BlockSize, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
};

const SIZES: { value: BlockSize; label: string }[] = [
  { value: 1, label: "1/3" },
  { value: 2, label: "2/3" },
  { value: 3, label: "Full" },
];

function SortableBlock({
  item,
  editing,
  onSize,
  children,
}: {
  item: LayoutItem;
  editing: boolean;
  onSize: (size: BlockSize) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative min-w-0 ${SPAN[item.size]} ${isDragging ? "z-30 opacity-80" : ""}`}
    >
      {editing && (
        <div className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/5">
          <div
            className="absolute left-2 top-2 flex items-center gap-1 rounded-lg border bg-card px-1.5 py-1 shadow-md"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="cursor-grab rounded p-0.5 text-sky-600 hover:bg-sky-500/10 active:cursor-grabbing"
              aria-label={`Move ${blockLabel(item.id)}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="pr-1 text-[11px] font-semibold text-foreground">{blockLabel(item.id)}</span>
            <span className="hidden gap-0.5 lg:flex">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onSize(s.value)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                    item.size === s.value
                      ? "bg-sky-600 text-white"
                      : "text-muted-foreground hover:bg-[color:var(--muted)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Fills the row height; while arranging, the widget itself can't be clicked */}
      <div className={`h-full [&>*]:h-full ${editing ? "pointer-events-none select-none" : ""}`}>
        {children}
      </div>
    </div>
  );
}

// Grid of widgets; in edit mode they can be dragged and resized
export default function DashboardGrid({
  items,
  blocks,
  editing,
  onChange,
}: {
  items: LayoutItem[];
  blocks: Record<string, React.ReactNode>;
  editing: boolean;
  onChange: (items: LayoutItem[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from < 0 || to < 0) return;
    onChange(arrayMove(items, from, to));
  };

  const setSize = (id: string, size: BlockSize) =>
    onChange(items.map((i) => (i.id === id ? { ...i, size } : i)));

  const visible = items.filter((i) => blocks[i.id]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={visible.map((i) => i.id)} strategy={rectSortingStrategy}>
        {/* Boxes in the same row get the same height */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {visible.map((item) => (
            <SortableBlock
              key={item.id}
              item={item}
              editing={editing}
              onSize={(size) => setSize(item.id, size)}
            >
              {blocks[item.id]}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}