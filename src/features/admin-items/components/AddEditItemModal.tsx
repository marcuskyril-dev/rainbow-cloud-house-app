import { useEffect, useCallback, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, Button, Input, Textarea, Select } from "@/shared/ui";
import {
  createItemSchema,
  type CreateItemFormData,
  type CreateItemFormInput,
} from "@/shared/lib/validation";
import { useCreateItem, useUpdateItem } from "@/shared/hooks/useItems";
import { itemsApi } from "@/shared/api";
import type { WishlistItemView } from "@/shared/api/types";
import { ImageDropzone } from "./ImageDropzone";

interface AddEditItemModalProps {
  item?: WishlistItemView | null;
  open: boolean;
  onClose: () => void;
}

const priorityOptions = [
  { value: "must_have", label: "Must Have" },
  { value: "nice_to_have", label: "Nice to Have" },
  { value: "dream", label: "Dream" },
];

export function AddEditItemModal({
  item,
  open,
  onClose,
}: AddEditItemModalProps) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const isEditing = !!item;
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateItemFormInput, unknown, CreateItemFormData>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      priority: "must_have",
    },
  });

  useEffect(() => {
    if (item) {
      reset({
        name: item.name,
        description: item.description ?? "",
        price: item.price / 100,
        productUrl: item.productUrl ?? "",
        imageUrl: item.imageUrl ?? "",
        category: item.category ?? "",
        priority: item.priority,
      });
    } else {
      reset({
        name: "",
        description: "",
        price: 0,
        productUrl: "",
        imageUrl: "",
        category: "",
        priority: "must_have",
      });
    }
  }, [item, reset]);

  const handleClose = useCallback(() => {
    reset();
    setUploadError(null);
    onClose();
  }, [reset, onClose]);

  async function uploadDataUrl(dataUrl: string): Promise<string> {
    const [header, base64] = dataUrl.split(",");
    const contentType = header.match(/:(.*?);/)?.[1] as
      | "image/jpeg"
      | "image/png"
      | "image/webp";
    if (!contentType) throw new Error("Unsupported image type");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: contentType });

    const ext = contentType.split("/")[1];
    const { uploadUrl, publicUrl } = await itemsApi.presignUpload({
      fileName: `upload.${ext}`,
      contentType,
      fileSize: blob.size,
    });

    await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });

    return publicUrl;
  }

  async function onSubmit(data: CreateItemFormData) {
    setUploadError(null);

    let imageUrl = data.imageUrl || undefined;

    if (imageUrl?.startsWith("data:")) {
      try {
        imageUrl = await uploadDataUrl(imageUrl);
      } catch {
        setUploadError("Failed to upload image. Please try again.");
        return;
      }
    }

    const payload = {
      ...data,
      price: Math.round(data.price * 100),
      productUrl: data.productUrl || undefined,
      imageUrl,
      category: data.category || undefined,
    };

    if (isEditing && item) {
      await updateItem.mutateAsync({
        id: item.id,
        data: { ...payload, expectedVersion: item.version },
      });
    } else {
      await createItem.mutateAsync(payload);
    }
    handleClose();
  }

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && handleClose()}
      title={isEditing ? "Edit Item" : "Add New Item"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Controller
          name="imageUrl"
          control={control}
          render={({ field }) => (
            <ImageDropzone
              value={field.value ?? ""}
              onChange={(next) => field.onChange(next)}
              onClear={() => field.onChange("")}
              disabled={isPending}
            />
          )}
        />

        <Input
          label="Product Link"
          placeholder="https://amazon.com/item-link"
          error={errors.productUrl?.message}
          {...register("productUrl")}
        />

        <Input
          label="Item Name"
          placeholder="e.g. Minimalist Ceramic Vase"
          error={errors.name?.message}
          maxLength={75}
          {...register("name")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost"
            type="number"
            step="0.01"
            min="0"
            prefix="$"
            placeholder="0.00"
            error={errors.price?.message}
            {...register("price", { valueAsNumber: true })}
          />

          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select
                label="Priority"
                options={priorityOptions}
                value={field.value}
                onValueChange={field.onChange}
                error={errors.priority?.message}
              />
            )}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Tell your guests why you love this item..."
          error={errors.description?.message}
          {...register("description")}
        />

        {uploadError && (
          <p className="text-xs text-red-600">{uploadError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Save Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
