import type { Metadata } from "next";
import { GenerationStudio } from "@/components/create/generation-studio";

export const metadata: Metadata = { title: "홍보 문구 만들기" };
export default function CreateCopyPage() { return <GenerationStudio type="copy" />; }
