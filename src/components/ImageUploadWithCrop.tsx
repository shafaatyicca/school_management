"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Point, Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogActions } from "@mui/material";

export default function ImageUploadWithCrop({
  onImageCropped,
}: {
  onImageCropped: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImage(reader.result as string);
        setIsModalOpen(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const createCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onImageCropped(croppedImage);
      handleCloseModal();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setImage(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <>
      {/* Upload Button with Hover */}
      <div className="flex flex-col items-center">
        <input
          type="file"
          id="file-upload"
          accept="image/*"
          onChange={onSelectFile}
          className="hidden"
        />

        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center w-28 h-28 border-2 border-dashed border-border bg-card rounded-full cursor-pointer transition-all duration-300 group hover:border-sky-400 dark:hover:border-sky-400"
        >
          <span className="flex flex-col items-center justify-center text-center px-2">
            <svg
              className="w-7 h-7 mb-1 text-muted-foreground transition-colors duration-300 group-hover:text-sky-400 dark:group-hover:text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-[9px] font-medium text-muted-foreground transition-colors duration-300 group-hover:text-sky-400 dark:group-hover:text-sky-400">
              Add Photo
            </span>
          </span>
        </label>
      </div>

      {/* Beautiful Crop Modal */}
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent
          sx={{
            p: 2,
            backgroundColor: "var(--background)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex flex-col gap-3">
            {/* Modal Title */}
            <div className="text-center space-y-1">
              <h3
                className="text-lg font-bold"
                style={{ color: "var(--foreground)" }}
              >
                📷 Crop Your Photo
              </h3>
              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)" }}
              >
                Adjust the image position and zoom level
              </p>
            </div>

            {/* Cropper Area */}
            <div
              className="relative w-full h-70 overflow-hidden rounded-xl shadow-lg transition-all"
              style={{
                backgroundColor: "#000",
                border: "1px solid var(--border)",
              }}
            >
              <Cropper
                image={image || ""}
                crop={crop}
                zoom={zoom}
                aspect={1 / 1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                showGrid={false}
                cropShape="round"
              />
            </div>

            {/* Zoom Slider */}
            <div className="w-full space-y-1">
              <div className="flex justify-between items-center">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  🔍 Zoom Level
                </p>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{
                    color: "var(--foreground)",
                    backgroundColor: "var(--muted)",
                  }}
                >
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-600 transition-all hover:accent-sky-700"
                style={{
                  backgroundColor: "var(--muted)",
                }}
              />
            </div>
          </div>
        </DialogContent>

        {/* Modal Footer with Hover Buttons */}
        <DialogActions
          sx={{
            p: 1,
            gap: 1,
            borderTop: "1px solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseModal}
            className="flex-1 cursor-pointer transition-colors duration-300 hover:bg-red-50 hover:border-red-300 hover:text-red-500"
          >
            ✕ Cancel
          </Button>
          <Button
            type="button"
            onClick={createCroppedImage}
            className="flex-1 cursor-pointer transition-colors duration-300 hover:bg-sky-100 hover:border-sky-300 hover:text-sky-500"
          >
            ✓ Apply Crop
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 300;
  canvas.height = 300;

  if (!ctx) throw new Error("No 2d context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    300,
    300,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/jpeg",
      0.9,
    );
  });
}
