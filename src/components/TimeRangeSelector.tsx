import React from 'react';
import { Clock, Minus, Plus } from 'lucide-react';
import { soundFx } from '../utils/soundFx';

interface TimeRangeSelectorProps {
  startMinutes: number;
  endMinutes: number;
  onChange: (nextStart: number, nextEnd: number) => void;
  showEndTime?: boolean;
  compact?: boolean;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const DURATION_PRESETS = [
  { label: '30m', mins: 30 },
  { label: '45m', mins: 45 },
  { label: '1h', mins: 60 },
  { label: '1.5h', mins: 90 },
  { label: '2h', mins: 120 },
  { label: '3h', mins: 180 },
];

function decomposeMinutes(totalMinutes: number): {
  hour12: number;
  minute: number;
  period: 'AM' | 'PM';
} {
  const clamped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(clamped / 60);
  const minute = Math.round((clamped % 60) / 5) * 5 % 60;
  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour12, minute, period };
}

function composeMinutes(
  hour12: number,
  minute: number,
  period: 'AM' | 'PM'
): number {
  let hours24 = hour12 % 12;
  if (period === 'PM') hours24 += 12;
  return hours24 * 60 + minute;
}

function formatDurationBadge(mins: number): string {
  const safe = Math.max(5, mins);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  startMinutes,
  endMinutes,
  onChange,
  showEndTime = true,
}) => {
  const currentDuration = Math.max(15, endMinutes - startMinutes);
  const startParts = decomposeMinutes(startMinutes);
  const endParts = decomposeMinutes(endMinutes === 1440 ? 1435 : endMinutes);

  const updateStartPreservingDuration = (nextStartRaw: number) => {
    const nextStart = Math.max(0, Math.min(1425, nextStartRaw));
    const nextEnd = Math.min(1440, Math.max(nextStart + 15, nextStart + currentDuration));
    onChange(nextStart, nextEnd);
  };

  const updateEndDirectly = (nextEndRaw: number) => {
    const clampedEnd = Math.max(15, Math.min(1440, nextEndRaw));
    if (clampedEnd <= startMinutes) {
      // If user picks an end time earlier than start time, shift start time before it
      const adjustedStart = Math.max(0, clampedEnd - currentDuration);
      onChange(adjustedStart, Math.max(adjustedStart + 15, clampedEnd));
    } else {
      onChange(startMinutes, clampedEnd);
    }
  };

  const setNowStart = () => {
    soundFx.playTactileClick(1.05);
    const now = new Date();
    const rawNow = now.getHours() * 60 + now.getMinutes();
    const roundedNow = Math.round(rawNow / 15) * 15;
    updateStartPreservingDuration(roundedNow);
  };

  const applyDurationPreset = (mins: number) => {
    soundFx.playTactileClick(1.0);
    const nextEnd = Math.min(1440, startMinutes + mins);
    onChange(startMinutes, nextEnd);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Start & End Time Cards */}
      <div className={`grid ${showEndTime ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
        {/* START TIME */}
        <div
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 15 : -15;
            updateStartPreservingDuration(startMinutes + delta);
          }}
          className="clay-well rounded-xl px-2 py-1.5 flex flex-col gap-1 border border-white/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Start
            </span>
            <button
              type="button"
              onClick={setNowStart}
              className="px-1.5 py-0.2 rounded bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-400/30 text-[9px] font-mono font-bold transition-colors flex items-center gap-0.5"
              title="Set start time to right now"
            >
              <Clock className="w-2.5 h-2.5" />
              <span>Now</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-1">
            {/* Hour : Minute + AM/PM */}
            <div className="flex items-center gap-0.5">
              <select
                value={startParts.hour12}
                onChange={(e) => {
                  soundFx.playTactileClick(1.0);
                  const next = composeMinutes(
                    Number(e.target.value),
                    startParts.minute,
                    startParts.period
                  );
                  updateStartPreservingDuration(next);
                }}
                className="bg-slate-900/80 text-white font-mono text-xs font-extrabold rounded-md px-1 py-0.5 border border-white/15 focus:outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                title="Start Hour"
              >
                {HOURS_12.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <span className="font-mono text-xs font-bold text-slate-400">:</span>

              <select
                value={startParts.minute}
                onChange={(e) => {
                  soundFx.playTactileClick(1.0);
                  const next = composeMinutes(
                    startParts.hour12,
                    Number(e.target.value),
                    startParts.period
                  );
                  updateStartPreservingDuration(next);
                }}
                className="bg-slate-900/80 text-white font-mono text-xs font-extrabold rounded-md px-1 py-0.5 border border-white/15 focus:outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                title="Start Minute"
              >
                {MINUTE_STEPS.map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  soundFx.playTactileClick(1.05);
                  const nextPeriod = startParts.period === 'AM' ? 'PM' : 'AM';
                  const next = composeMinutes(
                    startParts.hour12,
                    startParts.minute,
                    nextPeriod
                  );
                  updateStartPreservingDuration(next);
                }}
                className="clay-button ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold text-slate-100 transition-colors"
                title="Toggle AM / PM"
              >
                {startParts.period}
              </button>
            </div>

            {/* -15m / +15m nudge buttons */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  soundFx.playTactileClick(0.95);
                  updateStartPreservingDuration(startMinutes - 15);
                }}
                className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Earlier by 15m"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFx.playTactileClick(1.05);
                  updateStartPreservingDuration(startMinutes + 15);
                }}
                className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                title="Later by 15m"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        {/* END TIME */}
        {showEndTime && (
          <div
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 15 : -15;
              updateEndDirectly(endMinutes + delta);
            }}
            className="clay-well rounded-xl px-2 py-1.5 flex flex-col gap-1 border border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                End
              </span>
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-mono font-bold">
                {formatDurationBadge(currentDuration)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1">
              {/* Hour : Minute + AM/PM */}
              <div className="flex items-center gap-0.5">
                <select
                  value={endParts.hour12}
                  onChange={(e) => {
                    soundFx.playTactileClick(1.0);
                    const next = composeMinutes(
                      Number(e.target.value),
                      endParts.minute,
                      endParts.period
                    );
                    updateEndDirectly(next);
                  }}
                  className="bg-slate-900/80 text-white font-mono text-xs font-extrabold rounded-md px-1 py-0.5 border border-white/15 focus:outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                  title="End Hour"
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, '0')}
                    </option>
                  ))}
                </select>

                <span className="font-mono text-xs font-bold text-slate-400">:</span>

                <select
                  value={endParts.minute}
                  onChange={(e) => {
                    soundFx.playTactileClick(1.0);
                    const next = composeMinutes(
                      endParts.hour12,
                      Number(e.target.value),
                      endParts.period
                    );
                    updateEndDirectly(next);
                  }}
                  className="bg-slate-900/80 text-white font-mono text-xs font-extrabold rounded-md px-1 py-0.5 border border-white/15 focus:outline-none focus:border-blue-400 cursor-pointer appearance-none text-center"
                  title="End Minute"
                >
                  {MINUTE_STEPS.map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTactileClick(1.05);
                    const nextPeriod = endParts.period === 'AM' ? 'PM' : 'AM';
                    const next = composeMinutes(
                      endParts.hour12,
                      endParts.minute,
                      nextPeriod
                    );
                    updateEndDirectly(next);
                  }}
                  className="clay-button ml-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-extrabold text-slate-100 transition-colors"
                  title="Toggle AM / PM"
                >
                  {endParts.period}
                </button>
              </div>

              {/* -15m / +15m nudge buttons */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTactileClick(0.95);
                    updateEndDirectly(endMinutes - 15);
                  }}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                  title="Shorten by 15m"
                >
                  <Minus className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTactileClick(1.05);
                    updateEndDirectly(endMinutes + 15);
                  }}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                  title="Extend by 15m"
                >
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Quick Duration Chips */}
      <div className="flex items-center gap-1">
        <span className="text-[9.5px] font-mono font-semibold text-slate-400 mr-0.5 shrink-0">
          Duration:
        </span>
        <div className="grid grid-cols-6 gap-1 flex-1">
          {DURATION_PRESETS.map((preset) => {
            const active = currentDuration === preset.mins;
            return (
              <button
                key={preset.mins}
                type="button"
                onClick={() => applyDurationPreset(preset.mins)}
                className={`py-1 rounded-lg font-mono text-[10px] font-bold transition-all border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm scale-[1.02]'
                    : 'clay-button text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
