const baseLogger = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify(Object.assign({ msg }, meta || {}))),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify(Object.assign({ msg }, meta || {}))),
  error: (msg: string, meta?: any) => console.error(JSON.stringify(Object.assign({ msg }, meta || {}))),
  child: (meta: any) => ({
    info: (m: string, mm?: any) => baseLogger.info(m, Object.assign({}, meta, mm)),
    warn: (m: string, mm?: any) => baseLogger.warn(m, Object.assign({}, meta, mm)),
    error: (m: string, mm?: any) => baseLogger.error(m, Object.assign({}, meta, mm)),
  }),
};

export default baseLogger;
