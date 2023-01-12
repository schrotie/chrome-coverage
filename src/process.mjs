export function process(coverage, {filter = defaultFilter, files = []} = {}) {
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
