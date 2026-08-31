"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  FolderTreeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/file-validation";

export function CategoryList({ orgId }: { orgId: Id<"orgs"> }) {
  const categories = useQuery(api.serviceCategories.listCategories, { orgId });
  const createCategory = useMutation(api.serviceCategories.createCategory);
  const updateCategory = useMutation(api.serviceCategories.updateCategory);
  const deleteCategory = useMutation(api.serviceCategories.deleteCategory);
  const reorderCategories = useMutation(
    api.serviceCategories.reorderCategories,
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<Id<"service_categories"> | null>(
    null,
  );
  const [editName, setEditName] = useState("");

  const closeInlineEditor = () => {
    setIsAdding(false);
    setNewName("");
    setEditingId(null);
    setEditName("");
  };

  const handleCreate = async () => {
    if (!categories || !newName.trim()) return;

    const maxOrder =
      categories.length > 0
        ? Math.max(...categories.map((category) => category.sortOrder))
        : 0;

    try {
      await createCategory({
        orgId,
        name: newName.trim(),
        sortOrder: maxOrder + 1,
      });
      setNewName("");
      setIsAdding(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not add category"));
    }
  };

  const handleUpdate = async (categoryId: Id<"service_categories">) => {
    if (!editName.trim()) return;

    try {
      await updateCategory({
        orgId,
        categoryId,
        name: editName.trim(),
      });
      setEditingId(null);
      setEditName("");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not rename category"));
    }
  };

  const handleDelete = async (
    categoryId: Id<"service_categories">,
    categoryName: string,
  ) => {
    if (
      !window.confirm(
        `Delete “${categoryName}”? Move its services to another category first.`,
      )
    ) {
      return;
    }

    try {
      await deleteCategory({ orgId, categoryId });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not delete category"));
    }
  };

  const moveCategory = async (index: number, direction: "up" | "down") => {
    if (!categories) return;

    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= categories.length) return;

    const nextOrder = [...categories];
    [nextOrder[index], nextOrder[nextIndex]] = [
      nextOrder[nextIndex],
      nextOrder[index],
    ];

    try {
      await reorderCategories({
        orgId,
        categoryIds: nextOrder.map((category) => category._id),
      });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not reorder categories"));
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) closeInlineEditor();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 transition-transform duration-150 active:scale-[0.97] motion-reduce:transform-none sm:flex-none"
        >
          <FolderTreeIcon data-icon="inline-start" />
          Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>
            Group related services on your booking page.
          </DialogDescription>
        </DialogHeader>

        {categories === undefined ? (
          <div className="flex flex-col gap-2 py-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex max-h-[55vh] flex-col gap-3 overflow-y-auto py-1">
            {categories.length === 0 && !isAdding ? (
              <Empty className="border py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderTreeIcon />
                  </EmptyMedia>
                  <EmptyTitle>No categories</EmptyTitle>
                  <EmptyDescription>
                    Categories are optional. Add one when you want to group
                    similar services.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {categories.map((category, index) =>
                  editingId === category._id ? (
                    <form
                      key={category._id}
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdate(category._id);
                      }}
                      className="rounded-lg border p-2"
                    >
                      <Field orientation="horizontal">
                        <FieldLabel
                          htmlFor={`category-${category._id}`}
                          className="sr-only"
                        >
                          Category name
                        </FieldLabel>
                        <Input
                          id={`category-${category._id}`}
                          autoFocus
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              setEditingId(null);
                              setEditName("");
                            }
                          }}
                        />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Save category name"
                          disabled={!editName.trim()}
                        >
                          <CheckIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Cancel renaming"
                          onClick={() => {
                            setEditingId(null);
                            setEditName("");
                          }}
                        >
                          <XIcon />
                        </Button>
                      </Field>
                    </form>
                  ) : (
                    <div
                      key={category._id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {category.name}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${category.name}`}
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditingId(category._id);
                                setEditName(category.name);
                              }}
                            >
                              <PencilIcon />
                              Rename
                            </DropdownMenuItem>
                            {categories.length > 1 && (
                              <>
                                <DropdownMenuItem
                                  disabled={index === 0}
                                  onSelect={() => moveCategory(index, "up")}
                                >
                                  <ArrowUpIcon />
                                  Move up
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === categories.length - 1}
                                  onSelect={() => moveCategory(index, "down")}
                                >
                                  <ArrowDownIcon />
                                  Move down
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() =>
                                handleDelete(category._id, category.name)
                              }
                            >
                              <Trash2Icon />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ),
                )}
              </div>
            )}

            {isAdding ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreate();
                }}
                className="rounded-lg border p-2"
              >
                <Field orientation="horizontal">
                  <FieldLabel htmlFor="new-category" className="sr-only">
                    Category name
                  </FieldLabel>
                  <Input
                    id="new-category"
                    autoFocus
                    placeholder="Category name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setIsAdding(false);
                        setNewName("");
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add category"
                    disabled={!newName.trim()}
                  >
                    <CheckIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Cancel adding category"
                    onClick={() => {
                      setIsAdding(false);
                      setNewName("");
                    }}
                  >
                    <XIcon />
                  </Button>
                </Field>
              </form>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEditingId(null);
                  setIsAdding(true);
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Add category
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
