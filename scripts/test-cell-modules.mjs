import { build } from 'esbuild';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  absWorkingDir: root,
  entryPoints: [process.argv[2] ?? 'scripts/cellModules.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
  plugins: [
    {
      name: 'isolate-trigger-storage-hooks',
      setup(builder) {
        builder.onResolve({ filter: /^\.\/use(Data|ScriptFiles)$/ }, (args) =>
          args.importer.endsWith('/hooks/useTagTriggers.ts')
            ? { path: args.path, namespace: 'storage-hook' }
            : undefined
        );
        builder.onLoad({ filter: /.*/, namespace: 'storage-hook' }, () => ({
          contents: `const unused = () => { throw new Error("Storage hooks cannot run in pure trigger tests"); };
          export { unused as useList, unused as useValue, unused as useScriptFilesReader };`,
          loader: 'js',
        }));
      },
    },
  ],
});
const filename = fileURLToPath(new URL('./cellModules.test.cjs', import.meta.url));
const suite = new Module(filename);
suite.filename = filename;
suite.paths = Module._nodeModulePaths(root);
suite._compile(result.outputFiles[0].text, filename);
