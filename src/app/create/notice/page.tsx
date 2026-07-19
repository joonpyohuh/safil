import type { Metadata } from "next";
import { GenerationStudio } from "@/components/create/generation-studio";

export const metadata: Metadata = { title: "매장 안내물 만들기" };
export default function CreateNoticePage() { return <GenerationStudio type="notice" />; }
