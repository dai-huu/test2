exports.extractFromHeaders = (tracer, headers) => {
  try {
    if (!tracer || !headers) return undefined;
    return tracer.extract('http_headers', headers);
  } catch (e) {
    return undefined;
  }
};

exports.injectToHeaders = (tracer, span, headers) => {
  try {
    if (!tracer || !span || !headers) return;
    tracer.inject(span.context(), 'http_headers', headers);
  } catch (e) {
    // ignore
  }
};

exports.injectToObject = (tracer, span, target) => {
  try {
    if (!tracer || !span || !target) return;
    const carrier = {};
    tracer.inject(span.context(), 'text_map', carrier);
    target._trace = carrier;
  } catch (e) {
    // ignore
  }
};

exports.extractFromObject = (tracer, src) => {
  try {
    if (!tracer || !src) return undefined;
    return tracer.extract('text_map', src._trace || {});
  } catch (e) {
    return undefined;
  }
};
