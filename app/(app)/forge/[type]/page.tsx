import { notFound } from "next/navigation"
import { ForgePage } from "@/components/forge-page"

const VALID_FORGE_TYPES = ["character", "world", "storyline", "magic", "faction", "lore"]

export default async function ForgeTypePage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  
  if (!type) {
    notFound()
  }

  const forgeType = type.toLowerCase()

  if (!VALID_FORGE_TYPES.includes(forgeType)) {
    notFound()
  }

  return <ForgePage forgeType={forgeType} />
}

