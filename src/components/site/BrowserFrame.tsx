import { cn } from "@/lib/utils";

/**
 * Premium browser-window frame for product screenshots. The chrome (traffic
 * lights + URL pill) makes the dark in-app screenshot read as intentional and
 * elevates it on the editorial canvas.
 */
const BrowserFrame = ({
  src,
  alt,
  url = "streamnco.fr",
  float = false,
  className,
  imgClassName,
}: {
  src: string;
  alt: string;
  url?: string;
  float?: boolean;
  className?: string;
  imgClassName?: string;
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-[20px] border border-el-hairline bg-el-card p-1.5 shadow-[0_50px_100px_-40px_rgba(0,0,0,0.45)] ring-1 ring-black/[0.05]",
      float && "animate-el-float-slow",
      className,
    )}
  >
    <div className="overflow-hidden rounded-[14px] border border-el-hairline">
      <div className="flex h-10 items-center gap-3 border-b border-el-hairline bg-el-canvas-soft px-4">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-el-hairline-strong" />
        </span>
        <span className="mx-auto flex h-5 max-w-[60%] items-center truncate rounded-full bg-el-canvas px-3 font-el-sans text-[11px] text-el-muted">
          {url}
        </span>
      </div>
      <img src={src} alt={alt} className={cn("block w-full", imgClassName)} loading="lazy" />
    </div>
  </div>
);

export default BrowserFrame;
