import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// Shopify loads the app at the configured `application_url` (often "/") with query params
// like ?shop=...&host=... . Our embedded app lives under /app, so redirect there.
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const search = url.search ?? "";
  return redirect(`/app${search}`);
};


