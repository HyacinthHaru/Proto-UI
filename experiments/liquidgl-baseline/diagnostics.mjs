// Record caught renderer failures as well as uncaught page exceptions.
export function recordBrowserSignal(report, type, text) {
  report.browserSignals.push({ type, text });
  if (
    type === 'pageerror' ||
    type === 'error' ||
    (type === 'warning' && /liquidGL|shader|program link|device.*lost|context.*lost/i.test(text))
  )
    report.errors.push(`${type}: ${text}`);
}
