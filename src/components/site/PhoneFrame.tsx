import { cn } from "@/lib/utils";

/**
 * Premium phone-device frame for vertical 9:16 clips. The dark bezel makes the
 * clip read as a real phone screen — elevates the vertical screenshot on the
 * editorial canvas.
 */
const PhoneFrame = ({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) => (
  <div
    className={cn(
      "relative w-[230px] rounded-[2.2rem] border-[7px] border-el-ink bg-el-ink shadow-[0_45px_90px_-35px_rgba(0,0,0,0.55)] ring-1 ring-black/10",
      className,
    )}
  >
    {/* notch */}
    <span className="absolute left-1/2 top-2 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-el-ink" />
    <div className="overflow-hidden rounded-[1.7rem]">
      <img src={src} alt={alt} className="block w-full" loading="lazy" />
    </div>
  </div>
);

export default PhoneFrame;
