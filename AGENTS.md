# polendina agent guide

polendina runs a Node.js-style test suite in headless Chrome from the command
line. You give it the same globs you give mocha, it bundles them with webpack,
serves them to Puppeteer and prints the result as if the tests ran natively.
`npm test` can run Node.js and browser tests back to back with no browser
config, no karma, no selenium.

This file is for coding agents and the people driving them. `README.md` is the
user manual. This file is the contract for changing the code.

## Telos

One sentence: **simple browser testing for Node.js-style packages, so
`npm test` just works.**

Everything else follows from it. Judge every change against these, in order:

1. **Zero config by default, overridable when needed.** A dependent project
   adds one script line, `polendina --cleanup test/test-*.js`, and nothing
   else. No config file, no browser install, no build step. When a project
   needs more, flags cover the common cases and `--webpack-config` opens the
   bundler for the rest. A change that makes the default path need more is
   going the wrong way. A change that closes off an override is too.
2. **The project's own test framework and dependencies win.** polendina does
   not depend on mocha or tape. It bundles whatever the consumer has installed.
   polendina's `node_modules` is a fallback for its own shims only.
3. **Faithful terminal output.** Browser output must look like native mocha or
   tape output, in order, with the same exit code. The test suite asserts this
   by string equality on stdout. Output ordering bugs are real bugs.
4. **Page, Worker and ServiceWorker are peers.** Every runner works in all
   three, selected by flag. Every fixture asserts which scope it is in.
5. **Library testing, not UI testing.** No screenshots, no DOM assertions, no
   coverage. The browser is a runtime, not a subject.
6. **Ride the ecosystem's current majors.** Caret ranges, dependabot, release
   on every bump. The cost of this is the bitrot section below. The benefit is
   that consumers get current Chrome and current webpack without thinking.

Radical change is allowed when it serves the telos better than the current
model. Replacing webpack is not off the table. Adding a config file is.

## Who depends on polendina

Small to mid-sized libraries that target Node.js and browsers and want a cheap
browser run in CI: `cborg`, `through2`, `ripemd160`, the IPLD JavaScript
packages and others. `cborg` is the reference consumer and the first thing to
try a change against. Do it with a packed tarball, not a symlink; see
"Install topologies" below for why:

```bash
npm pack                                    # in polendina
npm install --no-save ../polendina/polendina-*.tgz   # in the consumer
npm run test:browser
```

Real usage, in increasing order of involvement. Each shape must keep working:

- `polendina --cleanup test/test-*.js`. The default. Mocha, page only.
- `polendina --page --worker --serviceworker --cleanup test/*-test.js`. All
  three scopes, common for data-structure libraries.
- `polendina --timeout 320 --runner=mocha --cleanup test/browser.js`. Heavy
  suites with a dedicated browser entry file and a long timeout.
- `polendina --cleanup dist/cjs/node-test/test-*.js`. Tests run from a build
  output directory rather than source.
- `polendina --runner=bare-async test/test.js` paired with
  `polendina-node bare-async test/test.js`. The same files run in Node.js and
  the browser with no test framework at all.
- `polendina --cleanup --webpack-config test/webpack.config.js test/test-*.js`
  where the config is `export default { externals: { standard: 'null' } }`.
  `js-ipld-schema` does this to stop webpack bundling a Node-only
  dependency. The merged config is the escape hatch for anything polendina
  does not do itself: externals, loaders for TypeScript, `DefinePlugin`.

Consumers call the CLI only. `polendina.js` exports a `Polendina` class but
the CLI is the API. Flags, defaults, exit codes, the shape of stdout and the
fact that `--webpack-config` is merged into a plain webpack config are the
compatibility surface. Active consumers track releases through dependabot,
so a breaking change is acceptable when it is worth the bump; it should be
marked as one and say what the consumer must do.

## How it works

```text
CLI (yargs) -> Polendina.build()  webpack: test files + <runner>-run.js -> build/bundle.js
            -> Polendina.run()    for each mode: st serves build/, Puppeteer loads index.html
                                  page-run.js picks page | Worker | ServiceWorker, loads bundle.js
                                  <runner>-run.js drains the test registry, runs, reports
                                  exposeFunction channel -> lib/log.js -> stdout
            -> cleanup()          rimraf build/
```

