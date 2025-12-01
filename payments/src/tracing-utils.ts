export const injectTraceTo = (tracer: any, span: any, target: any) => {
  try {
    if (!span || !tracer) return;
    const carrier: Record<string, string> = {};
    tracer.inject(span.context(), 'text_map', carrier);
    target._trace = carrier;
  } catch (e) {
    // ignore
  }
};

export const extractTraceFrom = (tracer: any, src: any) => {
  try {
    if (!tracer) return undefined;
    return tracer.extract('text_map', (src && src._trace) ? src._trace : {});
  } catch (e) {
    return undefined;
  }
};

export default { injectTraceTo, extractTraceFrom };
