"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filterListingsBySearchInput } from "@/search/filters";
import { SEARCH_CACHE_TTL_MS, type SearchInput, type SearchResponse } from "@/search/schema";

export const CLIENT_SEARCH_TIMEOUT_MS = 70_000;

type CacheEntry = {
  expiresAt: number;
  value: SearchResponse;
};

const clientSearchCache = new Map<string, CacheEntry>();

function searchCacheKey(input: SearchInput): string {
  return JSON.stringify({
    country: input.country,
    location: input.location.trim().toLowerCase(),
    listingType: input.listingType,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    zip: input.zip ?? null,
  });
}

function readClientCache(key: string): SearchResponse | null {
  const entry = clientSearchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    clientSearchCache.delete(key);
    return null;
  }
  return { ...entry.value, cached: true };
}

function writeClientCache(key: string, value: SearchResponse): void {
  clientSearchCache.set(key, {
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    value,
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

function withInputFilters(input: SearchInput, response: SearchResponse): SearchResponse {
  return {
    ...response,
    listings: filterListingsBySearchInput(response.listings, input),
  };
}

export function useSearchRequest() {
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [loading]);

  const abort = useCallback(() => {
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;
    setLoading(false);
  }, []);

  const run = useCallback(async (input: SearchInput) => {
    const key = searchCacheKey(input);
    const cached = readClientCache(key);
    if (cached) {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      setResult(withInputFilters(input, cached));
      setError(null);
      setLoading(false);
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_SEARCH_TIMEOUT_MS);
    setLoading(true);
    setElapsedSec(0);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok && !data.listings) {
        setError(data.error || "Search failed");
        setResult(null);
        return;
      }
      const response = withInputFilters(input, data as SearchResponse);
      writeClientCache(key, response);
      setResult(response);
      if (!res.ok && data.error) {
        setError(data.error);
      }
    } catch (error) {
      if (searchAbortRef.current !== controller) return;
      if (isAbortError(error)) {
        setError(
          "Realtor.com took too long. Try that ZIP again — a retry is often faster.",
        );
        setResult(null);
        return;
      }
      setError("Unable to reach the search API");
      setResult(null);
    } finally {
      window.clearTimeout(timeoutId);
      if (searchAbortRef.current === controller) {
        setLoading(false);
      }
    }
  }, []);

  return { loading, elapsedSec, error, result, run, abort };
}

export function clearClientSearchCacheForTests() {
  clientSearchCache.clear();
}