Files:

- `polendina-cli.js` flags and the top-level flow. `polendina.js` build,
  serve, run, cleanup. `polendina-node-cli.js` the Node.js runner for
  `bare-sync` and `bare-async` files, sharing `resources/bare.js`.
- `lib/webpack.config.js` the one webpack config. `lib/wrap-loader.cjs` the
  pitch loader that defers test execution. `lib/puppeteer.js` launches
  Chrome, wires the output channel, owns the timeout. `lib/log.js` sequenced
  stdout.
- `resources/` is copied verbatim into the output dir at build time.
  `index.html` and `page-run.js` are served static. `common-run.js`,
  `test-registry.cjs` and one of `mocha-run.js`, `tape-run.js`, `bare-run.js`
  are bundled as the last entry.
- `test/` packs polendina, installs it into temporary consumers outside the
  repo, one per runner, and runs the CLI against `test/fixtures/*` from
  inside them, one fixture per runner, in CJS and ESM, passing and failing.

### The deferral trick

Test files must not run when the bundle loads. Mocha needs `describe()` calls
after `mocha.setup()`; tape needs its harness stream attached first.
`wrap-loader.cjs` replaces each test module with a stub that pushes
`{ name, load }` onto `test-registry.cjs`, where `load()` is a sync
`require('!!./file.js')`. The `*-run.js` entry, appended last, drains the
registry when ready. This is why the loader emits CJS, why the rule has
`type: 'javascript/auto'`, and why the registry and loader are `.cjs` in a
`"type": "module"` package.

### Output channel

Browser `console.log` is overridden to call `polendinaLog(['info', seq, ...])`
through `page.exposeFunction`. Workers and ServiceWorkers forward through
`postMessage` to the page, which relays. Mocha's `BrowserStdout` polyfill of
`process.stdout.write` is detected by stack regex and routed to
`polendinaWrite` so partial lines stay partial. `lib/log.js` reorders by
sequence number because exposed-function calls can arrive out of order.
`end()` is debounced 100ms because `polendinaEnd` can beat trailing writes.
Touch any of this and run the full matrix on Windows and macOS CI before
believing it.

## Fences

Things that look wrong and are not. Each exists because something broke.

- **`resolve.modules` and `resolveLoader.modules` list the relative
  `node_modules` first, polendina's own `node_modules` second.** The relative
  entry walks up from the requesting file as Node does, so the consumer's
  mocha, tape and chai win and hoisted or nested dependencies resolve from a
  workspace package or any subdirectory. An absolute `cwd/node_modules` here
  does not walk and breaks both. polendina has no mocha or tape in its own
  tree, on purpose.
- **Tape gets `resolve.fallback` for `stream` and `path`, `fs: false`, and
  `ProvidePlugin({ process })`.** Webpack 5 dropped Node core polyfills.
  Mocha's browser bundle is self-contained; tape's is not. `process`,
  `path-browserify`, `stream-browserify` and `readable-stream` are
  dependencies solely for this. They are resolved with `createRequire` from
  `polendina.js`, never by path, because a hoisted consumer install has no
  `polendina/node_modules` directory.
- **`import 'mocha/mocha.js'` for side effect, then `globalThis.mocha`.**
  Mocha 11 ships UMD, 12 ships ESM. The global is the common denominator.
  Both are supported at once. The `color()` / `useColors()` branch is the
  same idea for older mochas.
- **`exprContextCritical: false`.** Mocha's bundle has a dynamic
  `require.resolve`; without this every run prints a webpack warning.
- **`resolve.tsconfig: false`.** Webpack 5.109+ on Node 22.6+ follows a
  dependency's `tsconfig.json`, which may `extends` a package that was never
  published. Every resolve inside that dependency then fails.
- **Registry path in the loader is relative to the test file's directory,
  forward-slashed.** Tests in subdirectories and Windows paths both broke the
  cwd-relative version. Three separate fixes landed here. Paths in
  `wrap-loader.cjs` are the most common regression site in the repo.
