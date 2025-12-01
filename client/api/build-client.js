import axios from 'axios';

export default ({ req }) => {
  if (typeof window === 'undefined') {
    // We are on the server
    // create an axios instance that forwards incoming headers and injects tracing headers
    const tracer = require('../src/tracer');
    const { extractFromHeaders, injectToHeaders, startOutgoingSpan } = require('../src/tracing-utils');

    const instance = axios.create({
      baseURL: 'http://ingress-nginx-controller.ingress-nginx.svc.cluster.local',
      headers: req.headers,
    });

    // request interceptor: start span and inject trace headers
    instance.interceptors.request.use((config) => {
      try {
        if (tracer) {
          // try to extract parent context from the incoming request headers (if present)
          const parentCtx = extractFromHeaders(tracer, req && req.headers ? req.headers : undefined);

          const method = (config && config.method && config.method.toUpperCase()) || 'GET';
          const url = config && config.url;
          const span = startOutgoingSpan
            ? startOutgoingSpan(tracer, req, method, url)
            : tracer.startSpan(`client.outgoing ${method} ${url}`, {
                childOf: parentCtx || undefined,
                tags: {
                  'http.method': method,
                  'http.url': url,
                  'service.name': 'client',
                  'span.kind': 'client',
                },
              });
          // attach span so response interceptor can finish it
          config.__jaegerSpan = span;
          // inject headers
          const headers = config.headers || {};
          try {
            injectToHeaders(tracer, span, headers);
          } catch (e) {
            // ignore inject errors
          }
          config.headers = headers;
        }
      } catch (e) {
        // do nothing
      }
      return config;
    });

    // response interceptor: finish span
    instance.interceptors.response.use(
      (response) => {
        try {
          const span = response.config && response.config.__jaegerSpan;
          if (span) {
            span.setTag('http.status_code', response.status);
            span.finish();
          }
        } catch (e) {}
        return response;
      },
      (error) => {
        try {
          const span = error.config && error.config.__jaegerSpan;
          if (span) {
            span.setTag('error', true);
            span.log({ event: 'error', message: error.message });
            span.finish();
          }
        } catch (e) {}
        return Promise.reject(error);
      }
    );

    return instance;
  } else {
    // We must be on the browser
    return axios.create({
      baseUrl: '/',
    });
  }
};
