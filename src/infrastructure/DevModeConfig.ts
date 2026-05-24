export const isDevModeEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("dev") === "1" || params.get("debug") === "1";
};