- **`puppeteer.launch({ args: ['--no-sandbox'], headless: 'new' })`.**
  `--no-sandbox` for root in Docker and CI. `'new'` was a Puppeteer 20
  deprecation fix and is itself a candidate for removal on current Puppeteer.
- **`st({ cache: false })`.** A stale cached bundle between page, worker and
  serviceworker runs on Windows.
- **`setTimeout(...).unref()` for `--timeout`.** A clean finish must not be
  held open; on fire it closes the browser and rejects.
- **`polendina-node` unwraps `mod['module.exports']`.** Node 23+ exposes CJS
  loaded via `import()` under that named export; `bare-async` export
  enumeration would otherwise see the wrong keys.
- **`polendina-cli` exits with the mocha failure count; `polendina-node` exits
  0 or 1.** The first matches mocha's own behaviour. Keep both.
- **The test frameworks live in `test/consumer/package.json`, not the root
  package, and `test:run` uses `npx --yes mocha`.** mocha and tape must never
  become devDependencies of the root package: they would land in polendina's
  `node_modules` and silently mask a broken consumer resolve. That file is
  the one place dependabot bumps them; it is never installed as is. The flag,
  not an `npm_config_yes=` prefix, because npm scripts run under cmd.exe on
  Windows and a `VAR=value` prefix is not a command there.
- **One consumer per runner, never one consumer with every framework.** Tape
  and polendina both depend on `readable-stream`. Installed together with
  mocha, npm nests whichever versions clash and the fixtures run on a tree no
  real consumer has. Each consumer installs only what its runner's fixtures
  import.
- **Fixture `package.json` files declare only a name and, for ESM, a
  `type`.** Their dependencies come from the consumer they are copied into.
  The webpack-merge fixture's config `require('webpack')` finds the hoisted
  copy there, as a real consumer's would.
- **`test/common.js` asserts empty stderr on success and always passes
  `--cleanup`.** Any stray warning is a test failure. Fixtures stay clean
  between runs only because of the flag.
- **`chore` commits cut a patch release.** Every dependency bump ships. This is
  deliberate: consumers get current Chrome and webpack without a human in the
  loop.

## Bitrot

What breaks, where it breaks, how it gets fixed. Expect each of these again.

| Trigger | Where it lands | Pattern |
|---------|----------------|---------|
| Mocha major | `resources/mocha-run.js`, fixture `package.json` | Import path, export shape or API rename in the browser bundle. Support the new and previous major together. |
| Webpack minor or major | `lib/webpack.config.js`, `polendina.js` | A resolution default changes or a polyfill vanishes. Fix with a config key, not a loader. |
| Puppeteer major | `lib/puppeteer.js` | Launch option deprecations. Usually a one-line change or nothing. |
| Node.js current | `polendina-node-cli.js`, anything ESM | Interop changes surface first on the `current` CI leg. |
| Any dependency going ESM-only | import sites | Named imports (`{ glob }`, `{ rimraf }`, `{ merge }`, `hideBin`). |
| Output ordering | `lib/log.js`, `resources/common-run.js`, `lib/puppeteer.js` | Shows up only on Windows and macOS CI as interleaved output. Reproduce there before changing anything. |
| Path separators | `lib/wrap-loader.cjs` | Windows. Normalise to forward slashes at the point of string generation. |

The CI matrix is `lts/*` and `current` on Linux, macOS and Windows. It is
there to catch these early, and it does. A red `current` leg on an otherwise
green matrix is a Node.js interop issue, not a flaky test.

## Supported environment

- Node.js: Active and Maintenance lines on the official schedule. Dropping an
  end-of-life line is a `chore`.
- Chrome: whatever the current Puppeteer ships. No other browser. Adding one
  would be a new project.
- Test runners: mocha (default), tape, `bare-sync`, `bare-async`. Current and
  previous major of mocha and tape at once, as the fixtures pin them.
- Consumer module format: CJS and ESM, both covered by fixtures.
- Platform: Linux, macOS, Windows. Windows is a first-class CI leg.

## Testing polendina itself

