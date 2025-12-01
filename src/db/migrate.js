#!/usr/bin/env node

/**
 * Database Migration Script
 * Run this to initialize or update the database schema
 */

import { initDatabase } from './index.js';

async function migrate() {
  console.log('🔧 Running database migrations...\n');
  
  try {
    await initDatabase();
    console.log('\n✅ Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

