import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Read package.json for version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const version = packageJson.version;

/**
 * Minify the literal segments of template literals in styles.js / icons.js
 * before bundling. ${...} interpolations are preserved as-is; only the text
 * between them is collapsed and stripped of CSS comments. Cuts ~10KB off
 * the bundle without affecting correctness because esbuild doesn't minify
 * string content.
 */
function minifyTemplateLiteralsInJs(source) {
  let out = '';
  let i = 0;
  const n = source.length;

  const copyString = (quote) => {
    out += source[i];
    i++;
    while (i < n && source[i] !== quote) {
      if (source[i] === '\\' && i + 1 < n) {
        out += source[i] + source[i + 1];
        i += 2;
      } else {
        out += source[i];
        i++;
      }
    }
    if (i < n) { out += source[i]; i++; }
  };

  while (i < n) {
    const c = source[i];
    // Line comment
    if (c === '/' && source[i + 1] === '/') {
      const eol = source.indexOf('\n', i);
      if (eol === -1) { out += source.substring(i); return out; }
      out += source.substring(i, eol);
      i = eol;
      continue;
    }
    // Block comment
    if (c === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i);
      if (end === -1) { out += source.substring(i); return out; }
      out += source.substring(i, end + 2);
      i = end + 2;
      continue;
    }
    // Regular string
    if (c === '"' || c === "'") { copyString(c); continue; }
    // Template literal — minify literal segments, preserve ${...}
    if (c === '`') {
      out += '`';
      i++;
      let segment = '';
      while (i < n && source[i] !== '`') {
        if (source[i] === '\\' && i + 1 < n) {
          segment += source[i] + source[i + 1];
          i += 2;
        } else if (source[i] === '$' && source[i + 1] === '{') {
          out += minifyTemplateText(segment);
          segment = '';
          let depth = 1;
          out += source[i] + source[i + 1];
          i += 2;
          while (i < n && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            out += source[i];
            i++;
          }
        } else {
          segment += source[i];
          i++;
        }
      }
      out += minifyTemplateText(segment);
      if (i < n) { out += '`'; i++; }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function minifyTemplateText(text) {
  if (!text) return text;
  const hasCssBlock = /\{[\s\S]*\}/.test(text) && /:[^;{}\n]+[;}]/.test(text);
  const hasMarkup = /<[a-zA-Z]/.test(text);
  if (hasCssBlock) {
    return text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([{};,])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim();
  }
  if (hasMarkup) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+\/>/g, '/>')
      .trim();
  }
  return text;
}

const minifyEmbeddedTemplatesPlugin = {
  name: 'minify-embedded-templates',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/](styles|icons)\.js$/ }, async (args) => {
      const src = await fs.promises.readFile(args.path, 'utf8');
      return { contents: minifyTemplateLiteralsInJs(src), loader: 'js' };
    });
  }
};

// Banner for all builds
const banner = `/**
 * OverType v${version}
 * A lightweight markdown editor library with perfect WYSIWYG alignment
 * @license MIT
 * @author David Miranda
 * https://github.com/panphora/overtype
 */`;

// Base configuration
const baseConfig = {
  bundle: true,
  sourcemap: true,
  target: ['es2020', 'chrome62', 'firefox78', 'safari16'],
  banner: {
    js: banner
  },
  loader: {
    '.js': 'js'
  },
  // Prefer ESM versions of packages when available
  mainFields: ['module', 'main']
};

