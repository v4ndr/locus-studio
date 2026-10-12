import { RencontreProvider } from "@/store/rencontre";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RencontreProvider>{children}</RencontreProvider>;
}
