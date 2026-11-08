import { afterEach, describe, expect, it, vi } from "vitest";

const { put } = vi.hoisted(() => ({ put: vi.fn() }));

vi.mock("@vercel/blob", () => ({ put }));

import { saveUploadedImage } from "@/features/shared/uploads";

const originalVercel = process.env.VERCEL;
const originalBlobToken = process.env.BLOB_READ_WRITE_TOKEN;

afterEach(() => {
  vi.clearAllMocks();
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
  if (originalBlobToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalBlobToken;
});

function imageFormData() {
  const formData = new FormData();
  formData.set("photo", new File(["image bytes"], "photo.jpg", { type: "image/jpeg" }));
  return formData;
}

describe("saveUploadedImage", () => {
  it("uploads to Vercel Blob when a Blob token is configured", async () => {
    process.env.VERCEL = "1";
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    put.mockResolvedValue({ url: "https://example.public.blob.vercel-storage.com/items/photo.jpg" });

    await expect(saveUploadedImage(imageFormData(), "photo", "items")).resolves.toBe(
      "https://example.public.blob.vercel-storage.com/items/photo.jpg"
    );
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/^items\/[0-9a-f-]+\.jpg$/),
      expect.any(File),
      expect.objectContaining({ access: "public", token: "test-token" })
    );
  });

  it("fails before a database write when Vercel Blob is not connected", async () => {
    process.env.VERCEL = "1";
    delete process.env.BLOB_READ_WRITE_TOKEN;

    await expect(saveUploadedImage(imageFormData(), "photo", "items")).rejects.toThrow(
      "File storage is not configured"
    );
    expect(put).not.toHaveBeenCalled();
  });
});
