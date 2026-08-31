#!/usr/bin/env python3
"""Benchmark streamed Gemini text generation without storing the API key.

The key is read from GEMINI_API_KEY. If the variable is absent in an
interactive terminal, the script asks for it with hidden input.

Examples:
    python3 scripts/benchmark_gemini.py
    python3 scripts/benchmark_gemini.py --runs 5 --thinking-level low
    python3 scripts/benchmark_gemini.py --prompt "Write exactly 500 words."
"""

from __future__ import annotations

import argparse
import getpass
import http.client
import json
import os
import statistics
import sys
import time
import urllib.parse
from dataclasses import asdict, dataclass
from typing import Any, Iterator


API_HOST = "generativelanguage.googleapis.com"
DEFAULT_MODEL = "gemini-3.7-flash"
DEFAULT_PROMPT = (
    "Explain how a web browser loads a page in around 300 words. Start the "
    "answer immediately and do not count the words. Use plain text only, with "
    "no headings or bullet points."
)


class BenchmarkError(RuntimeError):
    """An expected benchmark or API failure."""


@dataclass(frozen=True)
class RunResult:
    run: int
    response_headers_seconds: float
    first_event_seconds: float
    ttft_seconds: float
    total_seconds: float
    output_tokens: int | None
    prompt_tokens: int | None
    thought_tokens: int | None
    total_tokens: int | None
    output_characters: int
    output_words: int
    finish_reason: str | None
    model_version: str | None
    response_id: str | None

    @property
    def decode_tokens_per_second(self) -> float | None:
        """Visible tokens after the first token divided by visible stream time."""
        if self.output_tokens is None or self.output_tokens < 2:
            return None
        decode_seconds = self.total_seconds - self.ttft_seconds
        if decode_seconds <= 0:
            return None
        return (self.output_tokens - 1) / decode_seconds

    @property
    def end_to_end_tokens_per_second(self) -> float | None:
        if self.output_tokens is None or self.total_seconds <= 0:
            return None
        return self.output_tokens / self.total_seconds

    def as_json(self) -> dict[str, Any]:
        result = asdict(self)
        result["decode_tokens_per_second"] = self.decode_tokens_per_second
        result["end_to_end_tokens_per_second"] = self.end_to_end_tokens_per_second
        return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Measure Gemini streaming latency, time to first visible token, "
            "token throughput, and API token usage."
        )
    )
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--runs", type=positive_int, default=3)
    parser.add_argument("--warmup", type=non_negative_int, default=0)
    parser.add_argument(
        "--thinking-level",
        choices=("minimal", "low", "medium", "high"),
        default="medium",
        help=(
            "Thinking level (default: medium). Gemini 3.7 Flash does not "
            "support minimal."
        ),
    )
    parser.add_argument("--max-output-tokens", type=positive_int, default=2_048)
    parser.add_argument("--timeout", type=positive_float, default=120.0)
    parser.add_argument("--prompt", default=DEFAULT_PROMPT)
    parser.add_argument(
        "--api-key-env",
        default="GEMINI_API_KEY",
        help="Environment variable containing the API key.",
    )
    parser.add_argument(
        "--show-output",
        action="store_true",
        help="Print the complete generated text after each measured run.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print one JSON document instead of the human-readable report.",
    )
    return parser.parse_args()


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("must be zero or greater")
    return parsed


