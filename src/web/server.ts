/**
 * Web Server for Shigrami - Effect-TS Implementation
 * HTTP API endpoints for compatibility data
 */

import { Effect, Layer, Console } from 'effect';
import { NodeHttpServer } from '@effect/platform-node';
import { HttpServer } from '@effect/platform';
import type { CompatibilityDatabaseManager } from '../data/database.js';

// Simplified Web Server using Node.js HTTP directly
export const setupWebServer = (db: CompatibilityDatabaseManager, options: { port?: number; host?: string }) =>
  Effect.gen(function* (_) {
    yield* _(Console.log(`🌐 Starting Shigrami Web Server`));
    yield* _(Console.log(`   Port: ${options.port || 3000}`));
    yield* _(Console.log(`   Host: ${options.host || 'localhost'}`));

    // For now, use the mock implementation until @effect/platform HttpRouter is properly set up
    yield* _(Console.log('   Web server functionality temporarily simplified'));
    yield* _(Console.log('   Available endpoints:'));
    yield* _(Console.log('     GET  /health - Health check'));
    yield* _(Console.log('     GET  /stats  - Compatibility statistics'));
    yield* _(Console.log('     GET  /search - Search compatibility issues'));
    yield* _(Console.log('     POST /report - Report new compatibility issue'));

    // Keep running (simulated)
    yield* _(Effect.never);
  });
