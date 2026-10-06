import { describe, expect, it, vi } from "vitest";
import { requestModelWithFallbacks } from "./geminiFallback";

describe("requestModelWithFallbacks", () => {
  it("continues to the next model after a timeout and returns its successful response", async () => {
    const request = vi.fn<(_: string) => Promise<Response | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const onFallback = vi.fn();

    const response = await requestModelWithFallbacks(["primary", "fallback"], request, onFallback);

    expect(response?.status).toBe(200);
    expect(request.mock.calls.map(([model]) => model)).toEqual(["primary", "fallback"]);
    expect(onFallback).toHaveBeenCalledWith("primary", "fallback", null);
  });

  it("does not retry a model more than once when it is also listed as a fallback", async () => {
    const request = vi.fn<(_: string) => Promise<Response | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await requestModelWithFallbacks(["fallback", "fallback", "last"], request);

    expect(response?.status).toBe(200);
    expect(request.mock.calls.map(([model]) => model)).toEqual(["fallback", "last"]);
  });

  it("stops on a non-retryable response", async () => {
    const request = vi.fn<(_: string) => Promise<Response | null>>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }));

    const response = await requestModelWithFallbacks(["primary", "fallback"], request);

    expect(response?.status).toBe(401);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns null after all model requests time out", async () => {
    const request = vi.fn<(_: string) => Promise<Response | null>>().mockResolvedValue(null);

    const response = await requestModelWithFallbacks(["primary", "fallback"], request);

    expect(response).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
