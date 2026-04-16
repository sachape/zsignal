import { assembleReport } from "@/services/reportAssembler";
import { nexaGaming } from "@/data/mockStreamers";

// Default mock report uses NexaGaming (close to affiliate)
export const mockAnalysisReport = assembleReport(nexaGaming, "mock-job-001");
