const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)]
  .map(byte => byte.toString(16).padStart(2, "0"))
  .join("");

const fileName = async (blob: Blob, ext: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const suffix = ext.replace(/^\.+/u, "");
  return `kitty-crow-github-io-unicode-art-maker-${hex(digest)}.${suffix}`;
};

export const download = async (ext: string, type: string, body: BlobPart): Promise<string> => {
  const blob = new Blob([body], { type });
  const name = await fileName(blob, ext);
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  return name;
};
