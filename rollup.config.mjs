import {nodeResolve} from '@rollup/plugin-node-resolve';

export default {
	input: 'chrome-coverage.mjs',
	plugins: [nodeResolve()],
	output: {file: 'chrome-coverage.min.mjs'},
};