def positive_float(value: str) -> float:
    parsed = float(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def read_api_key(variable_name: str) -> str:
    key = os.environ.get(variable_name, "").strip()
    if key:
        return key

    if sys.stdin.isatty():
        key = getpass.getpass(f"{variable_name} (hidden): ").strip()
        if key:
            return key

    raise BenchmarkError(
        f"No API key found. Set {variable_name} or run this script in an "
        "interactive terminal to use the hidden prompt."
    )


def iter_sse_json(response: http.client.HTTPResponse) -> Iterator[dict[str, Any]]:
    """Yield JSON payloads from an SSE response, including multiline events."""
    data_lines: list[str] = []

    while True:
        raw_line = response.readline()
        if not raw_line:
            if data_lines:
                payload = "\n".join(data_lines)
                if payload != "[DONE]":
                    yield parse_event_json(payload)
            return

        line = raw_line.decode("utf-8", errors="replace").rstrip("\r\n")
        if not line:
            if data_lines:
                payload = "\n".join(data_lines)
                data_lines.clear()
                if payload != "[DONE]":
                    yield parse_event_json(payload)
            continue

        if line.startswith(":"):
            continue

        field, separator, value = line.partition(":")
        if field == "data":
            data_lines.append(value.lstrip(" ") if separator else "")


def parse_event_json(payload: str) -> dict[str, Any]:
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError as error:
        raise BenchmarkError(f"Gemini returned invalid SSE JSON: {error}") from error
    if not isinstance(parsed, dict):
        raise BenchmarkError("Gemini returned an unexpected non-object SSE event.")
    return parsed


def extract_visible_text(event: dict[str, Any]) -> str:
    text_parts: list[str] = []
    for candidate in event.get("candidates") or []:
        content = candidate.get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if isinstance(text, str) and text and part.get("thought") is not True:
                text_parts.append(text)
    return "".join(text_parts)


def extract_finish_reason(event: dict[str, Any]) -> str | None:
    for candidate in event.get("candidates") or []:
        finish_reason = candidate.get("finishReason")
        if isinstance(finish_reason, str):
            return finish_reason
    return None


def optional_int(mapping: dict[str, Any], key: str) -> int | None:
    value = mapping.get(key)
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def run_benchmark(
    *,
    api_key: str,
    model: str,
    prompt: str,
    thinking_level: str,
    max_output_tokens: int,
    timeout: float,
    run_number: int,
) -> tuple[RunResult, str]:
    request_body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "maxOutputTokens": max_output_tokens,
                "thinkingConfig": {"thinkingLevel": thinking_level},
            },
        },
        separators=(",", ":"),
    ).encode("utf-8")

    model_path = urllib.parse.quote(model, safe="")
    endpoint = f"/v1beta/models/{model_path}:streamGenerateContent?alt=sse"
    connection = http.client.HTTPSConnection(API_HOST, timeout=timeout)

    start = time.perf_counter()
    first_event_at: float | None = None
    first_text_at: float | None = None
    text_chunks: list[str] = []
    usage: dict[str, Any] = {}
    finish_reason: str | None = None
    model_version: str | None = None
    response_id: str | None = None

    try:
        connection.request(
            "POST",
            endpoint,
            body=request_body,
            headers={
                "Content-Type": "application/json",
                "Accept": "text/event-stream",
                "Accept-Encoding": "identity",
                "Connection": "close",
                "x-goog-api-key": api_key,
            },
        )
        response = connection.getresponse()
        headers_at = time.perf_counter()

        if response.status < 200 or response.status >= 300:
            error_body = response.read(64_000).decode("utf-8", errors="replace")
            safe_error = format_api_error(response.status, response.reason, error_body)
            raise BenchmarkError(safe_error.replace(api_key, "[REDACTED]"))

        for event in iter_sse_json(response):
            event_at = time.perf_counter()
            if first_event_at is None:
                first_event_at = event_at

            visible_text = extract_visible_text(event)
            if visible_text:
                if first_text_at is None:
                    first_text_at = event_at
                text_chunks.append(visible_text)

            event_usage = event.get("usageMetadata")
            if isinstance(event_usage, dict):
                usage = event_usage

            finish_reason = extract_finish_reason(event) or finish_reason
            if isinstance(event.get("modelVersion"), str):
                model_version = event["modelVersion"]
            if isinstance(event.get("responseId"), str):
                response_id = event["responseId"]

        finished_at = time.perf_counter()
    except (OSError, http.client.HTTPException) as error:
        raise BenchmarkError(f"Gemini request failed: {error}") from error
    finally:
        connection.close()

    if first_event_at is None:
        raise BenchmarkError("Gemini returned a successful but empty SSE stream.")
    if first_text_at is None:
        raise BenchmarkError(
            "Gemini returned no visible text. The prompt may have been blocked; "
            f"finish reason: {finish_reason or 'unknown'}."
        )

    output = "".join(text_chunks)
    result = RunResult(
        run=run_number,
        response_headers_seconds=headers_at - start,
        first_event_seconds=first_event_at - start,
        ttft_seconds=first_text_at - start,
        total_seconds=finished_at - start,
        output_tokens=optional_int(usage, "candidatesTokenCount"),
        prompt_tokens=optional_int(usage, "promptTokenCount"),
        thought_tokens=optional_int(usage, "thoughtsTokenCount"),
        total_tokens=optional_int(usage, "totalTokenCount"),
        output_characters=len(output),
        output_words=len(output.split()),
        finish_reason=finish_reason,
        model_version=model_version,
        response_id=response_id,
    )
    return result, output


def format_api_error(status: int, reason: str, body: str) -> str:
    message = body.strip()
    try:
        parsed = json.loads(body)
        api_message = parsed.get("error", {}).get("message")
        if isinstance(api_message, str):
            message = api_message
    except (json.JSONDecodeError, AttributeError):
        pass
    return f"Gemini API returned HTTP {status} {reason}: {message[:1_000]}"


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * fraction
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)
    weight = position - lower_index
    return ordered[lower_index] * (1 - weight) + ordered[upper_index] * weight


def summarize(results: list[RunResult]) -> dict[str, Any]:
    ttft = [result.ttft_seconds for result in results]
    total = [result.total_seconds for result in results]
    decode_tps = [
        value
        for result in results
        if (value := result.decode_tokens_per_second) is not None
    ]
    end_to_end_tps = [
        value
        for result in results
        if (value := result.end_to_end_tokens_per_second) is not None
    ]

    summary: dict[str, Any] = {
        "ttft_seconds": metric_summary(ttft),
        "total_seconds": metric_summary(total),
    }
    if decode_tps:
        summary["decode_tokens_per_second"] = metric_summary(decode_tps)
    if end_to_end_tps:
        summary["end_to_end_tokens_per_second"] = metric_summary(end_to_end_tps)
    return summary


