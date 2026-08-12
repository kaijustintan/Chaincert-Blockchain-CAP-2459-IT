import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
  DEV-SERVER CommonJS interop for src/utils/nameSimilarity.js.

  The build handles this file via build.commonjsOptions.include below — but that option configures
  ROLLUP, which only runs for `npm run build`. The dev server (`npm start`) is a different pipeline
  entirely: esbuild plus native browser ES modules, with no CommonJS interop applied to source files.
  So the browser received a file whose only export statement was `module.exports = {...}`, found no
  ESM exports on it, and refused to link the module:

    Uncaught SyntaxError: The requested module '/src/utils/nameSimilarity.js'
    does not provide an export named 'default'

  That crashed the whole SPA to a white screen, because issuerDashboardPage.js imports it and App.js
  loads that page eagerly. Webpack (CRA) applied the interop in both modes, which is why the gap only
  appeared after the Vite migration — and why a green `npm run build` did not catch it.

  The file must stay CommonJS: deploy-sync.sh copies it verbatim to ~/chaincert-api/utils/, where the
  Express controller loads it with require(). Converting it to ESM would break the backend at boot.

  So instead of touching the shared file, wrap it at dev-serve time in the same shim Rollup's commonjs
  plugin produces for the build: give it the `module`/`exports` objects CommonJS expects, then re-export
  the result as an ESM default. apply:'serve' keeps this out of the build (where commonjsOptions already
  handles it), and enforce:'pre' runs it on the raw source before Vite's esbuild pass.
*/
function nameSimilarityDevInterop() {
  const target = /src[\\/]utils[\\/]nameSimilarity\.js$/;
  return {
    name: 'dev-cjs-interop-name-similarity',
    apply: 'serve',
    enforce: 'pre',
    transform(code, id) {
      if (!target.test(id.split('?')[0])) return null;
      return {
        code: `const module = { exports: {} };\nconst exports = module.exports;\n${code}\nexport default module.exports;`,
        map: null
      };
    }
  };
}

/*
  Vite configuration — replaces Create React App (react-scripts).

  Why the migration: react-scripts@5.0.1 shipped in January 2022 and CRA was formally deprecated by
  the React team in 2025. Most of this repo's dependency advisories were CRA build-chain transitives
  that will never be patched upstream and that `npm audit fix` could not resolve.

  Three decisions below are deliberately conservative so that NOTHING outside the build tooling has
  to change — no environment-variable renames, no Nginx change, no deploy-script change, no manual
  rewrites. Each is explained at its option.
*/
export default defineConfig({
  plugins: [nameSimilarityDevInterop(), react()],

  /*
    (1) KEEP the REACT_APP_ prefix.

    Vite's default prefix is VITE_. Renaming would have meant touching .env.development,
    .env.production.example, both installation manuals, the VM deploy runbook, and anyone's
    existing .env on the server — a large, error-prone diff for zero functional gain. envPrefix
    tells Vite to expose the variables this project already uses, under the names it already uses.

    Note the semantics are unchanged from CRA: anything with this prefix is BAKED INTO THE BUNDLE at
    build time and is therefore PUBLIC. Never put a secret in a REACT_APP_ variable.
  */
  envPrefix: 'REACT_APP_',

  build: {
    /*
      (2) Output to build/, not Vite's default dist/.

      Nginx on the VM serves build/, deploy-sync.sh and the VM installation manual both reference
      build/, and .gitignore already ignores /build. Changing the output directory would silently
      break deployment for a cosmetic reason.
    */
    outDir: 'build',
    // CRA emitted source maps for production; keep that off to avoid shipping readable source.
    sourcemap: false,
    // CRA warned at 500 kB. The main bundle is legitimately around that size (recharts + jspdf),
    // so raise the threshold rather than print a warning on every build.
    chunkSizeWarningLimit: 1200,

    commonjsOptions: {
      /*
        src/utils/nameSimilarity.js is CommonJS (`module.exports = {...}`) because the SAME FILE is
        deployed to the Express backend, where it is loaded with require(). Converting it to ESM
        would break the backend; leaving it as-is breaks Rollup, which by default only applies
        CommonJS-to-ESM interop inside node_modules and therefore sees a source file with no
        exports at all ("findNameMatches is not exported by ...").

        Adding it to the include list gives it the same interop node_modules gets, so the frontend
        can import it while the backend keeps require()-ing it. Webpack did this implicitly.
      */
      include: [/node_modules/, /src[\\/]utils[\\/]nameSimilarity\.js$/],
      transformMixedEsModules: true
    }
  },

  server: {
    // CRA served on :3000 and the whole project (docs, CORS_ORIGIN default, manuals) assumes it.
    port: 3000,
    // CRA opened the browser on start; keep the same developer experience.
    open: true
  },

  /*
    (3) Treat .js files as JSX.

    This is the one genuine incompatibility. CRA's Babel pipeline accepted JSX inside .js files, and
    this codebase relies on that heavily (src/App.js, every page under src/pages/, most components).
    Vite's esbuild pass assumes .js is plain JavaScript and fails on the first `<div>`.

    The alternative — renaming ~80 files to .jsx — would produce a huge, review-hostile diff and
    break every import path that omits the extension. Loading .js as JSX is the standard escape
    hatch and costs a negligible amount of parse time.
  */
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: []
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' }
    }
  },

  test: {
    // Vitest replaces jest/react-scripts test. globals:true keeps the describe/it/expect style the
    // existing tests are written in, so no test file needs rewriting.
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true
  }
});
