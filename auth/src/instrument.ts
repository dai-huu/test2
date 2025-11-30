import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// import { JaegerExporter } from '@opentelemetry/exporter-jaeger'; // <-- XÓA HOẶC BỎ COMMENT
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http'; // <-- THÊM OTLP EXPORTER


// --- Lấy Endpoint (TỪ BIẾN OTLP CHUẨN) ---
const customEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Sử dụng OTLP Exporter (chắc chắn sẽ gửi OTLP)
const otlpExporter = new OTLPTraceExporter({
    url: customEndpoint // <-- ÉP BUỘC DÙNG ENDPOINT NÀY
}); 


// Ensure service name is set via env (NodeSDK will pick this up)
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'auth-service';

// Khởi tạo Node SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'auth-service',
  }),
  // traceExporter: customEndpoint ? otlpExporter : undefined, // KHÔNG DÙNG CÁCH NÀY NỮA
  
  // Dùng SimpleSpanProcessor để gửi ngay lập tức
  spanProcessor: customEndpoint ? new SimpleSpanProcessor(otlpExporter) : undefined,
  
  // Tự động theo dõi các thư viện Express, HTTP, Mongoose/MongoDB
  instrumentations: [getNodeAutoInstrumentations()],
});

// ... (các hàm start, shutdown khác giữ nguyên)