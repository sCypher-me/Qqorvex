declare module "tesseract.js" {
  interface LoggerMessage {
    status?: string;
    progress: number;
  }

  interface Worker {
    recognize(image: string): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }

  interface CreateWorkerOptions {
    logger?: (message: LoggerMessage) => void;
  }

  export function createWorker(
    language: string,
    oem?: unknown,
    options?: CreateWorkerOptions,
  ): Promise<Worker>;
}
