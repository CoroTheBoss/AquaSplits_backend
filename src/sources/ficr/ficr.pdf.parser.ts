import { Injectable } from '@nestjs/common';
import PDFParser from 'pdf2json';
import { TimeParser } from '../../utils/time-parser';
import {
  FicrRelayPdfResult,
  FicrRelayPdfEntry,
} from './dto/ficr-relay-pdf.dto';

interface PdfTextRun {
  T: string;
}

interface PdfText {
  x: number;
  y: number;
  R: PdfTextRun[];
}

interface PdfPage {
  Texts: PdfText[];
}

interface Pdf2JsonOutput {
  Pages: PdfPage[];
}

interface RowCell {
  x: number;
  text: string;
}

type Row = RowCell[];

@Injectable()
export class FicrPdfParser {
  /**
   * Raw parse: returns rows of { x, text } cells for custom use.
   */
  async parse(buffer: Buffer): Promise<Row[]> {
    const data = await this.loadPdf(buffer);
    return this.groupByRow(data);
  }

  /**
   * Parse a FICR relay "Riepilogo" PDF into structured relay entries.
   * Handles layouts like 27° Trofeo ASCI Città di Brescia and Trofeo Gran Sasso.
   */
  async parseRelayPdf(buffer: Buffer): Promise<FicrRelayPdfResult> {
    const data = await this.loadPdf(buffer);
    const rows = this.groupByRow(data);
    const lines = this.rowsToLines(rows);
    return this.parseRelayLines(lines);
  }

  private loadPdf(buffer: Buffer): Promise<Pdf2JsonOutput> {
    return new Promise((resolve, reject) => {
      const parser = new PDFParser();
      parser.on('pdfParser_dataError', (err: unknown) => reject(err));
      parser.on('pdfParser_dataReady', (data: unknown) => {
        resolve(data as Pdf2JsonOutput);
      });
      parser.parseBuffer(buffer);
    });
  }

  private groupByRow(data: Pdf2JsonOutput): Row[] {
    const allRows: Row[] = [];
    const rowTolerance = 2;
    for (
      let pageIndex = 0;
      pageIndex < (data.Pages?.length ?? 0);
      pageIndex++
    ) {
      const page = data.Pages[pageIndex];
      const rowMap: Record<number, RowCell[]> = {};
      for (const t of page.Texts ?? []) {
        const y = Math.round(t.y * 10) / 10;
        const text = (
          t.R?.[0]?.T != null ? decodeURIComponent(t.R[0].T) : ''
        ).trim();
        if (!text) continue;
        const key = Math.round(y / rowTolerance) * rowTolerance;
        if (!rowMap[key]) rowMap[key] = [];
        rowMap[key].push({ x: t.x, text });
      }
      const sortedY = Object.keys(rowMap)
        .map(Number)
        .sort((a, b) => a - b);
      for (const y of sortedY) {
        allRows.push(rowMap[y].sort((a, b) => a.x - b.x));
      }
    }
    return allRows;
  }

  private rowsToLines(rows: Row[]): string[] {
    return rows.map((cells) =>
      cells
        .map((c) => c.text.trim())
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
  }

  private parseRelayLines(lines: string[]): FicrRelayPdfResult {
    const result: FicrRelayPdfResult = {
      relays: [],
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line) {
        i++;
        continue;
      }

      // Competition / location / date (e.g. "Brescia, 25/01/2026" or "Avezzano (AQ), 25 Gennaio 2026")
      const locationDate =
        /^([^,]+),\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+(?:Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s+\d{4})/i;
      const locMatch = line.match(locationDate);
      if (locMatch) {
        result.location = locMatch[1].trim();
        result.date = locMatch[2].trim();
        i++;
        continue;
      }

      // Competition title (often has ° or Trofeo and is before Riepilogo)
      if (
        (line.includes('Trofeo') || line.includes('°')) &&
        !line.includes('Riepilogo') &&
        !result.competitionName
      ) {
        result.competitionName = line.trim();
        i++;
        continue;
      }

      // Event name (4x50m / 4X50m + stroke/category)
      if (
        (line.includes('4x') || line.includes('4X')) &&
        line.toLowerCase().includes('m ')
      ) {
        result.eventName = line.trim();
        i++;
        continue;
      }

      // Pool info footer
      if (
        line.toLowerCase().includes('corsie') &&
        line.toLowerCase().includes('m')
      ) {
        result.poolInfo = line.trim();
        i++;
        continue;
      }

      // Section / category header (Master Maschi, Esordienti, » segue)
      const categoryMatch = line.match(
        /(?:»\s*segue\s+)?(Master\s+Maschi\s+\d+\s*-\s*\d+|Esordienti\s+[AM]\s+Misti|[^0-9]+(?=\d{4}\s|$))/i,
      );
      if (categoryMatch && line.length < 80) {
        result.category = line.trim();
        i++;
        continue;
      }

      // Data row: position or SQ at start, then team name, lane, times
      const rankMatch = line.match(/^(SQ|\d+)\s+/);
      if (rankMatch) {
        const entry = this.parseTeamRow(line, lines.slice(i + 1, i + 5));
        if (entry) {
          result.relays.push(entry);
          // Skip the swimmer lines we consumed
          const swimmerCount = entry.legs.length;
          i += 1 + swimmerCount;
          continue;
        }
      }

      i++;
    }

    return result;
  }

