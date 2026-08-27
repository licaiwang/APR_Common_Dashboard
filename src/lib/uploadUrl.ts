/**
 * Encode design/upload JSON filenames for HTTP paths.
 * Filenames often contain literal "%" (SQMS naming); encodeURIComponent is required on Linux and Windows.
 */
export function uploadJsonUrl(filename: string, process: string, project: string): string {
  return [
    "uploads",
    encodeURIComponent(process),
    encodeURIComponent(project),
    encodeURIComponent(filename),
  ].join("/");
}

export function projectUploadsApiUrl(process: string, project: string): string {
  return `/api/uploads/${encodeURIComponent(process)}/${encodeURIComponent(project)}`;
}

export function designJsonUrl(filename: string): string {
  return `design/${encodeURIComponent(filename)}`;
}
