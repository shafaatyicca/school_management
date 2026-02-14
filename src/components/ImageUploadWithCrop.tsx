"use client";

import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Point, Area } from "react-easy-crop"; // Types import karein
import { Button } from "@/components/ui/button";

export default function ImageUploadWithCrop({
  onImageCropped,
}: {
  onImageCropped: (blob: Blob) => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener("load", () => setImage(reader.result as string));
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
      // setImage(null); // Agar aap form mein preview dikha rahe hain to ise null na karein
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-slate-50">
      {!image ? (
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
            className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-full cursor-pointer bg-white hover:bg-slate-100 hover:border-sky-400 transition-all group"
          >
            {/* Div ki jagah Span use kiya (Valid HTML) */}
            <span className="flex flex-col items-center justify-center text-center px-2">
              <svg
                className="w-8 h-8 mb-2 text-slate-400 group-hover:text-sky-500"
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
              <span className="text-[10px] text-slate-500 group-hover:text-sky-600 font-medium">
                Add Photo
              </span>
            </span>
          </label>
        </div>
      ) : (
        <>
          <div
            className="relative w-64 h-64 bg-black overflow-hidden rounded-md focus-within:ring-2 focus-within:ring-sky-500"
            /* tabIndex={0} ki zaroorat nahi agar hum focus-within use karein */
          >
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid={true} // Grid on rakhein taake face center karne mein asani ho
              keyboardStep={10}
              zoomSpeed={0.1}
            />
          </div>

          <div className="w-full space-y-2 mt-2">
            <p className="text-[10px] text-center text-slate-500 uppercase font-bold">
              Use Mouse or Arrow Keys to Adjust
            </p>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setImage(null)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={createCroppedImage}>
              Apply Crop
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function with TypeScript Types
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
