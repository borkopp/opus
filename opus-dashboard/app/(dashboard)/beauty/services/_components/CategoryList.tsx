"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconEdit, IconTrash, IconCheck, IconX, IconGripVertical } from "@tabler/icons-react";
import { getErrorMessage } from "@/lib/file-validation";

export function CategoryList({ orgId }: { orgId: Id<"orgs"> }) {
    const categories = useQuery(api.serviceCategories.listCategories, { orgId });
    const createCategory = useMutation(api.serviceCategories.createCategory);
    const updateCategory = useMutation(api.serviceCategories.updateCategory);
    const deleteCategory = useMutation(api.serviceCategories.deleteCategory);
    const reorderCategories = useMutation(api.serviceCategories.reorderCategories);

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<Id<"service_categories"> | null>(null);
    const [editName, setEditName] = useState("");
    const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

    if (categories === undefined) {
        return <Skeleton className="h-[400px] w-full rounded-xl" />;
    }

    const handleCreate = async () => {
        if (!newName.trim()) return;
        const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.sortOrder)) : 0;

        await createCategory({
            orgId,
            name: newName.trim(),
            sortOrder: maxOrder + 1,
        });

        setNewName("");
        setIsAdding(false);
    };

    const handleUpdate = async (categoryId: Id<"service_categories">) => {
        if (!editName.trim()) return;

        await updateCategory({
            orgId,
            categoryId,
            name: editName.trim(),
        });

        setEditingId(null);
    };

    const handleDelete = async (categoryId: Id<"service_categories">, catName: string) => {
        if (window.confirm(`Are you sure you want to delete the category "${catName}"? Any services within it must be reassigned or deleted first.`)) {
            try {
                await deleteCategory({ orgId, categoryId });
            } catch (error: unknown) {
                alert(getErrorMessage(error, "Failed to delete category"));
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedCategoryId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (!draggedCategoryId) return;
        const items = [...categories];
        const draggedIndex = items.findIndex(c => c._id === draggedCategoryId);
        if (draggedIndex === -1 || draggedIndex === dropIndex) {
            setDraggedCategoryId(null);
            return;
        }

        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(dropIndex, 0, draggedItem);

        const categoryIds = items.map(c => c._id);
        await reorderCategories({ orgId, categoryIds });
        setDraggedCategoryId(null);
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b space-y-0 relative">
                <div>
                    <CardTitle className="text-base font-semibold">Categories</CardTitle>
                    <CardDescription className="text-xs">Drag or edit groups</CardDescription>
                </div>
                {!isAdding && (
                    <Button
                        variant="default"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => { setIsAdding(true); setNewName(""); }}
                    >
                        <IconPlus size={14} /> Add
                    </Button>
                )}
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-muted/20">
                {categories.length === 0 && !isAdding && (
                    <div className="text-sm text-muted-foreground p-6 rounded-lg text-center border border-dashed bg-background">
                        No categories yet. <br /> Add one to start building your menu.
                    </div>
                )}

                {categories.map((category, index) => (
                    <div
                        key={category._id}
                        draggable={editingId !== category._id}
                        onDragStart={(e) => handleDragStart(e, category._id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`flex items-center gap-2 p-2 bg-background rounded-lg shadow-s dark:shadow-l group transition-colors hover:border-border ${draggedCategoryId === category._id ? 'opacity-50 ring-2 ring-primary border-primary' : ''}`}
                    >
                        {editingId === category._id ? (
                            <div className="flex-1 flex items-center gap-2">
                                <Input
                                    autoFocus
                                    className="flex-1 h-8 text-sm"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleUpdate(category._id);
                                        if (e.key === "Escape") setEditingId(null);
                                    }}
                                />
                                <Button size="icon" variant="ghost" onClick={() => handleUpdate(category._id)} className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700">
                                    <IconCheck size={16} />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-muted-foreground">
                                    <IconX size={16} />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col items-center opacity-30 group-hover:opacity-100 transition-opacity cursor-grab hover:text-foreground text-muted-foreground">
                                    <IconGripVertical size={16} />
                                </div>

                                <span className="flex-1 font-medium text-sm text-foreground truncate pl-1 cursor-default">
                                    {category.name}
                                </span>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        size="icon" variant="ghost"
                                        onClick={() => { setEditingId(category._id); setEditName(category.name); }}
                                        className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                    >
                                        <IconEdit size={16} />
                                    </Button>
                                    <Button
                                        size="icon" variant="ghost"
                                        onClick={() => handleDelete(category._id, category.name)}
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                    >
                                        <IconTrash size={16} />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ))}

                {isAdding && (
                    <div className="flex items-center gap-2 p-2 bg-background border border-blue-200 dark:border-blue-900 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                        <Input
                            autoFocus
                            placeholder="e.g. Haircuts"
                            className="flex-1 h-8 text-sm"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate();
                                if (e.key === "Escape") setIsAdding(false);
                            }}
                        />
                        <Button size="icon" variant="ghost" onClick={handleCreate} disabled={!newName.trim()} className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50">
                            <IconCheck size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setIsAdding(false)} className="h-8 w-8 text-muted-foreground">
                            <IconX size={16} />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
