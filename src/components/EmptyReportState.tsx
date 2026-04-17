import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

const EmptyReportState = ({
  title = "Aucune analyse pour le moment",
  description = "Lance ta première analyse pour découvrir ton StreamScore, tes concurrents et tes priorités.",
  ctaLabel = "Lancer une analyse",
  ctaHref = "/analyze",
}: Props) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-10 text-center"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary">
        <Sparkles className="h-6 w-6 text-primary-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <Link
        to={ctaHref}
        className="mt-6 inline-flex items-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </motion.div>
  );
};

export default EmptyReportState;
