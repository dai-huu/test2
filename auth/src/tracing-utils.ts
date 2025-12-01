export const extractFromHeaders = (tracer: any, headers: any) => {
  try {
    if (!tracer || !headers) return undefined;
    return tracer.extract('http_headers', headers);
  } catch (e) {
    return undefined;
  }
};

export const injectToHeaders = (tracer: any, span: any, headers: any) => {
  try {
    if (!tracer || !span || !headers) return;
    tracer.inject(span.context(), 'http_headers', headers);
  } catch (e) {
    // ignore
  }
};

export default { extractFromHeaders, injectToHeaders };
