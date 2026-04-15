import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const npmUserAgent = process.env.npm_config_user_agent || '';
const usingPnpm = npmUserAgent.includes('pnpm/');

function buildChildEnv() {
    const env = { ...process.env };
    // pnpm install passes command-specific npm_config_* flags to lifecycle scripts.
    // Reusing pnpm inside postinstall can fail if these inherited flags are not valid
    // for the nested command (e.g. add/rebuild).
    delete env.npm_config_frozen_lockfile;
    delete env.NPM_CONFIG_FROZEN_LOCKFILE;
    delete env.npm_config_prefer_offline;
    delete env.NPM_CONFIG_PREFER_OFFLINE;
    delete env.npm_config_lockfile;
    delete env.NPM_CONFIG_LOCKFILE;
    // Defensive cleanup for any remaining lockfile/offline flags forwarded by CI.
    for (const key of Object.keys(env)) {
        const normalized = key.toLowerCase();
        if (!normalized.startsWith('npm_config_')) continue;
        if (
            normalized.includes('frozen_lockfile') ||
            normalized.includes('frozen-lockfile') ||
            normalized.includes('prefer_offline') ||
            normalized.includes('prefer-offline') ||
            normalized.endsWith('lockfile')
        ) {
            delete env[key];
        }
    }
    return env;
}

if (process.env.SKIP_ENSURE_NATIVE_DEPS === '1') {
    process.exit(0);
}

// First, ensure better-sqlite3 is compiled (required for all platforms)
console.log('[ensure-native-deps] Checking better-sqlite3 compilation...');
try {
    const betterSqlitePath = require.resolve('better-sqlite3');
    const betterSqliteDir = betterSqlitePath.split('better-sqlite3')[0] + 'better-sqlite3';

    // Check if the binding exists
    const bindingExists = existsSync(`${betterSqliteDir}/build/Release/better_sqlite3.node`) ||
        existsSync(`${betterSqliteDir}/build/better_sqlite3.node`);

    if (!bindingExists) {
        console.log('[ensure-native-deps] Compiling better-sqlite3...');
        execSync(usingPnpm ? 'pnpm rebuild better-sqlite3' : 'npm rebuild better-sqlite3', {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: {
                ...buildChildEnv(),
                SKIP_ENSURE_NATIVE_DEPS: '1',
            },
        });
        console.log('[ensure-native-deps] ✅ better-sqlite3 compiled successfully');
    } else {
        console.log('[ensure-native-deps] ✅ better-sqlite3 already compiled');
    }
} catch (error) {
    console.error('[ensure-native-deps] Warning: Could not ensure better-sqlite3 compilation:', error.message);
}

// This is primarily to protect Linux CI/container builds where the install step
// can be cached (e.g. Railpack) and optional native deps were previously omitted.
if (process.platform !== 'linux') {
    process.exit(0);
}

const arch = process.arch;

function isMusl() {
    try {
        const report = process.report?.getReport?.();
        const glibc = report?.header?.glibcVersionRuntime;
        return !glibc;
    } catch {
        return false;
    }
}

const musl = isMusl();

// Map to the most common native packages used by Strapi's admin tooling.
// Rollup:
const rollupPackage =
    arch === 'x64'
        ? (musl ? '@rollup/rollup-linux-x64-musl' : '@rollup/rollup-linux-x64-gnu')
        : arch === 'arm64'
            ? (musl ? '@rollup/rollup-linux-arm64-musl' : '@rollup/rollup-linux-arm64-gnu')
            : null;

// SWC:
const swcPackage =
    arch === 'x64'
        ? (musl ? '@swc/core-linux-x64-musl' : '@swc/core-linux-x64-gnu')
        : arch === 'arm64'
            ? (musl ? '@swc/core-linux-arm64-musl' : '@swc/core-linux-arm64-gnu')
            : null;

function getInstalledVersion(pkgName) {
    try {
        return require(`${pkgName}/package.json`).version;
    } catch {
        return null;
    }
}

function isModulePresent(pkgName) {
    if (!pkgName) return true;
    try {
        require.resolve(pkgName);
        return true;
    } catch {
        return false;
    }
}

// Fallback for cases where require.resolve isn't reliable due to partial installs.
function isPackageDirPresent(pkgName) {
    if (!pkgName) return true;
    const path = new URL(`../node_modules/${pkgName}/package.json`, import.meta.url);
    return existsSync(path);
}

