/* global after, before, describe, it */

import './chrome-coverage.mjs';
import {process} from './process.mjs';

// eslint-disable-next-line max-lines-per-function
export function describeCoverage(
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
