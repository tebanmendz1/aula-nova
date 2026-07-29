import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AulaNova — Tu espacio para enseñar y aprender",
  description: "Aula virtual para docentes y estudiantes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
