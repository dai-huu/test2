import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Sẽ dùng biến môi trường OTEL_EXPORTER_JAEGER_ENDPOINT
// để trỏ đến Jaeger Collector (NodeIP:NodePort/api/traces)
const jaegerExporter = new JaegerExporter({}); 

// Khởi tạo Node SDK
const sdk = new NodeSDK({
  // Đặt tên service, lấy từ biến môi trường OTEL_SERVICE_NAME
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'auth-service',
  }),
  // Thiết lập Exporter để gửi trace
  traceExporter: jaegerExporter,
  // Tự động theo dõi các thư viện Express, HTTP, Mongoose/MongoDB
  instrumentations: [getNodeAutoInstrumentations()],
});

// Khởi động OpenTelemetry
sdk.start();
console.log('OpenTelemetry instrumentation started for service:', process.env.OTEL_SERVICE_NAME || 'auth-service');

// Xử lý khi ứng dụng tắt
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

// THÊM: Nếu bạn có các thư viện bên ngoài OpenTelemetry không tự động theo dõi được,
// bạn sẽ cần lấy Tracer thủ công, nhưng với auto-instrumentation, thường không cần.