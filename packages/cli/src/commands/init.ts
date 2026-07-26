import {
  createDefaultConfig,
  loadCliConfig,
  mergeConfig,
  saveCliConfig,
} from '../config/project-config.js';
import { DEFAULT_ROOT_DIR, DEFAULT_STYLES_DIR } from '../config/defaults.js';
import { promptForStylesEnabled } from '../services/interactive.js';
import { runLegacyStyleCommand } from '../services/legacy-styles.js';
import { ensureDir, relativeToCwd } from '../utils/fs.js';
import { isInteractiveDisabled, parseArgv, resolveBooleanOption } from '../utils/args.js';

export async function runInitCommand(argv: string[]): Promise<void> {
  const { options } = parseArgv(argv);
  const cwd = process.cwd();
  const rootDir = (options['root-dir'] as string | undefined) ?? DEFAULT_ROOT_DIR;
  const stylesDir = (options['styles-dir'] as string | undefined) ?? DEFAULT_STYLES_DIR;
  const stylePreset = ((options.prototypes as string | undefined) ?? 'shadcn').toLowerCase();
  if (!['shadcn', 'brutalist'].includes(stylePreset)) {
    throw new Error(`unknown prototypes "${stylePreset}". supported: shadcn, brutalist`);
  }
  const interactive =
    !isInteractiveDisabled(options) &&
    process.stdin.isTTY &&
    process.stdout.isTTY &&
    options.y !== true &&
    options.yes !== true;

  let stylesEnabled = !(
    resolveBooleanOption(options, 'styles', true) === false ||
    resolveBooleanOption(options, 'tailwind', true) === false
  );

  if (
    interactive &&
    typeof options.styles === 'undefined' &&
    typeof options.tailwind === 'undefined'
  ) {
    stylesEnabled = await promptForStylesEnabled(true);
  }

  const nextConfig = createDefaultConfig({
    rootDir,
    stylesDir,
    stylesEnabled,
  });
  if (stylesEnabled) nextConfig.styles.preset = stylePreset;

  const { config: existingConfig, paths } = await loadCliConfig(cwd, rootDir);
  const mergedConfig = existingConfig ? mergeConfig(existingConfig, nextConfig) : nextConfig;

  await ensureDir(paths.rootAbs);
  await ensureDir(paths.componentsDir);
  await ensureDir(paths.adaptersDir);
  await ensureDir(paths.prototypesDir);
  await saveCliConfig(cwd, mergedConfig);

  console.log(`[proto-ui] init: wrote ${relativeToCwd(paths.configPath, cwd)}`);
  console.log(
    `[proto-ui] init: ensured ${relativeToCwd(paths.componentsDir, cwd)}, ${relativeToCwd(paths.adaptersDir, cwd)}, ${relativeToCwd(paths.prototypesDir, cwd)}`
  );

  if (stylesEnabled) {
    await runLegacyStyleCommand([stylePreset, '--styles-dir', stylesDir]);
  } else {
    console.log('[proto-ui] init: skipped style preset generation');
  }
}
