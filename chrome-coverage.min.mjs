let style = /* css */`
chrome-coverage {
	display: block;
	margin: 0 50px;
	font: 12px/1 "Helvetica Neue", Helvetica, Arial, sans-serif;
	position: relative;
}
chrome-coverage > h1 {font-weight: 200;}
chrome-coverage > h1 > span {
	color: white;
	padding: 0 5px;
	border-radius: 3px;
}
chrome-coverage > ul li    {cursor: pointer;}
chrome-coverage > ul span  {display: inline-block;width: 4em;text-align: right;}
chrome-coverage > ul label {display: inline-block; margin-left: 1em;}
chrome-coverage > ul pre   {margin: 0 6rem;}
`;

const template = /* html */`
<h1>Coverage <span></span></h1>
<ul></ul>
`;

customElements.define('chrome-coverage', class extends HTMLElement {
	set coverage(coverage) {
		ini(this);
		renderTotal(coverage, this.querySelector('h1 > span'));
		renderList( coverage, this.querySelector('ul'));
	}
});

function ini(el) {
	if(el.childNodes.length) return;
	addStyle();
	el.innerHTML = template;
}

function addStyle() {
	if(!style) return;
	const styleEl = document.createElement('style');
	styleEl.innerText = style;
	document.head.append(styleEl);
	style = false;
}

function renderTotal(coverage, total) {
	const perc = percent(coverage);
	total.innerText = perc;
	total.setAttribute('style', barStyle(perc));
}

function percent(coverage) {
	const covered = coverage.file.length;
	const missing = coverage.missing.length;
	const total = covered + missing;
	const percent = ((covered / total) * coverage.ratio * 100).toFixed(2);
	return `${percent}%`;
}

function barStyle(percent) {
	const stop = `green ${percent}, red ${percent}`;
	return `background: linear-gradient(90deg, green, ${stop}, red);`;
}


function renderList(coverage, ul) {
	ul.innerHTML = '';
	if(!show(coverage)) return;
	else renderArray(coverage, ul);
}

function show(coverage) {
	return coverage.missing.length || (
		coverage.file.length && (coverage.ratio !== 1)
	);
}

function renderArray(coverage, ul) {
	for(const file of coverage.file) ul.appendChild(li(file));
}

function li(file) {
	const li = document.createElement('li');
	const span = document.createElement('span');
	const label = document.createElement('label');
	li.append(span, '%', label);
	apply(li, file, span, label);
	return li;
}

function apply(li, coverage, span, label) {
	label.innerText = coverage.url;
	span .innerText = (coverage.ratio * 100).toFixed(2);
	if(coverage.uncoveredChunk) {
		li.setAttribute('title', coverage.uncoveredChunk.join('\n'));
		li.addEventListener('click', toggleUncovered(li, coverage));
	}
}

function toggleUncovered(li, coverage) {return function() {
	const pre = li.querySelector('pre');
	if(pre) pre.remove();
	else {
		const pre = document.createElement('pre');
		pre.append(coverage.uncoveredChunk.join('\n'));
		li.append(pre);
	}
};}

function process(coverage, {filter = defaultFilter, files = []} = {}) {
	if(typeof coverage === 'string') coverage = JSON.parse(coverage);
	return addMissing(calculate(coverage.filter(filter), files));
}

function defaultFilter({url}) {
	return /^http(s)?:\/\/[^/]+\/src\/.*\.(m)?js$/.test(url);
}

function calculate(coverage, files) {
	const file = coverage.map(info);
	const missing = files.filter(f => !coverage.find(url(f)));
	const out = {missing, file};
	return summarize(out);
}

function info({text, ranges, url}) {
	const info = {totalBytes: text.length, ranges, usedBytes: 0, url};
	info.url = info.url.replace(/^http(s)?:\/\/[^/]+\//, '');
	for(const range of ranges) info.usedBytes += range.end - range.start;
	info.uncoveredWhiteSpaces = uncoveredWhiteSpaces(text, ranges, info);
	return info;
}

function url(f) {
	const exp = new RegExp(`${f}$`);
	return ({url}) => exp.test(url);
}

function summarize(coverage) {
	const files = coverage.file;
	for(const file of files) calculateFile(file);
	const reducer = property => (sum, file) => sum + file[property];
	const usedBytes  = files.reduce(reducer('coveredBytes'), 0);
	const totalBytes = files.reduce(reducer('totalBytes'),   0);
	coverage.ratio = usedBytes / totalBytes;
	return coverage;
}

function calculateFile(file) {
	file.coveredBytes = file.usedBytes    + file.uncoveredWhiteSpaces;
	file.ratio        = file.coveredBytes / file.totalBytes;
}

function uncoveredWhiteSpaces(text, ranges, info) {
	let lastPosition = 0;
	let count = 0;
	for(const range of ranges) {
		count += checkUncovered(text, lastPosition, range.start, info);
		lastPosition = range.end;
	}
	return count + checkUncovered(text, lastPosition, text.length, info);
}

function checkUncovered(text, start, end, info) {
	if(!(end > start)) return 0;
	const slice = text.slice(start, end);
	if(/^[\s}]*$/.test(slice)) return slice.length;
	const line = text.slice(0, start).split(/\r\n|\r|\n/).length;
	const lineInfo = `line ${line}: "${slice}"`;
	if(!info.uncoveredChunk) info.uncoveredChunk = [];
	info.uncoveredChunk.push(lineInfo);
	return 0;
}

function addMissing(coverage) {
	coverage.file = coverage.file
		.concat(coverage.missing.map(el => ({ratio: 0, url: el})))
		.sort((a, b) => a.url.localeCompare(b.url));
	return coverage;
}

/* global after, before, describe, it */

// eslint-disable-next-line max-lines-per-function
function describeCoverage(
	{ratio = 1, uncoveredFiles = 0, getCoverage, files, filter}) {
	if(!getCoverage) throw new Error('Method for retrieving coverage required');
	// eslint-disable-next-line max-lines-per-function
	describe('coverage', () => {
		let coverage;
		before(() => getCoverage()
			.then(c => process(c, {files, filter}))
			.then(c => coverage = c));

		after(function() {
			const mocha = document.getElementById('mocha');
			const chromeCov = document.createElement('chrome-coverage');
			mocha.append(chromeCov);
			chromeCov.coverage = coverage;
		});

		it('should cover the code', () => {
			// eslint-disable-next-line no-console
			console.log(`Coverage is ${(coverage.ratio * 100).toFixed(2)}%`);
			coverage.ratio.should.be.at.least(ratio);
		});

		if(files) it('should cover all files', () => {
			chai.should().exist(coverage); /* global chai */
			coverage.should.have.property('missing');
			coverage.missing.length.should.be.at.most(uncoveredFiles);
		});
	});
}

export { describeCoverage as default, process };