// In pnpm, optional native packages may not be hoisted at root level.
// Resolve from the parent package location when possible.
function isResolvableFromParent(pkgName, parentPkgName) {
    if (!pkgName || !parentPkgName) return true;
    try {
        const parentPkgJson = require.resolve(`${parentPkgName}/package.json`);
        const parentDir = parentPkgJson.slice(0, -'package.json'.length);
        require.resolve(pkgName, { paths: [parentDir] });
        return true;
    } catch {
        return false;
    }
}

const missing = [];
if (
    !isModulePresent(rollupPackage) &&
    !isPackageDirPresent(rollupPackage) &&
    !isResolvableFromParent(rollupPackage, 'rollup')
) {
    missing.push(rollupPackage);
}
if (
    !isModulePresent(swcPackage) &&
    !isPackageDirPresent(swcPackage) &&
    !isResolvableFromParent(swcPackage, '@swc/core')
) {
    missing.push(swcPackage);
}

if (missing.length === 0) {
    process.exit(0);
}

console.log(`[ensure-native-deps] Missing native optional deps on linux/${arch}: ${missing.join(', ')}`);
console.log(
    `[ensure-native-deps] Running ${usingPnpm ? 'pnpm install --include=optional' : 'npm install --include=optional'} to repair...`
);

execSync(
    usingPnpm
        ? 'pnpm install --include=optional'
        : 'npm install --include=optional --no-audit --no-fund',
    {
        stdio: 'inherit',
        env: {
            ...buildChildEnv(),
            // Ensure optional deps are not omitted.
            NPM_CONFIG_OPTIONAL: 'true',
            SKIP_ENSURE_NATIVE_DEPS: '1',
        },
    }
);

const stillMissing = [];
if (
    !isModulePresent(rollupPackage) &&
    !isPackageDirPresent(rollupPackage) &&
    !isResolvableFromParent(rollupPackage, 'rollup')
) {
    stillMissing.push(rollupPackage);
}
if (
    !isModulePresent(swcPackage) &&
    !isPackageDirPresent(swcPackage) &&
    !isResolvableFromParent(swcPackage, '@swc/core')
) {
    stillMissing.push(swcPackage);
}

if (stillMissing.length === 0) {
    process.exit(0);
}

if (usingPnpm) {
    console.warn(
        `[ensure-native-deps] Optional native deps still unresolved under pnpm: ${stillMissing.join(', ')}`
    );
    console.warn(
        '[ensure-native-deps] Skipping force-install in pnpm lifecycle script; build step will surface any real missing binary.'
    );
    process.exit(0);
}

// npm can sometimes keep optional deps missing in CI/container environments.
// If that happens, install the required platform packages explicitly.
const rollupVersion = getInstalledVersion('rollup');
const swcCoreVersion = getInstalledVersion('@swc/core');

for (const pkgName of stillMissing) {
    const version = pkgName.startsWith('@rollup/') ? rollupVersion : swcCoreVersion;
    const spec = version ? `${pkgName}@${version}` : pkgName;
    console.log(`[ensure-native-deps] Forcing install: ${spec}`);
    execSync(
        usingPnpm
            ? `pnpm add --save-optional --save-exact ${spec}`
            : `npm install --no-save --no-package-lock --no-audit --no-fund ${spec}`,
        {
            stdio: 'inherit',
            env: {
                ...buildChildEnv(),
                NPM_CONFIG_OPTIONAL: 'true',
                SKIP_ENSURE_NATIVE_DEPS: '1',
            },
        }
    );
}

const finalMissing = [];
if (
    !isModulePresent(rollupPackage) &&
    !isPackageDirPresent(rollupPackage) &&
    !isResolvableFromParent(rollupPackage, 'rollup')
) {
    finalMissing.push(rollupPackage);
}
if (
    !isModulePresent(swcPackage) &&
    !isPackageDirPresent(swcPackage) &&
    !isResolvableFromParent(swcPackage, '@swc/core')
) {
    finalMissing.push(swcPackage);
}

if (finalMissing.length > 0) {
    console.error(`[ensure-native-deps] Still missing after repair: ${finalMissing.join(', ')}`);
    process.exit(1);
}
