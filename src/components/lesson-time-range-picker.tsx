import { Slider } from "@/components/ui/slider";
import { hhmm } from "@/lib/db";

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

function clock(totalMinutes: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function LessonTimeRangePicker({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const timeOptions = Array.from({ length: 65 }, (_, index) => clock(6 * 60 + index * 15));

  return (
    <div className="w-full min-w-0 max-w-full self-start space-y-3 rounded-xl border border-border bg-muted/30 p-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Time</p>
        <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold">
          <select
            aria-label="Start time"
            value={hhmm(start)}
            onChange={(event) => onChange(event.target.value, end)}
            className="h-9 min-w-0 rounded-lg border border-border bg-card px-2 font-bold shadow-sm"
          >
            {timeOptions.map((time) => (
              <option key={`start-${time}`} value={time}>
                {time}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">to</span>
          <select
            aria-label="End time"
            value={hhmm(end)}
            onChange={(event) => onChange(start, event.target.value)}
            className="h-9 min-w-0 rounded-lg border border-border bg-card px-2 font-bold shadow-sm"
          >
            {timeOptions.map((time) => (
              <option key={`end-${time}`} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="min-w-0 px-2">
        <Slider
          min={6 * 60}
          max={22 * 60}
          step={15}
          minStepsBetweenThumbs={1}
          value={[minutes(start), minutes(end)]}
          onValueChange={([nextStart, nextEnd]) => {
            if (nextStart === undefined || nextEnd === undefined) return;
            onChange(clock(nextStart), clock(nextEnd));
          }}
        />
      </div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center text-[10px] font-semibold text-muted-foreground">
        <span>06:00</span>
        <span className="px-2 text-center">Drag handles</span>
        <span className="text-right">22:00</span>
      </div>
    </div>
  );
}
