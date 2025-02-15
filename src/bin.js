/**
 * @fileoverview The main entry point for the CLI.
 * @author Nicholas C. Zakas
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { CLI } from "./cli.js";

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

const cli = new CLI();
const args = process.argv.slice(2);
const exitCode = await cli.execute(args);

process.exitCode = exitCode;
