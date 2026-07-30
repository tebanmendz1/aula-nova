import type { Metadata } from "next";
import "./globals.css";
import GuidedTour from "./components/GuidedTour";
import PersistentSidebar from "./components/PersistentSidebar";

export const metadata: Metadata = {
  title: "AulaNova — Tu espacio para enseñar y aprender",
  description: "Aula virtual para docentes y estudiantes.",
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body><PersistentSidebar/>{children}<GuidedTour/></body></html>;
}
