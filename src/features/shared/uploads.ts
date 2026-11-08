import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type UploadedFile = {
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function saveUploadedImage(formData: FormData, key: string, folder: string) {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("Uploaded file must be an image");
  if (file.size > MAX_IMAGE_SIZE_BYTES) throw new Error("Uploaded image must be smaller than 10 MB");

  const saved = await saveFile(file, folder);
  return saved.url;
}

export async function saveUploadedFile(formData: FormData, key: string, folder: string): Promise<UploadedFile | undefined> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error("Uploaded file must be smaller than 10 MB");

  return saveFile(file, folder);
}

async function saveFile(file: File, folder: string): Promise<UploadedFile> {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const fileName = `${randomUUID()}.${extension}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${fileName}`, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return {
      url: blob.url,
      fileName: file.name || fileName,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  }

  if (process.env.VERCEL === "1") {
    throw new Error("File storage is not configured. Connect a Vercel Blob store and try again.");
  }

  const relativeDir = `/uploads/${folder}`;
  const publicDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(publicDir, { recursive: true });

  await writeFile(path.join(publicDir, fileName), Buffer.from(await file.arrayBuffer()));
  return {
    url: `${relativeDir}/${fileName}`,
    fileName: file.name || fileName,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
}
