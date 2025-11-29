const { initTracer } = require('jaeger-client');

const config = {
  serviceName: 'client',
  sampler: {
    type: 'const',
    param: 1,
  },
  reporter: {
    logSpans: true,
    collectorEndpoint: process.env.JAEGER_COLLECTOR_URL,
  },
};

const options = {
  logger: {
    info: (msg) => {
      console.log('INFO', msg);
    },
    error: (msg) => {
      console.error('ERROR', msg);
    },
  },
};

let tracer;
try {
  tracer = initTracer(config, options);
  // eslint-disable-next-line no-console
  console.log('Jaeger tracer initialized for client (server-side)');
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Failed to initialize Jaeger tracer (client):', err);
}

module.exports = tracer;
