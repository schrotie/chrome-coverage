Parse and evaluate coverage reports exported by Chrome browser

# chrome-coverage

Chrome's coverage reports are in a rather raw/low-level JSON format. This small
library evaluates these reports, provides a higher level format, generates a
small HTML report of the coverage and generates Mocha tests that assert given
coverage ratios to be met.

I developed this tool in conjunction with
[my fork](https://github.com/schrotie/mocha-headless-chrome) of
[mocha-headless-chrome](https://github.com/direct-adv-interfaces/mocha-headless-chrome). Mocha headless Chrome allows you to run frontend mocha tests in the
console on a headless Chrome, and my fork allows you to export Chrome's
coverage report from such runs. You can use `chrome-coverage` without this,
though. Just manually export Chrome's coverage report from its developer tools
and use `chrome-coverage` to process it however you like.

The following example assumes that you use `mocha-headless-chrome` with coverage
export.

# Example

```html
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Test</title>
	<link rel="stylesheet" href="../node_modules/mocha/mocha.css" />
	<script src="../node_modules/mocha/mocha.js"></script>
	<script src="../node_modules/chai/chai.js"></script>
	<script type="importmap">
		{ "imports": {"quary": "../node_modules/quary/quary.mjs"}}
	</script>
</head>
<body>
	<div id="mocha"></div>
	<div id="test"></div>
	<script type="module">
		import chromeCoverage from '../node_modules/chrome-coverage/chrome-coverage.min.mjs';

		mocha.setup('bdd');
		chai.should();

		(async function() {
			if(window.puppeteerStartCoverage) await window.puppeteerStartCoverage();
			await loadTests();
			chromeCoverage({getCoverage});
			mocha.checkLeaks();
			mocha.run();
		})();

		async function loadTests() {
			const directoryResponse = await fetch('/test')
			const directoryText     = await directoryResponse.text();
			const testScripts       = directoryText.match(/([\w-]+)\.mjs/g);
			return Promise.all(testScripts.map(file => import(`./${file}`)));
		}

		function getCoverage() {
			if(window.puppeteerStopCoverage) {
				return window.puppeteerStopCoverage({jsPath: 'jsCoverage.json'})
					.then(({js}) => js);
			}
			else return fetch('../jsCoverage.json').then(res => res.text());
		}

	</script>
</body>
</html>
```

You can run this from the console, e.g.
```sh
./node_modules/.bin/mocha-headless-chrome -f http://localhost:3000/test/test.html
```
It will then save the JS coverage report to `jsCoverage.json` _and_ add a mocha
test to cover 100% of the code loaded in the tests.

You can also run this in the browser (e.g. by pointing your browser to the above
URL). Then it will load a previously saved `jsCoverage.json`, run the
abovementioned mocha tests _and_ display a report of the coverage of all loaded
files. This report let's you click files and you'll see the actual uncovered
code - better than in Chrome where only whole lines may or may not be marked.

# API

`chrome-coverage` provides three things:
* a method to transform Chrome's coverage report
* a method to generate Mocha tests and a coverage report
* a web component to render its coverage report

You can use these independently, though the Mocha test generator wraps it all
together.

## process

```javascript
import {process} from './node_modules/chrome-coverage/chrome-coverage.mjs';

fetch('coverage.json').then(res => res.text()).then(process).then(doSomething);
```

`process` has the following signature:
```javascript
function process(coverage, {filter = defaultFilter, files = []} = {}) {/* ... */}
```
`coverage` may be either the JSON string as in the example above, or the parsed
JSON. The optional options object may contain a filter function and/or an
expected files array.

### filter
`coverage` - Chrome's coverage report - is an array of files with the respective
coverage information. `process` first filters that array by doing:
```javascript
coverage.filter(filter)
```
Thus the `filter` function will get one argument: the current element of the
coverage array. Usually you'll likely only care for the `url` of the files:
`function filter({url}) { // ...`. Chrome's coverage report contains
_everything_ that is loaded, e.g. the mocha library, your tests code ...
usually you only care about your source code's coverage and thus your `filter`
function should return `true` for your source code files.

By default `process` will filter out files from the `src` directory.

### files
If your tests don't load some of your source files, Chrome will not see them
and they'll not be included in any coverage report or test. In order to be sure
not to miss some files, provide an array of filenames here. These will be
checked against the actually covered files and added to the array if missing.

## chrome-coverage

`chrome-coverage` if a web component, that you may add to you HTML:
```html
<!DOCTYPE html>
<html><body>
	<chrome-coverage></chrome-coverage>
	<script type="module">
		import {process} from '../node_modules/chrome-coverage/chrome-coverage.min.mjs';
		const chromeCov = document.body.querySelector('chrome-coverage');
		fetch('./jsCoverage.json')
			.then(res => res.text())
			.then(process)
			.then(coverage => chromeCov.coverage = coverage);

	</script>
</body></html>
```
This will render a coverage report.

## chromeCoverage
`chrome-coverage`'s default export is a method that defines Mocha tests,
processes Chrome's report and renders the HTML report. The method has this
signature:
```javascript
function describeCoverage({ratio = 1, uncoveredFiles = 0, getCoverage, files, filter}) { // ...
```
You _must_ at least pass `getCoverage`, everything else is optional.
`getCoverage` is a method that will be called without arguments and must return
Chrome's coverage report or a Promise that resolves to it.

Note that you _should_ call `chromeCoverage`/`describeCoverage` _after_ loading
all your tests. The coverage test it `describe`s should be the _last_ Mocha
test because the coverage generated by `mocha-headless-chrome` should only be
finalized after running all your other tests. If you generate your coverage
report manually, though, order does not matter.

`files` and `filter` are passed to `process`, see above.

`ratio` is the asserted coverage ratio. If you want at least 70% coverage, pass
`{ratio: 0.7, getCoverage}`.

`uncoveredFiles` is the number (count) of acceptable uncovered files. This only
applies if you also pass `files`. Otherwise `chrome-coverage` cannot know of
missing files and does not generate the respective test.
