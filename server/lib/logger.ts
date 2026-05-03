export type LogMeta = Record<string, unknown>;

function output(level: string, msg: string, meta?: LogMeta) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...meta,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (msg: string, meta?: LogMeta) => output("info", msg, meta),
  warn: (msg: string, meta?: LogMeta) => output("warn", msg, meta),
  error: (msg: string, meta?: LogMeta) => output("error", msg, meta),
};
