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
