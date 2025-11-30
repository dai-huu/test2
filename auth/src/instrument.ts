import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// --- PHẦN SỬA ĐỔI CHÍNH Ở ĐÂY ---
// Lấy giá trị endpoint mà bạn đã đặt trong YAML (OTEL_EXPORTER_OTLP_ENDPOINT)
const customEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Sẽ dùng JaegerExporter, và truyền endpoint thủ công vào.
// Chú ý: Chúng ta đang cố gắng ép JaegerExporter gửi dữ liệu tới OTLP Endpoint.
// Đây là thử nghiệm cuối cùng của cách này.
const jaegerExporter = new JaegerExporter({
    endpoint: customEndpoint, 
    // Nếu endpoint không tồn tại, nó sẽ cố gắng dùng biến JAEGER_ENDPOINT
});
// ---------------------------------


// Ensure service name is set via env (NodeSDK will pick this up)
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'auth-service';

// Khởi tạo Node SDK
const sdk = new NodeSDK({
  // NodeSDK will derive the resource from environment variables
  // Kiểm tra nếu endpoint tồn tại để tránh lỗi khởi tạo
  traceExporter: customEndpoint ? jaegerExporter : undefined, 
  // Tự động theo dõi các thư viện Express, HTTP, Mongoose/MongoDB
  instrumentations: [getNodeAutoInstrumentations()],
});

// Khởi động OpenTelemetry
sdk.start();
console.log(`OpenTelemetry instrumentation started for service: ${process.env.OTEL_SERVICE_NAME || 'auth-service'} with endpoint: ${customEndpoint || 'default'}`);

// Xử lý khi ứng dụng tắt
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});