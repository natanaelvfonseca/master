import { onResponse } from "nitro/h3";

export default onResponse((response, event) => {
  const pathname = event.url.pathname;

  if (pathname.startsWith("/api/")) {
    response.headers.set("cache-control", "no-store");
    return;
  }

  if (response.headers.get("content-type")?.includes("text/html")) {
    response.headers.set("cache-control", "no-cache, must-revalidate");
  }
});