```bash
npm test                                                  # lint and the whole matrix
npx mocha --require test/setup.js test/test-mocha.js      # one runner's suite
POLENDINA_KEEP_CONSUMERS=1 npx mocha --require test/setup.js test/test-tape.js   # keep the consumers to poke at
cd test/fixtures/mocha && ../../../polendina-cli.js test-*.js --stats     # by hand, in-repo layout, keep build/
```

`test/setup.js` is a mocha global fixture. It packs the working tree, writes
a `package.json` per consumer, installs the tarball with that consumer's
frameworks into a temporary directory, copies `test/fixtures` in, and removes
everything afterwards. Its `variants` table maps a consumer name to the
packages it installs: `mocha` and `bare` take chai, `tape` takes tape,
`mocha11` pins the previous mocha major. Bare names take their version range
from `test/consumer/package.json`. Each suite names the consumer it runs in
when it calls `runCli`. The installs run in parallel from the npm cache with
the Chrome that puppeteer already downloaded for the root install, so they
need a warm cache and take well under a minute.

### Install topologies

polendina resolves modules two ways at once: Node resolution for its own
imports, and webpack `resolve.modules` for the bundle, which checks the
consumer's `node_modules` then polendina's. Where "polendina's
`node_modules`" actually is depends on how it was installed, and no single
test setup covers all three cases.

| Topology | polendina's own `node_modules` | What it hides |
|----------|-------------------------------|---------------|
| Fixtures run in this repo by hand | The dev tree, two directories up | Fixtures can walk up and find polendina's dev dependencies. A missing dependency, or any package added to the root, is silently masked. Fine for poking at a bundle, proves nothing about resolution. |
| Symlinked working copy in a consumer | polendina's own full tree, separate from the consumer's | Two complete trees, no hoisting, no version contention. Cleaner than any real install. Will not reproduce a hoisting break. |
| Published install in a consumer | Mostly absent: dependencies are hoisted into the consumer's flat tree | Anything that assumes a file exists under `polendina/node_modules/` breaks. Version conflicts between polendina's dependencies and the consumer's resolve by npm nesting and are then found by `resolve.modules` in whichever order npm left them. This is reality, and it is what the suite runs in. |

Consequences:

- Never reference polendina's own `node_modules` by path. Resolve through
  Node from a file inside polendina so it works wherever npm put the package.
- The fixtures sit in a subdirectory of the consumer, so the suite also
  stands in for a workspace package whose dependencies are hoisted to a
  parent. Module resolution must walk up.
- `test/test-packed-install.js` asserts the layout itself: polendina's
  dependencies hoisted, each framework present only in its own consumer,
  mocha and tape absent from polendina's own tree.

Rules the suite relies on:

- polendina is tested the way it is used: as a CLI installed from a tarball
  and run from inside a consumer directory. Do not import `polendina.js` into
  tests to make them faster.
- The mocha spec reporter's pass symbol differs between majors in the
  browser bundle, so mocha expectations take the tick from a per-consumer
  table rather than a literal.
- Every runner has a passing and a failing fixture, in CJS and ESM. A new
  runner or mode adds all four, a row in `variants` with its framework, and
  that framework in `test/consumer/package.json`. A new code path in an
  existing runner adds an assertion to the existing fixtures rather than a
  new fixture.
- Expected output is matched as exact multi-line strings with timings
  scrubbed. When output changes on purpose, update the expectation and say so
  in the PR.
- Use `--stats` and skip `--cleanup` to inspect `build/bundle.js` and
  `webpack-stats.json` when a resolve goes wrong.

## Making a change

1. Reproduce in a fixture first. If no fixture shows the problem, add the
   smallest assertion to an existing one that does.
2. Run that runner's suite, then the whole matrix. Windows and macOS only run
   in CI, so push a branch and watch all six legs before calling it done.
3. Try it against `cborg` or another real consumer, installed from
   `npm pack`, not a symlink. For anything touching resolution, also run a
   tape fixture through the packed install, since no consumer in the wild
   exercises that path.
4. For anything touching `lib/webpack.config.js`, `lib/wrap-loader.cjs` or
   the output channel, state in the PR which fence you touched and why it
   still holds.
5. New flag or behaviour: README options list, CLI `describe`, fixture
   coverage, in that order. Defaults never change in a minor.
6. One concern per PR. No drive-by tidying.

## Direction

