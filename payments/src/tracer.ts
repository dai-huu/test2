import { initTracer } from 'jaeger-client';

const config = {
  serviceName: 'payments', // Tên dịch vụ
  sampler: {
    type: 'const',
    param: 1,
  },
  reporter: {
    logSpans: true,
    collectorEndpoint: process.env.JAEGER_COLLECTOR_URL, // Lấy từ biến môi trường
  },
};

const options = {
  logger: {
    info: (msg: string) => {
      console.log('INFO', msg);
    },
    error: (msg: string) => {
      console.error('ERROR', msg);
    },
  },
};

export const tracer = initTracer(config, options);