def metric_summary(values: list[float]) -> dict[str, float]:
    return {
        "min": min(values),
        "mean": statistics.fmean(values),
        "p50": percentile(values, 0.50),
        "p95": percentile(values, 0.95),
        "max": max(values),
    }


def format_optional_int(value: int | None) -> str:
    return str(value) if value is not None else "n/a"


def format_optional_rate(value: float | None) -> str:
    return f"{value:.1f} tok/s" if value is not None else "n/a"


def print_run(result: RunResult) -> None:
    print(f"Run {result.run}")
    print(f"  Response headers: {result.response_headers_seconds * 1_000:.0f} ms")
    print(f"  First SSE event:  {result.first_event_seconds * 1_000:.0f} ms")
    print(f"  TTFT:             {result.ttft_seconds * 1_000:.0f} ms")
    print(f"  Total latency:    {result.total_seconds:.3f} s")
    print(f"  Decode speed:     {format_optional_rate(result.decode_tokens_per_second)}")
    print(
        "  End-to-end speed: "
        f"{format_optional_rate(result.end_to_end_tokens_per_second)}"
    )
    print(
        "  Tokens:           "
        f"prompt={format_optional_int(result.prompt_tokens)}, "
        f"output={format_optional_int(result.output_tokens)}, "
        f"thought={format_optional_int(result.thought_tokens)}, "
        f"total={format_optional_int(result.total_tokens)}"
    )
    print(
        f"  Visible output:   {result.output_words} words, "
        f"{result.output_characters} characters"
    )
    print(f"  Finish reason:    {result.finish_reason or 'n/a'}")


def print_summary(summary: dict[str, Any]) -> None:
    print("\nSummary")
    for label, key, unit_scale, unit in (
        ("TTFT", "ttft_seconds", 1_000, "ms"),
        ("Total latency", "total_seconds", 1_000, "ms"),
        ("Decode speed", "decode_tokens_per_second", 1, "tok/s"),
        ("End-to-end speed", "end_to_end_tokens_per_second", 1, "tok/s"),
    ):
        values = summary.get(key)
        if not values:
            continue
        print(
            f"  {label:<18} "
            f"mean={values['mean'] * unit_scale:.1f} {unit}, "
            f"p50={values['p50'] * unit_scale:.1f} {unit}, "
            f"p95={values['p95'] * unit_scale:.1f} {unit}, "
            f"min={values['min'] * unit_scale:.1f} {unit}, "
            f"max={values['max'] * unit_scale:.1f} {unit}"
        )


def main() -> int:
    args = parse_args()
    try:
        api_key = read_api_key(args.api_key_env)
        results: list[RunResult] = []
        outputs: list[str] = []

        if not args.json:
            print(f"Model:          {args.model}")
            print(f"Thinking level: {args.thinking_level}")
            print(f"Measured runs:  {args.runs}")
            print(f"Warm-up runs:   {args.warmup}")
            print("Note: every warm-up and measured run is an API request and may be billed.\n")

        for warmup_index in range(args.warmup):
            if not args.json:
                print(f"Warm-up {warmup_index + 1}/{args.warmup} ...", flush=True)
            run_benchmark(
                api_key=api_key,
                model=args.model,
                prompt=args.prompt,
                thinking_level=args.thinking_level,
                max_output_tokens=args.max_output_tokens,
                timeout=args.timeout,
                run_number=0,
            )

        for run_number in range(1, args.runs + 1):
            if not args.json:
                print(f"Measuring {run_number}/{args.runs} ...", flush=True)
            result, output = run_benchmark(
                api_key=api_key,
                model=args.model,
                prompt=args.prompt,
                thinking_level=args.thinking_level,
                max_output_tokens=args.max_output_tokens,
                timeout=args.timeout,
                run_number=run_number,
            )
            results.append(result)
            outputs.append(output)

            if not args.json:
                print_run(result)
                if args.show_output:
                    print("\n--- Generated output ---")
                    print(output)
                    print("--- End output ---")
                print()

        summary = summarize(results)
        if args.json:
            print(
                json.dumps(
                    {
                        "configuration": {
                            "model": args.model,
                            "thinking_level": args.thinking_level,
                            "runs": args.runs,
                            "warmup": args.warmup,
                            "max_output_tokens": args.max_output_tokens,
                            "prompt": args.prompt,
                        },
                        "runs": [result.as_json() for result in results],
                        "summary": summary,
                        **({"outputs": outputs} if args.show_output else {}),
                    },
                    indent=2,
                )
            )
        else:
            print_summary(summary)
            print(
                "\nTTFT is measured to the first non-empty visible-text SSE chunk. "
                "Decode speed excludes TTFT and the first output token."
            )
        return 0
    except BenchmarkError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
