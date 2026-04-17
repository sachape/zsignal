import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
};

/**
 * Standard product page container.
 * Normalized vertical rhythm and max-width across authenticated pages.
 */
const PageContainer = ({ children, className, size = "md" }: Props) => {
  return (
    <div className={cn("container mx-auto px-4 py-8 md:px-6 md:py-10", sizeMap[size], className)}>
      {children}
    </div>
  );
};

export default PageContainer;
