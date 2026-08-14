export const download = (name: string, type: string, body: BlobPart): void => {
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(new Blob([body], { type }));
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
};
