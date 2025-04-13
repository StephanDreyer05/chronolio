import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  description?: string;
  order: number;
}

interface CategoryItemProps {
  category: Category;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  moveCategory: (dragIndex: number, hoverIndex: number) => void;
}

export default function CategoryItem({
  category,
  index,
  onEdit,
  onDelete,
  moveCategory,
}: CategoryItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "CATEGORY",
    item: { type: "CATEGORY", id: category.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "CATEGORY",
    hover(item: any, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      moveCategory(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg text-sm ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 cursor-move text-purple-600 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-medium text-lg text-foreground">
              {category.name}
            </span>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4 text-purple-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:text-destructive"
                onClick={onDelete}
              >
                <X className="h-4 w-4 text-purple-600" />
              </Button>
            </div>
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {category.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