// Check for watch mode
const isWatch = process.argv.includes('--watch');
const iifeBaseConfig = {
  ...baseConfig,
  format: 'iife',
  globalName: 'OverType',
  platform: 'browser',
  footer: {
    js: `
if (typeof window !== "undefined" && typeof window.document !== "undefined") {
  // Extract exports BEFORE reassigning OverType (var OverType is window.OverType)
  window.toolbarButtons = OverType.toolbarButtons;
  window.defaultToolbarButtons = OverType.defaultToolbarButtons;
  window.markdownActions = OverType.markdownActions;
  window.OverType = OverType.default ? OverType.default : OverType;
}
    `
  }
};
async function build() {
  try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist');

    if (isWatch) {
      // Development build with watch mode
      const ctx = await esbuild.context({
        ...baseConfig,
        entryPoints: ['src/overtype.js'],
        outfile: 'dist/overtype.js',
        ...iifeBaseConfig,
        logLevel: 'info'
      });

      await ctx.watch();
      console.log('✅ Watching for changes...');
    } else {
      // Browser IIFE Build (Development)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype.js'],
        outfile: 'dist/overtype.js',
        ...iifeBaseConfig
      });
      console.log('✅ Built dist/overtype.js');

      // Browser IIFE Build (Minified)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype.js'],
        outfile: 'dist/overtype.min.js',
        ...iifeBaseConfig,
        minify: true,
        sourcemap: false,
        plugins: [minifyEmbeddedTemplatesPlugin]
      });
      console.log('✅ Built dist/overtype.min.js');

      // CommonJS Build (for Node.js)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype.js'],
        outfile: 'dist/overtype.cjs',
        format: 'cjs',
        platform: 'node'
      });
      console.log('✅ Built dist/overtype.cjs');

      // ESM Build (for modern bundlers)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype.js'],
        outfile: 'dist/overtype.esm.js',
        format: 'esm',
        platform: 'browser'
      });
      console.log('✅ Built dist/overtype.esm.js');

      // Web Component Build (IIFE)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype-webcomponent.js'],
        outfile: 'dist/overtype-webcomponent.js',
        format: 'iife',
        globalName: 'OverTypeEditor',
        platform: 'browser'
      });
      console.log('✅ Built dist/overtype-webcomponent.js');

      // Web Component Build (Minified)
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype-webcomponent.js'],
        outfile: 'dist/overtype-webcomponent.min.js',
        format: 'iife',
        globalName: 'OverTypeEditor',
        minify: true,
        sourcemap: false,
        platform: 'browser',
        plugins: [minifyEmbeddedTemplatesPlugin]
      });
      console.log('✅ Built dist/overtype-webcomponent.min.js');

      // Web Component ESM Build
      await esbuild.build({
        ...baseConfig,
        entryPoints: ['src/overtype-webcomponent.js'],
        outfile: 'dist/overtype-webcomponent.esm.js',
        format: 'esm',
        platform: 'browser'
      });
      console.log('✅ Built dist/overtype-webcomponent.esm.js');

      // Report sizes
      const iifeSize = fs.statSync('dist/overtype.js').size;
      const minSize = fs.statSync('dist/overtype.min.js').size;
      const cjsSize = fs.statSync('dist/overtype.cjs').size;
      const esmSize = fs.statSync('dist/overtype.esm.js').size;
      const webcompSize = fs.statSync('dist/overtype-webcomponent.js').size;
      const webcompMinSize = fs.statSync('dist/overtype-webcomponent.min.js').size;
      const webcompEsmSize = fs.statSync('dist/overtype-webcomponent.esm.js').size;

      console.log('\n📊 Build sizes:');
      console.log(`   IIFE (Browser):     ${(iifeSize / 1024).toFixed(2)} KB`);
      console.log(`   IIFE Minified:      ${(minSize / 1024).toFixed(2)} KB`);
      console.log(`   CommonJS:           ${(cjsSize / 1024).toFixed(2)} KB`);
      console.log(`   ESM:                ${(esmSize / 1024).toFixed(2)} KB`);
      console.log(`   WebComponent IIFE:  ${(webcompSize / 1024).toFixed(2)} KB`);
      console.log(`   WebComponent Min:   ${(webcompMinSize / 1024).toFixed(2)} KB`);
      console.log(`   WebComponent ESM:   ${(webcompEsmSize / 1024).toFixed(2)} KB`);
      
      // Update HTML files with actual minified size
      updateFileSizes(minSize);
      
      // Test TypeScript definitions before copying
      const typesSource = path.join(process.cwd(), 'src', 'overtype.d.ts');
      const typesDest = path.join(process.cwd(), 'dist', 'overtype.d.ts');
      if (fs.existsSync(typesSource)) {
        // Test the TypeScript definitions
        console.log('🔍 Testing TypeScript definitions...');
        try {
          execSync('npx tsc --noEmit --lib ES2020,DOM test/test-types.ts', { stdio: 'inherit' });
          console.log('✅ TypeScript definitions test passed');
        } catch (error) {
          console.error('❌ TypeScript definitions test failed');
          console.error('   Run "npx tsc --noEmit --lib ES2020,DOM test/test-types.ts" to see the errors');
          process.exit(1);
        }
        
        // Copy to dist after successful test
        fs.copyFileSync(typesSource, typesDest);
        console.log('✅ Copied TypeScript definitions to dist/overtype.d.ts');
      }

      console.log('\n✨ Build complete!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Function to update file sizes in HTML files
function updateFileSizes(minifiedSize) {
  const sizeInKB = Math.round(minifiedSize / 1024);
  const sizeText = `${sizeInKB}KB`;
  
  // List of files to update
  const htmlFiles = ['index.html']; // Removed demo.html since it contains textarea content
  const markdownFiles = ['README.md'];
  
  // Update HTML files with span tags
  htmlFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace all instances of file size within the special class
      // Pattern matches spans with class="overtype-size" and updates their content
      content = content.replace(
        /<span class="overtype-size">[\d~]+KB<\/span>/g,
        `<span class="overtype-size">${sizeText}</span>`
      );
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   Updated ${file} with size: ${sizeText}`);
    }
  });
  
  // Update markdown files (README.md) - replace ~XXkB patterns
  markdownFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace size mentions in README - match patterns like ~45KB or 45KB
      content = content.replace(
        /~?\d+KB minified/g,
        `~${sizeText} minified`
      );
      
      // Also update the comparison table
      content = content.replace(
        /\| \*\*Size\*\* \| ~?\d+KB \|/g,
        `| **Size** | ~${sizeText} |`
      );
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`   Updated ${file} with size: ~${sizeText}`);
    }
  });
}

// Run build
build();