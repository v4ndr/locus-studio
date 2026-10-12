import { homeData } from "@/studio/view.server";
import { Home } from "@/components/studio/home";

export const dynamic = "force-static";

export default function Page() {
  return <Home data={homeData()} />;
}