  private parseTeamRow(
    teamLine: string,
    nextLines: string[],
  ): FicrRelayPdfEntry | null {
    const rankMatch = teamLine.match(/^(SQ|\d+)\s+/);
    if (!rankMatch) return null;

    const rankStr = rankMatch[1];
    const disqualified = rankStr === 'SQ';
    const rank = disqualified ? null : parseInt(rankStr, 10);

    // Disqualification reason (e.g. "Cambio Irregolare 2° fr" at end of line)
    let disqualificationReason: string | undefined;
    const dqReasonMatch = teamLine.match(
      /\s+([A-Za-z\s°]+(?:Irregolare|irregolare)[^0-9]*)$/,
    );
    if (dqReasonMatch) disqualificationReason = dqReasonMatch[1].trim();

    // Time-like tokens: must have decimal or min:sec (avoid matching birth years like 1976)
    const timeRegex =
      /\d+[:']\d*\.?\d*|\d+\.\d{1,2}(?:\d)?|\(\s*\d+\.?\d*\s*\)|\(\s*\d+[:']\d*\.?\d*\s*\)/g;
    const timeMatches: string[] = teamLine.match(timeRegex) ?? [];
    const legSplits: string[] = [];
    let arrivalTime = '';
    for (const m of timeMatches) {
      const cleaned = m.replace(/[()\s]/g, '');
      if (m.startsWith('(')) {
        legSplits.push(cleaned);
      } else {
        arrivalTime = cleaned.replace(/'/g, ':');
      }
    }

    const arrivalMillis = TimeParser.toMillis(arrivalTime || undefined);

    // Lane: single digit 1-9 after team name
    const laneMatch = teamLine.match(/\s+(\d)\s+(?:ITA|Naz|$|\d)/);
    const lane = laneMatch ? parseInt(laneMatch[1], 10) : undefined;

    // Points: last number with comma as decimal (e.g. 698,19 or 18,0)
    const pointsMatch = teamLine.match(/(\d+),(\d+)\s*$/);
    let points: number | undefined;
    if (pointsMatch) {
      points = parseFloat(`${pointsMatch[1]}.${pointsMatch[2]}`);
    }

    // Team name: between rank and first time-like token
    const restAfterRank = teamLine.slice(rankMatch[0].length);
    const firstNonParenTime = timeMatches.find((m) => !m.startsWith('('));
    const firstTimeIdx =
      firstNonParenTime != null
        ? restAfterRank.indexOf(firstNonParenTime.trim())
        : -1;
    const middle =
      firstTimeIdx >= 0 ? restAfterRank.slice(0, firstTimeIdx) : restAfterRank;
    const teamName = middle
      .replace(/\s+\d\s+ITA\s*/i, ' ')
      .replace(/\s+ITA\s*/i, ' ')
      .replace(/\d{4}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Parse next 4 lines as swimmers: "NAME SURNAME YEAR TIME" or "SURNAME Name ITA YEAR TIME"
    const legs: FicrRelayPdfEntry['legs'] = [];
    const swimmerTimeRegex = /(\d{4})\s+([\d':.]+)\s*$/;
    for (let j = 0; j < nextLines.length && legs.length < 4; j++) {
      const sl = nextLines[j];
      const sm = sl.match(swimmerTimeRegex);
      if (sm) {
        const birthYear = parseInt(sm[1], 10);
        const timeStr = sm[2].replace(/'/g, ':');
        const millis = TimeParser.toMillis(timeStr);
        const namePart = sl.slice(0, sm.index).trim();
        // Remove ITA if present
        const name = namePart
          .replace(/\s+ITA\s*$/i, '')
          .replace(/\s+/g, ' ')
          .trim();
        legs.push({
          displayTime: timeStr.includes(':') ? timeStr : `${timeStr}`,
          millis,
          swimmerName: name || undefined,
          birthYear,
        });
      } else if (legSplits[j]) {
        const millis = TimeParser.toMillis(legSplits[j]);
        legs.push({
          displayTime: legSplits[j],
          millis,
        });
      }
    }

    // If we have 4 leg times from team row (parentheses) but no swimmer lines, use those
    if (legs.length === 0 && legSplits.length >= 4) {
      for (let k = 0; k < 4; k++) {
        const m = TimeParser.toMillis(legSplits[k]);
        legs.push({
          displayTime: legSplits[k].replace(/^(\d+):/, "$1'"),
          millis: m,
        });
      }
    }

    // Final time: from Arrivo or sum of legs
    let displayTime = arrivalTime || '';
    let millis = arrivalMillis;
    if (millis <= 0 && legs.length > 0) {
      millis = legs.reduce((s, l) => s + l.millis, 0);
      displayTime = TimeParser.toDisplayTime(millis);
    }

    if (millis <= 0 && legs.length === 0) return null;

    return {
      rank: rank ?? null,
      disqualified: disqualified || undefined,
      disqualificationReason,
      teamName: teamName || undefined,
      lane,
      displayTime,
      millis,
      points,
      legs,
    };
  }
}
