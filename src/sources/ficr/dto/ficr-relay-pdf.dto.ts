/**
 * Result of parsing a FICR relay "Riepilogo" PDF.
 * Covers layouts like 27° Trofeo ASCI Città di Brescia and Trofeo Gran Sasso.
 */
export type FicrRelayPdfResult = {
  /** Competition title (e.g. "27° Trofeo ASCI Città di Brescia") */
  competitionName?: string;
  /** Location (e.g. "Brescia", "Avezzano (AQ)") */
  location?: string;
  /** Event date (from header, e.g. "25/01/2026" or "25 Gennaio 2026") */
  date?: string;
  /** Event description (e.g. "4X50m Misti Master Maschi", "4x50m Stile Libero Esordienti A Misti") */
  eventName?: string;
  /** Pool info from footer (e.g. "10 corsie 25m") */
  poolInfo?: string;
  /** Category label if single (e.g. "Master Maschi 120 - 159") */
  category?: string;
  /** Parsed relay teams in order */
  relays: FicrRelayPdfEntry[];
};

export type FicrRelayPdfEntry = {
  /** Position (1-based) or null if SQ/disqualified */
  rank: number | null;
  /** Disqualified */
  disqualified?: boolean;
  /** Reason if disqualified (e.g. "Cambio Irregolare 2° fr") */
  disqualificationReason?: string;
  /** Team/club name (Società / Squadra) */
  teamName?: string;
  /** Lane (Crs) */
  lane?: number;
  /** Nationality (Naz) e.g. ITA */
  nationality?: string;
  /** Final time string (Arrivo) e.g. "2:23.70" or "2'00.0" */
  displayTime: string;
  /** Final time in milliseconds */
  millis: number;
  /** Category points (Pti Cat / FINA Pt S.C.) if present */
  points?: number;
  /** Leg times in order (4 legs for 4x50): display string and millis */
  legs: {
    displayTime: string;
    millis: number;
    swimmerName?: string;
    birthYear?: number;
  }[];
  /** Cumulative split at 50, 100, 150, 200m if parsed */
  splits?: { distance: number; displayTime: string; millis: number }[];
};