For an agent asked to improve this project without a brief. The project is
healthy but high-entropy: many moving parts, each on its own release
schedule. Impact comes from reducing the number of things that can rot
without reducing what works.

Good work, roughly in order of value:

- **Keep the matrix green.** Pick up a red dependabot PR, find the fallout,
  land the fix with the bump. This is the single most useful thing.
- **Remove dead weight with evidence.** `raw-loader` is a dependency no source
  references. The `--coverage` flag and the `pti` TODO have never shipped. The
  commented-out `page.on('console')` block is dead. The `useColors` branch is
  unreachable on supported mochas. Each removal is one PR with a full test run
  and a `git log -S` showing where it came from.
- **Make failures legible.** When a resolve fails inside a consumer's
  dependency, the webpack error is the user's only clue. Better messages
  around bundle errors and the timeout are cheap wins.
- **Reduce the webpack surface.** Fewer config keys, fewer polyfills, fewer
  reasons for a webpack release to break a run. If the tape polyfill set can
  shrink, shrink it. Node core modules like `assert` are not polyfilled at
  all, and that is deliberate; fixtures use chai.
- **Evaluate replacing webpack.** esbuild or rolldown could bundle, with a
  plugin doing the wrap-loader's job. This is a major: `--webpack-config` is a
  documented extension point used in the wild for externals and TypeScript.
  Any replacement needs an equivalent escape hatch. It is telos-compatible
  and would remove the biggest source of bitrot. Write up the trade before
  writing code, and keep the CLI, output and fixtures identical.

Work to avoid:

- Any change that makes the consumer add a file or a flag to get what they
  get today, or that removes an override they rely on.
- Adding a second browser, UI testing, screenshots or coverage.
- Pinning dependencies to dodge a break. Fix the break.
- Adding mocha or tape to the root package in any form.
- Rewriting the output channel for elegance. It is shaped by CI on three
  platforms and the shape is the fix.
- Touching the release config, dependabot config or CI matrix unless that is
  the point of the PR.

## Code style

- StandardJS: no semicolons, single quotes, space before function parens.
  Fix lint, never disable it.
- Plain JavaScript, ESM in the package, `.cjs` only where webpack demands it.
  No TypeScript, no build step.
- Comments describe the code as it is now. Never what changed, why a line was
  added or which issue it fixed; that belongs in the commit. Every comment
  earns its place and its word count.
- Simple language in prose, docs and messages. Short sentences. Plain
  punctuation: no em or en dashes, no emoji outside the existing log brand.
- Nothing new at the repository root. Node-side code in `lib/`, browser-side
  in `resources/`, tests and fixtures in `test/`.
- A new runtime dependency needs a sentence in the PR saying why the consumer
  should carry it.

## Commits and pull requests

Conventional commits drive semantic-release on every push to `master`.

| Type | Release |
|------|---------|
| `feat` | minor |
| `fix`, `perf`, `chore`, `docs`, `test`, `revert` | patch |
| `refactor`, `ci`, `build`, `style` | none |
| any type with `!` and a `BREAKING CHANGE:` footer | major |
| scope `no-release` | none |

- Subject: imperative, lower case, no trailing period, under 72 characters.
  Scopes in use: `mocha`, `deps`, `ci`.
- Terse and undecorated. No labels, badges or boilerplate.
- A breaking change says who is affected and what they must do. Dropping a
  mocha or Node.js major is breaking even when the blast radius is small.
- PRs are squash-merged and the title becomes the commit subject. History is
  linear.
- `CHANGELOG.md` and the version in `package.json` are generated. Never edit
  them.

## Keep this file true

When a change makes anything here inaccurate (a file moved, a flag changed, a
fence removed, a bitrot pattern resolved for good), update this file in the
same PR. Describe the project as it is. No history, no change notes.

## References

- Puppeteer: https://pptr.dev/
- Webpack resolve options: https://webpack.js.org/configuration/resolve/
- Webpack loader pitching: https://webpack.js.org/api/loaders/#pitching-loader
- Mocha browser usage: https://mochajs.org/#running-mocha-in-the-browser
- Reference consumer, `cborg`: https://github.com/rvagg/cborg
