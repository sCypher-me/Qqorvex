/** Utilitários de data puros, compartilhados pelas visões Dia/Semana/Mês/Lista do Calendário Completo. */

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + 1);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}


export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Converte o relógio de um fuso IANA em um instante UTC, preservando mudanças de horário. */
export function zonedDateTimeToIso(date: string, time: string, timeZone: string, seconds = 0): string {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) {
    throw new Error("A data ou o horário do evento é inválido.");
  }
  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText] = timeMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error("A data ou o horário do evento é inválido.");
  }
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
  const wallClockDate = new Date(wallClockAsUtc);
  if (wallClockDate.getUTCFullYear() !== year || wallClockDate.getUTCMonth() !== month - 1 || wallClockDate.getUTCDate() !== day) {
    throw new Error("A data do evento não existe.");
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = wallClockAsUtc;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    const projectedAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
    const adjusted = wallClockAsUtc - (projectedAsUtc - instant);
    if (adjusted === instant) break;
    instant = adjusted;
  }
  const finalParts = formatter.formatToParts(new Date(instant));
  const finalValue = (type: Intl.DateTimeFormatPartTypes) => Number(finalParts.find((part) => part.type === type)?.value);
  if (
    finalValue("year") !== year || finalValue("month") !== month || finalValue("day") !== day
    || finalValue("hour") !== hours || finalValue("minute") !== minutes || finalValue("second") !== seconds
  ) {
    throw new Error("Esse horário local não existe por causa da mudança de horário do fuso escolhido.");
  }
  return new Date(instant).toISOString();
}

/** Converte uma data/hora escolhida no fuso configurado pelo navegador para a API. */
export function localDateTimeToIso(date: string, time: string, seconds = 0): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return zonedDateTimeToIso(date, time, timeZone, seconds);
}

export function localDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}
