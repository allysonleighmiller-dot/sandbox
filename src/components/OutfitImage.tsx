import { useObjectUrl } from '../hooks/useObjectUrl'

export default function OutfitImage({
  blob,
  alt,
  className,
}: {
  blob: Blob
  alt: string
  className?: string
}) {
  const url = useObjectUrl(blob)
  if (!url) {
    return <div className={`animate-pulse bg-oat ${className ?? ''}`} />
  }
  return <img src={url} alt={alt} className={className} />
}
