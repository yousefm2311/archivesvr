import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_ARCHIVE_SERVICE_URL ??
  process.env.ARCHIVE_SERVICE_URL ??
  "http://localhost:5000";

export const archiveClient = axios.create({
  baseURL: BASE_URL,
  timeout: Number(process.env.ARCHIVE_TIMEOUT_MS ?? 120000),
});

export type ArchiveUploadResponse = {
  filePath: string;
  fileName?: string;
  size?: number;
  mimeType?: string;
};

export async function uploadArchive(
  clientCode: string | number,
  file: File,
  extra?: Record<string, string>
): Promise<ArchiveUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => formData.append(key, value));
  }

  const response = await archiveClient.post<ArchiveUploadResponse>(
    `/api/archives/${clientCode}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}
